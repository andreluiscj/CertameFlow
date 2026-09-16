import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface RegistroCertificado {
  elaborador_id: string;
  elaborador_nome: string;
  elaborador_cpf: string | null;
}

/**
 * Registra a emissão de uma declaração nos logs do módulo Provas.
 * Quem emitiu é definido pela API a partir do usuário logado.
 */
export function useRegistrarCertificado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registro: RegistroCertificado) =>
      api.post<{ elaborador_id: string | null }>('/api/provas/certificados', registro),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs-atividades', 'provas'] });
    },
  });
}
