// Team area guard — runs only for /team/* on Cloudflare Pages.
// Cloudflare Access protects bicrea.com/team. The same deployment is also served
// on the project's pages.dev hostnames, where Access cannot be applied without
// breaking the custom domain, so on those hostnames the team area does not exist.
export async function onRequest(context) {
  const host = new URL(context.request.url).hostname;
  if (host === "bicrea.com" || host === "www.bicrea.com") {
    return context.next();
  }
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
