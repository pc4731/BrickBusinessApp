/**
 * Demo seed. Idempotent where practical (upsert by natural keys).
 * Seeds: 1 organisation, 3 users (owner/manager/accountant), settings,
 * sample translations, customers + addresses + negotiated prices, factories +
 * price history, own trucks, drivers, a hired truck, and a few stock batches.
 *
 * Orders + journal entries are intentionally NOT seeded here — they are created
 * through the finance engine (Phase 3) so the double-entry stays authoritative.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient, BrickClass, UserRole, Language } from '@prisma/client';

const prisma = new PrismaClient();

const rupees = (r: number) => Math.round(r * 100); // ₹ → paise
const ratePerThousand = (r: number) => Math.round((r / 1000) * 100); // ₹/1000 → paise/brick

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Shree Balaji Brick Suppliers',
      legalName: 'Shree Balaji Brick Suppliers Pvt Ltd',
      address: 'Plot 14, Industrial Area',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302013',
      phone: '9876500000',
      email: 'office@balajibricks.example',
      gstin: '08AABCS1234F1Z5',
      pan: 'AABCS1234F',
      settings: {
        gstEnabled: true,
        defaultGstRate: 1200,
        lowStockThresholdBricks: 5000,
        brickLossPolicy: 'SELLER_BEARS',
        ownTruckCostModel: { type: 'PER_TRIP', amountPaise: rupees(1500) },
        defaultLanguage: 'HINGLISH',
        orderNumberPrefix: 'ORD',
      },
    },
  });

  const users: Array<{ email: string; name: string; role: UserRole }> = [
    { email: 'owner@balajibricks.example', name: 'Ramesh Agarwal', role: UserRole.OWNER },
    { email: 'manager@balajibricks.example', name: 'Suresh Kumar', role: UserRole.MANAGER },
    { email: 'accounts@balajibricks.example', name: 'Pooja Sharma', role: UserRole.ACCOUNTANT },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { orgId_email: { orgId: org.id, email: u.email } },
      update: { name: u.name, role: u.role },
      create: {
        orgId: org.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phone: '9876500001',
        passwordHash,
        language: Language.HINGLISH,
      },
    });
  }

  // ── Factories + price history ──
  const factories = [
    { name: 'Maa Durga Bhatta', owner: 'Mahesh', city: 'Bagru', first: 5200, second: 4600, third: 3900 },
    { name: 'Shiv Shakti Bhatta', owner: 'Dinesh', city: 'Chomu', first: 5100, second: 4500, third: 3800 },
  ];
  for (const f of factories) {
    const factory = await prisma.factory.upsert({
      where: { id: `factory-${f.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `factory-${f.name.replace(/\s+/g, '-').toLowerCase()}`,
        orgId: org.id,
        name: f.name,
        ownerName: f.owner,
        city: f.city,
        state: 'Rajasthan',
        phone: '9876511111',
        creditLimitPaise: rupees(500000),
        creditDays: 15,
      },
    });
    const classes: Array<[BrickClass, number]> = [
      [BrickClass.FIRST, f.first],
      [BrickClass.SECOND, f.second],
      [BrickClass.THIRD, f.third],
    ];
    for (const [brickClass, price] of classes) {
      await prisma.factoryPrice.create({
        data: {
          orgId: org.id,
          factoryId: factory.id,
          brickClass,
          pricePerBrickPaise: ratePerThousand(price),
          effectiveFrom: new Date('2026-01-01'),
          note: 'Seed opening price',
        },
      });
    }
  }

  // ── Customers + addresses + negotiated prices ──
  const customers = [
    { name: 'Verma Constructions', phone: '9876522222', first: 8500, second: 7600 },
    { name: 'Sharma Builders', phone: '9876533333', first: 8200, second: 7400 },
    { name: 'Gupta Infra', phone: '9876544444', first: 8700, second: 7800 },
  ];
  for (const c of customers) {
    const customerId = `customer-${c.name.replace(/\s+/g, '-').toLowerCase()}`;
    const customer = await prisma.customer.upsert({
      where: { id: customerId },
      update: {},
      create: {
        id: customerId,
        orgId: org.id,
        name: c.name,
        phone: c.phone,
        creditLimitPaise: rupees(300000),
      },
    });
    await prisma.customerAddress.upsert({
      where: { id: `${customerId}-addr` },
      update: {},
      create: {
        id: `${customerId}-addr`,
        customerId: customer.id,
        label: 'Main Site',
        fullAddress: 'Project site, Ring Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        isDefault: true,
      },
    });
    const cls: Array<[BrickClass, number]> = [
      [BrickClass.FIRST, c.first],
      [BrickClass.SECOND, c.second],
    ];
    for (const [brickClass, price] of cls) {
      await prisma.customerPrice.create({
        data: {
          orgId: org.id,
          customerId: customer.id,
          brickClass,
          pricePerBrickPaise: ratePerThousand(price),
          effectiveFrom: new Date('2026-01-01'),
          note: 'Seed negotiated rate',
        },
      });
    }
  }

  // ── Transport ──
  for (const n of ['RJ14-GA-1234', 'RJ14-GB-5678']) {
    await prisma.ownTruck.upsert({
      where: { orgId_number: { orgId: org.id, number: n } },
      update: {},
      create: { orgId: org.id, number: n, model: 'Tata 1109', capacityBricks: 4000 },
    });
  }
  for (const d of [
    { name: 'Mohan Lal', phone: '9876555555' },
    { name: 'Kishan Singh', phone: '9876566666' },
  ]) {
    await prisma.driver.upsert({
      where: { id: `driver-${d.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: { id: `driver-${d.name.replace(/\s+/g, '-').toLowerCase()}`, orgId: org.id, ...d },
    });
  }
  await prisma.hiredTruck.upsert({
    where: { id: 'hired-truck-1' },
    update: {},
    create: {
      id: 'hired-truck-1',
      orgId: org.id,
      number: 'RJ45-HT-9090',
      ownerName: 'Balaji Transport',
      ownerPhone: '9876577777',
      driverName: 'Raju',
    },
  });

  // ── Sample stock batches ──
  const firstFactory = await prisma.factory.findFirst({ where: { orgId: org.id } });
  if (firstFactory) {
    await prisma.stockBatch.upsert({
      where: { id: 'batch-1' },
      update: {},
      create: {
        id: 'batch-1',
        orgId: org.id,
        factoryId: firstFactory.id,
        brickClass: BrickClass.FIRST,
        qtyPurchased: 20000,
        purchasePricePerBrickPaise: ratePerThousand(5200),
        purchaseDate: new Date('2026-05-01'),
        notes: 'Opening stock',
      },
    });
  }

  // ── Sample translations ──
  const translations = [
    { lang: Language.HI, key: 'nav.orders', value: 'ऑर्डर' },
    { lang: Language.HI, key: 'nav.customers', value: 'ग्राहक' },
    { lang: Language.HINGLISH, key: 'nav.orders', value: 'Orders' },
    { lang: Language.HINGLISH, key: 'nav.customers', value: 'Customers' },
  ];
  // Global translations have orgId = null; Postgres treats null as distinct in
  // unique indexes, so reset-then-insert keeps the seed idempotent.
  await prisma.translation.deleteMany({ where: { orgId: null } });
  await prisma.translation.createMany({ data: translations });

  console.log('✅ Seed complete. Login: owner@balajibricks.example / Password@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
