/* Talks to the sheet's Admin web service (tools/apps-script/Admin.gs). */
const API = (window.KYOGYERA_CONFIG || {}).ADMIN_API_URL || '';
const KEY = 'kyogyera:admin-session';

export const ROLE_NAMES = { admin: 'Admin', editor: 'Editor', ref: 'Referee' };

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && s.exp > Date.now() ? s : null;
  } catch (e) { return null; }
}
export function setSession(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
export function clearSession() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

export class AuthError extends Error {}

export async function call(action, params = {}) {
  if (!API) throw new Error('The Admin service is not set up (ADMIN_API_URL in config.js).');
  const s = getSession();
  let res;
  try {
    // text/plain keeps this a "simple" request, which Google's web service accepts from any site.
    res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: s && s.token, ...params }) });
  } catch (e) {
    throw new Error('No connection — check your internet and try again.');
  }
  let data;
  try { data = await res.json(); } catch (e) { throw new Error('The Admin service did not answer properly (HTTP ' + res.status + ').'); }
  if (!data.ok) {
    if (data.code === 'AUTH') { clearSession(); throw new AuthError(data.error); }
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

export async function login(pin) {
  const d = await call('login', { pin });
  const s = { token: d.token, name: d.name, role: d.role, exp: d.exp };
  setSession(s);
  return s;
}
