import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type {
  ContratoTipoProcesso,
  ContratoStatus,
  ContratoFormaPagamento,
  ContratoContaRecebimento,
  ContratoParcelaStatus,
  ContratoParcela as ContratoParcelaRow,
  ContratoCadastro as ContratoCadastroRow,
  ContratoCliente,
  Concurso,
} from '@/types/database';

// ===== Tipos =====
export type { ContratoTipoProcesso, ContratoStatus, ContratoFormaPagamento, ContratoContaRecebimento, ContratoParcelaStatus };

export type ContratoParcela = ContratoParcelaRow & {
  status?: Pick<ContratoParcelaStatus, 'id' | 'descricao'> | null;
};

export type ContratoCadastro = ContratoCadastroRow & {
  cliente?: Pick<ContratoCliente, 'id' | 'descricao' | 'cidade' | 'uf'> | null;
  tipo_processo?: Pick<ContratoTipoProcesso, 'id' | 'descricao'> | null;
  status?: Pick<ContratoStatus, 'id' | 'descricao'> | null;
  forma_pagamento?: ContratoFormaPagamento | null;
  conta_recebimento?: ContratoContaRecebimento | null;
  concurso?: Pick<Concurso, 'id' | 'nome' | 'cidade' | 'uf' | 'concurso_id'> | null;
  parcelas?: ContratoParcela[];
};

// ===== Queries auxiliares =====
export function useContratoTiposProcesso() {
  return useQuery({
    queryKey: ['contrato-tipos-processo'],
    queryFn: () => api.get<ContratoTipoProcesso[]>('/api/contratos/tipos-processo'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useContratoStatusList() {
  return useQuery({
    queryKey: ['contrato-status'],
    queryFn: () => api.get<ContratoStatus[]>('/api/contratos/status'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useContratoParcelaStatus() {
  return useQuery({
    queryKey: ['contrato-parcela-status'],
    queryFn: () => api.get<ContratoParcelaStatus[]>('/api/contratos/parcela-status'),
    staleTime: 2 * 60 * 1000,
  });
}

// ===== Contratos =====
// A API ja devolve as parcelas ordenadas por "ordem".
export function useContratos({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['contratos'],
    enabled,
    queryFn: () => api.get<ContratoCadastro[]>('/api/contratos/cadastros'),
    staleTime: 60 * 1000,
  });
}

export function useContrato(id: string | undefined) {
  return useQuery({
    queryKey: ['contrato', id],
    queryFn: () => (id ? api.getOrNull<ContratoCadastro>(`/api/contratos/cadastros/${id}`) : null),
    enabled: !!id,
  });
}

export function useUpdateContratoConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, concurso_id }: { id: string; concurso_id: string | null }) =>
      api.patch<ContratoCadastroRow>(`/api/contratos/cadastros/${id}/concurso`, { concurso_id }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['contratos'] });
      qc.invalidateQueries({ queryKey: ['contrato', vars.id] });
      toast.success('Concurso vinculado');
    },
    onError: (e: Error) => {
      console.error("Erro", e);
      toast.error("Erro. Tente novamente.");
    },
  });
}

export interface ContratoInput {
  cliente_id: string;
  tipo_processo_id: string;
  status_id: string;
  data_vigencia: string | null;
  conta_recebimento_id: string | null;
  valor_total: number;
  responsavel_ids?: string[];
  parcelas: Array<{
    ordem: number;
    percentual: number;
    data_pagamento: string | null;
  }>;
}

/**
 * Cadastra contrato, forma de pagamento, parcelas e responsaveis numa unica
 * chamada. A API grava tudo numa transacao: ou tudo e salvo, ou nada.
 */
export function useCreateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContratoInput) =>
      api.post<ContratoCadastroRow>('/api/contratos/cadastros', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contratos'] });
      qc.invalidateQueries({ queryKey: ['contrato-cadastro-responsaveis'] });
      toast.success('Contrato cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}


export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/contratos/cadastros/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato excluído');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}

export function useUpdateParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status_id?: string | null;
      pago?: boolean;
      data_pagamento_efetivo?: string | null;
    }) => {
      const { id, ...patch } = input;
      await api.patch(`/api/contratos/parcelas/${id}`, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contratos'] });
      qc.invalidateQueries({ queryKey: ['contrato'] });
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar parcela", e);
      toast.error("Erro ao atualizar parcela. Tente novamente.");
    },
  });
}
