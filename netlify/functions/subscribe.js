const GROUP_ID_BY_TYPE = {
  // N=Perpetual Negotiator, R=Resilient Restarter, W=Weekday Warrior, C=Clean Slater
  N: '184756908325864636',
  R: '184756931193210759',
  W: '184756951802971922',
  C: '184756957495690634',
};

async function addToMailerLiteGroup({ apiKey, groupId, email, firstName }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const url = 'https://connect.mailerlite.com/api/subscribers';
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      fields: { name: firstName },
      groups: [groupId],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`MailerLite error ${resp.status}`);
    err.details = text;
    err.status = resp.status;
    throw err;
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Missing MAILERLITE_API_KEY' }) };

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const firstName = String(payload.firstName || '').trim();
  const resultType = String(payload.resultType || '').trim().toUpperCase();
  const groupId = GROUP_ID_BY_TYPE[resultType];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Invalid email' }) };
  }
  if (!firstName) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Missing firstName' }) };
  if (!groupId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Invalid resultType' }) };

  try {
    await addToMailerLiteGroup({ apiKey, groupId, email, firstName });
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    const debug = process.env.NODE_ENV === 'production' ? undefined : {
      status: e && e.status ? e.status : undefined,
      details: e && e.details ? String(e.details).slice(0, 2000) : undefined,
    };
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: 'MailerLite request failed', debug }),
    };
  }
};

