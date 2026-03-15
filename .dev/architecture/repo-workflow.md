# Repo Workflow

## Goal

Keep Pluto delivery structured around a protected release branch, a protected integration branch, and stacked feature branches per iteration.

## Branch model

### `main`

- Production and release branch.
- Protected.
- Only receives changes via pull request from `dev` or a hotfix branch.

### `dev`

- Integration branch for the next release cut.
- Protected.
- Receives iteration feature branches via pull request.

### Iteration feature branches

Use one feature branch per iteration and keep them stacked:

1. `feature/001-foundation` based on `dev`
2. `feature/002-host-protocol` based on `feature/001-foundation`
3. `feature/003-client-sync` based on `feature/002-host-protocol`

This keeps review scope aligned with the iteration plan while still allowing later iterations to start before earlier ones merge.

## Pull request model

Open pull requests in the same stack order:

1. `feature/001-foundation` -> `dev`
2. `feature/002-host-protocol` -> `feature/001-foundation`
3. `feature/003-client-sync` -> `feature/002-host-protocol`

When a lower branch merges or changes, rebase or restack the branches above it before merging upward into `dev`.

## Worktree model

Manage iteration branches through `project-toolkit` worktrees:

- worktree `iteration-001-foundation` for `feature/001-foundation`
- worktree `iteration-002-host-protocol` for `feature/002-host-protocol`
- worktree `iteration-003-client-sync` for `feature/003-client-sync`

This keeps branch-local workspace state isolated and avoids mixing iteration work in one checkout.

## Rules

- Do not develop directly on `main`.
- Do not develop directly on `dev` except for controlled maintenance tasks.
- Keep each iteration branch scoped to its own `scope.md`.
- Merge releases through `dev` into `main`.
- If a hotfix lands on `main`, back-merge it into `dev` immediately.

## Toolkit commands

Initialize repository scaffolding once:

```bash
pkit project init
```

Create the managed iteration worktrees:

```bash
pkit project worktree create iteration-001-foundation --branch feature/001-foundation --base dev
pkit project worktree create iteration-002-host-protocol --branch feature/002-host-protocol --base feature/001-foundation
pkit project worktree create iteration-003-client-sync --branch feature/003-client-sync --base feature/002-host-protocol
```
