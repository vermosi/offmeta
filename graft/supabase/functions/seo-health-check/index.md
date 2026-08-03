# supabase\functions\seo-health-check\index.ts

- CheckRow · interface · L16-L22 — interface CheckRow
- extractMeta · function · L24-L30 — function extractMeta(html: string, name: string): string | null
- extractTitle · function · L32-L34 — function extractTitle(html: string): string
- countTag · function · L36-L38 — function countTag(html: string, tag: string): number
- extractFirstH1 · function · L40-L44 — function extractFirstH1(html: string): string
- fetchAsGooglebot · function · L46-L57 — async function fetchAsGooglebot(path: string): Promise<{ status: number; html: string; headers: Headers; }>
- checkSitemap · function · L59-L88 — async function checkSitemap(): Promise<CheckRow>
- checkPage · function · L90-L155 — function checkPage( path: string, html: string, status: number, headers: Headers, baseline: { title: string; bytes: number }, expectedName?: string, ): CheckRow
- pickTopCardPaths · function · L157-L196 — async function pickTopCardPaths(supabase: ReturnType<typeof createClient>): Promise< { path: string; name: string }[] >
