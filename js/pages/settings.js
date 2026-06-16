// ═══ Settings — admin, backup, reading history ═══
import { getAllStories, exportAllData, clearProgress, checkAdminStatus, adminLogout } from '../db.js';
import { html, $, on, navigate, footerHtml } from '../app.js';

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
          <div class="settings-group-title">Account</div>
          <div class="settings-item" id="item-auth">
            <div class="settings-item-info">
              <i class="fa-solid fa-user-shield"></i>
              <div>
                <div class="settings-item-label" id="auth-label">Checking...</div>
                <div class="settings-item-desc" id="auth-desc">Please wait</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right settings-arrow"></i>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Data</div>
          <div class="settings-item" id="item-export">
            <div class="settings-item-info">
              <i class="fa-solid fa-download"></i>
              <div>
                <div class="settings-item-label">Export backup</div>
                <div class="settings-item-desc">${stories.length} stories will be saved as JSON</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right settings-arrow"></i>
          </div>
          <div class="settings-item" id="item-clear-history">
            <div class="settings-item-info">
              <i class="fa-solid fa-clock-rotate-left"></i>
              <div>
                <div class="settings-item-label">Clear reading history</div>
                <div class="settings-item-desc">Reset your local reading progress</div>
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
                <div class="settings-item-desc">Stories live in the cloud · history stays on your device</div>
              </div>
            </div>
          </div>
        </div>

        ${footerHtml()}
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

  // ─── Admin login / logout ───
  let isLoggedIn = false;
  checkAdminStatus((loggedIn, user) => {
    isLoggedIn = loggedIn;
    const label = $('#auth-label');
    const desc = $('#auth-desc');
    if (!label || !desc) return;
    if (loggedIn) {
      label.textContent = 'Logout admin';
      desc.textContent = `Logged in as ${user.email}`;
    } else {
      label.textContent = 'Admin login';
      desc.textContent = 'Sign in to manage stories';
    }
  });

  on('#item-auth', 'click', async () => {
    if (isLoggedIn) {
      if (confirm('Logout dari admin?')) {
        await adminLogout();
        toast('Logged out');
        setTimeout(() => renderSettings(), 800);
      }
    } else {
      navigate('/login');
    }
  });

  // ─── Backup ───
  on('#item-export', 'click', async () => {
    toast('Preparing backup...');
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xanstory-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup downloaded!');
    } catch (err) {
      console.error(err);
      toast('Export failed');
    }
  });

  // ─── Reading history ───
  on('#item-clear-history', 'click', () => {
    if (confirm('Clear your reading history? Stories will not be affected.')) {
      clearProgress();
      toast('Reading history cleared');
    }
  });
}