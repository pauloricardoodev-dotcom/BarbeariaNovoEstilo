/**
 * Máscara de digitação para celular brasileiro: "41999990000" → "(41) 99999-0000".
 * Só formata a exibição; quem valida e normaliza (E.164) é o backend.
 * Números internacionais (começando com "+") ficam como digitados.
 */
export const formatarTelefone = (valor) => {
  if (valor.trim().startsWith('+')) return valor;
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** "+5541999990000" → "(41) 99999-0000"; outros países ficam em E.164. */
export const exibirTelefone = (e164) =>
  e164?.startsWith('+55') ? formatarTelefone(e164.slice(3)) : (e164 ?? '');
