# Projeto Titã — Training Model

## Design goal

Support both simple and advanced training without forcing advanced complexity onto everyone.

## Main hierarchy

Program
→ Mesocycle / phase (optional)
→ Week
→ Workout / Routine
→ Exercise
→ ExerciseSet

## Basic set

Minimum useful fields:

- exerciseId
- weight
- reps
- completion state

## Optional set metadata

- duration
- distance
- RPE
- RIR
- tempo
- restTarget
- restActual
- setType
- notes
- timestamps

## Candidate set types

- NORMAL
- WARMUP
- TOP_SET
- BACKOFF
- DROP_SET
- REST_PAUSE
- MYO_REP
- AMRAP
- FAILURE
- CLUSTER
- PAUSED
- TEMPO
- ISOMETRIC

## Grouped work

Use a grouping model for:

- SUPERSET
- TRI_SET
- GIANT_SET
- CIRCUIT

Exercises retain their own identity.

## Progression strategies

Provide a pluggable `ProgressionStrategy`.

Candidates:

- Manual
- Linear Progression
- Double Progression
- Dynamic Double Progression
- Rep Goal
- Percentage Based
- RPE/RIR Based
- Top Set + Backoff
- Custom/future

Suggestions require user approval.

## Program templates

Separate:

- training structure;
- progression method;
- exercise selection;
- user preferences.

Built-in structures may include:

- Full Body
- Upper/Lower
- Push/Pull/Legs
- Push/Pull
- Upper/Lower/Full
- Movement-based split
- Custom split

## Program discovery

`ProgramDiscoveryEngine` should rank compatible structures using user preferences.

Possible inputs:

- days/week
- duration/session
- experience
- goal preference
- equipment
- preferred structure
- desired complexity

Output should explain why a structure matches.

The score is a compatibility score, not a scientific probability.

## Exercise roles

Templates should use abstract roles where useful, e.g.:

- Horizontal Press
- Vertical Press
- Horizontal Pull
- Vertical Pull
- Squat Pattern
- Hip Hinge
- Knee Flexion
- Elbow Flexion
- Elbow Extension
- Lateral Raise
- Calf
- Core

This allows equipment-aware substitutions.

## Weekly/monthly analytics

Deterministic analytics should exist without AI.

Candidate metrics:

- sessions
- working sets
- reps
- volume
- PRs
- estimated 1RM trend
- frequency
- exercise exposure
- rest consistency
- program adherence
- muscle distribution

## Estimated 1RM

Treat it explicitly as an estimate.

Track:

- formula
- input set
- output value

Do not label estimated values as measured 1RM.

## Personal records

Candidate categories:

- Heaviest Weight
- Most Reps at Weight
- Estimated 1RM
- Best Volume Set
- Best Session Volume

## Plateau/anomaly logic

Use explainable heuristics.

Examples:

- no meaningful change after N exposures;
- volume materially outside recent rolling range;
- exercise absent for an extended period.

Do not turn heuristics into medical or causal claims.
