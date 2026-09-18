import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="bg-gradient-to-r from-teal-300 to-violet-400 bg-clip-text text-6xl font-extrabold text-transparent light:from-teal-600 light:to-violet-600">404</p>
      <h1 className="mt-2 text-xl font-bold text-ink">Page not found</h1>
      <p className="mt-1 text-sm text-muted">That route does not exist yet.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link to="/"><Button variant="secondary">Home</Button></Link>
        <Link to="/compiler"><Button>Open compiler</Button></Link>
      </div>
    </div>
  );
}
