import { test, expect } from 'vitest';
import Fastify from 'fastify';

test('Fastify server can be created', async () => {
  const app = Fastify({ logger: false });
  
  app.get('/test', async () => {
    return { message: 'Hello World' };
  });

  await app.ready();

  const response = await app.inject({
    method: 'GET',
    url: '/test',
  });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ message: 'Hello World' });

  await app.close();
});

test('Basic math operations work', () => {
  expect(2 + 2).toBe(4);
  expect(5 * 3).toBe(15);
});