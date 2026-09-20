# Projeto Titã — Decision Log

## 2026-09-19 — RC: optional BYOK and local exercise substitution

**Decision:** Implement OpenAI-compatible (NVIDIA NIM preset) and native Gemini adapters, session-only keys, explicit preview/consent and validated informational analyses. Smart Substitution uses deterministic local ranking; an optional 4.5-second Fast Judge reorders only those candidates, sharing the principal configuration by default. Substitution preserves completed sets and records events in the final snapshot.

**Scope:** [Current implementation and threat model](INTELLIGENCE_RC.md). No chatbot, silent progression changes, Auto Free provider, persistent key vault or publication. Existing conceptual roadmap remains separate from implemented RC behavior.

## 2026-09-17 — Keep the name Projeto Titã

**Decision:** Public product name remains **Projeto Titã / Titã**.

**Reason:** Stronger identity than generic AI/fitness naming. AI remains a secondary module.

---

## 2026-09-17 — Local-first architecture

**Decision:** Core product reads/writes local data first.

**Reason:** Workout logging must remain usable offline and independent from server availability.

---

## 2026-09-17 — Cloud sync is optional

**Decision:** Cross-device sync exists, but users do not need it.

**Reason:** Preserve data ownership, offline reliability, and a low-friction first-run experience.

---

## 2026-09-17 — Web is a full client

**Decision:** Web/PWA should support full workout/product workflows.

**Reason:** Users should be able to train/manage data from Web as well as mobile.

---

## 2026-09-17 — AI is optional and BYOK

**Decision:** AI is disabled by default. Users connect their own provider/API key.

**Reason:** Keep the core product independent from AI costs/providers and avoid making users feel locked into a paid AI feature.

---

## 2026-09-17 — Deterministic analytics before AI

**Decision:** Weekly/monthly analytics and core metrics must exist without AI.

**Reason:** AI should explain reliable metrics, not replace core computation.

---

## 2026-09-17 — AI read-only-first

**Decision:** Initial AI tooling may query training data but should not directly write training changes.

**Reason:** Reduce risk and preserve user control.

---

## 2026-09-17 — Import/export is a core feature

**Decision:** JSON/ZIP backup and restore remain first-class features.

**Reason:** Data should remain portable even if sync is never enabled.

---

## 2026-09-17 — Exercise media provider abstraction

**Decision:** Media is accessed through `ExerciseMediaProvider`.

**Reason:** Avoid lock-in to one dataset and make licensing/source replacement manageable.

---

## 2026-09-17 — Do not automatically copy openGym assets

**Decision:** openGym can be used as a product benchmark, not as an automatic source of media/code/assets.

**Reason:** Third-party media licensing is separate and may not be transferable.

---

## 2026-09-17 — Candidate media providers

**Decision:** Evaluate `@bryllim/workout-guide` and RepDB before implementation.

**Reason:** Both may offer a cleaner legal/technical path than scraped GIF repositories, subject to current license verification.

---

## 2026-09-17 — Advanced training must stay optional

**Decision:** RPE/RIR, tempo, mesocycles, advanced set types, and progression strategies must be opt-in.

**Reason:** Beginners should still see a fast, simple tracker.

---

## 2026-09-17 — Program discovery should work without AI

**Decision:** The discovery wizard is deterministic first.

**Reason:** AI must not be required to help a user choose a training structure.

---

## 2026-09-17 — User owns template copies

**Decision:** Selecting a template creates a user-owned editable program.

**Reason:** Templates are starting points, not locked prescriptions.

---

## 2026-09-17 — Completed workouts should be reliable snapshots

**Decision:** Completed workout sessions should behave as effectively immutable historical snapshots, with corrections/revisions handled explicitly.

**Reason:** Preserve history integrity and reduce sync conflicts.

---

## 2026-09-17 — Core V1 includes templates but not discovery

**Decision:** Program templates (built-in structures) are Core V1. The deterministic Program Discovery Engine (wizard) is Advanced V1.

**Reason:** Templates are necessary for users who want to start from a known structure. Discovery is a convenience layer that adds significant UX and logic complexity better suited for a second milestone.

---

## 2026-09-17 — React + TypeScript + Vite (supersedes Vanilla JS decision)

**Decision:** Adopt React + TypeScript + Vite as the frontend stack. Migrate incrementally via strangler pattern, not big-bang rewrite.

**Reason:** React + TypeScript provides component model, type safety, and ecosystem maturity needed for the product scope. Vite provides fast dev server, module resolution, and production bundling. Strangler migration preserves existing functionality: freeze behavior → smoke tests → extract domain → React shell → migrate feature by feature → remove legacy when fully replaced.

---

## 2026-09-17 — Lightweight local journal for recovery and audit

**Decision:** A lightweight journal exists in the local core for recovery and basic audit. It is not a full sync oplog.

**Reason:** Recovery needs (crash during active workout, failed migration rollback) justify a minimal journal. A full oplog for sync is V1.x infrastructure and should not be imposed on core local operations. Sync will bring its own mechanism behind SyncAdapter.

---

## 2026-09-17 — Proportional property-based testing (~8-10)

**Decision:** Limit property-based tests to ~8-10 covering critical data paths: migration round-trip, import/export round-trip, backup grammar, timer deadline math, finalization idempotency, set completion uniqueness, history ordering, and progress engine determinism.

**Reason:** Quality must be proportional. 40 PBTs is enterprise-scale overhead for a workout tracker. Critical data paths deserve generative testing; UI, routing, and preferences are better served by example-based and E2E tests.

---

## 2026-09-17 — Sanitize personal content with neutral replacements

**Decision:** Replace hardcoded personal content (names, health data, plans, branding) with neutral generic content. Existing user data in localStorage is never deleted or altered by sanitization.

**Reason:** Neutral content enables a clean open-source publication without requiring the user to configure everything from scratch. User-owned data is preserved per the data ownership principle.

---

## 2026-09-17 — Implementation priority: OSS blockers → domain → functional tracker → polish

**Decision:** Implementation order is: (1) OSS blockers (sanitization, lockfile, LICENSE), (2) domain model and IndexedDB migration, (3) functional tracker (active workout, routines, history), (4) visual polish and advanced features.

**Reason:** Cannot publish without sanitization and license. Cannot build features safely without transactional persistence. Product value comes from a working tracker, not from infrastructure. Polish follows function.

---

## 2026-09-17 — Auto Free AI is experimental; no permanence guarantee

**Decision:** AIProviderRegistry may offer an "Auto Free (Experimental)" option that selects a currently available free-tier provider. This is not guaranteed to persist. Free tier unavailable → graceful fallback to BYOK prompt.

**Reason:** Multiple providers (Gemini, Groq, OpenRouter, Cloudflare Workers AI, Mistral) offer free tiers as of September 2026, but none guarantee permanence. Titã must never promise free AI forever, create accounts automatically, circumvent quotas, or violate provider ToS.

---

## 2026-09-17 — Titã Nutrition is V2 candidate, modular and optional

**Decision:** Nutrition is a future optional module. Not part of Core V1 or V1.x. Must not transform the tracker into a mandatory diet app. NutritionIntelligence uses AIProvider abstraction, not a provider-specific service.

**Reason:** The product is a workout tracker first. Nutrition adds complexity that should only be introduced when the core is stable and complete.

---

## 2026-09-17 — Design Research gate before visual implementation

**Decision:** Before implementing the design system or app shell, produce the archived internal design research documenting sources, patterns observed, patterns rejected, Titã design principles, and a reference matrix by flow. Also produce `docs/DESIGN_SYSTEM.md` before heavy visual implementation.

**Reason:** UI decisions must be grounded in real product research, not model defaults. Anti-patterns (neon glow, glassmorphism, SaaS dashboards) are explicitly rejected. Design must come from context of use.

---

## 2026-09-18 — Progressive disclosure for advanced workout tracking

**Decision:** Advanced set fields (RPE, RIR, tempo, rest target/actual, set type, notes, duration, distance) and superset grouping tools are progressively disclosed: disabled by default, configured via Settings (`AdvancedTrackingSettings`), and condensed into a lightweight collapsible sub-row (`+ Detalhes`) in the workout logger.

**Reason:** Per non-negotiable principles, Titã is a workout tracker first, where speed and clarity beat decorative UI. Logging must be instantaneous on gym floors without overwhelming casual lifters with 8 extra inputs per set, while providing full power to advanced lifters who opt in.

---

## 2026-09-18 — Deterministic, user-approved progression strategy engine (Zero AI)

**Decision:** The progression system implements 9 pluggable mathematical strategies (MANUAL, LINEAR, DOUBLE, DYNAMIC_DOUBLE, REP_GOAL, PERCENTAGE, RPE_RIR, TOP_SET_BACKOFF, CUSTOM) that evaluate purely against local historical workout sessions and rules. Recommendations are strictly suggestions requiring explicit user confirmation ("Aplicar", "Editar", or "Ignorar") and never mutate programs or active workouts automatically. No LLM or cloud API is utilized.

**Reason:** Core functionality must never depend on AI or cloud services. Training progression is deterministic and transparent: lifters must understand exactly why a weight or rep increment is suggested and retain 100% control over their training plan.

---

## 2026-09-18 — Resilient platform adapters with zero-runtime degradation

**Decision:** Capacitor plugins (`@capacitor/app`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/share`) are wrapped in resilient platform adapters (`src/platform/`) that detect runtime capabilities and degrade gracefully to Web APIs (Web Audio API chime, `navigator.vibrate`, Web Share / file download, `visibilitychange` lifecycle math) without failing or requiring network.

**Reason:** Per non-negotiable principles, Web, PWA, Android, and iOS are first-class clients. The application core must remain 100% functional offline and in pure browser environments without throwing exceptions when native device features are unavailable.

---

## 2026-09-18 — Absolute deadline-based mobile lifecycle restoration (Zero drift)

**Decision:** Timer and active workout lifecycle on mobile devices restores state by evaluating absolute UTC deadlines (`deadlineAt`) against `Date.now()` upon app resumption (`appStateChange` / `visibilitychange`), rather than relying on background JS interval ticks.

**Reason:** Mobile operating systems aggressively throttle or freeze background JavaScript execution. An interval-based countdown drifts or halts completely when the screen turns off or the user switches apps. Calculating remaining time from the absolute deadline guarantees mathematical exactness upon resume.

---

## 2026-09-18 — WCAG 2.2 AA Accessibility, Modal Focus Trapping, and Milestone Live Announcers

**Decision:** All UI interfaces conform to WCAG 2.2 Level AA and WCAG2Mobile guidelines. Key architectural tenets:
1. Modal focus trapping and restoration: `<Dialog />` and `<BottomSheet />` trap `Tab` navigation within their boundaries and restore focus to trigger elements upon close.
2. Polite timer announcer: Rest timer provides milestone-based announcements (start, 30s, 10s, completed) via an `aria-live="polite"` region rather than spamming every second.
3. Universal touch target standard: Interactive elements enforce a minimum of 44×44px (`--tita-touch-min`).
4. Color independence: State changes always pair color indicators with text badges or glyphs.
5. Automated axe-core regression gates: Integrated into Playwright E2E testing with zero tolerated critical or serious violations.

**Reason:** Accessibility is an essential requirement for a first-class workout tracker. Lifters with visual, motor, or auditory impairments or those operating devices under high physical fatigue in noisy gym environments require predictable keyboard interaction, high contrast, non-color status feedback, and reliable screen-reader integration.

---

## 2026-09-18 — Performance Architecture, Route Splitting, and Responsive Constraints (Phase 13 / M-08)

**Decision:** The application enforces strict performance budgets and responsive layout invariants:
1. **Route-Level Code Splitting:** All primary views (`WorkoutView`, `RoutinesView`, `LibraryView`, `HistoryView`, `ProgressView`, `SettingsView`, `LegacyView`, `OnboardingView`) are dynamically loaded via `React.lazy` and wrapped in `<Suspense fallback={<LoadingFallback />}>`. The entry shell bundle is reduced to ~26 kB (7.45 kB gzip), and `vendor-react` is isolated for long-term browser caching.
2. **PWA Offline Pre-fetching:** To ensure 100% offline functionality in PWA mode, `prefetchRouteChunks()` is initiated in the background on shell mount, populating the Service Worker `SHELL_CACHE` without delaying initial render.
3. **Representative Benchmark Datasets:** Formal performance tests evaluate calculations against a synthetic 150-workout dataset spanning 52 weeks and 1,800 sets, guaranteeing that progress math, reviews, and plateau heuristics execute in `< 100ms`.
4. **Latency-Sensitive Workout Isolation:** Set logging and active workout mutations operate on localized state (< 1ms in-memory, ~12ms IndexedDB commit) without traversing historical records or triggering whole-tree re-renders.
5. **Universal Multi-Viewport Constraints:** The application layout enforces zero horizontal overflow across 9 canonical viewports (320px to 1920px), adapting navigation between a mobile bottom bar and a desktop sidebar rail/persistent drawer while maintaining ≥ 44×44px touch targets.


---

## 2026-09-18 — Release Verification Architecture, Unified CI Matrix, and QA Playbook (Phase 14 / ADR-016)

**Decision:** To make all product and release claims strictly enforceable, reproducible, and verifiable across diverse platforms without false assurances or simulated successes:
1. **Unified CI/QA Gate:** All quality verification is consolidated into a single reproducible pipeline (`npm run test:ci` / `npm run qa:matrix`), executing static analysis (ESLint), code style compliance (Prettier), strict type safety (TypeScript), in-memory domain/PBT/integration tests (Vitest, 217 tests), production artifact generation (Vite), and full-journey browser automation (Playwright, 32 tests across 11 suites).
2. **CI Pipeline Hardening:** GitHub Actions workflow (`.github/workflows/ci.yml`) runs the full multi-tier quality matrix on pull requests and pushes, ensuring that failures halt publication and retaining Playwright test reports/traces for 14 days upon failure.
3. **Canonical Manual QA Playbook:** Comprehensive step-by-step test scripts ([docs/QA_PLAYBOOK.md](QA_PLAYBOOK.md)) formalize release sign-off across Fresh Install, Core Workout Flow, Process Death / Crash Recovery, Airplane Mode / Offline PWA, and Backup Grammar v1 round-trips.
4. **Transparent Mobile Environment Diagnostics:** Toolchain dependencies are truthfully classified: `adb.exe` is verified and operational on the host via `Google.PlatformTools` v37.0.1; local APK compilation and autonomous Google Artemis runs remain documented as blocked pending connected physical devices/AVD emulators and host build-tools, while automated APK builds are maintained in GitHub Actions (`.github/workflows/android-apk.yml`).

**Reason:** Core product integrity and user trust require absolute transparency. No release claim can be marked as validated without reproducible, automated, or recorded evidence. Establishing strict quality gates, a standardized manual playbook, and truthful hardware blocker documentation ensures that regressions are caught pre-publication and user training data remains safe.

---

## 2026-09-18 — Open Source Governance, Program Sharing Format, and Publication-Ready Baseline (Phase 15 / ADR-017)

**Decision:** To prepare Projeto Titã for open-source stewardship while strictly safeguarding private dogfooding and QA verification prior to public release:
1. **Private Dogfooding State:** The repository remains strictly **private**. No public release is published and no GitHub visibility change is triggered until mobile gym dogfooding, physical device QA, and explicit user authorization are completed.
2. **Comprehensive Sanitization:** A deep scan across codebase and Git history verified zero leaked secrets, API keys, tokens, or PII. Hardcoded local filesystem paths and machine usernames were sanitized with generic templates (`YourUsername`, relative documentation links).
3. **Internal vs. Public Document Boundary:** Established the archived internal release manifest categorizing production-facing documentation (`README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`, `CHANGELOG.md`, `.github/` templates) apart from internal development scratch artifacts archived internal development artifacts. Internal artifacts are preserved internally for developmental continuity and excluded from the eventual public release.
4. **Program Sharing Portability (`titan-program.json` / REQ-16):** Implemented a privacy-preserving routine and program sharing format that strictly forbids inclusion of user workout history, snapshots, or personal progression stats. Programs imported from shared files are cloned transactionally with newly minted entity IDs, preventing identifier collisions.
5. **Import/Export UI Polish (REQ-7):** Enriched the backup import dialog (`ImportBackupDialog`) with preflight schema validation, item counts breakdown (workouts, routines, exercises, measurements), date ranges, SHA-256 integrity verification, mode selection (`merge` vs `replace_selected`), and automatic safety snapshots prior to data replacement.

**Reason:** Preparing for an open-source release requires rigorous governance, clear legal and contribution boundaries, and zero information leakage. Keeping the project private during final dogfooding ensures real-world workout testing without premature exposure, while the portable program format enables lifters to share training routines securely without compromising personal data.

## 2026-09-20 — Ajude-me e fechamento local do RC

**Decision:** Implementar a última feature autorizada pelo usuário: ajuda contextual local-first, com perguntas curtas, preview e envio ao modelo principal quando necessário. Reutilizar os providers e a sessão BYOK existentes. Sem novo provider, backend, chat persistente ou alteração automática de treinos.

**Validation:** Cobrir ajuda local, contexto mínimo, consentimento, falhas, offline, temas e foco; conferir showcase com dados sintéticos e resultados simulados identificados na documentação. Manter as 28 capturas Light e 50 Dark da rodada anterior e armazenar novas capturas separadamente.

**Release:** Commit local somente após gates verdes. Publicação suspensa. Scope freeze definitivo após este fechamento; trabalho novo fica para o roadmap e requer escopo separado.
