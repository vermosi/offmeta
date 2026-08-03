# src\integrations\supabase\adminRpc.ts

- AdminRpcName · type · L13-L13 — type AdminRpcName = 'get_system_status';
- AdminRpcResultMap · interface · L16-L36 — interface AdminRpcResultMap
- UntypedRpcClient · type · L38-L40 — type UntypedRpcClient = { rpc: (name: string) => Promise<{ data: unknown; error: unknown }>; };
- callAdminRpc · function · L47-L75 — async function callAdminRpc<Name extends AdminRpcName>( name: Name, ): Promise<{ data: AdminRpcResultMap[Name] | null; error: Error | null }>
