# Reproducible Builds — Projeto Titã (Android & iOS)

Este documento define os insumos e versões de ferramentas estritamente fixadas para garantir compilações reprodutíveis e determinísticas das plataformas móveis do Projeto Titã (REQ-12, Task 12.4).

---

## 1. Matriz de Versões — Android

| Componente | Versão Fixada | Arquivo de Configuração |
|---|---|---|
| **Java JDK** | OpenJDK 17 LTS (Temurin 17.0.20+) | `JAVA_HOME`, `gradle.properties` |
| **Gradle Wrapper** | 8.14.3 | `android/gradle/wrapper/gradle-wrapper.properties` |
| **Android Gradle Plugin (AGP)** | 8.13.0 | `android/build.gradle` |
| **Compile SDK** | 36 (Android 16) | `android/variables.gradle` |
| **Target SDK** | 36 (Android 16) | `android/variables.gradle` |
| **Min SDK** | 24 (Android 7.0 Nougat) | `android/variables.gradle` |
| **AndroidX Core** | 1.17.0 | `android/variables.gradle` |
| **AndroidX AppCompat** | 1.7.1 | `android/variables.gradle` |
| **Capacitor Android** | 8.4.1 | `package.json` |
| **Application ID** | `app.tita.workout` | `android/app/build.gradle`, `capacitor.config.ts` |

### Insumos de Compilação Android
- Configuração do SDK: requer `local.properties` ou variável de ambiente `ANDROID_HOME` / `ANDROID_SDK_ROOT` apontando para o diretório do Android SDK com `platforms;android-36` e `build-tools;36.0.0` instalados.
- Exemplo disponível em: [`android/local.properties.example`](../android/local.properties.example).
- Comando de compilação:
  ```bash
  npm run build
  npm run cap:sync
  cd android && ./gradlew assembleDebug
  ```

---

## 2. Matriz de Versões — iOS

| Componente | Versão Fixada | Arquivo de Configuração |
|---|---|---|
| **Capacitor iOS** | 8.5.2 | `package.json` |
| **Deployment Target** | iOS 15.0+ | `ios/App/App.xcodeproj`, `capacitor.config.ts` |
| **Gerenciador de Dependências** | Swift Package Manager (SPM) / CocoaPods | `ios/App/Package.swift` |
| **Xcode Mínimo** | Xcode 15.0+ | Requisito do host macOS |
| **Bundle Identifier** | `app.tita.workout` | `ios/App/App.xcodeproj`, `capacitor.config.ts` |
| **App Name** | Projeto Titã | `ios/App/App/Info.plist`, `capacitor.config.ts` |

### Requisitos e Dependência de Ambiente
- A compilação binária de arquivos `.ipa` e execução no iOS Simulator requer um ambiente macOS com Xcode instalado.
- Em ambientes Windows/Linux, o projeto Capacitor iOS é gerado, sincronizado e versionado estruturalmente via `npx cap add ios` e `npm run ios:sync`, mas a execução do compilador Swift/Clang fica restrita à pipeline de CI macOS ou estação de trabalho Apple.

---

## 3. Plugins Capacitor e Adapters de Plataforma

Todos os plugins nativos utilizam a mesma versão de runtime sincronizada:
- `@capacitor/core`: `^8.4.1`
- `@capacitor/app`: `^8.1.1`
- `@capacitor/haptics`: `^8.0.2`
- `@capacitor/local-notifications`: `^8.3.1`
- `@capacitor/share`: `^8.0.2`

Qualquer chamada nativa possui fallback gracioso embutido em `src/platform/`, assegurando que o Web/PWA e o browser funcionem perfeitamente sem erros mesmo na ausência das APIs do dispositivo.
