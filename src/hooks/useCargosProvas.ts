import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { CargoProva, CargoProvaInsert, CargoProvaUpdate as CargoProvaPatch } from '@/types/database';

export type { CargoProva, CargoProvaInsert };

export type CargoProvaUpdate = Pick<CargoProva, 'id'> & CargoProvaPatch;

export function useCargosProvas() {
  return useQuery({
    queryKey: ['provas-cargos'],
    queryFn: () => api.get<CargoProva[]>('/api/provas/cargos'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCargoProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CargoProvaInsert) => api.post<CargoProva>('/api/provas/cargos', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-cargos'] });
      toast.success('Cargo cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateCargoProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: CargoProvaUpdate) =>
      api.patch<CargoProva>(`/api/provas/cargos/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-cargos'] });
      toast.success('Cargo atualizado');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteCargoProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/provas/cargos/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-cargos'] });
      toast.success('Cargo excluído');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}
