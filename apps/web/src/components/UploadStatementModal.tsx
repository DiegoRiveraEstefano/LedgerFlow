import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useFilterStore } from '../store/useFilterStore';
import { useUploadStatementMutation, useUploadBatchMutation } from '../hooks/useReconciliation';

export const UploadStatementModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen } = useFilterStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { mutateAsync: uploadFile, isPending: isUploadingFile } = useUploadStatementMutation();
  const { mutateAsync: uploadBatch, isPending: isUploadingBatch } = useUploadBatchMutation();

  const isPending = isUploadingFile || isUploadingBatch;

  if (!isUploadModalOpen) return null;

  const handleClose = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadFileSubmit = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo CSV o JSON');
      return;
    }

    try {
      await uploadFile(selectedFile);
      handleClose();
    } catch (e: any) {
      alert(`Error al encolar cartola: ${e.message}`);
    }
  };

  // One-click demo batch generator: generates realistic bank movements with discrepancies
  const handleSimulateBatch = async () => {
    const sampleBatch = [
      {
        externalReferenceId: 'TBK-2026-0001',
        amount: 250000,
        movementDate: new Date().toISOString(),
        description: 'ABONO TRANSBANK POS-04',
      },
      {
        externalReferenceId: 'STRIPE-CH-9942',
        amount: 450000,
        movementDate: new Date().toISOString(),
        description: 'STRIPE PAYOUT LIQUIDATION',
      },
      {
        externalReferenceId: 'MP-ORDER-4411',
        amount: 89900,
        movementDate: new Date().toISOString(),
        description: 'MERCADO PAGO LIQUIDACION',
      },
      {
        externalReferenceId: 'TBK-DESCALCE-01',
        amount: 155000,
        movementDate: new Date().toISOString(),
        description: 'TRANSFERENCIA BANCO ESTADO DESCONOCIDA',
      },
      {
        externalReferenceId: 'TBK-2026-0001',
        amount: 240000, // Amount mismatch intentionally
        movementDate: new Date().toISOString(),
        description: 'ABONO PARCIAL TRANSBANK',
      },
    ];

    try {
      await uploadBatch({
        fileName: `cartola_simulada_${Date.now()}.csv`,
        records: sampleBatch,
      });
      handleClose();
    } catch (e: any) {
      alert(`Error en lote de prueba: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Subir Cartola o Liquidación</h3>
              <p className="text-xs text-slate-400">Encolado asíncrono con BullMQ & Redis</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Drag and Drop Area */}
        <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center space-y-3 bg-slate-950/40 transition-colors">
          <div className="h-10 w-10 mx-auto rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium">
              {selectedFile ? selectedFile.name : 'Arrastra un archivo CSV o JSON aquí'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Formato: Ref. externa, Monto, Fecha, Glosa</p>
          </div>
          <label className="inline-block cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors">
            Examinar Archivo
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Quick Demo Generation Option */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-xs font-semibold text-white">¿Probar sin archivo?</p>
              <p className="text-[11px] text-indigo-300">Genera 5 movimientos con descalces de prueba</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSimulateBatch}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0"
          >
            Simular Cartola
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleUploadFileSubmit}
            disabled={isPending || !selectedFile}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Encolando a BullMQ...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Encolar Archivo (202 Accepted)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
