import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { EmailService } from './services/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorSetupGuard } from './guards/two-factor-setup.guard';
import { TwoFactorRecoveryGuard } from './guards/two-factor-recovery.guard';
import { RolesGuard } from './guards/roles.guard';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: TwoFactorAuthService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(TwoFactorSetupGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TwoFactorRecoveryGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('GET /auth/me cache policy', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: TwoFactorAuthService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(TwoFactorSetupGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TwoFactorRecoveryGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns Cache-Control no-store, private', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me');

    expect(response.headers['cache-control']).toBe('no-store, private');
  });

  it('returns the same cache policy for GET /auth/profile', () => {
    const headers = Reflect.getMetadata(
      HEADERS_METADATA,
      AuthController.prototype.getProfile,
    ) as Array<{ name: string; value: string }>;

    expect(headers).toEqual(
      expect.arrayContaining([
        { name: 'Cache-Control', value: 'no-store, private' },
      ]),
    );
  });

});
