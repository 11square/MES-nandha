import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Package, Loader2, Eye, EyeOff, ShieldCheck, Factory, BarChart3, Workflow } from 'lucide-react';
import { authService } from '../services/auth.service';
import { validateFields, FieldError, type ValidationErrors } from '../lib/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-slate-50">
      {/* ===== Left brand panel ===== */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden text-white"
           style={{ background: 'radial-gradient(circle at 20% 20%, #4f46e5 0%, transparent 55%), radial-gradient(circle at 80% 0%, #7c3aed 0%, transparent 50%), radial-gradient(circle at 50% 100%, #2563eb 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e3a8a 100%)' }}>
        {/* Animated mesh blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -right-24 w-[22rem] h-[22rem] bg-fuchsia-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/3 w-[18rem] h-[18rem] bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
        </div>
        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
             style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center ring-1 ring-white/20 shadow-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">MES Pro</div>
            <div className="text-xs text-white/60">Manufacturing Suite</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight mb-4">
            Run your factory<br />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
              like clockwork.
            </span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Production, inventory, billing & dispatch — unified in one beautifully simple workspace.
          </p>

          {/* Feature pills */}
          <div className="mt-8 grid grid-cols-1 gap-3 max-w-sm">
            {[
              { Icon: Factory, label: 'Real-time production tracking' },
              { Icon: BarChart3, label: 'Live KPIs & smart dashboards' },
              { Icon: Workflow, label: 'End-to-end order workflow' },
              { Icon: ShieldCheck, label: 'Role-based access & audit trail' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 hover:bg-white/[0.1] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-white/85">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between text-xs text-white/50">
          <span>© {new Date().getFullYear()} Ramcoo Industries</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
        </div>
      </div>

      {/* ===== Right form panel ===== */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-white via-slate-50 to-blue-50/50">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">MES Pro</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-600">Sign in to your MES workspace to continue.</p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span className="font-medium">Sign-in failed:</span> <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                className={`w-full h-12 px-4 bg-white border ${fieldErrors.email ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-300'} rounded-xl text-sm text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                  className={`w-full h-12 px-4 pr-12 bg-white border ${fieldErrors.password ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-300'} rounded-xl text-sm text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
            </div>

            <label className="flex items-center gap-2 select-none cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-600">Keep me signed in</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Help</a>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
