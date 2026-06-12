import { route, startRouter, initTheme } from './app.js';
import { renderHome } from './pages/home.js';
import { renderStory } from './pages/story.js';
import { renderEditor } from './pages/editor.js';
import { renderReader } from './pages/reader.js';
import { renderNewStory } from './pages/new.js';
import { renderSettings } from './pages/settings.js';
import { renderLogin } from './pages/login.js'; // <-- Impor Login ditambahkan di sini

// ─── Routes ───
route('/', renderHome);
route('/story/:id', renderStory);
route('/edit/:storyId/:chapterId', renderEditor);
route('/read/:storyId/:chapterId', renderReader);
route('/new', renderNewStory);
route('/settings', renderSettings);
route('/login', renderLogin); // <-- Rute Login ditambahkan di sini

// ─── Bottom nav ───
function updateBottomNav() {
  const hash = window.location.hash || '#/';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  // Hide bottom nav on reader, editor, and login pages
  const hideOn = ['/read/', '/edit/', '/login']; // <-- '/login' ditambahkan agar menu bawah sembunyi
  const shouldHide = hideOn.some(p => hash.includes(p));
  nav.style.display = shouldHide ? 'none' : 'flex';

  // Active state
  nav.querySelectorAll('.bnav-item').forEach(el => {
    el.classList.remove('active');
    const target = el.dataset.route;
    
    // 🔥 PERBAIKAN: Beritahu sistem bahwa halaman '/story/' adalah bagian dari Home
    if (target === '/' && (hash === '#/' || hash === '#' || hash.startsWith('#/story/'))) {
      el.classList.add('active');
    } else if (target !== '/' && hash.includes(target)) {
      el.classList.add('active');
    }
  });
}

function initBottomNav() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.querySelectorAll('.bnav-item').forEach(el => {
    el.addEventListener('click', () => {
      window.location.hash = el.dataset.route;
    });
  });
  window.addEventListener('hashchange', updateBottomNav);
  updateBottomNav();
}

// ─── Splash screen ───
function hideSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
    }, 800);
  }
}

// ─── Boot ───
try {
  initTheme();
  startRouter();
  initBottomNav();
  hideSplash();
} catch (err) {
  console.error('XanStory boot error:', err);
  hideSplash();
  const view = document.getElementById('app-view');
  if (view) view.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#e85c6c;">
    <p>Something went wrong.</p><p style="font-size:12px;opacity:0.6;margin-top:8px">${err.message}</p>
    <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;border-radius:16px;background:rgba(168,126,221,0.12);border:1px solid rgba(168,126,221,0.2);color:#c9a8ff;cursor:pointer">Reload</button>
  </div>`;
}