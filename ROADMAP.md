# Roadmap — Projeto Titã

Este documento apresenta as prioridades e a visão de evolução técnica e de produto do **Projeto Titã**, com base no [`docs/PROJECT_TITAN_MASTER.md`](docs/PROJECT_TITAN_MASTER.md) e [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md).

---

## :white_check_mark: Versão 1.0 (Core Baseline — Concluída)

- [x] **Arquitetura Local-First & Offline-First:** Persistência total em IndexedDB sem login obrigatório.
- [x] **Active Workout Engine:** Cronômetro de descanso baseado em prazo absoluto, registro instantâneo de séries, repetições, carga e RIR.
- [x] **Divulgação Progressiva (REQ-10):** Modo básico ágil por padrão com campos avançados opcionais (RPE, cadência, notas por série).
- [x] **Biblioteca de Exercícios & Mídia:** Exercícios do sistema categorizados por grupamento muscular e mecânica articular, com suporte a exercícios customizados do usuário.
- [x] **Gerenciamento de Rotinas & Programas:** Criação e customização de fichas, superséries, circuitos e periodização de microciclos.
- [x] **Métricas & Detecção de PR:** Estimativa determinística de 1RM (Epley), volume semanal por músculo e detecção de platôs de força.
- [x] **Backup & Portabilidade:** Backup completo em JSON com checksum SHA-256 e snapshot de segurança antes de importações.
- [x] **Formato Portável de Programas (`titan-program.json`):** Compartilhamento de fichas e programas com isolamento rigoroso de histórico pessoal.
- [x] **Acessibilidade WCAG 2.2 AA:** Contraste reforçado, touch targets >= 44x44px, navegação por teclado e suporte a leitores de tela com `aria-live`.
- [x] **Multiplataforma:** Web PWA instalável, projeto Capacitor para Android e iOS.

---

## :hourglass_flowing_sand: Versão 1.x (Próximas Entregas)

- [ ] **Sincronização em Nuvem Opcional:** Conexão cross-device cliente-servidor preservando o banco local como fonte soberana.
- [ ] **Integração com Wearables:** Suporte a relógios inteligentes (WearOS / Apple Watch) para avanço de séries e feedback háptico do cronômetro.
- [ ] **Visualizações Avançadas de Volume:** Heatmaps corporais de fadiga muscular e gráficos comparativos de hipertrofia x força.
- [ ] **Importação de Outros Apps:** Conversores e importadores de dados de trackers de mercado em formatos CSV/JSON.

---

## :crystal_ball: Versão 2.x (Visão Futura)

- [ ] **Assistente de Treino IA Opcional (BYOK):**
  - Integração via modelo *Bring Your Own Key* (OpenAI, Anthropic, Gemini ou modelos locais via WebLLM/Ollama).
  - Sugestões transparentes de deload e ajustes de volume baseadas em dados históricos.
  - Zero alteração não supervisionada de treinos ou fichas.
- [ ] **Comunidade de Programas Abertos:** Repositório federado e comunitário de programas abertos no formato `titan-program.json`.
