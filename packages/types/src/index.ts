// ==============================================================================
// Domain Roles & Permissions
// ==============================================================================
export const UserRole = {
  ADMIN: 'ADMIN',
  FINANCE_OPERATOR: 'FINANCE_OPERATOR',
  AUDITOR: 'AUDITOR',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ==============================================================================
// Payment & Gateway Enums
// ==============================================================================
export const PaymentGateway = {
  STRIPE: 'STRIPE',
  TRANSBANK: 'TRANSBANK',
  MERCADOPAGO: 'MERCADOPAGO',
  MANUAL: 'MANUAL',
} as const;
export type PaymentGateway = (typeof PaymentGateway)[keyof typeof PaymentGateway];

export const TransactionStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  VOIDED: 'VOIDED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

// ==============================================================================
// Reconciliation Enums
// ==============================================================================
export const ReconciliationJobStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type ReconciliationJobStatus =
  (typeof ReconciliationJobStatus)[keyof typeof ReconciliationJobStatus];

export const MovementStatus = {
  PENDING: 'PENDING',
  RECONCILED: 'RECONCILED',
  DISCREPANCY: 'DISCREPANCY',
} as const;
export type MovementStatus = (typeof MovementStatus)[keyof typeof MovementStatus];

export const DiscrepancyReason = {
  NONE: 'NONE',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  DATE_OUT_OF_BOUNDS: 'DATE_OUT_OF_BOUNDS',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  DUPLICATE_EXTERNAL_REF: 'DUPLICATE_EXTERNAL_REF',
  CURRENCY_MISMATCH: 'CURRENCY_MISMATCH',
} as const;
export type DiscrepancyReason =
  (typeof DiscrepancyReason)[keyof typeof DiscrepancyReason];

// ==============================================================================
// JWT & Session Types
// ==============================================================================
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  firstName: string;
  lastName: string;
}

// ==============================================================================
// Standard API Envelope Interfaces
// ==============================================================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}
