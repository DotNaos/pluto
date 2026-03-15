# Iteration 003: Client Sync

## Goal

Make all clients reflect the same master state live so work can move seamlessly between laptop and phone.

## In scope

- realtime event stream from the master
- client subscription model
- consistent conversation updates
- run status updates across clients
- host presence updates
- workspace attachment visibility
- artifact and result state propagation
- active context state propagation
- basic reconnect and resync behavior

## Out of scope

- offline-first full sync
- local-first merge resolution
- watchOS-specific UX
- background automation engine

## Exit criteria

- a user can chat from the phone against the master
- the laptop client updates live
- host execution status is visible on all connected clients
- a reconnecting client can rebuild current visible state from the master
