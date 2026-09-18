import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

// Route-level splitting: Monaco (~4MB) only loads when visiting /compiler.
const Compiler = lazy(() => import('./pages/Compiler'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Docs = lazy(() => import('./pages/Docs'));
const AuthPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const RegisterPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));

function DemoGate({ children }) {
  // Until Phase 9, any demo session may view the dashboard.
  return <AuthGuard>{children}</AuthGuard>;
}

function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-sm text-muted">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<Landing />} />
              <Route path="/compiler" element={<Compiler />} />
              <Route
                path="/dashboard"
                element={
                  <DemoGate>
                    <Dashboard />
                  </DemoGate>
                }
              />
              <Route path="/docs" element={<Docs />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
