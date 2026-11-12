import React from 'react';
import { Header } from './components/Header';
import { StatCards } from './components/StatCards';
import { FiltersBar } from './components/FiltersBar';
import { ReconciliationView } from './components/ReconciliationView';
import { TransactionsTable } from './components/TransactionsTable';
import { ManualMatchModal } from './components/ManualMatchModal';
import { UploadStatementModal } from './components/UploadStatementModal';
import { useFilterStore } from './store/useFilterStore';

export default function App(): React.JSX.Element {
  const { activeTab } = useFilterStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sticky Header with Tenant & Role Switcher */}
      <Header />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Financial & Queue KPI Cards */}
        <StatCards />

        {/* Global Filter Bar */}
        <FiltersBar />

        {/* Tab Content Display */}
        {activeTab === 'reconciliation' && <ReconciliationView />}
        {activeTab === 'transactions' && <TransactionsTable />}
      </main>

      {/* Interactive Modals */}
      <ManualMatchModal />
      <UploadStatementModal />

      {/* Engineering Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 LedgerFlow — Mini-Fintech SaaS Multi-Tenant Engine</p>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>NestJS + OpenAPI</span>
            <span>•</span>
            <span>Prisma ACID</span>
            <span>•</span>
            <span>BullMQ + Redis</span>
            <span>•</span>
            <span>TanStack Query v5</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
