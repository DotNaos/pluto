import { spawn, type ChildProcess } from "node:child_process";

const publicHost = process.env.HOST ?? process.env.PLUTO_HOST ?? "127.0.0.1";
const publicPort = Number(process.env.PORT ?? process.env.PLUTO_VITE_PORT ?? "4320");
const masterPort = Number(process.env.PLUTO_PORT ?? process.env.PLUTO_API_PORT ?? (process.env.PORT ? String(publicPort + 1) : "4318"));
const hostFullAccess = process.env.PLUTO_HOST_FULL_ACCESS === "1";
const repoRoot = process.cwd();

const children = new Set<ChildProcess>();
let shuttingDown = false;

function startProcess(
  label: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): ChildProcess {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) {
      return;
    }

    console.error(`[${label}] exited unexpectedly (${signal ?? code ?? "unknown"}).`);
    void shutdown(code ?? 1);
  });

  return child;
}

async function waitForMaster(url: string): Promise<void> {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Master is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Pluto master did not become ready at ${url}.`);
}

async function shutdown(exitCode = 0): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }

  await Promise.all(
    [...children].map(
      (child) =>
        new Promise<void>((resolve) => {
          child.once("exit", () => resolve());
        }),
    ),
  );

  process.exit(exitCode);
}

async function main(): Promise<void> {
  console.log(`Pluto dev starting:
  chat:   ${process.env.PORTLESS_URL ?? `http://${publicHost}:${publicPort}`}
  admin:  ${(process.env.PORTLESS_URL ?? `http://${publicHost}:${publicPort}`)}/admin
  api:    http://${publicHost}:${masterPort}
  host:   ${hostFullAccess ? "full-access" : "workspace-scoped"}`);

  startProcess("master", "pnpm", ["exec", "tsx", "src/bin/master.ts", "--host", publicHost, "--port", String(masterPort)]);

  await waitForMaster(`http://${publicHost}:${masterPort}/healthz`);

  startProcess(
    "host",
    "pnpm",
    [
      "exec",
      "tsx",
      "src/bin/host.ts",
      "--master-url",
      `ws://${publicHost}:${masterPort}`,
      ...(hostFullAccess ? ["--full-access"] : []),
    ],
  );

  startProcess(
    "web",
    "pnpm",
    ["exec", "vite", "--config", "frontend/vite.config.ts", "--host", publicHost, "--port", String(publicPort)],
    {
      HOST: publicHost,
      PORT: String(publicPort),
      PLUTO_DEV_PROXY_TARGET: `http://${publicHost}:${masterPort}`,
      PORTLESS_URL: process.env.PORTLESS_URL ?? "",
    },
  );
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

await main();
