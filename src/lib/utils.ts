import { clsx, type ClassValue } from "clsx";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Eventos de concursos pausados permanecem visíveis, mas não contam como atrasados.
export function isEventoPausado(evento: { concurso_cadastros?: { status?: string | null } | null }): boolean {
  const status = evento?.concurso_cadastros?.status;
  return typeof status === 'string' && status.toLowerCase() === 'pausado';
}

/**
 * O prazo de uma tarefa é o dia inteiro: o horário é só informativo. A tarefa
 * pode ser feita até o fim do seu dia e só fica atrasada a partir do dia seguinte.
 * Devolve quantos dias `em` está depois do dia da tarefa ("AAAA-MM-DD"), ou 0.
 */
export function diasDeAtraso(data: string, em: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(em, parseISO(data.slice(0, 10))));
}

/** Tarefa pendente, de concurso não pausado, cujo dia já passou. */
export function isEventoAtrasado(
  evento: { data: string; concluido: boolean; concurso_cadastros?: { status?: string | null } | null },
  hoje: Date = new Date(),
): boolean {
  return !evento.concluido && !isEventoPausado(evento) && diasDeAtraso(evento.data, hoje) > 0;
}

/** Iniciais do primeiro e do último nome: "André Luis Caldeira" -> "AC". */
export function iniciaisDoNome(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** Primeiro nome: "André Luis Caldeira" -> "André". */
export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}
