import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type {
  ContratoCadastroResponsavel as ContratoCadastroResponsavelRow,
  ContratoResponsavel,
  ContratoCadastro,
  ContratoCliente,
  ContratoStatus,
} from '@/types/database';

export type ContratoCadastroResponsavel = ContratoCadastroResponsavelRow & {
  responsavel?: Pick<ContratoResponsavel, 'id' | 'nome' | 'cargo' | 'email' | 'telefone' | 'cliente_id'> | null;
  contrato?: (Pick<ContratoCadastro, 'id' | 'cliente_id' | 'data_vigencia' | 'valor_total'> & {
    cliente?: Pick<ContratoCliente, 'id' | 'descricao' | 'cidade' | 'uf'> | null;
    status?: Pick<ContratoStatus, 'id' | 'descricao'> | null;
  }) | null;
};

/** Responsáveis vinculados a um contrato. */
export function useResponsaveisDoContrato(contratoId?: string) {
  return useQuery({
    queryKey: ['contrato-cadastro-responsaveis', 'by-contrato', contratoId ?? ''],
    queryFn: () =>
      contratoId
        ? api.get<ContratoCadastroResponsavel[]>(`/api/contratos/cadastros/${contratoId}/responsaveis`)
        : [],
    enabled: !!contratoId,
    staleTime: 60 * 1000,
  });
}

/** Contratos onde o responsável participa. */
export function useContratosDoResponsavel(responsavelId?: string) {
  return useQuery({
    queryKey: ['contrato-cadastro-responsaveis', 'by-responsavel', responsavelId ?? ''],
    queryFn: () =>
      responsavelId
        ? api.get<ContratoCadastroResponsavel[]>(`/api/contratos/responsaveis/${responsavelId}/contratos`)
        : [],
    enabled: !!responsavelId,
    staleTime: 60 * 1000,
  });
}

type VinculoInput = { contratoId: string; responsavelId: string };

/** Vincula um responsável (do mesmo cliente) a um contrato. */
export function useVincularResponsavelContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contratoId, responsavelId }: VinculoInput) =>
      api.post<void>(`/api/contratos/cadastros/${contratoId}/responsaveis`, {
        responsavel_id: responsavelId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-cadastro-responsaveis'] });
      toast.success('Responsável vinculado');
    },
    onError: (e: Error) => {
      console.error("Erro ao vincular responsável", e);
      toast.error(`Erro ao vincular responsável. ${e.message}`);
    },
  });
}

/** Remove o vínculo de um responsável com um contrato. O responsável continua cadastrado. */
export function useDesvincularResponsavelContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contratoId, responsavelId }: VinculoInput) =>
      api.delete(`/api/contratos/cadastros/${contratoId}/responsaveis/${responsavelId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrato-cadastro-responsaveis'] });
      toast.success('Responsável desvinculado');
    },
    onError: (e: Error) => {
      console.error("Erro ao desvincular responsável", e);
      toast.error(`Erro ao desvincular responsável. ${e.message}`);
    },
  });
}

/** Substitui os responsáveis de um contrato pelos informados, numa transação. */
export function useSetContratoResponsaveis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contratoId,
      responsavelIds,
    }: {
      contratoId: string;
      responsavelIds: string[];
    }) =>
      api.put<ContratoCadastroResponsavelRow[]>(`/api/contratos/cadastros/${contratoId}/responsaveis`, {
        responsavel_ids: responsavelIds,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['contrato-cadastro-responsaveis'] });
      qc.invalidateQueries({ queryKey: ['contrato', vars.contratoId] });
    },
    onError: (e: Error) => {
      console.error("Erro ao salvar responsáveis", e);
      toast.error("Erro ao salvar responsáveis. Tente novamente.");
    },
  });
}
