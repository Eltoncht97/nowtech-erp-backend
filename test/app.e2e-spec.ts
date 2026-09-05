import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health should return service status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    const body = response.body as HealthResponse;

    expect(body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'nowtech-erp-backend',
      }),
    );
    expect(body.timestamp).toEqual(expect.any(String));
  });
});
