import { html, $, on, navigate } from '../app.js'; 
import { auth } from '../db.js'; 
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function renderLogin() {
  html('#app-view', `
    <div style="max-width: 400px; margin: 80px auto; padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
      <h2 style="text-align: center; margin-bottom: 24px; color: #333;">Admin Login</h2>
      <input type="email" id="login-email" placeholder="Email Firebase kamu" style="width: 100%; padding: 12px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 16px; color: #333;">
      <input type="password" id="login-password" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 16px; color: #333;">
      <button id="btn-do-login" class="btn-primary" style="width: 100%; padding: 14px; font-size: 16px; border-radius: 8px;">Masuk</button>
      <div id="login-error" style="color: #dc3545; margin-top: 16px; text-align: center; font-size: 14px;"></div>
    </div>
  `);

  on('#btn-do-login', 'click', async () => {
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const errDiv = $('#login-error');
    const btn = $('#btn-do-login');

    if (!email || !password) {
      errDiv.innerText = "Email dan password tidak boleh kosong!";
      return;
    }

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...`;
    errDiv.innerText = ""; 

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login Admin Sukses! Selamat datang kembali.");
      navigate('/'); 
    } catch (error) {
      console.error(error);
      errDiv.innerText = "Gagal login. Cek kembali email atau password-mu.";
      btn.innerHTML = `Masuk`;
    }
  });
}