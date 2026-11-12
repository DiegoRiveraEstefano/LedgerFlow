# LedgerFlow

Multi-tenant payment reconciliation and automated billing platform built with NestJS, React, PostgreSQL, and Redis.

[![CI Pipeline](https://github.com/diego/LedgerFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/diego/LedgerFlow/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-v20+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v12+-orange.svg)](https://pnpm.io/)

---

## Overview

LedgerFlow processes transactional payments, reconciles bank statements against gateway transactions, and issues billing records with strict tenant isolation and ACID guarantees.

### Key Capabilities

- **Automated Reconciliation**: Asynchronous batch processing of bank statements via BullMQ queues and Redis.
- **ACID Invoicing**: Atomic transaction and invoice generation via Prisma transactions.
- **Multi-Tenancy**: Data segregation by `tenant_id` across database queries, HTTP guards, and authentication tokens.
- **Role-Based Access Control (RBAC)**: Role validation (`ADMIN`, `FINANCE_OPERATOR`, `AUDITOR`) via JWT strategies and decorators.

---

## System Architecture

### Workspace Structure

The project is structured as a `pnpm` monorepo:

| Path | Description | Tech Stack |
|---|---|---|
| `apps/api` | Backend API and background workers | NestJS, Prisma ORM, BullMQ, Passport JWT, Swagger |
| `apps/web` | Frontend management dashboard | React 19, Vite, Tailwind CSS, TanStack Query/Table, Zustand |
| `packages/types` | Shared contracts, DTO interfaces, and enums | TypeScript, tsup |

```mermaid
graph TD
    Root[LedgerFlow Monorepo]
    Root --> Apps[apps/]
    Root --> Packages[packages/]

    Apps --> API[apps/api: NestJS + Prisma + BullMQ]
    Apps --> Web[apps/web: React + Vite + Tailwind CSS]
    Packages --> Types[packages/types: Shared Domain Models]

    API --> Types
    Web --> Types
    API -.-> Swagger[OpenAPI / Swagger at /api/docs]
    Swagger -.-> Web
```

### Reconciliation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Finance Operator
    participant Web as Web (React)
    participant API as API (NestJS)
    participant Queue as Redis Queue (BullMQ)
    participant Worker as Reconciliation Worker
    participant DB as PostgreSQL (Prisma)

    Operator->>Web: Upload bank statement (CSV / JSON)
    Web->>API: POST /api/v1/reconciliation/upload
    API->>DB: Insert ReconciliationJob (status: QUEUED)
    API->>Queue: Enqueue job payload with tenant_id
    API-->>Web: 202 Accepted (job_id)
    Web-->>Operator: Poll status and display progress
    Queue->>Worker: Process statement movements
    Worker->>DB: Compare external reference and amount against Transactions
    alt Valid match
        Worker->>DB: Update movement to RECONCILED
    else Discrepancy found
        Worker->>DB: Flag DISCREPANCY (AMOUNT_MISMATCH / NOT_FOUND)
    end
    Worker->>DB: Mark ReconciliationJob as COMPLETED
```

---

## Data Model

```mermaid
erDiagram
    Tenant ||--o{ User : "has"
    Tenant ||--o{ Customer : "owns"
    Tenant ||--o{ Transaction : "scopes"
    Tenant ||--o{ Invoice : "issues"
    Tenant ||--o{ ReconciliationJob : "tracks"
    Tenant ||--o{ BankMovement : "reconciles"

    Customer ||--o{ Transaction : "pays"
    Customer ||--o{ Invoice : "billed"
    Transaction ||--|| Invoice : "generates (1:1 ACID)"
    ReconciliationJob ||--o{ BankMovement : "processes"
    BankMovement }o--o| Transaction : "matches"

    Tenant {
        uuid id PK
        string name
        string slug UK
        boolean is_active
        timestamp created_at
    }

    User {
        uuid id PK
        uuid tenant_id FK
        string email
        string password_hash
        enum role "ADMIN | FINANCE_OPERATOR | AUDITOR"
        boolean is_active
    }

    Customer {
        uuid id PK
        uuid tenant_id FK
        string external_customer_id
        string name
        decimal balance
        string currency
    }

    Transaction {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        decimal amount
        enum status "PENDING | PROCESSED | FAILED | REFUNDED"
        enum gateway "STRIPE | TRANSBANK | MERCADOPAGO | MANUAL"
        string external_reference_id UK
    }

    Invoice {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        uuid transaction_id FK,UK
        string invoice_number UK
        decimal total
        enum status "DRAFT | ISSUED | PAID | VOIDED"
    }

    ReconciliationJob {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        int total_records
        int matched_records
        int discrepancy_records
        enum status "QUEUED | PROCESSING | COMPLETED | FAILED"
    }

    BankMovement {
        uuid id PK
        uuid tenant_id FK
        uuid reconciliation_job_id FK
        string external_reference_id
        decimal amount
        enum status "PENDING | RECONCILED | DISCREPANCY"
        enum discrepancy_reason
        uuid matched_transaction_id FK
    }
```

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 20.x`
- **pnpm**: `>= 9.x`
- **Docker** and **Docker Compose**

### Installation and Setup

1. **Clone the repository and configure environment variables:**
   ```bash
   git clone https://github.com/diego/LedgerFlow.git
   cd LedgerFlow
   cp .env.example .env
   ```

2. **Start infrastructure services (PostgreSQL 16 & Redis 7):**
   ```bash
   pnpm docker:up
   ```

3. **Install dependencies and generate Prisma client:**
   ```bash
   pnpm install
   pnpm db:generate
   ```

4. **Run database migrations and initial seed:**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start development servers:**
   ```bash
   pnpm dev
   ```

   Individual services can also be run separately:
   - Backend API (`http://localhost:4000`): `pnpm dev:api`
   - Frontend application (`http://localhost:5173`): `pnpm dev:web`

---

## API Documentation

When the API server is running, the interactive OpenAPI/Swagger interface is accessible at:

**[http://localhost:4000/api/docs](http://localhost:4000/api/docs)**

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts all applications in parallel |
| `pnpm dev:api` | Starts the NestJS API in watch mode |
| `pnpm dev:web` | Starts the Vite development server |
| `pnpm build` | Builds all packages and applications |
| `pnpm test` | Runs test suites across the monorepo |
| `pnpm docker:up` | Starts PostgreSQL and Redis containers |
| `pnpm docker:down` | Stops infrastructure containers |
| `pnpm db:migrate` | Applies Prisma migrations |
| `pnpm db:generate` | Generates Prisma client types |
| `pnpm db:seed` | Seeds database with initial tenant and transaction data |
| `pnpm db:studio` | Launches Prisma Studio web interface |

---

## License

This project is licensed under the [MIT License](LICENSE).
