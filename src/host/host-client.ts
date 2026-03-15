import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";
import {
  type CommandRecord,
  type HostRegistration,
  type HostToMasterMessage,
  type MasterToHostMessage,
  type RegisteredWorkspace,
} from "../shared/types.js";

function isInsideRoot(rootPath: string, candidatePath: string): boolean {
  const normalizedRoot = `${resolve(rootPath)}${sep}`;
  const normalizedCandidate = resolve(candidatePath);
  return normalizedCandidate === resolve(rootPath) || normalizedCandidate.startsWith(normalizedRoot);
}

function resolveWorkspacePath(rootPath: string, filePath: string): string {
  const resolved = resolve(rootPath, filePath);
  if (!isInsideRoot(rootPath, resolved)) {
    throw new Error(`Path escapes workspace root: ${filePath}`);
  }

  return resolved;
}

export interface HostWorkspaceConfig {
  id: string;
  name: string;
  rootPath: string;
}

export interface HostClientOptions {
  hostId: string;
  hostName: string;
  masterUrl: string;
  workspaces: HostWorkspaceConfig[];
}

export class HostClient {
  private readonly options: HostClientOptions;

  private readonly socket: WebSocket;

  public constructor(options: HostClientOptions) {
    this.options = options;
    this.socket = new WebSocket(toWebSocketUrl(options.masterUrl));
  }

  public async connect(): Promise<void> {
    await new Promise<void>((resolveConnect, rejectConnect) => {
      this.socket.once("open", () => resolveConnect());
      this.socket.once("error", (error) => rejectConnect(error));
    });

    this.socket.on("message", (rawMessage) => {
      const message = JSON.parse(String(rawMessage)) as MasterToHostMessage;
      if (message.type === "command.dispatch") {
        void this.executeCommand(message.command);
      }
    });

    const registration: HostRegistration = {
      id: this.options.hostId,
      name: this.options.hostName,
      capabilities: ["workspace.read_file", "workspace.write_file", "process.run", "workspace.list_dir"],
      workspaces: this.options.workspaces.map(
        (workspace): RegisteredWorkspace => ({
          id: workspace.id,
          name: workspace.name,
          rootPath: workspace.rootPath,
        }),
      ),
    };

    this.send({ type: "host.register", host: registration });
  }

  public async close(): Promise<void> {
    this.socket.close();
    await new Promise<void>((resolveClose) => {
      this.socket.once("close", () => resolveClose());
    });
  }

  private async executeCommand(command: CommandRecord): Promise<void> {
    try {
      this.send({ type: "command.accepted", commandId: command.id });
      this.send({ type: "command.running", commandId: command.id });

      const workspace = this.options.workspaces.find((candidate) => candidate.id === command.targetWorkspace);
      if (!workspace) {
        throw new Error(`Unknown workspace ${command.targetWorkspace}`);
      }

      let result: Record<string, unknown>;
      switch (command.type) {
        case "workspace.read_file":
          result = await this.readWorkspaceFile(workspace.rootPath, command.payload);
          break;
        case "workspace.write_file":
          result = await this.writeWorkspaceFile(workspace.rootPath, command.payload);
          break;
        case "process.run":
          result = await this.runProcess(workspace.rootPath, command.payload);
          break;
        default:
          throw new Error(`Unsupported command type ${String(command.type)}`);
      }

      this.send({ type: "command.completed", commandId: command.id, result });
    } catch (error) {
      this.send({
        type: "command.failed",
        commandId: command.id,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  private async readWorkspaceFile(rootPath: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const relativePath = expectString(payload.path, "path");
    const targetPath = resolveWorkspacePath(rootPath, relativePath);
    const content = await readFile(targetPath, "utf8");

    return {
      relativePath,
      content,
      bytesRead: Buffer.byteLength(content, "utf8"),
    };
  }

  private async writeWorkspaceFile(rootPath: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const relativePath = expectString(payload.path, "path");
    const content = expectString(payload.content, "content");
    const targetPath = resolveWorkspacePath(rootPath, relativePath);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");

    return {
      relativePath,
      bytesWritten: Buffer.byteLength(content, "utf8"),
    };
  }

  private async runProcess(rootPath: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const command = expectString(payload.command, "command");
    const argsValue = payload.args;
    const args = Array.isArray(argsValue) ? argsValue.map((item) => expectString(item, "args entry")) : [];
    const relativeCwd = typeof payload.cwd === "string" ? payload.cwd : ".";
    const cwd = resolveWorkspacePath(rootPath, relativeCwd);

    const { stdout, stderr, exitCode } = await runSubprocess(command, args, cwd);

    return {
      cwd: relative(rootPath, cwd) || ".",
      command,
      args,
      stdout,
      stderr,
      exitCode,
    };
  }

  private send(message: HostToMasterMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}

function toWebSocketUrl(masterUrl: string): string {
  const normalized = masterUrl.replace(/\/$/, "");
  if (normalized.startsWith("ws://") || normalized.startsWith("wss://")) {
    return `${normalized}/ws/host`;
  }

  if (normalized.startsWith("http://")) {
    return `${normalized.replace(/^http:\/\//, "ws://")}/ws/host`;
  }

  if (normalized.startsWith("https://")) {
    return `${normalized.replace(/^https:\/\//, "wss://")}/ws/host`;
  }

  return `ws://${normalized}/ws/host`;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

async function runSubprocess(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", (error) => rejectRun(error));
    child.on("close", (exitCode) => {
      resolveRun({
        stdout: Buffer.concat(stdout).toString("utf8").trim(),
        stderr: Buffer.concat(stderr).toString("utf8").trim(),
        exitCode: exitCode ?? 0,
      });
    });
  });
}
