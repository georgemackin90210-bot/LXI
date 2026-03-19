// api/proxy.js
// Vercel serverless function — proxies SEC EDGAR and Yahoo Finance requests
// Runs server-side so there are zero CORS issues

export default async function handler(req, res) {
  // Allow browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  // Security whitelist — only allow these domains
  const allowed = [
    'sec.gov',
    'finance.yahoo.com',
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
  ];

  const isAllowed = allowed.some(domain => url.includes(domain));
  if (!isAllowed) {
    res.status(403).json({ error: `Domain not permitted: ${url}` });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ARGUS/1.0)',
        'Accept': 'application/json, */*',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream returned ${response.status}` });
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();

    res.setHeader('Content-Type', contentType);
    res.status(200).send(data);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
}
