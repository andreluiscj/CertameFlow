import { supabase } from './supabase';

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error('Defina VITE_API_URL no arquivo .env.');
}

/** Erro de uma resposta da API, preservando o status para quem precisa distingui-lo. */
export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroHttp';
  }
}

/**
 * A API recusou por regra de negócio (409), p.ex. excluir um registro ainda em
 * uso. Repetir a operação não adianta: a tela deve explicar o motivo.
 */
export function ehConflito(erro: unknown): boolean {
  return erro instanceof ErroHttp && erro.status === 409;
}

/** O registro não existe mais (404), p.ex. já excluído em outra tela ou em cascata. */
export function ehNaoEncontrado(erro: unknown): boolean {
  return erro instanceof ErroHttp && erro.status === 404;
}

export const SEM_CONEXAO = 'Não foi possível conectar ao servidor. Verifique se a API está em execução.';

/** Formato de erro devolvido pela API (TratadorDeErros). */
type ErroApi = {
  mensagem?: string;
  campos?: Record<string, string>;
};

async function requisicao<T>(caminho: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new ErroHttp(401, 'Sessão expirada. Entre novamente.');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${apiUrl}${caminho}`, {
      ...init,
      headers: {
        // Com FormData o navegador define o Content-Type (multipart) sozinho.
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    // fetch só rejeita quando não há resposta: API fora do ar, rede ou CORS.
    throw new ErroHttp(0, SEM_CONEXAO);
  }

  if (!resposta.ok) {
    throw new ErroHttp(resposta.status, await mensagemDeErro(resposta));
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  return (await resposta.json()) as T;
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  if (resposta.status === 401) return 'Sessão expirada. Entre novamente.';
  if (resposta.status === 403) return 'Você não tem permissão para esta operação.';

  try {
    const corpo = (await resposta.json()) as ErroApi;
    const campos = corpo.campos ? Object.values(corpo.campos) : [];
    if (campos.length > 0) return campos.join(' ');
    if (corpo.mensagem) return corpo.mensagem;
  } catch {
    // resposta sem corpo JSON
  }

  return `Falha na requisição (${resposta.status}).`;
}

export const api = {
  get: <T>(caminho: string) => requisicao<T>(caminho),

  /** Igual ao get, mas devolve null quando a API responde 404. */
  async getOrNull<T>(caminho: string): Promise<T | null> {
    try {
      return await requisicao<T>(caminho);
    } catch (erro) {
      if (erro instanceof ErroHttp && erro.status === 404) return null;
      throw erro;
    }
  },

  post: <T>(caminho: string, corpo: unknown) =>
    requisicao<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),

  patch: <T>(caminho: string, corpo: unknown) =>
    requisicao<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),

  put: <T>(caminho: string, corpo: unknown) =>
    requisicao<T>(caminho, { method: 'PUT', body: JSON.stringify(corpo) }),

  /** Envia um arquivo como multipart/form-data no campo informado. */
  upload: <T>(caminho: string, campo: string, arquivo: File) => {
    const corpo = new FormData();
    corpo.append(campo, arquivo);
    return requisicao<T>(caminho, { method: 'POST', body: corpo });
  },

  delete: <T = void>(caminho: string) => requisicao<T>(caminho, { method: 'DELETE' }),
};
