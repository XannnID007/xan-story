// ═══ Core: router, helpers, formatters ═══

const routes = {};
let currentCleanup = null;

export function route(path, handler) { routes[path] = handler; }

let _navTimer = null;
export function navigate(path) {
  if (_navTimer) { clearTimeout(_navTimer); _navTimer = null; }
  const view = document.querySelector('#app-view');
  if (view && view.children.length) {
    view.style.transition = 'opacity .16s ease, transform .16s ease';
    view.style.opacity = '0';
    view.style.transform = 'translateY(-5px)';
    _navTimer = setTimeout(() => {
      _navTimer = null;
      view.style.transition = '';
      view.style.opacity = '';
      view.style.transform = '';
      window.location.hash = path;
    }, 165);
  } else {
    window.location.hash = path;
  }
}

function matchRoute(hash) {
  const path = hash.slice(1) || '/';
  if (routes[path]) return { handler: routes[path], params: {} };

  for (const pattern of Object.keys(routes)) {
    const pp = pattern.split('/').filter(Boolean);
    const xp = path.split('/').filter(Boolean);
    if (pp.length !== xp.length) continue;

    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = xp[i];
      else if (pp[i] !== xp[i]) { ok = false; break; }
    }
    if (ok) return { handler: routes[pattern], params };
  }
  return null;
}

export function startRouter() {
  async function onHashChange() {
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }

    // Reset scroll to top on every route change
    const view = document.querySelector('#app-view');
    if (view) view.scrollTop = 0;

    const result = matchRoute(window.location.hash || '#/');
    if (!result) { navigate('/'); return; }

    try {
      const cleanup = await result.handler(result.params);
      if (typeof cleanup === 'function') currentCleanup = cleanup;
    } catch (err) {
      console.error('Route error:', err);
      const view = document.querySelector('#app-view');
      if (view) view.innerHTML = `
        <div style="padding:60px 24px;text-align:center;color:var(--t2)">
          <p style="font-size:15px">Something went wrong loading this page.</p>
          <p style="font-size:12px;opacity:.5;margin-top:8px">${err.message}</p>
          <button onclick="location.hash='#/'" style="margin-top:20px;padding:10px 24px;border-radius:50px;background:var(--accent);border:none;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif">Go home</button>
        </div>`;
    }
  }

  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}

// ─── Theme (dark only) ───
export function initTheme() { document.documentElement.setAttribute('data-theme', 'dark'); }

// ─── DOM helpers ───
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function html(el, content) {
  if (typeof el === 'string') el = $(el);
  if (el) el.innerHTML = content;
}

export function on(el, event, handler, opts) {
  if (typeof el === 'string') el = $(el);
  if (el) el.addEventListener(event, handler, opts);
}

// ─── Formatters ───
export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
}

export function estimateReadTime(panels) {
  if (!panels?.length) return '1 min';
  let words = 0, images = 0;
  for (const p of panels) {
    if (p.type === 'image' || p.type === 'scene') images++;
    else words += (p.text || p.content || '').split(/\s+/).filter(Boolean).length;
  }
  return `${Math.max(1, Math.ceil(words / 200 + images * 0.5))} min`;
}

export function genreColor(genre) {
  const map = {
    'Slice of life': { bg: 'rgba(168,126,221,0.2)', color: '#c9a8ff' },
    'Thoughts':      { bg: 'rgba(130,150,255,0.2)', color: '#a8b8ff' },
    'Fiction':       { bg: 'rgba(110,200,160,0.2)', color: '#8de0b8' },
    'Romance':       { bg: 'rgba(230,130,180,0.2)', color: '#f0a8cc' },
    'Dark':          { bg: 'rgba(150,120,180,0.2)', color: '#c0a8d8' },
    'Mystery':       { bg: 'rgba(200,170,120,0.2)', color: '#e0c890' },
    'Poetry':        { bg: 'rgba(200,140,220,0.2)', color: '#e0a8f0' }
  };
  return map[genre] || { bg: 'rgba(168,126,221,0.2)', color: '#c9a8ff' };
}

export const GENRES = ['Slice of life', 'Thoughts', 'Fiction', 'Romance', 'Dark', 'Mystery', 'Poetry'];

// ─── Image utilities ───
export function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Shared footer (home, story, settings, reader) ───
export function footerHtml() {
  return `
    <div class="footer">
      <div class="footer-logo">
        <svg class="logo-bf-icon" viewBox="0 0 24 24" fill="none">
          <defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e07aff" /><stop offset="100%" stop-color="#8808c3" />
          </linearGradient></defs>
          <path d="M3 4C6 4 11 9 12 12C13 9 18 4 21 4C19 9 14 11 12 12C14 13 19 15 21 20C18 20 13 15 12 12C11 15 6 20 3 20C5 15 10 13 12 12C10 11 5 9 3 4Z" fill="url(#logoGrad)"/>
        </svg>
        <span class="logo-text">anstory</span>
      </div>
      <div class="footer-tagline">Every thought deserves to be told</div>
      <div class="footer-social">
        <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
        <a href="#" aria-label="TikTok"><i class="fa-brands fa-tiktok"></i></a>
        <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
      </div>
      <div class="footer-copy">Copyright by Xannn</div>
    </div>`;
}

export function compressImage(base64, maxWidth = 1200, quality = 0.8) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) { height = height * maxWidth / width; width = maxWidth; }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}