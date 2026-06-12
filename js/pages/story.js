import { getStory, getChapters, getPanels, deleteStory, addChapter, updateStory, deleteChapter } from '../db.js';
import { html, $, $$, on, navigate, formatDate, estimateReadTime, genreColor, GENRES, imageToBase64, compressImage } from '../app.js';

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #2a1555, #4a2080, #1e1045)',
  'linear-gradient(135deg, #15284a, #1e4070, #0a1830)',
  'linear-gradient(135deg,#4a1878,#7a3aaa,#2e0e55)',
  'linear-gradient(135deg,#7a3090,#aa55bb,#5a1870)'
];

// SVG Kupu-Kupu
const BF = `<svg viewBox="0 0 40 30" fill="none"><g class="wing"><path d="M20 15C14 8 4 2 2 10C0 18 10 22 20 15Z" fill="#9b6dd4" opacity=".55"/><path d="M20 15C26 8 36 2 38 10C40 18 30 22 20 15Z" fill="#9b6dd4" opacity=".55"/><path d="M20 15C16 18 8 26 12 28C16 30 18 22 20 15Z" fill="#c9a8ff" opacity=".4"/><path d="M20 15C24 18 32 26 28 28C24 30 22 22 20 15Z" fill="#c9a8ff" opacity=".4"/></g></svg>`;

export async function renderStory(params) {
  const id = parseInt(params.id);
  const story = await getStory(id);
  if (!story) { navigate('/'); return; }

  const chapters = await getChapters(id) || [];
  const chapterPanels = {};
  for (const ch of chapters) {
    chapterPanels[ch.id] = await getPanels(ch.id) || [];
  }

  const gc = genreColor(story.genre || 'Thoughts');
  const coverBg = story.coverImage ? `url(${story.coverImage})` : COVER_GRADIENTS[id % COVER_GRADIENTS.length];

  html('#app-view', `
    <div class="story-page" id="story-page-view">
      
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

      <div class="story-topbar" id="story-topbar">
        <button class="btn-glass" id="btn-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div style="display:flex; gap:10px;">
          <button class="btn-glass" id="btn-edit-info" title="Edit Info"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn-glass" style="color: var(--danger); border-color: rgba(232,92,108,0.2);" id="btn-delete" title="Delete Story"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>

      <div class="story-cover-hero" style="background-image: ${coverBg}">
        <div class="story-cover-info">
          <div class="lib-tag" style="background:${gc.bg}; color:${gc.color}; margin-bottom:10px; display:inline-block; position:relative; right:auto; top:auto;">${story.genre || 'Story'}</div>
          <h1 class="story-title">${story.title || 'Untitled'}</h1>
          <p class="story-desc">${story.description || 'No description provided.'}</p>
          <div class="story-meta">
            <span><i class="fa-solid fa-layer-group"></i> ${chapters.length} Chapter${chapters.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>${story.status === 'draft' ? '<i class="fa-solid fa-pen-ruler"></i> Draft' : '<i class="fa-solid fa-globe"></i> Published'}</span>
            <span>·</span>
            <span>${formatDate(story.updatedAt || Date.now())}</span>
          </div>
        </div>
      </div>

      <div class="modal-overlay" id="edit-modal">
        <div class="modal">
          <div class="modal-header">
            <h3>Edit story info</h3>
            <button class="btn-icon" id="modal-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <label>Title</label>
            <input type="text" id="edit-title" value="${story.title}" />
            <label>Description</label>
            <textarea id="edit-desc" rows="3">${story.description || ''}</textarea>
            <label>Genre</label>
            <div class="genre-pills">
              ${GENRES.map(g => `<button class="genre-pill ${story.genre === g ? 'active' : ''}" data-genre="${g}">${g}</button>`).join('')}
            </div>
            <label>Cover image</label>
            <input type="file" id="edit-cover" accept="image/*" />
            <label>Status</label>
            <div class="status-toggle">
              <button class="status-btn ${story.status === 'draft' ? 'active' : ''}" data-status="draft">Draft</button>
              <button class="status-btn ${story.status === 'published' ? 'active' : ''}" data-status="published">Published</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="modal-cancel">Cancel</button>
            <button class="btn-primary" id="modal-save">Save</button>
          </div>
        </div>
      </div>

      <div class="chapters-container">
        <div class="ch-header">
          <h3>Chapters</h3>
          <button class="btn-primary btn-sm" id="btn-add-chapter" style="border-radius: 8px;"><i class="fa-solid fa-plus"></i> New Chapter</button>
        </div>

        <div class="ch-list">
          ${chapters.length === 0 ? `
            <div class="empty-state" style="padding: 40px 20px;">
              <i class="fa-solid fa-feather-pointed" style="opacity:0.3; margin-bottom:12px;"></i>
              <p style="margin:0;">No chapters yet. Start writing your story.</p>
            </div>
          ` : chapters.map((ch, index) => `
            <div class="ch-item" data-id="${ch.id}">
              <div class="ch-num">${String(index + 1).padStart(2, '0')}</div>
              <div class="ch-info">
                <div class="ch-title">${ch.title}</div>
                <div class="ch-meta">${(chapterPanels[ch.id] || []).length} panels · ${estimateReadTime(chapterPanels[ch.id] || [])}</div>
              </div>
              <div class="ch-actions">
                <button class="btn-icon-sm btn-read-ch" data-story="${id}" data-ch="${ch.id}" title="Read"><i class="fa-solid fa-book-open"></i></button>
                <button class="btn-icon-sm btn-edit-ch" data-story="${id}" data-ch="${ch.id}" title="Edit"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-icon-sm btn-del-ch" data-ch="${ch.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          `).join('')}
        </div>

        ${chapters.length > 0 ? `
        <div style="margin-top: 32px; text-align: center;">
          <button class="btn-primary" id="btn-read-first" style="padding: 12px 36px; border-radius: 12px; font-size: 14px;">
            <i class="fa-solid fa-book-open-reader"></i> Start Reading
          </button>
        </div>
        ` : ''}
      </div>

    </div>
  `);

  // Events
  on('#btn-back', 'click', () => navigate('/'));

  const pageView = document.getElementById('app-view');
  const topbar = document.getElementById('story-topbar');
  pageView.addEventListener('scroll', () => {
    if (pageView.scrollTop > 50) topbar.classList.add('scrolled');
    else topbar.classList.remove('scrolled');
  }, { passive: true });

  on('#btn-delete', 'click', async () => {
    if (confirm(`Delete "${story.title}"? This cannot be undone.`)) {
      await deleteStory(id);
      navigate('/');
    }
  });

  on('#btn-add-chapter', 'click', async () => {
    const chId = await addChapter(id);
    navigate(`/edit/${id}/${chId}`);
  });

  let editGenre = story.genre || 'Thoughts';
  let editStatus = story.status || 'draft';
  let editCoverData = null;

  on('#btn-edit-info', 'click', () => $('#edit-modal').classList.add('active'));
  on('#modal-close', 'click', () => $('#edit-modal').classList.remove('active'));
  on('#modal-cancel', 'click', () => $('#edit-modal').classList.remove('active'));

  $$('.genre-pill').forEach(el => {
    on(el, 'click', () => {
      $$('.genre-pill').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      editGenre = el.dataset.genre;
    });
  });

  $$('.status-btn').forEach(el => {
    on(el, 'click', () => {
      $$('.status-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      editStatus = el.dataset.status;
    });
  });

  on('#edit-cover', 'change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const b64 = await imageToBase64(file);
      editCoverData = await compressImage(b64, 800, 0.7);
    }
  });

  on('#modal-save', 'click', async () => {
    const title = $('#edit-title').value.trim();
    if (!title) return;
    const data = {
      title,
      description: $('#edit-desc').value.trim(),
      genre: editGenre,
      status: editStatus
    };
    if (editCoverData) data.coverImage = editCoverData;
    await updateStory(id, data);
    renderStory(params);
  });

  $$('.btn-read-ch').forEach(el => {
    on(el, 'click', (e) => {
      e.stopPropagation();
      navigate(`/read/${el.dataset.story}/${el.dataset.ch}`);
    });
  });

  $$('.btn-edit-ch').forEach(el => {
    on(el, 'click', (e) => {
      e.stopPropagation();
      navigate(`/edit/${el.dataset.story}/${el.dataset.ch}`);
    });
  });

  $$('.btn-del-ch').forEach(el => {
    on(el, 'click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this chapter?')) {
        await deleteChapter(parseInt(el.dataset.ch));
        renderStory(params);
      }
    });
  });

  $$('.ch-item').forEach(el => {
    on(el, 'click', () => {
      navigate(`/edit/${id}/${el.dataset.id}`);
    });
  });

  if ($('#btn-read-first')) {
    on('#btn-read-first', 'click', () => {
      if (chapters.length) navigate(`/read/${id}/${chapters[0].id}`);
    });
  }
}