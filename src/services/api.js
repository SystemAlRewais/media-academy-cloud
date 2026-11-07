import { APP_CONFIG } from '../config.js';

const TOKEN_KEY = 'mac_session_token';

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = '__mac_cb_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timer = window.setTimeout(() => finish(new Error('API_TIMEOUT')), 15000);
    function finish(error, data) {
      window.clearTimeout(timer);
      delete window[callback];
      script.remove();
      error ? reject(error) : resolve(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error('API_NETWORK_ERROR'));
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;
    document.body.appendChild(script);
  });
}

function encodeRequest(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

export function getSessionToken() { return sessionStorage.getItem(TOKEN_KEY) || ''; }
export function saveSessionToken(token) { token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY); }

export async function api(action, data = {}, options = {}) {
  const base = APP_CONFIG.appsScriptUrl;
  if (!base) throw new Error('BACKEND_NOT_CONFIGURED');
  const payload = { action, ...data, token: options.public ? undefined : getSessionToken() };
  const url = base + '?q=' + encodeURIComponent(encodeRequest(payload));
  const result = await jsonp(url);
  if (!result || result.ok !== true) throw new Error(result?.message || result?.error || 'API_ERROR');
  return result;
}

export async function login(identifier, password) {
  const result = await api('login', { identifier, password }, { public: true });
  saveSessionToken(result.token);
  return result.user;
}
export async function logout() {
  try { await api('logout'); } finally { saveSessionToken(''); }
}
