# Third-Party Notices and Licenses

Projeto Titã incorporates or depends on third-party open-source software packages. This document provides notice of the third-party software used, its licenses, and applicable copyright notices.

---

## Direct Runtime Dependencies

### 1. bcryptjs
- **License:** MIT
- **URL:** https://github.com/dcodeIO/bcrypt.js
- **Copyright:** (c) 2012 Daniel Wirtz

### 2. compression
- **License:** MIT
- **URL:** https://github.com/expressjs/compression
- **Copyright:** (c) 2014 Jonathan Ong, (c) 2014-2015 Douglas Christopher Wilson

### 3. cors
- **License:** MIT
- **URL:** https://github.com/expressjs/cors
- **Copyright:** (c) 2013 Troy Goode

### 4. dotenv
- **License:** BSD-2-Clause
- **URL:** https://github.com/motdotla/dotenv
- **Copyright:** (c) 2015, Scott Motte

### 5. express
- **License:** MIT
- **URL:** https://github.com/expressjs/express
- **Copyright:** (c) 2009-2014 TJ Holowaychuk, (c) 2013-2014 Roman Shtylman, (c) 2014-2015 Douglas Christopher Wilson

### 6. express-rate-limit
- **License:** MIT
- **URL:** https://github.com/express-rate-limit/express-rate-limit
- **Copyright:** (c) 2014-2024 Nathan Friedly

### 7. helmet
- **License:** MIT
- **URL:** https://github.com/helmetjs/helmet
- **Copyright:** (c) 2012-2024 Evan Hahn, Adam Baldwin

### 8. jsonwebtoken
- **License:** MIT
- **URL:** https://github.com/auth0/node-jsonwebtoken
- **Copyright:** (c) 2015 Auth0, Inc.

### 9. pg (node-postgres)
- **License:** MIT
- **URL:** https://github.com/brianc/node-postgres
- **Copyright:** (c) 2010-2024 Brian Carlson

### 10. zod
- **License:** MIT
- **URL:** https://github.com/colinhacks/zod
- **Copyright:** (c) 2020 Colin McDonnell

### 11. react & react-dom
- **License:** MIT
- **URL:** https://github.com/facebook/react
- **Copyright:** (c) Meta Platforms, Inc. and affiliates.

---

## Development and Platform Dependencies

### 12. @capacitor/core, @capacitor/cli, @capacitor/android, @capacitor/ios
- **License:** MIT
- **URL:** https://github.com/ionic-team/capacitor
- **Copyright:** (c) 2017-present Drifty Co.

### 13. vite
- **License:** MIT
- **URL:** https://github.com/vitejs/vite
- **Copyright:** (c) 2019-present Evan You & Vite Contributors

### 14. vitest
- **License:** MIT
- **URL:** https://github.com/vitest-dev/vitest
- **Copyright:** (c) 2021-present Anthony Fu & Vitest team

### 15. fast-check
- **License:** MIT
- **URL:** https://github.com/dubzzz/fast-check
- **Copyright:** (c) 2018 Nicolas Dubien

### 16. @playwright/test
- **License:** Apache-2.0
- **URL:** https://github.com/microsoft/playwright
- **Copyright:** (c) Microsoft Corporation

### 17. @axe-core/playwright
- **License:** MPL-2.0
- **URL:** https://github.com/dequelabs/axe-core-npm
- **Copyright:** (c) 2020 Deque Systems, Inc.

## Media and Dataset References

### 18. @bryllim/workout-guide
- **Code License:** MIT
- **Assets License:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **URL:** https://github.com/bryllim/workout-guide
- **Author:** Bryllim (bryllim@gmail.com)
- **Notice:** Exercise demonstration illustrations and frames referenced under CC BY-SA 4.0. No code or media is copied without attribution. Offline fallback mechanisms ensure application resilience.

---

## Architectural Benchmarks and References

- **openGym (`DuarteSantos8/openGym` / `alexpcosta/opengym`):** Used strictly as a conceptual benchmark for product, architecture, and feature patterns. No code, branding, artwork, or assets have been copied into Projeto Titã per canonical project rules (`AGENTS.md`, `docs/DECISIONS.md`).

## Bundled fonts and client packages

- **Inter** (`@fontsource/inter`): Copyright 2016 The Inter Project Authors. SIL Open Font License 1.1. [Source](https://github.com/rsms/inter). Full bundled notice: [Inter license](public/licenses/Inter-OFL.txt).
- **Barlow Condensed** (`@fontsource/barlow-condensed`): Copyright 2017 The Barlow Project Authors. SIL Open Font License 1.1. [Source](https://github.com/jpt/barlow). Full bundled notice: [Barlow license](public/licenses/Barlow-OFL.txt).
- **react-router-dom / react-router**: MIT; Remix Software, Inc. [Source](https://github.com/remix-run/react-router).
- **Capacitor app, haptics, local-notifications and share plugins**: MIT; Ionic contributors. [Source](https://github.com/ionic-team/capacitor-plugins).

## RC showcase

No new third-party exercise media was introduced in this round. Screenshots reproduce the existing application with synthetic training data. Existing Bryllim exercise illustrations remain credited under **CC BY-SA 4.0**; this also applies to the illustrated portions of the screenshots and adaptations. [License](https://creativecommons.org/licenses/by-sa/4.0/). Changes shown in captures: display scaling and theme surface composition; no claim of original authorship of those illustrations.

When sharing the showcase, retain the illustration credit and license link from [the showcase README](docs/public-showcase/README.md). The MIT license for application code does not relicense third-party artwork. Educational help text was written for this project; reference links are recorded in [INTELLIGENCE_RC](docs/INTELLIGENCE_RC.md).
