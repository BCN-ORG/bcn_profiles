import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';

describe('AppController HTTP contract (e2e)', () => {
  let app: INestApplication<App>;
  const appService = {
    getHello: jest.fn(() => 'Hello Chat App With NestJS!'),
    checkDatabaseConnection: jest.fn().mockResolvedValue({
      status: 'UP',
      database: 'connected',
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('/api (GET) returns success envelope', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 200,
          message: 'Success',
        });
      });
  });

  it('/ (GET) is reserved for the frontend', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('/api/health (GET) reports readiness', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 200,
          data: {
            status: 'UP',
            database: 'connected',
          },
        });
      });
  });
});
