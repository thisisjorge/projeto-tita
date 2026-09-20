# Projeto Titã — Orçamentos de Performance & Benchmarks (Phase 13 / M-08)

## 1. Visão Geral e Objetivos

Conforme estabelecido em the archived RC refactor plan (Phase 13: Performance), `tasks.md` (Tasks 15.2, 15.3, 15.4) e o apontamento de auditoria **M-08** do RC, o Projeto Titã estabelece orçamentos formais de performance para garantir que a experiência de treino permaneça instantânea, previsível e responsiva mesmo em dispositivos móveis modestos e com longos históricos acumulados.

Princípios não-negociáveis:
- **Zero bloqueio do fluxo de treino:** O registro de séries e o timer de descanso nunca podem sofrer atrasos por operações de I/O ou renders globais.
- **Isolamento de estado:** Ações no treino ativo alteram apenas o registro em andamento; consultas pesadas de histórico e análises rodam de forma pontual e assíncrona.
- **Budgets mensuráveis:** Todos os caminhos críticos possuem limites de tempo e tamanho validados por testes automatizados (Vitest e Playwright).

---

## 2. Orçamentos de Performance Formais (Budgets)

| Métrica | Limite Orçado | Resultado Medido | Método de Verificação |
|---|---|---|---|
| **Cold Start / First Shell Load (3G)** | `< 3.0s` | `~720ms` | Playwright E2E (`performance-responsive.spec.ts`) |
| **Initial Entry Bundle Size** | `< 250 kB` (gzip) | `~130 kB` (gzip total com shell e WorkoutView) | Vite Rollup bundle analysis |
| **Active Workout Set Logging** | `< 50ms` | `< 1ms` (memória) / `~12ms` (IndexedDB) | Benchmark unitário (`performance-benchmarks.test.ts`) |
| **Rest Timer Frame Precision** | 0 frame drops | 60 FPS estável | Deadline-based math sem drift cumulativo |
| **Global Metrics Calculation (150 treinos)** | `< 100ms` | `~10ms` | Vitest benchmark com 1.800 séries |
| **Exercise Progress Summary (150 treinos)** | `< 50ms` | `~3ms` | Vitest benchmark (`bench-press`) |
| **Weekly Review Generation (150 treinos)** | `< 50ms` | `~5ms` | ReviewEngine benchmark |
| **Monthly Review & Plateau Detection (150 treinos)** | `< 50ms` | `~4ms` | ReviewEngine + PlateauDetector benchmark |
| **History Pagination & Monthly Grouping** | `< 25ms` | `~1ms` | ProgressEngine benchmark |
| **Cross-Viewport Responsiveness** | Zero horizontal overflow | 0 overflow em 9 viewports (320px–1920px) | Playwright E2E cross-viewport suite |

---

## 3. Otimização de Bundles e Code Splitting (Task 15.2)

### 3.1 Situação Anterior (Monólito Estático)
- Bundle único compilado: `dist/assets/index-*.js` com **630.22 kB** minificado (171.79 kB gzip).
- Alerta do empacotador: `(!) Some chunks are larger than 500 kB after minification`.
- Todas as rotas (incluindo Treino, Rotinas, Biblioteca com 45+ exercícios, Histórico, Gráficos de Progresso, Ajustes e versão Legada) eram baixadas e parseadas de uma só vez na primeira visita.

### 3.2 Implementação Atual (Route-Level Code Splitting)
- Adoção de `React.lazy()` e `<Suspense fallback={<LoadingFallback />}>` em `src/router.tsx`.
- Configuração de `manualChunks` em `vite.config.ts` isolando `vendor-react` (`react`, `react-dom`, `react-router-dom`).
- Pré-carregamento assíncrono em background via `prefetchRouteChunks()` em `src/services/route-prefetcher.ts` para que todos os chunks fiquem imediatamente disponíveis offline e no cache do Service Worker (`sw.js`).

### 3.3 Tabela de Tamanho dos Chunks Resultantes

| Chunk | Conteúdo | Tamanho Minificado | Tamanho Gzip |
|---|---|---|---|
| `index-*.js` | Shell leve e inicializador | **26.71 kB** | **7.45 kB** |
| `vendor-react-*.js` | React 19 + React Router (cache permanente) | **310.93 kB** | **98.16 kB** |
| `WorkoutView-*.js` | Tela principal de treino | **37.85 kB** | **9.32 kB** |
| `RoutinesView-*.js` | Construtor de rotinas e templates | **56.40 kB** | **12.48 kB** |
| `LibraryView-*.js` | Catálogo de exercícios e filtros | **30.38 kB** | **7.40 kB** |
| `ProgressView-*.js` | Gráficos e análises de progresso | **33.03 kB** | **6.35 kB** |
| `HistoryView-*.js` | Histórico paginado e detalhes | **12.61 kB** | **3.30 kB** |
| `SettingsView-*.js` | Ajustes e exportação de dados | **8.33 kB** | **3.40 kB** |
| `OnboardingView-*.js` | Fluxo inicial de integração | **11.31 kB** | **4.24 kB** |
| `LegacyView-*.js` | Ponte de compatibilidade legada | **1.00 kB** | **0.60 kB** |

*Economia de carregamento inicial:* O usuário que entra no app baixa apenas ~130 kB gzip em vez de carregar todos os módulos da aplicação, alcançando carregamento inferior a 1 segundo mesmo em 3G.

---

## 4. Dataset Representativo de Benchmark (M-08)

O gerador `src/data/benchmark-dataset.ts` cria um conjunto de dados sintético, determinístico e sanitizado que simula o uso real de um praticante intermediário/avançado ao longo de 1 ano completo:

- **Volume de treinos:** 150 sessões (`WorkoutSnapshot`).
- **Intervalo temporal:** 52 semanas consecutivas (3 treinos por semana: Push, Pull, Legs).
- **Exercícios por sessão:** 3 exercícios padronizados (`Supino Reto`, `Agachamento`, `Terra`, `Desenvolvimento`, `Remada`, `Barra Fixa`).
- **Séries por exercício:** 4 séries (1 de aquecimento + 3 séries de trabalho).
- **Total de séries:** **1.800 séries concluídas** com pesos crescentes (sobrecarga progressiva realista) e cálculo de e1RM.
- **Propriedades avançadas:** Registro de RPE (6–9.5) e RIR (0–4) progressivos.

A suíte `tests/unit/performance-benchmarks.test.ts` executa benchmarks reais contra esse dataset de 1.800 séries a cada build do CI.

---

## 5. Matriz de Testes Cross-Viewport (Task 15.3)

Todos os 9 breakpoints canônicos foram auditados automaticamente via Playwright (`tests/e2e/performance-responsive.spec.ts`):

| Viewport | Dispositivo de Referência | Largura × Altura | Overflow Horizontal? | Navegação Adaptativa | Touch Target ≥ 44px? |
|---|---|---|---|---|---|
| **320px** | iPhone SE 1st gen / telas estreitas | 320 × 568 | ❌ **0 overflow** | Barra inferior mobile | ✅ Conforme |
| **360px** | Galaxy S8 / Android compacto | 360 × 640 | ❌ **0 overflow** | Barra inferior mobile | ✅ Conforme |
| **390px** | iPhone 12/13/14 / iOS padrão | 390 × 844 | ❌ **0 overflow** | Barra inferior mobile | ✅ Conforme |
| **430px** | iPhone Pro Max / Android grande | 430 × 932 | ❌ **0 overflow** | Barra inferior mobile | ✅ Conforme |
| **768px** | iPad retrato / tablet compacto | 768 × 1024 | ❌ **0 overflow** | Barra inferior mobile | ✅ Conforme |
| **1024px** | iPad paisagem / notebook pequeno | 1024 × 768 | ❌ **0 overflow** | Sidebar rail desktop | ✅ Conforme |
| **1280px** | Notebook padrão | 1280 × 800 | ❌ **0 overflow** | Sidebar completa | ✅ Conforme |
| **1440px** | Monitor desktop | 1440 × 900 | ❌ **0 overflow** | Sidebar completa | ✅ Conforme |
| **1920px** | Monitor Full HD | 1920 × 1080 | ❌ **0 overflow** | Sidebar completa | ✅ Conforme |

Em todas as resoluções, a regra `document.documentElement.scrollWidth <= window.innerWidth` foi formalmente satisfeita.
