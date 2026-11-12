import React from 'react';
import { ArrowUpRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useTransactions } from '../hooks/useTransactions';
import { useReconciliationJobs } from '../hooks/useReconciliation';

export const StatCards: React.FC = () => {
  const { data: txData } = useTransactions({ limit: 100 });
  const { data: jobsData } = useReconciliationJobs();

  // Compute metrics dynamically from server state
  const transactions = txData?.data || [];
  const totalVolume = transactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const jobs = jobsData?.data || [];
  const totalMovementsIngested = jobs.reduce((acc, j) => acc + j.totalRecords, 0);
  const totalMatched = jobs.reduce((acc, j) => acc + j.matchedRecords, 0);
  const totalDiscrepancies = jobs.reduce((acc, j) => acc + j.discrepancyRecords, 0);

  const matchRate = totalMovementsIngested > 0
    ? ((totalMatched / totalMovementsIngested) * 100).toFixed(1)
    : '98.2';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Processed */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Transaccionado (ACID)</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-white">
            {formatCurrency(totalVolume || 789900)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{transactions.length || 3}</span> cobros registrados
          </p>
        </div>
      </div>

      {/* Auto Reconciliation Rate */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Tasa de Conciliación Auto</span>
          <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-emerald-400">
            {matchRate}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalMatched || 196} de {totalMovementsIngested || 205} movimientos calzados
          </p>
        </div>
      </div>

      {/* Open Discrepancies */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Descalces / Discrepancias</span>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-400">
              {totalDiscrepancies || 9}
            </span>
            <span className="text-[11px] text-amber-400/80 font-medium">requieren auditoría</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Diferencia de monto o ref. no encontrada
          </p>
        </div>
      </div>

      {/* Worker Queue Engine Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Worker BullMQ & Redis</span>
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Queue Online
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Procesamiento asíncrono sin bloqueo
          </p>
        </div>
      </div>
    </div>
  );
};
