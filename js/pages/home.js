// ═══ Home / Landing page ═══
import { getAllStories, getChapters, getPanels, getAllProgress } from '../db.js';
import { html, $, $$, on, navigate, timeAgo, estimateReadTime, genreColor, footerHtml } from '../app.js';

// Purple-only cover gradients (used when a story has no cover image)
const COVERS = [
  'linear-gradient(135deg,#5a2d9a,#8a50c8,#3d1870)',
  'linear-gradient(135deg,#6b3fa0,#9b6dd4,#4a2880)',
  'linear-gradient(135deg,#4a1878,#7a3aaa,#2e0e55)',
  'linear-gradient(135deg,#7a3090,#aa55bb,#5a1870)',
  'linear-gradient(135deg,#3d1870,#6a40a0,#2a0e55)',
  'linear-gradient(135deg,#8a3d7a,#bb60aa,#5a2050)',
  'linear-gradient(135deg,#552888,#8050b8,#381868)',
  'linear-gradient(135deg,#6a2070,#9a48a0,#481055)'
];
const cover = id => COVERS[(id || 0) % COVERS.length];
const coverBg = s => s.coverImage ? `url(${s.coverImage}) center/cover` : cover(s.id);

// Small delicate butterfly — two purple wings that gently flutter.
const BF_SVG = `
  <svg viewBox="0 0 40 34" fill="none">
    <g class="wing-l">
      <path d="M20,17 C13,4 3,1 2,11 C1,20 11,22 20,17 Z" fill="#cf5cf0" opacity="0.9"/>
      <path d="M20,17 C14,21 6,30 9,32 C13,33 17,24 20,17 Z" fill="#9b1fd0" opacity="0.8"/>
    </g>
    <g class="wing-r">
      <path d="M20,17 C27,4 37,1 38,11 C39,20 29,22 20,17 Z" fill="#cf5cf0" opacity="0.9"/>
      <path d="M20,17 C26,21 34,30 31,32 C27,33 23,24 20,17 Z" fill="#9b1fd0" opacity="0.8"/>
    </g>
    <ellipse cx="20" cy="17" rx="1.2" ry="7" fill="#f5ecff"/>
  </svg>`;

const butterfliesHtml = () =>
  Array.from({ length: 10 }, (_, i) => `<div class="butterfly bf${i + 1}">${BF_SVG}</div>`).join('');

const LOGO = `
  <svg class="logo-bf-icon" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e07aff" /><stop offset="100%" stop-color="#8808c3" />
    </linearGradient></defs>
    <path d="M3 4C6 4 11 9 12 12C13 9 18 4 21 4C19 9 14 11 12 12C14 13 19 15 21 20C18 20 13 15 12 12C11 15 6 20 3 20C5 15 10 13 12 12C10 11 5 9 3 4Z" fill="url(#logoGrad)"/>
  </svg>`;

function greet() {
  const h = new Date().getHours();
  if (h < 6) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}

export async function renderHome() {
  // ─── Load data ───
  const [stories, progresses] = await Promise.all([getAllStories(), getAllProgress()]);

  // Chapter counts + flattened panels per story (for read-time estimate)
  const chapterCounts = {};
  const panelData = {};
  await Promise.all(stories.map(async s => {
    const chs = await getChapters(s.id);
    chapterCounts[s.id] = chs.length;
    const panelLists = await Promise.all(chs.map(ch => getPanels(ch.id)));
    panelData[s.id] = panelLists.flat();
  }));

  const latest = stories.slice(0, 5);
  const gridStories = stories.slice(0, 12);
  const hasMore = stories.length > 12;

  // Duplicate slider cards so the auto-scroll loop feels seamless
  const sliderCards = latest.length ? [...latest, ...latest, ...latest] : [];

  // Continue reading: most recent progress, unique stories, max 4
  const recentStories = [...new Set(
    progresses.sort((a, b) => b.lastReadAt - a.lastReadAt).map(p => Number(p.storyId))
  )]
    .map(id => stories.find(s => Number(s.id) === id))
    .filter(Boolean)
    .slice(0, 4);

  // ─── Render ───
  html('#app-view', `
    <div class="topbar" id="topbar">
      <div class="topbar-logo">${LOGO}<span class="logo-text">anstory</span></div>
      <div class="topbar-actions">
        <button class="btn-icon" id="btn-search" aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></button>
      </div>
    </div>

    <div class="search-overlay" id="search-overlay">
      <div class="search-header">
        <div class="search-bar">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="search-input" placeholder="Search stories..." autocomplete="off" />
        </div>
        <button class="search-close" id="btn-search-close">Cancel</button>
      </div>
      <div id="search-results" class="search-body">
        <div class="search-hint"><i class="fa-solid fa-magnifying-glass"></i>Type to search your stories</div>
      </div>
    </div>

    <div class="home-page">
      <div class="butterflies">${butterfliesHtml()}</div>

      <div class="hero" id="hero">
        <canvas class="hero-constellation" id="hero-constellation"></canvas>
        <div class="hero-ghost" aria-hidden="true">STORIES</div>
        <div class="hero-inner">
          <h1>Where stories<br>find their <em>light</em></h1>
          <p>Connect every fragment of your imagination</p>
        </div>
      </div>

      <div class="hc">
        <div class="greeting"><span>${greet()}, </span><strong>Storyteller</strong></div>
      </div>

      ${sliderCards.length ? `
      <div class="hc">
        <div class="slider-section">
          <div class="sec-label" style="margin-top:10px"><i class="fa-solid fa-bolt"></i> Latest stories</div>
          <div class="slider-track" id="slider-track">
            ${sliderCards.map(s => `
              <div class="slider-card" data-id="${s.id}" style="background:${coverBg(s)}">
                <div class="slider-card-info">
                  <h4>${s.title || 'Untitled'}</h4>
                  <span>${chapterCounts[s.id] || 0} ch · ${estimateReadTime(panelData[s.id])}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>` : ''}

      <div class="hc">
        ${recentStories.length ? `
        <div class="section-header" style="margin-top:10px">
          <span class="sec-label"><i class="fa-solid fa-clock-rotate-left"></i> Continue reading</span>
        </div>
        <div class="continue-grid">
          ${recentStories.map(s => {
            const prog = progresses.find(p => Number(p.storyId) === Number(s.id));
            const pct = prog?.scrollPercent || 0;
            return `
            <div class="continue-card" data-id="${s.id}" ${prog ? `data-chapter="${prog.chapterId}"` : ''}>
              <div class="continue-thumb" style="background:${coverBg(s)}"></div>
              <div class="continue-info">
                <h4 class="continue-title">${s.title || 'Untitled'}</h4>
                <div class="continue-meta">
                  <span style="color:var(--accent)"><i class="fa-solid fa-book-open-reader"></i> Resume</span>
                  <span style="opacity:.5">·</span>
                  <span>${pct}% read</span>
                </div>
                <div class="continue-progress-bg"><div class="continue-progress-bar" style="width:${pct}%"></div></div>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

        ${gridStories.length ? `
        <div class="section-header" style="margin-top:10px">
          <span class="sec-label"><i class="fa-solid fa-book-open"></i> Library</span>
          <span class="section-count">${stories.length} stories</span>
        </div>
        <div class="lib-grid" id="lib-grid">
          ${gridStories.map(libCard).join('')}
        </div>
        ${hasMore ? '<button class="btn-see-all" id="btn-see-all"><i class="fa-solid fa-chevron-down"></i> See all stories</button>' : ''}
        ` : `
        <div class="empty-state">
          <i class="fa-solid fa-book-open"></i>
          <h3>No stories yet</h3>
          <p>Your published stories will appear here</p>
        </div>`}

        ${footerHtml()}
        <div style="height:80px"></div>
      </div>
    </div>
  `);

  // Card builder (shared by initial render + "see all")
  function libCard(s) {
    const gc = genreColor(s.genre || 'Thoughts');
    return `
      <div class="lib-card" data-id="${s.id}">
        <div class="lib-cover" style="background:${coverBg(s)}"></div>
        <div class="lib-tag" style="background:${gc.bg};color:${gc.color}">${s.genre || 'Story'}</div>
        ${s.status === 'draft' ? '<div class="lib-draft">Draft</div>' : ''}
        <div class="lib-info">
          <h4 class="lib-title">${s.title || 'Untitled'}</h4>
          <div class="lib-stat">
            <span><i class="fa-regular fa-clock"></i> ${estimateReadTime(panelData[s.id])}</span>
            <span>${timeAgo(s.updatedAt || Date.now())}</span>
          </div>
        </div>
      </div>`;
  }

  bindEvents();

  // ─── Events ───
  function bindEvents() {
    // Topbar glass-on-scroll
    const appView = $('#app-view');
    const topbar = $('#topbar');
    appView.addEventListener('scroll', () => {
      topbar.classList.toggle('scrolled', appView.scrollTop > 30);
    }, { passive: true });

    initSlider();
    initSearch();
    initConstellation();

    // Parallax: ghost text drifts subtly as the page scrolls
    const ghost = $('.hero-ghost');
    if (ghost) {
      appView.addEventListener('scroll', () => {
        const y = appView.scrollTop;
        if (y < 600) ghost.style.transform = `translate(-50%, ${-50 + y * 0.08}%)`;
      }, { passive: true });
    }

    // Card navigation
    $$('.continue-card').forEach(el => on(el, 'click', () => {
      if (el.dataset.chapter) navigate(`/read/${el.dataset.id}/${el.dataset.chapter}`);
      else navigate(`/story/${el.dataset.id}`);
    }));
    $$('.lib-card, .slider-card').forEach(el => on(el, 'click', () => {
      if (el.dataset.id) navigate(`/story/${el.dataset.id}`);
    }));

    // See all
    on('#btn-see-all', 'click', () => {
      const grid = $('#lib-grid');
      stories.slice(12).forEach(s => grid.insertAdjacentHTML('beforeend', libCard(s)));
      $$('#lib-grid .lib-card').forEach(el => {
        el.onclick = () => navigate(`/story/${el.dataset.id}`);
      });
      $('#btn-see-all').remove();
    });
  }

  // ─── Slider: infinite auto-scroll, pauses on interaction ───
  function initSlider() {
    const track = $('#slider-track');
    if (!track || track.children.length < 2) return;

    let running = true;
    let resumeTimer;

    function step() {
      if (running) {
        track.scrollLeft += 0.5;
        const first = track.firstElementChild;
        const cardW = first.offsetWidth + 12; // card width + gap
        if (track.scrollLeft >= cardW) {
          track.appendChild(first);       // recycle first card to the end
          track.scrollLeft -= cardW;      // keep visual position
        }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    const pause = () => { running = false; clearTimeout(resumeTimer); };
    const resume = () => { resumeTimer = setTimeout(() => { running = true; }, 1500); };
    track.addEventListener('pointerenter', pause);
    track.addEventListener('pointerleave', resume);
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('touchend', resume);
  }

  // ─── Search ───
  function initSearch() {
    const overlay = $('#search-overlay');
    const input = $('#search-input');
    const results = $('#search-results');
    const hint = '<div class="search-hint"><i class="fa-solid fa-magnifying-glass"></i>Type to search your stories</div>';

    on('#btn-search', 'click', () => {
      overlay.classList.add('active');
      setTimeout(() => input.focus(), 200);
    });
    on('#btn-search-close', 'click', () => {
      overlay.classList.remove('active');
      input.value = '';
      results.innerHTML = hint;
    });

    on(input, 'input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q) { results.innerHTML = hint; return; }
      const matches = stories.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.genre || '').toLowerCase().includes(q)
      );
      results.innerHTML = matches.length
        ? matches.map(s => `
            <div class="search-item" data-id="${s.id}">
              <div class="search-thumb" style="background:${coverBg(s)}"></div>
              <div>
                <div class="search-item-title">${s.title}</div>
                <div class="search-item-genre">${s.genre || 'Story'} · ${chapterCounts[s.id] || 0} chapters</div>
              </div>
            </div>`).join('')
        : '<div class="search-empty"><i class="fa-solid fa-face-meh" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>No stories found</div>';
      $$('.search-item').forEach(el => on(el, 'click', () => {
        overlay.classList.remove('active');
        navigate(`/story/${el.dataset.id}`);
      }));
    });
  }

  // ─── Constellation: floating glowing points linked by thin lines ───
  function initConstellation() {
    const canvas = $('#hero-constellation');
    const hero = $('#hero');
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');

    let w, h, points, raf;
    const COUNT = 26;          // number of stars
    const LINK_DIST = 110;     // max distance to draw a link
    const mouse = { x: -999, y: -999 };

    function resize() {
      const rect = hero.getBoundingClientRect();
      w = canvas.width = rect.width * devicePixelRatio;
      h = canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    function makePoints() {
      const rect = hero.getBoundingClientRect();
      points = Array.from({ length: COUNT }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.8
      }));
    }

    function draw() {
      const rect = hero.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const p of points) {
        // drift
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > rect.width) p.vx *= -1;
        if (p.y < 0 || p.y > rect.height) p.vy *= -1;

        // gentle pull toward the cursor for a living feel
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const md = Math.hypot(dx, dy);
        if (md < 120) { p.x += dx * 0.004; p.y += dy * 0.004; }

        // glowing star
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 122, 255, 0.9)';
        ctx.shadowColor = 'rgba(224, 122, 255, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // links
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(184, 32, 232, ${0.18 * (1 - d / LINK_DIST)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
        // link to cursor
        const cd = Math.hypot(points[i].x - mouse.x, points[i].y - mouse.y);
        if (cd < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(224, 122, 255, ${0.3 * (1 - cd / LINK_DIST)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    function onMove(e) {
      const rect = hero.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      mouse.x = t.clientX - rect.left;
      mouse.y = t.clientY - rect.top;
    }
    function onLeave() { mouse.x = -999; mouse.y = -999; }

    resize();
    makePoints();
    draw();

    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('touchmove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); makePoints(); draw(); });
  }
}