// ═══ Editor — panel-based chapter editor (admin) ═══
import { getStory, getChapter, updateChapter, getPanels, savePanels } from '../db.js';
import { html, $, $$, on, navigate, imageToBase64, compressImage } from '../app.js';

const PANEL_META = {
  narration: { icon: 'fa-align-left',    label: 'Narration' },
  dialogue:  { icon: 'fa-comment-dots',  label: 'Dialogue' },
  image:     { icon: 'fa-image',         label: 'Image' },
  divider:   { icon: 'fa-minus',         label: 'Divider' }
};

const NARR_STYLES = [
  { key: 'classic', label: 'Classic' },
  { key: 'modern',  label: 'Modern'  },
  { key: 'poetic',  label: 'Poetic'  },
];

const IMG_FRAMES = [
  { key: 'none',       label: 'None'      },
  { key: 'rounded',    label: 'Rounded'   },
  { key: 'framed',     label: 'Framed'    },
  { key: 'cinematic',  label: 'Cinematic' },
];

export async function renderEditor(params) {
  const storyId = parseInt(params.storyId);
  const chId    = parseInt(params.chapterId);

  const [story, chapter] = await Promise.all([getStory(storyId), getChapter(chId)]);
  if (!story || !chapter) { navigate('/'); return; }

  let panels = await getPanels(chId);
  let dirty  = false;
  let chBgImage = chapter.bgImage || null;  // track chapter background separately
  const markDirty = () => { dirty = true; };

  html('#app-view', `
    <div class="editor-page">
      <div class="editor-header">
        <button class="btn-icon" id="btn-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="editor-title-area">
          <input type="text" class="editor-chapter-title" id="ch-title" value="${chapter.title}" placeholder="Chapter title" />
          <div class="editor-subtitle">${story.title}</div>
        </div>
        <div class="editor-header-actions">
          <button class="btn-save" id="btn-save"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </div>

      <div class="panel-list" id="panel-list"></div>

      <!-- Hidden file inputs -->
      <input type="file" id="ch-bg-input" accept="image/*" hidden />

      <div class="editor-toolbar">
        <button class="tool-btn" data-add="narration"><i class="fa-solid fa-align-left"></i><span>Narration</span></button>
        <button class="tool-btn" data-add="dialogue"><i class="fa-solid fa-comment-dots"></i><span>Dialogue</span></button>
        <button class="tool-btn" data-add="image"><i class="fa-solid fa-image"></i><span>Image</span></button>
        <button class="tool-btn" data-add="divider"><i class="fa-solid fa-minus"></i><span>Divider</span></button>
      </div>
    </div>
  `);

  renderPanels();

  // ─── Chapter background upload ───
  on('#ch-bg-input', 'change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const changeBtn = $('#btn-ch-bg-change');
    if (changeBtn) { changeBtn.textContent = '...'; changeBtn.disabled = true; }
    try {
      chBgImage = await compressImage(await imageToBase64(file), 1200, 0.65);
      await updateChapter(chId, { bgImage: chBgImage });
      renderPanels();
    } catch (err) {
      console.error(err);
      alert('Gagal upload background: ' + err.message);
      renderPanels();
    }
    // Reset input so same file can be re-picked
    e.target.value = '';
  });

  // ─── Render ───
  function renderPanels() {
    const list = $('#panel-list');

    const bgCard = buildChBgCard();
    const panelHtml = panels.length === 0
      ? `<div class="editor-empty-state">
           <div class="editor-empty-icon"><i class="fa-solid fa-feather-pointed"></i></div>
           <h3>Mulai ceritamu</h3>
           <p>Tambahkan panel pertama dari toolbar di bawah</p>
         </div>`
      : panels.map((p, i) => buildPanelCard(p, i)).join('');

    list.innerHTML = bgCard + panelHtml;
    bindPanelEvents();
    bindChBgEvents();
  }

  function buildChBgCard() {
    if (chBgImage) {
      return `
        <div class="editor-ch-bg-card">
          <div class="ch-bg-preview" style="background-image:url(${chBgImage})">
            <div class="ch-bg-preview-bar">
              <span><i class="fa-solid fa-panorama" style="margin-right:6px;opacity:.7"></i>Chapter Background</span>
              <button class="btn-small" id="btn-ch-bg-change"><i class="fa-solid fa-pen"></i> Change</button>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="editor-ch-bg-card">
        <div class="ch-bg-empty" id="ch-bg-empty-zone">
          <i class="fa-solid fa-panorama"></i>
          <span>Set chapter background image</span>
        </div>
      </div>`;
  }

  function buildPanelCard(p, i) {
    const meta = PANEL_META[p.type] || PANEL_META.narration;
    let body = '';

    if (p.type === 'narration') {
      const ns = p.narrateStyle || 'classic';
      body = `
        ${buildFormatToolbar(i)}
        <div class="panel-narr-style">
          ${NARR_STYLES.map(s => `
            <button class="narr-style-btn${s.key === ns ? ' active' : ''}" data-style="${s.key}" data-i="${i}">${s.label}</button>
          `).join('')}
        </div>
        <textarea class="panel-textarea in-text" data-i="${i}" placeholder="Write your narration here...">${escHtml(p.text)}</textarea>`;

    } else if (p.type === 'dialogue') {
      body = `
        ${buildFormatToolbar(i)}
        <input type="text" class="panel-char-input in-char" data-i="${i}" placeholder="Character name" value="${escAttr(p.character)}" />
        <textarea class="panel-textarea panel-dialogue-text in-text" data-i="${i}" placeholder="Write the dialogue...">${escHtml(p.text)}</textarea>`;

    } else if (p.type === 'image') {
      if (p.image) {
        const curSize  = p.imageSize  || 'full';
        const curFrame = p.imageFrame || 'none';
        body = `
          <div class="panel-img-preview" style="background-image:url(${p.image})"></div>
          <div class="img-size-picker" data-i="${i}">
            ${['small','medium','full'].map(s => `
              <button class="size-btn${s === curSize ? ' active' : ''}" data-size="${s}" data-i="${i}">${s.charAt(0).toUpperCase()+s.slice(1)}</button>
            `).join('')}
          </div>
          <div class="img-frame-picker">
            <span class="img-frame-picker-label">FRAME</span>
            ${IMG_FRAMES.map(f => `
              <button class="frame-btn${f.key === curFrame ? ' active' : ''}" data-frame="${f.key}" data-i="${i}">${f.label}</button>
            `).join('')}
          </div>
          <input type="file" class="file-img" data-i="${i}" accept="image/*" hidden />`;
      } else {
        body = `
          <div class="panel-upload up-img" data-i="${i}">
            <i class="fa-solid fa-cloud-arrow-up"></i><span>Tap to upload image</span>
          </div>
          <input type="file" class="file-img" data-i="${i}" accept="image/*" hidden />`;
      }

    } else if (p.type === 'divider') {
      body = `<div class="panel-divider-preview">• • •</div>`;
    }

    return `
      <div class="panel-card panel-card--${p.type}">
        <div class="panel-card-header">
          <div class="panel-type-info">
            <span class="panel-num">#${i + 1}</span>
            <i class="fa-solid ${meta.icon}"></i>
            <span>${meta.label}</span>
          </div>
          <div class="panel-card-actions">
            <button class="btn-icon-sm btn-up"  data-i="${i}" ${i === 0 ? 'disabled style="opacity:.2"' : ''}><i class="fa-solid fa-arrow-up"></i></button>
            <button class="btn-icon-sm btn-down" data-i="${i}" ${i === panels.length - 1 ? 'disabled style="opacity:.2"' : ''}><i class="fa-solid fa-arrow-down"></i></button>
            <button class="btn-icon-sm btn-del btn-danger-icon" data-i="${i}"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="panel-card-body">${body}</div>
      </div>`;
  }

  function buildFormatToolbar(i) {
    return `
      <div class="panel-format-toolbar">
        <button class="fmt-btn" data-fmt="b"  data-i="${i}" title="Bold"><b>B</b></button>
        <button class="fmt-btn" data-fmt="em" data-i="${i}" title="Italic"><em>I</em></button>
        <button class="fmt-btn" data-fmt="u"  data-i="${i}" title="Underline"><u>U</u></button>
      </div>`;
  }

  function wrapSelection(textarea, open, close) {
    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    if (start === end) return;
    const v = textarea.value;
    textarea.value = v.slice(0, start) + open + v.slice(start, end) + close + v.slice(end);
    textarea.selectionStart = start + open.length;
    textarea.selectionEnd   = end   + open.length;
    textarea.dispatchEvent(new Event('input'));
  }

  function bindChBgEvents() {
    const input = $('#ch-bg-input');
    const emptyZone = $('#ch-bg-empty-zone');
    const changeBtn = $('#btn-ch-bg-change');
    if (emptyZone) on(emptyZone, 'click', () => input?.click());
    if (changeBtn) on(changeBtn, 'click', () => input?.click());
  }

  function bindPanelEvents() {
    $$('.in-text').forEach(el => on(el, 'input', e => {
      panels[+e.target.dataset.i].text = e.target.value; markDirty();
    }));
    $$('.in-char').forEach(el => on(el, 'input', e => {
      panels[+e.target.dataset.i].character = e.target.value; markDirty();
    }));

    // Format toolbar — mousedown prevents textarea losing selection
    $$('.fmt-btn').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        const i  = +btn.dataset.i;
        const ta = $$(`.in-text[data-i="${i}"]`)[0];
        if (!ta) return;
        const tagMap = { b: ['<b>','</b>'], em: ['<em>','</em>'], u: ['<u>','</u>'] };
        const [open, close] = tagMap[btn.dataset.fmt] || [];
        if (open) { wrapSelection(ta, open, close); markDirty(); }
      });
    });

    // Narration style buttons
    $$('.narr-style-btn').forEach(btn => {
      on(btn, 'click', () => {
        const i = +btn.dataset.i;
        panels[i].narrateStyle = btn.dataset.style;
        markDirty();
        // Toggle active without full re-render
        const row = btn.closest('.panel-narr-style');
        if (row) row.querySelectorAll('.narr-style-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // Image size buttons
    $$('.size-btn').forEach(btn => {
      on(btn, 'click', () => {
        const i = +btn.dataset.i;
        panels[i].imageSize = btn.dataset.size;
        markDirty();
        const picker = $(`.img-size-picker[data-i="${i}"]`);
        if (picker) picker.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === btn.dataset.size));
      });
    });

    // Image frame buttons
    $$('.frame-btn').forEach(btn => {
      on(btn, 'click', () => {
        const i = +btn.dataset.i;
        panels[i].imageFrame = btn.dataset.frame;
        markDirty();
        const picker = btn.closest('.img-frame-picker');
        if (picker) picker.querySelectorAll('.frame-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    $$('.up-img').forEach(el => on(el, 'click', () => $(`.file-img[data-i="${el.dataset.i}"]`)?.click()));
    $$('.file-img').forEach(el => on(el, 'change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const idx = +e.target.dataset.i;
      panels[idx].image      = await compressImage(await imageToBase64(file), 1000, 0.75);
      panels[idx].imageSize  = panels[idx].imageSize  || 'full';
      panels[idx].imageFrame = panels[idx].imageFrame || 'none';
      markDirty();
      renderPanels();
    }));

    $$('.btn-del').forEach(el => on(el, 'click', () => { panels.splice(+el.dataset.i, 1); markDirty(); renderPanels(); }));
    $$('.btn-up').forEach(el => on(el, 'click', () => {
      const i = +el.dataset.i;
      if (i > 0) { [panels[i-1], panels[i]] = [panels[i], panels[i-1]]; markDirty(); renderPanels(); }
    }));
    $$('.btn-down').forEach(el => on(el, 'click', () => {
      const i = +el.dataset.i;
      if (i < panels.length-1) { [panels[i], panels[i+1]] = [panels[i+1], panels[i]]; markDirty(); renderPanels(); }
    }));
  }

  // ─── Toolbar: add panel ───
  $$('.tool-btn').forEach(el => on(el, 'click', () => {
    const type = el.dataset.add;
    const base = { type };
    if (type === 'narration') { base.text = ''; base.narrateStyle = 'classic'; }
    else if (type === 'dialogue') { base.character = ''; base.text = ''; }
    else if (type === 'image') { base.image = null; base.imageSize = 'full'; base.imageFrame = 'none'; }
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

  on('#btn-back', 'click', () => {
    if (dirty && !confirm('Perubahan belum disimpan. Tetap keluar?')) return;
    navigate(`/story/${storyId}`);
  });
}

function escHtml(s)  { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s)  { return escHtml(s).replace(/"/g,'&quot;'); }
