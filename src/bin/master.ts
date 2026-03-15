import { homedir } from "node:os";
import { resolve } from "node:path";
import { readFlag } from "../shared/cli.js";
import { MasterServer } from "../master/server.js";

const args = process.argv.slice(2);
const port = Number(readFlag(args, "--port") ?? "4318");
const stateFile = resolve(readFlag(args, "--state-file") ?? `${homedir()}/.pluto/state.json`);

const server = new MasterServer({ port, stateFile });

await server.listen();
console.log(`Pluto master listening on http://127.0.0.1:${port}`);

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
