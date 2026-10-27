import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ObservacaoAgenda } from '@/types/database';

/** A API só deixa o autor ou um administrador excluir; aqui só se esconde o botão. */
export const podeExcluirObservacao = (obs: Pick<ObservacaoAgenda, 'usuario_id'>, usuarioId: string | undefined, isAdmin: boolean) =>
  isAdmin || (!!usuarioId && obs.usuario_id === usuarioId);

/** Comentários da agenda do mês, do mais antigo para o mais recente. */
export function useObservacoesDoMes(ano: number, mes: number) {
  return useQuery({
    queryKey: ['observacoes', ano, mes],
    queryFn: () => api.get<ObservacaoAgenda[]>(`/api/concursos/observacoes/${ano}/${mes}`),
  });
}

export function useAdicionarObservacao() {
  const queryClient = useQueryClient();

  return useMutation({
    // O autor é definido pela API a partir do usuário logado.
    mutationFn: ({ ano, mes, conteudo }: { ano: number; mes: number; conteudo: string }) =>
      api.post<ObservacaoAgenda>(`/api/concursos/observacoes/${ano}/${mes}`, { conteudo }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observacoes', variables.ano, variables.mes] });
    },
  });
}

export function useExcluirObservacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; ano: number; mes: number }) =>
      api.delete(`/api/concursos/observacoes/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observacoes', variables.ano, variables.mes] });
    },
  });
}
