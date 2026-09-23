import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tita-release-metadata',
      generateBundle(_options, bundle) {
        const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
        const commit =
          process.env.GITHUB_SHA ||
          process.env.CF_PAGES_COMMIT_SHA ||
          execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: readFileSync('public/sw.js', 'utf8')
            .replace(
              /const RELEASE_ID = '[^']+';/,
              `const RELEASE_ID = 'v${version}-${commit.slice(0, 12)}';`,
            )
            .replace(
              '  // BUILD_SHELL_ASSETS',
              Object.keys(bundle)
                .filter(
                  (file) =>
                    file.endsWith('.js') || file.endsWith('.css') || /-latin-.*\.woff2$/.test(file),
                )
                .sort()
                .map((file) => `  ${JSON.stringify('/' + file)},`)
                .join('\n'),
            ),
        });
        this.emitFile({
          type: 'asset',
          fileName: 'release.json',
          source: JSON.stringify({
            version: JSON.parse(readFileSync('package.json', 'utf8')).version,
            commit:
              process.env.GITHUB_SHA ||
              process.env.CF_PAGES_COMMIT_SHA ||
              execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
          }),
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
