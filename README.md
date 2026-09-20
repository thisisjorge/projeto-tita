# Projeto Titã

**Workout tracker local-first, com Web/PWA instalável e IA opcional.**

**Release Candidate disponível para testes públicos.** O foco atual é validação em uso real antes da primeira versão estável.

![Projeto Titã: progresso e registro de treino](docs/public-showcase/showcase-hero.png)

Registre séries, acompanhe sua evolução e mantenha seus dados com você. O core funciona sem conta, sem IA e sem servidor de sync. Após o primeiro carregamento, o Web/PWA usa os dados locais e o cache offline; limpar os dados do navegador pode apagar esses registros. Faça backups.

## No produto

- **Active Workout mobile-first:** carga, reps, steppers, conclusão de séries, descanso, pausa e recuperação da sessão. RPE, RIR e outros detalhes ficam disponíveis conforme suas preferências. Anterior/Meta aparecem quando há dados.
- **Progression Engine determinístico:** sugestões locais baseadas em estratégias e registros anteriores. Aplicar, editar ou ignorar continua sendo sua decisão.
- **Histórico e progresso:** snapshots de sessões concluídas, PRs, e1RM por Epley, volume, frequência, revisões semanais/mensais e sinais locais de platô.
- **Rotinas e modelos:** criar, editar, arquivar, usar modelos prontos, importar e exportar fichas. Supersets e agrupamentos já existentes são preservados.
- **Exercise Library:** busca, filtros, favoritos, exercícios personalizados, instruções e ilustrações com atribuição.
- **Dados portáveis:** backup/restore JSON com verificação de integridade e preview; compartilhamento de fichas em `titan-program.json`, sem incluir seu histórico completo.
- **Dark e Light:** identidade OLED/Emerald, foco de teclado, alvos de toque e respeito a `prefers-reduced-motion`. Auditorias automatizadas usam regras WCAG 2.2 AA; isso não substitui avaliação humana completa de acessibilidade.

| Registrar | Substituir | Entender |
| --- | --- | --- |
| ![Treino com séries e metas](docs/public-showcase/showcase-01-active-workout-mobile.png) | ![Alternativas locais para máquina ocupada](docs/public-showcase/showcase-02-smart-substitution.png) | ![Ajude-me contextual](docs/public-showcase/showcase-05-help.png) |

## Titã Intelligence

Opcional, desativado por padrão e **BYOK**: você fornece sua chave. O tracker permanece utilizável sem IA.

O **modelo principal** interpreta resumos de progresso, revisão semanal, rotina e metas já calculadas. Nenhuma resposta altera treinos ou programas automaticamente. Antes de uma chamada externa, confira **Ver dados que serão enviados** e confirme o envio.

| Configuração | Contrato |
| --- | --- |
| NVIDIA NIM | Preset do adapter OpenAI-compatible; Base URL oficial `https://integrate.api.nvidia.com/v1`. Informe chave NVIDIA e Model ID. |
| OpenAI Compatible | Base URL HTTPS, API key e Model ID configuráveis. Pode atender OpenAI, OpenRouter, Groq e outros endpoints quando aceitam o contrato implementado e CORS do navegador. |
| Gemini | Adapter nativo separado, com endpoint oficial e chave no header. |

Compatibilidade não significa que todo modelo ou conta foi testado. Cotas, disponibilidade e custos dependem do provider; não há promessa de uso gratuito ilimitado. Os testes do RC usam respostas simuladas, sem chamadas pagas. Smoke autenticado com contas reais NVIDIA/Gemini permanece pendente. Não há proxy de IA neste RC; restrições de CORS podem impedir a chamada a um endpoint.

### Smart Exercise Substitution

No menu do exercício, escolha **Trocar exercício**, informe o motivo e confira as alternativas. O ranking local considera os metadados do catálogo e funciona offline. Afinidade não significa biomecânica ou cargas idênticas.

O **Fast Judge** pode refinar essa ordem, com envio explícito dos candidatos. Reutiliza o modelo principal por padrão; uma configuração separada é opcional. Timeout de 4,5 s, erro ou resposta inválida preservam as sugestões locais.

Ao confirmar, séries concluídas permanecem no exercício original. Só as futuras mudam. A carga antiga não é copiada: um histórico compatível do substituto pode preencher os campos; sem ele, a carga fica em branco. A troca é registrada no snapshot final.

### Ajude-me

Uma ação contextual nas telas de treino, progresso, rotina, detalhe de exercício e ajustes. Perguntas básicas sobre RIR, RPE, e1RM, progressão, descanso, backup e BYOK recebem respostas locais, sem API. Instruções de execução vêm primeiro do catálogo.

Perguntas que precisam dos dados da tela usam o **modelo principal**, com preview, contexto limitado e confirmação. Ajude-me não usa o Fast Judge por padrão, não mantém histórico de chat e não cria outra configuração de API. Offline ou com IA desativada, a ajuda local continua funcionando.

É ajuda educativa: não diagnostica lesões, prescreve tratamento ou garante segurança de exercícios para uma lesão.

### Chaves e privacidade

No Web/PWA, as chaves ficam **somente na memória da aba**. Recarregar, fechar ou desativar remove a configuração. Elas não são gravadas em IndexedDB, localStorage, sessionStorage, backup, export, `titan-program.json`, logs ou bundle. Os campos são limpos após configurar.

As chamadas HTTPS enviam a chave ao endpoint escolhido para autenticação. Memória do browser não é um cofre contra extensões ou scripts comprometidos. Resumos omitem notas pessoais e IDs internos; nomes de exercícios personalizados e perguntas escritas por você podem conter informação pessoal, por isso revise o preview. Veja [segurança e limitações](docs/INTELLIGENCE_RC.md).

## Plataformas

| Plataforma | Status do RC |
| --- | --- |
| Web/PWA | Release Candidate / Public Dogfooding Ready; gates finais registrados nas [evidências](docs/rc-public-dogfooding/validation.json). Publicação suspensa. |
| Android Native | Scaffold/build configuration ready; real-device QA pending. Sem validação em aparelho real nesta rodada. |
| iOS Native | Scaffold ready; macOS/Xcode + real-device QA pending. |
| Safari / WebKit | WebKit automated PASS (12 testes focados); Safari real-device/macOS pending. |
| Android Chrome | Chromium mobile/PWA automated PASS; real-device QA pending. |
| Google Artemis | Pending runner. |

O código legado de sync/backend permanece fora do RC Web/PWA. Ele não é requisito de instalação nem recebe status de serviço publicado. Não há garantia de equivalência entre testes de viewport e aparelhos físicos.

## Executar localmente

Requer Node.js 22+ e npm. Em um checkout do repositório:

```bash
npm ci
npm run dev:web
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`. Para testar o build do Web/PWA:

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173
```

Abra `http://127.0.0.1:4173/app`. O Service Worker exige contexto seguro: HTTPS em produção ou localhost no desenvolvimento. Não configure secrets de provider em variáveis `VITE_*`.

## Verificação

```bash
npm run test:ci
```

Último CI: **288/288 unit/PBT e 46/46 E2E PASS**, além de lint, formatação, typecheck e build. WebKit complementar: **12/12 PASS**. A suíte E2E padrão usa Chrome instalado e o servidor local de testes. Chamadas a providers são interceptadas por mocks. Os números finais e limites estão em [validation.json](docs/rc-public-dogfooding/validation.json), com [relatório do RC](docs/rc-public-dogfooding/REPORT.md).

As imagens usam dados sintéticos. Resultados de IA nas demonstrações são simulados e não comprovam respostas de contas reais. Veja o [pacote de showcase e créditos](docs/public-showcase/README.md).

## Projeto e contribuição

React, TypeScript, Vite, IndexedDB e Capacitor. Regras de domínio locais são separadas das integrações opcionais. Consulte [documentação canônica](docs/PROJECT_TITAN_MASTER.md), [contribuição](CONTRIBUTING.md), [segurança](SECURITY.md) e [roadmap](ROADMAP.md).

Código sob [MIT](LICENSE). Ilustrações e fontes mantêm suas próprias licenças e créditos em [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md). A licença do código não substitui a licença da mídia.
