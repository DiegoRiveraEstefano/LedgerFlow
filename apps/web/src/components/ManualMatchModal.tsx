import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useFilterStore } from '../store/useFilterStore';
import { useTransactions } from '../hooks/useTransactions';
import { useManualMatchMutation } from '../hooks/useReconciliation';

const manualMatchSchema = z.object({
  transactionId: z.string().min(1, 'Debes seleccionar o ingresar una transacción'),
});

type ManualMatchFormValues = z.infer<typeof manualMatchSchema>;

export const ManualMatchModal: React.FC = () => {
  const {
    isManualMatchModalOpen,
    setIsManualMatchModalOpen,
    selectedMovementForMatch,
    setSelectedMovementForMatch,
  } = useFilterStore();

  const { data: txResponse } = useTransactions({ limit: 20 });
  const transactions = txResponse?.data || [];

  const { mutateAsync: manualMatch, isPending } = useManualMatchMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualMatchFormValues>({
    resolver: zodResolver(manualMatchSchema),
  });

  if (!isManualMatchModalOpen || !selectedMovementForMatch) {
    return null;
  }

  const handleClose = () => {
    setIsManualMatchModalOpen(false);
    setSelectedMovementForMatch(null);
    reset();
  };

  const onSubmit = async (values: ManualMatchFormValues) => {
    try {
      await manualMatch({
        movementId: selectedMovementForMatch.id,
        transactionId: values.transactionId,
      });
      handleClose();
    } catch (e: any) {
      alert(`Error al forzar conciliación manual: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Forzar Conciliación Manual</h3>
              <p className="text-xs text-slate-400">Auditoría y resolución de descalce</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected Movement Summary */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>Ref. Cartola Bancaria:</span>
            <span className="font-mono font-semibold text-white">
              {selectedMovementForMatch.externalReferenceId}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Monto en Banco:</span>
            <span className="font-mono font-bold text-slate-100">
              {formatCurrency(selectedMovementForMatch.amount, selectedMovementForMatch.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Fecha Cartola:</span>
            <span>{formatDate(selectedMovementForMatch.movementDate)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Motivo Descalce:</span>
            <span className="font-mono font-medium text-amber-400">
              {selectedMovementForMatch.discrepancyReason}
            </span>
          </div>
        </div>

        {/* Form with React Hook Form + Zod */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Seleccionar Transacción Registrada para Asociar:
            </label>
            <select
              {...register('transactionId')}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Elige una transacción --</option>
              {transactions.map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {tx.externalReferenceId} — {tx.customer?.name} ({formatCurrency(tx.amount)})
                </option>
              ))}
            </select>
            {errors.transactionId && (
              <p className="text-xs text-rose-400 mt-1">{errors.transactionId.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Conciliando...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Aprobar Conciliación Manual</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
