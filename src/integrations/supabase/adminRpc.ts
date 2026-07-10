/**
 * Typed wrapper for the admin analytics RPCs.
 *
 * The dashboard prefers the `admin-rpc` edge dispatcher when available so
 * auth is enforced server-side. We keep a small allowlist here because the
 * generated Database types only reflect `public` and do not preserve the
 * admin wrapper details.
 */

import { supabase } from './client';

/** Allowlist of admin RPC names. Add new admin RPCs here. */
export type AdminRpcName = 'get_system_status';

/** Response shape for each admin RPC. Keep in sync with the SQL definitions. */
export interface AdminRpcResultMap {
  get_system_status: {
    cronJobs: Array<{
      jobid: number;
      jobname: string;
      schedule: string;
      last_status: string | null;
      last_run_at: string | null;
      last_end_at: string | null;
      last_duration_s: number | null;
      last_message: string | null;
      failures_24h: number;
      runs_24h: number;
    }>;
    dataFreshness: Record<
      string,
      { count: number; latest?: string | null; active?: number; pending?: number }
    >;
    serverTime: string;
  };
}

type UntypedRpcClient = {
  rpc: (name: string) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Call an admin RPC. Prefers the `admin-rpc` edge function when available
 * (which enforces auth server-side); falls back to a direct schema-scoped
 * PostgREST call for environments where the edge dispatcher is unavailable.
 */
export async function callAdminRpc<Name extends AdminRpcName>(
  name: Name,
): Promise<{ data: AdminRpcResultMap[Name] | null; error: Error | null }> {
  try {
    const invoke = supabase.functions?.invoke;
    if (invoke) {
      const { data, error } = await invoke('admin-rpc', { body: { fn: name } });
      if (error) return { data: null, error: error as Error };
      const payload =
        data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)
          ? (data as { data: unknown }).data
          : data;
      return { data: payload as AdminRpcResultMap[Name], error: null };
    }

    const client = supabase.schema('admin_api' as never) as unknown as UntypedRpcClient;
    const { data, error } = await client.rpc(name);
    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { data: null, error: new Error(message) };
    }
    return { data: data as AdminRpcResultMap[Name], error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error('Admin RPC call failed'),
    };
  }
}
