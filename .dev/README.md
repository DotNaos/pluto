# Pluto Docs

This directory separates stable product direction from iteration delivery scope.

## Reading order

1. [`vision/vision.md`](/Users/oli/projects/pluto/.dev/vision/vision.md) for the long-term product and UX model.
2. [`vision/architecture-principles.md`](/Users/oli/projects/pluto/.dev/vision/architecture-principles.md) for the architectural rules that should stay stable across iterations.
3. [`vision/target-architecture.md`](/Users/oli/projects/pluto/.dev/vision/target-architecture.md) for the long-term system shape.
4. `architecture/*` for implementation-facing models and protocols.
5. `iterations/*/scope.md` for current milestone commitments.
6. [`architecture/repo-workflow.md`](/Users/oli/projects/pluto/.dev/architecture/repo-workflow.md) for branch, PR, and worktree conventions.

## Structure

```text
.dev/
  README.md
  vision/
    vision.md
    architecture-principles.md
    target-architecture.md
  architecture/
    context-model.md
    protocol-overview.md
    event-model.md
    repo-workflow.md
  iterations/
    001-foundation/
      scope.md
    002-host-protocol/
      scope.md
    003-client-sync/
      scope.md
```

## Rule of thumb

- Put stable intent in `vision/`.
- Put implementation models in `architecture/`.
- Put milestone-specific scope in `iterations/`.
