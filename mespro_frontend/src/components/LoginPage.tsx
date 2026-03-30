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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Google-style logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl text-gray-900 mb-2">Sign in to MES System</h1>
          <p className="text-sm text-gray-600">Manufacturing Execution & Production Management</p>
        </div>

        {/* Google-style card */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Email</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                className={`w-full h-12 px-4 bg-white border ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'} rounded-lg text-sm text-gray-900 placeholder-gray-500 hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none`}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Password</label>
              <input 
                type="password" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                className={`w-full h-12 px-4 bg-white border ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'} rounded-lg text-sm text-gray-900 placeholder-gray-500 hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none`}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors shadow-sm hover:shadow flex items-center justify-center gap-2"
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

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-600">
                Default: admin@mespro.com / admin123
              </p>
            </div>
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
