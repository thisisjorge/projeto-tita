# Projeto Titã V1 — publicação

Versionamento: `1.0.0`, Android `versionCode=1`, iOS build `1`. O build publica `release.json` com versão e SHA e usa SHA no nome do cache do shell. IDs, schema do banco, histórico, rotinas, exercícios personalizados e preferências não são reescritos.

## Catálogo e mídia

O upstream Bryllim está fixado em `aac599224bb9780305239607ef98540b7e0ce389`: 302 exercícios e 906 frames SVG (25.898.785 bytes brutos). O catálogo final tem 217 exercícios: 42 preservados integralmente e 175 adicionados. Foram identificados 5 duplicados e 82 incompatíveis com o fluxo/enums V1. Não há exclusões por tamanho. A matriz completa registra cada decisão em [catalog-matrix.md](v1-final/catalog-matrix.md).

215 exercícios recebem três frames e GIF real de 256 px. Rosca Direta com Barra e Rosca Scott com Barra W mantêm seus IDs/dados e usam fallback local: o antigo mapeamento apontava, respectivamente, para halteres e máquina. Não foi necessário baixar a fonte externa recusada.

Curadoria explícita PT-BR em `scripts/catalog/names-pt-br.txt`; aliases em inglês continuam pesquisáveis. Tipos de duração/distância/assistência e movimentos sem role fiel são documentados como incompatíveis, para não gerar substituições ou volumes incorretos. Os novos itens não fingem possuir instruções técnicas que o upstream não fornece.

Pipeline reproduzível:

```sh
node scripts/build-exercise-catalog.mjs
node scripts/fetch-exercise-media.mjs
npm run media:generate
node scripts/build-exercise-catalog.mjs --check
npm run media:check
```

O download verifica cada blob contra o Git tree fixado. O gerador é local, sem rede/fontes do sistema, com versões exatas de resvg/gifenc. Proveniência, criadores, mudanças e CC BY-SA 4.0 estão em `public/media/ATTRIBUTION.md` e `public/media/upstream-manifest.json`. Os derivados mantêm a licença.

Android embarca os assets. A PWA baixa thumbnails com lazy loading e GIF apenas no detalhe; mídia já carregada vai para cache progressivo independente do shell. Atualizar o shell migra os assets baixados do cache anterior. Nenhuma mídia entra no precache inicial.

## Correções funcionais

Inputs mantêm texto temporário vazio durante edição. Somente valores válidos atravessam a camada de domínio; blur inválido mantém o último valor e torna a série pendente com explicação em PT-BR. A finalização aguarda as gravações anteriores na mesma fila; resultados assíncronos antigos não reabrem estado da tela concluída.

Menus e seletor de tipo usam portal, limites da viewport/visualViewport, rolagem interna, Escape, foco e navegação por teclado. O seletor preserva os enums e metodologias. Ícones seguem o SVG existente e ambos os temas. O pós-treino mostra volume, séries, duração, exercícios e repetições concluídas, com acesso a histórico, progresso e rotinas.

BYOK: teste de conexão 15 s, juiz rápido 4,5 s, análise completa 30 s. Timeout também limita fetch/stream que ignoram AbortSignal. O resultado local permanece disponível, erros são sanitizados e novas consultas dependem de ação explícita. Nenhuma chamada com chave pessoal integra a QA.

## Android e release

O workflow instala explicitamente platform-tools, Android 36 e build-tools 36.0.0, eliminando a solicitação ao pacote removido `tools`. Executa build web, cap sync e Gradle antes de publicar `projeto-tita-apk`, com APK nomeado e SHA256SUMS.

Sem os quatro secrets de assinatura, produz `Projeto-Tita-v1.0.0-debug.apk`. Não cria keystore de produção. Com assinatura legítima configurada, compila release. O APK anexado à v1.0.0 é um build debug de teste, não um release Android assinado para distribuição.

Gates: lint, Prettier, typecheck, unit/PBT, build, Chromium completo, WebKit completo, axe, offline, import/export e lifecycles. O [workflow de CI](../.github/workflows/ci.yml) e os testes versionados são as verificações reproduzíveis da V1; a matriz de curadoria e proveniência da biblioteca permanece em [catalog-matrix.md](v1-final/catalog-matrix.md).

Limites de QA: emulação responsiva/viewport curta não equivale a um Samsung S24 físico. Tamanho instalado só pode ser informado após instalação real; tamanho de APK, conteúdo descompactado, build web e cache inicial são medidas diferentes.
