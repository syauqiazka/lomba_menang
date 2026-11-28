import { PrismaClient } from '@prisma/client';

const DEFAULT_DB_TIMEOUT_MS = 3_500;
const DB_CIRCUIT_COOLDOWN_MS = 45_000;
const WARN_THROTTLE_MS = 15_000;

function resolveDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);
    const isPooler = parsed.hostname.includes('-pooler');
    if (isPooler) {
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }
      // Neon PgBouncer pooler + channel_binding=require can trigger P1001 TLS drops with Prisma 6 on Windows.
      parsed.searchParams.delete('channel_binding');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '15');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20');
    }
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '10');
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prismaV2: PrismaClient | undefined;
  dbCircuitOpenUntil: number | undefined;
  lastDbWarnAt: number | undefined;
};

const datasourceUrl = resolveDatasourceUrl();

export const prisma =
  globalForPrisma.prismaV2 ??
  new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaV2 = prisma;

export function isDbCircuitOpen(): boolean {
  const openUntil = globalForPrisma.dbCircuitOpenUntil;
  if (typeof openUntil !== 'number') return false;
  return performance.now() < openUntil;
}

export function resetDbCircuit(): void {
  globalForPrisma.dbCircuitOpenUntil = undefined;
  globalForPrisma.lastDbWarnAt = undefined;
}

function logDbFallbackWarning(label: string, err: unknown): void {
  const now = performance.now();
  if (
    typeof globalForPrisma.lastDbWarnAt === 'number' &&
    now - globalForPrisma.lastDbWarnAt < WARN_THROTTLE_MS
  ) {
    return;
  }
  globalForPrisma.lastDbWarnAt = now;
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code ?? '') : '';
  const msg = err instanceof Error ? err.message.split('\n')[0].slice(0, 140) : 'Unknown DB error';
  console.warn(
    `[db-fallback] Switching to local snapshot (${label})${code ? ` [${code}]` : ''}: ${msg}`
  );
}

/**
 * Runs a Prisma query with a bounded timeout and short-lived circuit breaker.
 * If the database is unreachable (e.g. P1001) or slow, falls back seamlessly to local official snapshots.
 */
export async function runDbQuery<T>(
  queryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  options?: { timeoutMs?: number; label?: string }
): Promise<T> {
  if (isDbCircuitOpen()) {
    return fallbackFn();
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_DB_TIMEOUT_MS;
  const label = options?.label ?? 'query';
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const queryPromise = queryFn();
    // Prevent UnhandledPromiseRejection if timeout fires before queryPromise rejects (e.g. P1001).
    queryPromise.catch(() => undefined);

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DB_QUERY_TIMEOUT')), timeoutMs);
    });

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err) {
    globalForPrisma.dbCircuitOpenUntil = performance.now() + DB_CIRCUIT_COOLDOWN_MS;
    logDbFallbackWarning(label, err);
    return fallbackFn();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default prisma;
