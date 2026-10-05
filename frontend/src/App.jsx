import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import RootLayout from './layouts/RootLayout';
import Fun from './pages/Fun';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Register from './pages/Register';

const Compiler = lazy(() => import('./pages/Compiler'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="grid min-h-[50vh] place-items-center text-sm text-muted">
            Loading…
          </div>
        }
      >
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Landing />} />
            <Route path="/fun" element={<Fun />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/studio"
              element={
                <AuthGuard>
                  <Compiler />
                </AuthGuard>
              }
            />
            <Route
              path="/compiler"
              element={
                <AuthGuard>
                  <Compiler />
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
