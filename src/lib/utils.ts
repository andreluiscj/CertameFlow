import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Eventos de concursos pausados permanecem visíveis, mas não contam como atrasados.
export function isEventoPausado(evento: { concurso_cadastros?: { status?: string | null } | null }): boolean {
  const status = evento?.concurso_cadastros?.status;
  return typeof status === 'string' && status.toLowerCase() === 'pausado';
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
