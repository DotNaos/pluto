# Pluto

Pluto is a single-conversation AI assistant with centralized intelligence and distributed execution across connected hosts.

Documentation entry points:

- [.dev/README.md](/Users/oli/projects/pluto/.dev/README.md)
- [.dev/vision/vision.md](/Users/oli/projects/pluto/.dev/vision/vision.md)
- [.dev/iterations/001-foundation/scope.md](/Users/oli/projects/pluto/.dev/iterations/001-foundation/scope.md)

## Iteration 001 runtime

The first implementation slice provides:

- one master server with HTTP APIs, SSE updates, and host WebSocket ingress
- one lightweight browser console at `/` for dispatching commands and inspecting state
- one outbound-connected host runtime with explicit workspace roots
- persisted conversation, run, command, artifact, host, and workspace state in a local JSON file
- delegated `workspace.read_file`, `workspace.write_file`, and `process.run` commands

## Run locally

Install dependencies:

```bash
pnpm install
```

Start the master:

```bash
pnpm run master -- --port 4318 --state-file .local/pluto-state.json
```

Start a host from a second shell:

```bash
pnpm run host -- --master-url http://127.0.0.1:4318 --host-id laptop --host-name Laptop --workspace repo=$(pwd)
```

Inspect current state:

```bash
curl http://127.0.0.1:4318/api/state
```

Use the local dashboard:

```bash
open http://127.0.0.1:4318
```

Use the project-toolkit portless flow:

```bash
pkit dev
```

With `portless` installed, this worktree should resolve at:

```text
http://001-foundation.pluto.localhost:1355
```

Create a message that dispatches a host command:

```bash
curl -X POST http://127.0.0.1:4318/api/messages \
  -H 'content-type: application/json' \
  -d '{
    "text": "Read README from the laptop workspace.",
    "commandType": "workspace.read_file",
    "workspaceId": "laptop:repo",
    "payload": { "path": "README.md" }
  }'
```

Run the end-to-end smoke test:

```bash
pnpm run smoke
```
