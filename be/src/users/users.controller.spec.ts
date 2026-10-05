import { Test, TestingModule } from '@nestjs/testing';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('marks GET /users/me/profile as uncacheable', () => {
    const headers = Reflect.getMetadata(
      HEADERS_METADATA,
      UsersController.prototype.getMyProfile,
    ) as Array<{ name: string; value: string }>;

    expect(headers).toEqual(
      expect.arrayContaining([
        { name: 'Cache-Control', value: 'no-store, private' },
      ]),
    );
  });

  it('exposes GET :id/profile without a user session', () => {
    const handler = Object.getOwnPropertyDescriptor(
      UsersController.prototype,
      'getUserPublicProfile',
    )?.value as object;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });
});
