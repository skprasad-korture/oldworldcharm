import fp from 'fastify-plugin';
import sensible from '@fastify/sensible';
import { FastifyInstance } from 'fastify';

async function sensiblePlugin(fastify: FastifyInstance) {
  // Register Fastify Sensible for common utilities
  await fastify.register(sensible);
}

export default fp(sensiblePlugin, {
  name: 'sensible',
  dependencies: [],
});
