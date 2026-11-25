import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Affiliation, ResponseType } from '../generated/prisma/enums.js';

// Reference data for BFP-CMS (REQUIREMENTS.md §11). Safe to run repeatedly:
// rows are matched by their unique names and never duplicated or overwritten.
//
//   npm run seed                  reference data only
//   SEED_DEV=true npm run seed    plus a sample office tree, a position and a
//                                 SUPER_ADMIN (development only; refused when
//                                 NODE_ENV=production)
//
// The lists are starting points; admins maintain them in the app. EMS and the
// full SRF category list are still OPEN (REQUIREMENTS.md Q-01).

const CATEGORIES: Record<ResponseType, string[]> = {
  [ResponseType.FIRE]: [
    'Structural',
    'Non-structural',
    'Transportation',
    'Wildland',
  ],
  [ResponseType.EMS]: ['Emergency medical response'],
  [ResponseType.SPECIAL_RESCUE]: [
    'HAZMAT',
    'Collapsed Structure Search and Rescue (CSSR)',
    'Other special rescue',
  ],
};

const AGENCIES: { name: string; affiliation: Affiliation }[] = [
  { name: 'Philippine National Police (PNP)', affiliation: 'OTHER_LAW_ENFORCEMENT' },
  { name: 'Philippine Coast Guard (PCG)', affiliation: 'OTHER_LAW_ENFORCEMENT' },
  {
    name: 'Bureau of Jail Management and Penology (BJMP)',
    affiliation: 'OTHER_LAW_ENFORCEMENT',
  },
  { name: 'Armed Forces of the Philippines (AFP)', affiliation: 'OTHER_GOVERNMENT' },
  {
    name: 'Local Disaster Risk Reduction and Management Office (LDRRMO)',
    affiliation: 'OTHER_GOVERNMENT',
  },
];

const INJURY_TYPES = [
  'Burn',
  'Smoke inhalation',
  'Fracture',
  'Laceration',
  'Contusion',
  'Crush injury',
  'Chemical exposure',
  'Electrical injury',
  'Drowning-related',
  'Other',
];

async function seedReferenceData(prisma: PrismaClient) {
  for (const [responseType, names] of Object.entries(CATEGORIES)) {
    for (const name of names) {
      await prisma.incidentCategory.upsert({
        where: {
          responseType_name: { responseType: responseType as ResponseType, name },
        },
        create: { responseType: responseType as ResponseType, name },
        update: {},
      });
    }
  }

  for (const agency of AGENCIES) {
    await prisma.agency.upsert({
      where: { name: agency.name },
      create: agency,
      update: {},
    });
  }

  for (const name of INJURY_TYPES) {
    await prisma.injuryType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function findOrCreateOffice(
  prisma: PrismaClient,
  data: Parameters<PrismaClient['office']['create']>[0]['data'] & {
    name: string;
  },
) {
  const existing = await prisma.office.findFirst({
    where: { name: data.name, parentId: data.parentId ?? null },
  });
  return existing ?? prisma.office.create({ data });
}

async function seedDevelopmentData(prisma: PrismaClient) {
  const nhq = await findOrCreateOffice(prisma, {
    name: 'National Headquarters',
    type: 'NATIONAL_HEADQUARTERS',
  });
  const region = await findOrCreateOffice(prisma, {
    name: 'Sample Regional Office',
    type: 'REGIONAL_OFFICE',
    parentId: nhq.id,
    regionCode: 'R00',
  });
  const province = await findOrCreateOffice(prisma, {
    name: 'Sample Provincial Office',
    type: 'PROVINCIAL_FIRE_STATION',
    parentId: region.id,
    regionId: region.id,
  });
  await findOrCreateOffice(prisma, {
    name: 'Sample City Fire Station',
    type: 'CITY_FIRE_STATION',
    parentId: province.id,
    regionId: region.id,
  });

  const position = await prisma.position.upsert({
    where: { name: 'Fire Officer' },
    create: { name: 'Fire Officer' },
    update: {},
  });

  const accountNumber = process.env.SEED_SUPER_ADMIN_ACCOUNT;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;

  if (!accountNumber || !password || !email) {
    console.log(
      'Skipping SUPER_ADMIN: set SEED_SUPER_ADMIN_ACCOUNT, SEED_SUPER_ADMIN_PASSWORD and SEED_SUPER_ADMIN_EMAIL.',
    );
    return;
  }

  // Only one SUPER_ADMIN exists (REQUIREMENTS.md §7.1).
  if (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })) {
    console.log('A SUPER_ADMIN already exists; not creating another.');
    return;
  }

  await prisma.user.create({
    data: {
      account_number: accountNumber.toUpperCase(),
      email: email.toLowerCase(),
      rank: 'FO1',
      first_name: 'System',
      last_name: 'Administrator',
      password: await bcrypt.hash(password, 10),
      role: 'SUPER_ADMIN',
      officeId: nhq.id,
      positionId: position.id,
      mustChangePassword: true,
      notification: { create: {} },
    },
  });
  console.log(`Created SUPER_ADMIN ${accountNumber.toUpperCase()}.`);
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    await seedReferenceData(prisma);
    console.log('Reference data seeded.');

    if (process.env.SEED_DEV === 'true') {
      if (process.env.NODE_ENV?.trim() === 'production') {
        throw new Error('SEED_DEV is refused when NODE_ENV=production.');
      }
      await seedDevelopmentData(prisma);
      console.log('Development data seeded.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
