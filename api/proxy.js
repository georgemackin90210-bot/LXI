// api/proxy.js
// Vercel serverless function — proxies SEC EDGAR + Yahoo Finance
// Uses CommonJS syntax for maximum Vercel compatibility

const https = require('https');
const http = require('http');

const ALLOWED_DOMAINS = [
  'sec.gov',
  'finance.yahoo.com',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LXI/1.0)',
        'Accept': 'application/json, */*',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, contentType: res.headers['content-type'] || 'application/json' }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  const allowed = ALLOWED_DOMAINS.some(d => url.includes(d));
  if (!allowed) return res.status(403).json({ error: 'Domain not permitted' });

  try {
    console.log('Proxying: ' + url.substring(0, 100));
    const { status, data, contentType } = await fetchUrl(url);
    res.setHeader('Content-Type', contentType);
    return res.status(status).send(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
