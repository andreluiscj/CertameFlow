import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ehConflito, ehNaoEncontrado } from '@/lib/api';
import { toast } from 'sonner';
import type {
  ContratoResponsavel as ContratoResponsavelRow,
  ContratoResponsavelInsert,
  ContratoCliente,
} from '@/types/database';

export type ContratoResponsavel = ContratoResponsavelRow & {
  contrato_clientes?: Pick<ContratoCliente, 'id' | 'descricao' | 'cidade' | 'uf'> | null;
};

export type ContratoResponsavelInput = ContratoResponsavelInsert;

export function useContratoResponsaveis(clienteId?: string) {
  return useQuery({
    queryKey: ['contrato-responsaveis', clienteId ?? 'all'],
    queryFn: () => {
      const filtro = clienteId ? `?cliente_id=${encodeURIComponent(clienteId)}` : '';
      return api.get<ContratoResponsavel[]>(`/api/contratos/responsaveis${filtro}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContratoResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContratoResponsavelInput) =>
      api.post<ContratoResponsavel>('/api/contratos/responsaveis', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-responsaveis'] });
      toast.success('Responsável cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateContratoResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: ContratoResponsavelInput & { id: string }) =>
      api.patch<ContratoResponsavel>(`/api/contratos/responsaveis/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-responsaveis'] });
      toast.success('Responsável atualizado');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteContratoResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/contratos/responsaveis/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-responsaveis'] });
      toast.success('Responsável excluído');
    },
    onError: (e: Error) => {
      if (ehNaoEncontrado(e)) {
        // Já não existia: excluído por outra pessoa ou junto com o cliente dele.
        qc.invalidateQueries({ queryKey: ['contrato-responsaveis'] });
        toast.info('Este responsável já tinha sido excluído', {
          description: 'Ele pode ter sido removido junto com o cliente. A lista foi atualizada.',
        });
        return;
      }
      if (ehConflito(e)) {
        toast.warning('Não é possível excluir este responsável', {
          description:
            'Ele está vinculado a um ou mais contratos. Veja quais em "Ver contratos participantes".',
        });
        return;
      }
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}

/**
 * Deixa os responsáveis de um cliente iguais à lista, numa transação: item com
 * id é atualizado, item sem id é criado, e os ausentes da lista são excluídos.
 * Manter os ids preserva os vínculos desses responsáveis com contratos.
 */
export function useReplaceContratoResponsaveis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clienteId,
      responsaveis,
    }: {
      clienteId: string;
      responsaveis: (Omit<ContratoResponsavelInput, 'cliente_id' | 'id'> & { id?: string })[];
    }) =>
      api.put<ContratoResponsavel[]>(`/api/contratos/clientes/${clienteId}/responsaveis`, {
        responsaveis,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-responsaveis'] });
      // Responsável excluído aqui também sai dos contratos em que estava.
      qc.invalidateQueries({ queryKey: ['contrato-cadastro-responsaveis'] });
    },
    onError: (e: Error) => {
      if (ehConflito(e)) {
        toast.warning('Não foi possível salvar os responsáveis', {
          description:
            'Um responsável removido da lista está vinculado a contratos e não pode ser excluído. ' +
            'Os dados do cliente foram salvos.',
        });
        return;
      }
      console.error("Erro ao salvar responsáveis", e);
      toast.error(`Erro ao salvar responsáveis. ${e.message}`);
    },
  });
}
