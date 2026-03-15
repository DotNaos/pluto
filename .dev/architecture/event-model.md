# Event Model

## Goal

Keep clients and hosts aligned by publishing state transitions from the master in realtime.

## Source of truth

The master publishes events derived from persisted state changes. Clients should treat the master as authoritative instead of reconstructing truth from local assumptions.

## Core event categories

- message received
- context changed
- run started
- run updated
- run completed
- command queued
- command status updated
- artifact created
- host connected
- host disconnected
- workspace attached

## Delivery model

All clients and hosts subscribe to the master. Realtime updates should be incremental, but reconnecting clients must also be able to rebuild the currently visible state from the master.

## Expected benefits

- phone and laptop clients show the same conversation and run state
- host presence changes are visible everywhere
- remote execution progress can be inspected consistently
- clients can recover after reconnect without replaying arbitrary host-local history

## First-iteration requirement

Iteration 001 only needs basic event coverage for:

- message creation
- host presence
- run lifecycle
- command status updates
- artifact creation
