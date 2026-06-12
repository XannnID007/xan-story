import { savePanels } from '../db.js';
import { html, $, on, navigate } from '../app.js';

export async function renderSettings() {
  const stories = await getAllStories();

  html('#app-view', `
    <div class="settings-page">
      <div class="editor-header">
        <button class="btn-icon" id="btn-set-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="editor-title-area">
          <span class="editor-subtitle" style="font-size:15px;opacity:1;font-weight:500">Settings</span>
        </div>
        <div style="width:40px"></div>
      </div>

      <div class="settings-list">
        <div class="settings-group">
          <div class="settings-group-title">Data</div>
          <div class="settings-item" id="item-export">
            <div class="settings-item-info">
              <i class="fa-solid fa-download"></i>
              <div>
                <div class="settings-item-label">Export backup</div>
                <div class="settings-item-desc">${stories.length} stories will be saved</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right settings-arrow"></i>
          </div>
          <div class="settings-item" id="item-import">
            <div class="settings-item-info">
              <i class="fa-solid fa-upload"></i>
              <div>
                <div class="settings-item-label">Import backup</div>
                <div class="settings-item-desc">Restore from a backup file</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right settings-arrow"></i>
            <input type="file" id="import-file" accept=".json" hidden />
          </div>
          <div class="settings-item danger" id="item-clear">
            <div class="settings-item-info">
              <i class="fa-solid fa-trash-can"></i>
              <div>
                <div class="settings-item-label">Clear all data</div>
                <div class="settings-item-desc">Delete everything permanently</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right settings-arrow"></i>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">About</div>
          <div class="settings-item">
            <div class="settings-item-info">
              <i class="fa-solid fa-heart"></i>
              <div>
                <div class="settings-item-label">xanstory v1.0</div>
                <div class="settings-item-desc">Data stored locally in your browser</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="settings-toast" class="settings-toast"></div>
      <div style="height:80px"></div>
    </div>
  `);

  function toast(msg) {
    const t = $('#settings-toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  on('#btn-set-back', 'click', () => navigate('/'));

  on('#item-export', 'click', async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xanstory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded!');
  });

  on('#item-import', 'click', () => $('#import-file').click());
  on('#import-file', 'change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.stories || !data.version) { toast('Invalid backup'); return; }
      if (confirm('Replace all existing data?')) {
        await importAllData(data);
        toast('Restored!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch { toast('Failed to read file'); }
  });

  on('#item-clear', 'click', async () => {
    if (confirm('Delete ALL data? This cannot be undone!')) {
      if (confirm('Really sure? Export backup first if needed.')) {
        await importAllData({ stories: [], chapters: [], panels: [], progress: [], settings: [], version: 1 });
        toast('All data cleared');
        setTimeout(() => navigate('/'), 1000);
      }
    }
  });
}