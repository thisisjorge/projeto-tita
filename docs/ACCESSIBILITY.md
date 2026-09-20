# Projeto Titã — Accessibility Architecture & WCAG 2.2 AA Conformance

## 1. Overview & Principles

In accordance with the canonical architectural principles (`docs/PROJECT_TITAN_MASTER.md` and `docs/DECISIONS.md`), Projeto Titã is built to be usable by everyone, everywhere, offline-first. Speed, clarity, and reliability during workout sessions beat decorative visual fluff. 

For accessibility, Projeto Titã adheres strictly to **WCAG 2.2 Level AA** standards and **WCAG2Mobile** best practices:
- **Fast and Predictable Keyboard Navigation:** Full keyboard operability without keyboard traps; skip link to jump directly to main content; visible focus rings (`:focus-visible`).
- **Modal Focus Management:** Modal dialogs and bottom sheets trap Tab focus within their boundaries and restore focus to trigger elements upon closing.
- **Assistive Technology & Live Regions:** Rest timer provides polite, milestone-based `aria-live` announcements to avoid screen-reader chatter while giving real-time status.
- **Color Independence:** Color is never the sole communicator of status or completion; explicit badges, icons, and textual labels accompany all state changes.
- **Mobile Touch Targets:** All interactive controls (buttons, selects, toggles, filter pills) meet the minimum touch target dimension of 44×44px (`--tita-touch-min`).
- **High Contrast:** Normal text meets at least 4.5:1, and critical workout timers meet WCAG AAA (7:1+).

---

## 2. Automated axe-core Audit & Conformance Matrix

Automated accessibility checks are integrated into CI via `@axe-core/playwright` (`tests/e2e/accessibility.spec.ts`) evaluating the rulesets:
`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

| View / Flow | Route / Component | axe-core Status | Critical / Serious Violations |
| :--- | :--- | :--- | :--- |
| **Skip Link Landmark** | `/#main-content` | **PASS** | 0 |
| **Workout View (Idle)** | `/app` | **PASS** | 0 |
| **Active Workout Session** | `/app` (in-progress) | **PASS** | 0 |
| **Rest Timer & Announcer** | `<Timer />` (`role="timer"`) | **PASS** | 0 |
| **Dialog Modals** | `<Dialog />` (Discard/Routine) | **PASS** | 0 |
| **Bottom Sheet** | `<BottomSheet />` | **PASS** | 0 |
| **Routine Management** | `/app/routines` | **PASS** | 0 |
| **Exercise Library** | `/app/library` | **PASS** | 0 |
| **History & Snapshots** | `/app/history` | **PASS** | 0 |
| **Progress & Analytics** | `/app/progress` | **PASS** | 0 |
| **Weekly / Monthly Reviews**| `<WeeklyReviewTab />` / `<MonthlyReviewTab />` | **PASS** | 0 |
| **Settings & Data** | `/app/settings` | **PASS** | 0 |

---

## 3. Implementation Details

### 3.1 Keyboard Navigation & Skip Link
- **Skip to Content:** Located at the very top of `AppShell.tsx`:
  ```html
  <a href="#main-content" className="tita-skip-link">Pular para o conteúdo principal</a>
  ```
  Positioned off-screen by default (`top: -120px`), brought immediately into view on `:focus` (`top: 1rem`) with high contrast background and border.
- **Focus Rings:** Defined in `src/ui/tokens/index.css`:
  ```css
  :focus-visible {
    outline: 2px solid var(--tita-border-focus);
    outline-offset: 2px;
  }
  ```
  Uses `#3b82f6` on dark background and `#2563eb` on light background, providing > 5:1 contrast against surface colors.

### 3.2 Focus Trapping & Restoration (Dialogs & Bottom Sheets)
Both `<Dialog />` (`src/ui/components/Dialog.tsx`) and `<BottomSheet />` (`src/ui/components/BottomSheet.tsx`) enforce strict focus containment:
1. **Initial Focus:** On mount, focus automatically moves to the first focusable child element (or the close button).
2. **Focus Trapping:** Intercepts `Tab` and `Shift+Tab` keydown events. If focus is on the last element, Tab wraps to the first; if focus is on the first, Shift+Tab wraps to the last. Focus cannot escape to the background document.
3. **Escape Key Handling:** Pressing `Escape` invokes `onClose()`.
4. **Focus Restoration:** Before opening, the active element (`document.activeElement`) is captured in a ref; upon unmount/closing, focus is restored to the triggering element.
5. **Unique ARIA Relationships:** Unique IDs generated via `useId()` tie `aria-labelledby` and `aria-describedby` directly to heading and description tags without ID collision.

### 3.3 Rest Timer Live Regions (`aria-live`)
Continuous 1-second ticks vocalized by screen readers create intolerable auditory noise. Projeto Titã implements a polite, milestone-based announcer pattern:
- **Announcer Node:** Visually hidden live region:
  ```html
  <div aria-live="polite" aria-atomic="true" class="sr-only">
    {announcement}
  </div>
  ```
- **Announcement Milestones:**
  - Timer Start: `"Descanso iniciado: MM:SS"`
  - Timer Paused: `"Descanso pausado em MM:SS"`
  - 30s remaining: `"30 segundos restantes de descanso"`
  - 10s remaining: `"10 segundos restantes de descanso"`
  - Timer Finished (0s): `"Tempo de descanso concluído!"`
- **Container Semantics:** Container holds `role="timer"` and dynamic `aria-label="Temporizador de descanso: MM:SS"`.

### 3.4 Color Independence & Visual Status
- **Set Completion:** Set completion toggle utilizes `role="checkbox" aria-checked={isDone}`. Visual indicator displays both color accent and explicit checkmark glyph (`✓`).
- **Timer Completion:** Displays a prominent badge: `✓ Tempo Concluído` alongside the green timestamp, ensuring users with color vision deficiencies instantly perceive the status.
- **Set Types:** In addition to color badges (e.g. orange for Drop Set, purple for Top Set), the badge renders textual abbreviations (`D`, `T`, `W`, `N`) and full labels in the select control.

### 3.5 Touch Targets (WCAG2Mobile)
- Standard minimum touch hit area: `44×44px` (`--tita-touch-min`).
- Applies to all buttons (including icon-only close buttons `✕` and theme toggles `☀️/🌙`), input fields, select dropdowns, and navigation rail/bottom bar items.
- Multi-viewport QA validated on desktop and mobile viewports (`390×844`, `360×800`, `320×568`).

---

## 4. Remediation Log

During the Phase 12 accessibility audit, the following remediations were implemented:
1. **Equipment & Period Filters `<select>`:** Replaced detached `<span>` tags with explicit `<label htmlFor="...">` and added descriptive `aria-label` attributes across `LibraryView`, `WeeklyReviewTab`, `MonthlyReviewTab`, and `RoutineEditorDialog`.
2. **Field Component Label Support:** Added `hideLabel` support to `<Field />`, rendering `<label className="sr-only">` when visual labels are suppressed, preventing headless form inputs.
3. **NumberField Step Buttons:** Added contextual `title` attributes while preserving contract `aria-label="Diminuir"` and `aria-label="Aumentar"` for backward test compatibility.
4. **StatusBanner Action & Dismiss Buttons:** Enlarged touch hit areas from 36px to 44px (`--tita-touch-min`).
5. **History Session Cards:** Added `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), and descriptive `aria-label` to snapshot cards so keyboard users can navigate without relying on pointer clicks.
6. **Tabs Semantics:** Added `role="tablist"`, `role="tab"`, `aria-selected`, and `aria-pressed` across analytics period selectors and metric tabs.
7. **SVG Graphics:** Added accessible `<title>{ariaLabel}</title>` children inside `<svg role="img" aria-label={...}>` in `SimpleLineChart.tsx`.
