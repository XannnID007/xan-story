import { getStory, getChapter, getPanels, saveProgress } from '../db.js';
import { html, $, on, navigate } from '../app.js';

export async function renderReader(params) {
  const storyId = parseInt(params.storyId);
  const chapterId = parseInt(params.chapterId);

  const story = await getStory(storyId);
  const chapter = await getChapter(chapterId);
  const chapters = await getChapters(storyId);
  const panels = await getPanels(chapterId);

  if (!story || !chapter) { navigate('/'); return; }

  const chIdx = chapters.findIndex(c => c.id === chapterId);
  const prevCh = chIdx > 0 ? chapters[chIdx - 1] : null;
  const nextCh = chIdx < chapters.length - 1 ? chapters[chIdx + 1] : null;

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
        ${panels.map(p => renderPanel(p)).join('')}

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

        ${nextCh ? `
          <button class="btn-primary btn-next-chapter" id="btn-next-ch">
            Next: ${nextCh.title} <i class="fa-solid fa-arrow-right"></i>
          </button>
        ` : `
          <div class="reader-end-finish">You've reached the end of this story.</div>
        `}

        <div class="reader-chapter-nav">
          ${prevCh ? `<button class="btn-secondary btn-sm" id="btn-prev-ch"><i class="fa-solid fa-chevron-left"></i> Prev</button>` : ''}
          <button class="btn-secondary btn-sm" id="btn-all-ch">All chapters</button>
          ${nextCh ? `<button class="btn-secondary btn-sm" id="btn-next-ch2">Next <i class="fa-solid fa-chevron-right"></i></button>` : ''}
        </div>
      </div>
      ` : ''}
    </div>
  `);

  // ─── Scroll tracking ───
  const readerPage = $('#reader-page');
  let ticking = false;
  let headerVisible = true;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const el = readerPage;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0;

      const bar = $('#progress-bar');
      if (bar) bar.style.width = pct + '%';

      // Auto-hide header on scroll down
      const header = $('#reader-header');
      if (header) {
        if (scrollTop > 100 && headerVisible) {
          header.classList.add('hidden');
          headerVisible = false;
        } else if (scrollTop <= 100 && !headerVisible) {
          header.classList.remove('hidden');
          headerVisible = true;
        }
      }

      ticking = false;
    });
  }

  readerPage.addEventListener('scroll', onScroll);

  // Save progress periodically
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const el = readerPage;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? Math.round((el.scrollTop / scrollHeight) * 100) : 0;
      saveProgress(storyId, chapterId, pct);
    }, 2000);
  }
  readerPage.addEventListener('scroll', scheduleSave);

  // Tap to toggle header
  on('#reader-content', 'click', (e) => {
    if (e.target.closest('button')) return;
    const header = $('#reader-header');
    if (header) header.classList.toggle('hidden');
    headerVisible = !header.classList.contains('hidden');
  });

  // ─── Navigation events ───
  on('#btn-rd-back', 'click', () => navigate(`/story/${storyId}`));
  on('#btn-rd-edit', 'click', () => navigate(`/edit/${storyId}/${chapterId}`));

  if ($('#btn-go-edit')) on('#btn-go-edit', 'click', () => navigate(`/edit/${storyId}/${chapterId}`));
  if ($('#btn-next-ch')) on('#btn-next-ch', 'click', () => navigate(`/read/${storyId}/${nextCh.id}`));
  if ($('#btn-next-ch2')) on('#btn-next-ch2', 'click', () => navigate(`/read/${storyId}/${nextCh.id}`));
  if ($('#btn-prev-ch')) on('#btn-prev-ch', 'click', () => navigate(`/read/${storyId}/${prevCh.id}`));
  if ($('#btn-all-ch')) on('#btn-all-ch', 'click', () => navigate(`/story/${storyId}`));

  // Cleanup
  return () => {
    clearTimeout(saveTimer);
    const el = readerPage;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    const pct = scrollHeight > 0 ? Math.round((el.scrollTop / scrollHeight) * 100) : 0;
    saveProgress(storyId, chapterId, pct);
  };
}

function renderPanel(panel) {
  switch (panel.type) {
    case 'scene':
      if (panel.content && panel.content.startsWith('data:')) {
        return `<div class="rd-panel rd-scene"><img src="${panel.content}" alt="Scene" loading="lazy" /></div>`;
      }
      return `<div class="rd-panel rd-scene rd-scene-empty"><div class="rd-scene-placeholder"><i class="fa-solid fa-image"></i></div></div>`;

    case 'narration':
      return `<div class="rd-panel rd-narration"><p>${formatText(panel.content)}</p></div>`;

    case 'dialogue':
      return `
        <div class="rd-panel rd-dialogue">
          ${panel.characterName ? `<div class="rd-char-name">${panel.characterName}</div>` : ''}
          <div class="rd-dialogue-bubble"><p>"${formatText(panel.content)}"</p></div>
        </div>`;

    case 'divider':
      return `<div class="rd-panel rd-divider"><span>· · ·</span></div>`;

    default:
      return `<div class="rd-panel rd-narration"><p>${formatText(panel.content)}</p></div>`;
  }
}

function formatText(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}