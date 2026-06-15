exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }
    const d = JSON.parse(event.body || '{}');
    console.error('[CLIENT ERROR]', JSON.stringify({
      type: d.type, msg: d.msg, url: d.url, line: d.line,
      src: d.src, stack: d.stack, ua: d.ua, ts: d.ts
    }));
    return { statusCode: 204, body: '' };
  } catch (e) {
    return { statusCode: 204, body: '' };
  }
};
