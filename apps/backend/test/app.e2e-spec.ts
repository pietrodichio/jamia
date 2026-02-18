// apps/backend/test/app.e2e-spec.ts
//
// End-to-end tests that load the full AppModule (real Supabase stack).
//
// IMPORTANT: These tests require env vars to be set:
//   SUPABASE_URL     — e.g. http://127.0.0.1:54421
//   SUPABASE_SERVICE_KEY — service role key from `npx supabase status`
//
// Run with: npx jest --config test/jest-e2e.json
// Or (if script exists): pnpm test:e2e
//
// These tests do NOT mock Supabase. They verify the full stack.
// A running local Supabase instance is required (npx supabase start).

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Match production ValidationPipe from main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });
});
