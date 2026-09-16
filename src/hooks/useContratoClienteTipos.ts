import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ContratoClienteTipo } from '@/types/database';

export type { ContratoClienteTipo };

export function useContratoClienteTipos() {
  return useQuery({
    queryKey: ['contrato-cliente-tipos'],
    queryFn: () => api.get<ContratoClienteTipo[]>('/api/contratos/clientes-tipos'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContratoClienteTipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) =>
      api.post<ContratoClienteTipo>('/api/contratos/clientes-tipos', { nome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-cliente-tipos'] });
      toast.success('Tipo cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}
