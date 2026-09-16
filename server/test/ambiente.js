import { vi } from 'vitest';

// config/env.js valida estas variaveis no import; os testes nao usam valores reais.
vi.stubEnv('DATABASE_URL', 'postgresql://usuario:senha@localhost:5432/postgres');
vi.stubEnv('SUPABASE_ISSUER_URI', 'https://exemplo.supabase.co/auth/v1');
vi.stubEnv('SUPABASE_JWKS_URI', 'https://exemplo.supabase.co/auth/v1/.well-known/jwks.json');
