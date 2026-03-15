# Architecture Principles

These principles should remain stable even as iteration scope changes.

## 1. Master-owned truth

The master is the sole source of truth for conversation, execution, and synchronization state. Hosts are execution surfaces, not state authorities.

## 2. Explicit workspace protocol

All remote access should go through typed commands against named workspaces. Avoid designing around shared mounts or implicit host-local assumptions.

## 3. Auditable execution

Every delegated action should be attributable to:

- a run
- a command id
- a host
- a workspace
- timestamps and status transitions

## 4. Restricted host exposure

Hosts expose only approved workspace roots and approved capabilities. They should not implicitly mirror local state or secrets to the master.

## 5. Realtime state propagation

Clients and hosts subscribe to the master and react to state changes. Realtime behavior should be driven by structured events, not polling individual host state as the main model.

## 6. Context segmentation behind a single chat

Pluto should preserve a one-chat experience for the user while internally segmenting context to keep planning and continuation tractable.

## 7. Iterative delivery

Each iteration should add a stable slice of the final system shape without forcing a redesign of the core roles:

- clients talk to the master
- the master owns state and orchestration
- hosts execute against local workspaces
