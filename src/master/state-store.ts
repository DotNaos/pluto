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

  public createMessageAndDispatch(request: CreateMessageRequest): { message: MessageRecord; dispatch?: QueuedDispatch } {
    const message = this.createMessage("user", request.text);

    if (!request.commandType) {
      this.createMessage("assistant", "Message stored. No command dispatched.");
      return { message };
    }

    const host = request.hostId
      ? this.state.hosts.find((candidate) => candidate.id === request.hostId && candidate.connected)
      : this.state.hosts.find((candidate) => candidate.connected);
    if (!host) {
      throw new Error("No connected host is available.");
    }

    const workspace = request.workspaceId
      ? this.state.workspaces.find((candidate) => candidate.id === request.workspaceId && candidate.hostId === host.id)
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
      type: request.commandType,
      payload: request.payload ?? {},
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
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
    this.createMessage("assistant", `Dispatching ${command.type} to ${host.name}/${workspace.name}.`, run.id);

    return { message, dispatch: { hostId: host.id, command } };
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

  public completeCommand(commandId: string, result: Record<string, unknown>): void {
    const command = this.mustFindCommand(commandId);
    const run = this.mustFindRun(command.runId);
    const timestamp = now();
    const artifact = this.buildArtifact(command, run, result, timestamp);

    command.status = "completed";
    command.updatedAt = timestamp;
    command.completedAt = timestamp;
    command.resultRef = artifact.id;

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
    this.recordEvent("message.created", { messageId: message.id, role: message.role, runId });
    return message;
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

  private buildCompletionMessage(command: CommandRecord, artifact: ArtifactRecord): string {
    if (artifact.kind === "file-ref") {
      const relativePath = artifact.metadata.relativePath;
      return `Command ${command.type} completed and produced ${String(relativePath)}.`;
    }

    const exitCode = artifact.metadata.exitCode;
    const summary = typeof artifact.metadata.content === "string"
      ? ` Result: ${artifact.metadata.content}`
      : typeof artifact.metadata.stdout === "string"
        ? ` Output: ${artifact.metadata.stdout}`.slice(0, 240)
        : "";
    return `Command ${command.type} completed with exit code ${String(exitCode ?? 0)}.${summary}`;
  }

  private mustFindCommand(commandId: string): CommandRecord {
    const command = this.state.commands.find((candidate) => candidate.id === commandId);
    if (!command) {
      throw new Error(`Unknown command ${commandId}`);
    }

    return command;
  }

  private mustFindRun(runId: string): RunRecord {
    const run = this.state.runs.find((candidate) => candidate.id === runId);
    if (!run) {
      throw new Error(`Unknown run ${runId}`);
    }

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
}
