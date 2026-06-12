import { getStory, getChapter, updateChapter, getPanels, savePanels } from '../db.js';
import { html, $, $$, on, navigate, imageToBase64, compressImage } from '../app.js';

export async function renderEditor(params) {
  const storyId = parseInt(params.storyId);
  const chId = parseInt(params.chapterId);

  const story = await getStory(storyId);
  const chapter = await getChapter(chId);
  
  if (!story || !chapter) { navigate('/'); return; }

  let panels = await getPanels(chId) || [];
  let hasUnsavedChanges = false; // 🔥 STATE TRACKER CERDAS

  // Fungsi untuk mencatat setiap kali ada ketikan/perubahan
  function markUnsaved() {
    hasUnsavedChanges = true;
  }

  function renderPanels() {
    const list = $('#panel-list-container');
    if (!list) return;
    
    if (panels.length === 0) {
      list.innerHTML = `
        <div class="add-panel-zone" style="margin-top:20px;">
          <i class="fa-solid fa-feather"></i>
          <span>Mulai tulis ceritamu dengan memilih format di bawah</span>
        </div>`;
      return;
    }

    list.innerHTML = panels.map((p, i) => `
      <div class="panel-card" data-index="${i}">
        <div class="panel-card-header">
          <div class="panel-type-info">
            <span class="panel-num">#${i + 1}</span>
            <i class="fa-solid ${p.type === 'dialogue' ? 'fa-comment-dots' : p.type === 'image' ? 'fa-image' : p.type === 'divider' ? 'fa-minus' : 'fa-align-left'}"></i>
            <span>${p.type.charAt(0).toUpperCase() + p.type.slice(1)}</span>
          </div>
          <div class="panel-card-actions">
            <button class="btn-icon-sm btn-up" data-i="${i}" ${i === 0 ? 'disabled style="opacity:0.2"' : ''}><i class="fa-solid fa-arrow-up"></i></button>
            <button class="btn-icon-sm btn-down" data-i="${i}" ${i === panels.length - 1 ? 'disabled style="opacity:0.2"' : ''}><i class="fa-solid fa-arrow-down"></i></button>
            <button class="btn-icon-sm btn-del btn-danger-icon" data-i="${i}"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="panel-card-body">
          ${p.type === 'dialogue' ? `
            <input type="text" class="panel-char-input input-char" data-i="${i}" placeholder="Nama Karakter" value="${p.character || ''}">
            <textarea class="panel-textarea input-text panel-dialogue-text" data-i="${i}" placeholder="Tulis percakapan...">${p.text || ''}</textarea>
          ` : p.type === 'image' ? `
            ${p.image ? `<div class="panel-img-preview" style="background-image:url(${p.image})"></div>` : `<div class="panel-upload upload-img" data-i="${i}"><i class="fa-solid fa-cloud-arrow-up"></i><span>Klik untuk upload gambar</span></div>`}
            <input type="file" class="file-img" data-i="${i}" accept="image/*" style="display:none;">
          ` : p.type === 'divider' ? `
            <div class="panel-divider-preview">• • •</div>
          ` : `
            <textarea class="panel-textarea input-text" data-i="${i}" placeholder="Tulis narasi ceritamu di sini...">${p.text || ''}</textarea>
          `}
        </div>
      </div>
    `).join('');

    attachPanelEvents();
  }

  function attachPanelEvents() {
    $$('.input-text').forEach(el => {
      on(el, 'input', (e) => { panels[e.target.dataset.i].text = e.target.value; markUnsaved(); });
    });
    $$('.input-char').forEach(el => {
      on(el, 'input', (e) => { panels[e.target.dataset.i].character = e.target.value; markUnsaved(); });
    });

    $$('.upload-img').forEach(el => {
      on(el, 'click', (e) => {
        const fileInput = $(`.file-img[data-i="${el.dataset.i}"]`);
        if(fileInput) fileInput.click();
      });
    });

    $$('.file-img').forEach(el => {
      on(el, 'change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const b64 = await imageToBase64(file);
          panels[e.target.dataset.i].image = await compressImage(b64, 800, 0.7);
          markUnsaved();
          renderPanels();
        }
      });
    });

    $$('.btn-del').forEach(el => {
      on(el, 'click', () => {
        panels.splice(parseInt(el.dataset.i), 1);
        markUnsaved();
        renderPanels();
      });
    });
    $$('.btn-up').forEach(el => {
      on(el, 'click', () => {
        const i = parseInt(el.dataset.i);
        if (i > 0) {
          [panels[i - 1], panels[i]] = [panels[i], panels[i - 1]];
          markUnsaved();
          renderPanels();
        }
      });
    });
    $$('.btn-down').forEach(el => {
      on(el, 'click', () => {
        const i = parseInt(el.dataset.i);
        if (i < panels.length - 1) {
          [panels[i], panels[i + 1]] = [panels[i + 1], panels[i]];
          markUnsaved();
          renderPanels();
        }
      });
    });
  }

  html('#app-view', `
    <div class="editor-page">
      <div class="editor-header">
        <button class="btn-icon-sm" id="btn-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="editor-title-area">
          <input type="text" class="editor-chapter-title" id="ch-title" value="${chapter.title}" placeholder="Judul Chapter">
          <div class="editor-subtitle">${story.title}</div>
        </div>
        <div class="editor-header-actions">
          <button class="btn-save" id="btn-save" style="padding: 6px 12px;"><i class="fa-solid fa-check"></i> Save</button>
          <button class="btn-secondary" id="btn-done" style="padding: 6px 12px; font-weight: 600;"><i class="fa-solid fa-door-open"></i> Selesai</button>
        </div>
      </div>
      
      <div class="panel-list" id="panel-list-container"></div>

      <div class="editor-toolbar">
        <button class="tool-btn" id="add-narrative"><i class="fa-solid fa-align-left"></i> Narasi</button>
        <button class="tool-btn" id="add-dialogue"><i class="fa-solid fa-comment-dots"></i> Dialog</button>
        <button class="tool-btn" id="add-image"><i class="fa-solid fa-image"></i> Gambar</button>
        <button class="tool-btn" id="add-divider"><i class="fa-solid fa-minus"></i> Batas</button>
      </div>
    </div>
  `);

  renderPanels();

  // Awasi perubahan judul
  on('#ch-title', 'input', markUnsaved);

  on('#add-narrative', 'click', () => { panels.push({ type: 'narration', text: '' }); markUnsaved(); renderPanels(); });
  on('#add-dialogue', 'click', () => { panels.push({ type: 'dialogue', character: '', text: '' }); markUnsaved(); renderPanels(); });
  on('#add-image', 'click', () => { panels.push({ type: 'image', image: null }); markUnsaved(); renderPanels(); });
  on('#add-divider', 'click', () => { panels.push({ type: 'divider' }); markUnsaved(); renderPanels(); });

  // 🔥 Logika Navigasi Kembali Cerdas
  on('#btn-back', 'click', () => {
    if (hasUnsavedChanges) {
      if(!confirm("Yakin ingin kembali? Perubahan yang belum di-save akan hilang.")) return;
    }
    navigate(`/story/${storyId}`);
  });

  // 🔥 Logika Save Normal
  on('#btn-save', 'click', async () => {
    const btn = $('#btn-save');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    
    try {
      const newTitle = $('#ch-title').value.trim() || 'Untitled Chapter';
      await updateChapter(chId, { title: newTitle });
      await savePanels(chId, panels);
      
      hasUnsavedChanges = false; // Reset status pelacak karena data sudah aman
      
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Saved!`;
      setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-check"></i> Save`; }, 2000);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan: " + e.message);
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Save`;
    }
  });

  // 🔥 Logika Tombol Selesai
  on('#btn-done', 'click', async () => {
    // Auto-save jika sistem mendeteksi ada teks yang belum disimpan
    if (hasUnsavedChanges) {
      const btn = $('#btn-done');
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
      const newTitle = $('#ch-title').value.trim() || 'Untitled Chapter';
      await updateChapter(chId, { title: newTitle });
      await savePanels(chId, panels);
    }
    // Langsung arahkan keluar dengan aman
    navigate(`/story/${storyId}`);
  });
}