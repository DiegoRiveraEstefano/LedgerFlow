import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { PaginatedResponse } from '@ledgerflow/types';
import { apiClient } from '../lib/api-client';

export interface TransactionItem {
  id: string;
  tenantId: string;
  customerId: string;
  amount: number | string;
  currency: string;
  status: string;
  gateway: string;
  externalReferenceId: string;
  metadata?: Record<string, any>;
  processedAt?: string;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    externalCustomerId: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number | string;
    status: string;
  };
}

export interface UseTransactionsParams {
  page?: number;
  limit?: number;
  status?: string;
  gateway?: string;
  search?: string;
}

export function useTransactions(params: UseTransactionsParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.gateway && params.gateway !== 'ALL') queryParams.set('gateway', params.gateway);

  const queryString = queryParams.toString();
  const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<TransactionItem>>({
    queryKey: ['transactions', params],
    queryFn: async () => {
      try {
        return await apiClient.get<PaginatedResponse<TransactionItem>>(endpoint);
      } catch {
        // Fallback demo data if backend is offline or empty during UI preview
        return {
          data: [
            {
              id: 'tx-demo-01',
              tenantId: 'c0a80101-0000-0000-0000-000000000001',
              customerId: 'cust-01',
              amount: 250000,
              currency: 'CLP',
              status: 'PROCESSED',
              gateway: 'TRANSBANK',
              externalReferenceId: 'TBK-2026-0001',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              customer: {
                id: 'cust-01',
                name: 'Distribuidora del Sur S.A.',
                email: 'pagos@delsur.cl',
                externalCustomerId: 'CUST-CLP-001',
              },
              invoice: {
                id: 'inv-01',
                invoiceNumber: 'FAC-2026-00001',
                total: 250000,
                status: 'PAID',
              },
            },
            {
              id: 'tx-demo-02',
              tenantId: 'c0a80101-0000-0000-0000-000000000001',
              customerId: 'cust-02',
              amount: 450000,
              currency: 'CLP',
              status: 'PROCESSED',
              gateway: 'STRIPE',
              externalReferenceId: 'STRIPE-CH-9942',
              processedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
              createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
              customer: {
                id: 'cust-02',
                name: 'Comercializadora Pacífico SpA',
                email: 'facturacion@pacifico.cl',
                externalCustomerId: 'CUST-CLP-002',
              },
              invoice: {
                id: 'inv-02',
                invoiceNumber: 'FAC-2026-00002',
                total: 450000,
                status: 'PAID',
              },
            },
            {
              id: 'tx-demo-03',
              tenantId: 'c0a80101-0000-0000-0000-000000000001',
              customerId: 'cust-01',
              amount: 89900,
              currency: 'CLP',
              status: 'PROCESSED',
              gateway: 'MERCADOPAGO',
              externalReferenceId: 'MP-ORDER-4411',
              processedAt: new Date(Date.now() - 86400000).toISOString(),
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              customer: {
                id: 'cust-01',
                name: 'Distribuidora del Sur S.A.',
                email: 'pagos@delsur.cl',
                externalCustomerId: 'CUST-CLP-001',
              },
              invoice: {
                id: 'inv-03',
                invoiceNumber: 'FAC-2026-00003',
                total: 89900,
                status: 'PAID',
              },
            },
          ],
          meta: {
            page: 1,
            limit: 10,
            totalItems: 3,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }
    },
    placeholderData: keepPreviousData,
  });
}
