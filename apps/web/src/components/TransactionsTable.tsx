import React from 'react';
import { Layers, CheckCircle2, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useTransactions } from '../hooks/useTransactions';
import { useFilterStore } from '../store/useFilterStore';

export const TransactionsTable: React.FC = () => {
  const { gatewayFilter, statusFilter, searchQuery } = useFilterStore();

  const { data: response, isLoading } = useTransactions({
    gateway: gatewayFilter,
    status: statusFilter,
    limit: 50,
  });

  const rawTransactions = response?.data || [];
  const transactions = rawTransactions.filter((tx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.externalReferenceId.toLowerCase().includes(q) ||
      (tx.customer?.name && tx.customer.name.toLowerCase().includes(q)) ||
      (tx.invoice?.invoiceNumber && tx.invoice.invoiceNumber.toLowerCase().includes(q))
    );
  });

  const getGatewayBadge = (gateway: string) => {
    switch (gateway) {
      case 'TRANSBANK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            TRANSBANK Webpay
          </span>
        );
      case 'STRIPE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            STRIPE
          </span>
        );
      case 'MERCADOPAGO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            MERCADO PAGO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300">
            {gateway}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <div>
            <h4 className="font-semibold text-white text-sm">Registro Transaccional & Facturación (ACID)</h4>
            <p className="text-xs text-slate-400">
              Operaciones de cobro atómico con factura y saldo cliente sincronizados
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {transactions.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-mono text-[11px]">
            <tr>
              <th className="py-3 px-4">Ref. Externa</th>
              <th className="py-3 px-4">Cliente B2B</th>
              <th className="py-3 px-4">Pasarela</th>
              <th className="py-3 px-4">Factura Asociada</th>
              <th className="py-3 px-4">Fecha Transacción</th>
              <th className="py-3 px-4 text-right">Monto Total</th>
              <th className="py-3 px-4 text-center">Estado ACID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  Cargando transacciones contables...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  No se encontraron transacciones registradas.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {tx.externalReferenceId}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-200">
                    <div className="font-medium text-slate-100">{tx.customer?.name || 'Cliente'}</div>
                    <div className="text-[11px] text-slate-400">{tx.customer?.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {getGatewayBadge(tx.gateway)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">
                    {tx.invoice ? (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <FileText className="h-3 w-3 text-slate-400" />
                        {tx.invoice.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-slate-500">Sin Factura</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-sans">
                    {formatDate(tx.processedAt || tx.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                    {formatCurrency(tx.amount, tx.currency)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                      <CheckCircle2 className="h-3 w-3" />
                      PROCESSED
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
