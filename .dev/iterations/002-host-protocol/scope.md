# Iteration 002: Host Protocol

## Goal

Stabilize and formalize the host-side protocol so the master can reliably access remote workspaces and execution capabilities.

## In scope

- explicit host capability model
- structured command types
- structured command results
- workspace protocol definitions
- command lifecycle and status model
- stronger host authentication
- allowed workspace roots
- audit trail per command
- git-oriented commands
- workspace search

## Out of scope

- autonomous multi-host planning
- actual filesystem synchronization
- desktop GUI automation
- advanced retry or orchestration logic

## Exit criteria

- the master can discover host capabilities
- the master can target a named workspace on a host
- core commands use stable typed payloads
- command execution is auditable
- failures are represented consistently
