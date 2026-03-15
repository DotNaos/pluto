export type CommandType = "workspace.read_file" | "workspace.write_file" | "process.run";

export type CommandStatus =
  | "queued"
  | "accepted"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface MessageRecord {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  contextId: string;
  runId?: string;
}

export interface ContextBoundaryRecord {
  id: string;
  createdAt: string;
  reason: string;
}

export interface ContextSnapshotRecord {
  id: string;
  contextId: string;
  createdAt: string;
  summary: string;
}

export interface WorkspaceRecord {
  id: string;
  hostId: string;
  name: string;
  rootPath: string;
}

export interface HostRecord {
  id: string;
  name: string;
  connected: boolean;
  connectedAt?: string;
  lastSeenAt: string;
  capabilities: string[];
  workspaceIds: string[];
}

export interface RunRecord {
  id: string;
  messageId: string;
  hostId: string;
  workspaceId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  commandIds: string[];
}

export interface CommandRecord {
  id: string;
  runId: string;
  targetHost: string;
  targetWorkspace: string;
  type: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  resultRef?: string;
  error?: string;
}

export interface ArtifactRecord {
  id: string;
  runId: string;
  commandId: string;
  kind: "command-result" | "file-ref";
  title: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface DomainEvent {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface AppState {
  conversationId: string;
  activeContextId: string;
  messages: MessageRecord[];
  contextBoundaries: ContextBoundaryRecord[];
  contextSnapshots: ContextSnapshotRecord[];
  hosts: HostRecord[];
  workspaces: WorkspaceRecord[];
  runs: RunRecord[];
  commands: CommandRecord[];
  artifacts: ArtifactRecord[];
  events: DomainEvent[];
}

export interface RegisteredWorkspace {
  id: string;
  name: string;
  rootPath: string;
}

export interface HostRegistration {
  id: string;
  name: string;
  capabilities: string[];
  workspaces: RegisteredWorkspace[];
}

export interface CommandDispatchEnvelope {
  type: "command.dispatch";
  command: CommandRecord;
}

export interface HostRegisterEnvelope {
  type: "host.register";
  host: HostRegistration;
}

export interface HostCommandAcceptedEnvelope {
  type: "command.accepted";
  commandId: string;
}

export interface HostCommandRunningEnvelope {
  type: "command.running";
  commandId: string;
}

export interface HostCommandCompletedEnvelope {
  type: "command.completed";
  commandId: string;
  result: Record<string, unknown>;
}

export interface HostCommandFailedEnvelope {
  type: "command.failed";
  commandId: string;
  error: string;
}

export type MasterToHostMessage = CommandDispatchEnvelope;

export type HostToMasterMessage =
  | HostRegisterEnvelope
  | HostCommandAcceptedEnvelope
  | HostCommandRunningEnvelope
  | HostCommandCompletedEnvelope
  | HostCommandFailedEnvelope;

export interface CreateMessageRequest {
  text: string;
  commandType?: CommandType;
  payload?: Record<string, unknown>;
  hostId?: string;
  workspaceId?: string;
}
