# Guia de Configuração e Release — iOS (Projeto Titã)

Este documento orienta a equipe e colaboradores sobre a configuração, compilação, assinatura e publicação do aplicativo **Projeto Titã** para a plataforma iOS via Capacitor (REQ-12, Task 12.2).

---

## 1. Visão Geral da Arquitetura iOS

O Projeto Titã adota uma política de **código único**:
- **Zero Fork de Lógica:** A mesma base de código React 19 + TypeScript + CSS Tokens gerada pelo Vite em `dist/` é empacotada no projeto iOS Capacitor.
- **Identidade Neutra:** Bundle ID fixado em `app.tita.workout` e nome de exibição `"Projeto Titã"`.
- **Target Mínimo:** iOS 15.0+ (abrangendo >98% dos dispositivos iOS ativos).
- **Plugins Nativos com SPM:** O projeto utiliza Swift Package Manager (`Package.swift`) integrado nativamente no Capacitor 8 para gerenciar `@capacitor/app`, `@capacitor/haptics`, `@capacitor/local-notifications` e `@capacitor/share`.

---

## 2. Comandos do Fluxo de Trabalho

```bash
# 1. Gerar o bundle de produção Web
npm run build

# 2. Sincronizar assets e plugins no projeto iOS
npm run ios:sync

# 3. Abrir o workspace no Xcode (apenas macOS)
npm run ios:open
```

---

## 3. Requisitos de Ambiente (macOS & Xcode)

> [!NOTE]
> Conforme documentado nos guardrails do projeto, em ambientes Windows ou Linux o repositório mantém a árvore do projeto iOS (`ios/`) sincronizada e versionada com todos os descritores de pacote. A compilação binária final (`.ipa`), testes em simulador e publicação na App Store requerem uma máquina macOS.

### Pré-requisitos no Host macOS:
1. **macOS Sonoma (14.x) ou Sequoia (15.x)**
2. **Xcode 15.0 ou superior** (com Command Line Tools: `xcode-select --install`)
3. **CocoaPods** (opcional caso plugins legados exijam podspec; os plugins atuais usam SPM puro).

---

## 4. Assinatura de Código e Configuração no Xcode

1. No Xcode, selecione o target **App** e acesse a aba **Signing & Capabilities**.
2. Marque a opção **Automatically manage signing**.
3. Selecione a sua equipe de desenvolvedor Apple Developer Program (**Team**).
4. Confirme que o **Bundle Identifier** está definido como `app.tita.workout`.
5. Capacidades necessárias:
   - **Background Modes** (opcional para timers de áudio caso configurado).
   - **Push/Local Notifications** (para notificações de fim de descanso).

---

## 5. Manifesto de Privacidade (PrivacyInfo.xcprivacy)

O Projeto Titã adota princípios de privacidade estrita por padrão:
- **Zero Rastreamento (No Tracking):** `NSPrivacyTracking: false`.
- **Zero Coleta de Dados Pessoais de Terceiros:** Não há integração de analytics de terceiros.
- **Local-first:** Todos os treinos, rotinas e métricas residem no IndexedDB local do WebView.
- Arquivo localizado em `ios/App/App/PrivacyInfo.xcprivacy`.

---

## 6. Checklist de Publicação na App Store

- [ ] `npm run build` executado e atualizado em `ios/App/App/public`.
- [ ] Versão e Build incrementados no Xcode (`CFBundleShortVersionString`, `CFBundleVersion`).
- [ ] Ícones de aplicativo completos configurados em `AppIcon.appiconset`.
- [ ] Screenshots de demonstração capturadas (6.7" Super Retina, 6.5" e 12.9" iPad).
- [ ] Build gerado via **Product > Archive**.
- [ ] Validação no TestFlight antes da submissão para revisão.
