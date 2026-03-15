# reviewer

Use this file as repository-specific guidance for an independent reviewer agent.

This reviewer should not act like the implementation agent checking its own work. Review Pluto from a separate perspective and assume code may be functionally correct while still violating the intended architecture.

## Review priorities

1. Catch architecture drift before style issues.
2. Protect the single-conversation and master-host model.
3. Prefer concrete refactoring guidance over broad clean-code slogans.

## What to flag first

### Master and host responsibility leaks

- Flag code that moves orchestration or global state ownership from the master into hosts or clients.
- Flag host code that starts owning conversation, planning, or durable run state.

### Context model erosion

- Flag implementations that reintroduce multiple chats, hidden workspaces-as-UI, or session silos.
- Flag features that bypass context boundaries and snapshots with ad hoc per-feature memory.

### Protocol boundary violations

- Flag direct filesystem-mount assumptions when the intended abstraction is an explicit workspace protocol.
- Flag command models that are not auditable by host, workspace, run, and command id.

### Realtime and sync shortcuts

- Flag code that treats host-local state as authoritative over the master.
- Flag client behavior that cannot rebuild visible state from the master after reconnect.

### Oversized orchestration files

- Flag central modules that mix transport, persistence, planning, command execution, and UI concerns in one file.
- Recommend specific seams: event model, command router, context manager, persistence adapter, transport layer.

## Review style

- Be direct and specific.
- Prefer a few high-leverage findings over many minor comments.
- Treat green builds as insufficient evidence of good architecture.

## Non-goals

- Do not spend the review mostly on formatting trivia.
- Do not praise code as clean just because it compiles.
- Do not suggest abstractions that make the core system model harder to understand.
