import { resolve } from "node:path";
import { cwd } from "node:process";
import { HostClient } from "../host/host-client.js";
import { readFlag, readRepeatedFlag } from "../shared/cli.js";

const args = process.argv.slice(2);
const masterUrl = readFlag(args, "--master-url") ?? "ws://127.0.0.1:4318";
const hostId = readFlag(args, "--host-id") ?? "laptop";
const hostName = readFlag(args, "--host-name") ?? "Laptop";
const workspaceArgs = readRepeatedFlag(args, "--workspace");
const workspaces = workspaceArgs.length > 0
  ? workspaceArgs.map((entry) => {
      const [name, rawPath] = entry.split("=");
      if (!name || !rawPath) {
        throw new Error(`Invalid --workspace value "${entry}". Expected name=/abs/or/relative/path`);
      }

      return {
        id: `${hostId}:${name}`,
        name,
        rootPath: resolve(rawPath),
      };
    })
  : [
      {
        id: `${hostId}:repo`,
        name: "repo",
        rootPath: cwd(),
      },
    ];

const client = new HostClient({
  masterUrl,
  hostId,
  hostName,
  workspaces,
});

await client.connect();
console.log(`Pluto host ${hostId} connected to ${masterUrl}`);

const shutdown = async (): Promise<void> => {
  await client.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
