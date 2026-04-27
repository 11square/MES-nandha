import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Package, Loader2 } from 'lucide-react';
import { authService } from '../services/auth.service';
import { validateFields, FieldError, type ValidationErrors } from '../lib/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  // Where to redirect after login (defaults to /dashboard)
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validateFields({ email, password }, {
      email: { required: true, email: true },
      password: { required: true, min: 1 },
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      const res = await authService.login(email, password);
      // SuperAdmin gets a completely separate layout
      const role = res?.user?.role?.toLowerCase?.() || res?.user?.role_info?.name?.toLowerCase?.() || '';
      if (role === 'superadmin') {
        navigate('/super-admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-blue-300/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] bg-indigo-300/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }} />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2.4s' }} />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo & title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-xl opacity-50" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 ring-1 ring-white/20">
                <Package className="w-10 h-10 text-white drop-shadow" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-gray-600">Sign in to your MES workspace to continue</p>
        </div>

        {/* Glass card */}
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-2xl shadow-blue-900/10 ring-1 ring-black/5">
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                className={`w-full h-12 px-4 bg-white/70 border ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'} rounded-lg text-sm text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                className={`w-full h-12 px-4 bg-white/70 border ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'} rounded-lg text-sm text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-600">
          <a href="#" className="hover:text-blue-600 transition-colors">Help</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
        </div>
      </div>
    </div>
  );
}
