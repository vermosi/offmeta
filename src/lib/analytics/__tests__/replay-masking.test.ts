/**
 * Guarantees that no user-entered or sensitive text can reach a PostHog
 * session replay payload. These tests assert the masking contract of
 * `buildReplayConfig()` against real DOM nodes, including the elements that
 * carry user input (search boxes, forms) and card detail content flagged
 * as private.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostHogConfig } from 'posthog-js';

const classifyTraffic = vi.fn(() => ({
  isInternal: false,
  shouldSuppressInsert: false,
}));

vi.mock('@/lib/analytics/traffic', () => ({ classifyTraffic }));

async function loadReplay() {
  return import('../replay');
}

type RecordingConfig = Exclude<
  PostHogConfig['session_recording'],
  undefined
> & {
  maskAllInputs?: boolean;
  maskTextSelector?: string;
  recordCrossOriginIframes?: boolean;
};

async function getRecordingConfig(): Promise<RecordingConfig> {
  const { buildReplayConfig } = await loadReplay();
  const config = buildReplayConfig();
  return config.session_recording as RecordingConfig;
}

function renderMarkup(html: string): void {
  document.body.innerHTML = html;
}

/** True when the element would be masked by the configured selector. */
function isMasked(element: Element, selector: string): boolean {
  return element.matches(selector);
}

describe('PostHog replay masking contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    classifyTraffic.mockReturnValue({
      isInternal: false,
      shouldSuppressInsert: false,
    });
    sessionStorage.clear();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
    // Force this session to be sampled in so recording config is exercised.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('always masks every input, regardless of sampling outcome', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // sampled out
    const sampledOut = await getRecordingConfig();
    expect(sampledOut.maskAllInputs).toBe(true);

    vi.resetModules();
    vi.spyOn(Math, 'random').mockReturnValue(0); // sampled in
    const sampledIn = await getRecordingConfig();
    expect(sampledIn.maskAllInputs).toBe(true);
  });

  it('never records cross-origin iframes that could leak third-party content', async () => {
    const config = await getRecordingConfig();
    expect(config.recordCrossOriginIframes).toBe(false);
  });

  it('masks the search box and every other user-input element', async () => {
    const { maskTextSelector } = await getRecordingConfig();
    expect(maskTextSelector).toBeTruthy();
    const selector = maskTextSelector as string;

    renderMarkup(`
      <input id="search" type="search" value="mono black sacrifice outlets" />
      <input id="email" type="email" value="player@example.com" />
      <textarea id="feedback">this search returned nothing</textarea>
    `);

    for (const id of ['search', 'email', 'feedback']) {
      const el = document.getElementById(id);
      expect(el, `#${id} should exist`).not.toBeNull();
      expect(isMasked(el as Element, selector), `#${id} must be masked`).toBe(
        true,
      );
    }
  });

  it('masks card detail nodes flagged as private or sensitive', async () => {
    const { maskTextSelector } = await getRecordingConfig();
    const selector = maskTextSelector as string;

    renderMarkup(`
      <section>
        <h1 id="card-name">Sol Ring</h1>
        <p id="card-note" data-private>owned copy: signed, stored in binder 3</p>
        <span id="card-price" data-sensitive>$412.00</span>
      </section>
    `);

    expect(
      isMasked(document.getElementById('card-note') as Element, selector),
    ).toBe(true);
    expect(
      isMasked(document.getElementById('card-price') as Element, selector),
    ).toBe(true);
  });

  it('leaves non-sensitive layout text unmasked so replays stay useful', async () => {
    const { maskTextSelector } = await getRecordingConfig();
    const selector = maskTextSelector as string;

    renderMarkup(`
      <nav><a id="nav-guides" href="/guides">Guides</a></nav>
      <h1 id="page-title">Search results</h1>
    `);

    expect(
      isMasked(document.getElementById('nav-guides') as Element, selector),
    ).toBe(false);
    expect(
      isMasked(document.getElementById('page-title') as Element, selector),
    ).toBe(false);
  });

  it('disables recording entirely on sensitive routes', async () => {
    window.history.pushState({}, '', '/auth/sign-in');
    const { buildReplayConfig } = await loadReplay();
    const config = buildReplayConfig();

    expect(config.disable_session_recording).toBe(true);
    const recording = config.session_recording as RecordingConfig;
    // Masking must still be configured in case recording is resumed later.
    expect(recording.maskAllInputs).toBe(true);
  });

  it('disables recording for internal and preview traffic', async () => {
    classifyTraffic.mockReturnValue({
      isInternal: true,
      shouldSuppressInsert: true,
    });
    const { buildReplayConfig } = await loadReplay();

    expect(buildReplayConfig().disable_session_recording).toBe(true);
  });

  it('does not permanently lock a session out of recording when the entry route is blocked', async () => {
    window.history.pushState({}, '', '/auth/sign-in');
    const { shouldRecordSession, buildReplayConfig } = await loadReplay();

    // Recording is disabled on the blocked route, but no sampling decision
    // should be persisted yet.
    expect(shouldRecordSession()).toBe(false);
    expect(buildReplayConfig().disable_session_recording).toBe(true);

    // Simulate navigation to a public route. The session should now be
    // eligible to sample in.
    window.history.pushState({}, '', '/');
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(shouldRecordSession()).toBe(true);
    expect(buildReplayConfig().disable_session_recording).toBe(false);
  });

  it('sets an explicit session idle timeout so sessions stay open during long brew sessions', async () => {
    const { buildReplayConfig, REPLAY_SESSION_IDLE_TIMEOUT_SECONDS } =
      await loadReplay();
    const config = buildReplayConfig();
    expect(config.session_idle_timeout_seconds).toBe(
      REPLAY_SESSION_IDLE_TIMEOUT_SECONDS,
    );
    expect(config.session_idle_timeout_seconds).toBe(30 * 60);
  });
});
