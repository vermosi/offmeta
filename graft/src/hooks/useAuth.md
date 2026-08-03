# src\hooks\useAuth.ts

- AuthState · interface · L20-L26 — interface AuthState
- AuthContextValue · interface · L28-L41 — interface AuthContextValue extends AuthState
- sanitizeAuthErrorMessage · function · L50-L85 — function sanitizeAuthErrorMessage( error: { message?: string } | null | undefined, fallback: string, ): string
- useAuthProvider · function · L87-L253 — function useAuthProvider(): AuthContextValue
- applySession · function · L121-L151 — applySession = (session: Session | null)
- useAuth · function · L255-L259 — function useAuth(): AuthContextValue
