'use client';

import { ROLE_NAMES, type Role } from '@/lib/roles';
import { createContext, useContext } from 'react';

const RoleContext = createContext<Role>('owner');

export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): Role {
  return useContext(RoleContext);
}

/** True when the signed-in person owns this wardrobe (Gaurav). */
export function useIsOwner(): boolean {
  return useContext(RoleContext) === 'owner';
}

/** First name of whoever is signed in. */
export function useViewerName(): string {
  return ROLE_NAMES[useContext(RoleContext)];
}
