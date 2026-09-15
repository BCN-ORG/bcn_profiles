/**
 * Template only — no real member PII.
 *
 * Local setup:
 *   cp prisma/seed.example.ts prisma/seed.ts
 *   # create prisma/seed-members.json from your private member export
 *   # (fields: maSV, hoTen, ngaySinh, email, soDienThoai?)
 *
 * seed.ts / seed-members.json / danh-sach*.json are gitignored.
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './client/client';

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

type SeedMember = {
  maSV: string;
  hoTen: string;
  ngaySinh: string;
  email: string;
  soDienThoai?: string;
};

function generateUserIdFromMaSV(maSV: string, ngaySinh: string): string {
  const firstTwoDigits = parseInt(maSV.substring(0, 2), 10);
  const birthYear = parseInt(ngaySinh.split('/')[2], 10);
  const yearPrefix = (
    birthYear === 2007 ? firstTwoDigits : firstTwoDigits + 1
  ).toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${yearPrefix}${random}`;
}

function loadSeedMembers(): SeedMember[] {
  const path = join(__dirname, 'seed-members.json');
  if (!existsSync(path)) {
    console.warn(
      'prisma/seed-members.json not found — skipping user seed (apps only).',
    );
    return [];
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as SeedMember[];
  return raw.map((member) => ({
    maSV: member.maSV.trim(),
    hoTen: member.hoTen.trim(),
    ngaySinh: member.ngaySinh.trim(),
    email: member.email.trim().toLowerCase(),
    ...(member.soDienThoai?.trim()
      ? { soDienThoai: member.soDienThoai.trim() }
      : {}),
  }));
}

async function main() {
  console.log('Start seeding...');

  const defaultPassword = await bcrypt.hash('111111', 10);
  const studentData = loadSeedMembers();
  if (studentData.length) {
    console.log(`Loaded ${studentData.length} members from seed-members.json`);
  }

  // maSV that should be ACTIVE + ADMIN — fill locally, never commit real IDs
  const activeUserMaSV = new Set<string>(
    (process.env.SEED_ACTIVE_MASV ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const users = studentData.map((student) => {
    const isActive = activeUserMaSV.has(student.maSV);
    return {
      id: generateUserIdFromMaSV(student.maSV, student.ngaySinh),
      email: student.email,
      password: defaultPassword,
      fullName: student.hoTen,
      role: isActive ? ('ADMIN' as const) : ('USER' as const),
      typeAuth: 'EMAIL' as const,
      status: isActive ? ('ACTIVE' as const) : ('PENDING' as const),
      phone: student.soDienThoai ?? null,
      updatedAt: new Date(),
      metadata: {
        maSV: student.maSV,
        ngaySinh: student.ngaySinh,
      },
    };
  });

  const existingUsers = await prisma.user.findMany({ select: { id: true } });
  const usedIds = new Set<string>(existingUsers.map((u) => u.id));

  const uniqueUsers = users.map((user) => {
    let userId = user.id;
    while (usedIds.has(userId)) {
      const firstTwoDigits = parseInt(userId.substring(0, 2), 10);
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      userId = `${firstTwoDigits}${random}`;
    }
    usedIds.add(userId);
    return { ...user, id: userId };
  });

  for (const user of uniqueUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (existingUser) {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          metadata: user.metadata,
          updatedAt: user.updatedAt,
        },
      });
      console.log(`Updated user: ${user.email}`);
    } else {
      await prisma.user.create({ data: user });
      console.log(`Created user: ${user.email}`);
    }
  }

  const applications = [
    {
      id: 'app-profile',
      code: 'PROFILE',
      name: 'BCN Profiles',
      clientId: 'bcn-profile',
      redirectUri:
        process.env.PROFILE_REDIRECT_URI ??
        'https://profiles.bcn.id.vn/auth/callback',
      permissions: ['profile.read', 'profile.update'],
    },
    {
      id: 'app-quiz',
      code: 'QUIZ',
      name: 'BCN Quiz',
      clientId: 'bcn-quiz',
      redirectUri:
        process.env.QUIZ_REDIRECT_URI ?? 'https://quiz.bcn.id.vn/auth/callback',
      permissions: [
        'quiz.question.read',
        'quiz.question.create',
        'quiz.question.update',
        'quiz.question.delete',
        'quiz.result.read',
      ],
    },
    {
      id: 'app-event',
      code: 'EVENT',
      name: 'BCN Event',
      clientId: 'bcn-event',
      redirectUri:
        process.env.EVENT_REDIRECT_URI ??
        'https://event.bcn.id.vn/auth/callback',
      permissions: [
        'event.read',
        'event.create',
        'event.update',
        'event.checkin',
        'event.participant.read',
        'event.participant.export',
      ],
    },
  ];

  for (const app of applications) {
    await prisma.application.upsert({
      where: { code: app.code },
      create: {
        id: app.id,
        code: app.code,
        name: app.name,
        clientId: app.clientId,
      },
      update: { name: app.name, clientId: app.clientId },
    });
    await prisma.applicationRedirectUri.upsert({
      where: {
        applicationId_redirectUri: {
          applicationId: app.id,
          redirectUri: app.redirectUri,
        },
      },
      create: {
        id: `${app.id}-redirect`,
        applicationId: app.id,
        redirectUri: app.redirectUri,
      },
      update: {},
    });
    const admin = await prisma.appRole.upsert({
      where: {
        applicationId_code: { applicationId: app.id, code: 'ADMIN' },
      },
      create: {
        id: `${app.id}-admin`,
        applicationId: app.id,
        code: 'ADMIN',
        name: 'Admin',
      },
      update: {},
    });
    await prisma.appRole.upsert({
      where: {
        applicationId_code: { applicationId: app.id, code: 'MEMBER' },
      },
      create: {
        id: `${app.id}-member`,
        applicationId: app.id,
        code: 'MEMBER',
        name: 'Member',
      },
      update: {},
    });
    for (const code of app.permissions) {
      const permission = await prisma.permission.upsert({
        where: { applicationId_code: { applicationId: app.id, code } },
        create: { id: `${app.id}-${code}`, applicationId: app.id, code },
        update: {},
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: admin.id,
            permissionId: permission.id,
          },
        },
        create: { roleId: admin.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
