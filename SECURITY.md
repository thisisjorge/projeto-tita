# Segurança — Projeto Titã

## Escopo da V1

A Web/PWA está publicada. O APK anexado à v1.0.0 usa assinatura debug e serve apenas para teste; iOS não foi validado em dispositivo físico. A V1 não oferece sincronização entre dispositivos nem backend para dados de treino.

Treinos e rotinas ficam no IndexedDB local. Isso não equivale a criptografia ou proteção contra alguém com acesso ao dispositivo. Limpar os dados do navegador pode apagá-los. Backups contêm dados pessoais de treino: guarde e compartilhe com cuidado.

## IA opcional / BYOK

A IA começa desativada. Chaves informadas pelo usuário ficam somente na memória da aba, não em IndexedDB, localStorage, backup ou bundle. Recarregar ou desativar remove a configuração. O app mostra uma prévia e exige confirmação antes de enviar dados ao provedor escolhido.

As chamadas usam HTTPS e omitem cookies. O frontend não é um cofre: extensões comprometidas, XSS ou acesso ao processo do navegador podem expor uma chave em uso. O provedor aplica seus próprios custos, limites e política de retenção. Respostas de IA são informativas e não alteram o treino automaticamente. Veja [BYOK e privacidade](docs/BYOK.md).

## Relatar uma vulnerabilidade

Não publique chaves, backups, dados pessoais nem detalhes de exploração em issues. Use o canal privado da aba Security quando disponível; caso contrário, solicite um canal privado ao mantenedor pelo perfil do GitHub sem divulgar os detalhes em público.

Informe versão ou commit, plataforma, passos de reprodução com dados sintéticos e impacto observado. Não envie credenciais reais.
