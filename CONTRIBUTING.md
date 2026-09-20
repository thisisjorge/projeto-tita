# Guia de Contribuição — Projeto Titã

Obrigado pelo seu interesse em contribuir com o **Projeto Titã**! Este documento orienta como colaborar com o projeto mantendo a integridade técnica, a privacidade dos usuários e a filosofia do produto.

---

## 1. Princípios Inegociáveis do Projeto

Antes de propor qualquer alteração arquitetural, visual ou funcional, leia atentamente a documentação canônica em [`docs/`](docs/) e os seguintes princípios:

- **Tracker de treino em primeiro lugar:** Durante a sessão de treino na academia, velocidade de registro, clareza visual e ergonomia para uso com uma mão superam elementos puramente decorativos.
- **Local-first e Offline-first:** O aplicativo funciona 100% no dispositivo (IndexedDB como fonte da verdade). Nenhum recurso essencial pode exigir conta de usuário ou conexão à internet.
- **Sincronização em nuvem opcional:** A sincronização existe para conveniência cross-device, mas o cliente local é soberano e independente.
- **IA opcional e desativada por padrão (BYOK):** Quando habilitada, funciona no modelo *Bring Your Own Key*. A IA pode sugerir análises, mas **nunca** altera treinos, rotinas ou dados silenciosamente.
- **Soberania dos dados:** O usuário é dono absoluto dos seus dados. Exportação e importação determinísticas em JSON aberto (com verificação de integridade) são cidadãos de primeira classe.
- **Clean-room e originalidade:** Não copie código, ativos, marcas ou datasets de projetos de referência ou comerciais. Respeite licenças e atribuições de terceiros.

---

## 2. Como Começar

### Pré-requisitos
- **Node.js:** Versão 22 ou superior
- **npm:** Versão 10 ou superior
- **Git**

### Configuração do Ambiente

```bash
# 1. Clone o repositório
# Use a URL do seu fork ou do repositório quando estiver disponível.
# Entre na pasta do checkout.

# 2. Instale as dependências
npm ci

# 3. Inicie o servidor de desenvolvimento da Web (Vite)
npm run dev:web
```

A aplicação estará disponível em `http://localhost:5173`.

---

## 3. Scripts e Quality Gates

Toda contribuição deve passar por todos os quality gates automatizados antes de ser aceita.

| Comando | Descrição |
| :--- | :--- |
| `npm run dev:web` | Inicia o frontend Vite com hot reload |
| `npm run build` | Compila TypeScript e gera bundle de produção |
| `npm run typecheck` | Executa verificação estática de tipos (`tsc --noEmit`) |
| `npm run lint` | Executa análise estática com ESLint |
| `npm run format:check` | Verifica conformidade com Prettier |
| `npm run format:write` | Formata automaticamente todos os arquivos |
| `npm run test:unit` | Executa a suíte de testes unitários e testes baseados em propriedades (Vitest) |
| `npm run test:e2e` | Executa os testes de ponta a ponta e acessibilidade (Playwright) |
| `npm run test:ci` | **Pipeline completo:** Lint + Format + Typecheck + Unit + Build + E2E |

---

## 4. Padrões de Código e Convenções

- **Linguagem:** TypeScript estrito (`strict: true`), React moderno e Vanilla CSS com Design Tokens (`src/ui/tokens.css`).
- **Arquitetura em Camadas:**
  - `src/domain/`: Modelos de domínio, entidades imutáveis e enums puros (sem dependência de frameworks).
  - `src/repositories/`: Camada de persistência IndexedDB isolada por interfaces.
  - `src/services/`: Casos de uso e lógica de aplicação (ProgressEngine, WorkoutService, etc.).
  - `src/features/`: Telas e fluxos funcionais (Active Workout, Library, Routines, Settings).
  - `src/ui/`: Componentes visuais acessíveis e reutilizáveis.
- **Acessibilidade:** Padrão WCAG 2.2 AA (contraste mínimo 4.5:1, alvos de toque >= 44x44px, navegação completa por teclado e suporte a leitores de tela com `aria-live`).
- **Mensagens de Commit:** Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

---

## 5. Processo de Pull Request

1. Crie uma branch a partir de `master`: `git checkout -b feature/minha-melhoria`.
2. Implemente a mudança mantendo testes automatizados correspondentes.
3. Certifique-se de que `npm run test:ci` passa com 100% de sucesso.
4. Abra o Pull Request detalhando o problema resolvido, o teste manual executado e o impacto nos princípios do projeto.
