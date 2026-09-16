import { createClient } from '@supabase/supabase-js';
import { ErroHttp } from '../middleware/tratadorDeErros.js';
import { env } from './env.js';

let cliente = null;

/**
 * Cliente do Supabase com a chave service_role, criado so quando usado.
 *
 * Essa chave ignora as policies do banco, por isso fica apenas no servidor e
 * so e usada depois de a rota conferir o nivel de acesso do usuario.
 */
export function supabaseAdmin() {
  if (!env.supabaseServiceRoleKey) {
    throw new ErroHttp(503, 'Função indisponível: defina SUPABASE_SERVICE_ROLE_KEY no server/.env.');
  }
  cliente ??= createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cliente;
}
