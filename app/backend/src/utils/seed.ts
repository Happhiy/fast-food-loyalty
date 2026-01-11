import prisma from './prisma';
import { hashPassword } from './password';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    await prisma.coupon.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.customer.deleteMany();

    console.log('✓ Cleared existing data');

    // Create customers
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          loyaltyId: 'ADMIN001',
          name: 'Admin User',
          email: 'admin@fastfood.hu',
          phone: '+36301234567',
          pinCode: await hashPassword('12345678'),
          points: 0,
          totalSpent: 0,
          visitCount: 0,
          role: 'ADMIN',
        },
      }),
      prisma.customer.create({
        data: {
          loyaltyId: 'CUST001',
          name: 'Nagy Péter',
          email: 'peter.nagy@email.hu',
          phone: '+36301111111',
          pinCode: await hashPassword('11111111'),
          points: 85,
          totalSpent: 12500,
          visitCount: 12,
          role: 'NORMAL',
        },
      }),
      prisma.customer.create({
        data: {
          loyaltyId: 'CUST002',
          name: 'Kovács Anna',
          email: 'anna.kovacs@email.hu',
          phone: '+36302222222',
          pinCode: await hashPassword('22222222'),
          points: 140,
          totalSpent: 32000,
          visitCount: 25,
          role: 'LOYAL',
        },
      }),
      prisma.customer.create({
        data: {
          loyaltyId: 'CUST003',
          name: 'Szabó János',
          email: 'janos.szabo@email.hu',
          phone: '+36303333333',
          pinCode: await hashPassword('33333333'),
          points: 220,
          totalSpent: 65000,
          visitCount: 45,
          role: 'OWNER',
        },
      }),
    ]);

    console.log('✓ Created 4 customers');

    // Create purchases
    await Promise.all([
      prisma.purchase.create({
        data: {
          customerId: customers[1].id,
          amount: 2500,
          pointsEarned: 27,
          receiptNumber: 'RCP-001',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.purchase.create({
        data: {
          customerId: customers[2].id,
          amount: 3200,
          pointsEarned: 44,
          receiptNumber: 'RCP-002',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.purchase.create({
        data: {
          customerId: customers[3].id,
          amount: 4500,
          pointsEarned: 76,
          receiptNumber: 'RCP-003',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    console.log('✓ Created 3 purchases');

    // Create coupons
    await Promise.all([
      prisma.coupon.create({
        data: {
          code: 'COUP-2024-001',
          customerId: customers[2].id,
          value: 1000,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          redeemed: false,
        },
      }),
      prisma.coupon.create({
        data: {
          code: 'COUP-2024-002',
          customerId: customers[3].id,
          value: 1000,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          redeemed: true,
          redeemedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    console.log('✓ Created 2 coupons');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('   Admin: ADMIN001 / 12345678');
    console.log('   Customer 1: CUST001 / 11111111');
    console.log('   Customer 2: CUST002 / 22222222');
    console.log('   Customer 3: CUST003 / 33333333');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();