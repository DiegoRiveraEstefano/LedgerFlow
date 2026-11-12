import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  Wrench,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useReconciliationJobs, useReconciliationMovements, BankMovementItem } from '../hooks/useReconciliation';
import { useFilterStore } from '../store/useFilterStore';

export const ReconciliationView: React.FC = () => {
  const {
    selectedJobId,
    setSelectedJobId,
    movementStatusFilter,
    discrepancyReasonFilter,
    searchQuery,
    setIsManualMatchModalOpen,
    setSelectedMovementForMatch,
  } = useFilterStore();

  const { data: jobsResponse, isLoading: isLoadingJobs } = useReconciliationJobs();
  const jobs = jobsResponse?.data || [];

  // Default to the first job if none selected
  const activeJobId = selectedJobId || (jobs.length > 0 ? jobs[0].id : null);

  const { data: movementsResponse, isLoading: isLoadingMovements } = useReconciliationMovements(
    activeJobId,
    {
      status: movementStatusFilter,
      discrepancyReason: discrepancyReasonFilter,
      limit: 50,
    },
  );

  const rawMovements = movementsResponse?.data || [];
  const movements = rawMovements.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.externalReferenceId.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  });

  const getDiscrepancyBadge = (movement: BankMovementItem) => {
    if (movement.status === 'RECONCILED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Conciliado (Match)
        </span>
      );
    }

    switch (movement.discrepancyReason) {
      case 'AMOUNT_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="h-3 w-3" />
            Descalce de Monto
          </span>
        );
      case 'TRANSACTION_NOT_FOUND':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HelpCircle className="h-3 w-3" />
            No Encontrada en BD
          </span>
        );
      case 'DATE_OUT_OF_BOUNDS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="h-3 w-3" />
            Fecha Desfasada (&gt;30d)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
            Pendiente
          </span>
        );
    }
  };

  const handleOpenManualMatch = (movement: BankMovementItem) => {
    setSelectedMovementForMatch(movement);
    setIsManualMatchModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Reconciliation Jobs (Cartolas Ingestadas) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Cartolas Ingestadas (Worker BullMQ)</h3>
          </div>
          <span className="text-xs text-slate-400">Selecciona una cartola para auditar</span>
        </div>

        {isLoadingJobs ? (
          <div className="p-8 text-center text-xs text-slate-500">Cargando estado de jobs...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobs.map((job) => {
              const isSelected = job.id === activeJobId;
              const isProcessing = job.status === 'PROCESSING' || job.status === 'QUEUED';
              const progress =
                job.totalRecords > 0
                  ? Math.round((job.processedRecords / job.totalRecords) * 100)
                  : 0;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-emerald-500/80 bg-slate-900/90 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/40'
                      : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate max-w-[200px]" title={job.fileName}>
                      {job.fileName}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isProcessing
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Progress bar if processing */}
                  {isProcessing && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 my-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center pt-2 border-t border-slate-800/60 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Total</p>
                      <p className="font-semibold text-slate-200">{job.totalRecords}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-400">Calzados</p>
                      <p className="font-semibold text-emerald-400">{job.matchedRecords}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-400">Descalces</p>
                      <p className="font-semibold text-amber-400">{job.discrepancyRecords}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Movements Table / Auditor */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-white text-sm">Auditor de Movimientos & Discrepancias</h4>
            <p className="text-xs text-slate-400">
              Contraste de referencias bancarias vs transacciones registradas
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {movements.length} movimientos listados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Ref. Externa</th>
                <th className="py-3 px-4">Fecha Movimiento</th>
                <th className="py-3 px-4">Descripción Cartola</th>
                <th className="py-3 px-4 text-right">Monto Bancario</th>
                <th className="py-3 px-4">Estado / Discrepancia</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Cargando movimientos de la cartola...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No se encontraron movimientos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {movement.externalReferenceId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">
                      {formatDate(movement.movementDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans max-w-xs truncate" title={movement.description || ''}>
                      {movement.description || 'Sin glosa'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                      {formatCurrency(movement.amount, movement.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getDiscrepancyBadge(movement)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      {movement.status === 'DISCREPANCY' ? (
                        <button
                          onClick={() => handleOpenManualMatch(movement)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-xs border border-slate-700 transition-colors"
                        >
                          <Wrench className="h-3 w-3" />
                          <span>Conciliar Manual</span>
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
