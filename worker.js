import { Router } from 'itty-router';

const router = Router();

router.all('/favicon.ico', () => new Response(null, { status: 204 }));
router.all('*', async (request) => {
  const asset = await env.ASSETS.fetch(request);
  return asset || new Response('Not found', { status: 404 });
});

export default {
  fetch(request) {
    try {
      const response = router.handle(request);
      console.log(`Handled request for ${request.url} with status ${response.status}`);
      return response;
    } catch (error) {
      console.error(`Worker exception: ${error.message}`, error.stack);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
