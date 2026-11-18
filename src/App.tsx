import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './auth/session';
import { AppShell } from './components/AppShell';
import { LoadingBlock, ToastProvider } from './components/ui';
import { Landing } from './pages/Landing';
import { Members } from './pages/Members';
import { NotFound } from './pages/NotFound';
import { Overview } from './pages/Overview';
import { ProjectDetail } from './pages/ProjectDetail';
import { Projects } from './pages/Projects';
import { Reports } from './pages/Reports';
import { SignIn } from './pages/SignIn';
import { Subscriptions } from './pages/Subscriptions';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function RequireAuth() {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/app" element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<Overview />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:projectId" element={<ProjectDetail />} />
                  <Route path="subscriptions" element={<Subscriptions />} />
                  <Route path="members" element={<Members />} />
                  <Route path="reports" element={<Reports />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
