// ═══ Reader — webtoon-style vertical scroll ═══
import { getStory, getChapter, getChapters, getPanels, saveProgress } from '../db.js';
import { html, $, on, navigate, footerHtml } from '../app.js';

export async function renderReader(params) {
  const storyId   = parseInt(params.storyId);
  const chapterId = parseInt(params.chapterId);

  const [story, chapter, chapters, panels] = await Promise.all([
    getStory(storyId),
    getChapter(chapterId),
    getChapters(storyId),
    getPanels(chapterId)
  ]);

  if (!story || !chapter) { navigate('/'); return; }

  const chIdx  = chapters.findIndex(c => c.id === chapterId);
  const prevCh = chIdx > 0 ? chapters[chIdx - 1] : null;
  const nextCh = chIdx >= 0 && chIdx < chapters.length - 1 ? chapters[chIdx + 1] : null;

  html('#app-view', `
    <div class="reader-page" id="reader-page">
      <div class="reader-progress"><div class="reader-progress-bar" id="progress-bar"></div></div>

      <div class="reader-header" id="reader-header">
        <button class="btn-icon" id="btn-rd-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="reader-header-center">
          <div class="reader-story-title">${story.title}</div>
          <div class="reader-chapter-title">${chapter.title}</div>
        </div>
        <button class="btn-icon" id="btn-rd-edit"><i class="fa-solid fa-pencil"></i></button>
      </div>

      <div class="reader-content" id="reader-content">
        ${panels.map(renderPanel).join('')}
        ${panels.length === 0 ? `
          <div class="reader-empty">
            <i class="fa-solid fa-book-open"></i>
            <p>This chapter is empty.</p>
            <button class="btn-primary" id="btn-go-edit">
              <i class="fa-solid fa-pencil"></i> Start writing
            </button>
          </div>
        ` : ''}
      </div>

      ${panels.length > 0 ? `
      <div class="reader-end">
        <div class="reader-end-mark">· · ·</div>
        <div class="reader-end-label">End of ${chapter.title}</div>
        ${nextCh
          ? `<button class="btn-primary btn-next-chapter" id="btn-next-ch">
               Next: ${nextCh.title} <i class="fa-solid fa-arrow-right"></i>
             </button>`
          : `<div class="reader-end-finish">You've reached the end of this story.</div>`}
        <div class="reader-chapter-nav">
          ${prevCh ? `<button class="btn-secondary btn-sm" id="btn-prev-ch"><i class="fa-solid fa-chevron-left"></i> Prev</button>` : ''}
          <button class="btn-secondary btn-sm" id="btn-all-ch">All chapters</button>
          ${nextCh ? `<button class="btn-secondary btn-sm" id="btn-next-ch2">Next <i class="fa-solid fa-chevron-right"></i></button>` : ''}
        </div>
      </div>
      ` : ''}

      <div style="max-width:700px;margin:0 auto;padding:0 20px">${footerHtml()}</div>

      <!-- Exit popup -->
      <div class="rd-exit-popup" id="rd-exit-popup">
        <div class="rd-exit-popup-card">
          <h4>Keluar dari chapter ini?</h4>
          <p>Progress terakhirmu sudah tersimpan otomatis saat membaca.</p>
          <div class="rd-exit-actions">
            <button class="btn-primary" id="btn-exit-save">
              <i class="fa-solid fa-floppy-disk"></i> Simpan & Keluar
            </button>
            <button class="btn-secondary" id="btn-exit-nosave">Keluar saja</button>
          </div>
        </div>
      </div>
    </div>
  `);

  const readerPage = $('#reader-page');

  // Apply chapter background image (set by admin in editor)
  if (chapter.bgImage) {
    readerPage.style.backgroundImage =
      `linear-gradient(rgba(10,4,16,0.88), rgba(10,4,16,0.88)), url(${chapter.bgImage})`;
    readerPage.style.backgroundSize     = 'auto, cover';
    readerPage.style.backgroundPosition = 'center, center';
  }

  // ─── Scroll: progress bar + auto-hide header ───
  let ticking = false;
  readerPage.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = readerPage.scrollHeight - readerPage.clientHeight;
      const pct = max > 0 ? Math.min(100, (readerPage.scrollTop / max) * 100) : 0;
      const bar = $('#progress-bar');
      if (bar) bar.style.width = pct + '%';
      const header = $('#reader-header');
      if (header) header.classList.toggle('hidden', readerPage.scrollTop > 100);
      ticking = false;
    });
  }, { passive: true });

  // ─── Auto-save progress (debounced 2s) ───
  let saveTimer = null;
  const currentPct = () => {
    const max = readerPage.scrollHeight - readerPage.clientHeight;
    return max > 0 ? Math.round((readerPage.scrollTop / max) * 100) : 0;
  };
  readerPage.addEventListener('scroll', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveProgress(storyId, chapterId, currentPct()), 2000);
  }, { passive: true });

  // Tap content area to toggle header visibility
  on('#reader-content', 'click', e => {
    if (e.target.closest('button')) return;
    $('#reader-header')?.classList.toggle('hidden');
  });

  // ─── Back button — custom exit popup ───
  on('#btn-rd-back', 'click', () => {
    $('#rd-exit-popup').classList.add('active');
  });
  on('#btn-exit-save', 'click', async () => {
    clearTimeout(saveTimer);
    await saveProgress(storyId, chapterId, currentPct());
    navigate(`/story/${storyId}`);
  });
  on('#btn-exit-nosave', 'click', () => navigate(`/story/${storyId}`));
  on('#rd-exit-popup', 'click', e => {
    if (e.target === e.currentTarget) $('#rd-exit-popup').classList.remove('active');
  });

  // ─── Other navigation ───
  on('#btn-rd-edit', 'click',   () => navigate(`/edit/${storyId}/${chapterId}`));
  if ($('#btn-go-edit'))  on('#btn-go-edit',  'click', () => navigate(`/edit/${storyId}/${chapterId}`));
  if ($('#btn-next-ch'))  on('#btn-next-ch',  'click', () => navigate(`/read/${storyId}/${nextCh.id}`));
  if ($('#btn-next-ch2')) on('#btn-next-ch2', 'click', () => navigate(`/read/${storyId}/${nextCh.id}`));
  if ($('#btn-prev-ch'))  on('#btn-prev-ch',  'click', () => navigate(`/read/${storyId}/${prevCh.id}`));
  if ($('#btn-all-ch'))   on('#btn-all-ch',   'click', () => navigate(`/story/${storyId}`));

  // Cleanup: save progress on navigate away
  return () => {
    clearTimeout(saveTimer);
    saveProgress(storyId, chapterId, currentPct());
  };
}

// ─── Panel renderer ───
function renderPanel(panel) {
  const text     = panel.text ?? panel.content ?? '';
  const image    = panel.image ?? (typeof panel.content === 'string' && panel.content.startsWith('data:') ? panel.content : null);
  const charName = panel.character ?? panel.characterName ?? '';

  switch (panel.type) {
    case 'image':
    case 'scene': {
      if (!image) {
        return `<div class="rd-panel rd-scene rd-scene-empty"><div class="rd-scene-placeholder"><i class="fa-solid fa-image"></i></div></div>`;
      }
      const sizeMap  = { small: '40%', medium: '65%', full: '100%' };
      const w        = sizeMap[panel.imageSize] || '100%';
      const frame    = panel.imageFrame || 'none';
      const imgStyle = `width:${w};display:block;margin:0 auto;`;
      return `<div class="rd-panel rd-scene rd-img-frame-${frame}">
        <img src="${image}" alt="Scene" loading="lazy" style="${imgStyle}" />
      </div>`;
    }

    case 'dialogue':
      return `
        <div class="rd-panel rd-dialogue">
          ${charName ? `<div class="rd-char-name">${escapeHtml(charName)}</div>` : ''}
          <div class="rd-dialogue-bubble"><p>"${sanitizeAndFormat(text)}"</p></div>
        </div>`;

    case 'divider':
      return `<div class="rd-panel rd-divider"><span>· · ·</span></div>`;

    default: { // narration
      const style = panel.narrateStyle || 'classic';
      return `<div class="rd-panel rd-narration style-${style}"><p>${sanitizeAndFormat(text)}</p></div>`;
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Escape everything, then restore only allowed tags: <b> <em> <u> <br> <p>
function sanitizeAndFormat(text) {
  if (!text) return '';
  let s = escapeHtml(text);
  s = s
    .replace(/&lt;b&gt;/gi,          '<b>').replace(/&lt;\/b&gt;/gi,   '</b>')
    .replace(/&lt;em&gt;/gi,         '<em>').replace(/&lt;\/em&gt;/gi, '</em>')
    .replace(/&lt;u&gt;/gi,          '<u>').replace(/&lt;\/u&gt;/gi,   '</u>')
    .replace(/&lt;br\s*\/?&gt;/gi,   '<br>')
    .replace(/&lt;p&gt;/gi,          '<p>').replace(/&lt;\/p&gt;/gi,   '</p>');
  s = s.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  return s;
}
