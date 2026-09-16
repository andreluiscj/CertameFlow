import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Banco } from '@/types/database';

export function useBancos() {
  return useQuery({
    queryKey: ['provas-bancos'],
    queryFn: () => api.get<Banco[]>('/api/provas/bancos'),
    staleTime: 10 * 60 * 1000,
  });
}

