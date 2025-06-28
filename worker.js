export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Redirect bicrea.net to bicrea.com
    if (hostname === 'bicrea.net' || hostname === 'www.bicrea.net') {
      const target = `https://bicrea.com${url.pathname}${url.search}`;
      return Response.redirect(target, 301);
    }

    // Serve static assets for bicrea.com and default
    if (hostname === 'bicrea.com' || hostname === 'www.bicrea.com' || hostname === 'bicrea-website.jaspervdz.workers.dev') {
      if (url.pathname === '/favicon.ico') {
        return new Response(null, { status: 204 });
      }
      return await env.ASSETS.fetch(request);
    }

    // Fallback for unexpected hostnames
    return new Response('Not found', { status: 404 });
  }
};
