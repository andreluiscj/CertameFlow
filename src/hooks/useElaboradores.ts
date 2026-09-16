import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Elaborador, AreaAtuacao } from '@/types/database';
import { toast } from 'sonner';

export type ElaboradorComAreas = Elaborador & {
  areas: Pick<AreaAtuacao, 'id' | 'codigo' | 'descricao'>[];
};

export function useElaboradores() {
  return useQuery({
    queryKey: ['provas-elaboradores'],
    queryFn: () => api.get<ElaboradorComAreas[]>('/api/provas/elaboradores'),
    staleTime: 2 * 60 * 1000,
  });
}

interface SaveInput {
  nome: string;
  email: string | null;
  celular: string | null;
  area_ids: string[];
  codigo?: number;
  cpf?: string | null;
  data_nascimento?: string | null;
  pis?: string | null;
  sexo_id?: string | null;
  banco_id?: string | null;
  tipo_conta?: string | null;
  agencia?: string | null;
  conta?: string | null;
}

export function useCreateElaborador() {
  const qc = useQueryClient();
  return useMutation({
    // A API grava o elaborador e as áreas numa única transação.
    mutationFn: (input: SaveInput) => api.post<Elaborador>('/api/provas/elaboradores', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-elaboradores'] });
      qc.invalidateQueries({ queryKey: ['provas-elaboradores-count-by-area'] });
      toast.success('Elaborador cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateElaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: SaveInput & { id: string }) => {
      await api.patch(`/api/provas/elaboradores/${id}`, input);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-elaboradores'] });
      qc.invalidateQueries({ queryKey: ['provas-elaboradores-count-by-area'] });
      toast.success('Elaborador atualizado');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteElaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/provas/elaboradores/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-elaboradores'] });
      qc.invalidateQueries({ queryKey: ['provas-elaboradores-count-by-area'] });
      toast.success('Elaborador excluído');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}
