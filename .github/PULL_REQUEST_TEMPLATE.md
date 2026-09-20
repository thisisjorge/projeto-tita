## Descrição da Mudança

Descreva de forma clara e concisa o que este Pull Request altera ou resolve.

Relacionado à Issue: Closes # (se aplicável)

---

## Tipo de Mudança

- [ ] Correção de bug (`fix`)
- [ ] Nova funcionalidade (`feat`)
- [ ] Refatoração de código sem alteração funcional (`refactor`)
- [ ] Melhoria de documentação (`docs`)
- [ ] Ajuste em testes ou qualidade (`test` / `chore`)

---

## Conformidade com os Princípios do Projeto Titã

- [ ] **Tracker em primeiro lugar:** A velocidade e clareza no registro de treino foram preservadas.
- [ ] **Local-first:** A funcionalidade opera plenamente offline e sem dependência de login ou servidores.
- [ ] **Privacidade:** Nenhuma telemetria, rastreamento ou vazamento de dados foi introduzido.
- [ ] **Acessibilidade:** Touch targets (>= 44px) e navegação por teclado continuam em conformidade.
- [ ] **Originalidade:** Todo o código é autoral, sem cópias de projetos de referência ou comerciais.

---

## Checklist de Validação

- [ ] Executei `npm run lint` e não há avisos ou erros.
- [ ] Executei `npm run format:check` e o código está padronizado.
- [ ] Executei `npm run typecheck` e não há erros de tipagem.
- [ ] Executei `npm run test:unit` e todos os testes passaram.
- [ ] Executei `npm run test:e2e` e os fluxos de ponta a ponta passaram.
- [ ] O pipeline unificado `npm run test:ci` concluiu 100% verde.
