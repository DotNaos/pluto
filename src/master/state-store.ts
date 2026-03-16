import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  type AppState,
  type ArtifactRecord,
  type CommandRecord,
  type CommandStatus,
  type CommandType,
  type CreateMessageRequest,
  type DomainEvent,
  type HostRegistration,
  type HostRecord,
  type MessageRecord,
  type PermissionMode,
  type RunRecord,
  type WorkspaceRecord,
} from "../shared/types.js";

function now(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createInitialState(): AppState {
  return {
    conversationId: "pluto",
    activeContextId: "ctx-001",
    permissionMode: "default",
    messages: [],
    contextBoundaries: [],
    contextSnapshots: [],
    hosts: [],
    workspaces: [],
    runs: [],
    commands: [],
    artifacts: [],
    events: [],
  };
}

export interface QueuedDispatch {
  hostId: string;
  command: CommandRecord;
}

export interface CreateMessageOutcome {
  message: MessageRecord;
  dispatch?: QueuedDispatch;
  requiresAssistantReply?: boolean;
}

interface ResolvedDispatchRequest {
  commandType: CommandType;
  payload: Record<string, unknown>;
  hostId?: string;
  workspaceId?: string;
}

const PROCESS_ALLOWLIST: RegExp[] = [
  /^(pwd|ls|git\s+status|git\s+diff|rg\b|cat\b|echo\b)/i,
];

const PROCESS_BLACKLIST: RegExp[] = [
  /\bsudo\b/i,
  /\brm\s+-rf\s+\/\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
];

export class StateStore extends EventEmitter {
  private readonly stateFile: string;

  private state: AppState;

  public constructor(stateFile: string) {
    super();
    this.stateFile = stateFile;
    this.state = this.load();
  }

  public snapshot(): AppState {
    return clone(this.state);
  }

  public setPermissionMode(permissionMode: PermissionMode): AppState {
    this.state.permissionMode = permissionMode;
    this.persist();
    this.recordEvent("permissions.updated", { permissionMode });
    return this.snapshot();
  }

  public beginAgentToolCommand(messageId: string, input: {
    commandId: string;
    command: string;
    cwd?: string;
  }): CommandRecord {
    const run = this.ensureAgentRun(messageId);
    const timestamp = now();
    const existing = this.state.commands.find((candidate) => candidate.id === input.commandId);

    if (existing) {
      existing.status = "running";
      existing.updatedAt = timestamp;
      existing.payload = {
        ...existing.payload,
        command: "sh",
        args: ["-lc", input.command],
        cwd: input.cwd ?? ".",
      };
      this.persist();
      this.recordEvent("command.status.updated", {
        commandId: existing.id,
        runId: run.id,
        status: existing.status,
        type: existing.type,
      });
      return clone(existing);
    }

    const command: CommandRecord = {
      id: input.commandId,
      runId: run.id,
      targetHost: "codex-app-server",
      targetWorkspace: "codex:cwd",
      type: "process.run",
      payload: {
        command: "sh",
        args: ["-lc", input.command],
        cwd: input.cwd ?? ".",
        fullAccess: this.state.permissionMode === "full-access",
      },
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
      acceptedAt: timestamp,
      startedAt: timestamp,
      stdout: "",
      stderr: "",
    };

    run.status = "running";
    run.updatedAt = timestamp;
    run.commandIds.push(command.id);

    this.state.commands.push(command);
    this.persist();
    this.recordEvent("command.status.updated", {
      commandId: command.id,
      runId: run.id,
      status: command.status,
      type: command.type,
    });
    return clone(command);
  }

  public completeAgentToolCommand(commandId: string, output: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: string;
  }): void {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    const timestamp = now();
    const stdout = typeof output.stdout === "string" ? output.stdout : "";
    const stderr = typeof output.stderr === "string" ? output.stderr : "";

    if (stdout && stdout !== command.stdout) {
      command.stdout = stdout;
      this.recordEvent("command.output", {
        commandId,
        runId: run.id,
        stream: "stdout",
        chunk: stdout,
        stdout,
        stderr: command.stderr ?? "",
        status: "running",
      });
    }

    if (stderr && stderr !== command.stderr) {
      command.stderr = stderr;
      this.recordEvent("command.output", {
        commandId,
        runId: run.id,
        stream: "stderr",
        chunk: stderr,
        stdout: command.stdout ?? "",
        stderr,
        status: "running",
      });
    }

    command.updatedAt = timestamp;
    command.completedAt = timestamp;

    if (output.error) {
      command.status = "failed";
      command.error = output.error;
      run.status = "failed";
      this.persist();
      this.recordEvent("command.status.updated", {
        commandId,
        runId: run.id,
        status: "failed",
        error: output.error,
      });
      this.recordEvent("run.completed", { runId: run.id, status: run.status });
      return;
    }

    command.status = "completed";
    run.status = "completed";
    run.updatedAt = timestamp;
    this.persist();
    this.recordEvent("command.status.updated", {
      commandId,
      runId: run.id,
      status: "completed",
    });
    this.recordEvent("run.completed", { runId: run.id, status: run.status });
  }

  public registerHost(host: HostRegistration): void {
    const timestamp = now();
    const existingHost = this.state.hosts.find((candidate) => candidate.id === host.id);

    if (existingHost) {
      existingHost.name = host.name;
      existingHost.connected = true;
      existingHost.lastSeenAt = timestamp;
      existingHost.capabilities = [...host.capabilities];
      existingHost.workspaceIds = host.workspaces.map((workspace) => workspace.id);
      if (!existingHost.connectedAt) {
        existingHost.connectedAt = timestamp;
      }
    } else {
      const hostRecord: HostRecord = {
        id: host.id,
        name: host.name,
        connected: true,
        connectedAt: timestamp,
        lastSeenAt: timestamp,
        capabilities: [...host.capabilities],
        workspaceIds: host.workspaces.map((workspace) => workspace.id),
      };
      this.state.hosts.push(hostRecord);
    }

    this.state.workspaces = this.state.workspaces.filter((workspace) => workspace.hostId !== host.id);
    const workspaceRecords: WorkspaceRecord[] = host.workspaces.map((workspace) => ({
      id: workspace.id,
      hostId: host.id,
      name: workspace.name,
      rootPath: workspace.rootPath,
    }));
    this.state.workspaces.push(...workspaceRecords);

    this.persist();
    this.recordEvent("host.connected", { hostId: host.id, workspaceIds: workspaceRecords.map((workspace) => workspace.id) });
    for (const workspace of workspaceRecords) {
      this.recordEvent("workspace.attached", { hostId: host.id, workspaceId: workspace.id, name: workspace.name });
    }
  }

  public disconnectHost(hostId: string): void {
    const host = this.state.hosts.find((candidate) => candidate.id === hostId);
    if (!host) {
      return;
    }

    host.connected = false;
    host.lastSeenAt = now();
    this.persist();
    this.recordEvent("host.disconnected", { hostId });
  }

  public createMessageAndDispatch(request: CreateMessageRequest): CreateMessageOutcome {
    const message = this.createMessage("user", request.text);
    const resolvedRequest = this.resolveDispatchRequest(request);

    if (!resolvedRequest) {
      return { message, requiresAssistantReply: true };
    }

    const host = resolvedRequest.hostId
      ? this.state.hosts.find((candidate) => candidate.id === resolvedRequest.hostId && candidate.connected)
      : this.state.hosts.find((candidate) => candidate.connected);
    if (!host) {
      throw new Error("No connected host is available.");
    }

    const workspace = resolvedRequest.workspaceId
      ? this.state.workspaces.find((candidate) => candidate.id === resolvedRequest.workspaceId && candidate.hostId === host.id)
      : this.state.workspaces.find((candidate) => candidate.hostId === host.id);
    if (!workspace) {
      throw new Error(`No workspace is available for host ${host.id}.`);
    }

    const timestamp = now();
    const run: RunRecord = {
      id: randomUUID(),
      messageId: message.id,
      hostId: host.id,
      workspaceId: workspace.id,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      commandIds: [],
    };
    const command: CommandRecord = {
      id: randomUUID(),
      runId: run.id,
      targetHost: host.id,
      targetWorkspace: workspace.id,
      type: resolvedRequest.commandType,
      payload: {
        ...resolvedRequest.payload,
        fullAccess: this.state.permissionMode === "full-access",
      },
      status: this.requiresApproval(resolvedRequest.commandType, resolvedRequest.payload) ? "pending_approval" : "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      stdout: "",
      stderr: "",
    };
    run.commandIds.push(command.id);

    this.state.runs.push(run);
    this.state.commands.push(command);
    this.persist();
    this.recordEvent("run.started", { runId: run.id, hostId: host.id, workspaceId: workspace.id });
    this.recordEvent("command.status.updated", {
      commandId: command.id,
      runId: run.id,
      status: command.status,
      type: command.type,
    });
    this.createMessage("assistant", this.buildDispatchMessage(command, host.name, workspace.name), run.id);

    if (command.status === "pending_approval") {
      return { message };
    }

    return { message, dispatch: { hostId: host.id, command } };
  }

  public createAssistantMessage(text: string, runId?: string): MessageRecord {
    return this.createMessage("assistant", text, runId);
  }

  public createAssistantDraft(runId?: string): MessageRecord {
    return this.createMessage("assistant", "", runId);
  }

  public replaceMessageText(messageId: string, text: string): MessageRecord {
    const message = this.mustFindMessage(messageId);
    message.text = text;
    this.persist();
    this.recordEvent("message.updated", {
      messageId: message.id,
      role: message.role,
      runId: message.runId,
      text: message.text,
    });
    return clone(message);
  }

  public updateCommandStatus(commandId: string, status: CommandStatus, error?: string): void {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    const timestamp = now();

    command.status = status;
    command.updatedAt = timestamp;

    if (status === "accepted") {
      command.acceptedAt = timestamp;
      run.status = "running";
    }

    if (status === "running") {
      command.startedAt = timestamp;
      run.status = "running";
    }

    if (status === "failed") {
      command.completedAt = timestamp;
      command.error = error;
      run.status = "failed";
    }

    if (status === "completed") {
      command.completedAt = timestamp;
    }

    run.updatedAt = timestamp;
    this.persist();
    this.recordEvent("command.status.updated", { commandId, runId: run.id, status, error });
  }

  public approveCommand(commandId: string): CommandRecord {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    if (command.status !== "pending_approval") {
      return clone(command);
    }

    const timestamp = now();
    command.status = "queued";
    command.updatedAt = timestamp;
    run.updatedAt = timestamp;
    this.persist();
    this.recordEvent("command.status.updated", { commandId, runId: run.id, status: command.status });
    return clone(command);
  }

  public rejectCommand(commandId: string, reason = "Permission denied."): void {
    const command = this.mustFindCommand(commandId);
    this.failCommand(commandId, reason);
  }

  public appendCommandOutput(commandId: string, stream: "stdout" | "stderr", chunk: string): void {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    const nextChunk = chunk.replace(/\r\n/g, "\n");

    if (stream === "stdout") {
      command.stdout = `${command.stdout ?? ""}${nextChunk}`;
    } else {
      command.stderr = `${command.stderr ?? ""}${nextChunk}`;
    }

    command.updatedAt = now();
    run.updatedAt = command.updatedAt;
    this.persist();
    this.recordEvent("command.output", {
      commandId,
      runId: run.id,
      stream,
      chunk: nextChunk,
      stdout: command.stdout ?? "",
      stderr: command.stderr ?? "",
      status: command.status,
    });
  }

  public completeCommand(commandId: string, result: Record<string, unknown>): void {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    const timestamp = now();
    const artifact = this.buildArtifact(command, run, result, timestamp);

    command.status = "completed";
    command.updatedAt = timestamp;
    command.completedAt = timestamp;
    command.resultRef = artifact.id;
    command.stdout = typeof result.stdout === "string" ? result.stdout : command.stdout;
    command.stderr = typeof result.stderr === "string" ? result.stderr : command.stderr;

    run.status = "completed";
    run.updatedAt = timestamp;

    this.state.artifacts.push(artifact);
    this.persist();

    this.recordEvent("command.status.updated", { commandId, runId: run.id, status: "completed" });
    this.recordEvent("artifact.created", {
      artifactId: artifact.id,
      runId: run.id,
      commandId,
      kind: artifact.kind,
    });
    this.recordEvent("run.completed", { runId: run.id, status: run.status });
    this.createMessage("assistant", this.buildCompletionMessage(command, artifact), run.id);
  }

  public failCommand(commandId: string, error: string): void {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    const timestamp = now();

    command.status = "failed";
    command.updatedAt = timestamp;
    command.completedAt = timestamp;
    command.error = error;

    run.status = "failed";
    run.updatedAt = timestamp;

    this.persist();
    this.recordEvent("command.status.updated", { commandId, runId: run.id, status: "failed", error });
    this.recordEvent("run.completed", { runId: run.id, status: run.status });
    this.createMessage("assistant", `Command ${command.type} failed: ${error}`, run.id);
  }

  private createMessage(role: MessageRecord["role"], text: string, runId?: string): MessageRecord {
    const message: MessageRecord = {
      id: randomUUID(),
      role,
      text,
      createdAt: now(),
      contextId: this.state.activeContextId,
      ...(runId ? { runId } : {}),
    };

    this.state.messages.push(message);
    this.persist();
    this.recordEvent("message.created", {
      messageId: message.id,
      role: message.role,
      runId,
      text: message.text,
      createdAt: message.createdAt,
      contextId: message.contextId,
    });
    return message;
  }

  private resolveDispatchRequest(request: CreateMessageRequest): ResolvedDispatchRequest | undefined {
    if (request.commandType) {
      return {
        commandType: request.commandType,
        payload: request.payload ?? {},
        hostId: request.hostId,
        workspaceId: request.workspaceId,
      };
    }

    const text = request.text.trim();
    if (!text) {
      return undefined;
    }

    const normalized = normalizeWhitespace(text);

    const readMatch = normalized.match(/^(?:read|open|show|cat)\s+(.+)$/i);
    if (readMatch?.[1] && looksLikePath(readMatch[1])) {
      return {
        commandType: "workspace.read_file",
        payload: { path: sanitizePath(readMatch[1]) },
      };
    }

    const writeMatch = text.match(/^write\s+([^\s:]+)\s*:\s*([\s\S]+)$/i);
    if (writeMatch?.[1] && writeMatch[2]) {
      return {
        commandType: "workspace.write_file",
        payload: {
          path: sanitizePath(writeMatch[1]),
          content: writeMatch[2],
        },
      };
    }

    const runMatch = normalized.match(/^run\s+([\s\S]+)$/i);
    if (runMatch?.[1]) {
      return {
        commandType: "process.run",
        payload: buildRunPayload(runMatch[1]),
      };
    }

    return undefined;
  }

  private buildArtifact(
    command: CommandRecord,
    run: RunRecord,
    result: Record<string, unknown>,
    timestamp: string,
  ): ArtifactRecord {
    const relativePath = typeof result.relativePath === "string" ? result.relativePath : undefined;
    const kind = command.type === "workspace.write_file" ? "file-ref" : "command-result";
    const title = relativePath
      ? `${command.type}:${relativePath}`
      : `${command.type}:${command.id}`;

    return {
      id: randomUUID(),
      runId: run.id,
      commandId: command.id,
      kind,
      title,
      createdAt: timestamp,
      metadata: result,
    };
  }

  private buildDispatchMessage(command: CommandRecord, hostName: string, workspaceName: string): string {
    if (command.status === "pending_approval") {
      return `Awaiting permission to run command on ${hostName}/${workspaceName}.`;
    }

    if (command.type === "workspace.read_file") {
      return `Reading ${String(command.payload.path)} on ${hostName}.`;
    }

    if (command.type === "workspace.write_file") {
      return `Writing ${String(command.payload.path)} on ${hostName}.`;
    }

    return `Running a shell command on ${hostName}/${workspaceName}.`;
  }

  private buildCompletionMessage(command: CommandRecord, artifact: ArtifactRecord): string {
    if (artifact.kind === "file-ref") {
      const relativePath = artifact.metadata.relativePath;
      return `Wrote ${String(relativePath)}.`;
    }

    if (typeof artifact.metadata.content === "string") {
      return artifact.metadata.content;
    }

    const stdout = typeof artifact.metadata.stdout === "string" ? artifact.metadata.stdout : "";
    const stderr = typeof artifact.metadata.stderr === "string" ? artifact.metadata.stderr : "";
    const output = stdout || stderr;
    if (output) {
      return output.slice(0, 4000);
    }

    const exitCode = artifact.metadata.exitCode;
    return `Completed with exit code ${String(exitCode ?? 0)}.`;
  }

  private mustFindCommand(commandId: string): CommandRecord {
    const command = this.state.commands.find((candidate) => candidate.id === commandId);
    if (!command) {
      throw new Error(`Unknown command ${commandId}`);
    }

    return command;
  }

  private mustFindMessage(messageId: string): MessageRecord {
    const message = this.state.messages.find((candidate) => candidate.id === messageId);
    if (!message) {
      throw new Error(`Message ${messageId} does not exist.`);
    }

    return message;
  }

  private mustFindRun(runId: string): RunRecord {
    const run = this.state.runs.find((candidate) => candidate.id === runId);
    if (!run) {
      throw new Error(`Unknown run ${runId}`);
    }

    return run;
  }

  private ensureAgentRun(messageId: string): RunRecord {
    const existing = this.state.runs.find((candidate) => candidate.messageId === messageId && candidate.hostId === "codex-app-server");
    if (existing) {
      return existing;
    }

    const timestamp = now();
    const run: RunRecord = {
      id: randomUUID(),
      messageId,
      hostId: "codex-app-server",
      workspaceId: "codex:cwd",
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
      commandIds: [],
    };

    this.state.runs.push(run);
    this.persist();
    this.recordEvent("run.started", {
      runId: run.id,
      hostId: run.hostId,
      workspaceId: run.workspaceId,
    });
    return run;
  }

  private recordEvent(type: string, data: Record<string, unknown>): void {
    const event: DomainEvent = {
      id: randomUUID(),
      type,
      createdAt: now(),
      data,
    };

    this.state.events.push(event);
    this.persist();
    this.emit("event", event);
  }

  private load(): AppState {
    if (!existsSync(this.stateFile)) {
      const state = createInitialState();
      this.writeState(state);
      return state;
    }

    const source = JSON.parse(readFileSync(this.stateFile, "utf8")) as AppState;
    return {
      ...createInitialState(),
      ...source,
    };
  }

  private persist(): void {
    this.writeState(this.state);
  }

  private writeState(state: AppState): void {
    mkdirSync(dirname(this.stateFile), { recursive: true });
    writeFileSync(this.stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  private requiresApproval(commandType: CommandType, payload: Record<string, unknown>): boolean {
    if (this.state.permissionMode === "full-access") {
      return false;
    }

    if (commandType !== "process.run") {
      return false;
    }

    const commandText = extractProcessText(payload);
    if (!commandText) {
      return true;
    }

    if (PROCESS_BLACKLIST.some((pattern) => pattern.test(commandText))) {
      return true;
    }

    return !PROCESS_ALLOWLIST.some((pattern) => pattern.test(commandText));
  }
}

function sanitizePath(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function extractProcessText(payload: Record<string, unknown>): string {
  const command = typeof payload.command === "string" ? payload.command : "";
  const args = Array.isArray(payload.args) ? payload.args.filter((item): item is string => typeof item === "string") : [];
  if (command === "sh" && args[0] === "-lc" && args[1]) {
    return args[1];
  }

  return [command, ...args].join(" ").trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikePath(value: string): boolean {
  const candidate = sanitizePath(value);
  return /[./\\]/.test(candidate) || /\.[a-z0-9]{1,8}$/i.test(candidate);
}

function buildRunPayload(shellCommand: string): Record<string, unknown> {
  return {
    command: "sh",
    args: ["-lc", shellCommand.trim()],
    cwd: ".",
  };
}

function findDelimitedContent(text: string): string | undefined {
  const fenced = text.match(/```(?:\w+)?\n([\s\S]+?)```/);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const inline = text.match(/`([^`]+)`/);
  if (inline?.[1]) {
    return inline[1].trim();
  }

  const quoted = text.match(/["“”'']([^"“”'']{2,})["“”'']/);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  return undefined;
}
