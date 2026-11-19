import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { getSchemeContent } from './repository';
import { DEFAULT_CONTENT, SCHEME, SITE_VISIT } from './seed';
import type { SchemeContent } from './types';

export function defaultContent(): SchemeContent {
  return { scheme: { ...SCHEME }, siteVisit: { ...SITE_VISIT, dates: [...SITE_VISIT.dates] } };
}

/**
 * One source for the figures the secretariat publishes. Pages read this
 * instead of the seeded constants, so an edit in the portal reaches the
 * landing page, the application form, the receipt and the exports at once.
 */
const SchemeContext = createContext<SchemeContent>(DEFAULT_CONTENT);

export function SchemeProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ['scheme'],
    queryFn: getSchemeContent,
    placeholderData: DEFAULT_CONTENT,
  });

  return <SchemeContext.Provider value={query.data ?? DEFAULT_CONTENT}>{children}</SchemeContext.Provider>;
}

export function useScheme(): SchemeContent {
  return useContext(SchemeContext);
}
