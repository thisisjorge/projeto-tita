# Semana, catálogo e recebimento de JSON

## Dados e versões

- `Routine.weekday` é opcional e usa `SEGUNDA` a `DOMINGO`. Rotinas antigas sem o campo continuam válidas e aparecem depois das que têm dia fixo. `optional` é outro campo opcional; sábado e domingo são tratados como opcionais quando ele não está definido. O editor permite escolher explicitamente.
- O backup geral permanece em `tita-backup-v1`, schemaVersion 1. O compartilhamento de rotina/programa permanece em `titan-program`, schemaVersion 1, com `weekday`, `kind`, estratégias e metadados opcionais. São adições compatíveis; nenhum registro antigo precisa ser regravado. Por isso não há migration destrutiva nem aumento da versão.
- **Exportar rotina** gera um programa portátil de um único dia (`kind: routine`). **Exportar programa/semana** inclui todas as rotinas ativas, ordenadas de segunda a domingo (`kind: program`). Ambos excluem histórico pessoal. **Exportar sessão JSON**, no detalhe do histórico, gera um backup v1 com apenas aquele snapshot; ele pode ser reimportado por mesclagem.
- Na importação, exercícios customizados com nome e equipamento exatamente equivalentes são reutilizados por referência. IDs e treinos já gravados não são alterados. A aba **Personalizados** da biblioteca mostra equivalências candidatas e problemas de metadados para revisão humana; ela não vincula históricos automaticamente.

## Compartilhar e abrir JSON

O manifesto registra `share_target` para arquivos `.json` e `file_handlers` para navegadores que oferecem esse recurso. O service worker recebe o POST multipart, limita a 5 MB, guarda temporariamente o arquivo em IndexedDB e redireciona para a tela de rotinas. A tela identifica o formato, valida com os parsers de programa ou backup existentes e exige confirmação. Backups recebidos por esse caminho pulam registros com IDs já presentes, sem sobrescrever dados locais. O import manual permanece disponível.

O destino de compartilhamento da PWA depende do navegador, do sistema operacional e da instalação. O [Web Share Target](https://web.dev/articles/files/receive-shared-files) usa o fluxo de compartilhamento em plataformas compatíveis; [File Handling](https://developer.chrome.com/docs/capabilities/web-apis/file-handling) depende da API `launchQueue` e do suporte do sistema. No APK v1.0.2, um plugin Android próprio recebe JSON por **Compartilhar** ou **Abrir com**, com prévia e confirmação no importador existente. A disponibilidade no menu do dispositivo depende do MIME enviado pelo outro app; **Importar JSON** continua disponível na tela de rotinas.

## Progressão

O editor pode definir faixa de repetições e RIR alvo. A sugestão Double Progression usa a última sessão, a faixa da rotina, RIR registrado quando há alvo e o incremento do exercício. Ela mantém a carga até todas as séries de trabalho alcançarem o topo da faixa no mesmo peso. Duas quedas consecutivas de repetições podem gerar uma sugestão de revisão/redução. Nada é aplicado sem ação explícita do usuário. Quando não há histórico ou faixa definida, valem os padrões anteriores.
