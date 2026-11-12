import { PrismaClient, UserRole, PaymentGateway, TransactionStatus, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LedgerFlow database seeding...');

  // 1. Create Default Organization / Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fintech-cl' },
    update: {},
    create: {
      name: 'FinTech Andes SpA',
      slug: 'fintech-cl',
      isActive: true,
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // 2. Hash Seed Password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Multi-Role Users
  const adminUser = await prisma.user.upsert({
    where: {
      uq_user_tenant_email: {
        tenantId: tenant.id,
        email: 'admin@fintech.cl',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@fintech.cl',
      passwordHash,
      firstName: 'Diego',
      lastName: 'Administrador',
      role: UserRole.ADMIN,
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: {
      uq_user_tenant_email: {
        tenantId: tenant.id,
        email: 'operator@fintech.cl',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'operator@fintech.cl',
      passwordHash,
      firstName: 'Camila',
      lastName: 'Operadora',
      role: UserRole.FINANCE_OPERATOR,
    },
  });

  const auditorUser = await prisma.user.upsert({
    where: {
      uq_user_tenant_email: {
        tenantId: tenant.id,
        email: 'auditor@fintech.cl',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'auditor@fintech.cl',
      passwordHash,
      firstName: 'Ignacio',
      lastName: 'Auditor',
      role: UserRole.AUDITOR,
    },
  });

  console.log(
    `✅ Users created: Admin (${adminUser.email}), Operator (${operatorUser.email}), Auditor (${auditorUser.email})`,
  );

  // 4. Create Customers
  const customerA = await prisma.customer.upsert({
    where: {
      uq_customer_tenant_external_id: {
        tenantId: tenant.id,
        externalCustomerId: 'CUST-CLP-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      externalCustomerId: 'CUST-CLP-001',
      name: 'Distribuidora del Sur S.A.',
      email: 'pagos@delsur.cl',
      balance: 1500000.0,
      currency: 'CLP',
    },
  });

  const customerB = await prisma.customer.upsert({
    where: {
      uq_customer_tenant_external_id: {
        tenantId: tenant.id,
        externalCustomerId: 'CUST-CLP-002',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      externalCustomerId: 'CUST-CLP-002',
      name: 'Comercializadora Pacífico SpA',
      email: 'facturacion@pacifico.cl',
      balance: 450000.0,
      currency: 'CLP',
    },
  });

  console.log(`✅ Customers created: ${customerA.name}, ${customerB.name}`);

  // 5. Create an initial atomic Transaction & Invoice
  const existingTx = await prisma.transaction.findFirst({
    where: { tenantId: tenant.id, externalReferenceId: 'TBK-2026-0001' },
  });

  if (!existingTx) {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          tenantId: tenant.id,
          customerId: customerA.id,
          amount: 250000.0,
          currency: 'CLP',
          status: TransactionStatus.PROCESSED,
          gateway: PaymentGateway.TRANSBANK,
          externalReferenceId: 'TBK-2026-0001',
          metadata: { authorizationCode: 'AUTH9841', terminal: 'POS-04' },
          processedAt: new Date(),
        },
      });

      await tx.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customerA.id,
          transactionId: transaction.id,
          invoiceNumber: 'FAC-2026-00001',
          subtotal: 210084.0,
          tax: 39916.0, // 19% IVA
          total: 250000.0,
          currency: 'CLP',
          status: InvoiceStatus.PAID,
          notes: 'Pago procesado automáticamente vía Transbank Webpay',
        },
      });

      // Update customer balance atomically
      await tx.customer.update({
        where: { id: customerA.id },
        data: { balance: { increment: 250000.0 } },
      });
    });
    console.log(`✅ Seeded sample atomic Transaction & Invoice (TBK-2026-0001 / FAC-2026-00001)`);
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
