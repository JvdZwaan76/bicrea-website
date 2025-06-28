import { Router } from 'itty-router';

const router = Router();

router.get('/', () => new Response("Welcome to Bicrea homepage!", { status: 200 }));
router.all('/favicon.ico', () => {
  console.log(`Processing favicon request for ${request.url}`);
  const response = new Response(null, { status: 204 });
  console.log(`Favicon request handled with status ${response.status}`);
  return response;
});
router.all('*', () => new Response('Not found', { status: 404 }));

export default {
  fetch(request) {
    console.log(`Processing request: ${request.method} ${request.url}`);
    try {
      const response = router.handle(request);
      console.log(`Handled request for ${request.url} with status ${response.status}`);
      return response;
    } catch (error) {
      console.error(`Worker exception: ${error.message}`, error.stack);
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  }
};
