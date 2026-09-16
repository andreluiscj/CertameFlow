import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface DisciplinaNivelRow {
  id: string;
  disciplina_id: string;
  nivel_id: string | null;
  qtd: number;
  elaborador_id: string | null;
  status_id: string | null;
  contrato_status_id: string | null;
  contabilizar: boolean;
  prazo_entrega: string | null;
  provas_niveis: { descricao: string } | null;
}

/**
 * Linhas de nível/elaboração das disciplinas de uma prova, para a tela de
 * detalhe. A chave continua com os ids das disciplinas para recarregar quando
 * elas mudam.
 */
export function useDisciplinaNiveis(provaId: string | undefined, disciplinaIds: string[]) {
  return useQuery({
    queryKey: ['provas-disciplina-niveis', disciplinaIds],
    queryFn: () =>
      api.get<DisciplinaNivelRow[]>(`/api/provas/cadastros/${provaId}/disciplina-niveis`),
    enabled: !!provaId && disciplinaIds.length > 0,
    staleTime: 30 * 1000,
  });
}

/** Atualiza uma linha de nível/elaboração de disciplina, com atualização otimista do cache. */
export function useUpdateDisciplinaNivel(concursoId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DisciplinaNivelRow> }) => {
      // Não enviar campos relacionais (joins) para o UPDATE
      const { provas_niveis: _pn, ...dbPatch } = patch as Partial<DisciplinaNivelRow> & {
        provas_niveis?: unknown;
      };
      await api.patch(`/api/provas/disciplina-niveis/${id}`, dbPatch);
    },
    onMutate: async ({ id, patch }) => {
      qc.setQueriesData<DisciplinaNivelRow[]>({ queryKey: ['provas-disciplina-niveis'] }, (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    onError: () => {
      toast.error('Erro ao salvar');
      qc.invalidateQueries({ queryKey: ['provas-disciplina-niveis'] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumo-financeiro', concursoId] });
    },
  });
}
