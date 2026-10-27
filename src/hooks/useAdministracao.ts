import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Usuario } from '@/types/database';

export type UsuarioAdministrado = Usuario;

export interface NovoUsuario {
  nome: string;
  email: string;
  setor: string;
  /** 4 = administrador; 0 = acesso só aos módulos marcados. */
  nivel_acesso: number;
  modulos: string[];
}

export type AlteracaoUsuario = Partial<
  Pick<Usuario, 'nome' | 'setor' | 'nivel_acesso' | 'modulos' | 'receber_notificacoes'>
>;

export interface SituacaoNotificacoes {
  configurado: boolean;
  hora: number;
  fusoHorario: string;
  ultimoEnvio: { data: string; destinatarios: number; enviado_em: string } | null;
}

export interface ResultadoEnvio {
  data: string;
  tarefas: number;
  parcelas: number;
  enviados: number;
  falhas: number;
  erro: string | null;
}

const CHAVE_USUARIOS = ['administracao', 'usuarios'];
const CHAVE_NOTIFICACOES = ['administracao', 'notificacoes'];

const avisarErro = (erro: Error) => toast.error(erro.message);

export function useUsuarios() {
  return useQuery({
    queryKey: CHAVE_USUARIOS,
    queryFn: () => api.get<UsuarioAdministrado[]>('/api/administracao/usuarios'),
  });
}

function useAposAlterarUsuarios() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: CHAVE_USUARIOS });
    qc.invalidateQueries({ queryKey: ['logs-atividades', 'administracao'] });
    // O próprio perfil pode ter mudado (nome, setor).
    qc.invalidateQueries({ queryKey: ['user-profile'] });
  };
}

export interface UsuarioCriado {
  usuario: UsuarioAdministrado;
  senha_provisoria: string;
}

export function useCriarUsuario() {
  const aposAlterar = useAposAlterarUsuarios();
  return useMutation({
    gcTime: 0, // a resposta traz a senha provisória: não fica no cache
    mutationFn: (dados: NovoUsuario) => api.post<UsuarioCriado>('/api/administracao/usuarios', dados),
    onSuccess: () => {
      aposAlterar();
      toast.success('Usuário cadastrado.');
    },
    onError: avisarErro,
  });
}

export function useAtualizarUsuario() {
  const aposAlterar = useAposAlterarUsuarios();
  return useMutation({
    mutationFn: ({ id, ...alteracoes }: AlteracaoUsuario & { id: string }) =>
      api.patch<UsuarioAdministrado>(`/api/administracao/usuarios/${id}`, alteracoes),
    onSuccess: aposAlterar,
    onError: avisarErro,
  });
}

export function useGerarSenhaProvisoria() {
  const aposAlterar = useAposAlterarUsuarios();
  return useMutation({
    gcTime: 0, // a resposta traz a senha provisória: não fica no cache
    mutationFn: (id: string) =>
      api.post<{ senha_provisoria: string }>(`/api/administracao/usuarios/${id}/senha-provisoria`, {}),
    onSuccess: aposAlterar,
    onError: avisarErro,
  });
}

export function useEnviarSenhaProvisoria() {
  return useMutation({
    gcTime: 0, // as variables levam a senha provisória: não ficam no cache
    mutationFn: ({ id, senha_provisoria }: { id: string; senha_provisoria: string }) =>
      api.post<void>(`/api/administracao/usuarios/${id}/senha-provisoria/envios`, { senha_provisoria }),
    onSuccess: () => toast.success('Senha enviada por e-mail.'),
    // 503 (SMTP não configurado), 409 e 502 trazem o que corrigir: ficam mais tempo na tela.
    onError: (erro: Error) => toast.error(erro.message, { duration: 10_000 }),
  });
}

export function useExcluirUsuario() {
  const aposAlterar = useAposAlterarUsuarios();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/administracao/usuarios/${id}`),
    onSuccess: () => {
      aposAlterar();
      toast.success('Usuário excluído.');
    },
    onError: avisarErro,
  });
}

export function useSituacaoNotificacoes() {
  return useQuery({
    queryKey: CHAVE_NOTIFICACOES,
    queryFn: () => api.get<SituacaoNotificacoes>('/api/administracao/notificacoes'),
  });
}

export function useEnviarNotificacoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ResultadoEnvio>('/api/administracao/notificacoes/envios', {}),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: CHAVE_NOTIFICACOES });
      if (r.tarefas === 0 && r.parcelas === 0) {
        toast.info('Não há tarefas nem parcelas atrasadas: nenhum e-mail foi enviado.');
      } else if (r.falhas > 0) {
        toast.warning(`${r.enviados} e-mail(s) enviado(s) e ${r.falhas} com falha. ${r.erro ?? ''}`, { duration: 10_000 });
      } else {
        toast.success(`${r.enviados} e-mail(s) enviado(s).`);
      }
    },
    // A mensagem de falha do SMTP diz o que corrigir no server/.env: fica mais tempo na tela.
    onError: (erro: Error) => toast.error(erro.message, { duration: 10_000 }),
  });
}
