// ─── Simple Hash Router ───

const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getParams() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  return parts;
}

function matchRoute(hash) {
  const path = hash.slice(1) || '/';

  if (routes[path]) return { handler: routes[path], params: {} };

  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler: routes[pattern], params };
  }

  return null;
}

export function startRouter() {
  async function onHashChange() {
    const hash = window.location.hash || '#/';
    const result = matchRoute(hash);

    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    if (result) {
      try {
        const cleanup = await result.handler(result.params);
        if (typeof cleanup === 'function') currentCleanup = cleanup;
      } catch (err) {
        console.error('Route handler error:', err);
        const view = document.querySelector('#app-view');
        if (view) view.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--text-secondary);">
          <p>Failed to load page</p>
          <p style="font-size:12px;opacity:0.5;margin-top:8px">${err.message}</p>
          <button onclick="location.hash='#/';location.reload()" style="margin-top:16px;padding:8px 20px;border-radius:16px;background:var(--accent-bg);border:1px solid var(--accent-border);color:var(--accent-light);cursor:pointer;font-family:Outfit,sans-serif">Go home</button>
        </div>`;
      }
    } else {
      navigate('/');
    }
  }

  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}

// ─── Theme Manager ───

export function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

export function toggleTheme() {}

export function getTheme() {
  return 'dark';
}

// ─── Helpers ───

export function $(sel, ctx = document) {
  return ctx.querySelector(sel);
}

export function $$(sel, ctx = document) {
  return [...ctx.querySelectorAll(sel)];
}

export function html(el, content) {
  if (typeof el === 'string') el = $(el);
  if (el) el.innerHTML = content;
}

export function on(el, event, handler, opts) {
  if (typeof el === 'string') el = $(el);
  if (el) el.addEventListener(event, handler, opts);
}

export function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
}

export function estimateReadTime(panels) {
  if (!panels || !panels.length) return '1 min';
  let words = 0;
  let images = 0;
  for (const p of panels) {
    if (p.type === 'scene') {
      images++;
    } else {
      words += (p.content || '').split(/\s+/).length;
    }
  }
  const mins = Math.max(1, Math.ceil((words / 200) + (images * 0.5)));
  return `${mins} min`;
}

export function genreColor(genre) {
  const map = {
    'Slice of life': { bg: 'rgba(168,126,221,0.15)', color: '#c9a8ff' },
    'Thoughts': { bg: 'rgba(100,160,255,0.15)', color: '#88bbff' },
    'Fiction': { bg: 'rgba(80,200,140,0.15)', color: '#6dd4a0' },
    'Romance': { bg: 'rgba(230,120,160,0.15)', color: '#e8a0bb' },
    'Dark': { bg: 'rgba(180,140,140,0.15)', color: '#bba0a0' },
    'Mystery': { bg: 'rgba(200,180,100,0.15)', color: '#ccbb77' },
    'Poetry': { bg: 'rgba(200,140,220,0.15)', color: '#d0a8e8' }
  };
  return map[genre] || { bg: 'rgba(168,126,221,0.15)', color: '#c9a8ff' };
}

export const GENRES = ['Slice of life', 'Thoughts', 'Fiction', 'Romance', 'Dark', 'Mystery', 'Poetry'];

export function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressImage(base64, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}