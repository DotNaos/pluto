import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import WebSocket, { WebSocketServer, type WebSocket as WebSocketConnection } from "ws";
import { renderAdminHtml, renderChatHtml } from "./dashboard.js";
import { StateStore } from "./state-store.js";
import {
  type AppState,
  type CreateMessageRequest,
  type DomainEvent,
  type HostToMasterMessage,
  type MasterToHostMessage,
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

  private readonly hostSockets = new Map<string, WebSocketConnection>();

  private readonly sseClients = new Set<ServerResponse>();

  private readonly wsServer = new WebSocketServer({ noServer: true });

  private readonly server = createServer(this.handleRequest.bind(this));

  public constructor(options: MasterServerOptions) {
    this.options = options;
    this.store = new StateStore(options.stateFile);

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
  }

  public getState(): AppState {
    return this.store.snapshot();
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(renderChatHtml());
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(renderAdminHtml());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      sendJson(response, 200, this.store.snapshot());
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

    if (request.method === "POST" && url.pathname === "/api/messages") {
      try {
        const body = await readJsonBody<CreateMessageRequest>(request);
        if (!body.text || body.text.trim() === "") {
          sendJson(response, 400, { error: "text is required" });
          return;
        }

        const { dispatch } = this.store.createMessageAndDispatch(body);
        if (dispatch) {
          const socket = this.hostSockets.get(dispatch.hostId);
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            this.store.failCommand(dispatch.command.id, `Host ${dispatch.hostId} is not currently connected.`);
            sendJson(response, 409, { error: `Host ${dispatch.hostId} is not currently connected.` });
            return;
          }

          const envelope: MasterToHostMessage = { type: "command.dispatch", command: dispatch.command };
          socket.send(JSON.stringify(envelope));
        }

        sendJson(response, 202, this.store.snapshot());
      } catch (error) {
        sendJson(response, 409, { error: error instanceof Error ? error.message : "unknown error" });
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
