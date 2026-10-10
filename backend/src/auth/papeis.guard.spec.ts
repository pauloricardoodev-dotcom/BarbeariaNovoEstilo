import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapeisGuard } from './papeis.guard.js';

function contexto(papel?: 'ADMIN' | 'SUPPORT'): ExecutionContext {
  const user = papel
    ? { id: '1', nome: 'X', email: 'x@x.com', papel }
    : undefined;
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PapeisGuard', () => {
  const reflector = new Reflector();
  const guard = new PapeisGuard(reflector);

  afterEach(() => vi.restoreAllMocks());

  it('libera quando a rota não exige papel', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contexto('SUPPORT'))).toBe(true);
  });

  it('libera quando o papel do usuário é permitido', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(guard.canActivate(contexto('ADMIN'))).toBe(true);
  });

  it('bloqueia (403) quando o papel não é permitido', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(contexto('SUPPORT'))).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia (403) quando não há usuário na requisição', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(contexto())).toThrow(ForbiddenException);
  });
});
