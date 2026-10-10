import { gerarHashSenha, verificarSenha } from './senha.js';

describe('senha (scrypt)', () => {
  it('gera hash no formato esperado e valida a senha correta', async () => {
    const hash = await gerarHashSenha('senha-forte-123');
    expect(hash).toMatch(/^scrypt\$65536\$8\$2\$[\w-]+\$[\w-]+$/);
    await expect(verificarSenha('senha-forte-123', hash)).resolves.toBe(true);
  });

  it('rejeita senha errada', async () => {
    const hash = await gerarHashSenha('senha-forte-123');
    await expect(verificarSenha('senha-forte-124', hash)).resolves.toBe(false);
  });

  it('usa salt aleatório (mesma senha, hashes diferentes)', async () => {
    const [a, b] = await Promise.all([
      gerarHashSenha('igual'),
      gerarHashSenha('igual'),
    ]);
    expect(a).not.toBe(b);
  });

  it('rejeita hash malformado sem lançar erro', async () => {
    await expect(verificarSenha('x', 'texto-qualquer')).resolves.toBe(false);
    await expect(verificarSenha('x', 'bcrypt$1$2$3$4$5')).resolves.toBe(false);
  });
});
