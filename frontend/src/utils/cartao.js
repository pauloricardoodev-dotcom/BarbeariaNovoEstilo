// Máscaras e validação básica do formulário de cartão (só no navegador).
// Quem valida de verdade e processa o pagamento será o gateway.

const digitos = (valor) => valor.replace(/\D/g, '');

/** "4111111111111111" → "4111 1111 1111 1111" (até 19 dígitos). */
export const formatarNumeroCartao = (valor) =>
  digitos(valor)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/** Como impresso no cartão: maiúsculas, só letras e espaços, sem espaços duplicados. */
export const formatarNomeCartao = (valor) =>
  valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 26);

/** "5" → "05", "13" → "01/3", "0428" → "04/28". Mês sempre entre 01 e 12. */
export const formatarValidade = (valor) => {
  let d = digitos(valor);
  if (/^[2-9]/.test(d)) d = `0${d}`; // mês de um dígito: "5" vira "05"
  if (/^1[3-9]/.test(d)) d = `0${d}`; // "13" é janeiro + ano começando em 3
  if (d.startsWith('00')) d = '0'; // mês 00 não existe
  if (d.length === 6) d = d.slice(0, 2) + d.slice(4); // colou "12/2028": fica "12/28"
  d = d.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export const formatarCvv = (valor) => digitos(valor).slice(0, 4);

/** Algoritmo de Luhn: pega número digitado errado (não garante que o cartão exista). */
const luhnValido = (numero) => {
  let soma = 0;
  for (let i = 0; i < numero.length; i++) {
    let n = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
};

/** Retorna a primeira mensagem de erro, ou '' se estiver tudo certo. */
export const validarCartao = ({ numero, nome, validade, cvv }, hoje = new Date()) => {
  const n = digitos(numero);
  if (n.length < 13 || !luhnValido(n)) return 'Número do cartão inválido.';
  if (nome.trim().length < 3) return 'Informe o nome como está impresso no cartão.';
  const [mes, ano] = validade.split('/').map(Number);
  if (!mes || validade.length !== 5) return 'Informe a validade no formato MM/AA.';
  // O cartão vale até o último dia do mês de validade.
  if (new Date(2000 + ano, mes, 1) <= new Date(hoje.getFullYear(), hoje.getMonth(), 1)) {
    return 'Cartão vencido.';
  }
  if (cvv.length < 3) return 'CVV inválido.';
  return '';
};

/** "12345678909" → "123.456.789-09". */
export const formatarCpf = (valor) =>
  digitos(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');

/** CPF com os dois dígitos verificadores corretos (pega erro de digitação, não garante que exista). */
export const cpfValido = (valor) => {
  const c = digitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(c[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(c[9]) && digito(10) === Number(c[10]);
};
