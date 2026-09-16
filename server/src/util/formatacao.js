/** "AAAA-MM-DD" -> "DD/MM/AAAA", para textos dos registros de atividade. */
export function dataBR(iso) {
  if (typeof iso !== 'string') return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

/** Texto entre aspas para descricoes, tolerando valor ausente. */
export function aspas(texto) {
  return `"${texto ?? ''}"`;
}
