import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { createSupabaseMock } from '../test-utils/supabase-mock';

const createContext = (headers: Record<string, string>) => {
  const request: any = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
};

describe('SupabaseAuthGuard', () => {
  it('rejects requests without an authorization header', async () => {
    const supabase = createSupabaseMock({});
    const guard = new SupabaseAuthGuard(supabase.client);
    const { context } = createContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the verified user to the request', async () => {
    const supabase = createSupabaseMock({
      profiles: [{ response: { data: { is_super_admin: true }, error: null } }],
    });
    const getClaims = jest.fn().mockResolvedValue({
      data: {
        claims: { sub: 'user-1', email: 'a@example.com', role: 'authenticated' },
      },
      error: null,
    });
    (supabase.auth as any).getClaims = getClaims;
    const guard = new SupabaseAuthGuard(supabase.client);
    const { context, request } = createContext({
      authorization: 'Bearer token-123',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getClaims).toHaveBeenCalledWith('token-123');
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      role: 'authenticated',
      isSuperAdmin: true,
    });
  });

  it('rejects tokens that fail verification', async () => {
    const supabase = createSupabaseMock({});
    (supabase.auth as any).getClaims = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Invalid JWT signature'),
    });
    const guard = new SupabaseAuthGuard(supabase.client);
    const { context, request } = createContext({
      authorization: 'Bearer forged',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
});
