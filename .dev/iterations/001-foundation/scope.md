# Iteration 001: Foundation

## Goal

Create the smallest possible Pluto system with one master, one connected host, one conversation, and end-to-end command execution.

## In scope

- one master server
- one laptop host
- one global conversation
- message persistence
- host registration and presence
- workspace registration
- basic command dispatch
- filesystem read and write commands
- shell command execution
- artifact metadata persistence
- basic realtime updates

## Out of scope

- multiple hosts
- complex context compression
- file change streaming
- watchOS client
- rich artifact storage
- advanced permissions
- multi-user support

## Exit criteria

- a user can send a message
- the master stores it
- the master dispatches work to the laptop host
- the laptop host executes the command
- the result returns to the master
- a connected client sees updated state
