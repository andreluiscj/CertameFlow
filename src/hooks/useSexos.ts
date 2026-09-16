import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Database } from '@/types/database';

export type Sexo = Pick<Database['public']['Tables']['provas_elaboradores_sexo']['Row'], 'id' | 'nome' | 'ordem'>;

export function useSexos() {
  return useQuery({
    queryKey: ['provas-elaboradores-sexo'],
    queryFn: () => api.get<Sexo[]>('/api/provas/sexos'),
    staleTime: 10 * 60 * 1000,
  });
}
