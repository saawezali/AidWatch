import { PrismaClient, CrisisType, Severity, CrisisStatus, SourceType, OrgType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Demo Relief Organization',
      type: OrgType.NGO,
      description: 'A demonstration NGO for testing AidWatch',
    },
  });

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@aidwatch.org' },
    update: {},
    create: {
      email: 'demo@aidwatch.org',
      password: hashedPassword,
      name: 'Demo User',
      role: UserRole.ANALYST,
      organizationId: org.id,
    },
  });

  // Create sample crises
  const crises = await Promise.all([
    prisma.crisis.create({
      data: {
        title: 'Flooding in South Sudan',
        description: 'Severe flooding affecting multiple counties in South Sudan following heavy seasonal rains.',
        type: CrisisType.NATURAL_DISASTER,
        severity: Severity.HIGH,
        status: CrisisStatus.ONGOING,
        confidence: 0.89,
        country: 'South Sudan',
        region: 'East Africa',
        location: 'Jonglei State',
        latitude: 7.1881,
        longitude: 32.0614,
        tags: ['flooding', 'displacement', 'food-security'],
      },
    }),
    prisma.crisis.create({
      data: {
        title: 'Drought Conditions in Horn of Africa',
        description: 'Prolonged drought affecting food security across Ethiopia, Somalia, and Kenya.',
        type: CrisisType.FOOD_SECURITY,
        severity: Severity.CRITICAL,
        status: CrisisStatus.DEVELOPING,
        confidence: 0.94,
        country: 'Ethiopia',
        region: 'Horn of Africa',
        latitude: 9.145,
        longitude: 40.4897,
        tags: ['drought', 'food-crisis', 'water-shortage'],
      },
    }),
    prisma.crisis.create({
      data: {
        title: 'Disease Outbreak Monitoring - Eastern DRC',
        description: 'Increased disease activity detected in conflict-affected areas of Eastern DRC.',
        type: CrisisType.DISEASE_OUTBREAK,
        severity: Severity.MEDIUM,
        status: CrisisStatus.EMERGING,
        confidence: 0.72,
        country: 'Democratic Republic of Congo',
        region: 'Central Africa',
        location: 'North Kivu',
        latitude: -1.6596,
        longitude: 29.0169,
        tags: ['health', 'conflict-zone', 'monitoring'],
      },
    }),
  ]);

  // Create sample events
  await Promise.all([
    prisma.event.create({
      data: {
        title: 'UN Reports 200,000 Displaced by South Sudan Floods',
        description: 'OCHA reports significant displacement due to flooding in Jonglei State.',
        source: 'https://reliefweb.int',
        sourceType: SourceType.UN_REPORT,
        crisisId: crises[0].id,
        publishedAt: new Date(),
        relevance: 0.95,
        sentiment: -0.6,
      },
    }),
    prisma.event.create({
      data: {
        title: 'WFP Warns of Worsening Food Crisis',
        description: 'World Food Programme issues warning about deteriorating food security.',
        source: 'https://wfp.org',
        sourceType: SourceType.UN_REPORT,
        crisisId: crises[1].id,
        publishedAt: new Date(),
        relevance: 0.92,
        sentiment: -0.8,
      },
    }),
  ]);

  // Create watch regions
  await prisma.watchRegion.create({
    data: {
      name: 'East Africa Priority',
      organizationId: org.id,
      countries: ['South Sudan', 'Ethiopia', 'Somalia', 'Kenya', 'Uganda'],
      priority: 1,
      isActive: true,
    },
  });

  // Create alert config
  await prisma.alertConfig.create({
    data: {
      name: 'Critical Alerts',
      organizationId: org.id,
      crisisTypes: [CrisisType.NATURAL_DISASTER, CrisisType.CONFLICT, CrisisType.DISEASE_OUTBREAK],
      minSeverity: Severity.HIGH,
      regions: ['East Africa', 'Central Africa'],
      emailEnabled: true,
    },
  });

  console.log('✅ Seeding completed!');
  console.log(`   - Created organization: ${org.name}`);
  console.log(`   - Created user: ${user.email}`);
  console.log(`   - Created ${crises.length} sample crises`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
