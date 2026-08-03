# src\lib\analytics\sessionHeartbeat.ts

- shouldSuppress · function · L36-L38 — function shouldSuppress(): boolean
- getSessionId · function · L40-L46 — function getSessionId(): string | null
- sendKeepaliveEvent · function · L48-L77 — function sendKeepaliveEvent( eventType: 'session_end', payload: Record<string, number | string | boolean>, ): void
- startSessionHeartbeat · function · L79-L154 — function startSessionHeartbeat(): () => void
- markInteraction · function · L92-L94 — markInteraction = ()
- onVisibility · function · L96-L99 — onVisibility = ()
- onNavigation · function · L101-L104 — onNavigation = ()
- tick · function · L106-L124 — tick = ()
- flushEnd · function · L126-L133 — flushEnd = ()
