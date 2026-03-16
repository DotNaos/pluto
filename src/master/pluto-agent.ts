import {
  CodexAppServerClient,
  type CodexRuntimeState,
  type CodexToolExecutionEnd,
  type CodexToolExecutionStart,
} from "./codex-app-server-client.js";
import type { AppState, MessageRecord, PermissionMode } from "../shared/types.js";

const MAX_HISTORY_MESSAGES = 16;

export class PlutoAgent {
  private readonly client: CodexAppServerClient;

  public constructor(cwd: string) {
    this.client = new CodexAppServerClient(cwd);
  }

  public async close(): Promise<void> {
    await this.client.close();
  }

  public async modelName(): Promise<string | null> {
    const runtime = await this.client.runtime();
    return runtime.model;
  }

  public async runtime(): Promise<CodexRuntimeState> {
    return this.client.runtime();
  }

  public async setModel(model: string): Promise<string> {
    return this.client.setModel(model);
  }

  public async attachThread(threadId: string): Promise<CodexRuntimeState> {
    return this.client.attachThread(threadId);
  }

  public async resetThread(): Promise<CodexRuntimeState> {
    return this.client.resetThread();
  }

  public async startLogin(): Promise<CodexRuntimeState["login"]> {
    return this.client.startLogin();
  }

  public async cancelLogin(loginId?: string): Promise<CodexRuntimeState["login"]> {
    return this.client.cancelLogin(loginId);
  }

  public async logout(): Promise<CodexRuntimeState> {
    return this.client.logout();
  }

  public async reply(
    state: AppState,
    options?: {
      onDelta?: (text: string) => void;
      onToolStart?: (tool: CodexToolExecutionStart) => void;
      onToolEnd?: (tool: CodexToolExecutionEnd) => void;
      permissionMode?: PermissionMode;
    },
  ): Promise<string> {
    return this.client.reply(buildPrompt(state), options);
  }
}

function buildPrompt(state: AppState): string {
  const connectedHosts = state.hosts.filter((host) => host.connected);
  const hostSummary = connectedHosts.length === 0
    ? "No Pluto hosts are currently connected."
    : connectedHosts
        .map((host) => {
          const workspaceNames = state.workspaces
            .filter((workspace) => workspace.hostId === host.id)
            .map((workspace) => workspace.name);
          const suffix = workspaceNames.length > 0 ? ` Workspaces: ${workspaceNames.join(", ")}.` : "";
          return `${host.name} (${host.id}).${suffix}`;
        })
        .join(" ");

  return [
    "You are Pluto, the single assistant behind one continuous conversation.",
    "Reply as Pluto in plain text. Be concise, direct, and useful.",
    "The UI is intentionally only one chat surface.",
    "Do not mention internal architecture unless the user asks.",
    "Pluto can read files, write files, and run shell commands through the backend when the user's intent is clear.",
    "Assume the backend may execute those actions directly before you reply.",
    "Do not refuse purely because the user did not use a rigid command format.",
    "If the user wants an action but a critical detail is missing, ask one short clarifying question.",
    "Do not claim that an action already happened unless Pluto actually executed it.",
    `Host status: ${hostSummary}`,
    "",
    "Conversation transcript:",
    buildTranscript(state.messages.slice(-MAX_HISTORY_MESSAGES)),
    "",
    "Respond to the latest user message as Pluto.",
  ].join("\n");
}

function buildTranscript(messages: MessageRecord[]): string {
  if (messages.length === 0) {
    return "No prior messages.";
  }

  return messages
    .map((message) => `${message.role === "assistant" ? "Pluto" : "User"}: ${message.text}`)
    .join("\n\n");
}
