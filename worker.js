import { Router } from 'itty-router';

const router = Router();

router.all('/favicon.ico', () => new Response(null, { status: 204 }));
router.all('*', async (request) => {
  const asset = await env.ASSETS.fetch(request);
  return asset || new Response('Not found', { status: 404 });
});

export default {
  fetch(request) {
    const response = router.handle(request);
    return response;
  }
};
