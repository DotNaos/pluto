# Target Architecture

## Objective

The long-term Pluto architecture supports one assistant experience across multiple clients and multiple connected execution hosts while keeping the master as the control plane and source of truth.

## Components

### Client apps

Clients provide the conversation UI and reflect current system state. They do not own planning logic.

Expected clients:

- macOS
- iPhone
- watchOS later

### Pluto master

The master provides:

- API surface for user messages and queries
- realtime gateway for clients and hosts
- agent runtime and planner
- context management
- command routing
- event logging
- persistence

For Codex-backed assistant flows that Pluto embeds locally, the integration point should be the official `codex app-server`, not the high-level Codex SDK. Pluto needs Codex-native thread history, approvals, streaming item events, and session compatibility, which align with the app-server surface.

### Pluto hosts

Hosts provide:

- outbound authenticated connection to the master
- capability advertisement
- named workspace exposure
- local execution of filesystem, git, search, and process operations

## Execution model

1. A client submits a user message to the master.
2. The master stores the message and resolves the active context.
3. The master decides whether host execution is needed.
4. The master issues commands to the selected host and workspace.
5. The host executes locally and streams back progress and results.
6. The master persists run and command state, then broadcasts updates.

## Storage shape

The master should persist structured entities such as:

- conversation
- message
- context boundary
- context snapshot
- run
- command
- artifact
- host
- host session
- workspace
- workspace file reference

Suggested storage split:

- relational database for structured state
- object storage for logs and larger artifacts
- optional client-side cache later for offline UX

## Security posture

Remote hosts are sensitive execution surfaces. The default posture should be:

- outbound-only host connectivity
- strong host authentication
- explicitly shared workspaces
- restricted filesystem roots
- auditable command history
- no automatic mirroring of secrets or arbitrary local data
