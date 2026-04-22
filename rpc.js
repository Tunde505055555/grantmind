// api/rpc.js — Vercel serverless function
// Proxies requests to studio.genlayer.com server-side (no CORS restriction)
// Frontend calls /api/rpc instead of studio.genlayer.com/api directly

const https = require('https');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const result = await proxyToStudio(body);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(result);
  } catch (err) {
    res.status(500).json({
      jsonrpc: '2.0', id: null,
      error: { code: -32603, message: err.message }
    });
  }
};

function proxyToStudio(body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body, 'utf8');
    const options = {
      hostname: 'studio.genlayer.com',
      path: '/api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };
    const req = https.request(options, (resp) => {
      let raw = '';
      resp.on('data', chunk => raw += chunk);
      resp.on('end', () => resolve(raw));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
