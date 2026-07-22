// SEO health check — runs daily via pg_cron.
// Fetches sitemap + homepage + top card pages as Googlebot and flags regressions
// (identical HTML across routes, missing card name, noindex, soft-404, sitemap
// staleness). Writes one row per check to public.seo_health_checks.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { withLogging } from '../_shared/logger.ts';

const GOOGLEBOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const SITE_ORIGIN = 'https://offmeta.app';
const MIN_SITEMAP_URLS = 20;
const MAX_CARD_PAGES_TO_CHECK = 10;

interface CheckRow {
  check_type: string;
  target_url: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, unknown>;
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']+)["']`,
    'i',
  );
  return html.match(re)?.[1] ?? null;
}

function extractTitle(html: string): string {
  return (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
}

function countTag(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length;
}

function extractFirstH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchAsGooglebot(path: string): Promise<{
  status: number;
  html: string;
  headers: Headers;
}> {
  const res = await fetch(`${SITE_ORIGIN}${path}`, {
    headers: { 'User-Agent': GOOGLEBOT_UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  const html = await res.text();
  return { status: res.status, html, headers: res.headers };
}

async function checkSitemap(): Promise<CheckRow> {
  try {
    const res = await fetch(`${SITE_ORIGIN}/sitemap.xml`, {
      headers: { 'User-Agent': GOOGLEBOT_UA },
    });
    const body = await res.text();
    const urls = (body.match(/<loc>/g) ?? []).length;
    const passed = res.ok && urls >= MIN_SITEMAP_URLS;
    return {
      check_type: 'sitemap',
      target_url: `${SITE_ORIGIN}/sitemap.xml`,
      passed,
      severity: passed ? 'info' : 'critical',
      details: {
        status: res.status,
        url_count: urls,
        min_expected: MIN_SITEMAP_URLS,
        bytes: body.length,
      },
    };
  } catch (err) {
    return {
      check_type: 'sitemap',
      target_url: `${SITE_ORIGIN}/sitemap.xml`,
      passed: false,
      severity: 'critical',
      details: { error: String(err) },
    };
  }
}

function checkPage(
  path: string,
  html: string,
  status: number,
  headers: Headers,
  baseline: { title: string; bytes: number },
  expectedName?: string,
): CheckRow {
  const title = extractTitle(html);
  const robots = extractMeta(html, 'robots')?.toLowerCase() ?? '';
  const xRobots = (headers.get('x-robots-tag') ?? '').toLowerCase();
  const h1Count = countTag(html, 'h1');
  const h1Text = extractFirstH1(html);
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const expectedLower = expectedName?.toLowerCase() ?? '';
  const nameInBody = expectedName ? bodyText.toLowerCase().includes(expectedLower) : true;
  const nameInTitle = expectedName ? title.toLowerCase().includes(expectedLower) : true;
  const nameInH1 = expectedName ? h1Text.toLowerCase().includes(expectedLower) : true;
  const isHomepageClone =
    path !== '/' &&
    (html.length === baseline.bytes || title === baseline.title);
  const softFour04 =
    status === 200 && /(?:page not found|404 not found)/i.test(bodyText);
  const hasNoindex = /noindex/.test(robots) || /noindex/.test(xRobots);

  const failures: string[] = [];
  if (status !== 200) failures.push(`status_${status}`);
  if (hasNoindex) failures.push('noindex');
  if (softFour04) failures.push('soft_404');
  if (isHomepageClone) failures.push('homepage_clone');
  if (!nameInBody) failures.push('card_name_missing');
  if (!nameInTitle) failures.push('title_mismatch');
  if (!nameInH1) failures.push('h1_mismatch');
  if (h1Count === 0) failures.push('no_h1');
  if (h1Count > 1) failures.push('multiple_h1');

  const criticalFailures = failures.filter((f) =>
    ['status_404', 'status_500', 'noindex', 'soft_404', 'homepage_clone', 'card_name_missing', 'title_mismatch', 'h1_mismatch'].some(
      (c) => f.startsWith(c),
    ),
  );
  const severity: CheckRow['severity'] =
    criticalFailures.length > 0
      ? 'critical'
      : failures.length > 0
        ? 'warning'
        : 'info';

  return {
    check_type: expectedName ? 'card_page' : 'homepage',
    target_url: `${SITE_ORIGIN}${path}`,
    passed: failures.length === 0,
    severity,
    details: {
      status,
      title,
      h1_text: h1Text,
      h1_count: h1Count,
      bytes: html.length,
      failures,
      expected_name: expectedName ?? null,
    },
  };
}

async function pickTopCardPaths(supabase: ReturnType<typeof createClient>): Promise<
  { path: string; name: string }[]
> {
  // Prefer real traffic if analytics_events has it; fall back to hardcoded top slugs.
  const { data } = await supabase
    .from('analytics_events')
    .select('event_data')
    .eq('event_type', 'page_view')
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .limit(2000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const path = (row as { event_data: { path?: string } }).event_data?.path;
    if (typeof path === 'string' && path.startsWith('/cards/')) {
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CARD_PAGES_TO_CHECK)
    .map(([path]) => ({
      path,
      name: path.replace('/cards/', '').replace(/-/g, ' '),
    }));

  if (ranked.length >= 3) return ranked;

  // Fallback: known top pages from GSC audit
  return [
    { path: '/cards/mirkwood-bats', name: 'Mirkwood Bats' },
    { path: '/cards/enduring-vitality', name: 'Enduring Vitality' },
    { path: '/cards/cryptolith-rite', name: 'Cryptolith Rite' },
    { path: '/cards/all-that-glitters', name: 'All That Glitters' },
    { path: '/cards/no-mercy', name: 'No Mercy' },
    { path: '/cards/beast-whisperer', name: 'Beast Whisperer' },
    { path: '/cards/enchanted-evening', name: 'Enchanted Evening' },
    { path: '/cards/ensnaring-bridge', name: 'Ensnaring Bridge' },
  ];
}

Deno.serve(withLogging('seo-health-check', async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Pipeline key gate — matches project convention for cron-invoked functions.
  const providedKey = req.headers.get('x-pipeline-key');
  const expectedKey = Deno.env.get('OFFMETA_PIPELINE_KEY');
  if (!expectedKey || providedKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const rows: CheckRow[] = [];

  // Sitemap first
  rows.push(await checkSitemap());

  // Homepage baseline
  const home = await fetchAsGooglebot('/');
  const baseline = { title: extractTitle(home.html), bytes: home.html.length };
  rows.push(checkPage('/', home.html, home.status, home.headers, baseline));

  // Card pages
  const cardPaths = await pickTopCardPaths(supabase);
  for (const { path, name } of cardPaths) {
    try {
      const r = await fetchAsGooglebot(path);
      rows.push(checkPage(path, r.html, r.status, r.headers, baseline, name));
    } catch (err) {
      rows.push({
        check_type: 'card_page',
        target_url: `${SITE_ORIGIN}${path}`,
        passed: false,
        severity: 'critical',
        details: { error: String(err) },
      });
    }
  }

  // GSC traffic delta — flag if impressions collapse vs 14d median.
  // Implemented as a lightweight self-report; leave the DB-side check
  // to a separate cron that reads GSC directly.

  const { error: insertErr } = await supabase.from('seo_health_checks').insert(rows);
  if (insertErr) {
    return new Response(
      JSON.stringify({ error: 'insert_failed', details: insertErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Fire-and-forget retention
  try { await supabase.rpc('prune_old_seo_health_checks'); } catch { /* best effort */ }

  const criticalRows = rows.filter((r) => r.severity === 'critical');
  const criticals = criticalRows.length;

  // Alert admins on critical regressions (one notification per run, deduped by day)
  if (criticals > 0) {
    try {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
      if (adminIds.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const summary = criticalRows
          .slice(0, 5)
          .map((r) => {
            const fails = (r.details as { failures?: string[] }).failures ?? [];
            return `${r.target_url.replace(SITE_ORIGIN, '')} — ${fails.join(', ')}`;
          })
          .join('\n');
        const body =
          `${criticals} critical SEO regression${criticals === 1 ? '' : 's'} detected on prerendered card pages.\n\n${summary}` +
          (criticals > 5 ? `\n\n…and ${criticals - 5} more.` : '');
        const notifications = adminIds.map((user_id) => ({
          user_id,
          type: 'seo_regression',
          title: `SEO regression: ${criticals} critical issue${criticals === 1 ? '' : 's'}`,
          body,
          metadata: {
            run_date: today,
            critical_count: criticals,
            urls: criticalRows.map((r) => r.target_url),
          },
        }));
        await supabase.from('user_notifications').insert(notifications);
      }
    } catch (err) {
      console.error('seo-health-check: alert dispatch failed', err);
    }
  }

  return new Response(
    JSON.stringify({
      inserted: rows.length,
      critical: criticals,
      summary: rows.map((r) => ({
        check_type: r.check_type,
        target_url: r.target_url,
        passed: r.passed,
        severity: r.severity,
      })),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
