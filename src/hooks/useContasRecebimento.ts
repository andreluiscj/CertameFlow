import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ContratoContaRecebimento, ContratoContaRecebimentoInsert } from '@/types/database';

export type ContaRecebimento = ContratoContaRecebimento;
export type ContaRecebimentoInput = ContratoContaRecebimentoInsert;

export function useContasRecebimento() {
  return useQuery({
    queryKey: ['contrato-contas-recebimento'],
    queryFn: () => api.get<ContaRecebimento[]>('/api/contratos/contas-recebimento'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateContaRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContaRecebimentoInput) =>
      api.post<ContaRecebimento>('/api/contratos/contas-recebimento', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-contas-recebimento'] });
      toast.success('Conta cadastrada');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateContaRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: ContaRecebimentoInput & { id: string }) =>
      api.patch<ContaRecebimento>(`/api/contratos/contas-recebimento/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-contas-recebimento'] });
      toast.success('Conta atualizada');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteContaRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/contratos/contas-recebimento/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-contas-recebimento'] });
      toast.success('Conta excluída');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}
