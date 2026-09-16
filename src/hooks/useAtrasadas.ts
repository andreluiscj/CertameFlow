import { useMemo } from 'react';
import { useEventos } from '@/hooks/useEventos';
import { useContratos, type ContratoCadastro } from '@/hooks/useContratos';
import { parseISO, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { isEventoPausado } from '@/lib/utils';

/** `enabled` evita buscar dados de um módulo que o usuário não pode acessar. */
export function useAtrasadasCount(enabled = true) {
  const { data: eventos = [] } = useEventos({ enabled });

  return useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return eventos.filter((e) => {
      if (e.concluido) return false;
      if (isEventoPausado(e)) return false;
      const dataEvento = parseISO(e.data);
      dataEvento.setHours(0, 0, 0, 0);
      return differenceInDays(dataEvento, hoje) < 0;
    }).length;
  }, [eventos]);
}

/** Contrato com ao menos uma parcela não paga e com vencimento já passado. */
export function contratoTemParcelaAtrasada(contrato: ContratoCadastro, hoje = new Date()) {
  return (contrato.parcelas ?? []).some(
    (p) => !p.pago && !!p.data_pagamento && differenceInCalendarDays(parseISO(p.data_pagamento), hoje) < 0,
  );
}

/** Quantidade de contratos com parcela atrasada. */
export function useContratosAtrasadosCount(enabled = true) {
  const { data: contratos = [] } = useContratos({ enabled });

  return useMemo(() => {
    const hoje = new Date();
    return contratos.filter((c) => contratoTemParcelaAtrasada(c, hoje)).length;
  }, [contratos]);
}
