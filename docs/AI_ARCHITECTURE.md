# Projeto Titã — AI Architecture

> Estado executável do RC: [Titã Intelligence V0.1](INTELLIGENCE_RC.md). OpenAI-compatible (incluindo NVIDIA NIM), Gemini nativo, BYOK somente em memória e Smart Substitution foram implementados. As seções conceituais abaixo descrevem direção de produto; Ask Titã, histórico de análises, persistência de credenciais e demais adapters não estão implementados neste RC. Publicação suspensa.

## Product position

AI is optional.

The workout tracker is the product.

AI is an advanced analysis layer for users who choose to enable it.

## Default

`AI = OFF`

A user who never enables AI should still receive:

- full tracking;
- routines;
- history;
- progress;
- PRs;
- weekly review;
- monthly review;
- import/export;
- optional sync.

## BYOK

Projeto Titã should not subsidize API usage.

Users provide their own provider/API key.

Candidate provider categories:

- OpenAI-compatible
- Gemini
- Anthropic
- Ollama/local
- future providers

Use an `AIProvider` abstraction.

## Suggested interface

Conceptually:

- `analyzeWeeklySummary()`
- `analyzeMonthlySummary()`
- `analyzeExerciseTrend()`
- `analyzeProgram()`
- `answerTrainingQuestion()`

## Privacy

Do not send the whole database automatically.

Preferred flow:

Local Database
→ Analytics Engine
→ Structured Summary
→ AI Provider

Do not automatically include:

- photos;
- credentials;
- tokens;
- irrelevant private notes;
- unrelated files.

Text notes should be opt-in when external AI is involved.

## Read-only-first

Initial AI tools should query data only.

Examples:

- getWorkouts()
- getExerciseHistory()
- getWeeklySummary()
- getMonthlySummary()
- getPersonalRecords()
- getProgressMetrics()
- getRoutineHistory()

No autonomous write tools initially.

## Explainability

AI insights should reference the data behind them.

Example:

Insight:
“Bench press performance shows a positive trend.”

Evidence:
- session A
- session B
- session C
- computed metric

## Data support indicator

Insights may label support as:

- High
- Medium
- Low

This indicates data availability/quality, not scientific certainty.

## User control

AI may suggest:

- progression change;
- exercise substitution;
- program adjustment.

The user must choose:

- Apply
- Edit
- Ignore

No silent changes.

## Ask Titã

Potential questions:

- How has my bench press changed over the last two months?
- Which exercise improved most?
- Which exercises appear stagnant?
- Compare my last four Upper A sessions.
- What PRs did I hit this month?
- How did my volume change?

## AI review history

Store locally:

- review type
- period
- generatedAt
- provider
- model
- data snapshot hash
- summary
- references

Never store the API key in the review record.

## Failure behavior

If the AI provider is unavailable or misconfigured:

- core app continues working;
- deterministic analytics remain available;
- show a recoverable AI-specific error;
- do not block workout features.
