import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ProvaFullCargo {
  id: string;
  descricao: string;
  prova_id: string;
  provas_niveis: { descricao: string } | null;
}
export interface ProvaFullDisciplina {
  id: string;
  prova_id: string;
  disciplina: string;
  tipo: string | null;
  questoes: number;
  total_questoes_prova: number;
}
export interface ProvaFull {
  id: string;
  codigo: number;
  concurso_id: string;
  provas_cargos: ProvaFullCargo[];
  provas_disciplinas: ProvaFullDisciplina[];
}

/** Prova + cargos + disciplinas aninhados, para a tela de detalhe de uma prova. */
export function useProvaFull(provaId: string | undefined) {
  return useQuery({
    queryKey: ['prova-full', provaId],
    queryFn: () => api.get<ProvaFull>(`/api/provas/cadastros/${provaId}`),
    enabled: !!provaId,
    staleTime: 30 * 1000,
  });
}

export interface ProvaCompletaCargo {
  id: string;
  descricao: string;
  prova_id: string;
  provas_niveis: { descricao: string } | null;
}
export interface ProvaCompletaDisciplinaNivel {
  contabilizar: boolean | null;
}
export interface ProvaCompletaDisciplina {
  id: string;
  prova_id: string;
  questoes: number;
  provas_disciplina_niveis: ProvaCompletaDisciplinaNivel[];
}
export interface ProvaCompleta {
  id: string;
  codigo: number;
  provas_cargos: ProvaCompletaCargo[];
  provas_disciplinas: ProvaCompletaDisciplina[];
}

/** Lista completa de provas de um concurso, com cargos e disciplinas, para a tela de pedidos de questões. */
export function useProvasCadastroCompleto(concursoId: string | undefined) {
  return useQuery({
    queryKey: ['provas-cadastro-full', concursoId],
    queryFn: () => api.get<ProvaCompleta[]>(`/api/provas/concursos/${concursoId}/provas`),
    enabled: !!concursoId,
    staleTime: 30 * 1000,
  });
}

export interface ResumoDisciplinaNivel {
  id: string;
  nivel_id: string | null;
  qtd: number;
  contabilizar: boolean;
  provas_niveis: { descricao: string; valor_questao: number } | null;
}
export interface ResumoDisciplina {
  id: string;
  prova_id: string;
  disciplina: string;
  provas_disciplina_niveis: ResumoDisciplinaNivel[];
}
export interface ResumoFinanceiroProva {
  id: string;
  provas_disciplinas: ResumoDisciplina[];
}

/** Provas de um concurso com disciplinas e níveis, para o resumo financeiro. */
export function useProvasCadastroResumoFinanceiro(concursoId: string | undefined) {
  return useQuery({
    queryKey: ['resumo-financeiro', concursoId],
    queryFn: () =>
      api.get<ResumoFinanceiroProva[]>(`/api/provas/concursos/${concursoId}/resumo-financeiro`),
    enabled: !!concursoId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export interface ProvaCount {
  concurso_id: string;
  total: number;
}

/** Quantidade de provas cadastradas por concurso, para o dashboard de Provas. */
export function useProvasCadastroCountsPorConcurso() {
  return useQuery({
    queryKey: ['provas-dashboard-count'],
    queryFn: () => api.get<ProvaCount[]>('/api/provas/cadastros-contagem'),
    staleTime: 60 * 1000,
  });
}

/**
 * Exclui uma prova e tudo que depende dela (níveis de disciplina, disciplinas,
 * cargos). A API faz isso numa única instrução, pelas exclusões em cascata do banco.
 */
export function useDeleteProva() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      provaId,
    }: {
      provaId: string;
      concursoId: string | undefined;
      disciplinaIds: string[];
    }) => api.delete(`/api/provas/cadastros/${provaId}`),
    onSuccess: async (_data, { provaId, concursoId }) => {
      await qc.invalidateQueries({ queryKey: ['provas-cadastro-full', concursoId] });
      qc.removeQueries({ queryKey: ['prova-full', provaId] });
    },
  });
}
