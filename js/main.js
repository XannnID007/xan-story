// ═══ App bootstrap: routes + nav + splash ═══
import { route, startRouter, initTheme } from './app.js';
import { checkAdminStatus } from './db.js';
import { renderHome } from './pages/home.js';
import { renderStory } from './pages/story.js';
import { renderEditor } from './pages/editor.js';
import { renderReader } from './pages/reader.js';
import { renderNewStory } from './pages/new.js';
import { renderSettings } from './pages/settings.js';
import { renderLogin } from './pages/login.js';

// ─── Routes ───
route('/', renderHome);
route('/story/:id', renderStory);
route('/edit/:storyId/:chapterId', renderEditor);
route('/read/:storyId/:chapterId', renderReader);
route('/new', renderNewStory);
route('/settings', renderSettings);
route('/login', renderLogin);

// ─── Fab menu (corner butterfly trigger + icon flyout) ───
function updateFabMenu() {
  const hash = window.location.hash || '#/';
  const menu = document.getElementById('fab-menu');
  if (!menu) return;

  // Hide on immersive/standalone pages
  const hideOn = ['/read/', '/edit/', '/login', '/new'];
  menu.style.display = hideOn.some(p => hash.includes(p)) ? 'none' : 'flex';

  menu.querySelectorAll('.fab-item[data-route]').forEach(el => {
    const target = el.dataset.route;
    const isHome = target === '/' && (hash === '#/' || hash === '#' || hash.startsWith('#/story/'));
    const isOther = target !== '/' && hash.includes(target);
    el.classList.toggle('active', isHome || isOther);
  });
}

function closeFabMenu() {
  document.getElementById('fab-menu-items')?.classList.remove('open');
  document.getElementById('fab-toggle')?.classList.remove('open');
}

function initFabMenu() {
  const menu = document.getElementById('fab-menu');
  const toggle = document.getElementById('fab-toggle');
  const items = document.getElementById('fab-menu-items');
  if (!menu || !toggle || !items) return;

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    items.classList.toggle('open');
    toggle.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!menu.contains(e.target)) closeFabMenu();
  });

  items.querySelectorAll('.fab-item[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      window.location.hash = el.dataset.route;
      closeFabMenu();
    });
  });

  window.addEventListener('hashchange', () => { closeFabMenu(); updateFabMenu(); });
  updateFabMenu();

  // Write button only visible to logged-in admin
  checkAdminStatus(isAdmin => {
    const writeBtn = document.getElementById('fab-write');
    if (writeBtn) writeBtn.style.display = isAdmin ? 'flex' : 'none';
  });
}

// ─── Splash ───
function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }, 700);
}

// ─── Boot ───
try {
  initTheme();
  startRouter();
  initFabMenu();
  hideSplash();
} catch (err) {
  console.error('Boot error:', err);
  hideSplash();
  const view = document.getElementById('app-view');
  if (view) view.innerHTML = `
    <div style="padding:60px 24px;text-align:center;color:#e85c6c">
      <p>Something went wrong.</p>
      <p style="font-size:12px;opacity:.6;margin-top:8px">${err.message}</p>
      <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;border-radius:50px;background:rgba(155,109,212,0.15);border:1px solid rgba(155,109,212,0.3);color:#c9a8ff;cursor:pointer">Reload</button>
    </div>`;
}