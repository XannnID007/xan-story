// ═══ Admin Login ═══
import { html, $, on, navigate } from '../app.js';
import { adminLogin } from '../db.js';

export function renderLogin() {
  html('#app-view', `
    <div class="login-page">
      <div class="editor-header">
        <button class="btn-icon" id="btn-login-back"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="editor-title-area">
          <span class="editor-subtitle" style="font-size:15px;opacity:1;font-weight:500">Admin login</span>
        </div>
        <div style="width:40px"></div>
      </div>

      <div class="login-card">
        <div class="login-icon"><i class="fa-solid fa-user-shield"></i></div>
        <h2 class="login-heading">Welcome back</h2>
        <p class="login-sub">Sign in to manage your stories</p>

        <div class="form-group">
          <label><i class="fa-solid fa-envelope" style="margin-right:4px"></i> Email</label>
          <input type="email" id="login-email" placeholder="you@email.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label><i class="fa-solid fa-lock" style="margin-right:4px"></i> Password</label>
          <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" />
        </div>

        <button id="btn-do-login" class="btn-primary btn-full"><i class="fa-solid fa-right-to-bracket"></i> Sign in</button>
        <div id="login-error" class="login-error"></div>
      </div>
    </div>
  `);

  on('#btn-login-back', 'click', () => navigate('/settings'));

  async function doLogin() {
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const errDiv = $('#login-error');
    const btn = $('#btn-do-login');

    if (!email || !password) {
      errDiv.textContent = 'Email dan password tidak boleh kosong.';
      return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    errDiv.textContent = '';

    try {
      await adminLogin(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      errDiv.textContent = 'Gagal login. Cek kembali email atau password.';
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign in';
    }
  }

  on('#btn-do-login', 'click', doLogin);
  on('#login-password', 'keydown', e => { if (e.key === 'Enter') doLogin(); });
}