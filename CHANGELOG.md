# Changelog

## 1.0.0

- Corrige edição de reps/carga e ordenação das gravações ao concluir treino.
- Mantém menus na viewport e substitui tipo de série nativo por seletor Titã com teclado e foco.
- Preserva os 42 exercícios existentes e adiciona 175 exercícios localizados, com IDs estáveis.
- Disponibiliza 215 GIFs reais e reproduzíveis a partir de frames CC BY-SA 4.0; dois legados usam fallback correto.
- Mantém mídia offline progressiva na PWA e embarcada no Android, sem download inicial de todo o acervo.
- Ajusta PT-BR, ícones SVG, cartões de progressão e resumo pós-treino sem redesign.
- Limita BYOK inclusive em streams travados, com fallback local e retry explícito.
- Corrige instalação de SDK Android no CI, versionamento, checksum e distinção entre debug e release assinada.

## Registro anterior do desenvolvimento

A anotação 2.0.0 abaixo é preservada como histórico do desenvolvimento. Não existe tag publicada correspondente; a versão do pacote e das plataformas para a primeira release é 1.0.0.

# Changelog — Projeto Titã

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue as diretrizes de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [2.0.0] — 2026-09-18

### Adicionado
- **Arquitetura Local-First & Offline-First:** Persistência em IndexedDB isolada por repositórios tipados, funcionando 100% sem servidor ou login obrigatório.
- **Active Workout:** Execução de treinos em tempo real, timer com base em prazos reais (à prova de suspensão de abas), log rápido de séries com uma mão.
- **Divulgação Progressiva (REQ-10):** Modo padrão minimalista com ativação configurável de RPE, RIR, cadência, notas e tipos de séries (Warmup, Top Set, Backoff, Drop Set).
- **Biblioteca de Exercícios:** Catálogo estruturado com grupamentos musculares, papéis articulares, instruções e suporte a exercícios customizados do usuário.
- **Gestão de Rotinas e Programas:** Fichas de treino, microciclos e suporte a superséries e circuitos agrupados.
- **Motor de Progresso Determinístico:** Cálculo de 1RM estimado (Epley), detecção de recordes pessoais (PRs) e monitoramento de platôs.
- **Backup Grammar v1:** Exportação e importação de backups completos com checksum SHA-256 e snapshots de segurança automáticos antes de importações.
- **Formato Portável de Programas (`titan-program.json` / REQ-16):** Exportação e importação de rotinas e programas sem vazamento de histórico pessoal de treino.
- **Acessibilidade WCAG 2.2 AA:** Conformidade com contraste mínimo 4.5:1, touch targets mínimos de 44x44px, navegação por teclado e avisos auditivos via `aria-live`.
- **Suporte Multiplataforma:** Web PWA instalável com Service Worker, e invólucro Capacitor para Android e iOS.
- **Governança Open Source:** `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md` e templates de issues e pull requests.
- **Acabamento de Produto e Design V4/V4.1 (OLED Stealth + Emerald):** SetRows com steppers em linha `[-] 2.5kg [+]` e `[-] 1rep [+]`, Focus Mode para Active Workout no mobile, barra de comando com contenção geométrica estrita (zero overflow em 360px/390px), eliminação de redundância de timers no desktop, cards de histórico densos e acessíveis, e grid de progresso 2x2.
- **Onboarding Neutro & Soberania (Phase 16):** Carregamento de ficha modelo Full Body 3x em 1 clique, divulgação transparente de princípios de privacidade e arquitetura local-first, suporte matrix canônica e notas de lançamento v1.0.0.
