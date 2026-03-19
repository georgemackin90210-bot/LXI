// api/proxy.js — LXI Vercel Serverless Proxy
const https = require('https');

const ALLOWED = ['sec.gov', 'query1.finance.yahoo.com', 'query2.finance.yahoo.com', 'finance.yahoo.com'];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'LXI/1.0 contact@lxi.app', 'Accept': 'application/json' }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d, ct: res.headers['content-type'] || 'application/json' }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  if (!ALLOWED.some(d => url.includes(d))) return res.status(403).json({ error: 'Domain not allowed' });

  try {
    const { status, data, ct } = await get(url);
    res.setHeader('Content-Type', ct);
    res.status(status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
