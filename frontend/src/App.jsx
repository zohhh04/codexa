import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import RootLayout from './layouts/RootLayout';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

// Route-level splitting: Monaco (~4MB) only loads with editor pages.
const Compiler = lazy(() => import('./pages/Compiler'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Practice = lazy(() => import('./pages/Practice'));
const Problems = lazy(() => import('./pages/Problems'));
const AIStudio = lazy(() => import('./pages/AIStudio'));
const Learn = lazy(() => import('./pages/Learn'));
const Docs = lazy(() => import('./pages/Docs'));
const Settings = lazy(() => import('./pages/Settings'));
const AuthPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const RegisterPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));

function Protected({ children }) {
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
              <Route
                path="/compiler"
                element={
                  <Protected>
                    <Compiler />
                  </Protected>
                }
              />
              <Route
                path="/ai"
                element={
                  <Protected>
                    <AIStudio />
                  </Protected>
                }
              />
              <Route
                path="/problems"
                element={
                  <Protected>
                    <Problems />
                  </Protected>
                }
              />
              <Route
                path="/learn"
                element={
                  <Protected>
                    <Learn />
                  </Protected>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Protected>
                    <Dashboard />
                  </Protected>
                }
              />
              <Route
                path="/practice"
                element={
                  <Protected>
                    <Practice />
                  </Protected>
                }
              />
              <Route
                path="/settings"
                element={
                  <Protected>
                    <Settings />
                  </Protected>
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
