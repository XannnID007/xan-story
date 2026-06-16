# xan-story — CLAUDE.md

Personal visual storytelling platform bergaya komik/webtoon.
Single author (admin), pembaca bisa akses tanpa login.
Deployed di Netlify — static hosting, no server.

---

## Tech Stack

- **Bahasa**: Vanilla HTML, CSS, JavaScript (ES Modules) — TANPA framework JS
- **Storage**: Firebase Firestore (stories, chapters, panels) via CDN v10.12.2
- **Auth**: Firebase Auth — admin login pakai email/password
- **Progress baca**: localStorage per visitor (bukan Firestore)
- **Icons**: Font Awesome 6 via cdnjs — JANGAN pakai Tabler Icons
- **Font**: Playfair Display (judul/konten cerita) + DM Sans (UI)
- **Deploy**: Netlify (static)
- **Routing**: SPA hash-based custom (`#/`, `#/story/:id`, dst)

---

## Struktur File

```
xan-story/
├── index.html
├── css/
│   └── style.css           # Semua styling — jangan tambah file CSS baru
├── js/
│   ├── main.js             # Entry point, routes, bottom nav, splash
│   ├── app.js              # Router, helpers ($, $$, on, html, navigate, formatters)
│   ├── db.js               # Semua operasi Firebase (Firestore + Auth)
│   └── pages/
│       ├── home.js         # Landing page: hero, slider, continue reading, library
│       ├── story.js        # Detail story + chapter list
│       ├── editor.js       # Panel editor (admin only)
│       ├── reader.js       # Mode baca webtoon
│       ├── new.js          # Wizard 3-step buat story baru
│       ├── settings.js     # Settings: auth, backup, clear history
│       └── login.js        # Admin login form
└── assets/
```

---

## Firebase Schema (Firestore)

```
stories/{id}    → { title, description, genre, coverImage, status, createdAt, updatedAt }
chapters/{id}   → { storyId, title, createdAt, updatedAt }
panels/{id}     → { chapterId, type, text, character, image, order }
```

**Panel types**: `narration` | `dialogue` | `image` | `divider`

**Progress** (localStorage key: `xan_progress`):

```js
[{ storyId, chapterId, scrollPercent, lastReadAt }];
```

---

## Design System — WAJIB DIIKUTI

### CSS Variables (jangan hardcode nilai warna)

```css
--bg, --bg2          /* background hitam */
--accent             /* #b820e8 — ungu utama */
--accent2            /* #e07aff — ungu muda */
--t1, --t2, --t3     /* teks: putih → abu */
--glass-fill, --glass-brd, --glass-blur   /* glassmorphism */
--border, --accent-b, --accent-bg         /* border & overlay */
--r, --r-sm, --r-pill                    /* border radius */
```

### Warna

- **HANYA hitam dan ungu** — tidak ada warna lain
- Gradient harus purple-only — jangan ada sentuhan biru/hijau/merah
- Dark mode SAJA — tidak ada light mode, tidak ada toggle tema

### UI Style

- Glassmorphism untuk card & panel
- Mobile-first, fully responsive desktop
- Font konten: Playfair Display (serif) — untuk narasi & judul
- Font UI: DM Sans — untuk label, tombol, meta

### Komponen Kunci

- **Bottom nav**: floating pill, tersembunyi di halaman editor/reader/new/login
- **Topbar**: `position: fixed`, transparan → frosted glass saat `.scrolled`
- **Slider**: `requestAnimationFrame` + recycle node pertama ke belakang (BUKAN CSS animation, BUKAN setInterval)
- **Search**: compact slide-down dropdown di bawah topbar

---

## Pola Coding Wajib

- Semua JS pakai **ES Modules** (`import`/`export`)
- Navigasi: `navigate('/path')` dari `app.js` — bukan `window.location.href`
- DOM: gunakan `$()`, `$$()`, `on()`, `html()` dari `app.js`
- Semua akses Firebase melalui fungsi di `db.js` — jangan panggil Firestore langsung dari halaman
- Admin check: `checkAdminStatus(isAdmin => { ... })` dari `db.js`
- Cleanup: setiap `renderX()` bisa return fungsi cleanup yang dipanggil saat navigasi pergi

---

## Peran User

| Peran      | Akses                                                      |
| ---------- | ---------------------------------------------------------- |
| **Admin**  | Login Firebase Auth → bisa buat/edit/hapus story & chapter |
| **Reader** | Tanpa login → bisa baca, simpan progress di localStorage   |

---

## Hal yang JANGAN Dilakukan

- ❌ Jangan pakai Tabler Icons — Font Awesome 6 only
- ❌ Jangan hardcode warna hex langsung — pakai CSS variables
- ❌ Jangan tambah warna selain hitam dan ungu
- ❌ Jangan buat light mode atau toggle tema
- ❌ Jangan query Firestore langsung dari halaman — lewat db.js
- ❌ Jangan pakai `window.location.href` untuk navigasi internal
- ❌ Jangan tambah library baru tanpa bilang dulu
- ❌ Jangan ubah firebaseConfig di db.js
- ❌ Jangan ubah struktur slider di home.js (requestAnimationFrame + recycle)

---

## Fitur yang Sudah Ada

- [x] Firebase Firestore untuk stories, chapters, panels
- [x] Firebase Auth untuk admin login/logout
- [x] Progress baca di localStorage
- [x] Wizard 3-step buat story baru
- [x] Panel editor: narration, dialogue, image, divider
- [x] Mode baca webtoon + auto-hide header
- [x] Progress bar tipis di atas reader (sudah ada di CSS)
- [x] Auto-save progress saat scroll (debounced 2 detik)
- [x] Continue reading di home
- [x] Slider auto-scroll dengan requestAnimationFrame
- [x] Search dropdown kompak
- [x] Constellation animation di hero
- [x] Admin-only controls (tambah/edit/hapus story & chapter)

---

## Cara Verifikasi Hasil

1. Buka di browser (Live Server atau Netlify preview)
2. Cek console — tidak boleh ada error merah
3. Cek slider tetap scroll otomatis, tidak berhenti
4. Cek section "Continue reading" muncul jika ada progress tersimpan
5. Cek di mobile (375px) — semua elemen rapi dan bisa diklik
6. Cek tidak ada warna selain hitam/ungu muncul di UI
