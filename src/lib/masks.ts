// Máscaras de input para campos brasileiros

export function maskCPF(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '-' + p4;
  return out;
}

/**
 * Telefone fixo (00) 0000-0000 ou celular (00) 00000-0000, aplicado
 * conforme a quantidade de dígitos digitados.
 */
export function maskTelefone(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  const ddd = digits.slice(0, 2);
  const numero = digits.slice(2);
  // Sem o espaço final: senão o Backspace logo após o DDD nunca apagaria nada.
  if (!numero) return `(${ddd}`;
  const corte = numero.length > 8 ? 5 : 4;
  const p1 = numero.slice(0, corte);
  const p2 = numero.slice(corte);
  return p2 ? `(${ddd}) ${p1}-${p2}` : `(${ddd}) ${p1}`;
}

/** CPF para exibição: formata quando há 11 dígitos, senão mantém o texto gravado. */
export function formatCPF(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length === 11 ? maskCPF(digits) : (value ?? '');
}

/** Telefone para exibição: formata quando há 10 ou 11 dígitos, senão mantém o texto gravado. */
export function formatTelefone(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? maskTelefone(digits) : (value ?? '');
}

export function maskPIS(value: string): string {
  // Formato PIS/PASEP: 000.00000.00/0 (11 dígitos)
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 8);
  const p3 = digits.slice(8, 10);
  const p4 = digits.slice(10, 11);
  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '/' + p4;
  return out;
}

export function unmask(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}
