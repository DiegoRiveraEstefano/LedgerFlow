import React from 'react';
import {
  FileSpreadsheet,
  Layers,
  UploadCloud,
  Shield,
} from 'lucide-react';
import { UserRole } from '@ledgerflow/types';
import { useAuthStore } from '../store/useAuthStore';
import { useFilterStore, DashboardTab } from '../store/useFilterStore';

export const Header: React.FC = () => {
  const { user, tenant, setSession, token } = useAuthStore();
  const { activeTab, setActiveTab, setIsUploadModalOpen } = useFilterStore();

  const handleRoleChange = (role: UserRole) => {
    if (user && tenant && token) {
      setSession(token, { ...user, role }, tenant);
    }
  };

  const navItems: { tab: DashboardTab; label: string; icon: React.ReactNode }[] = [
    {
      tab: 'reconciliation',
      label: 'Auditoría & Conciliación',
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
    {
      tab: 'transactions',
      label: 'Transacciones ACID',
      icon: <Layers className="h-4 w-4" />,
    },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-900/20 border border-emerald-400/30">
                LF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">LedgerFlow</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    B2B SaaS
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Reconciliation & Automated Billing Engine
                </p>
              </div>
            </div>

            {/* Tenant Organization Pill */}
            <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs">
              <span className="text-slate-400">Org:</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 font-medium border border-slate-700/60">
                {tenant?.name || 'FinTech Andes SpA'}
              </span>
              <span className="text-slate-500 font-mono">({tenant?.slug || 'fintech-cl'})</span>
            </div>
          </div>

          {/* Role Switcher & Upload Action */}
          <div className="flex items-center gap-3">
            {/* RBAC Role Selector */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
              <Shield className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
              <span className="text-slate-400 text-[11px] font-medium mr-1">Rol:</span>
              {(['ADMIN', 'FINANCE_OPERATOR', 'AUDITOR'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                    user?.role === role
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {role === 'FINANCE_OPERATOR' ? 'OPERATOR' : role}
                </button>
              ))}
            </div>

            {/* Quick Upload Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/10 active:scale-95"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Subir Cartola</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 -mb-px">
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
