import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Tenant leakage tests.
 * Requires a running Postgres instance configured via env vars.
 * Run with: npm run test:e2e
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let tokenBrandA: string;
  let tokenBrandB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Register and login as brandA user (ignore 409 if already exists from a prior run)
    // Register (ignore 409 — user may exist from a prior run)
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'alice@brandA.com',
      password: 'P@ssw0rd!',
      brandId: 'brandA',
    });
    const loginA = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'alice@brandA.com',
      password: 'P@ssw0rd!',
      brandId: 'brandA',
    });
    if (loginA.status !== 200) {
      throw new Error(`brandA login failed ${loginA.status}: ${JSON.stringify(loginA.body)}`);
    }
    tokenBrandA = loginA.body.accessToken;

    // Register and login as brandB user
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'bob@brandB.com',
      password: 'P@ssw0rd!',
      brandId: 'brandB',
    });
    const loginB = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'bob@brandB.com',
      password: 'P@ssw0rd!',
      brandId: 'brandB',
    });
    if (loginB.status !== 200) {
      throw new Error(`brandB login failed ${loginB.status}: ${JSON.stringify(loginB.body)}`);
    }
    tokenBrandB = loginB.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Profile endpoint', () => {
    it("brandA token returns brandA user's own profile", async () => {
      const res = await request(app.getHttpServer())
        .get('/profile/me')
        .set('Authorization', `Bearer ${tokenBrandA}`)
        .expect(200);

      expect(res.body.brandId).toBe('brandA');
      expect(res.body.email).toBe('alice@brandA.com');
    });

    it("brandB token returns brandB user's own profile", async () => {
      const res = await request(app.getHttpServer())
        .get('/profile/me')
        .set('Authorization', `Bearer ${tokenBrandB}`)
        .expect(200);

      expect(res.body.brandId).toBe('brandB');
      expect(res.body.email).toBe('bob@brandB.com');
    });

    it('unauthenticated request is rejected with 401', async () => {
      await request(app.getHttpServer()).get('/profile/me').expect(401);
    });
  });

  describe('PSP callback tenant isolation', () => {
    it('accepts a PSP callback for brandA', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/psp/stripe')
        .send({ eventId: 'evt-a-001', brandId: 'brandA', payload: { amount: 100 } })
        .expect(200);

      expect(res.body.status).toBe('accepted');
    });

    it('deduplicates a repeated callback for the same brand', async () => {
      // Send the same event twice
      await request(app.getHttpServer())
        .post('/webhooks/psp/stripe')
        .send({ eventId: 'evt-a-002', brandId: 'brandA', payload: { amount: 200 } });

      const res = await request(app.getHttpServer())
        .post('/webhooks/psp/stripe')
        .send({ eventId: 'evt-a-002', brandId: 'brandA', payload: { amount: 200 } })
        .expect(200);

      expect(res.body.status).toBe('duplicate');
    });

    it('same eventId in different brands are treated as independent events', async () => {
      const eventId = 'evt-cross-brand-001';

      const resA = await request(app.getHttpServer())
        .post('/webhooks/psp/stripe')
        .send({ eventId, brandId: 'brandA', payload: { amount: 300 } })
        .expect(200);

      const resB = await request(app.getHttpServer())
        .post('/webhooks/psp/stripe')
        .send({ eventId, brandId: 'brandB', payload: { amount: 300 } })
        .expect(200);

      // Each brand stores its own event — neither is a duplicate of the other
      expect(resA.body.status).toBe('accepted');
      expect(resB.body.status).toBe('accepted');
    });
  });

  describe('Auth tenant isolation', () => {
    it('same email in different tenants registers independently', async () => {
      const sharedEmail = `shared-${Date.now()}@example.com`;

      const resA = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: sharedEmail, password: 'P@ssw0rd!', brandId: 'brandA' })
        .expect(201);

      const resB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: sharedEmail, password: 'P@ssw0rd!', brandId: 'brandB' })
        .expect(201);

      expect(resA.body.brandId).toBe('brandA');
      expect(resB.body.brandId).toBe('brandB');
      expect(resA.body.userId).not.toBe(resB.body.userId);
    });

    it('brandA credentials cannot log in as brandB', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@brandA.com', password: 'P@ssw0rd!', brandId: 'brandB' })
        .expect(401);
    });
  });
});
