import { getAllStories, getChapters, getPanels, getAllProgress, seedDemoData } from '../db.js';
import { html, $, $$, on, navigate, timeAgo, estimateReadTime, genreColor } from '../app.js';
import { checkAdminStatus } from '../db.js';

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
const cover = id => COVERS[id % COVERS.length];

const BF = `<svg viewBox="0 0 40 30" fill="none"><g class="wing"><path d="M20 15C14 8 4 2 2 10C0 18 10 22 20 15Z" fill="#9b6dd4" opacity=".55"/><path d="M20 15C26 8 36 2 38 10C40 18 30 22 20 15Z" fill="#9b6dd4" opacity=".55"/><path d="M20 15C16 18 8 26 12 28C16 30 18 22 20 15Z" fill="#c9a8ff" opacity=".4"/><path d="M20 15C24 18 32 26 28 28C24 30 22 22 20 15Z" fill="#c9a8ff" opacity=".4"/></g></svg>`;

// SVG Khusus untuk huruf X pada Logo
const LOGO_X_BF = `
  <svg class="logo-bf-icon" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c9a8ff" />
        <stop offset="100%" stop-color="#9b6dd4" />
      </linearGradient>
    </defs>
    <path d="M3 4C6 4 11 9 12 12C13 9 18 4 21 4C19 9 14 11 12 12C14 13 19 15 21 20C18 20 13 15 12 12C11 15 6 20 3 20C5 15 10 13 12 12C10 11 5 9 3 4Z" fill="url(#logoGrad)"/>
  </svg>
`;

function greet() {
  const h = new Date().getHours();
  if (h < 6) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}

export async function renderHome() {
  checkAdminStatus((isAdmin) => {
  if (isAdmin) {
    // Cari elemen di mana kamu ingin tombol admin muncul
    // Misalnya menambahkan tombol "Create Story" khusus admin
    const hero = $('.hero');
    if (hero && !$('#btn-admin-new')) {
       hero.insertAdjacentHTML('beforeend', `<button id="btn-admin-new" class="btn-primary" style="margin-top:10px;">Admin: Create New Story</button>`);
       on('#btn-admin-new', 'click', () => navigate('/new'));
    }
  }
});
  await seedDemoData();
  const stories = await getAllStories() || [];
  const progresses = await getAllProgress() || [];

  const chapterCounts = {};
  const panelData = {};
  
  for (const s of stories) {
    const chs = await getChapters(s.id) || [];
    chapterCounts[s.id] = chs.length;
    let panels = [];
    for (const ch of chs) {
      const p = await getPanels(ch.id) || [];
      panels = panels.concat(p);
    }
    panelData[s.id] = panels;
  }

  const latest = stories.slice(0, 5);
  const gridStories = stories.slice(0, 10);
  const hasMore = stories.length > 10;

  // Agar desktop selalu loop, kita gandakan datanya minimal 3x ke dalam array baru
  let sliderCardsData = [];
  if (latest.length > 0) {
    sliderCardsData = [...latest, ...latest, ...latest, ...latest]; 
  }

  const sortedProgress = progresses.sort((a, b) => b.lastReadAt - a.lastReadAt);
  let uniqueStoryIds = [...new Set(sortedProgress.map(p => Number(p.storyId)))].slice(0, 4);
  
  if (uniqueStoryIds.length === 0 && stories.length > 0) {
    uniqueStoryIds = [Number(stories[0].id)]; 
  }
  const recentStories = uniqueStoryIds.map(id => stories.find(s => Number(s.id) === id)).filter(Boolean);

  const libraryCardsHTML = gridStories.map(s => {
    const gc = genreColor(s.genre || 'Thoughts');
    const bgStr = s.coverImage ? `url(${s.coverImage}) center/cover` : cover(s.id || 0);
    const draftTag = s.status === 'draft' ? '<div class="lib-draft">Draft</div>' : '';
    const readTime = estimateReadTime(panelData[s.id] || []);
    const updateTime = timeAgo(s.updatedAt || Date.now());

    return `
      <div class="lib-card" data-id="${s.id}">
        <div class="lib-cover" style="background:${bgStr}"></div>
        <div class="lib-tag" style="background:${gc.bg};color:${gc.color}">${s.genre || 'Story'}</div>
        ${draftTag}
        <div class="lib-info">
          <h4 class="lib-title">${s.title || 'Untitled'}</h4>
          <div class="lib-stat">
            <span><i class="fa-regular fa-clock"></i> ${readTime}</span>
            <span>${updateTime}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  html('#app-view', `
    <div class="home-page">
      <div class="butterflies">
        <div class="butterfly bf1">${BF}</div>
        <div class="butterfly bf2">${BF}</div>
        <div class="butterfly bf3">${BF}</div>
        <div class="butterfly bf4">${BF}</div>
        <div class="butterfly bf5">${BF}</div>
        <div class="butterfly bf6">${BF}</div>
        <div class="butterfly bf7">${BF}</div>
        <div class="butterfly bf8">${BF}</div>
        <div class="butterfly bf9">${BF}</div>
        <div class="butterfly bf10">${BF}</div>
        <div class="butterfly bf11">${BF}</div>
        <div class="butterfly bf12">${BF}</div>
      </div>

      <div class="topbar" id="topbar" style="position: sticky; top: 0; z-index: 100;">
        <div class="topbar-logo">
          ${LOGO_X_BF}<span class="logo-text">anstory</span>
        </div>
        <div class="topbar-actions">
          <button class="btn-icon" id="btn-search"><i class="fa-solid fa-magnifying-glass"></i></button>
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

      <div class="hero">
        <div class="hero-line"></div>
        <h1>Where stories come alive</h1>
        <p>A place to express your thoughts through beautiful visual storytelling</p>
      </div>

      <div class="hc">
        <div class="greeting"><span>${greet()}, </span><strong>Storyteller</strong></div>
      </div>

      ${sliderCardsData.length > 0 ? `
      <div class="hc">
        <div class="slider-section">
          <div class="sec-label"><i class="fa-solid fa-bolt"></i> Latest stories</div>
          <div class="slider-track" id="slider-track">
            ${sliderCardsData.map(s => `
              <div class="slider-card" data-id="${s.id}" style="background:${s.coverImage ? `url(${s.coverImage}) center/cover` : cover(s.id || 0)}">
                <div class="slider-card-info">
                  <h4>${s.title || 'Untitled'}</h4>
                  <span>${chapterCounts[s.id] || 0} ch · ${estimateReadTime(panelData[s.id] || [])}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      ` : ''}

      ${recentStories.length > 0 ? `
      <div class="hc" style="margin-top: 10px; margin-bottom: 24px;">
        <div class="section-header">
          <span class="sec-label" style="padding:0; margin:0;"><i class="fa-solid fa-clock-rotate-left"></i> Continue Reading</span>
        </div>
        <div class="continue-grid">
          ${recentStories.map(s => {
            const prog = progresses.find(p => Number(p.storyId) === Number(s.id));
            const pct = prog && prog.scrollPercent ? prog.scrollPercent : 0;
            
            return `
            <div class="continue-card" data-id="${s.id}" ${prog ? `data-chapter="${prog.chapterId}"` : ''}>
              <div class="continue-thumb" style="background:${s.coverImage ? `url(${s.coverImage}) center/cover` : cover(s.id || 0)}"></div>
              <div class="continue-info">
                <h4 class="continue-title">${s.title || 'Untitled'}</h4>
                <div class="continue-meta">
                  <span style="color: var(--accent);"><i class="fa-solid fa-book-open-reader"></i> Resume</span>
                  <span style="opacity: 0.5;">·</span>
                  <span>Chapter ${prog ? prog.chapterId : 1}</span>
                </div>
                <div class="continue-progress-bg">
                  <div class="continue-progress-bar" style="width: ${pct}%;"></div>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <div class="hc">
        ${gridStories.length > 0 ? `
        <div class="section-header">
          <span class="sec-label" style="padding:0; margin:0;"><i class="fa-solid fa-book-open"></i> Library</span>
          <span class="section-count">${stories.length} stories</span>
        </div>
        <div class="lib-grid">
          ${libraryCardsHTML}
        </div>
        ${hasMore ? '<button class="btn-see-all" id="btn-see-all"><i class="fa-solid fa-chevron-down"></i> See all stories</button>' : ''}
        ` : `
        <div class="empty-state">
          <i class="fa-solid fa-book-open"></i>
          <h3>No stories yet</h3>
          <p>Start writing your first story</p>
          <button class="btn-primary" id="btn-empty-new"><i class="fa-solid fa-plus"></i> Create story</button>
        </div>
        `}

        <div class="footer">
          <div class="footer-logo">
             ${LOGO_X_BF}<span class="logo-text">anstory</span>
          </div>
          <div class="footer-tagline">Every thought deserves to be told</div>
          <div class="footer-social">
            <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="TikTok"><i class="fa-brands fa-tiktok"></i></a>
            <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
          </div>
          <div class="footer-copy">© 2026 xanstory. Made with love.</div>
        </div>
        <div style="height:80px"></div>
      </div>
    </div>
  `);

  const appView = document.getElementById('app-view');
  const topbar = document.getElementById('topbar');
  
  appView.addEventListener('scroll', () => {
    if (appView.scrollTop > 30) {
      topbar.classList.add('scrolled');
    } else {
      topbar.classList.remove('scrolled');
    }
  }, { passive: true });

  const track = document.getElementById('slider-track');
  if (track && track.children.length > 1) {
    track.style.scrollSnapType = 'none';

    let scrolling = true;
    let speed = 0.5;

    function autoScroll() {
      if (scrolling && track && track.children.length > 0) {
        track.scrollLeft += speed;
        
        const firstChild = track.firstElementChild;
        const secondChild = firstChild.nextElementSibling;
        const cardWidth = secondChild ? (secondChild.offsetLeft - firstChild.offsetLeft) : (firstChild.offsetWidth + 14);

        if (track.scrollLeft >= cardWidth) {
          track.appendChild(firstChild);
          track.scrollLeft -= cardWidth;
        }
      }
      requestAnimationFrame(autoScroll);
    }
    
    requestAnimationFrame(autoScroll);

    let pauseTimer;
    const pause = () => { scrolling = false; clearTimeout(pauseTimer); };
    const resume = () => { pauseTimer = setTimeout(() => { scrolling = true; }, 1500); };

    track.addEventListener('pointerdown', pause);
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('pointerup', resume);
    track.addEventListener('touchend', resume);
    track.addEventListener('mouseleave', resume);
  }

  on('#btn-search', 'click', () => {
    $('#search-overlay').classList.add('active');
    setTimeout(() => $('#search-input').focus(), 200);
  });
  on('#btn-search-close', 'click', closeSearch);
  
  function closeSearch() {
    $('#search-overlay').classList.remove('active');
    $('#search-input').value = '';
    html('#search-results', '<div class="search-hint"><i class="fa-solid fa-magnifying-glass"></i>Type to search your stories</div>');
  }
  
  on('#search-input', 'input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      html('#search-results', '<div class="search-hint"><i class="fa-solid fa-magnifying-glass"></i>Type to search your stories</div>');
      return;
    }
    const m = stories.filter(s => s.title.toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q) || s.genre.toLowerCase().includes(q));
    if (m.length) {
      html('#search-results', m.map(s => `
        <div class="search-item" data-id="${s.id}">
          <div class="search-thumb" style="background:${s.coverImage ? `url(${s.coverImage}) center/cover` : cover(s.id || 0)}"></div>
          <div>
            <div class="search-item-title">${s.title}</div>
            <div class="search-item-genre">${s.genre || 'Story'} · ${chapterCounts[s.id]||0} chapters</div>
          </div>
        </div>`).join(''));
      $$('.search-item').forEach(el => on(el, 'click', () => { closeSearch(); navigate(`/story/${el.dataset.id}`); }));
    } else {
      html('#search-results', '<div class="search-empty"><i class="fa-solid fa-face-meh" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>No stories found</div>');
    }
  });

  $$('.continue-card').forEach(el => on(el, 'click', () => { 
    if (el.dataset.chapter) navigate(`/read/${el.dataset.id}/${el.dataset.chapter}`);
    else if (el.dataset.id) navigate(`/story/${el.dataset.id}`);
  }));
  
  $$('.lib-card, .slider-card').forEach(el => on(el, 'click', () => { 
    if (el.dataset.id) navigate(`/story/${el.dataset.id}`); 
  }));
  
  on('#btn-empty-new', 'click', () => navigate('/new'));

  if ($('#btn-see-all')) {
    on('#btn-see-all', 'click', () => {
      const rest = stories.slice(10);
      const grid = $('.lib-grid'); 
      
      rest.forEach(s => {
        const gc = genreColor(s.genre || 'Thoughts');
        const card = document.createElement('div');
        card.className = 'lib-card';
        card.dataset.id = s.id;
        card.innerHTML = `
          <div class="lib-cover" style="background:${s.coverImage ? `url(${s.coverImage}) center/cover` : cover(s.id || 0)}"></div>
          <div class="lib-tag" style="background:${gc.bg};color:${gc.color}">${s.genre || 'Story'}</div>
          <div class="lib-info">
            <h4 class="lib-title">${s.title}</h4>
            <div class="lib-stat">
              <span><i class="fa-regular fa-clock"></i> ${estimateReadTime(panelData[s.id] || [])}</span>
              <span>${timeAgo(s.updatedAt || Date.now())}</span>
            </div>
          </div>`;
        card.addEventListener('click', () => navigate(`/story/${s.id}`));
        grid.appendChild(card);
      });
      $('#btn-see-all').remove();
    });
  }
}