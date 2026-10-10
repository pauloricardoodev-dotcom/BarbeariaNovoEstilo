import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

// scrypt nativo do Node (parâmetros recomendados pela OWASP: N=2^16, r=8, p=2 ≈ 64 MiB).
// Formato armazenado: scrypt$N$r$p$<salt base64url>$<hash base64url>
const N = 2 ** 16;
const R = 8;
const P = 2;
const TAMANHO_HASH = 64;
const TAMANHO_SALT = 16;

function derivar(
  senha: string,
  salt: Buffer,
  opcoes: ScryptOptions,
  tamanho: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const maxmem = 256 * (opcoes.N ?? N) * (opcoes.r ?? R);
    scrypt(
      senha.normalize('NFKC'),
      salt,
      tamanho,
      { ...opcoes, maxmem },
      (erro, chave) => (erro ? reject(erro) : resolve(chave)),
    );
  });
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(TAMANHO_SALT);
  const hash = await derivar(senha, salt, { N, r: R, p: P }, TAMANHO_HASH);
  return [
    'scrypt',
    N,
    R,
    P,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

export async function verificarSenha(
  senha: string,
  armazenado: string,
): Promise<boolean> {
  const partes = armazenado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [, n, r, p, saltB64, hashB64] = partes;
  const esperado = Buffer.from(hashB64, 'base64url');
  const calculado = await derivar(
    senha,
    Buffer.from(saltB64, 'base64url'),
    { N: Number(n), r: Number(r), p: Number(p) },
    esperado.length,
  );
  return (
    calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
  );
}
