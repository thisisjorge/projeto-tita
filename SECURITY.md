# Segurança — Projeto Titã

## Escopo atual

Release Candidate Web/PWA, com publicação suspensa. Android/iOS em aparelho real e backend/sync não foram validados nesta rodada. Não há uma linha estável 2.0.x com SLA de suporte anunciado.

Os treinos são armazenados localmente em IndexedDB. Isso não equivale a armazenamento criptografado ou proteção contra acesso ao dispositivo. Limpar os dados do navegador pode apagá-los. Backups contêm dados pessoais de treino: guarde e compartilhe conscientemente.

## Titã Intelligence / BYOK

IA desativada por padrão. Chaves do modelo principal e do Fast Judge ficam somente em memória da aba; não são persistidas em browser storage, backup, export ou bundle. Configurar limpa o campo de senha; desativar cancela chamadas e remove credenciais. Recarregar remove a configuração.

Chaves seguem em headers HTTPS ao provider escolhido. O frontend não é um cofre: XSS, extensões comprometidas e acesso ao processo do navegador podem expor dados. Não use proxies públicos para contornar CORS e não coloque secrets em `VITE_*`.

Análises usam resumos com campos permitidos e confirmação explícita. Ajude-me responde conceitos localmente; perguntas contextuais usam o modelo principal e o mesmo preview. Perguntas e nomes de exercícios personalizados podem conter informação pessoal escrita pelo usuário. Revise o payload antes de enviar. Retenção, custos e cotas externas dependem do provider.

Limites de tamanho, timeout, cancelamento e validação de resposta reduzem falhas; não garantem que respostas da IA estejam corretas. Nenhuma resposta executa mudanças no treino. [Contrato e testes](docs/INTELLIGENCE_RC.md).

## Relatar problemas

Não publique chaves, backups ou dados pessoais em issues. Quando o repositório disponibilizar Private Vulnerability Reporting, utilize o canal privado da aba Security. Até haver um canal privado verificado, solicite contato ao mantenedor sem expor a vulnerabilidade publicamente. Este RC não anuncia endereço de segurança nem prazo de atendimento que não tenham sido confirmados.

Inclua versão/commit, plataforma, reprodução com dados sintéticos e impacto. Não inclua credenciais reais. [Evidências da revisão](docs/rc-public-dogfooding/security-bundle.json) registram uma varredura de padrões e testes; não constituem auditoria formal independente.
