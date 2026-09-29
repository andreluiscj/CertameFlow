import { format, parseISO } from 'date-fns';
import { diasDeAtraso } from '@/lib/utils';

/** Campos da tarefa usados para descrever a conclusão. */
export interface TarefaComConclusao {
  data: string; // "AAAA-MM-DD"
  concluido: boolean;
  concluido_por_nome?: string | null;
  concluido_em?: string | null;
}

export interface Conclusao {
  autor: string | null;
  quando: string;
  /** "1 dia", "3 dias"; null quando a tarefa foi concluída até o fim do seu dia. */
  atraso: string | null;
}

/**
 * Quem concluiu, quando e com quanto atraso. O atraso é contado em dias, porque
 * a tarefa vale para o dia inteiro, mesmo quando tem horário (`diasDeAtraso`).
 * Devolve null para tarefa pendente ou concluída antes de o sistema registrar a autoria.
 */
export function descreverConclusao(tarefa: TarefaComConclusao): Conclusao | null {
  if (!tarefa.concluido || !tarefa.concluido_em) return null;
  const concluidaEm = parseISO(tarefa.concluido_em);
  const dias = diasDeAtraso(tarefa.data, concluidaEm);
  return {
    autor: tarefa.concluido_por_nome ?? null,
    quando: format(concluidaEm, "dd/MM/yyyy 'às' HH:mm"),
    atraso: dias > 0 ? `${dias} ${dias === 1 ? 'dia' : 'dias'}` : null,
  };
}
