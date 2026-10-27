import { defineConfig } from '@playwright/test';

// Supabase e API ficam falsos: o Vite sobe com URLs que apontam para ele mesmo e
// page.route responde tudo. Nada chega ao Supabase real.
const PORTA = 5199;
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  workers: 1,
  reporter: [['list']],
  outputDir: './resultado',
  use: { baseURL: `http://localhost:${PORTA}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: `npm run build -- --outDir e2e/dist-e2e && npx vite preview --outDir e2e/dist-e2e --port ${PORTA} --strictPort`,
    timeout: 240_000,
    cwd: '..',
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: `http://localhost:${PORTA}`,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-falsa',
      VITE_SUPABASE_PROJECT_ID: 'falso',
      VITE_API_URL: `http://localhost:${PORTA}`,
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
