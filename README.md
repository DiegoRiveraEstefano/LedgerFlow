# LedgerFlow ⚡

> **Full-stack Payment Reconciliation & Automated Billing Engine built with NestJS, TypeScript, PostgreSQL, and React.**

[![CI Pipeline](https://github.com/diego/LedgerFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/diego/LedgerFlow/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-v22+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v12+-orange.svg)](https://pnpm.io/)

---

## 📌 Contexto de Negocio & Problema

**LedgerFlow** es una plataforma SaaS B2B multi-tenant diseñada para resolver la fricción operativa y financiera entre pasarelas de pago (Transbank, Stripe, Mercado Pago), cobros transaccionales masivos y emisión de facturación electrónica.

### ¿Qué problemas resuelve?
1. **Descalce de Cartolas Bancarias vs Pasarelas:** Las empresas procesan miles de cobros diarios que no siempre coinciden exactamente con los depósitos bancarios debido a comisiones ocultas, desfases de liquidación (T+1 / T+2) o rechazos tardíos.
2. **Inconsistencias Contables y Registros Huérfanos:** Fallos en la red o desconexiones pueden generar transacciones aprobadas sin factura o saldos de clientes desactualizados sin garantías transaccionales ACID.
3. **Fugas de Datos entre Organizaciones:** Requerimiento imperativo de segregación estricta de datos (*Multi-Tenancy*) a nivel de base de datos y transporte HTTP mediante RBAC.

---

## 🏛️ Arquitectura del Sistema

### Monorepo Workspaces (`pnpm`)

```mermaid
graph TD
    Root[LedgerFlow Monorepo]
    Root --> Apps[apps/]
    Root --> Packages[packages/]

    Apps --> API[apps/api: NestJS + Prisma + BullMQ]
    Apps --> Web[apps/web: React + Vite + Tailwind + TanStack Query]
    Packages --> Types[packages/types: Shared Contracts & Domain Models]

    API --> Types
    Web --> Types
    API -.-> Swagger[OpenAPI / Swagger at /api/docs]
    Swagger -.-> Web
```

### Flujo de Conciliación en Segundo Plano (Worker BullMQ + Redis)

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador Financiero
    participant Web as apps/web (React)
    participant API as apps/api (NestJS)
    participant Queue as Redis Queue (BullMQ)
    participant Worker as Reconciliation Worker
    participant DB as PostgreSQL (Prisma)

    Operador->>Web: Sube cartola (CSV / JSON)
    Web->>API: POST /api/v1/reconciliation/upload
    API->>DB: Crea registro ReconciliationJob (status: QUEUED)
    API->>Queue: Encola Job con tenant_id y archivo
    API-->>Web: Responde 202 Accepted (job_id)
    Web-->>Operador: Muestra barra de progreso y estado en polling
    Queue->>Worker: Procesa lote de movimientos
    Worker->>DB: Coteja referencia externa y monto vs Transactions
    alt Coincide monto y fecha
        Worker->>DB: Actualiza status a RECONCILED
    else Discrepancia encontrada
        Worker->>DB: Marca DISCREPANCY con motivo (AMOUNT_MISMATCH / NOT_FOUND)
    end
    Worker->>DB: Finaliza ReconciliationJob (status: COMPLETED)
```

---

## 🗄️ Modelo Relacional de Datos (PostgreSQL)

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

## 🚀 Inicio Rápido en Local

### Prerrequisitos
* **Node.js**: `>= 20.x` (probado en Node 22+)
* **pnpm**: `>= 9.x`
* **Docker & Docker Compose**

### 1. Clonar el repositorio y configurar variables de entorno

```bash
git clone https://github.com/diego/LedgerFlow.git
cd LedgerFlow
cp .env.example .env
```

### 2. Levantar la infraestructura (PostgreSQL 16 & Redis 7)

```bash
pnpm docker:up
```

Verificar que los contenedores estén saludables:
```bash
docker compose ps
```

### 3. Instalar dependencias e inicializar Prisma

```bash
pnpm install
pnpm db:generate
```

### 4. Ejecutar la base de datos y migraciones iniciales

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Iniciar los entornos de desarrollo

* Iniciar tanto la API como la interfaz web en paralelo:
```bash
pnpm dev
```

* O individualmente:
```bash
pnpm dev:api    # NestJS API en http://localhost:4000
pnpm dev:web    # React Vite en http://localhost:5173
```

---

## 📖 Documentación Interactiva de la API

Con la API en ejecución, accede a la documentación OpenAPI/Swagger en:
👉 **[http://localhost:4000/api/docs](http://localhost:4000/api/docs)**

Permite explorar los esquemas DTO, probar autenticación con JWT Bearer y validar las respuestas HTTP en tiempo real.

---

## 🛡️ Seguridad y Buenas Prácticas

* **Cero `any`:** Validación de tipos estricta en TypeScript de extremo a extremo.
* **Transaccionalidad ACID:** Operaciones de cobro y emisión de factura encapsuladas en `prisma.$transaction`.
* **Multi-Tenancy Garantizado:** Decoradores `@TenantId()` y filtros obligatorios por `tenant_id` en cada consulta relacional.
* **Spec-Driven Development:** Contratos Swagger generados automáticamente para sincronización con el frontend.
