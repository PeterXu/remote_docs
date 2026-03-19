// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { User } from '../types';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      },
      401
    );
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256');

    c.set('user', {
      id: payload.sub as string,
      email: (payload.email as string) || '',
    });

    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_TOKEN', message },
      },
      401
    );
  }
});
