// api/rpc.js
// Vercel serverless function — proxies to studio.genlayer.com (no CORS restriction server-side)

const https = require('https');

module.exports = async function handler(req, res) {
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
    // Vercel parses body automatically — re-stringify it
    const body = JSON.stringify(req.body);
    const result = await proxyRequest(body);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(result);
  } catch (err) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err.message }
    });
  }
};

function proxyRequest(body) {
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
      const chunks = [];
      resp.on('data', chunk => chunks.push(chunk));
      resp.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
