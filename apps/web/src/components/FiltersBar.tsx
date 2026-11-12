import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { MovementStatus, DiscrepancyReason, PaymentGateway, TransactionStatus } from '@ledgerflow/types';
import { useFilterStore } from '../store/useFilterStore';

export const FiltersBar: React.FC = () => {
  const {
    activeTab,
    searchQuery,
    setSearchQuery,
    gatewayFilter,
    setGatewayFilter,
    statusFilter,
    setStatusFilter,
    movementStatusFilter,
    setMovementStatusFilter,
    discrepancyReasonFilter,
    setDiscrepancyReasonFilter,
    resetFilters,
  } = useFilterStore();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'transactions'
              ? 'Buscar por referencia externa, cliente o factura...'
              : 'Filtrar por referencia bancaria o descripción...'
          }
          className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Select Controls depending on Active Tab */}
      <div className="flex flex-wrap items-center gap-2">
        {activeTab === 'reconciliation' && (
          <>
            {/* Status Filter */}
            <select
              value={movementStatusFilter}
              onChange={(e) => setMovementStatusFilter(e.target.value as MovementStatus | 'ALL')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value={MovementStatus.RECONCILED}>✅ Conciliado (Reconciled)</option>
              <option value={MovementStatus.DISCREPANCY}>⚠️ Discrepancia (Descalce)</option>
              <option value={MovementStatus.PENDING}>⏳ Pendiente</option>
            </select>

            {/* Discrepancy Reason Filter */}
            <select
              value={discrepancyReasonFilter}
              onChange={(e) => setDiscrepancyReasonFilter(e.target.value as DiscrepancyReason | 'ALL')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Cualquier Motivo</option>
              <option value={DiscrepancyReason.AMOUNT_MISMATCH}>Diferencia de Monto</option>
              <option value={DiscrepancyReason.TRANSACTION_NOT_FOUND}>Transacción No Encontrada</option>
              <option value={DiscrepancyReason.DATE_OUT_OF_BOUNDS}>Fecha Desfasada (&gt; 30d)</option>
            </select>
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            {/* Gateway Filter */}
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value as PaymentGateway | 'ALL')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Todas las Pasarelas</option>
              <option value={PaymentGateway.TRANSBANK}>Transbank Webpay</option>
              <option value={PaymentGateway.STRIPE}>Stripe</option>
              <option value={PaymentGateway.MERCADOPAGO}>Mercado Pago</option>
              <option value={PaymentGateway.MANUAL}>Transferencia Manual</option>
            </select>

            {/* Transaction Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | 'ALL')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value={TransactionStatus.PROCESSED}>PROCESSED (Exitoso)</option>
              <option value={TransactionStatus.PENDING}>PENDING</option>
              <option value={TransactionStatus.FAILED}>FAILED</option>
            </select>
          </>
        )}

        {/* Reset Button */}
        <button
          onClick={resetFilters}
          title="Restablecer filtros"
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
