// Preserve the natural-voice release while restoring the tested project entry.
const SITE_ORIGIN = 'https://d40d382f.chuiyi.pages.dev';
const EDITOR_ORIGIN = 'https://8d139183.chuiyi.pages.dev';
export default {
 async fetch(request) {
  const incoming = new URL(request.url);
  const isEditor = /^\/test(?:\/|$)/.test(incoming.pathname);
  const upstream = isEditor ? EDITOR_ORIGIN : SITE_ORIGIN;
  const target = new URL(incoming.pathname + incoming.search, upstream);
  const headers = new Headers(request.headers);
  headers.delete('host');
  if (headers.get('origin') === incoming.origin) headers.set('origin', upstream);
  const referer = headers.get('referer');
  if (referer) { try { const ref = new URL(referer); if (ref.origin === incoming.origin) { ref.host = target.host; headers.set('referer', ref.href); } } catch {} }
  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET','HEAD'].includes(request.method)) init.body = request.body;
  const response = await fetch(new Request(target, init));
  if (response.status === 101) return response;
  const resultHeaders = new Headers(response.headers);
  const location = resultHeaders.get('location');
  if (location) { try { const redirect = new URL(location, target); if (redirect.origin === upstream) { redirect.host = incoming.host; resultHeaders.set('location', redirect.href); } } catch {} }
  if (isEditor) { resultHeaders.set('cache-control','no-store'); resultHeaders.set('x-cy-entry-fix','20261115-restored'); }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: resultHeaders });
 }
};