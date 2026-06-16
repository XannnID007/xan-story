// ═══ Editor — panel-based chapter editor (admin) ═══
import { getStory, getChapter, updateChapter, getPanels, savePanels } from '../db.js';
import { html, $, $$, on, navigate, imageToBase64, compressImage } from '../app.js';

const PANEL_META = {
  narration: { icon: 'fa-align-left', label: 'Narration' },
  dialogue:  { icon: 'fa-comment-dots', label: 'Dialogue' },
  image:     { icon: 'fa-image', label: 'Image' },
  divider:   { icon: 'fa-minus', label: 'Divider' }
};

export async function renderEditor(params) {
  const storyId = parseInt(params.storyId);
  const chId = parseInt(params.chapterId);

  const [story, chapter] = await Promise.all([getStory(storyId), getChapter(chId)]);
  if (!story || !chapter) { navigate('/'); return; }

  let panels = await getPanels(chId);
  let dirty = false;
  const markDirty = () => { dirty = true; };

  html('#app-view', `
    <div class="editor-page">
      <div class="editor-header">
        <button class="btn-icon-sm" id="btn-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="editor-title-area">
          <input type="text" class="editor-chapter-title" id="ch-title" value="${chapter.title}" placeholder="Chapter title" />
          <div class="editor-subtitle">${story.title}</div>
        </div>
        <div class="editor-header-actions">
          <button class="btn-save" id="btn-save"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </div>

      <div class="panel-list" id="panel-list"></div>

      <div class="editor-toolbar">
        <button class="tool-btn" data-add="narration"><i class="fa-solid fa-align-left"></i> Narration</button>
        <button class="tool-btn" data-add="dialogue"><i class="fa-solid fa-comment-dots"></i> Dialogue</button>
        <button class="tool-btn" data-add="image"><i class="fa-solid fa-image"></i> Image</button>
        <button class="tool-btn" data-add="divider"><i class="fa-solid fa-minus"></i> Divider</button>
      </div>
    </div>
  `);

  renderPanels();

  // ─── Render panel cards ───
  function renderPanels() {
    const list = $('#panel-list');
    if (panels.length === 0) {
      list.innerHTML = `
        <div class="add-panel-zone">
          <i class="fa-solid fa-feather"></i>
          <span>Start your story by adding a panel below</span>
        </div>`;
      return;
    }

    list.innerHTML = panels.map((p, i) => {
      const meta = PANEL_META[p.type] || PANEL_META.narration;
      let body = '';

      if (p.type === 'dialogue') {
        body = `
          <input type="text" class="panel-char-input in-char" data-i="${i}" placeholder="Character name" value="${escAttr(p.character)}" />
          <textarea class="panel-textarea panel-dialogue-text in-text" data-i="${i}" placeholder="Write the dialogue...">${escHtml(p.text)}</textarea>`;
      } else if (p.type === 'image') {
        body = p.image
          ? `<div class="panel-img-preview" style="background-image:url(${p.image})"></div>
             <input type="file" class="file-img" data-i="${i}" accept="image/*" hidden />`
          : `<div class="panel-upload up-img" data-i="${i}"><i class="fa-solid fa-cloud-arrow-up"></i><span>Tap to upload image</span></div>
             <input type="file" class="file-img" data-i="${i}" accept="image/*" hidden />`;
      } else if (p.type === 'divider') {
        body = `<div class="panel-divider-preview">• • •</div>`;
      } else {
        body = `<textarea class="panel-textarea in-text" data-i="${i}" placeholder="Write your narration here...">${escHtml(p.text)}</textarea>`;
      }

      return `
        <div class="panel-card">
          <div class="panel-card-header">
            <div class="panel-type-info">
              <span class="panel-num">#${i + 1}</span>
              <i class="fa-solid ${meta.icon}"></i>
              <span>${meta.label}</span>
            </div>
            <div class="panel-card-actions">
              <button class="btn-icon-sm btn-up" data-i="${i}" ${i === 0 ? 'disabled style="opacity:.2"' : ''}><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn-icon-sm btn-down" data-i="${i}" ${i === panels.length - 1 ? 'disabled style="opacity:.2"' : ''}><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn-icon-sm btn-del btn-danger-icon" data-i="${i}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
          <div class="panel-card-body">${body}</div>
        </div>`;
    }).join('');

    bindPanelEvents();
  }

  function bindPanelEvents() {
    $$('.in-text').forEach(el => on(el, 'input', e => { panels[e.target.dataset.i].text = e.target.value; markDirty(); }));
    $$('.in-char').forEach(el => on(el, 'input', e => { panels[e.target.dataset.i].character = e.target.value; markDirty(); }));

    $$('.up-img').forEach(el => on(el, 'click', () => $(`.file-img[data-i="${el.dataset.i}"]`)?.click()));
    $$('.file-img').forEach(el => on(el, 'change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      panels[e.target.dataset.i].image = await compressImage(await imageToBase64(file), 1000, 0.75);
      markDirty();
      renderPanels();
    }));

    $$('.btn-del').forEach(el => on(el, 'click', () => { panels.splice(+el.dataset.i, 1); markDirty(); renderPanels(); }));
    $$('.btn-up').forEach(el => on(el, 'click', () => {
      const i = +el.dataset.i;
      if (i > 0) { [panels[i - 1], panels[i]] = [panels[i], panels[i - 1]]; markDirty(); renderPanels(); }
    }));
    $$('.btn-down').forEach(el => on(el, 'click', () => {
      const i = +el.dataset.i;
      if (i < panels.length - 1) { [panels[i], panels[i + 1]] = [panels[i + 1], panels[i]]; markDirty(); renderPanels(); }
    }));
  }

  // ─── Toolbar: add panel ───
  $$('.tool-btn').forEach(el => on(el, 'click', () => {
    const type = el.dataset.add;
    const base = { type };
    if (type === 'dialogue') { base.character = ''; base.text = ''; }
    else if (type === 'image') base.image = null;
    else if (type !== 'divider') base.text = '';
    panels.push(base);
    markDirty();
    renderPanels();
    $('#panel-list').scrollTop = $('#panel-list').scrollHeight;
  }));

  on('#ch-title', 'input', markDirty);

  // ─── Save ───
  async function save() {
    await updateChapter(chId, { title: $('#ch-title').value.trim() || 'Untitled Chapter' });
    await savePanels(chId, panels);
    dirty = false;
  }

  on('#btn-save', 'click', async () => {
    const btn = $('#btn-save');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving';
    try {
      await save();
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
      setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-check"></i> Save'; }, 1800);
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan: ' + e.message);
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Save';
    }
  });

  // ─── Back (warns on unsaved) ───
  on('#btn-back', 'click', () => {
    if (dirty && !confirm('Perubahan belum disimpan. Tetap keluar?')) return;
    navigate(`/story/${storyId}`);
  });
}

function escHtml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }