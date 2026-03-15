# Context Model

## Goal

Support a single visible conversation while allowing Pluto to segment and compress work internally.

## Core entities

### Conversation

The one global assistant conversation.

### Message

A user or assistant message appended to the conversation.

### ContextBoundary

Marks a transition in topic, active work area, or compressed history segment.

### ContextSnapshot

A compact state package that allows Pluto to continue work without replaying the entire message log.

### Run

A higher-level unit of agent work triggered from the conversation.

### Artifact

A durable output created by a run or command.

## Required state

Each active context should be able to resolve:

- active context id
- prior summarized state
- relevant workspaces
- relevant artifacts
- active goals or tasks
- current run state

## Processing model

Messages remain in a single global stream, but are interpreted within an active context window at processing time.

The master should be able to:

- create a boundary when topic or task focus changes
- carry forward a summary of earlier segments
- attach workspaces and artifacts to the active context
- continue work from a snapshot instead of replaying full history

## First-iteration constraint

Iteration 001 only needs the smallest viable form of this model:

- one conversation
- one active context
- enough structure to introduce explicit boundaries and snapshots later without redesign
