import { useState } from 'react';
import { motion } from 'motion/react';
import { Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useSharedState } from '../contexts/SharedStateContext';
import { authService } from '../services/auth.service';
import {
  Building2,
  Users,
  Shield,
  Zap,
  LogOut,
  Bell,
} from 'lucide-react';

import { translations } from '../translations';
import SuperAdminManagement from './SuperAdminManagement';

/**
 * Dedicated full-screen layout for SuperAdmin role.
 * Top navigation with Business / Business Users tabs. No sidebar.
 */
export default function SuperAdminLayout() {
  const { t, language, setLanguage } = useI18n();
  const { currentUser } = useSharedState();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'business' | 'users'>('business');

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-200 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-200 rounded-full blur-3xl" />
      </div>

      {/* ─── Top Navigation ─── */}
      <header className="h-16 backdrop-blur-xl bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="h-full max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-gray-800 font-semibold text-sm leading-tight">MES Pro</h1>
                <p className="text-[11px] text-gray-400 leading-tight">Super Admin</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200" />

            {/* Tabs */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('business')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'business'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Business
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Business Users
              </button>
            </nav>
          </div>

          {/* Right: Language + Notifications + User + Logout */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  language === 'en'
                    ? 'bg-white text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  language === 'ta'
                    ? 'bg-white text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </motion.button>

            <div className="h-8 w-px bg-gray-200" />

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-700 font-semibold">{currentUser?.name || 'Super Admin'}</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <p className="text-xs text-gray-500">{currentUser?.role || 'SuperAdmin'}</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {(currentUser?.name || 'SA').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-all text-sm font-medium"
              title={t('logout')}
            >
              <LogOut className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="flex-1 pt-20 pb-8 relative">
        <div className="max-w-[1600px] mx-auto px-6">
          <SuperAdminManagement activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
