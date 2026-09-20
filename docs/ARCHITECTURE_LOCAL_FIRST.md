# Projeto Titã — Local-First Architecture

## Core principle

Cloud must not be required for the primary workout flow.

Conceptually:

UI
→ Titã Core
→ Local Database

Optional extensions:

Local Database
→ SyncAdapter
→ Remote Sync Provider

Analytics Engine
→ AIProvider
→ External or Local Model

## Proposed logical layers

### Presentation

- Web/PWA UI
- Android/iOS shell
- responsive app shell
- active workout UI

### Domain

- Workout Engine
- Routine Engine
- Program Engine
- Progress Engine
- Program Discovery Engine
- Backup/Import Engine
- Migration Engine

### Persistence

Repository interfaces such as:

- WorkoutRepository
- RoutineRepository
- ProgramRepository
- ExerciseRepository
- MeasurementRepository
- SettingsRepository

### Optional sync

- SyncAdapter
- provider-specific implementation

### Optional AI

- AIProvider
- local query/read-only tools
- structured analytics payloads

### Exercise media

- ExerciseMediaProvider
- source/license metadata

## Local database goals

Evaluate the best fit for the existing stack.

Potential directions:

- Web/PWA: SQLite/WASM or robust IndexedDB-backed abstraction
- Android/iOS: native SQLite via Capacitor-compatible approach

Requirements:

- transactions;
- migrations;
- stable IDs;
- offline operation;
- good query performance;
- durability.

## Optional sync

Preferred research direction:

- PowerSync + Supabase/PostgreSQL

But the implementation must remain replaceable through `SyncAdapter`.

Sync is introduced after the local product is reliable.

## Conflict strategy

Reduce conflicts by domain design.

Completed `WorkoutSession` should behave as an effectively immutable snapshot.

Editable records may include revision metadata:

- id
- createdAt
- updatedAt
- revision
- deletedAt
- client/device identifier where useful

Ambiguous conflicts must not silently discard one side.

## Backup

Backups are independent from sync.

A user should be able to export and restore data even if sync is never enabled.

## Reliability priority

1. Do not lose workout data.
2. Local writes succeed quickly.
3. Offline behavior remains complete.
4. Sync catches up later.
5. Cloud must never be used to hide broken local persistence.
