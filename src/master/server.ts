import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import WebSocket, { WebSocketServer, type WebSocket as WebSocketConnection } from "ws";
import { renderAdminHtml } from "./dashboard.js";
import { listCodexSessions } from "./codex-sessions.js";
import { sendFileResponse } from "./file-response.js";
import { PlutoAgent } from "./pluto-agent.js";
import { StateStore } from "./state-store.js";
import { sendWebDocument, trySendWebAsset } from "./web-static.js";
import {
  type AppState,
  type CreateMessageRequest,
  type DomainEvent,
  type HostToMasterMessage,
  type MasterToHostMessage,
  type PermissionMode,
} from "../shared/types.js";

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const source = Buffer.concat(chunks).toString("utf8");
  if (!source) {
    return {} as T;
  }

  return JSON.parse(source) as T;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendEvent(response: ServerResponse, event: DomainEvent): void {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

export interface MasterServerOptions {
  host: string;
  port: number;
  stateFile: string;
}

export class MasterServer {
  private readonly options: MasterServerOptions;

  private readonly store: StateStore;

  private readonly agent: PlutoAgent;

  private readonly hostSockets = new Map<string, WebSocketConnection>();

  private readonly sseClients = new Set<ServerResponse>();

  private readonly wsServer = new WebSocketServer({ noServer: true });

  private readonly server = createServer(this.handleRequest.bind(this));

  public constructor(options: MasterServerOptions) {
    this.options = options;
    this.store = new StateStore(options.stateFile);
    this.agent = new PlutoAgent(process.cwd());

    this.server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (url.pathname !== "/ws/host") {
        socket.destroy();
        return;
      }

      this.wsServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.handleHostSocket(webSocket);
      });
    });

    this.store.on("event", (event: DomainEvent) => {
      for (const client of this.sseClients) {
        sendEvent(client, event);
      }
    });
  }

  public async listen(): Promise<void> {
    await mkdir(dirname(resolve(this.options.stateFile)), { recursive: true });
    await new Promise<void>((resolveListen) => {
      this.server.listen(this.options.port, this.options.host, resolveListen);
    });
  }

  public async close(): Promise<void> {
    for (const socket of this.hostSockets.values()) {
      socket.close();
    }

    for (const client of this.sseClients) {
      client.end();
    }

    await new Promise<void>((resolveClose, rejectClose) => {
      this.server.close((error) => {
        if (error) {
          rejectClose(error);
          return;
        }

        resolveClose();
      });
    });

    await this.agent.close();
  }

  public getState(): AppState {
    return this.store.snapshot();
  }

  private dispatchCommand(hostId: string, command: AppState["commands"][number], response?: ServerResponse): boolean {
    const socket = this.hostSockets.get(hostId);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.store.failCommand(command.id, `Host ${hostId} is not currently connected.`);
      if (response) {
        sendJson(response, 409, { error: `Host ${hostId} is not currently connected.` });
      }
      return false;
    }

    const envelope: MasterToHostMessage = { type: "command.dispatch", command };
    socket.send(JSON.stringify(envelope));
    return true;
  }

  private startAssistantReply(messageId: string, promptState: AppState): void {
    const draft = this.store.createAssistantDraft();

    void this.agent.reply(promptState, {
      permissionMode: promptState.permissionMode,
      onDelta: (text) => {
        this.store.replaceMessageText(draft.id, text);
      },
      onToolStart: (tool) => {
        this.store.beginAgentToolCommand(messageId, {
          commandId: tool.commandId,
          command: tool.command,
          cwd: tool.cwd,
        });
      },
      onToolEnd: (tool) => {
        this.store.completeAgentToolCommand(tool.commandId, {
          stdout: tool.stdout,
          stderr: tool.stderr,
          exitCode: tool.exitCode,
          error: tool.status === "failed" ? tool.stderr || "Command failed." : undefined,
        });
      },
    }).then((reply) => {
      this.store.replaceMessageText(draft.id, reply);
    }).catch((error) => {
      const errorMessage = error instanceof Error
        ? `Pluto could not generate a reply: ${error.message}`
        : "Pluto could not generate a reply.";
      this.store.replaceMessageText(draft.id, errorMessage);
    });
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/favicon.ico") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/") {
      let runtime: unknown;
      try {
        runtime = await this.agent.runtime();
      } catch {
        runtime = {
          model: null,
          availableModels: [],
          account: null,
          requiresOpenaiAuth: true,
        };
      }

      if (await sendWebDocument(response, { state: this.store.snapshot(), runtime })) {
        return;
      }

      sendJson(response, 503, { error: "frontend build missing. Run `pnpm run build:web`." });
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(renderAdminHtml());
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
      if (await trySendWebAsset(response, url.pathname)) {
        return;
      }

      sendJson(response, 404, { error: "asset not found" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      sendJson(response, 200, this.store.snapshot());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/file") {
      const requestedPath = url.searchParams.get("path");
      if (!requestedPath) {
        sendJson(response, 400, { error: "path is required" });
        return;
      }

      try {
        await sendFileResponse(response, requestedPath, {
          download: url.searchParams.get("download") === "1",
        });
      } catch (error) {
        sendJson(response, 404, { error: error instanceof Error ? error.message : "file could not be served" });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/runtime") {
      try {
        sendJson(response, 200, await this.agent.runtime());
      } catch (error) {
        sendJson(response, 503, {
          chatProvider: "codex-app-server",
          model: null,
          availableModels: [],
          account: null,
          requiresOpenaiAuth: true,
          login: { status: "error", error: error instanceof Error ? error.message : "Codex runtime unavailable." },
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/codex/sessions") {
      try {
        const runtime = await this.agent.runtime();
        sendJson(response, 200, {
          currentThreadId: runtime.threadId,
          sessions: await listCodexSessions(runtime.threadId),
        });
      } catch (error) {
        sendJson(response, 503, {
          error: error instanceof Error ? error.message : "Codex sessions unavailable.",
          currentThreadId: null,
          sessions: [],
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/events") {
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      this.sseClients.add(response);

      const state = this.store.snapshot();
      for (const event of state.events.slice(-20)) {
        sendEvent(response, event);
      }

      request.on("close", () => {
        this.sseClients.delete(response);
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/runtime/model") {
      try {
        const body = await readJsonBody<{ model?: string }>(request);
        if (!body.model || body.model.trim() === "") {
          sendJson(response, 400, { error: "model is required" });
          return;
        }

        await this.agent.setModel(body.model);
        sendJson(response, 200, await this.agent.runtime());
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "invalid request" });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/runtime/permissions") {
      try {
        const body = await readJsonBody<{ permissionMode?: PermissionMode }>(request);
        if (body.permissionMode !== "default" && body.permissionMode !== "full-access") {
          sendJson(response, 400, { error: "permissionMode must be 'default' or 'full-access'" });
          return;
        }

        const nextState = this.store.setPermissionMode(body.permissionMode);
        await this.agent.resetThread();
        sendJson(response, 200, nextState);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "invalid request" });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      try {
        sendJson(response, 200, await this.agent.startLogin());
      } catch (error) {
        sendJson(response, 502, { error: error instanceof Error ? error.message : "login could not be started" });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login/cancel") {
      try {
        const body = await readJsonBody<{ loginId?: string }>(request);
        sendJson(response, 200, await this.agent.cancelLogin(body.loginId));
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "login could not be cancelled" });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      try {
        sendJson(response, 200, await this.agent.logout());
      } catch (error) {
        sendJson(response, 502, { error: error instanceof Error ? error.message : "logout failed" });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/codex/sessions/attach") {
      try {
        const body = await readJsonBody<{ threadId?: string }>(request);
        if (!body.threadId || body.threadId.trim() === "") {
          sendJson(response, 400, { error: "threadId is required" });
          return;
        }

        const runtime = await this.agent.attachThread(body.threadId);
        sendJson(response, 200, {
          runtime,
          currentThreadId: runtime.threadId,
          sessions: await listCodexSessions(runtime.threadId),
        });
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Could not attach thread." });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/codex/sessions/reset") {
      try {
        const runtime = await this.agent.resetThread();
        sendJson(response, 200, {
          runtime,
          currentThreadId: runtime.threadId,
          sessions: await listCodexSessions(runtime.threadId),
        });
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Could not reset thread." });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/messages") {
      try {
        const body = await readJsonBody<CreateMessageRequest>(request);
        if (!body.text || body.text.trim() === "") {
          sendJson(response, 400, { error: "text is required" });
          return;
        }

        const outcome = this.store.createMessageAndDispatch(body);
        const { dispatch, requiresAssistantReply, message } = outcome;
        if (requiresAssistantReply) {
          this.startAssistantReply(message.id, this.store.snapshot());
        }

        if (dispatch) {
          if (!this.dispatchCommand(dispatch.hostId, dispatch.command, response)) {
            return;
          }
        }

        sendJson(response, 202, this.store.snapshot());
      } catch (error) {
        sendJson(response, 409, { error: error instanceof Error ? error.message : "unknown error" });
      }
      return;
    }

    const approveMatch = request.method === "POST" ? url.pathname.match(/^\/api\/commands\/([^/]+)\/approve$/) : null;
    if (approveMatch) {
      try {
        const commandId = decodeURIComponent(approveMatch[1]);
        const approved = this.store.approveCommand(commandId);
        if (!this.dispatchCommand(approved.targetHost, approved, response)) {
          return;
        }
        sendJson(response, 200, this.store.snapshot());
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "could not approve command" });
      }
      return;
    }

    const rejectMatch = request.method === "POST" ? url.pathname.match(/^\/api\/commands\/([^/]+)\/reject$/) : null;
    if (rejectMatch) {
      try {
        const commandId = decodeURIComponent(rejectMatch[1]);
        this.store.rejectCommand(commandId);
        sendJson(response, 200, this.store.snapshot());
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "could not reject command" });
      }
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  }

  private handleHostSocket(socket: WebSocketConnection): void {
    let currentHostId: string | undefined;

    socket.on("message", (rawMessage) => {
      const message = JSON.parse(String(rawMessage)) as HostToMasterMessage;

      switch (message.type) {
        case "host.register":
          currentHostId = message.host.id;
          this.hostSockets.set(message.host.id, socket);
          this.store.registerHost(message.host);
          break;
        case "command.accepted":
          this.store.updateCommandStatus(message.commandId, "accepted");
          break;
        case "command.running":
          this.store.updateCommandStatus(message.commandId, "running");
          break;
        case "command.output":
          this.store.appendCommandOutput(message.commandId, message.stream, message.chunk);
          break;
        case "command.completed":
          this.store.completeCommand(message.commandId, message.result);
          break;
        case "command.failed":
          this.store.failCommand(message.commandId, message.error);
          break;
        default:
          break;
      }
    });

    socket.on("close", () => {
      if (!currentHostId) {
        return;
      }

      this.hostSockets.delete(currentHostId);
      this.store.disconnectHost(currentHostId);
    });
  }
}
