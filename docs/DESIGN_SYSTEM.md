# Projeto Titã — Design System & Tokens Specification

Este documento define a especificação do **Design System** do Projeto Titã, cobrindo tokens semânticos, temas, regras de espaçamento, tipografia, tratamento de componentes e acessibilidade em conformidade com os requisitos REQ-8 e REQ-19.

---

## 1. Direção Visual & Filosofia

O Titã adota uma identidade visual técnica, sóbria e focada em desempenho atlético:
- Fundo profundo com baixa emissão de luz para uso confortável no escuro.
- Cor de acento semântica de alta visibilidade e energia equilibrada (`--tita-primary: #3b82f6` / `--tita-accent: #10b981`).
- Superfícies com elevação perceptual calculada via cores sólidas e bordas nítidas, sem sombras difusas pesadas ou blur.

---

## 2. Sistema de Cores & Temas

Os temas são geridos via CSS Custom Properties no elemento `:root` e no atributo `[data-theme="light"]` / `[data-theme="dark"]`.

### Tema Escuro (Padrão)
```css
:root {
  --tita-bg: #07090d;
  --tita-surface: #10141b;
  --tita-surface-2: #151b24;
  --tita-surface-hover: #1c2430;
  --tita-border: #242e3b;
  --tita-border-focus: #3b82f6;

  --tita-text: #f4f7fb;
  --tita-text-muted: #8b99a8;
  --tita-text-subtle: #566474;

  --tita-primary: #3b82f6;
  --tita-primary-hover: #2563eb;
  --tita-primary-contrast: #ffffff;

  --tita-accent: #10b981;
  --tita-accent-hover: #059669;

  --tita-success: #10b981;
  --tita-warning: #f59e0b;
  --tita-error: #ef4444;
  --tita-info: #0ea5e9;

  --tita-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --tita-font-mono: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;

  --tita-radius-sm: 6px;
  --tita-radius-md: 10px;
  --tita-radius-lg: 14px;
  --tita-radius-full: 9999px;

  --tita-transition-fast: 0.15s ease;
  --tita-transition-normal: 0.25s ease;
  --tita-touch-min: 44px;
}
```

### Tema Claro (Override)
```css
[data-theme='light'] {
  --tita-bg: #f8fafc;
  --tita-surface: #ffffff;
  --tita-surface-2: #f1f5f9;
  --tita-surface-hover: #e2e8f0;
  --tita-border: #cbd5e1;
  --tita-border-focus: #2563eb;

  --tita-text: #0f172a;
  --tita-text-muted: #64748b;
  --tita-text-subtle: #94a3b8;

  --tita-primary: #2563eb;
  --tita-primary-hover: #1d4ed8;
  --tita-primary-contrast: #ffffff;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --tita-transition-fast: 0s !important;
    --tita-transition-normal: 0s !important;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.001s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001s !important;
  }
}
```

---

## 3. Tipografia & Escala de Espaçamento

- **Font Sizes:**
  - Micro / Captions: `12px` (`0.75rem`)
  - Sub / Secundário: `14px` (`0.875rem`)
  - Corpo / Base: `16px` (`1rem`)
  - Títulos H3 / Subtítulos: `18px` (`1.125rem`)
  - Títulos H2 / Seções: `22px` (`1.375rem`)
  - Títulos H1 / Páginas: `28px` (`1.75rem`)
- **Spacing Scale (Múltiplos de 4px):**
  - `--tita-space-1`: `4px`
  - `--tita-space-2`: `8px`
  - `--tita-space-3`: `12px`
  - `--tita-space-4`: `16px`
  - `--tita-space-5`: `20px`
  - `--tita-space-6`: `24px`
  - `--tita-space-8`: `32px`

---

## 4. Tratamento e Estados de Componentes Core

1. **Button:**
   - Variantes: `primary`, `secondary`, `ghost`, `danger`.
   - Altura mínima `44px` (touch target WCAG).
   - Estados visíveis: default, hover, active, focus-visible (anel azul com offset), disabled (opacidade 0.45, sem pointer-events).
2. **Field & NumberField:**
   - Campo de entrada com rótulo descritivo e suporte a teclado numérico (`inputMode="decimal"` ou `"numeric"`).
   - Indicação visual de foco e mensagens de erro acessíveis (`aria-invalid`, `aria-describedby`).
3. **SetRow:**
   - Linha de série com numeração ordinal, campo de carga, repetições, indicador de RPE/RIR e botão de conclusão com toggle de check instantâneo.
4. **Card:**
   - Recipiente sólido com fundo `--tita-surface`, borda `--tita-border` e cantos arredondados `--tita-radius-md`.
5. **Dialog & BottomSheet:**
   - Diálogos acessíveis com backdrop escuro (`--tita-bg` com opacidade), fechamento via ESC ou toque externo, e foco retido.
6. **Timer:**
   - Display de contagem regressiva em monoespaço (`00:00`), com botões rápidos de incremento (+30s) e pausa.
7. **StatusBanner:**
   - Banner de alerta para status offline, erros ou avisos operacionais com variantes `info`, `warning`, `error`, `success`.
8. **EmptyState:**
   - Estado vazio amigável com mensagem motivadora e botão de ação para guiar o lifter.
