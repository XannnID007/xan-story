// ─── FIREBASE SDK INTEGRATION via CDN ───
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔥 MASUKKAN CONFIG FIREBASE KAMU DI SINI (DARI LANGKAH 2)
const firebaseConfig = {
  apiKey: "AIzaSyCXGIdsbHvfZsO55WxpYkaxv8DwuuxbFQE",
  authDomain: "xanstory-07.firebaseapp.com",
  projectId: "xanstory-07",
  storageBucket: "xanstory-07.firebasestorage.app",
  messagingSenderId: "242147614175",
  appId: "1:242147614175:web:89a93ad0c528314252b86a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

// ─── HELPER MENGUBAH ID MENJADI NUMBER COMPATIBLE ───
// Karena Firestore memakai String ID sedangkan router kodemu memakai Number (parseInt)
const toNumId = id => parseInt(id);

// ─── LOGIN & MANAGEMENT UTILITY FOR IHSAN ───
// Kamu bisa memanggil fungsi ini via Browser Console untuk login sebagai admin
window.xanLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login Sukses! Kamu sekarang admin:", userCredential.user.email);
    alert("Login Admin Sukses! Silakan refresh halaman.");
  } catch (error) {
    console.error("Login Gagal:", error.message);
    alert("Gagal Login: " + error.message);
  }
};

window.xanLogout = async () => {
  await signOut(auth);
  console.log("Logged out.");
  alert("Logged out dari sistem admin.");
};

// Cek status login secara real-time untuk menyembunyikan/menampilkan tombol aksi
export function checkAdminStatus(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) callback(true);
    else callback(false);
  });
}

export async function adminLogin(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login Admin Sukses!");
    window.location.reload(); // Refresh otomatis biar tombol admin muncul
  } catch (error) {
    alert("Gagal Login: " + error.message);
  }
}

// ─── SEED DATA FUNCTION (Dikosongkan agar tidak menimpa Firebase) ───
export async function seedDemoData() {
  // Fungsi ini dikosongkan karena data sekarang hidup secara online di Cloud
  return true;
}

// ─── STORIES CRUD ───
export async function getAllStories() {
  try {
    const q = query(collection(db, "stories"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    const data = [];
    snap.forEach(doc => {
      data.push({ id: toNumId(doc.id), ...doc.data() });
    });
    return data;
  } catch (e) { console.error(e); return []; }
}

export async function getStory(id) {
  try {
    const docRef = doc(db, "stories", String(id));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: toNumId(docSnap.id), ...docSnap.data() };
    }
    return null;
  } catch (e) { console.error(e); return null; }
}

export async function addStory(data) {
  const id = Date.now(); // Gunakan waktu saat ini sebagai ID unik
  const docRef = doc(db, "stories", String(id));
  
  await setDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
    createdAt: Date.now()
  });
  
  return id;
}

export async function updateStory(id, data) {
  const docRef = doc(db, "stories", String(id));
  data.updatedAt = Date.now();
  await setDoc(docRef, data, { merge: true });
}

export async function deleteStory(id) {
  // Hapus Cerita
  await deleteDoc(doc(db, "stories", String(id)));
  
  // Clean up chapters terkait
  const chSnap = await getDocs(query(collection(db, "chapters"), where("storyId", "==", toNumId(id))));
  chSnap.forEach(async (cDoc) => {
    await deleteChapter(toNumId(cDoc.id));
  });
}

// ─── CHAPTERS CRUD ───
export async function getChapters(storyId) {
  try {
    const q = query(collection(db, "chapters"), where("storyId", "==", toNumId(storyId)), orderBy("updatedAt", "asc"));
    const snap = await getDocs(q);
    const data = [];
    snap.forEach(doc => {
      data.push({ id: toNumId(doc.id), ...doc.data() });
    });
    return data;
  } catch (e) { console.error(e); return []; }
}

export async function getChapter(id) {
  try {
    const docRef = doc(db, "chapters", String(id));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: toNumId(docSnap.id), ...docSnap.data() };
    }
    return null;
  } catch (e) { console.error(e); return null; }
}

export async function updateChapter(id, data) {
  const docRef = doc(db, "chapters", String(id));
  data.updatedAt = Date.now();
  await setDoc(docRef, data, { merge: true });
}

export async function addChapter(storyId) {
  const chId = Date.now(); // Gunakan timestamp unik sebagai ID numerik berbentuk string
  const docRef = doc(db, "chapters", String(chId));
  await setDoc(docRef, {
    storyId: toNumId(storyId),
    title: "Untitled Chapter",
    updatedAt: Date.now()
  });
  return chId;
}

export async function deleteChapter(id) {
  await deleteDoc(doc(db, "chapters", String(id)));
  
  // Clean up panels terkait di dalam chapter ini
  const pSnap = await getDocs(query(collection(db, "panels"), where("chapterId", "==", toNumId(id))));
  pSnap.forEach(async (pDoc) => {
    await deleteDoc(doc(db, "panels", pDoc.id));
  });
}

// ─── PANELS CRUD ───
export async function getPanels(chapterId) {
  try {
    const q = query(collection(db, "panels"), where("chapterId", "==", toNumId(chapterId)), orderBy("order", "asc"));
    const snap = await getDocs(q);
    const data = [];
    snap.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (e) { console.error(e); return []; }
}

// Fungsi internal penunjang managemen editor panel aplikasi kamu
export async function savePanels(chapterId, panelsArray) {
  // Reset dan tulis ulang panel array untuk bab ini
  const q = query(collection(db, "panels"), where("chapterId", "==", toNumId(chapterId)));
  const oldSnap = await getDocs(q);
  for (const oDoc of oldSnap.docs) {
    await deleteDoc(doc(db, "panels", oDoc.id));
  }
  
  for (let i = 0; i < panelsArray.length; i++) {
    const p = panelsArray[i];
    const pId = `${chapterId}_${i}_${Date.now()}`;
    await setDoc(doc(db, "panels", pId), {
      chapterId: toNumId(chapterId),
      type: p.type || "narration",
      text: p.text || "",
      character: p.character || "",
      image: p.image || null,
      order: i
    });
  }
}

// ─── PROGRESS BACA (Tetap Simpan di Browser Masing-masing Pembaca) ───
// Supaya setiap pengunjung IG punya riwayat bacaan mereka sendiri tanpa merusak data terpusat
export async function getAllProgress() {
  try {
    const localProg = localStorage.getItem("xan_progress");
    return localProg ? JSON.parse(localProg) : [];
  } catch (e) { return []; }
}

export async function saveProgress(storyId, chapterId, scrollPercent) {
  try {
    let current = await getAllProgress();
    current = current.filter(p => toNumId(p.storyId) !== toNumId(storyId));
    current.push({
      storyId: toNumId(storyId),
      chapterId: toNumId(chapterId),
      scrollPercent: parseInt(scrollPercent),
      lastReadAt: Date.now()
    });
    localStorage.setItem("xan_progress", JSON.stringify(current));
  } catch (e) { console.error(e); }
}