// prisma/seed.cjs
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1) Admin-User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@leadradar.local' },
    update: {},
    create: {
      email: 'admin@leadradar.local',
      name: 'LeadRadar Admin',
      role: 'admin',
    },
  });

  // 2) Beispiel-Event
  const event = await prisma.event.create({
    data: {
      name: 'Demo Messe 2025',
      description: 'Interne Demo-Messe für LeadRadar.',
      location: 'Musterhalle, Zürich',
      startDate: new Date('2025-03-01T09:00:00.000Z'),
      endDate: new Date('2025-03-03T17:00:00.000Z'),
    },
  });

  // 3) Zwei Leads für das Event
  await prisma.lead.createMany({
    data: [
      {
        eventId: event.id,
        firstName: 'Anna',
        lastName: 'Beispiel',
        email: 'anna@example.com',
        phone: '+41 79 111 22 33',
        company: 'Example AG',
        position: 'Marketing Managerin',
        source: 'manual',
        notes: 'Interessiert an QR-Scan & App-Lizenz.',
      },
      {
        eventId: event.id,
        firstName: 'Marco',
        lastName: 'Test',
        email: 'marco@example.com',
        phone: '+41 79 444 55 66',
        company: 'Test GmbH',
        position: 'Sales',
        source: 'card',
        notes: 'Visitenkarte eingescannt, will Demo-Zugang.',
      },
    ],
  });

  console.log('Seeding finished ✔');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
