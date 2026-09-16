import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ehConflito } from '@/lib/api';
import { toast } from 'sonner';
import type {
  ContratoCliente as ContratoClienteRow,
  ContratoClienteInsert,
  ContratoClienteTipo,
} from '@/types/database';

export type ContratoCliente = ContratoClienteRow & {
  contrato_cliente_tipo?: Pick<ContratoClienteTipo, 'id' | 'nome'> | null;
};

export type ContratoClienteInput = ContratoClienteInsert;

export function useContratoClientes() {
  return useQuery({
    queryKey: ['contrato-clientes'],
    queryFn: () => api.get<ContratoCliente[]>('/api/contratos/clientes'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContratoCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContratoClienteInput) =>
      api.post<ContratoCliente>('/api/contratos/clientes', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-clientes'] });
      toast.success('Cliente cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateContratoCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: ContratoClienteInput & { id: string }) =>
      api.patch<ContratoCliente>(`/api/contratos/clientes/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-clientes'] });
      toast.success('Cliente atualizado');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteContratoCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/contratos/clientes/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-clientes'] });
      // O banco exclui em cascata os responsáveis do cliente.
      qc.invalidateQueries({ queryKey: ['contrato-responsaveis'] });
      toast.success('Cliente excluído');
    },
    onError: (e: Error) => {
      if (ehConflito(e)) {
        toast.warning('Não é possível excluir este cliente', {
          description: 'Ele possui contratos cadastrados. Exclua os contratos do cliente antes.',
        });
        return;
      }
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}
