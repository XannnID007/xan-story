// ═══ New Story — 3-step wizard ═══
import { addStory, addChapter } from '../db.js';
import { html, $, $$, on, navigate, GENRES, imageToBase64, compressImage } from '../app.js';

const GENRE_ICONS = {
  'Slice of life': 'mug-hot',
  'Thoughts': 'brain',
  'Fiction': 'wand-magic',
  'Romance': 'heart',
  'Dark': 'moon',
  'Mystery': 'magnifying-glass',
  'Poetry': 'feather'
};

export async function renderNewStory() {
  // Wizard state lives in this closure — survives re-renders between steps.
  let step = 1;
  let title = '';
  let description = '';
  let selectedGenre = GENRES[0];
  let coverData = null;
  let creating = false;

  function render() {
    html('#app-view', `
      <div class="new-story-page">
        <div class="editor-header">
          <button class="btn-icon" id="btn-ns-back"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="editor-title-area">
            <span class="editor-subtitle" style="font-size:16px;opacity:1;font-weight:500">Create new story</span>
          </div>
          <div style="width:44px"></div>
        </div>

        <div class="new-story-form">
          <div class="wizard-progress">
            ${[1, 2, 3].map(n => `<div class="wizard-dot ${step >= n ? 'done' : ''}"></div>`).join('')}
          </div>

          <!-- Step 1: Title & description -->
          <div class="wizard-step ${step === 1 ? 'active' : ''}">
            <h2 class="wizard-heading">What's your story?</h2>
            <p class="wizard-sub">Give your story a name and a brief description to set the mood.</p>

            <div class="form-group">
              <label><i class="fa-solid fa-pencil" style="margin-right:4px"></i> Title <span class="required">*</span></label>
              <input type="text" id="ns-title" placeholder="e.g. Hujan di Bulan Juni..." value="${title}" autofocus />
            </div>
            <div class="form-group">
              <label><i class="fa-solid fa-align-left" style="margin-right:4px"></i> Description</label>
              <textarea id="ns-desc" rows="3" placeholder="A short description about your story...">${description}</textarea>
            </div>

            <div class="wizard-nav">
              <button class="btn-secondary" id="btn-cancel">Cancel</button>
              <button class="btn-primary" id="btn-next1">Next <i class="fa-solid fa-arrow-right"></i></button>
            </div>
          </div>

          <!-- Step 2: Genre -->
          <div class="wizard-step ${step === 2 ? 'active' : ''}">
            <h2 class="wizard-heading">Choose the mood</h2>
            <p class="wizard-sub">Pick a genre that best describes the feeling of your story.</p>

            <div class="genre-pills">
              ${GENRES.map(g => `
                <button class="genre-pill ${selectedGenre === g ? 'active' : ''}" data-genre="${g}">
                  <i class="fa-solid fa-${GENRE_ICONS[g] || 'tag'}" style="margin-right:4px"></i>${g}
                </button>`).join('')}
            </div>

            <div class="wizard-nav">
              <button class="btn-secondary" id="btn-back2"><i class="fa-solid fa-arrow-left"></i> Back</button>
              <button class="btn-primary" id="btn-next2">Next <i class="fa-solid fa-arrow-right"></i></button>
            </div>
          </div>

          <!-- Step 3: Cover -->
          <div class="wizard-step ${step === 3 ? 'active' : ''}">
            <h2 class="wizard-heading">Add a cover</h2>
            <p class="wizard-sub">A good cover makes your story stand out. You can always add this later.</p>

            <div class="form-group">
              <label class="cover-upload" id="cover-upload-label">
                <div class="cover-upload-content" id="cover-preview">
                  ${coverData ? '' : '<i class="fa-solid fa-image"></i><span>Tap to upload cover image</span>'}
                </div>
                <input type="file" id="ns-cover" accept="image/*" hidden />
              </label>
            </div>

            <div class="wizard-nav">
              <button class="btn-secondary" id="btn-back3"><i class="fa-solid fa-arrow-left"></i> Back</button>
              <button class="btn-primary" id="btn-create"><i class="fa-solid fa-wand-magic-sparkles"></i> Create story</button>
            </div>
          </div>
        </div>
        <div style="height:72px"></div>
      </div>
    `);

    bindEvents();
    if (coverData && step === 3) showCoverPreview();
  }

  function showCoverPreview() {
    const preview = $('#cover-preview');
    preview.innerHTML = '';
    preview.style.backgroundImage = `url(${coverData})`;
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
  }

  function bindEvents() {
    on('#btn-ns-back', 'click', () => navigate('/'));
    on('#btn-cancel', 'click', () => navigate('/'));

    // Keep wizard state in sync as the user types
    on('#ns-title', 'input', e => { title = e.target.value; });
    on('#ns-desc', 'input', e => { description = e.target.value; });

    on('#btn-next1', 'click', () => {
      if (!title.trim()) {
        const input = $('#ns-title');
        input.focus();
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
        return;
      }
      step = 2;
      render();
    });

    $$('.genre-pill').forEach(el => {
      on(el, 'click', () => {
        $$('.genre-pill').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        selectedGenre = el.dataset.genre;
      });
    });

    on('#btn-back2', 'click', () => { step = 1; render(); });
    on('#btn-next2', 'click', () => { step = 3; render(); });
    on('#btn-back3', 'click', () => { step = 2; render(); });

    on('#cover-upload-label', 'click', () => $('#ns-cover').click());
    on('#ns-cover', 'change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await imageToBase64(file);
      coverData = await compressImage(b64, 800, 0.7);
      showCoverPreview();
    });

    on('#btn-create', 'click', async () => {
      if (creating) return;
      creating = true;
      const btn = $('#btn-create');
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

      try {
        const storyId = await addStory({
          title: title.trim(),
          description: description.trim(),
          genre: selectedGenre,
          coverImage: coverData,
          status: 'draft'
        });
        const chapterId = await addChapter(storyId, 'Chapter 1');
        navigate(`/edit/${storyId}/${chapterId}`);
      } catch (err) {
        console.error(err);
        alert('Gagal membuat cerita: ' + err.message);
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Create story';
        creating = false;
      }
    });
  }

  render();
}