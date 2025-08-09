interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      // Try to serve static assets from the dist directory
      let response = await env.ASSETS.fetch(request);
      
      // Handle HTML files without extension (for clean URLs)
      if (response.status === 404 && !url.pathname.endsWith('.html')) {
        // Try with .html extension
        const htmlRequest = new Request(`${url.origin}${url.pathname}.html`);
        const htmlResponse = await env.ASSETS.fetch(htmlRequest);
        
        if (htmlResponse.status === 200) {
          return htmlResponse;
        }
        
        // Try index.html for directory requests
        if (url.pathname.endsWith('/')) {
          const indexRequest = new Request(`${url.origin}${url.pathname}index.html`);
          const indexResponse = await env.ASSETS.fetch(indexRequest);
          
          if (indexResponse.status === 200) {
            return indexResponse;
          }
        }
      }
      
      return response;
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  },
};