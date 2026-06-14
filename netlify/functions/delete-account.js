// netlify/functions/delete-account.js
// Permanently deletes the signed-in user's account (GDPR right to erasure).
// Requires Netlify env var: SUPABASE_SERVICE_ROLE_KEY  (NEVER put this key in the client)
const SUPABASE_URL = 'https://eblozlkwavtijjrmefpt.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }
  let accessToken;
  try { accessToken = JSON.parse(event.body || '{}').accessToken; } catch (e) {}
  if (!accessToken) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el token de sesión' }) };
  }
  try {
    // 1) Verify the token so a user can ONLY delete their own account
    const userRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + accessToken }
    });
    if (!userRes.ok) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Sesión no válida' }) };
    }
    const user = await userRes.json();
    const userId = user && user.id;
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Sesión no válida' }) };
    }
    // 2) Delete their profiles row
    await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
    });
    // 3) Delete the auth user itself (true erasure)
    const delRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + userId, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
    });
    if (!delRes.ok) {
      const detail = await delRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo eliminar la cuenta', detail }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err && err.message ? err.message : err) }) };
  }
};
