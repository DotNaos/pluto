# Protocol Overview

## Goal

Define the master-host interaction model around typed commands against named workspaces.

## Connection model

Hosts maintain a persistent outbound connection to the master. This avoids requiring inbound access to the host and keeps the master as the control plane.

## Host responsibilities

On connection, a host should:

1. authenticate
2. register identity and session information
3. advertise capabilities
4. publish available workspaces

## Workspace model

A workspace is a host-local directory explicitly shared with Pluto. Commands should target a workspace by identifier instead of relying on a raw path alone.

## Command envelope

Each command should include:

- `id`
- `target_host`
- `target_workspace`
- `type`
- `payload`
- `status`
- `created_at`
- `updated_at`
- `result_ref`

## Command lifecycle

Supported statuses:

- `queued`
- `accepted`
- `running`
- `completed`
- `failed`
- `cancelled`

## Initial command families

- `workspace.list_dir`
- `workspace.read_file`
- `workspace.write_file`
- `workspace.patch_file`
- `workspace.search`
- `process.run`
- `process.stream`
- `git.status`
- `git.diff`

## Security constraints

- Workspaces must be explicitly shared.
- Filesystem access must stay within approved roots.
- Commands and results must be auditable.
- Secrets remain host-local unless explicitly requested for a task that requires them.
