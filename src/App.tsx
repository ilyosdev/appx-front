import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, NavigationProgress } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BillingModals } from './components/billing';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectWizard = lazy(() => import('./pages/ProjectWizard'));
const Canvas = lazy(() => import('./pages/ProjectPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Admin = lazy(() => import('./pages/Admin'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Gallery = lazy(() => import('./pages/Gallery'));
const CodeStudio = lazy(() => import('./pages/CodeStudio'));
const PublicProject = lazy(() => import('./pages/PublicProject'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute - data is fresh for 1 min
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-surface-800 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary-500 rounded-full animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-white font-medium">Loading</p>
          <p className="text-surface-500 text-sm">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
            <BrowserRouter>
              <NavigationProgress />
              <BillingModals />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/p/:projectId" element={<PublicProject />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/project/new" element={<ProjectWizard />} />
                    <Route path="/project/:projectId/canvas" element={<Canvas />} />
                    <Route path="/project/:projectId/code" element={<CodeStudio />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<Admin />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
