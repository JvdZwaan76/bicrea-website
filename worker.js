import { Router } from 'itty-router';

const router = Router();

router.get('/', () => new Response("Welcome to Bicrea homepage!", { status: 200 }));
router.all('/favicon.ico', () => new Response(null, { status: 204 }));
router.all('*', () => new Response('Not found', { status: 404 }));

export default {
  fetch(request) {
    const response = router.handle(request);
    return response;
  }
};
