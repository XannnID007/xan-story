// ═══ Story Detail — cover banner + chapter list ═══
import {
  getStory, getChapters, getPanels, deleteStory,
  addChapter, updateStory, deleteChapter, checkAdminStatus
} from '../db.js';
import {
  html, $, $$, on, navigate, formatDate, estimateReadTime,
  genreColor, GENRES, imageToBase64, compressImage, footerHtml
} from '../app.js';

const COVERS = [
  'linear-gradient(135deg,#5a2d9a,#8a50c8,#3d1870)',
  'linear-gradient(135deg,#6b3fa0,#9b6dd4,#4a2880)',
  'linear-gradient(135deg,#4a1878,#7a3aaa,#2e0e55)',
  'linear-gradient(135deg,#7a3090,#aa55bb,#5a1870)'
];
const BF = `<svg viewBox="0 0 40 34" fill="none"><g class="wing-l"><path d="M20,17 C13,4 3,1 2,11 C1,20 11,22 20,17 Z" fill="#cf5cf0" opacity="0.9"/><path d="M20,17 C14,21 6,30 9,32 C13,33 17,24 20,17 Z" fill="#9b1fd0" opacity="0.8"/></g><g class="wing-r"><path d="M20,17 C27,4 37,1 38,11 C39,20 29,22 20,17 Z" fill="#cf5cf0" opacity="0.9"/><path d="M20,17 C26,21 34,30 31,32 C27,33 23,24 20,17 Z" fill="#9b1fd0" opacity="0.8"/></g><ellipse cx="20" cy="17" rx="1.2" ry="7" fill="#f5ecff"/></svg>`;
const butterfliesHtml = () =>
  Array.from({ length: 8 }, (_, i) => `<div class="butterfly bf${i + 1}">${BF}</div>`).join('');

export async function renderStory(params) {
  const id = parseInt(params.id);
  const story = await getStory(id);
  if (!story) { navigate('/'); return; }

  const chapters = await getChapters(id);
  const chapterPanels = {};
  await Promise.all(chapters.map(async ch => {
    chapterPanels[ch.id] = await getPanels(ch.id);
  }));

  const gc = genreColor(story.genre || 'Thoughts');
  const coverBg = story.coverImage
    ? `url(${story.coverImage}) center/cover no-repeat`
    : COVERS[id % COVERS.length];

  let isAdmin = false;

  html('#app-view', `
    <div class="story-topbar" id="story-topbar">
      <button class="btn-glass" id="btn-back"><i class="fa-solid fa-arrow-left"></i></button>
      <div style="display:flex;gap:10px" id="admin-actions"></div>
    </div>

    <div class="story-page" id="story-page-view">
      <div class="butterflies">${butterfliesHtml()}</div>

      <div class="story-cover-hero" style="background:${coverBg}">
        <div class="story-cover-info">
          <div class="lib-tag" style="background:${gc.bg};color:${gc.color};margin-bottom:10px;display:inline-block;position:relative;top:auto;right:auto">${story.genre || 'Story'}</div>
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
            <input type="text" id="edit-title" value="${story.title || ''}" />
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
          <div id="add-chapter-slot"></div>
        </div>
        <div class="ch-list">
          ${chapters.length === 0 ? `
            <div class="empty-state" style="padding:40px 20px">
              <i class="fa-solid fa-feather-pointed" style="opacity:.3;margin-bottom:12px"></i>
              <p style="margin:0">No chapters yet.</p>
            </div>` :
          chapters.map((ch, i) => `
            <div class="ch-item" data-ch="${ch.id}">
              <div class="ch-num">${String(i + 1).padStart(2, '0')}</div>
              <div class="ch-info">
                <div class="ch-title">${ch.title}</div>
                <div class="ch-meta">${(chapterPanels[ch.id] || []).length} panels · ${estimateReadTime(chapterPanels[ch.id])}</div>
              </div>
              <div class="ch-actions" data-ch-actions="${ch.id}">
                <button class="btn-icon-sm btn-read-ch" data-ch="${ch.id}" title="Read"><i class="fa-solid fa-book-open"></i></button>
              </div>
            </div>`).join('')}
        </div>

        ${chapters.length > 0 ? `
        <div style="margin-top:32px;text-align:center">
          <button class="btn-primary" id="btn-read-first" style="padding:12px 36px"><i class="fa-solid fa-book-open-reader"></i> Start Reading</button>
        </div>` : ''}

        ${footerHtml()}
      </div>
    </div>
  `);

  // ─── Topbar scroll ───
  const pageView = $('#app-view');
  const topbar = $('#story-topbar');
  pageView.addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', pageView.scrollTop > 50);
  }, { passive: true });

  on('#btn-back', 'click', () => navigate('/'));

  // Read chapter (everyone)
  $$('.btn-read-ch').forEach(el => on(el, 'click', e => {
    e.stopPropagation();
    navigate(`/read/${id}/${el.dataset.ch}`);
  }));
  if ($('#btn-read-first')) {
    on('#btn-read-first', 'click', () => chapters.length && navigate(`/read/${id}/${chapters[0].id}`));
  }

  // ─── Admin-only controls ───
  checkAdminStatus(admin => {
    isAdmin = admin;
    if (!admin) {
      // Readers: tapping a chapter opens the reader
      $$('.ch-item').forEach(el => on(el, 'click', () => navigate(`/read/${id}/${el.dataset.ch}`)));
      return;
    }

    // Admin top-right actions
    $('#admin-actions').innerHTML = `
      <button class="btn-glass" id="btn-edit-info" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
      <button class="btn-glass" id="btn-delete" title="Delete" style="color:var(--danger);border-color:rgba(232,92,108,0.2)"><i class="fa-solid fa-trash-can"></i></button>`;

    // Add chapter button
    $('#add-chapter-slot').innerHTML = `<button class="btn-primary btn-sm" id="btn-add-chapter" style="border-radius:8px"><i class="fa-solid fa-plus"></i> New Chapter</button>`;

    // Edit/delete buttons per chapter
    $$('[data-ch-actions]').forEach(slot => {
      const chId = slot.dataset.chActions;
      slot.insertAdjacentHTML('beforeend', `
        <button class="btn-icon-sm btn-edit-ch" data-ch="${chId}" title="Edit"><i class="fa-solid fa-pencil"></i></button>
        <button class="btn-icon-sm btn-del-ch" data-ch="${chId}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>`);
    });

    bindAdminEvents();
    // Admin: tapping a chapter row opens the editor
    $$('.ch-item').forEach(el => on(el, 'click', () => navigate(`/edit/${id}/${el.dataset.ch}`)));
  });

  function bindAdminEvents() {
    on('#btn-delete', 'click', async () => {
      if (confirm(`Delete "${story.title}"? This cannot be undone.`)) {
        await deleteStory(id);
        navigate('/');
      }
    });
    on('#btn-add-chapter', 'click', async () => {
      const chId = await addChapter(id, `Chapter ${chapters.length + 1}`);
      navigate(`/edit/${id}/${chId}`);
    });

    $$('.btn-edit-ch').forEach(el => on(el, 'click', e => {
      e.stopPropagation();
      navigate(`/edit/${id}/${el.dataset.ch}`);
    }));
    $$('.btn-del-ch').forEach(el => on(el, 'click', async e => {
      e.stopPropagation();
      if (confirm('Delete this chapter?')) {
        await deleteChapter(parseInt(el.dataset.ch));
        renderStory(params);
      }
    }));

    // Edit info modal
    let editGenre = story.genre || 'Thoughts';
    let editStatus = story.status || 'draft';
    let editCover = null;

    on('#btn-edit-info', 'click', () => $('#edit-modal').classList.add('active'));
    on('#modal-close', 'click', () => $('#edit-modal').classList.remove('active'));
    on('#modal-cancel', 'click', () => $('#edit-modal').classList.remove('active'));

    $$('.genre-pill').forEach(el => on(el, 'click', () => {
      $$('.genre-pill').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      editGenre = el.dataset.genre;
    }));
    $$('.status-btn').forEach(el => on(el, 'click', () => {
      $$('.status-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      editStatus = el.dataset.status;
    }));
    on('#edit-cover', 'change', async e => {
      const file = e.target.files[0];
      if (file) editCover = await compressImage(await imageToBase64(file), 800, 0.7);
    });
    on('#modal-save', 'click', async () => {
      const title = $('#edit-title').value.trim();
      if (!title) return;
      const data = { title, description: $('#edit-desc').value.trim(), genre: editGenre, status: editStatus };
      if (editCover) data.coverImage = editCover;
      await updateStory(id, data);
      renderStory(params);
    });
  }
}