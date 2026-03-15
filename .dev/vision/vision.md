# Pluto Vision

## Purpose

Pluto is a single-chat AI assistant system with a central coordinator and one or more connected hosts. The user interacts through one simple interface while Pluto manages context boundaries, execution state, and access to remote resources across devices.

Pluto should feel like one assistant, not a collection of sessions, chats, or tools.

## Product direction

The system is optimizing for:

- one ongoing conversation instead of separate chats
- a central agent runtime that owns orchestration and state
- remote execution on connected hosts through an explicit protocol
- seamless continuation of work across macOS, iPhone, and later watchOS
- synchronization of agent state rather than synchronization of arbitrary filesystems

## User experience model

The UI presents:

- one assistant
- one chat
- one continuous history

The user can change topics freely. Pluto handles the internal mechanics:

- opening context boundaries
- summarizing older work
- choosing the active workspace
- routing execution to the appropriate host

Execution details may be inspectable, but host routing is not the primary UX.

## Core principles

### Single conversation

There is exactly one conversation stream. Pluto manages topic shifts internally through context boundaries instead of exposing separate chats.

### Centralized intelligence

The master server owns the agent runtime, orchestration, and source of truth. Hosts do not own global conversation or planning state.

### Distributed execution

Hosts expose local resources and execution capabilities to the master, including files, shell commands, git operations, and workspace search.

### State-first synchronization

Pluto synchronizes the state required to continue work anywhere: conversation events, context state, runs, commands, and artifact metadata.

Pluto does not automatically synchronize arbitrary project contents, caches, dependencies, or secrets.

### Protocol over mounted filesystem

Remote access is modeled as explicit commands against a workspace protocol. Raw filesystem mounting is not the primary abstraction.

## System roles

### Master

The central Pluto server:

- receives all user messages
- stores the global conversation
- maintains context boundaries and snapshots
- runs the planner and main agent loop
- manages connected hosts
- dispatches commands
- collects results
- publishes realtime state updates

### Host

A connected execution node:

- registers with the master over an outbound connection
- advertises capabilities
- exposes explicitly shared workspaces
- executes delegated commands
- streams progress and results back

### Workspace

A host-local directory or project exposed to Pluto. A workspace always belongs to a host.

## Long-term system shape

```text
Client Apps
- macOS app
- iPhone app
- watchOS app (later)
        |
        v
Pluto Master
- API
- Realtime gateway
- Agent runtime
- Context manager
- Command router
- Event log
- Persistence
        |
        +--------------------+
        |                    |
        v                    v
Pluto Host                Pluto Host
Laptop                    VPS worker / future host
- workspace protocol      - workspace protocol
- shell/git/files         - shell/git/files
- outbound connection     - outbound connection
```

## Synchronization philosophy

The master is the single source of truth for:

- conversation events
- context boundaries and snapshots
- run state
- command state
- artifact metadata
- host presence
- workspace metadata

Host-local contents remain local unless explicitly requested or uploaded.

## Open questions

- Should context boundaries remain fully automatic in v1, or become manually markable later?
- Should hosts push file change events proactively, or only respond to direct commands in v1?
- Do runs start with one active workspace or multiple allowed workspaces?
- Should small generated files be copied centrally as artifacts in v1?
- How much command streaming detail belongs in the user-facing UI?

## Guiding rule

Synchronize agent state always. Synchronize filesystem contents only when explicitly required.
