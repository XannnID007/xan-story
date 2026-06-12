import { addStory } from '../db.js';
import { html, $, $$, on, navigate, GENRES, imageToBase64, compressImage } from '../app.js';

export async function renderNewStory() {
  let step = 1;
  let selectedGenre = GENRES[0];
  let coverData = null;

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
          <!-- Progress dots -->
          <div class="wizard-progress">
            <div class="wizard-dot ${step >= 1 ? 'done' : ''}"></div>
            <div class="wizard-dot ${step >= 2 ? 'done' : ''}"></div>
            <div class="wizard-dot ${step >= 3 ? 'done' : ''}"></div>
          </div>

          <!-- Step 1: Title & Description -->
          <div class="wizard-step ${step === 1 ? 'active' : ''}">
            <h2 class="wizard-heading">What's your story?</h2>
            <p class="wizard-sub">Give your story a name and a brief description to set the mood.</p>

            <div class="form-group">
              <label><i class="fa-solid fa-pencil" style="margin-right:4px"></i> Title <span class="required">*</span></label>
              <input type="text" id="ns-title" placeholder="e.g. Hujan di Bulan Juni..." autofocus />
            </div>

            <div class="form-group">
              <label><i class="fa-solid fa-align-left" style="margin-right:4px"></i> Description</label>
              <textarea id="ns-desc" rows="3" placeholder="A short description about your story..."></textarea>
            </div>

            <div class="wizard-nav">
              <button class="btn-secondary" id="btn-cancel">Cancel</button>
              <button class="btn-primary" id="btn-next1"><i class="fa-solid fa-arrow-right"></i> Next</button>
            </div>
          </div>

          <!-- Step 2: Genre -->
          <div class="wizard-step ${step === 2 ? 'active' : ''}">
            <h2 class="wizard-heading">Choose the mood</h2>
            <p class="wizard-sub">Pick a genre that best describes the feeling of your story.</p>

            <div class="genre-pills">
              ${GENRES.map(g => `<button class="genre-pill ${selectedGenre === g ? 'active' : ''}" data-genre="${g}">
                <i class="fa-solid fa-${genreIcon(g)}" style="margin-right:4px"></i>${g}
              </button>`).join('')}
            </div>

            <div class="wizard-nav">
              <button class="btn-secondary" id="btn-back2"><i class="fa-solid fa-arrow-left"></i> Back</button>
              <button class="btn-primary" id="btn-next2"><i class="fa-solid fa-arrow-right"></i> Next</button>
            </div>
          </div>

          <!-- Step 3: Cover -->
          <div class="wizard-step ${step === 3 ? 'active' : ''}">
            <h2 class="wizard-heading">Add a cover</h2>
            <p class="wizard-sub">A good cover makes your story stand out. You can always add this later.</p>

            <div class="form-group">
              <label class="cover-upload" id="cover-upload-label">
                <div class="cover-upload-content" id="cover-preview">
                  ${coverData
                    ? ''
                    : '<i class="fa-solid fa-image"></i><span>Tap to upload cover image</span>'}
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

    if (coverData && step === 3) {
      const preview = $('#cover-preview');
      preview.innerHTML = '';
      preview.style.backgroundImage = `url(${coverData})`;
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    }
  }

  function bindEvents() {
    on('#btn-ns-back', 'click', () => navigate('/'));
    on('#btn-cancel', 'click', () => navigate('/'));

    // Step 1 → 2
    if ($('#btn-next1')) {
      on('#btn-next1', 'click', () => {
        const title = $('#ns-title').value.trim();
        if (!title) {
          $('#ns-title').focus();
          $('#ns-title').style.borderColor = 'var(--danger)';
          setTimeout(() => { $('#ns-title').style.borderColor = ''; }, 2000);
          return;
        }
        step = 2;
        render();
      });
    }

    // Step 2 ↔ genre selection
    $$('.genre-pill').forEach(el => {
      on(el, 'click', () => {
        $$('.genre-pill').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        selectedGenre = el.dataset.genre;
      });
    });

    if ($('#btn-back2')) on('#btn-back2', 'click', () => { step = 1; render(); restoreFields(); });
    if ($('#btn-next2')) on('#btn-next2', 'click', () => { step = 3; render(); });

    // Step 3 ↔ cover
    if ($('#btn-back3')) on('#btn-back3', 'click', () => { step = 2; render(); });

    on('#cover-upload-label', 'click', () => { $('#ns-cover').click(); });
    on('#ns-cover', 'change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await imageToBase64(file);
      coverData = await compressImage(b64, 800, 0.7);
      const preview = $('#cover-preview');
      preview.innerHTML = '';
      preview.style.backgroundImage = `url(${coverData})`;
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    });

    // Create
    if ($('#btn-create')) {
      on('#btn-create', 'click', async () => {
        // We need to get title from step 1 — store in DOM
        const titleEl = document.querySelector('[data-saved-title]');
        const title = titleEl ? titleEl.dataset.savedTitle : (localStorage.getItem('_xan_new_title') || 'Untitled');
        const desc = localStorage.getItem('_xan_new_desc') || '';

        const { storyId, chapterId } = await addStory({
          title,
          description: desc,
          genre: selectedGenre,
          coverImage: coverData
        });

        localStorage.removeItem('_xan_new_title');
        localStorage.removeItem('_xan_new_desc');
        navigate(`/edit/${storyId}/${chapterId}`);
      });
    }

    // Save fields to localStorage for persistence across steps
    if ($('#ns-title')) {
      const savedTitle = localStorage.getItem('_xan_new_title');
      const savedDesc = localStorage.getItem('_xan_new_desc');
      if (savedTitle) $('#ns-title').value = savedTitle;
      if (savedDesc && $('#ns-desc')) $('#ns-desc').value = savedDesc;

      on('#ns-title', 'input', (e) => localStorage.setItem('_xan_new_title', e.target.value));
      on('#ns-desc', 'input', (e) => localStorage.setItem('_xan_new_desc', e.target.value));
    }
  }

  function restoreFields() {
    const savedTitle = localStorage.getItem('_xan_new_title');
    const savedDesc = localStorage.getItem('_xan_new_desc');
    if (savedTitle && $('#ns-title')) $('#ns-title').value = savedTitle;
    if (savedDesc && $('#ns-desc')) $('#ns-desc').value = savedDesc;
  }

  localStorage.removeItem('_xan_new_title');
  localStorage.removeItem('_xan_new_desc');
  render();
}

function genreIcon(genre) {
  const map = {
    'Slice of life': 'mug-hot',
    'Thoughts': 'brain',
    'Fiction': 'wand-magic',
    'Romance': 'heart',
    'Dark': 'moon',
    'Mystery': 'magnifying-glass',
    'Poetry': 'feather'
  };
  return map[genre] || 'tag';
}