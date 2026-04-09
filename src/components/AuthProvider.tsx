/**
 * Auth provider component that wraps the app.
 */

import type { ReactNode } from 'react';
import { AuthContext, useAuthProvider } from '@/hooks';

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
