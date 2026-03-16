import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import type { PermissionMode } from "../shared/types.js";

const DEFAULT_MODEL = process.env.PLUTO_CODEX_MODEL?.trim()
  || process.env.PLUTO_OPENAI_MODEL?.trim()
  || "gpt-5.4";
const TURN_TIMEOUT_MS = 90_000;

type JsonRpcId = string;

interface JsonRpcSuccess<Result> {
  id: JsonRpcId;
  result: Result;
}

interface JsonRpcFailure {
  id: JsonRpcId;
  error: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

interface JsonRpcNotification<Params = unknown> {
  method: string;
  params?: Params;
}

interface AccountApiKey {
  type: "apiKey";
}

interface AccountChatGpt {
  type: "chatgpt";
  email: string;
  planType: string;
}

export type CodexAccount = AccountApiKey | AccountChatGpt;

export interface CodexModelSummary {
  id: string;
  model: string;
  displayName: string;
  hidden: boolean;
  isDefault: boolean;
}

export interface CodexLoginState {
  status: "idle" | "pending" | "authenticated" | "error";
  loginId?: string;
  authUrl?: string;
  error?: string;
}

export interface CodexRuntimeState {
  account: CodexAccount | null;
  availableModels: string[];
  chatProvider: "codex-app-server";
  login: CodexLoginState;
  model: string | null;
  modelOptions: CodexModelSummary[];
  requiresOpenaiAuth: boolean;
  threadId: string | null;
}

interface AccountReadResponse {
  account?: CodexAccount | null;
  requiresOpenaiAuth: boolean;
}

interface ModelListResponse {
  data: Array<{
    id: string;
    model: string;
    displayName: string;
    hidden: boolean;
    isDefault: boolean;
  }>;
}

interface LoginStartResponseChatGpt {
  type: "chatgpt";
  authUrl: string;
  loginId: string;
}

interface ThreadStartResponse {
  thread: {
    id: string;
  };
}

interface TurnStartResponse {
  turn: {
    id: string;
  };
}

interface PendingRequest {
  method: string;
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
}

interface PendingTurn {
  chunks: string[];
  onDelta?: (text: string) => void;
  onToolStart?: (tool: CodexToolExecutionStart) => void;
  onToolEnd?: (tool: CodexToolExecutionEnd) => void;
  reject: (error: Error) => void;
  resolve: (value: string) => void;
  timeout: NodeJS.Timeout;
}

export interface CodexToolExecutionStart {
  commandId: string;
  turnId: string;
  command: string;
  cwd?: string;
}

export interface CodexToolExecutionEnd {
  commandId: string;
  turnId: string;
  command: string;
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  status?: string;
}

interface ReplyStreamOptions {
  onDelta?: (text: string) => void;
  onToolStart?: (tool: CodexToolExecutionStart) => void;
  onToolEnd?: (tool: CodexToolExecutionEnd) => void;
  permissionMode?: PermissionMode;
}

function parseError(value: unknown, fallback: string): Error {
  if (
    typeof value === "object"
    && value !== null
    && "message" in value
    && typeof (value as { message?: unknown }).message === "string"
  ) {
    return new Error((value as { message: string }).message);
  }

  return new Error(fallback);
}

function isJsonRpcResponse(value: unknown): value is JsonRpcSuccess<unknown> | JsonRpcFailure {
  return typeof value === "object" && value !== null && "id" in value;
}

function isNotification(value: unknown): value is JsonRpcNotification {
  return typeof value === "object" && value !== null && "method" in value && !("id" in value);
}

function extractAgentText(items: unknown): string | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }

  const agentMessage = items.find((item) => (
    typeof item === "object"
    && item !== null
    && "type" in item
    && (item as { type?: unknown }).type === "agentMessage"
    && "text" in item
    && typeof (item as { text?: unknown }).text === "string"
  )) as { text?: string } | undefined;

  return agentMessage?.text?.trim() || undefined;
}

export class CodexAppServerClient extends EventEmitter {
  private account: CodexAccount | null = null;

  private buffer = "";

  private child: ChildProcessWithoutNullStreams | undefined;

  private readonly cwd: string;

  private readonly defaultModel: string;

  private login: CodexLoginState = { status: "idle" };

  private model: string;

  private modelOptions: CodexModelSummary[] = [];

  private nextRequestId = 0;

  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();

  private readonly pendingTurns = new Map<string, PendingTurn>();

  private requiresOpenaiAuth = true;

  private startPromise: Promise<void> | undefined;

  private threadConfigKey: string | undefined;

  private threadId: string | undefined;

  public constructor(cwd: string, model = DEFAULT_MODEL) {
    super();
    this.cwd = cwd;
    this.defaultModel = model;
    this.model = model;
  }

  public async close(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    this.startPromise = undefined;
    this.threadId = undefined;

    for (const pendingTurn of this.pendingTurns.values()) {
      clearTimeout(pendingTurn.timeout);
      pendingTurn.reject(new Error("Codex app-server stopped before the turn completed."));
    }
    this.pendingTurns.clear();

    for (const pendingRequest of this.pendingRequests.values()) {
      pendingRequest.reject(new Error("Codex app-server stopped before the request completed."));
    }
    this.pendingRequests.clear();

    if (!child) {
      return;
    }

    await new Promise<void>((resolveClose) => {
      child.once("exit", () => resolveClose());
      child.kill("SIGTERM");
    });
  }

  public async runtime(): Promise<CodexRuntimeState> {
    await this.ensureStarted();
    return this.snapshot();
  }

  public async reply(prompt: string, options?: ReplyStreamOptions): Promise<string> {
    await this.ensureStarted();

    if (!this.account) {
      throw new Error("Pluto is not signed in. Open Admin and connect your ChatGPT account.");
    }

    const threadId = await this.ensureThread(options?.permissionMode ?? "default");
    const result = await this.request<TurnStartResponse>("turn/start", {
      threadId,
      model: this.model,
      input: [{ type: "text", text: prompt }],
    });

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingTurns.delete(result.turn.id);
        reject(new Error("Codex turn timed out before Pluto received a reply."));
      }, TURN_TIMEOUT_MS);

      this.pendingTurns.set(result.turn.id, {
        chunks: [],
        onDelta: options?.onDelta,
        onToolStart: options?.onToolStart,
        onToolEnd: options?.onToolEnd,
        resolve,
        reject,
        timeout,
      });
    });
  }

  public async setModel(model: string): Promise<string> {
    await this.ensureStarted();
    const availableModels = this.visibleModelIds();
    if (availableModels.length > 0 && !availableModels.includes(model)) {
      throw new Error(`Model ${model} is not available for the current Codex account.`);
    }

    this.model = model;
    this.emit("state");
    return this.model;
  }

  public async attachThread(threadId: string): Promise<CodexRuntimeState> {
    await this.ensureStarted();
    const nextThreadId = threadId.trim();
    if (!nextThreadId) {
      throw new Error("threadId is required.");
    }

    this.threadId = nextThreadId;
    this.emit("state");
    return this.snapshot();
  }

  public async resetThread(): Promise<CodexRuntimeState> {
    await this.ensureStarted();
    this.threadId = undefined;
    this.threadConfigKey = undefined;
    this.emit("state");
    return this.snapshot();
  }

  public async startLogin(): Promise<CodexLoginState> {
    await this.ensureStarted();
    const response = await this.request<LoginStartResponseChatGpt>("account/login/start", { type: "chatgpt" });
    this.login = {
      status: "pending",
      authUrl: response.authUrl,
      loginId: response.loginId,
    };
    this.emit("state");
    return this.login;
  }

  public async cancelLogin(loginId?: string): Promise<CodexLoginState> {
    await this.ensureStarted();
    const resolvedLoginId = loginId ?? this.login.loginId;
    if (!resolvedLoginId) {
      throw new Error("There is no pending ChatGPT login to cancel.");
    }

    await this.request("account/login/cancel", { loginId: resolvedLoginId });
    this.login = { status: this.account ? "authenticated" : "idle" };
    this.emit("state");
    return this.login;
  }

  public async logout(): Promise<CodexRuntimeState> {
    await this.ensureStarted();
    await this.request("account/logout", null);
    this.account = null;
    this.login = { status: "idle" };
    this.threadId = undefined;
    await this.refreshAccount();
    return this.snapshot();
  }

  private async ensureStarted(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.start();
    }

    return this.startPromise;
  }

  private async ensureThread(permissionMode: PermissionMode): Promise<string> {
    const nextThreadConfigKey = permissionMode;
    if (this.threadId && this.threadConfigKey === nextThreadConfigKey) {
      return this.threadId;
    }

    this.threadId = undefined;
    this.threadConfigKey = undefined;

    const result = await this.request<ThreadStartResponse>("thread/start", {
      ephemeral: true,
      approvalPolicy: "never",
      sandbox: permissionMode === "full-access" ? "danger-full-access" : "workspace-write",
      personality: "pragmatic",
      cwd: this.cwd,
      model: this.model,
      serviceName: "pluto",
    });

    this.threadId = result.thread.id;
    this.threadConfigKey = nextThreadConfigKey;
    return this.threadId;
  }

  private async refreshAccount(): Promise<void> {
    const result = await this.request<AccountReadResponse>("account/read", {});
    this.account = result.account ?? null;
    this.requiresOpenaiAuth = result.requiresOpenaiAuth;
    if (this.account && this.login.status !== "pending") {
      this.login = { status: "authenticated" };
    }
    if (!this.account && this.login.status === "authenticated") {
      this.login = { status: "idle" };
    }
    this.emit("state");
  }

  private async refreshModels(): Promise<void> {
    const result = await this.request<ModelListResponse>("model/list", {});
    this.modelOptions = result.data.map((entry) => ({
      id: entry.id,
      model: entry.model,
      displayName: entry.displayName,
      hidden: entry.hidden,
      isDefault: entry.isDefault,
    }));

    const visibleModels = this.visibleModelIds();
    if (visibleModels.length === 0) {
      this.model = null as unknown as string;
      this.emit("state");
      return;
    }

    if (!visibleModels.includes(this.model)) {
      const preferredDefault = visibleModels.find((entry) => entry === this.defaultModel)
        ?? this.modelOptions.find((entry) => entry.isDefault && !entry.hidden)?.model
        ?? visibleModels[0];
      this.model = preferredDefault;
    }

    this.emit("state");
  }

  private visibleModelIds(): string[] {
    return this.modelOptions
      .filter((entry) => !entry.hidden)
      .map((entry) => entry.model);
  }

  private snapshot(): CodexRuntimeState {
    return {
      chatProvider: "codex-app-server",
      account: this.account,
      requiresOpenaiAuth: this.requiresOpenaiAuth,
      model: this.model ?? null,
      availableModels: this.visibleModelIds(),
      modelOptions: [...this.modelOptions],
      login: { ...this.login },
      threadId: this.threadId ?? null,
    };
  }

  private async start(): Promise<void> {
    this.child = spawn("codex", ["app-server", "--listen", "stdio://"], {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => {
      this.buffer += chunk;
      void this.flushBuffer();
    });

    this.child.on("exit", () => {
      this.startPromise = undefined;
      this.child = undefined;
      this.threadId = undefined;

      for (const pendingRequest of this.pendingRequests.values()) {
        pendingRequest.reject(new Error("Codex app-server exited unexpectedly."));
      }
      this.pendingRequests.clear();

      for (const [turnId, pendingTurn] of this.pendingTurns) {
        clearTimeout(pendingTurn.timeout);
        pendingTurn.reject(new Error(`Codex app-server exited while turn ${turnId} was in flight.`));
      }
      this.pendingTurns.clear();
    });

    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", () => {
      // Codex emits operational logs on stderr. Pluto keeps them internal.
    });

    await this.request("initialize", {
      clientInfo: { name: "pluto", title: "Pluto", version: "0.1.0" },
      capabilities: { experimentalApi: true },
    });

    await Promise.all([this.refreshAccount(), this.refreshModels()]);
  }

  private async flushBuffer(): Promise<void> {
    let newlineIndex = this.buffer.indexOf("\n");

    while (newlineIndex >= 0) {
      const rawLine = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      newlineIndex = this.buffer.indexOf("\n");

      if (!rawLine) {
        continue;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawLine) as unknown;
      } catch {
        continue;
      }

      if (isJsonRpcResponse(payload)) {
        const pending = this.pendingRequests.get(String(payload.id));
        if (!pending) {
          continue;
        }

        this.pendingRequests.delete(String(payload.id));
        if ("error" in payload) {
          pending.reject(parseError(payload.error, `${pending.method} failed.`));
          continue;
        }

        pending.resolve(payload.result);
        continue;
      }

      if (isNotification(payload)) {
        void this.handleNotification(payload);
      }
    }
  }

  private async handleNotification(notification: JsonRpcNotification): Promise<void> {
    switch (notification.method) {
      case "account/updated":
        await this.refreshAccount();
        return;
      case "account/login/completed": {
        const params = notification.params as { error?: string | null; success: boolean } | undefined;
        if (!params?.success) {
          this.login = {
            status: "error",
            error: params?.error ?? "ChatGPT login failed.",
          };
          this.emit("state");
          return;
        }

        this.login = { status: "authenticated" };
        await this.refreshAccount();
        return;
      }
      case "item/agentMessage/delta": {
        const params = notification.params as { delta?: string; turnId?: string } | undefined;
        if (!params?.turnId) {
          return;
        }

        const pendingTurn = this.pendingTurns.get(params.turnId);
        if (!pendingTurn || typeof params.delta !== "string") {
          return;
        }

        pendingTurn.chunks.push(params.delta);
        pendingTurn.onDelta?.(pendingTurn.chunks.join(""));
        return;
      }
      case "codex/event/exec_command_begin": {
        const params = notification.params as {
          msg?: {
            call_id?: string;
            command?: string[];
            cwd?: string;
            turn_id?: string;
          };
        } | undefined;
        const turnId = params?.msg?.turn_id;
        const commandId = params?.msg?.call_id;
        if (!turnId || !commandId) {
          return;
        }

        const pendingTurn = this.pendingTurns.get(turnId);
        if (!pendingTurn) {
          return;
        }

        pendingTurn.onToolStart?.({
          commandId,
          turnId,
          command: Array.isArray(params?.msg?.command) ? params.msg.command.join(" ") : "command",
          cwd: params?.msg?.cwd,
        });
        return;
      }
      case "codex/event/exec_command_end": {
        const params = notification.params as {
          msg?: {
            aggregated_output?: string;
            call_id?: string;
            command?: string[];
            cwd?: string;
            exit_code?: number;
            formatted_output?: string;
            status?: string;
            stderr?: string;
            stdout?: string;
            turn_id?: string;
          };
        } | undefined;
        const turnId = params?.msg?.turn_id;
        const commandId = params?.msg?.call_id;
        if (!turnId || !commandId) {
          return;
        }

        const pendingTurn = this.pendingTurns.get(turnId);
        if (!pendingTurn) {
          return;
        }

        pendingTurn.onToolEnd?.({
          commandId,
          turnId,
          command: Array.isArray(params?.msg?.command) ? params.msg.command.join(" ") : "command",
          cwd: params?.msg?.cwd,
          stdout: params?.msg?.stdout ?? params?.msg?.formatted_output ?? params?.msg?.aggregated_output,
          stderr: params?.msg?.stderr,
          exitCode: typeof params?.msg?.exit_code === "number" ? params.msg.exit_code : undefined,
          status: params?.msg?.status,
        });
        return;
      }
      case "item/completed": {
        const params = notification.params as {
          item?: { text?: string; type?: string };
          turnId?: string;
        } | undefined;
        if (!params?.turnId || params.item?.type !== "agentMessage" || typeof params.item.text !== "string") {
          return;
        }

        const pendingTurn = this.pendingTurns.get(params.turnId);
        if (!pendingTurn) {
          return;
        }

        pendingTurn.chunks = [params.item.text];
        pendingTurn.onDelta?.(params.item.text);
        return;
      }
      case "turn/completed": {
        const params = notification.params as {
          turn?: { error?: { message?: string } | null; items?: unknown[] };
        } | undefined;
        const turn = params?.turn as { error?: { message?: string } | null; id?: string; items?: unknown[] } | undefined;
        const turnId = turn?.id;
        if (!turnId) {
          return;
        }

        const pendingTurn = this.pendingTurns.get(turnId);
        if (!pendingTurn) {
          return;
        }

        clearTimeout(pendingTurn.timeout);
        this.pendingTurns.delete(turnId);

        const resolvedText = pendingTurn.chunks.join("").trim() || extractAgentText(turn.items);
        if (resolvedText) {
          pendingTurn.resolve(resolvedText);
          return;
        }

        pendingTurn.reject(parseError(turn.error, "Codex completed the turn without a Pluto reply."));
        return;
      }
      default:
        return;
    }
  }

  private async request<Result>(method: string, params: unknown): Promise<Result> {
    await Promise.resolve();

    if (!this.child) {
      throw new Error(`Codex app-server is not running for ${method}.`);
    }

    const requestId = String(++this.nextRequestId);
    const payload = { jsonrpc: "2.0", id: requestId, method, params };

    return await new Promise<Result>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        method,
        resolve: (value) => resolve(value as Result),
        reject,
      });

      this.child?.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) {
          return;
        }

        this.pendingRequests.delete(requestId);
        reject(error);
      });
    });
  }
}
