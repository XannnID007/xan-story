// ═══ Reader — webtoon-style vertical scroll ═══
import { getStory, getChapter, getChapters, getPanels, saveProgress } from '../db.js';
import { html, $, on, navigate } from '../app.js';

export async function renderReader(params) {
  const storyId = parseInt(params.storyId);
  const chapterId = parseInt(params.chapterId);

  const [story, chapter, chapters, panels] = await Promise.all([
    getStory(storyId),
    getChapter(chapterId),
    getChapters(storyId),
    getPanels(chapterId)
  ]);

  if (!story || !chapter) { navigate('/'); return; }

  const chIdx = chapters.findIndex(c => c.id === chapterId);
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
    </div>
  `);

  // ─── Scroll: progress bar + auto-hide header ───
  const readerPage = $('#reader-page');
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

  // ─── Save progress (debounced) ───
  let saveTimer = null;
  const currentPct = () => {
    const max = readerPage.scrollHeight - readerPage.clientHeight;
    return max > 0 ? Math.round((readerPage.scrollTop / max) * 100) : 0;
  };
  readerPage.addEventListener('scroll', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveProgress(storyId, chapterId, currentPct()), 2000);
  }, { passive: true });

  // Tap content to toggle header
  on('#reader-content', 'click', e => {
    if (e.target.closest('button')) return;
    $('#reader-header')?.classList.toggle('hidden');
  });

  // ─── Navigation ───
  on('#btn-rd-back', 'click', () => navigate(`/story/${storyId}`));
  on('#btn-rd-edit', 'click', () => navigate(`/edit/${storyId}/${chapterId}`));
  if ($('#btn-go-edit')) on('#btn-go-edit', 'click', () => navigate(`/edit/${storyId}/${chapterId}`));
  if ($('#btn-next-ch')) on('#btn-next-ch', 'click', () => navigate(`/read/${storyId}/${nextCh.id}`));
  if ($('#btn-next-ch2')) on('#btn-next-ch2', 'click', () => navigate(`/read/${storyId}/${nextCh.id}`));
  if ($('#btn-prev-ch')) on('#btn-prev-ch', 'click', () => navigate(`/read/${storyId}/${prevCh.id}`));
  if ($('#btn-all-ch')) on('#btn-all-ch', 'click', () => navigate(`/story/${storyId}`));

  // Save progress on leave
  return () => {
    clearTimeout(saveTimer);
    saveProgress(storyId, chapterId, currentPct());
  };
}

// Supports both the current editor format (text/character/image)
// and the legacy format (content/characterName) for old data.
function renderPanel(panel) {
  const text = panel.text ?? panel.content ?? '';
  const image = panel.image ?? (typeof panel.content === 'string' && panel.content.startsWith('data:') ? panel.content : null);
  const charName = panel.character ?? panel.characterName ?? '';

  switch (panel.type) {
    case 'image':
    case 'scene':
      return image
        ? `<div class="rd-panel rd-scene"><img src="${image}" alt="Scene" loading="lazy" /></div>`
        : `<div class="rd-panel rd-scene rd-scene-empty"><div class="rd-scene-placeholder"><i class="fa-solid fa-image"></i></div></div>`;

    case 'dialogue':
      return `
        <div class="rd-panel rd-dialogue">
          ${charName ? `<div class="rd-char-name">${escapeHtml(charName)}</div>` : ''}
          <div class="rd-dialogue-bubble"><p>"${formatText(text)}"</p></div>
        </div>`;

    case 'divider':
      return `<div class="rd-panel rd-divider"><span>· · ·</span></div>`;

    default: // narration
      return `<div class="rd-panel rd-narration"><p>${formatText(text)}</p></div>`;
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatText(text) {
  if (!text) return '';
  return escapeHtml(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
}