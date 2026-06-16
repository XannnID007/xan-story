// ═══════════════════════════════════════════
// XAN-STORY — Data Layer (Firebase Firestore)
// Stories, chapters, panels live in the cloud.
// Reading progress stays in each visitor's browser.
// ═══════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, deleteDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXGIdsbHvfZsO55WxpYkaxv8DwuuxbFQE",
  authDomain: "xanstory-07.firebaseapp.com",
  projectId: "xanstory-07",
  storageBucket: "xanstory-07.firebasestorage.app",
  messagingSenderId: "242147614175",
  appId: "1:242147614175:web:89a93ad0c528314252b86a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

// IDs are timestamps stored as Firestore string doc-ids.
// The router works with numbers, so we convert at the edges.
const toNumId = id => parseInt(id);
const snapToList = snap => snap.docs.map(d => ({ id: toNumId(d.id), ...d.data() }));

// ─── Auth ───

export function checkAdminStatus(callback) {
  onAuthStateChanged(auth, user => callback(!!user, user));
}

export async function adminLogin(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  await signOut(auth);
}

// Console helpers (optional, handy while developing)
window.xanLogin = (email, password) =>
  adminLogin(email, password)
    .then(() => alert('Login admin sukses! Silakan refresh.'))
    .catch(err => alert('Gagal login: ' + err.message));
window.xanLogout = () => adminLogout().then(() => alert('Logged out.'));

// ─── Stories ───

export async function getAllStories() {
  try {
    const snap = await getDocs(query(collection(db, 'stories'), orderBy('updatedAt', 'desc')));
    return snapToList(snap);
  } catch (e) { console.error('getAllStories:', e); return []; }
}

export async function getStory(id) {
  try {
    const snap = await getDoc(doc(db, 'stories', String(id)));
    return snap.exists() ? { id: toNumId(snap.id), ...snap.data() } : null;
  } catch (e) { console.error('getStory:', e); return null; }
}

export async function addStory(data) {
  const id = Date.now();
  await setDoc(doc(db, 'stories', String(id)), {
    title: data.title || 'Untitled',
    description: data.description || '',
    genre: data.genre || 'Thoughts',
    coverImage: data.coverImage || null,
    status: data.status || 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return id;
}

export async function updateStory(id, data) {
  await setDoc(doc(db, 'stories', String(id)), { ...data, updatedAt: Date.now() }, { merge: true });
}

export async function deleteStory(id) {
  const chSnap = await getDocs(query(collection(db, 'chapters'), where('storyId', '==', toNumId(id))));
  for (const chDoc of chSnap.docs) await deleteChapter(toNumId(chDoc.id));
  await deleteDoc(doc(db, 'stories', String(id)));
}

// ─── Chapters ───
// NOTE: where() + orderBy() on different fields requires a Firestore
// composite index, so we filter in the query and sort client-side.
// Chapter IDs are creation timestamps → sorting by id = creation order.

export async function getChapters(storyId) {
  try {
    const snap = await getDocs(query(collection(db, 'chapters'), where('storyId', '==', toNumId(storyId))));
    return snapToList(snap).sort((a, b) => a.id - b.id);
  } catch (e) { console.error('getChapters:', e); return []; }
}

export async function getChapter(id) {
  try {
    const snap = await getDoc(doc(db, 'chapters', String(id)));
    return snap.exists() ? { id: toNumId(snap.id), ...snap.data() } : null;
  } catch (e) { console.error('getChapter:', e); return null; }
}

export async function addChapter(storyId, title) {
  const id = Date.now();
  await setDoc(doc(db, 'chapters', String(id)), {
    storyId: toNumId(storyId),
    title: title || 'Untitled Chapter',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return id;
}

export async function updateChapter(id, data) {
  await setDoc(doc(db, 'chapters', String(id)), { ...data, updatedAt: Date.now() }, { merge: true });
}

export async function deleteChapter(id) {
  const pSnap = await getDocs(query(collection(db, 'panels'), where('chapterId', '==', toNumId(id))));
  for (const pDoc of pSnap.docs) await deleteDoc(doc(db, 'panels', pDoc.id));
  await deleteDoc(doc(db, 'chapters', String(id)));
}

// ─── Panels ───
// Panel shape: { type: 'narration'|'dialogue'|'image'|'divider',
//                text, character, image, order }

export async function getPanels(chapterId) {
  try {
    const snap = await getDocs(query(collection(db, 'panels'), where('chapterId', '==', toNumId(chapterId))));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (e) { console.error('getPanels:', e); return []; }
}

// Rewrites the chapter's panels in one pass (delete old → write new).
export async function savePanels(chapterId, panelsArray) {
  const oldSnap = await getDocs(query(collection(db, 'panels'), where('chapterId', '==', toNumId(chapterId))));
  for (const oDoc of oldSnap.docs) await deleteDoc(doc(db, 'panels', oDoc.id));

  for (let i = 0; i < panelsArray.length; i++) {
    const p = panelsArray[i];
    await setDoc(doc(db, 'panels', `${chapterId}_${i}_${Date.now()}`), {
      chapterId: toNumId(chapterId),
      type: p.type || 'narration',
      text: p.text || '',
      character: p.character || '',
      image: p.image || null,
      order: i
    });
  }
}

// ─── Reading progress (local to each visitor) ───

const PROGRESS_KEY = 'xan_progress';

export async function getAllProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || [];
  } catch { return []; }
}

export async function saveProgress(storyId, chapterId, scrollPercent) {
  try {
    const current = (await getAllProgress()).filter(p => toNumId(p.storyId) !== toNumId(storyId));
    current.push({
      storyId: toNumId(storyId),
      chapterId: toNumId(chapterId),
      scrollPercent: Math.round(scrollPercent) || 0,
      lastReadAt: Date.now()
    });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(current));
  } catch (e) { console.error('saveProgress:', e); }
}

export function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

// ─── Backup ───

export async function exportAllData() {
  const [stories, chapters, panels] = await Promise.all([
    getDocs(collection(db, 'stories')),
    getDocs(collection(db, 'chapters')),
    getDocs(collection(db, 'panels'))
  ]);
  return {
    stories: stories.docs.map(d => ({ id: d.id, ...d.data() })),
    chapters: chapters.docs.map(d => ({ id: d.id, ...d.data() })),
    panels: panels.docs.map(d => ({ id: d.id, ...d.data() })),
    exportedAt: Date.now(),
    version: 2
  };
}

// Kept for compatibility — data now lives in the cloud.
export async function seedDemoData() { return true; }