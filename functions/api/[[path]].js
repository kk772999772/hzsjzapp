export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Target worker backend domain
  const targetWorkerOrigin = 'https://your-worker-subdomain.workers.dev';
  const targetUrl = new URL(url.pathname + url.search, targetWorkerOrigin);
  
  // Construct proxy request forwarding body and headers
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual'
  });
  
  try {
    const response = await fetch(modifiedRequest);
    return response;
  } catch (err) {
    return new Response('Proxy Error: ' + err.message, { 
      status: 502,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
