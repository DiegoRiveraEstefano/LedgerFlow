import { create } from 'zustand';
import { PaymentGateway, TransactionStatus, MovementStatus, DiscrepancyReason } from '@ledgerflow/types';

export type DashboardTab = 'transactions' | 'reconciliation' | 'invoices' | 'customers';

interface FilterState {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;

  // Transactions filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  gatewayFilter: PaymentGateway | 'ALL';
  setGatewayFilter: (gw: PaymentGateway | 'ALL') => void;
  statusFilter: TransactionStatus | 'ALL';
  setStatusFilter: (status: TransactionStatus | 'ALL') => void;

  // Reconciliation filters
  selectedJobId: string | null;
  setSelectedJobId: (jobId: string | null) => void;
  movementStatusFilter: MovementStatus | 'ALL';
  setMovementStatusFilter: (status: MovementStatus | 'ALL') => void;
  discrepancyReasonFilter: DiscrepancyReason | 'ALL';
  setDiscrepancyReasonFilter: (reason: DiscrepancyReason | 'ALL') => void;

  // Modal UI state
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isManualMatchModalOpen: boolean;
  setIsManualMatchModalOpen: (open: boolean) => void;
  selectedMovementForMatch: any | null;
  setSelectedMovementForMatch: (movement: any | null) => void;

  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activeTab: 'reconciliation',
  setActiveTab: (activeTab) => set({ activeTab }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  gatewayFilter: 'ALL',
  setGatewayFilter: (gatewayFilter) => set({ gatewayFilter }),
  statusFilter: 'ALL',
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  selectedJobId: null,
  setSelectedJobId: (selectedJobId) => set({ selectedJobId }),
  movementStatusFilter: 'ALL',
  setMovementStatusFilter: (movementStatusFilter) => set({ movementStatusFilter }),
  discrepancyReasonFilter: 'ALL',
  setDiscrepancyReasonFilter: (discrepancyReasonFilter) => set({ discrepancyReasonFilter }),

  isUploadModalOpen: false,
  setIsUploadModalOpen: (isUploadModalOpen) => set({ isUploadModalOpen }),
  isManualMatchModalOpen: false,
  setIsManualMatchModalOpen: (isManualMatchModalOpen) => set({ isManualMatchModalOpen }),
  selectedMovementForMatch: null,
  setSelectedMovementForMatch: (selectedMovementForMatch) => set({ selectedMovementForMatch }),

  resetFilters: () =>
    set({
      searchQuery: '',
      gatewayFilter: 'ALL',
      statusFilter: 'ALL',
      movementStatusFilter: 'ALL',
      discrepancyReasonFilter: 'ALL',
    }),
}));
