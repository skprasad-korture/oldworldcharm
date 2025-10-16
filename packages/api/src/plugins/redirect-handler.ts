import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { urlService } from '../services/url-service';

/**
 * Redirect handler plugin
 * Automatically handles URL redirects based on the redirects table
 */
const redirectHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  // Add preHandler hook to check for redirects
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip redirect checking for API routes and static assets
    if (
      request.url.startsWith('/api/') ||
      request.url.startsWith('/uploads/') ||
      request.url.startsWith('/docs') ||
      request.url.startsWith('/health') ||
      request.url.includes('.')  // Skip files with extensions
    ) {
      return;
    }

    try {
      // Check if there's a redirect for this URL
      const redirect = await urlService.findRedirect(request.url);
      
      if (redirect) {
        const statusCode = parseInt(redirect.statusCode);
        
        // Perform the redirect
        reply.redirect(statusCode, redirect.toUrl);
        return;
      }
    } catch (error) {
      // Log error but don't block the request
      fastify.log.error({ error, url: request.url }, 'Redirect check failed');
    }
  });
};

export default fp(redirectHandlerPlugin, {
  name: 'redirect-handler',
});