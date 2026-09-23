# BYOK e privacidade — Projeto Titã

A ajuda com IA é opcional. Treinos, rotinas, histórico, progresso e sugestões locais funcionam sem configurar um provedor.

## Chaves e envio

O usuário informa o endpoint, o modelo e a própria chave. A configuração fica somente na memória da aba; recarregar ou desativar a IA a remove. A chave não integra IndexedDB, localStorage, backup ou exportação. O app mostra uma prévia e pede confirmação antes de enviar contexto de treino ao provedor escolhido.

As chamadas usam HTTPS, omitem cookies e não seguem redirecionamentos. O provedor recebe os dados autorizados e aplica seus próprios termos, custos e política de retenção. Um navegador com extensão comprometida, script malicioso ou acesso ao processo pode expor uma chave em uso: memória de aba não é um cofre.

## Limites

O teste de conexão, o juiz rápido opcional e a análise completa possuem limites de tempo. Respostas são validadas; erros exibidos ao usuário não incluem corpo da resposta, headers ou chave. A IA fornece informação e nunca altera séries, cargas ou rotinas automaticamente. Quando a rede ou o provedor falha, o treino e as sugestões locais continuam disponíveis.

Veja a [visão de arquitetura](AI_ARCHITECTURE.md), a [política de segurança](../SECURITY.md) e os testes em tests/unit/intelligence.test.ts.
