
// ============================================================
// BLOCK 1
// ============================================================

  const CLOUDINARY_CLOUD_NAME    = 'dtebha50r';
  const CLOUDINARY_UPLOAD_PRESET = 'bci_materials';
  // Upload URL is now dynamic — set per file type in uploadToCloudinary()
  // PDF/DOC/other → /raw/upload
  // Audio (mp3, wav etc.) → /video/upload  (Cloudinary requirement)
  // Image → /image/upload
  const CLOUDINARY_UPLOAD_URL_RAW   = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
  const CLOUDINARY_UPLOAD_URL_VIDEO = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
  const CLOUDINARY_UPLOAD_URL_IMAGE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


// ============================================================
// BLOCK 2
// ============================================================

// FIREBASE_CONFIG — Replace ALL values below with your project's config
const firebaseConfig = {
  apiKey: "AIzaSyAHbMuU0j1Zq6ROp_10S140TQeyIDJQjwI",
  authDomain: "bci-institute.firebaseapp.com",
  projectId: "bci-institute",
  storageBucket: "bci-institute.firebasestorage.app",
  messagingSenderId: "712669087038",
  appId: "1:712669087038:web:6d732065f6616f978f186f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =============================================================
// INSTITUTE CONFIGURATION
// To change any detail below, just edit the values
// Search: "INSTITUTE_CONFIG" to find this section
// =============================================================
const INSTITUTE_CONFIG = {
  name: "Brilliant Coaching Institute",   // INSTITUTE_NAME
  shortName: "B.C.I",
  tagline: "Aapka Bhavishya, Hamari Zimmedari",
  taglineEn: "Your Future, Our Responsibility",
  phone: "6206437776",                    // INSTITUTE_PHONE
  address: "Turha Toli, Mahavir Asthan, Civil Lines, Buxar - 802101", // INSTITUTE_ADDRESS
  director: "Pradeep Kumar",
  city: "Buxar, Bihar",
  classes: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], // Default classes
  subjects: [                             // Default subjects
    "Physics", "Chemistry", "Biology",
    "Mathematics", "English",
    "Social Science", "History", "Civics", "Geography", "Economics",
    "Hindi", "Sanskrit"
  ]
};

// =============================================================
// ADMIN CREDENTIALS (Default)
// ADMIN_CREDENTIALS
// These are stored in Firebase — you can change from Settings panel
// Default: admin1 / admin
// =============================================================
const DEFAULT_ADMIN = {
  username: "admin1",
  password: "admin"
};

// =============================================================
// APP STATE — tracks current user session
// =============================================================
let AppState = {
  currentUser: null,      // logged in student object
  isAdmin: false,         // true if admin is logged in
  currentPage: '',        // which page is showing
  currentClassId: null,   // selected class
  currentFolderId: null,  // selected folder (null = root)
  breadcrumbs: [],        // folder navigation trail
};

// =============================================================
// UTILITY: Show toast notification
// Usage: showToast('message', 'success'|'error'|'warning'|'info')
// =============================================================
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  // Auto remove after duration
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
}

// =============================================================
// UTILITY: Show/hide pages
// Usage: showPage('page-id')
// =============================================================
// Disable browser auto-scroll-restoration — prevents random scroll jumps on SPA navigation
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function showPage(pageId, addHistory = true) {
  window.scrollTo(0, 0); // always start from top on page switch
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    AppState.currentPage = pageId;
  }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
  const bd0=document.getElementById('sidebar-backdrop'); if(bd0) bd0.style.display='none';

  // Always hide both dashboard areas when navigating to a public page.
  const dashArea = document.getElementById('dashboard-area');
  if (dashArea) dashArea.style.display = 'none';
  const adminDashArea = document.getElementById('admin-dashboard-area');
  if (adminDashArea) adminDashArea.style.display = 'none';

  // Re-apply saved logo + institute data to homepage elements whenever
  // returning to the public homepage (after logout or session expiry).
  if (pageId === 'page-home') {
    loadInstituteInfo(); // async, non-blocking — updates homepage logo + text
  }

  if (addHistory) {
    history.pushState({ page: pageId, area: 'public' }, '', `#${pageId}`);
  }
}

// =============================================================
// UTILITY: Open / Close modals
// =============================================================
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// toggleSection — used by collapsible sections inside the Edit Institute modal
// Toggles the visibility of a section div and rotates its arrow indicator.
// `sectionId` — the id of the collapsible <div>
// `headerEl`  — the clicked header element (contains the arrow span as last child)
function toggleSection(sectionId, headerEl) {
  const section = document.getElementById(sectionId);
  const arrow   = document.getElementById(sectionId + '-arrow');
  if (!section) return;
  const isOpen = section.style.display !== 'none';
  section.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

// =============================================================
// BROWSER BACK BUTTON — History API (SPA navigation)
// =============================================================
window.addEventListener('popstate', (e) => {
  // If PDF viewer is open — back button closes it
  const pdfModal = document.getElementById('modal-pdf-viewer');
  if (pdfModal && pdfModal.style.display === 'flex') {
    closePdfViewer();
    return;
  }
  // If Audio player is open — back button closes it
  const audioModal = document.getElementById('modal-audio-player');
  if (audioModal && audioModal.style.display === 'flex') {
    closeAudioPlayer();
    return;
  }
  // If mini player is showing — back button closes audio completely
  const miniTab = document.getElementById('audio-mini-tab');
  if (miniTab && miniTab.style.display !== 'none' && miniTab.style.display !== '') {
    closeAudioPlayer();
    return;
  }

  const state = e.state;

  if (!state) {
    // No state — user went back before any navigation
    if (AppState.isAdmin) {
      showAdminPage('a-page-home', false);
    } else if (AppState.currentUser) {
      showStudentPage('s-page-home', false);
    }
    return;
  }

  const { page, area, folderId, breadcrumbs } = state;

  if (area === 'student') {
    showStudentPage(page, false);
    
    // ⚠️ FIX 4: Restore folder state when navigating back
    if (page === 's-page-materials') {
      if (breadcrumbs !== undefined) {
        AppState.breadcrumbs = breadcrumbs || [];
        AppState.currentFolderId = folderId || null;
        updateStudentBreadcrumb();
        loadStudentFolders(folderId || null);
      } else {
        loadStudentFolders();
      }
    }
    
    // Reload data for other pages
    if (page === 's-page-notices') loadStudentNotices();
  } else if (area === 'admin') {
    showAdminPage(page, false);
    // Reload data for the page being navigated back to
    if (page === 'a-page-home') { loadAdminStats(); }
    if (page === 'a-page-pending') loadPendingStudents();
    if (page === 'a-page-students') loadAllStudents();
    if (page === 'a-page-classes') loadClasses();
    if (page === 'a-page-notices') loadAdminNotices();
    if (page === 'a-page-sessions') loadSessions();
    if (page === 'a-page-homepage') loadHomepageEditor();
  } else if (area === 'public') {
    showPage(page, false);
  }
});

// Close modal when clicking outside
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// =============================================================
// UTILITY: Format date/time for display
// =============================================================
function formatDate(timestamp) {
  if (!timestamp) return '—';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// =============================================================
// UTILITY: Countdown display (for timer unlock feature)
// Returns string like "2 days, 4 hrs" or "Unlocking soon..."
// =============================================================
// Format DOB from YYYY-MM-DD to DD-MM-YYYY for display
function formatDOB(dob) {
  if (!dob) return '—';
  const parts = dob.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dob;
}

function getCountdown(unlockTime) {
  if (!unlockTime) return null;
  const target = unlockTime.toDate ? unlockTime.toDate() : new Date(unlockTime);
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) return 'Unlocking...';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hrs}h remaining`;
  if (hrs > 0) return `${hrs}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

// =============================================================
// UTILITY: Check if item should be auto-unlocked by timer
// Runs every 60 seconds to auto-publish scheduled content
// =============================================================
async function checkAndAutoUnlock() {
  try {
    const now = firebase.firestore.Timestamp.now();
    // Check folders
    const lockedFolders = await db.collection('folders')
      .where('isLocked', '==', true)
      .where('unlockTimer', '<=', now).get();
    lockedFolders.forEach(doc => {
      db.collection('folders').doc(doc.id).update({ isLocked: false, unlockTimer: null });
    });
    // Check materials
    const lockedMaterials = await db.collection('materials')
      .where('isLocked', '==', true)
      .where('unlockTimer', '<=', now).get();
    lockedMaterials.forEach(doc => {
      db.collection('materials').doc(doc.id).update({ isLocked: false, unlockTimer: null });
    });
  } catch (e) {
    // Silent — runs in background
    console.log('Auto-unlock check:', e.message);
  }
}
// Run auto-unlock check every 60 seconds
setInterval(checkAndAutoUnlock, 60000);

// =============================================================
// UTILITY: Mobile sidebar toggle
// =============================================================
function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('mobile-open');
  if (backdrop) {
    if (isOpen) {
      backdrop.style.display = 'block';
      // Small delay so display:block renders before opacity transition
      requestAnimationFrame(() => { backdrop.style.opacity = '1'; });
    } else {
      backdrop.style.opacity = '0';
      setTimeout(() => { backdrop.style.display = 'none'; }, 250);
    }
  }
}

function closeMobileSidebar() {
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) {
    backdrop.style.opacity = '0';
    setTimeout(() => { backdrop.style.display = 'none'; }, 250);
  }
}

// =============================================================
// UTILITY: Get file type icon by material type
// =============================================================
function getFileIcon(type) {
  const icons = {
    'Notes': '📄', 'Assignment': '📝', 'DPP': '📋',
    'Previous Year Paper': '📜', 'Syllabus': '📑',
    'Video': '🎥', 'Audio': '🎵', 'Image': '🖼️', 'Other': '📌'
  };
  return icons[type] || '📄';
}

// =============================================================
// CHECK SESSION on page load
// If user was logged in before and session not expired, restore
// Students: 3 days | Admin: 1 day
// =============================================================
const SESSION_KEY         = 'bci_session';       // legacy / generic fallback
const ADMIN_SESSION_KEY   = 'bci_session_admin';
const STUDENT_SESSION_KEY = 'bci_session_student';

// =============================================================
// GENERATE STUDENT UNIQUE ID
// Format: 2627-BSEB-06-001
// session 2026-27 → 2627 | board → BSEB | class → 06 | roll → 001
// =============================================================
function generateStudentId(session, board, className, roll) {
  // session: "2026-27" → "2627"
  const yr = session.replace('20','').replace('-','');
  // board: "BSEB" or "CBSE"
  const bd = (board || 'BSEB').toUpperCase();
  // className: MUST be display name like "Class 6" or "Class 10"
  // Extract only the numeric part e.g. "Class 9" → "9" → "09"
  // Strip everything except digits, take only first 1-2 digits (the class number)
  const digits = String(className).replace(/[^0-9]/g, '');
  // Take first 2 chars max to avoid picking up timestamps from doc IDs
  const clNum  = digits.substring(0, 2) || '00';
  const cl     = clNum.padStart(2, '0');
  // roll: number → "001"
  const rl = String(parseInt(roll) || 0).padStart(3, '0');
  return `${yr}-${bd}-${cl}-${rl}`;
}
let STUDENT_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days (overridable from Firestore)
let ADMIN_EXPIRY_MS   = 1 * 24 * 60 * 60 * 1000; // 1 day  (overridable from Firestore)

function saveSession(data) {
  const key = data.isAdmin ? ADMIN_SESSION_KEY : STUDENT_SESSION_KEY;
  const payload = { ...data, savedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(payload));
  // Also keep legacy key in sync for any older code paths
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(STUDENT_SESSION_KEY);
}

// =============================================================
// SINGLE SESSION TOKEN SYSTEM
// Prevents simultaneous logins from DIFFERENT devices only.
// Same browser / same device = multiple tabs are allowed freely.
// =============================================================

// Generate or retrieve a stable device ID for this browser
// Stored in localStorage so it persists across tabs on the same browser
function getDeviceId() {
  const KEY = 'bci_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    // Build a fingerprint from stable browser characteristics + random suffix
    const fp = [
      navigator.language,
      navigator.platform,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join('|');
    // Hash it lightly + add random suffix so two identical machines still differ
    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
      hash = ((hash << 5) - hash) + fp.charCodeAt(i);
      hash |= 0;
    }
    id = Math.abs(hash).toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(KEY, id);
  }
  return id;
}

function generateSessionToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function writeSessionToken(isAdmin, userId) {
  const token    = generateSessionToken();
  const deviceId = getDeviceId();
  try {
    if (isAdmin) {
      await db.collection('admin').doc('activeSession').set({ token, deviceId, updatedAt: Date.now() });
    } else {
      await db.collection('students').doc(userId).update({ activeToken: token, activeDeviceId: deviceId, activeTokenAt: Date.now() });
    }
  } catch {}
  return token;
}

async function clearSessionToken(isAdmin, userId) {
  try {
    if (isAdmin) {
      await db.collection('admin').doc('activeSession').delete();
    } else {
      await db.collection('students').doc(userId).update({ activeToken: null, activeDeviceId: null });
    }
  } catch {}
}

async function checkActiveSessionExists(isAdmin, userId) {
  // Returns true ONLY if another DIFFERENT device has a VALID (non-expired) active session.
  // Stale sessions older than the configured timeout are treated as expired — no modal shown.
  const myDeviceId = getDeviceId();
  try {
    if (isAdmin) {
      const doc = await db.collection('admin').doc('activeSession').get();
      if (!doc.exists || !doc.data().token) return false;
      const data = doc.data();
      // ── Expiry check: if the session is older than ADMIN_EXPIRY_MS, it's dead ──
      const age = Date.now() - (data.updatedAt || 0);
      if (age > ADMIN_EXPIRY_MS) {
        // Auto-clean the stale Firestore record so it doesn't block future logins
        try { await db.collection('admin').doc('activeSession').delete(); } catch {}
        return false;
      }
      // Same device? Allow silently
      return data.deviceId !== myDeviceId;
    } else {
      const doc = await db.collection('students').doc(userId).get();
      if (!doc.exists || !doc.data().activeToken) return false;
      const data = doc.data();
      // ── Expiry check: if the session is older than STUDENT_EXPIRY_MS, it's dead ──
      const age = Date.now() - (data.activeTokenAt || 0);
      if (age > STUDENT_EXPIRY_MS) {
        // Auto-clean stale token fields from the student document
        try {
          await db.collection('students').doc(userId).update({
            activeToken: firebase.firestore.FieldValue.delete(),
            activeDeviceId: firebase.firestore.FieldValue.delete(),
            activeTokenAt: firebase.firestore.FieldValue.delete(),
          });
        } catch {}
        return false;
      }
      // Same device? Allow silently
      return data.activeDeviceId !== myDeviceId;
    }
  } catch { return false; }
}

async function verifySessionToken() {
  // Called every 30s — checks if this device's token still matches Firestore
  // Returns 'valid' | 'kicked' | 'skip'
  try {
    // Read from the correct role-specific key based on current AppState
    const key = AppState.isAdmin ? ADMIN_SESSION_KEY : STUDENT_SESSION_KEY;
    const raw = localStorage.getItem(key) || localStorage.getItem(SESSION_KEY);
    if (!raw) return 'skip';
    const session = JSON.parse(raw);
    const myToken    = session.token;
    const myDeviceId = getDeviceId();
    if (!myToken) return 'skip';

    if (session.isAdmin) {
      const doc = await db.collection('admin').doc('activeSession').get();
      if (!doc.exists) return 'kicked';
      const data = doc.data();
      if (data.token !== myToken && data.deviceId !== myDeviceId) return 'kicked';
      return 'valid';
    } else {
      const userId = session.user?.id;
      if (!userId) return 'skip';
      const doc = await db.collection('students').doc(userId).get();
      if (!doc.exists) return 'kicked';
      const data = doc.data();
      if (data.activeToken !== myToken && data.activeDeviceId !== myDeviceId) return 'kicked';
      return 'valid';
    }
  } catch { return 'skip'; }
}

function getValidSession() {
  // Try admin key first, then student key, then legacy key
  const keys = [ADMIN_SESSION_KEY, STUDENT_SESSION_KEY, SESSION_KEY];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const now = Date.now();
      const expiry = data.isAdmin ? ADMIN_EXPIRY_MS : STUDENT_EXPIRY_MS;
      if (now - (data.savedAt || 0) > expiry) {
        localStorage.removeItem(key);
        continue;
      }
      return data;
    } catch {
      localStorage.removeItem(key);
    }
  }
  return null;
}

function showSessionExpiry() {
  try {
    // Read from role-specific key based on current AppState
    const key = AppState.isAdmin ? ADMIN_SESSION_KEY : STUDENT_SESSION_KEY;
    const raw = localStorage.getItem(key) || localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const expiry = data.isAdmin ? ADMIN_EXPIRY_MS : STUDENT_EXPIRY_MS;
    const remaining = expiry - (Date.now() - (data.savedAt || 0));
    if (remaining <= 0) return;

    const totalSecs = Math.floor(remaining / 1000);
    const days  = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins  = Math.floor((totalSecs % 3600) / 60);
    const secs  = totalSecs % 60;

    const pad = n => String(n).padStart(2, '0');
    const label = days > 0
      ? `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
      : `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;

    const elId = data.isAdmin ? 'admin-session-expiry' : 'student-session-expiry';
    const el = document.getElementById(elId);
    if (el) el.textContent = '🔒 ' + label;
  } catch {}
}

// Start a 1-second live tick for the sidebar session countdown
function startSessionCountdownTick() {
  if (window._sessionTickInterval) clearInterval(window._sessionTickInterval);
  window._sessionTickInterval = setInterval(showSessionExpiry, 1000);
}

window.addEventListener('load', async () => {
  checkAndAutoUnlock();

  // ── MUST load session timeouts FIRST before checking session validity ──
  // Previously this was fire-and-forget (.then) which caused a race:
  // getValidSession() ran with default 3-day expiry, then Firestore returned
  // the custom 11-min timeout, triggering an immediate expiry that left
  // the student on a blank blueish background screen.
  try {
    // Timeout 5s — agar Firebase slow ho toh blank screen nahi dikhegi
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
    const fetchPromise   = db.collection('admin').doc('sessionTimeouts').get();
    const doc = await Promise.race([fetchPromise, timeoutPromise]);
    if (doc && doc.exists) {
      const d = doc.data();
      if (d.adminMs  && d.adminMs  >= 11 * 60 * 1000) ADMIN_EXPIRY_MS   = d.adminMs;
      if (d.studentMs && d.studentMs >= 11 * 60 * 1000) STUDENT_EXPIRY_MS = d.studentMs;
    }
  } catch {} // on error — default values use honge, page show hoga

  // Now check session with correct expiry values loaded
  const data = getValidSession();
  if (data) {
    if (data.isAdmin) {
      AppState.isAdmin = true;
      AppState.currentUser = data.user;
      window.scrollTo(0, 0); // scroll reset on login success
      initAdminDashboard();
    } else if (data.user) {
      AppState.currentUser = data.user;
      window.scrollTo(0, 0); // scroll reset on login success
      initStudentDashboard();
    } else {
      showPage('page-home');
    }
  } else {
    showPage('page-home');
  }

  // ── Session expiry warning + auto-logout ──────────────────────
  // Track whether the 10-min warning has already been shown this session
  window._sessionWarnShown = false;

  function getSessionMsRemaining() {
    try {
      const key = AppState.isAdmin ? ADMIN_SESSION_KEY : STUDENT_SESSION_KEY;
      const raw = localStorage.getItem(key) || localStorage.getItem(SESSION_KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      const expiry = data.isAdmin ? ADMIN_EXPIRY_MS : STUDENT_EXPIRY_MS;
      return expiry - (Date.now() - (data.savedAt || 0));
    } catch { return 0; }
  }

  function showSessionWarningModal(minsLeft) {
    const isAdmin = AppState.isAdmin;
    const name = isAdmin ? 'Admin' : (AppState.currentUser?.name?.split(' ')[0] || 'Student');
    document.getElementById('sw-name').textContent    = name;
    document.getElementById('sw-role').textContent    = isAdmin ? 'एडमिन पैनल' : 'स्टूडेंट डैशबोर्ड';
    document.getElementById('sw-role-en').textContent = isAdmin ? 'Admin Panel' : 'Student Dashboard';
    openModal('modal-session-warning');

    // Live countdown — ticks every second
    function updateCountdown() {
      const ms = getSessionMsRemaining();
      if (ms <= 0) {
        clearInterval(window._swCountdownInterval);
        closeModal('modal-session-warning');
        return;
      }
      const totalSecs = Math.ceil(ms / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const display = mins > 0
        ? `${mins}m ${String(secs).padStart(2,'0')}s`
        : `${secs}s`;
      const el = document.getElementById('sw-countdown');
      if (el) el.textContent = display;
    }

    // Clear any previous interval
    if (window._swCountdownInterval) clearInterval(window._swCountdownInterval);
    updateCountdown();
    window._swCountdownInterval = setInterval(updateCountdown, 1000);
  }

  function checkSessionWarning() {
    if (!(AppState.currentUser || AppState.isAdmin)) return;

    // Check if this session token is still valid (not kicked by another device)
    verifySessionToken().then(result => {
      if (result === 'kicked') {
        // Another device logged in — force logout this one
        if (window._sessionTickInterval) clearInterval(window._sessionTickInterval);
        if (window._swCountdownInterval)  clearInterval(window._swCountdownInterval);
        clearSession();
        AppState.currentUser = null;
        AppState.isAdmin = false;
        AppState.currentClassId = null;
        AppState.currentFolderId = null;
        AppState.breadcrumbs = [];
        window._sessionWarnShown = false;
        const dashArea = document.getElementById('dashboard-area');
        if (dashArea) dashArea.remove();
        showPage('page-home');
        // Show kicked modal instead of generic toast
        openModal('modal-session-kicked');
        return;
      }
    });

    const msLeft = getSessionMsRemaining();

    // Session expired — full cleanup
    if (msLeft <= 0) {
      closeModal('modal-session-warning');
      clearSession();
      AppState.currentUser = null;
      AppState.isAdmin = false;
      AppState.currentClassId = null;
      AppState.currentFolderId = null;
      AppState.breadcrumbs = [];
      window._sessionWarnShown = false;
      const dashArea = document.getElementById('dashboard-area');
      if (dashArea) dashArea.remove();
      showPage('page-home');
      showToast('⏰ Your session has expired. Please log in again.', 'info');
      return;
    }

    const minsLeft = Math.ceil(msLeft / (60 * 1000));

    // Show warning if ≤10 mins left and not yet shown
    if (minsLeft <= 10 && !window._sessionWarnShown) {
      window._sessionWarnShown = true;
      showSessionWarningModal(minsLeft);
    }

    showSessionExpiry();
  }

  // Check immediately on load (handles fresh login with <10 min left)
  // Also starts the live sidebar countdown tick
  setTimeout(() => { checkSessionWarning(); startSessionCountdownTick(); }, 1500);

  // Then check every 30 seconds for accuracy
  setInterval(checkSessionWarning, 30 * 1000);
});

console.log('✅ PART 1: Config & Styles loaded');



// =====================================================
// PART 2 — HOMEPAGE + AUTH (Login & Register)
// =====================================================
// Contains:
//   [1] Homepage HTML (hero, features, notices, contact)
//   [2] Login page HTML
//   [3] Register page HTML
//   [4] Login logic (student + admin)
//   [5] Register logic (new student signup)
//   [6] Logout logic
// =====================================================

// =============================================================
// BUILD ALL PAGE HTML ON LOAD
// This injects all page HTML into the document body
// =============================================================
function buildPageHTML() {
  document.body.insertAdjacentHTML('beforeend', `

  <!-- =====================================================
       PAGE: HOMEPAGE
       ID: page-home
       Visible to: Everyone (not logged in)
       ===================================================== -->
  <div class="page active" id="page-home">

    <!-- TOP NAVBAR -->
    <nav style="
      position: fixed; top: 0; left: 0; right: 0; z-index: 500;
      background: rgba(6,11,20,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0 32px;
      display: flex; align-items: center; justify-content: space-between;
      height: 64px;
    ">
      <!-- Logo + Name -->
      <div style="display:flex; align-items:center; gap:12px;">
        <img id="hp-nav-logo" src="data:image/jpeg;base64,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"
             style="height:40px; width:40px; object-fit:cover; border-radius:50%; border:2px solid var(--neon-blue); box-shadow:0 0 8px #00d4ff66;"
             alt="BCI Logo" onerror="this.style.display='none'">
        <div>
          <div id="hp-nav-shortname" style="font-family:'Orbitron',monospace; font-size:15px; color:var(--neon-blue);
                      text-shadow:var(--neon-glow); letter-spacing:2px;">B.C.I</div>
          <div id="hp-nav-fullname" style="font-size:10px; color:var(--text-dim);">Brilliant Coaching Institute</div>
        </div>
      </div>
      <!-- Nav buttons -->
      <div style="display:flex; gap:12px; align-items:center;">
        <button class="btn btn-ghost btn-sm" onclick="showPage('page-login')">Login</button>
        <button class="btn btn-primary btn-sm" onclick="showPage('page-register')">
          Register
        </button>
      </div>
    </nav>

    <!-- HERO SECTION -->
    <section style="
      min-height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
      padding: 100px 24px 60px;
      position: relative; overflow: hidden;
    ">
      <!-- Background glow circles -->
      <div style="
        position:absolute; top:20%; left:50%; transform:translateX(-50%);
        width:600px; height:600px; border-radius:50%;
        background: radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%);
        pointer-events:none;
      "></div>

      <!-- Logo large -->
      <img id="hp-hero-logo" src="data:image/jpeg;base64,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"
           style="height:110px; width:110px; object-fit:cover; border-radius:50%;
                  border:3px solid var(--neon-blue);
                  box-shadow:0 0 20px #00d4ff55, 0 0 40px #00d4ff22;
                  margin-bottom:24px;
                  animation: fadeInUp 0.6s ease both;"
           alt="BCI Logo" onerror="this.style.display='none'">

      <!-- Badge — id="hp-badge-prefix" updated by applyInstituteDataEverywhere(),
           hp-hero-city is appended automatically from the city field -->
      <div style="
        display:inline-flex; align-items:center; gap:6px;
        background: rgba(0,212,255,0.08);
        border: 1px solid rgba(0,212,255,0.25);
        border-radius: 20px; padding: 6px 16px;
        font-size: var(--fs-xs); color: var(--neon-blue);
        letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;
        margin-bottom: 24px;
        animation: fadeInUp 0.6s ease 0.1s both;
      ">🎓 <span id="hp-badge-prefix">Secure Learning Platform</span> — <span id="hp-hero-city">Buxar, Bihar</span></div>

      <!-- Main heading -->
      <h1 style="
        font-size: clamp(36px, 7vw, 72px);
        font-family: 'Rajdhani', sans-serif;
        font-weight: 700;
        line-height: 1.1;
        margin-bottom: 20px;
        max-width: 800px;
        animation: fadeInUp 0.6s ease 0.2s both;
      ">
        <span style="color:var(--text-white);">Brilliant</span>
        <span style="
          color: var(--neon-blue);
          text-shadow: var(--neon-glow);
        "> Coaching</span><br>
        <span style="color:var(--text-white);">Institute</span>
      </h1>

      <!-- Tagline — IDs used by applyInstituteDataEverywhere() to update text dynamically -->
      <p id="hp-slogan-hindi" style="
        font-size: var(--fs-lg);
        color: var(--text-muted);
        margin-bottom: 8px;
        animation: fadeInUp 0.6s ease 0.3s both;
        font-weight: 500;
      ">आपका भविष्य, हमारी ज़िम्मेदारी</p>
      <p id="hp-slogan-en" style="
        font-size: var(--fs-base);
        color: var(--text-dim);
        margin-bottom: 40px;
        animation: fadeInUp 0.6s ease 0.35s both;
      ">Your Future, Our Responsibility</p>

      <!-- CTA Buttons -->
      <div style="
        display:flex; gap:16px; flex-wrap:wrap; justify-content:center;
        animation: fadeInUp 0.6s ease 0.4s both;
        margin-bottom: 60px;
      ">
        <button class="btn btn-primary btn-lg" onclick="showPage('page-login')">
          Student Login →
        </button>
        <button class="btn btn-outline btn-lg" onclick="showPage('page-register')">
          New Registration
        </button>
      </div>

      <!-- Feature cards — Each card element has an ID so admin can customise icon/title/desc.
           IDs follow pattern: hp-card-N-icon, hp-card-N-title, hp-card-N-desc  (N = 1..4)
           These are updated by applyInstituteDataEverywhere() on every page load. -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px; max-width: 900px; width: 100%;
        animation: fadeInUp 0.6s ease 0.5s both;
      ">
        <!-- Card 1 -->
        <div class="card" style="text-align:left; padding:20px;">
          <div id="hp-card-1-icon" style="font-size:28px; margin-bottom:10px;">📚</div>
          <div id="hp-card-1-title" style="font-family:'Rajdhani',sans-serif; font-weight:700;
                      font-size:var(--fs-md); margin-bottom:6px;">Study Materials</div>
          <div id="hp-card-1-desc" style="font-size:var(--fs-sm); color:var(--text-muted); line-height:1.6;">Notes, assignments, DPPs and previous year papers — all organised by subject and chapter.</div>
        </div>
        <!-- Card 2 -->
        <div class="card" style="text-align:left; padding:20px;">
          <div id="hp-card-2-icon" style="font-size:28px; margin-bottom:10px;">🎯</div>
          <div id="hp-card-2-title" style="font-family:'Rajdhani',sans-serif; font-weight:700;
                      font-size:var(--fs-md); margin-bottom:6px;">Bihar &amp; CBSE Board</div>
          <div id="hp-card-2-desc" style="font-size:var(--fs-sm); color:var(--text-muted); line-height:1.6;">Expert preparation for Class 6-10 BSEB and Class 9-10 CBSE students of Buxar.</div>
        </div>
        <!-- Card 3 — Director card (desc also contains dynamic director name) -->
        <div class="card" style="text-align:left; padding:20px;">
          <div id="hp-card-3-icon" style="font-size:28px; margin-bottom:10px;">👨‍🏫</div>
          <div id="hp-card-3-title" style="font-family:'Rajdhani',sans-serif; font-weight:700;
                      font-size:var(--fs-md); margin-bottom:6px;">Director</div>
          <div id="hp-card-3-desc" style="font-size:var(--fs-sm); color:var(--text-muted); line-height:1.6;"><span id="hp-feature-director">10+ years of teaching experience. Personal guidance for every student at Civil Line, Buxar.</span></div>
        </div>
        <!-- Card 4 -->
        <div class="card" style="text-align:left; padding:20px;">
          <div id="hp-card-4-icon" style="font-size:28px; margin-bottom:10px;">🔒</div>
          <div id="hp-card-4-title" style="font-family:'Rajdhani',sans-serif; font-weight:700;
                      font-size:var(--fs-md); margin-bottom:6px;">Secure Portal</div>
          <div id="hp-card-4-desc" style="font-size:var(--fs-sm); color:var(--text-muted); line-height:1.6;">Only admin-approved students can access materials. Your data is safe and private.</div>
        </div>
      </div>
    </section>

    <!-- NOTICE BOARD SECTION (public) -->
    <section style="padding: 60px 24px; max-width: 900px; margin: 0 auto;">
      <h2 style="
        font-family:'Rajdhani',sans-serif; font-size:var(--fs-2xl);
        text-align:center; margin-bottom:8px;
      ">📢 Notice <span style="color:var(--neon-blue);">Board</span></h2>
      <p style="text-align:center; color:var(--text-muted); margin-bottom:32px; font-size:var(--fs-sm);">
        Latest announcements from <span id="hp-notice-name">B.C.I</span>
      </p>
      <div id="home-notices">
        <div class="loading-screen"><div class="spinner"></div></div>
      </div>
    </section>

    <!-- CONTACT SECTION -->
    <section style="
      padding: 60px 24px;
      background: var(--bg-card);
      border-top: 1px solid var(--border);
    ">
      <div style="max-width: 900px; margin: 0 auto;">
        <h2 style="
          font-family:'Rajdhani',sans-serif; font-size:var(--fs-2xl);
          text-align:center; margin-bottom:40px;
        ">📍 Contact <span style="color:var(--neon-blue);">Us</span></h2>
        <div class="contact-grid-2col" style="display:grid; grid-template-columns:repeat(2,1fr); gap:20px;">
          ${[
            { icon:'👨‍🏫', label:'Director', value:'<span id="hp-contact-director">Pradeep Kumar</span>', link:null },
            { icon:'📞', label:'Phone', value:'<span id="hp-contact-phone">6206437776</span>', link:'tel:6206437776' },
            { icon:'📍', label:'Address', value:'<span id="hp-contact-address">Mahavir Asthan, Turha Toli, Civil Line, Buxar — 802101</span>', link:null },
            { icon:'🏫', label:'Classes Offered', value:'🔵 BSEB Board — Class 6-10 (All Subjects)<br>🟢 CBSE Board — Class 9-10 (PCM Only)', link:null },
          ].map(c => `
            <div style="display:flex; gap:14px; align-items:flex-start;">
              <div style="
                font-size:24px; width:48px; height:48px;
                background:rgba(0,212,255,0.08);
                border:1px solid rgba(0,212,255,0.2);
                border-radius:var(--radius-sm);
                display:flex; align-items:center; justify-content:center;
                flex-shrink:0;
              ">${c.icon}</div>
              <div>
                <div style="font-size:var(--fs-xs); color:var(--text-dim);
                            text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${c.label}</div>
                <div style="font-size:var(--fs-base); color:var(--text-white); font-weight:500; word-break:keep-all;">
                  ${c.link ? `<a href="${c.link}" style="color:var(--neon-blue);">${c.value}</a>` : c.value}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Social / Map link buttons — hrefs are updated by applyInstituteDataEverywhere()
             so the admin can change them from the Edit Institute Info modal.
             IDs: hp-maps-link, hp-review-link, hp-youtube-link -->
        <div style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center; margin-top:40px;">
          <a id="hp-maps-link" href="https://maps.app.goo.gl/pWSuecRDyFpVsxVq5" target="_blank" style="
            display:inline-flex; align-items:center; gap:10px;
            padding:14px 28px;
            background:linear-gradient(135deg, #00d4ff22, #00d4ff11);
            border:1px solid var(--neon-blue);
            border-radius:var(--radius-sm);
            color:var(--neon-blue);
            font-family:'Rajdhani',sans-serif;
            font-size:var(--fs-base);
            font-weight:600;
            text-decoration:none;
            transition:all 0.3s;
            letter-spacing:0.5px;
          " onmouseover="this.style.background='rgba(0,212,255,0.2)'; this.style.transform='translateY(-2px)'"
             onmouseout="this.style.background='linear-gradient(135deg,#00d4ff22,#00d4ff11)'; this.style.transform='translateY(0)'">
            📍 Find Us on Google Maps
          </a>
          <a id="hp-review-link" href="https://g.page/r/CVV3GUY-gKWqEBM/review" target="_blank" style="
            display:inline-flex; align-items:center; gap:10px;
            padding:14px 28px;
            background:linear-gradient(135deg, #ffd70022, #ffd70011);
            border:1px solid #ffd700;
            border-radius:var(--radius-sm);
            color:#ffd700;
            font-family:'Rajdhani',sans-serif;
            font-size:var(--fs-base);
            font-weight:600;
            text-decoration:none;
            transition:all 0.3s;
            letter-spacing:0.5px;
          " onmouseover="this.style.background='rgba(255,215,0,0.2)'; this.style.transform='translateY(-2px)'"
             onmouseout="this.style.background='linear-gradient(135deg,#ffd70022,#ffd70011)'; this.style.transform='translateY(0)'">
            ⭐ Rate Us on Google
          </a>
          <a id="hp-youtube-link" href="https://www.youtube.com/@PradeepsirBCI" target="_blank" style="
            display:inline-flex; align-items:center; gap:10px;
            padding:14px 28px;
            background:linear-gradient(135deg, #ff000022, #ff000011);
            border:1px solid #ff0000;
            border-radius:var(--radius-sm);
            color:#ff4444;
            font-family:'Rajdhani',sans-serif;
            font-size:var(--fs-base);
            font-weight:600;
            text-decoration:none;
            transition:all 0.3s;
            letter-spacing:0.5px;
          " onmouseover="this.style.background='rgba(255,0,0,0.2)'; this.style.transform='translateY(-2px)'"
             onmouseout="this.style.background='linear-gradient(135deg,#ff000022,#ff000011)'; this.style.transform='translateY(0)'">
            ▶️ Subscribe on YouTube
          </a>
        </div>

        <!-- QR CODE SECTION -->
        <div style="
          margin-top:40px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:16px;
        ">
          <p style="
            font-family:'Rajdhani',sans-serif;
            font-size:var(--fs-lg);
            color:var(--text-white);
            font-weight:600;
            text-align:center;
          ">📱 Scan to Rate Us on Google</p>
          <div style="
            background:white;
            padding:16px;
            border-radius:var(--radius-sm);
            border:2px solid var(--neon-blue);
            box-shadow: 0 0 20px rgba(0,212,255,0.2);
          ">
            <img src="data:image/png;base64,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" 
                 alt="Google Review QR Code"
                 style="width:160px; height:160px; display:block;">
          </div>
          <p style="font-size:var(--fs-sm); color:var(--text-dim); text-align:center;">
            Scan this QR code with your phone camera to leave a review
          </p>
        </div>

      </div>
    </section>

    <!-- FOOTER -->
    <footer style="
      text-align:center; padding:24px;
      border-top:1px solid var(--border);
      font-size:var(--fs-xs); color:var(--text-dim);
    ">
      © ${new Date().getFullYear()} <span id="hp-footer-name">Brilliant Coaching Institute</span>, <span id="hp-footer-city">Buxar, Bihar</span>.
      All rights reserved. &nbsp;|&nbsp;
      <span style="color:var(--neon-blue);">आपका भविष्य, हमारी ज़िम्मेदारी</span>
    </footer>
  </div>


  <!-- =====================================================
       PAGE: LOGIN
       ID: page-login
       Visible to: Everyone (not logged in)
       ===================================================== -->
  <div class="page" id="page-login">
    <div style="
      min-height: 100vh; display:flex;
      align-items:center; justify-content:center;
      padding: 24px;
      background: radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 60%);
    ">
      <div style="width:100%; max-width:440px;">

        <!-- Back button -->
        <button class="btn btn-ghost btn-sm" onclick="showPage('page-home')"
                style="margin-bottom:24px;">← Back to Home</button>

        <!-- Login card -->
        <div class="card" style="border-color:var(--border-bright);">

          <!-- Header -->
          <div style="text-align:center; margin-bottom:32px;">
            <img id="hp-login-logo" src="data:image/jpeg;base64,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"
                 style="height:70px; width:70px; object-fit:cover; border-radius:50%;
                        border:2px solid var(--neon-blue);
                        box-shadow:0 0 12px #00d4ff44;
                        margin-bottom:16px;"
                 alt="BCI" onerror="this.style.display='none'">
            <h2 style="font-size:var(--fs-2xl); margin-bottom:6px;">Welcome Back</h2>
            <p style="color:var(--text-muted); font-size:var(--fs-sm);">
              Login to access your study materials
            </p>
          </div>

          <!-- Tab: Student / Admin -->
          <div style="
            display:flex; background:var(--bg-card2);
            border-radius:var(--radius-sm); padding:4px;
            margin-bottom:28px; border:1px solid var(--border);
          ">
            <button id="tab-student" onclick="switchLoginTab('student')" style="
              flex:1; padding:9px; border:none; border-radius:6px;
              cursor:pointer; font-family:'Rajdhani',sans-serif;
              font-weight:600; font-size:var(--fs-base);
              transition:all 0.2s;
              background: linear-gradient(135deg,#0099cc,#00d4ff);
              color:#000; box-shadow:0 0 10px #00d4ff44;
            ">🎓 Student</button>
            <button id="tab-admin" onclick="switchLoginTab('admin')" style="
              flex:1; padding:9px; border:none; border-radius:6px;
              cursor:pointer; font-family:'Rajdhani',sans-serif;
              font-weight:600; font-size:var(--fs-base);
              transition:all 0.2s; background:none; color:var(--text-muted);
            ">👑 Admin</button>
          </div>

          <!-- Login Error Message -->
          <div id="login-error" style="
            display:none; padding:12px 16px;
            background:rgba(255,68,102,0.1); border:1px solid rgba(255,68,102,0.3);
            border-radius:var(--radius-sm); margin-bottom:16px;
            font-size:var(--fs-sm); color:var(--danger);
          "></div>

          <!-- STUDENT LOGIN FORM -->
          <div id="student-login-form">
            <div class="form-group">
              <label>Session <span class="required">*</span></label>
              <select class="form-control" id="login-session">
                <option value="">-- Loading... --</option>
              </select>
            </div>
            <div class="form-group">
              <label>Board <span class="required">*</span></label>
              <select class="form-control" id="login-board" onchange="onLoginBoardChange()">
                <option value="">-- Select Board --</option>
                <option value="BSEB" selected>📘 BSEB (Bihar Board)</option>
                <option value="CBSE">📗 CBSE</option>
              </select>
            </div>
            <div class="form-group">
              <label>Class <span class="required">*</span></label>
              <select class="form-control" id="login-class" disabled>
                <option value="">-- Select Board first --</option>
              </select>
            </div>
            <div class="form-group">
              <label>Coaching Roll No. <span class="required">*</span></label>
              <input class="form-control" id="login-roll" type="number" min="1" placeholder="Enter your roll number">
            </div>
            <div class="form-group">
              <label>Password <span class="required">*</span></label>
              <div style="position:relative;">
                <input class="form-control" id="login-password" type="password"
                       placeholder="Enter your password" autocomplete="current-password"
                       style="padding-right:48px;">
                <button onclick="togglePasswordVisibility('login-password')" style="
                  position:absolute; right:12px; top:50%; transform:translateY(-50%);
                  background:none; border:none; color:var(--text-dim);
                  cursor:pointer; font-size:16px;
                " id="login-pass-eye">👁️</button>
              </div>
            </div>
            <button class="btn btn-primary w-full" onclick="handleStudentLogin()"
                    id="login-btn" style="margin-top:8px;">
              Login →
            </button>
            <p style="text-align:center; margin-top:16px; font-size:var(--fs-sm); color:var(--text-muted);">
              New student?
              <a href="#" onclick="showPage('page-register'); return false;"
                 style="color:var(--neon-blue);">Register here</a>
            </p>
          </div>

          <!-- ADMIN LOGIN FORM -->
          <div id="admin-login-form" style="display:none;">
            <div class="form-group">
              <label>Admin ID <span class="required">*</span></label>
              <input class="form-control" id="admin-username" type="text"
                     placeholder="Enter admin ID" autocomplete="username">
            </div>
            <div class="form-group">
              <label>Password <span class="required">*</span></label>
              <div style="position:relative;">
                <input class="form-control" id="admin-password" type="password"
                       placeholder="Enter admin password" autocomplete="current-password"
                       style="padding-right:48px;">
                <button onclick="togglePasswordVisibility('admin-password')" style="
                  position:absolute; right:12px; top:50%; transform:translateY(-50%);
                  background:none; border:none; color:var(--text-dim);
                  cursor:pointer; font-size:16px;
                ">👁️</button>
              </div>
            </div>
            <button class="btn btn-primary w-full" onclick="handleAdminLogin()"
                    id="admin-login-btn" style="margin-top:8px;">
              Admin Login →
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>


  <!-- =====================================================
       PAGE: STUDENT REGISTRATION
       ID: page-register
       Visible to: Everyone (not logged in)
       ===================================================== -->
  <div class="page" id="page-register">
    <div style="
      min-height:100vh; display:flex;
      align-items:center; justify-content:center;
      padding:24px;
      background: radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 60%);
    ">
      <div style="width:100%; max-width:560px; padding: 20px 0;">

        <!-- Back button -->
        <button class="btn btn-ghost btn-sm" onclick="showPage('page-home')"
                style="margin-bottom:24px;">← Back to Home</button>

        <div class="card" style="border-color:var(--border-bright);">

          <!-- Header -->
          <div style="text-align:center; margin-bottom:32px;">
            <div style="font-size:48px; margin-bottom:12px;">📝</div>
            <h2 style="font-size:var(--fs-2xl); margin-bottom:6px;">Student Registration</h2>
            <p style="color:var(--text-muted); font-size:var(--fs-sm);">
              Fill in your details to request access.<br>
              Admin will approve your account.
            </p>
          </div>

          <!-- Register Error/Success Message -->
          <div id="register-msg" style="
            display:none; padding:12px 16px;
            border-radius:var(--radius-sm); margin-bottom:16px;
            font-size:var(--fs-sm);
          "></div>

          <!-- REGISTRATION FORM -->
          <div class="form-row">
            <div class="form-group">
              <label>Session <span class="required">*</span></label>
              <select class="form-control" id="reg-session">
                <option value="">-- Loading... --</option>
              </select>
              <div class="form-error" id="err-session">Please select session</div>
            </div>
            <div class="form-group">
              <label>Board <span class="required">*</span></label>
              <select class="form-control" id="reg-board" onchange="onRegBoardChange()">
                <option value="">-- Select Board --</option>
                <option value="BSEB" selected>📘 BSEB (Bihar Board)</option>
                <option value="CBSE">📗 CBSE</option>
              </select>
              <div class="form-error" id="err-board">Please select your board</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Class <span class="required">*</span></label>
              <select class="form-control" id="reg-class" disabled>
                <option value="">-- Select Board first --</option>
              </select>
              <div class="form-error" id="err-class">Please select your class</div>
            </div>
            <div class="form-group" style="visibility:hidden;"></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Coaching Roll No. <span class="required">*</span></label>
              <input class="form-control" id="reg-roll" type="number" min="1" placeholder="e.g. 15">
              <div class="form-error" id="err-roll">Roll number is required</div>
            </div>
            <div class="form-group">
              <label>Full Name <span class="required">*</span></label>
              <input class="form-control" id="reg-name" type="text" placeholder="Apna poora naam likhein" autocomplete="name" maxlength="60">
              <div class="form-error" id="err-name">Name is required</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Gender <span class="required">*</span></label>
              <select class="form-control" id="reg-gender">
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <div class="form-error" id="err-gender">Please select gender</div>
            </div>
            <div class="form-group">
              <label>Date of Birth <span class="required">*</span></label>
              <input class="form-control" id="reg-dob" type="date">
              <div class="form-error" id="err-dob">Date of birth is required</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Mobile Number <span class="required">*</span></label>
              <input class="form-control" id="reg-mobile" type="tel" placeholder="10-digit number" maxlength="10" autocomplete="tel">
              <div class="form-error" id="err-mobile">Valid 10-digit number required</div>
            </div>
            <div class="form-group">
              <label>Alt. Mobile <span class="optional">(optional)</span></label>
              <input class="form-control" id="reg-alt-mobile" type="tel" placeholder="Alternative number" maxlength="10">
            </div>
          </div>

          <div class="form-group">
            <label>Password <span class="required">*</span></label>
            <div style="position:relative;">
              <input class="form-control" id="reg-password" type="password" placeholder="Create a password (min 6 chars)" autocomplete="new-password" style="padding-right:48px;">
              <button onclick="togglePasswordVisibility('reg-password')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;">👁️</button>
            </div>
            <div class="form-error" id="err-password">Password must be at least 6 characters</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Father's Name <span class="required">*</span></label>
              <input class="form-control" id="reg-father" type="text" placeholder="Father's full name" maxlength="60">
              <div class="form-error" id="err-father">Father's name is required</div>
            </div>
            <div class="form-group">
              <label>Mother's Name <span class="required">*</span></label>
              <input class="form-control" id="reg-mother" type="text" placeholder="Mother's full name" maxlength="60">
              <div class="form-error" id="err-mother">Mother's name is required</div>
            </div>
          </div>

          <div class="form-group">
            <label>Address <span class="required">*</span></label>
            <textarea class="form-control" id="reg-address" rows="2" placeholder="Your home address" style="resize:vertical;"></textarea>
            <div class="form-error" id="err-address">Address is required</div>
          </div>

          <!-- Photo upload -->
          <div class="form-group">
            <label>Photo <span class="optional">(optional)</span></label>
            <div style="display:flex; align-items:center; gap:16px;">
              <div id="photo-preview" style="width:72px;height:72px;border-radius:50%;background:var(--bg-card2);
                   border:2px solid var(--border);display:flex;align-items:center;
                   justify-content:center;font-size:30px;flex-shrink:0;overflow:hidden;">👤</div>
              <div style="flex:1;">
                <!-- Gallery input -->
                <input type="file" id="reg-photo" accept="image/*" onchange="previewPhoto(this)" style="display:none;">
                <!-- Camera input — opens camera directly on Android -->
                <input type="file" id="reg-photo-camera" accept="image/*" capture="user"
                       onchange="previewPhoto(this)" style="display:none;">
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                  <button type="button" onclick="document.getElementById('reg-photo').click()"
                          class="btn btn-outline btn-sm" style="font-size:12px;">🖼️ Gallery</button>
                  <button type="button" onclick="document.getElementById('reg-photo-camera').click()"
                          class="btn btn-outline btn-sm" style="font-size:12px;">📸 Camera</button>
                  <button type="button" id="reg-photo-remove-btn" onclick="removeRegPhoto()"
                          class="btn btn-ghost btn-sm"
                          style="display:none;font-size:12px;color:var(--danger);">🗑️ Remove</button>
                </div>
                <div style="font-size:11px;color:var(--text-dim);">JPG/PNG, max 3MB. Optional.</div>
              </div>
            </div>
          </div>

          <!-- Info box -->
          <div class="info-box">
            ℹ️ After registration, your account will be reviewed by the admin.
            You will be able to login once approved. Please visit the institute office if you need help.
          </div>

          <div style="display:flex; gap:12px; margin-top:8px;">
            <button class="btn btn-outline w-full" onclick="resetRegForm()" type="button">🔄 Reset</button>
            <button class="btn btn-primary w-full" type="button" onclick="handleStudentRegister()" id="register-btn">Submit →</button>
          </div>

          <p style="text-align:center; margin-top:16px; font-size:var(--fs-sm); color:var(--text-muted);">
            Already registered?
            <a href="#" onclick="showPage('page-login'); return false;" style="color:var(--neon-blue);">Login here</a>
          </p>

        </div>
      </div>
    </div>
  </div>

  `); // end insertAdjacentHTML
}

// =============================================================
// LOGIN TAB SWITCHER (Student / Admin tabs on login page)
// =============================================================
function switchLoginTab(tab) {
  const studentForm = document.getElementById('student-login-form');
  const adminForm = document.getElementById('admin-login-form');
  const tabStudent = document.getElementById('tab-student');
  const tabAdmin = document.getElementById('tab-admin');
  document.getElementById('login-error').style.display = 'none';

  if (tab === 'student') {
    studentForm.style.display = 'block';
    adminForm.style.display = 'none';
    // Active style on student tab
    tabStudent.style.cssText = `
      flex:1; padding:9px; border:none; border-radius:6px; cursor:pointer;
      font-family:'Rajdhani',sans-serif; font-weight:600; font-size:var(--fs-base);
      transition:all 0.2s; background:linear-gradient(135deg,#0099cc,#00d4ff);
      color:#000; box-shadow:0 0 10px #00d4ff44;
    `;
    tabAdmin.style.cssText = `
      flex:1; padding:9px; border:none; border-radius:6px; cursor:pointer;
      font-family:'Rajdhani',sans-serif; font-weight:600; font-size:var(--fs-base);
      transition:all 0.2s; background:none; color:var(--text-muted);
    `;
  } else {
    studentForm.style.display = 'none';
    adminForm.style.display = 'block';
    tabAdmin.style.cssText = `
      flex:1; padding:9px; border:none; border-radius:6px; cursor:pointer;
      font-family:'Rajdhani',sans-serif; font-weight:600; font-size:var(--fs-base);
      transition:all 0.2s; background:linear-gradient(135deg,#0099cc,#00d4ff);
      color:#000; box-shadow:0 0 10px #00d4ff44;
    `;
    tabStudent.style.cssText = `
      flex:1; padding:9px; border:none; border-radius:6px; cursor:pointer;
      font-family:'Rajdhani',sans-serif; font-weight:600; font-size:var(--fs-base);
      transition:all 0.2s; background:none; color:var(--text-muted);
    `;
  }
}

// =============================================================
// TOGGLE PASSWORD VISIBILITY (show/hide password)
// =============================================================
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// =============================================================
// SHOW LOGIN ERROR
// =============================================================
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// =============================================================
// STUDENT LOGIN HANDLER
// Checks: name + mobile + password against Firebase
// Flow: check exists → check password → check status → enter
// =============================================================
async function handleStudentLogin() {
  const session  = document.getElementById('login-session').value.trim();
  const board    = document.getElementById('login-board').value.trim();
  const classVal = document.getElementById('login-class').value.trim();
  const roll     = document.getElementById('login-roll').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const btn      = document.getElementById('login-btn');

  if (!session || !board || !classVal || !roll || !password) {
    showLoginError('Please fill in all fields. / कृपया सभी जानकारी भरें।');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Checking...';
  document.getElementById('login-error').style.display = 'none';

  try {
    // Get class display name (e.g. "Class 9") from dropdown selected option
    const loginClassSelect = document.getElementById('login-class');
    const loginClassName = loginClassSelect.options[loginClassSelect.selectedIndex]?.text || classVal;
    const docId = generateStudentId(session, board, loginClassName, roll);
    const doc = await db.collection('students').doc(docId).get();

    if (!doc.exists) {
      showLoginPopup('not_found');
      return;
    }

    const student = doc.data();

    if (student.password !== password) {
      showLoginError('Incorrect password. Please try again. / गलत पासवर्ड।');
      return;
    }

    if (student.status === 'pending') {
      showLoginPopup('pending');
      return;
    }
    if (student.status === 'rejected') {
      showLoginPopup('rejected');
      return;
    }
    if (student.status === 'inactive') {
      showLoginPopup('inactive');
      return;
    }

    // ✅ Credentials valid — check for existing active session
    const docId2 = docId; // capture for async use
    const hasExisting = await checkActiveSessionExists(false, docId2);
    if (hasExisting) {
      // Show bilingual warning modal — store pending login data for "Login Anyway"
      window._pendingLogin = {
        type: 'student',
        proceed: async () => {
          AppState.currentUser = { ...student, id: docId2 };
          AppState.isAdmin = false;
          const token = await writeSessionToken(false, docId2);
          saveSession({ user: AppState.currentUser, isAdmin: false, token });
          window._sessionWarnShown = false;
          setTimeout(() => { showSessionExpiry(); startSessionCountdownTick(); }, 500);
          document.getElementById('login-session').value = '';
          document.getElementById('login-roll').value = '';
          document.getElementById('login-password').value = '';
          window.scrollTo(0, 0); // scroll reset on login success
          initStudentDashboard();
        }
      };
      openModal('modal-duplicate-session');
      return;
    }

    // ✅ No existing session — login directly
    AppState.currentUser = { ...student, id: docId };
    AppState.isAdmin = false;
    const token = await writeSessionToken(false, docId);
    saveSession({ user: AppState.currentUser, isAdmin: false, token });
    window._sessionWarnShown = false; // reset so warning fires fresh this session
    setTimeout(() => { showSessionExpiry(); startSessionCountdownTick(); }, 500);

    document.getElementById('login-session').value = '';
    document.getElementById('login-roll').value = '';
    document.getElementById('login-password').value = '';

    window.scrollTo(0, 0); // scroll reset on login success
    initStudentDashboard();

  } catch (err) {
    showLoginError('Connection error. Please check internet. / इंटरनेट जांचें।');
    console.error('Login error:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login →';
  }
}

// =============================================================
// LOGIN POPUP — bilingual status messages
// =============================================================
function showLoginPopup(type) {
  const messages = {
    pending: {
      title: '⏳ Approval Pending',
      en: 'Your registration form has been submitted. Please wait for admin approval.',
      hi: 'आपका फॉर्म जमा हो गया है। कृपया एडमिन की स्वीकृति का इंतजार करें।'
    },
    rejected: {
      title: '❌ Registration Not Approved / पंजीकरण अस्वीकृत',
      en: 'Your registration was not approved by the admin.\n\nPlease visit the institute office for more information.',
      hi: 'आपका पंजीकरण एडमिन द्वारा स्वीकार नहीं किया गया।\n\nअधिक जानकारी के लिए संस्था के कार्यालय में जाएं।'
    },
    inactive: {
      title: '⛔ Account Deactivated / खाता निष्क्रिय',
      en: 'Your account has been deactivated by the admin.\n\nPlease visit the institute office for more information.',
      hi: 'आपका खाता एडमिन द्वारा निष्क्रिय कर दिया गया है।\n\nअधिक जानकारी के लिए संस्था के कार्यालय में जाएं।'
    },
    not_found: {
      title: '❓ Not Registered',
      en: 'No account found with this Session + Class + Roll No. Please register first.',
      hi: 'इस Session + Class + Roll No. से कोई खाता नहीं मिला। पहले पंजीकरण करें।'
    }
  };
  const m = messages[type];
  showBilingualPopup(m.title, m.en, m.hi, () => {});
}

// =============================================================
// ADMIN LOGIN HANDLER
// Checks credentials against Firebase /admin/credentials
// Falls back to DEFAULT_ADMIN if Firebase not set up yet
// =============================================================
async function handleAdminLogin() {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const btn = document.getElementById('admin-login-btn');

  if (!username || !password) {
    showLoginError('Please enter admin ID and password.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';
  document.getElementById('login-error').style.display = 'none';

  try {
    // First try Firebase for admin credentials
    let adminUser = DEFAULT_ADMIN; // fallback
    try {
      const adminDoc = await db.collection('admin').doc('credentials').get();
      if (adminDoc.exists) {
        adminUser = adminDoc.data();
      }
    } catch {
      // Use default if Firebase not configured yet
    }

    if (username === adminUser.username && password === adminUser.password) {
      // ✅ Credentials valid — check for existing active session
      const hasExisting = await checkActiveSessionExists(true, null);
      if (hasExisting) {
        window._pendingLogin = {
          type: 'admin',
          proceed: async () => {
            AppState.isAdmin = true;
            AppState.currentUser = { name: 'Administrator', username };
            const token = await writeSessionToken(true, null);
            saveSession({ user: AppState.currentUser, isAdmin: true, token });
            window._sessionWarnShown = false;
            setTimeout(() => { showSessionExpiry(); startSessionCountdownTick(); }, 500);
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
            window.scrollTo(0, 0); // scroll reset on login success
            initAdminDashboard();
          }
        };
        openModal('modal-duplicate-session');
        return;
      }

      // ✅ No existing session — login directly
      AppState.isAdmin = true;
      AppState.currentUser = { name: 'Administrator', username };
      const token = await writeSessionToken(true, null);
      saveSession({ user: AppState.currentUser, isAdmin: true, token });
      window._sessionWarnShown = false; // reset so warning fires fresh this session
      setTimeout(() => { showSessionExpiry(); startSessionCountdownTick(); }, 500);

      // Clear form
      document.getElementById('admin-username').value = '';
      document.getElementById('admin-password').value = '';

      window.scrollTo(0, 0); // scroll reset on login success
      initAdminDashboard();
    } else {
      showLoginError('Invalid admin credentials. Please try again.');
    }

  } catch (err) {
    showLoginError('Connection error. Please try again.');
    console.error('Admin login error:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Admin Login →';
  }
}

// =============================================================
// STUDENT REGISTRATION HANDLER
// Saves new student to Firebase with status = 'pending'
// Admin must approve before they can login
// =============================================================
async function handleStudentRegister() {
  const session  = document.getElementById('reg-session').value.trim();
  const board    = document.getElementById('reg-board').value.trim();
  const classVal = document.getElementById('reg-class').value.trim();
  const roll     = document.getElementById('reg-roll').value.trim();
  const name     = document.getElementById('reg-name').value.trim();
  const gender   = document.getElementById('reg-gender').value.trim();
  const dob      = document.getElementById('reg-dob').value.trim();
  const mobile   = document.getElementById('reg-mobile').value.trim();
  const altMobile= document.getElementById('reg-alt-mobile').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const father   = document.getElementById('reg-father').value.trim();
  const mother   = document.getElementById('reg-mother').value.trim();
  const address  = document.getElementById('reg-address').value.trim();

  // Hide all errors
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));

  // Validate all required fields
  let hasError = false;
  if (!session)  { document.getElementById('err-session').classList.add('show');  hasError = true; }
  if (!board)    { document.getElementById('err-board').classList.add('show');    hasError = true; }
  if (!classVal) { document.getElementById('err-class').classList.add('show');   hasError = true; }
  if (!roll || isNaN(roll) || parseInt(roll) < 1) { document.getElementById('err-roll').classList.add('show'); hasError = true; }
  if (!name)     { document.getElementById('err-name').classList.add('show');     hasError = true; }
  if (!gender)   { document.getElementById('err-gender').classList.add('show');   hasError = true; }
  if (!dob)      { document.getElementById('err-dob').classList.add('show');      hasError = true; }
  if (!mobile || mobile.length !== 10 || isNaN(mobile)) { document.getElementById('err-mobile').classList.add('show'); hasError = true; }
  if (!password || password.length < 6) { document.getElementById('err-password').classList.add('show'); hasError = true; }
  if (!father)   { document.getElementById('err-father').classList.add('show');   hasError = true; }
  if (!mother)   { document.getElementById('err-mother').classList.add('show');   hasError = true; }
  if (!address)  { document.getElementById('err-address').classList.add('show');  hasError = true; }
  if (hasError) return;

  // Get class display name — e.g. "Class 9" not the Firestore doc ID
  const classSelect = document.getElementById('reg-class');
  const className = classSelect.options[classSelect.selectedIndex]?.text || classVal;

  // Generate new unique ID using className (display name like "Class 9")
  const docId = generateStudentId(session, board, className, roll);

  // Store data temporarily for use after confirmation
  window._pendingRegistration = {
    docId, session, board, classVal, roll, name, gender, dob,
    mobile, altMobile, password, father, mother, address, className
  };

  // Build confirmation details grid
  const details = [
    { label: 'Session / सत्र', value: session },
    { label: 'Board / बोर्ड', value: board },
    { label: 'Class / कक्षा', value: className },
    { label: 'Roll No / रोल नं', value: roll },
    { label: 'Name / नाम', value: name },
    { label: 'Gender / लिंग', value: gender },
    { label: 'DOB / जन्म तिथि', value: dob },
    { label: 'Mobile / मोबाइल', value: mobile },
    { label: "Father / पिता", value: father },
    { label: "Mother / माता", value: mother },
  ];

  document.getElementById('reg-confirm-details').innerHTML = details.map(d => `
    <div style="background:var(--bg-card2); border-radius:6px; padding:8px 10px;">
      <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;
                  letter-spacing:0.5px; margin-bottom:2px;">${d.label}</div>
      <div style="font-size:var(--fs-sm); color:var(--text-white); font-weight:500;">
        ${d.value}
      </div>
    </div>
  `).join('');

  openModal('modal-reg-confirm');
}


// =============================================================
// SUBMIT REGISTRATION — called after confirmation popup
// =============================================================
async function submitRegistrationConfirmed() {
  const data = window._pendingRegistration;
  if (!data) return;

  const btn = document.getElementById('reg-confirm-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting... / जमा हो रहा है...';

  try {
    const existing = await db.collection('students').doc(data.docId).get();

    if (existing.exists) {
      closeModal('modal-reg-confirm');
      showBilingualPopup(
        '⚠️ Already Registered / पहले से पंजीकृत',
        `This Roll Number (${data.docId}) is already registered.\n\nPossible reasons:\n1. You may have already submitted this form.\n2. You may have filled incorrect details.\n\nIf you have filled correct details and this registration does not belong to you, please visit the institute office and inform the staff.`,
        `यह रोल नंबर (${data.docId}) पहले से पंजीकृत है।\n\nसंभावित कारण:\n1. आपने पहले ही यह फॉर्म भर दिया होगा।\n2. आपने गलत जानकारी भरी होगी।\n\nअगर आपने सही जानकारी भरी है और यह पंजीकरण आपका नहीं है, तो कृपया संस्था के कार्यालय में जाकर कर्मचारियों को सूचित करें।`,
        () => {}
      );
      return;
    }

    // Handle photo
    let photoData = '';
    // Check _regPhotoCompressed first — set by previewPhoto() for BOTH gallery and camera
    // Then fallback to gallery file (compress on submit if not pre-compressed)
    // Camera input (reg-photo-camera) sets _regPhotoCompressed via previewPhoto()
    if (window._regPhotoCompressed) {
      photoData = window._regPhotoCompressed;
      window._regPhotoCompressed = null;
    } else {
      const photoFile = document.getElementById('reg-photo').files[0]
                     || document.getElementById('reg-photo-camera').files[0];
      if (photoFile) {
        try { photoData = await compressPhoto(photoFile); }
        catch(e) { photoData = ''; } // compress failed — skip photo
      }
    }

    // Save to Firestore with new unique ID
    await db.collection('students').doc(data.docId).set({
      session: data.session,
      board: data.board,
      class: data.classVal,
      roll: parseInt(data.roll),
      name: data.name,
      gender: data.gender,
      dob: data.dob,
      mobile: data.mobile,
      altMobile: data.altMobile || '',
      password: data.password,
      father: data.father,        // legacy key
      mother: data.mother,        // legacy key
      fatherName: data.father,    // normalized key used by profile
      motherName: data.mother,    // normalized key used by profile
      address: data.address,
      photo: photoData || '',
      status: 'pending',
      studentId: data.docId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeModal('modal-reg-confirm');
    window._pendingRegistration = null;

    showBilingualPopup(
      '🎉 Submitted Successfully! / सफलतापूर्वक जमा!',
      `Your registration has been submitted successfully!\n\nYou will be able to login after admin approval.\nCome back after some time to check your status.`,
      `आपका पंजीकरण सफलतापूर्वक जमा हो गया!\n\nएडमिन की स्वीकृति के बाद आप लॉगिन कर सकेंगे।\nकुछ समय बाद अपनी स्थिति जांचने के लिए वापस आएं।`,
      () => showPage('page-home')
    );

    resetRegForm();

  } catch (err) {
    showToast('Submission failed. Please check internet. / इंटरनेट जांचें।', 'error');
    console.error('Register error:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Submit / जमा करें';
  }
}

// =============================================================
// RESET REGISTRATION FORM
// =============================================================
function resetRegForm() {
  ['reg-session','reg-board','reg-gender','reg-dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Reset class dropdown to disabled state
  const regClass = document.getElementById('reg-class');
  if (regClass) {
    regClass.innerHTML = '<option value="">-- Select Board first --</option>';
    regClass.disabled = true;
  }
  ['reg-roll','reg-name','reg-mobile','reg-alt-mobile','reg-password',
   'reg-father','reg-mother','reg-address'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const photoPreview = document.getElementById('photo-preview');
  if (photoPreview) photoPreview.innerHTML = '👤';
  ['reg-photo','reg-photo-camera'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  window._regPhotoCompressed = null;
  const regRemoveBtn = document.getElementById('reg-photo-remove-btn');
  if (regRemoveBtn) regRemoveBtn.style.display = 'none';
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
  loadActiveSessionIntoDropdowns();
}

// =============================================================
// PHOTO PREVIEW
// =============================================================
// =============================================================
// COMPRESS PHOTO — Client-side, before saving to Firestore
// Resizes to max 800x800, converts to JPEG at 75% quality
// Typical: 3MB photo → ~150KB with no visible quality loss
// =============================================================
function compressPhoto(file, maxSize = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    // Accept any image type — camera can produce image/heic, image/heif, image/webp etc.
    if (!file || !file.type.startsWith('image/')) {
      reject('Not an image'); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate new dimensions keeping aspect ratio
          let w = img.width, h = img.height;
          // Camera photos can be very large (4000x3000+) — cap at maxSize
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          // Try JPEG first, fallback to PNG if JPEG fails (some HEIC conversions)
          let result = canvas.toDataURL('image/jpeg', quality);
          if (!result || result === 'data:,') {
            result = canvas.toDataURL('image/png');
          }
          resolve(result);
        } catch(canvasErr) {
          reject('Canvas error: ' + canvasErr.message);
        }
      };
      img.onerror = () => reject('Could not load image — unsupported format');
      img.src = e.target.result;
    };
    reader.onerror = () => reject('Could not read file');
    reader.readAsDataURL(file);
  });
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    compressPhoto(input.files[0]).then(compressed => {
      const preview = document.getElementById('photo-preview');
      if (preview) preview.innerHTML = `<img src="${compressed}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`;
      window._regPhotoCompressed = compressed;
      // Show Remove button
      const removeBtn = document.getElementById('reg-photo-remove-btn');
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    }).catch(() => {
      const preview = document.getElementById('photo-preview');
      if (preview) preview.innerHTML = '👤';
    });
  }
}

function removeRegPhoto() {
  window._regPhotoCompressed = null;
  const preview = document.getElementById('photo-preview');
  if (preview) { preview.innerHTML = '👤'; }
  ['reg-photo','reg-photo-camera'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const removeBtn = document.getElementById('reg-photo-remove-btn');
  if (removeBtn) removeBtn.style.display = 'none';
}

// =============================================================
// BILINGUAL POPUP — shows message in English + Hindi
// =============================================================
function showBilingualPopup(title, en, hi, onOk) {
  // Remove existing popup
  const existing = document.getElementById('bilingual-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'bilingual-popup';
  popup.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.7); z-index:9999;
    display:flex; align-items:center; justify-content:center;
    padding:24px;
  `;
  popup.innerHTML = `
    <div style="
      background:var(--bg-card); border:1px solid var(--border-bright);
      border-radius:var(--radius); max-width:420px; width:100%;
      padding:32px; text-align:center;
      box-shadow: 0 0 40px rgba(0,212,255,0.15);
    ">
      <div style="font-size:32px; margin-bottom:12px;">${title.split(' ')[0]}</div>
      <h3 style="font-family:'Rajdhani',sans-serif; font-size:var(--fs-xl);
                 color:var(--text-white); margin-bottom:16px;">
        ${title.substring(title.indexOf(' ')+1)}
      </h3>
      <p style="color:var(--text-white); font-size:var(--fs-base);
                line-height:1.6; margin-bottom:12px;">${en}</p>
      <p style="color:var(--text-muted); font-size:var(--fs-sm);
                line-height:1.6; margin-bottom:24px;">${hi}</p>
      <button id="bilingual-popup-ok-btn"
              class="btn btn-primary" style="min-width:120px;">
        OK
      </button>
    </div>
  `;
  document.body.appendChild(popup);

  // Attach OK handler safely — works whether onOk is a function or null
  document.getElementById('bilingual-popup-ok-btn').addEventListener('click', () => {
    popup.remove();
    if (typeof onOk === 'function') onOk();
  });
}

// =============================================================
// SHOW REGISTER MESSAGE (success or error)
// =============================================================
function showRegisterMsg(msg, type) {
  const el = document.getElementById('register-msg');
  if (!msg) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.textContent = msg;
  if (type === 'success') {
    el.style.cssText = `
      display:block; padding:12px 16px;
      background:rgba(0,255,136,0.08); border:1px solid rgba(0,255,136,0.3);
      border-radius:var(--radius-sm); margin-bottom:16px;
      font-size:var(--fs-sm); color:var(--success); line-height:1.6;
    `;
  } else {
    el.style.cssText = `
      display:block; padding:12px 16px;
      background:rgba(255,68,102,0.08); border:1px solid rgba(255,68,102,0.3);
      border-radius:var(--radius-sm); margin-bottom:16px;
      font-size:var(--fs-sm); color:var(--danger); line-height:1.6;
    `;
  }
}

// =============================================================
// LOGOUT
// Clears session and returns to homepage
// =============================================================
function handleLogout() {
  if (window._sessionTickInterval) clearInterval(window._sessionTickInterval);
  if (window._swCountdownInterval)  clearInterval(window._swCountdownInterval);
  // Close audio player + mini player on logout — prevent audio playing after session ends
  if (typeof closeAudioPlayer === 'function') closeAudioPlayer();
  // Clear Firestore session token so other devices know this session ended cleanly
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw);
      clearSessionToken(s.isAdmin, s.user?.id);
    } catch {}
  }
  AppState.currentUser = null;
  AppState.isAdmin = false;
  AppState.currentClassId = null;
  AppState.currentFolderId = null;
  AppState.breadcrumbs = [];
  clearSession();
  showToast('Logged out successfully.', 'info');
  // Clear dashboard HTML to free memory
  const dashArea = document.getElementById('dashboard-area');
  if (dashArea) dashArea.remove();
  const adminDashArea = document.getElementById('admin-dashboard-area');
  if (adminDashArea) adminDashArea.remove();
  showPage('page-home');
}

// =============================================================
// LOAD CLASSES INTO REGISTER DROPDOWN
// Reads from Firebase /classes collection
// =============================================================
// Class dropdowns for reg/login are now board-filtered on demand.
// This function is kept so existing calls don't break but does nothing.
async function loadClassesIntoDropdown() {
  // reg-class and login-class are populated via onRegBoardChange() / onLoginBoardChange()
  // when the student selects their board. Do not overwrite them here.
}

// =============================================================
// LOAD ACTIVE SESSION into registration & login dropdowns
// =============================================================
async function loadActiveSessionIntoDropdowns() {
  const selectors = ['reg-session', 'login-session'];
  try {
    const snap = await db.collection('sessions').where('isActive', '==', true).get();
    for (const id of selectors) {
      const select = document.getElementById(id);
      if (!select) continue;
      select.innerHTML = '';
      if (snap.empty) {
        select.innerHTML = '<option value="2026-27">2026-27</option>';
      } else {
        snap.forEach(doc => {
          select.innerHTML += `<option value="${doc.id}">${doc.id}</option>`;
        });
      }
      // Auto-select first (active) session — no blank "Select Session" placeholder
      if (select.options.length > 0) select.selectedIndex = 0;
    }
  } catch {
    for (const id of selectors) {
      const select = document.getElementById(id);
      if (select) { select.innerHTML = '<option value="2026-27">2026-27</option>'; select.selectedIndex = 0; }
    }
  }
  // Auto-select BSEB on login board and load its classes immediately
  const loginBoard = document.getElementById('login-board');
  if (loginBoard && !loginBoard.value) {
    loginBoard.value = 'BSEB';
  }
  loadClassesForBoard('BSEB', 'login-class');
  // Auto-select BSEB on registration board and load its classes immediately
  const regBoard = document.getElementById('reg-board');
  if (regBoard && !regBoard.value) {
    regBoard.value = 'BSEB';
  }
  loadClassesForBoard('BSEB', 'reg-class');
}

// =============================================================
// SESSION MANAGEMENT (Admin)
// Multiple sessions can be active simultaneously.
// Active sessions appear in student registration & login dropdowns.
// =============================================================
async function loadAdminSessions() {
  const container = document.getElementById('sessions-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
  try {
    const snap = await db.collection('sessions').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:var(--fs-sm);">No sessions yet. Add one!</p>';
      return;
    }
    container.innerHTML = '';
    snap.forEach(doc => {
      const s = doc.data();
      const isActive = s.isActive === true;
      const startDate = s.startDate || '';
      const endDate   = s.endDate   || '';
      const today     = new Date().toISOString().split('T')[0];
      container.innerHTML += `
        <div style="padding:14px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:14px;">
              <!-- Toggle switch -->
              <div onclick="toggleSession('${doc.id}', ${isActive})"
                   title="${isActive ? 'Click to Deactivate' : 'Click to Activate'}"
                   style="width:44px;height:24px;border-radius:12px;cursor:pointer;
                          background:${isActive ? 'var(--success)' : 'var(--border)'};
                          position:relative;transition:background 0.2s;flex-shrink:0;
                          box-shadow:${isActive ? '0 0 8px #00ff8844' : 'none'};">
                <div style="width:18px;height:18px;border-radius:50%;background:#fff;
                            position:absolute;top:3px;
                            left:${isActive ? '23px' : '3px'};
                            transition:left 0.2s;"></div>
              </div>
              <div>
                <div style="font-weight:600;color:var(--text-white);font-size:var(--fs-base);">
                  📅 ${doc.id}
                </div>
                <div style="font-size:var(--fs-xs);margin-top:2px;
                            color:${isActive ? 'var(--success)' : 'var(--text-dim)'};">
                  ${isActive ? '🟢 Active — visible in registration & login' : '⚫ Inactive'}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
              <span style="font-size:var(--fs-xs);font-weight:700;letter-spacing:0.5px;
                           color:${isActive ? 'var(--success)' : 'var(--text-dim)'};
                           min-width:52px;text-align:right;">
                ${isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <button class="btn btn-sm btn-danger" onclick="deleteSession('${doc.id}')">🗑️</button>
            </div>
          </div>
          <!-- Start / End Date -->
          <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;">
            <div>
              <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:4px;">📅 Session Start Date</div>
              <input type="date" value="${startDate}" max="${today}"
                style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);
                       padding:6px 10px;border-radius:8px;font-size:var(--fs-sm);outline:none;cursor:pointer;"
                onchange="saveSessionDateFromPanel('${doc.id}', 'startDate', this.value)"
                onfocus="this.style.borderColor='var(--neon-blue)'"
                onblur="this.style.borderColor='var(--border)'">
            </div>
            <div>
              <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:4px;">🏁 Session End Date</div>
              <input type="date" value="${endDate}"
                style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);
                       padding:6px 10px;border-radius:8px;font-size:var(--fs-sm);outline:none;cursor:pointer;"
                onchange="saveSessionDateFromPanel('${doc.id}', 'endDate', this.value)"
                onfocus="this.style.borderColor='var(--neon-blue)'"
                onblur="this.style.borderColor='var(--border)'">
            </div>
          </div>
        </div>`;
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">Could not load sessions.</p>';
  }
}

async function handleAddSession() {
  const name = document.getElementById('new-session-name').value.trim();
  const msg  = document.getElementById('session-msg');
  if (!name) {
    msg.innerHTML = '<div class="info-box" style="color:var(--danger);">Please enter a session name.</div>';
    return;
  }
  if (!/^\d{4}-\d{2}$/.test(name)) {
    msg.innerHTML = '<div class="info-box" style="color:var(--danger);">Format must be YYYY-YY (e.g. 2027-28)</div>';
    return;
  }
  try {
    const existing = await db.collection('sessions').doc(name).get();
    if (existing.exists) {
      msg.innerHTML = '<div class="info-box" style="color:var(--danger);">This session already exists!</div>';
      return;
    }
    // Auto-activate only if this is the very first session
    const activeSnap = await db.collection('sessions').where('isActive','==',true).get();
    const isFirst = activeSnap.empty;
    await db.collection('sessions').doc(name).set({
      isActive: isFirst,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
      // startDate / endDate are NOT set here — admin sets them via date picker
      // Never pass startDate:'' here — it would overwrite a saved date with blank
    });
    document.getElementById('new-session-name').value = '';
    msg.innerHTML = `<div class="info-box" style="color:var(--success);">✅ Session "${name}" added!${isFirst ? ' (Auto-activated as first session)' : ' Toggle it ON when ready.'}</div>`;
    loadAdminSessions();
    loadActiveSessionIntoDropdowns();
  } catch (err) {
    msg.innerHTML = '<div class="info-box" style="color:var(--danger);">Failed to add session. Try again.</div>';
  }
}

// Toggle a session active/inactive independently
// Multiple sessions can be active at the same time
async function toggleSession(sessionId, currentlyActive) {
  const newState = !currentlyActive;
  try {
    await db.collection('sessions').doc(sessionId).update({ isActive: newState });
    showToast(
      newState ? `✅ Session "${sessionId}" is now Active!` : `🔒 Session "${sessionId}" set to Inactive.`,
      newState ? 'success' : 'info'
    );
    loadAdminSessions();
    loadActiveSessionIntoDropdowns();
  } catch (err) {
    showToast('Failed to update session. Try again.', 'error');
  }
}

async function deleteSession(sessionId) {
  // Safety: never allow deleting the currently ACTIVE session
  try {
    const docSnap = await db.collection('sessions').doc(sessionId).get();
    if(docSnap.exists && docSnap.data().isActive){
      showToast('❌ Cannot delete the active session. Deactivate it first.', 'error');
      return;
    }
  } catch(e){}
  if (!confirm(`Delete session "${sessionId}"? This cannot be undone.`)) return;
  try {
    await db.collection('sessions').doc(sessionId).delete();
    showToast(`Session "${sessionId}" deleted.`, 'info');
    loadAdminSessions();
  } catch (err) {
    showToast('Failed to delete session.', 'error');
  }
}

async function saveSessionDateFromPanel(sessionId, field, value) {
  if (!value) return;
  try {
    await db.collection('sessions').doc(sessionId).update({ [field]: value });
    showToast(`✅ ${field === 'startDate' ? 'Start' : 'End'} date saved for ${sessionId}`, 'success');
  } catch (err) {
    showToast('Failed to save date. Try again.', 'error');
  }
}

// =============================================================
// LOAD PUBLIC NOTICES on Homepage
// Only shows approved/published notices
// =============================================================
async function loadHomeNotices() {
  const container = document.getElementById('home-notices');
  if (!container) return;
  try {
    let snap;
    try {
      snap = await db.collection('notices')
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    } catch(indexErr) {
      // Fallback: no orderBy (avoids composite index requirement)
      snap = await db.collection('notices')
        .where('isPublic', '==', true)
        .limit(10)
        .get();
    }

    // Filter: show only notices where showOnHome is true (or undefined = old notices default to true)
    const docs = snap.docs.filter(d => d.data().showOnHome !== false);

    if (docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📢</div>
          <h3>No Notices Yet</h3>
          <p>Check back later for announcements from <span id="s-notice-empty-name">B.C.I</span></p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    docs.forEach(doc => {
      const n = doc.data();
      // importance: normal | important | urgent
      const importanceLabel = {
        normal: '<span class="badge badge-blue">📌 Notice</span>',
        important: '<span class="badge badge-orange">⚠️ Important</span>',
        urgent: '<span class="badge badge-red">🚨 Urgent</span>'
      }[n.importance || 'normal'];

      container.innerHTML += `
        <div class="notice-item ${n.importance || 'normal'}">
          <div class="notice-title">${n.title}</div>
          <div class="notice-body" style="white-space:pre-line;">${n.message.replace(/\\n/g, "\n")}</div>
          <div class="notice-footer">
            ${importanceLabel}
            <span class="notice-date">📅 ${formatDate(n.createdAt)}</span>
          </div>
        </div>`;
    });
  } catch (err) {
    container.innerHTML = `
      <div class="info-box">
        Could not load notices. Please check internet connection.
      </div>`;
  }
}

// =============================================================
// PLACEHOLDER FUNCTIONS (defined in Part 3 & Part 4)
// These are called here but built in later parts
// =============================================================
function initStudentDashboard_stub() {
  // Placeholder stub — overridden by real function below
  console.log('Student dashboard init — Part 3 needed');
}
function initAdminDashboard_stub() {
  // Placeholder stub — overridden by real function below
  console.log('Admin dashboard init — Part 4 needed');
}

// =============================================================
// INITIALIZE PART 2 — Run on page load
// Builds HTML, loads notices, loads class dropdown
// =============================================================
buildPageHTML();

// After HTML is built, load dynamic data
setTimeout(() => {
  loadHomeNotices();
  loadClassesIntoDropdown();
  loadActiveSessionIntoDropdowns();
  loadInstituteInfo(); // updates all text across entire app
}, 100);

console.log('✅ PART 2: Homepage & Auth loaded');

// =====================================================
// PART 3 — STUDENT DASHBOARD
// =====================================================
// Contains:
//   [1] Student dashboard HTML (sidebar + pages)
//   [2] Student home page (welcome + stats + notices)
//   [3] Folder browser (class-wise, lock-aware)
//   [4] File viewer (open Google Drive links)
//   [5] Student profile page (view + change password)
//   [6] All student-side logic and data loading
// =====================================================
// PERMISSIONS (Students):
//   ✅ View own class folders and unlocked files
//   ✅ Open/download files via Google Drive link
//   ✅ View notices
//   ✅ View own profile
//   ✅ Change own password
//   ❌ Cannot delete, edit, move anything
//   ❌ Cannot see locked folders or files
//   ❌ Cannot see other students' data
//   ❌ Cannot access other classes
// =====================================================

// =============================================================
// BUILD STUDENT DASHBOARD HTML
// Called once when student logs in successfully
// Creates the full sidebar + content layout
// =============================================================
function buildStudentDashboardHTML() {
  // Remove any existing dashboard
  const existing = document.getElementById('dashboard-area');
  if (existing) existing.remove();

  const student = AppState.currentUser;

  // Resolve class display name (e.g. "Class 9" not doc ID)
  const className = getClassName(student.class);
  // Store on AppState for use in other functions
  AppState.currentClassName = className;

  // Inject dashboard HTML into body
  document.body.insertAdjacentHTML('beforeend', `

  <!-- =====================================================
       STUDENT DASHBOARD AREA
       ID: dashboard-area
       Contains sidebar + all student pages
       ===================================================== -->
  <div id="dashboard-area" style="display:none; max-width:100%; overflow-x:hidden;">
  <div class="app-layout">

    <!-- ── SIDEBAR ── -->
    <aside class="sidebar" id="student-sidebar">

      <!-- Brand -->
      <div class="sidebar-brand">
        <img src="data:image/jpeg;base64,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"
             class="sidebar-logo" alt="BCI"
             onerror="this.style.display='none'">
        <div class="sidebar-brand-text">
          <h2 id="s-sidebar-shortname">B.C.I</h2>
        </div>
      </div>

      <!-- Logged in student info -->
      <div class="sidebar-user">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="position:relative; flex-shrink:0;">
            <img id="s-sidebar-photo"
                 src="${student.photo || ''}"
                 style="width:46px;height:46px;border-radius:50%;object-fit:cover;
                        border:2px solid var(--neon-blue);
                        box-shadow:0 0 10px rgba(0,212,255,0.4);
                        display:${student.photo ? 'block' : 'none'};">
            <span id="s-sidebar-emoji"
                  style="width:46px;height:46px;border-radius:50%;
                         background:rgba(0,212,255,0.1);border:2px solid rgba(0,212,255,0.4);
                         display:${student.photo ? 'none' : 'flex'};
                         align-items:center;justify-content:center;font-size:22px;">👤</span>
          </div>
          <div style="min-width:0;flex:1;">
            <div class="sidebar-user-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${student.name}
            </div>
            <div class="sidebar-user-role">
              🎓 ${className} &nbsp;·&nbsp; Roll: ${student.roll || '—'}
            </div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:2px;display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00ff88;flex-shrink:0;"></span>
              ${student.session || '—'}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <div class="nav-section-title">Menu</div>

        <div class="nav-item active" data-page="s-page-home"
             onclick="showStudentPage('s-page-home')">
          <span class="nav-icon">🏠</span> Dashboard
        </div>

        <div class="nav-item" data-page="s-page-materials"
             onclick="showStudentPage('s-page-materials'); loadStudentFolders()">
          <span class="nav-icon">📚</span> Study Materials
        </div>

        <div class="nav-item" data-page="s-page-notices"
             onclick="showStudentPage('s-page-notices'); loadStudentNotices()">
          <span class="nav-icon">📢</span> Notices
        </div>

        <div class="nav-item" data-page="s-page-attendance"
             id="student-nav-attendance"
             onclick="handleStudentAttendanceNav()">
          <span class="nav-icon">📊</span> Attendance
        </div>
        <div class="nav-item" data-page="s-page-profile"
             onclick="showStudentPage('s-page-profile')">
          <span class="nav-icon">👤</span> My Profile
        </div>
      </nav>

      <!-- Logout -->
      <div class="sidebar-footer">
        <div id="student-session-expiry" style="font-size:10px;color:var(--text-dim);text-align:center;margin-bottom:8px;"></div>
        <button id="pwa-btn-student" class="pwa-install-sidebar-btn" onclick="pwaInstall()" title="Install BCI as app on your device">
          📲 Install App
        </button>
        <button class="btn btn-danger w-full btn-sm" onclick="confirmLogout()">
          🚪 Logout
        </button>
      </div>
    </aside>

    <!-- ── MAIN CONTENT ── -->
    <main class="main-content">

      <!-- ================================================
           STUDENT PAGE: HOME / DASHBOARD
           ID: s-page-home
           ================================================ -->
      <div id="s-page-home" class="page active">

        <!-- Welcome banner -->
        <div style="
          background: linear-gradient(135deg, var(--bg-card2), var(--bg-card3));
          border: 1px solid var(--border-bright);
          border-radius: var(--radius-lg);
          padding: 28px 32px;
          margin-bottom: 24px;
          position: relative; overflow: hidden;
          box-sizing: border-box; max-width: 100%;
        ">
          <!-- Glow effect -->
          <div style="
            position:absolute; top:-40px; right:-40px;
            width:200px; height:200px; border-radius:50%;
            background: radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%);
            pointer-events:none;
          "></div>
          <div style="font-size:var(--fs-sm); color:var(--neon-blue);
                      font-weight:600; margin-bottom:8px;">
            🌟 Welcome back!
          </div>
          <h1 style="font-size:var(--fs-2xl); margin-bottom:6px;">
            Namaste, <span style="color:var(--neon-blue);">${student.name.split(' ')[0]}</span>! 👋
          </h1>
          <p style="color:var(--text-muted); font-size:var(--fs-base);">
            Your study materials for <strong style="color:var(--text-white);">${className}</strong> are ready.
            Keep learning, keep growing!
          </p>
          <div style="margin-top:16px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <span class="badge badge-blue">🎓 ${className}</span>
            <span class="badge ${(student.board||'BSEB')==='CBSE' ? 'badge-green' : 'badge-blue'}">
              ${(student.board||'BSEB')==='CBSE' ? '📗 CBSE' : '📘 BSEB'}
            </span>
            <span class="badge badge-green">✅ Active Student</span>
          </div>
        </div>

        <!-- Stats row -->
        <div class="stats-grid" id="s-stats-grid">
          <div class="stat-card">
            <div class="stat-card-icon">📁</div>
            <div class="stat-card-value" id="s-stat-folders">—</div>
            <div class="stat-card-label">Folders Available</div>
          </div>
          <div class="stat-card" style="animation-delay:0.1s;">
            <div class="stat-card-icon">📄</div>
            <div class="stat-card-value" id="s-stat-files">—</div>
            <div class="stat-card-label">Study Materials</div>
          </div>
          <div class="stat-card" style="animation-delay:0.2s;">
            <div class="stat-card-icon">📢</div>
            <div class="stat-card-value" id="s-stat-notices">—</div>
            <div class="stat-card-label">Notices</div>
          </div>
          <div class="stat-card" style="animation-delay:0.3s;">
            <div class="stat-card-icon">🏫</div>
            <div class="stat-card-value" style="font-size:18px; margin-top:4px;" id="s-stat-shortname">B.C.I</div>
            <div class="stat-card-label" id="s-stat-name">Brilliant Coaching</div>
          </div>
        </div>

        <!-- Rank Cards -->
        <div id="s-rank-cards" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">

          <!-- Card 1: Latest Month Rank -->
          <div style="background:linear-gradient(135deg,rgba(0,212,255,0.10),rgba(0,212,255,0.03));border:1.5px solid rgba(0,212,255,0.30);border-radius:var(--radius);padding:16px 12px;position:relative;overflow:hidden;">
            <div style="position:absolute;right:-15px;top:-15px;width:70px;height:70px;border-radius:50%;background:rgba(0,212,255,0.07);pointer-events:none;"></div>
            <!-- Header -->
            <div style="font-size:11px;color:var(--neon-blue);font-weight:700;font-family:'Rajdhani',sans-serif;letter-spacing:0.8px;margin-bottom:2px;">📅 LATEST MONTH</div>
            <div id="s-rank-month-label" style="font-size:11px;color:var(--text-dim);margin-bottom:12px;min-height:14px;"></div>
            <!-- All Classes row -->
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">🌍 All Classes</div>
              <div id="s-rank-month-all" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:28px;line-height:1;color:var(--neon-blue);">—</div>
            </div>
            <div style="height:1px;background:rgba(0,212,255,0.15);margin-bottom:10px;"></div>
            <!-- My Class row -->
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">🏫 My Class</div>
              <div id="s-rank-month-class" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:28px;line-height:1;color:var(--neon-blue);">—</div>
            </div>
          </div>

          <!-- Card 2: Overall Rank -->
          <div style="background:linear-gradient(135deg,rgba(139,92,246,0.10),rgba(139,92,246,0.03));border:1.5px solid rgba(139,92,246,0.30);border-radius:var(--radius);padding:16px 12px;position:relative;overflow:hidden;">
            <div style="position:absolute;right:-15px;top:-15px;width:70px;height:70px;border-radius:50%;background:rgba(139,92,246,0.07);pointer-events:none;"></div>
            <!-- Header -->
            <div style="font-size:11px;color:var(--purple);font-weight:700;font-family:'Rajdhani',sans-serif;letter-spacing:0.8px;margin-bottom:2px;">🌟 OVERALL</div>
            <div id="s-rank-overall-label" style="font-size:11px;color:var(--text-dim);margin-bottom:12px;min-height:14px;"></div>
            <!-- All Classes row -->
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">🌍 All Classes</div>
              <div id="s-rank-overall-all" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:28px;line-height:1;color:var(--purple);">—</div>
            </div>
            <div style="height:1px;background:rgba(139,92,246,0.15);margin-bottom:10px;"></div>
            <!-- My Class row -->
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">🏫 My Class</div>
              <div id="s-rank-overall-class" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:28px;line-height:1;color:var(--purple);">—</div>
            </div>
          </div>

        </div>

        <!-- My ID Card -->
        <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,rgba(0,212,255,0.06),rgba(139,92,246,0.06));border:1px solid rgba(0,212,255,0.2);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-md);color:var(--text-white);margin-bottom:4px;">
                🆔 Student ID Card
              </div>
              <div style="font-size:var(--fs-sm);color:var(--text-muted);">View, download or share your digital ID card</div>
            </div>
            <button onclick="showStudentIdCard()"
              style="padding:10px 20px;background:linear-gradient(135deg,var(--neon-blue),#7c3aed);
                     border:none;border-radius:var(--radius-sm);color:#000;font-weight:700;
                     font-family:'Rajdhani',sans-serif;font-size:var(--fs-sm);cursor:pointer;
                     white-space:nowrap;-webkit-tap-highlight-color:transparent;">
              🆔 View ID Card
            </button>
          </div>
        </div>

        <!-- Quick Links: Rate Us / YouTube / Maps -->
        <div id="s-quick-links" style="margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <a id="s-link-review" href="#" target="_blank" rel="noopener"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
                   padding:14px 8px;border-radius:var(--radius);text-decoration:none;
                   background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.3);
                   color:#ffb400;font-family:'Rajdhani',sans-serif;font-weight:700;
                   font-size:var(--fs-xs);text-align:center;transition:all 0.2s;
                   -webkit-tap-highlight-color:transparent;"
            onmouseenter="this.style.background='rgba(255,180,0,0.15)'"
            onmouseleave="this.style.background='rgba(255,180,0,0.08)'">
            <span style="font-size:20px;">⭐</span>
            Rate Us on Google
          </a>
          <a id="s-link-youtube" href="#" target="_blank" rel="noopener"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
                   padding:14px 8px;border-radius:var(--radius);text-decoration:none;
                   background:rgba(255,50,50,0.08);border:1px solid rgba(255,50,50,0.3);
                   color:#ff4444;font-family:'Rajdhani',sans-serif;font-weight:700;
                   font-size:var(--fs-xs);text-align:center;transition:all 0.2s;
                   -webkit-tap-highlight-color:transparent;"
            onmouseenter="this.style.background='rgba(255,50,50,0.15)'"
            onmouseleave="this.style.background='rgba(255,50,50,0.08)'">
            <span style="font-size:20px;">▶️</span>
            YouTube Channel
          </a>
          <a id="s-link-maps" href="#" target="_blank" rel="noopener"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
                   padding:14px 8px;border-radius:var(--radius);text-decoration:none;
                   background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);
                   color:var(--neon-blue);font-family:'Rajdhani',sans-serif;font-weight:700;
                   font-size:var(--fs-xs);text-align:center;transition:all 0.2s;
                   -webkit-tap-highlight-color:transparent;"
            onmouseenter="this.style.background='rgba(0,212,255,0.12)'"
            onmouseleave="this.style.background='rgba(0,212,255,0.06)'">
            <span style="font-size:20px;">📍</span>
            Find Us on Maps
          </a>
        </div>

        <!-- Latest notices on dashboard -->
        <div class="card" style="margin-bottom:24px;">
          <div class="card-title">📢 Latest <span>Notices</span></div>
          <div id="s-home-notices">
            <div class="loading-screen"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Recently added materials -->
        <div class="card">
          <div class="card-title">🆕 Recently Added <span>Materials</span></div>
          <div id="s-recent-materials">
            <div class="loading-screen"><div class="spinner"></div></div>
          </div>
        </div>

      </div><!-- end s-page-home -->


      <!-- ================================================
           STUDENT PAGE: STUDY MATERIALS (Folder Browser)
           ID: s-page-materials
           Students browse folders → subfolders → files
           Only unlocked items visible
           ================================================ -->
      <div id="s-page-materials" class="page">

        <div class="page-header">
          <h1>📚 Study <span>Materials</span></h1>
          <p style="color:var(--text-muted);">
            ${className} — Browse folders and download your study materials
          </p>
        </div>

        <!-- Breadcrumb navigation -->
        <div class="breadcrumb" id="s-breadcrumb">
          <span class="breadcrumb-item active"
                onclick="navigateToRoot()">🏠 ${className}</span>
        </div>

        <!-- Folder contents area -->
        <div id="s-folder-contents">
          <div class="loading-screen">
            <div class="spinner"></div>
            <p>Loading materials...</p>
          </div>
        </div>

      </div><!-- end s-page-materials -->


      <!-- ================================================
           STUDENT PAGE: NOTICES
           ID: s-page-notices
           ================================================ -->
      <div id="s-page-notices" class="page">

        <div class="page-header">
          <h1>📢 Notice <span>Board</span></h1>
          <p style="color:var(--text-muted);">
            Important announcements from <span id="s-noticeboard-name">Brilliant Coaching Institute</span>
          </p>
        </div>

        <div id="s-notices-list">
          <div class="loading-screen"><div class="spinner"></div></div>
        </div>

      </div><!-- end s-page-notices -->


      <!-- ================================================
           STUDENT PAGE: MY PROFILE
           ID: s-page-profile
           ================================================ -->
      <div id="s-page-profile" class="page">

        <div class="page-header">
          <h1>👤 My <span>Profile</span></h1>
          <p style="color:var(--text-muted);">View your details and change password</p>
        </div>

        <div class="grid-2col" style="max-width:800px;">

          <!-- Profile details card -->
          <div class="card">
            <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <span>📋 My <span>Details</span></span>
              <button class="btn btn-outline btn-sm" onclick="openEditProfileModal()" id="edit-profile-btn">
                ✏️ Edit Profile
              </button>
            </div>
            <!-- Photo display -->
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px;
                        padding-bottom:16px; border-bottom:1px solid var(--border);">
              <div style="flex-shrink:0;">
                ${student.photo
                  ? `<img id="edit-photo-img" src="${student.photo}"
                          onclick="viewProfilePhotoFullscreen()"
                          style="width:80px;height:80px;border-radius:50%;object-fit:cover;
                                 border:2px solid var(--neon-blue);box-shadow:0 0 10px #00d4ff33;
                                 cursor:pointer;display:block;" title="Tap to view full screen">
                       <div onclick="viewProfilePhotoFullscreen()"
                            style="font-size:10px;color:var(--neon-blue);text-align:center;
                                   margin-top:4px;cursor:pointer;letter-spacing:0.5px;">
                         👁 View
                       </div>`
                  : `<div style="width:72px;height:72px;border-radius:50%;background:var(--bg-card2);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:30px;">👤</div>`}
              </div>
              <div>
                <div style="font-size:var(--fs-md);font-weight:700;color:var(--text-white);">${student.name}</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:2px;">${className} &nbsp;·&nbsp; Roll ${student.roll || '—'}</div>
                <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:2px;">${student.session || '—'}</div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${[
                { icon:'📅', label:'Session',       val: student.session || '—' },
                { icon:'📋', label:'Board',         val: student.board || 'BSEB' },
                { icon:'🎓', label:'Class',         val: className },
                { icon:'🔢', label:'Roll Number',   val: student.roll || '—' },
                { icon:'👤', label:'Full Name',     val: student.name },
                { icon:'⚧',  label:'Gender',        val: student.gender || '—' },
                { icon:'🎂', label:'Date of Birth', val: formatDOB(student.dob) },
                { icon:'📱', label:'Mobile Number', val: student.mobile },
                { icon:'📱', label:'Alt. Mobile',   val: student.altMobile || 'Not provided' },
                { icon:'👨', label:"Father's Name", val: student.fatherName || student.father || '—' },
                { icon:'👩', label:"Mother's Name", val: student.motherName || student.mother || '—' },
                { icon:'📍', label:'Address',       val: student.address || '—' },
              ].map(item => `
                <div style="display:flex; gap:12px; align-items:flex-start;
                            padding-bottom:14px; border-bottom:1px solid var(--border);">
                  <span style="font-size:18px; flex-shrink:0;">${item.icon}</span>
                  <div>
                    <div style="font-size:var(--fs-xs); color:var(--text-dim);
                                text-transform:uppercase; letter-spacing:1px;
                                margin-bottom:3px;">${item.label}</div>
                    <div style="font-size:var(--fs-base); color:var(--text-white);
                                font-weight:500;">${item.val}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Change password card -->
          <div class="card">
            <div class="card-title">🔑 Change <span>Password</span></div>
            <div class="info-box">
              Choose a strong password that you can remember easily.
              Minimum 6 characters.
            </div>
            <div id="change-pass-msg"></div>
            <div class="form-group">
              <label>Current Password <span class="required">*</span></label>
              <input class="form-control" id="s-current-pass" type="password"
                     placeholder="Enter current password">
            </div>
            <div class="form-group">
              <label>New Password <span class="required">*</span></label>
              <input class="form-control" id="s-new-pass" type="password"
                     placeholder="Enter new password (min 6 chars)">
            </div>
            <div class="form-group">
              <label>Confirm New Password <span class="required">*</span></label>
              <input class="form-control" id="s-confirm-pass" type="password"
                     placeholder="Re-enter new password">
            </div>
            <button class="btn btn-primary w-full" onclick="handleChangePassword()">
              Update Password
            </button>
          </div>

        </div>
      </div><!-- end s-page-profile -->

      <!-- ATTENDANCE PAGE (STUDENT) -->
      <div id="s-page-attendance" class="page" style="padding-bottom:24px;min-height:80vh;">

        <!-- ══ SELECTION SCREEN ══ -->
        <div id="s-att-selection" style="display:flex;flex-direction:column;height:100%;">

          <div style="text-align:center;padding:24px 16px 20px;">
            <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-xl);font-weight:700;color:var(--text-white);">
              📋 Attendance
            </div>
            <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:4px;">What would you like to view?</div>
          </div>

          <!-- Card 1: My Attendance -->
          <div onclick="sSwitchMainTab('att')" style="
            margin:0 16px 14px;
            background:linear-gradient(135deg,rgba(0,212,255,0.12),rgba(0,212,255,0.04));
            border:1.5px solid rgba(0,212,255,0.35);
            border-radius:20px;
            padding:32px 24px;
            cursor:pointer;
            transition:all 0.2s;
            position:relative;
            overflow:hidden;
            -webkit-tap-highlight-color:transparent;
          "
          onmousedown="this.style.transform='scale(0.97)'"
          ontouchstart="this.style.transform='scale(0.97)'"
          onmouseup="this.style.transform='scale(1)'"
          ontouchend="this.style.transform='scale(1)'">
            <!-- Decorative circle -->
            <div style="position:absolute;right:-20px;top:-20px;width:100px;height:100px;border-radius:50%;background:rgba(0,212,255,0.06);"></div>
            <div style="position:absolute;right:10px;bottom:-30px;width:70px;height:70px;border-radius:50%;background:rgba(0,212,255,0.04);"></div>
            <div style="display:flex;align-items:center;gap:18px;">
              <div style="
                width:64px;height:64px;border-radius:16px;
                background:rgba(0,212,255,0.15);
                border:1.5px solid rgba(0,212,255,0.3);
                display:flex;align-items:center;justify-content:center;
                font-size:28px;flex-shrink:0;
              ">📊</div>
              <div>
                <div style="font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;color:var(--neon-blue);line-height:1.2;">My Attendance</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:5px;line-height:1.5;">Tap to view your attendance<br>calendar, stats & history</div>
              </div>
            </div>
            <div style="margin-top:18px;display:flex;align-items:center;gap:6px;">
              <div style="flex:1;height:3px;border-radius:2px;background:rgba(0,212,255,0.15);"></div>
              <div style="font-size:var(--fs-xs);color:var(--neon-blue);font-family:'Rajdhani',sans-serif;font-weight:600;">TAP TO OPEN →</div>
            </div>
          </div>

          <!-- Card 2: Leaderboard -->
          <div onclick="sSwitchMainTab('lb')" style="
            margin:0 16px;
            background:linear-gradient(135deg,rgba(139,92,246,0.12),rgba(139,92,246,0.04));
            border:1.5px solid rgba(139,92,246,0.35);
            border-radius:20px;
            padding:32px 24px;
            cursor:pointer;
            transition:all 0.2s;
            position:relative;
            overflow:hidden;
            -webkit-tap-highlight-color:transparent;
          "
          onmousedown="this.style.transform='scale(0.97)'"
          ontouchstart="this.style.transform='scale(0.97)'"
          onmouseup="this.style.transform='scale(1)'"
          ontouchend="this.style.transform='scale(1)'">
            <!-- Decorative circles -->
            <div style="position:absolute;right:-20px;top:-20px;width:100px;height:100px;border-radius:50%;background:rgba(139,92,246,0.06);"></div>
            <div style="position:absolute;right:10px;bottom:-30px;width:70px;height:70px;border-radius:50%;background:rgba(139,92,246,0.04);"></div>
            <div style="display:flex;align-items:center;gap:18px;">
              <div style="
                width:64px;height:64px;border-radius:16px;
                background:rgba(139,92,246,0.15);
                border:1.5px solid rgba(139,92,246,0.3);
                display:flex;align-items:center;justify-content:center;
                font-size:28px;flex-shrink:0;
              ">🏆</div>
              <div>
                <div style="font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;color:var(--purple);line-height:1.2;">Leaderboard</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:5px;line-height:1.5;">Tap to see top rankings<br>& your position in class</div>
              </div>
            </div>
            <div style="margin-top:18px;display:flex;align-items:center;gap:6px;">
              <div style="flex:1;height:3px;border-radius:2px;background:rgba(139,92,246,0.15);"></div>
              <div style="font-size:var(--fs-xs);color:var(--purple);font-family:'Rajdhani',sans-serif;font-weight:600;">TAP TO OPEN →</div>
            </div>
          </div>

        </div>

        <!-- ══ MY ATTENDANCE PANEL ══ -->
        <div id="s-panel-att" class="hidden">

          <!-- Back button -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
            <button onclick="sSwitchMainTab('home')" style="
              width:40px;height:40px;border-radius:50%;
              background:var(--bg-card2);border:1px solid var(--border);
              color:var(--text-white);cursor:pointer;font-size:18px;
              display:flex;align-items:center;justify-content:center;
              -webkit-tap-highlight-color:transparent;
            ">←</button>
            <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;color:var(--neon-blue);">📊 My Attendance</div>
          </div>

          <!-- Month / Overall sub-tabs -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
            <div id="s-att-tab-month" onclick="sAttSwitchTab('month')"
              style="padding:13px 8px;text-align:center;border-radius:var(--radius-sm);background:var(--neon-blue);color:#000;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);border:2px solid var(--neon-blue);-webkit-tap-highlight-color:transparent;">
              📅 This Month
            </div>
            <div id="s-att-tab-overall" onclick="sAttSwitchTab('overall')"
              style="padding:13px 8px;text-align:center;border-radius:var(--radius-sm);background:var(--bg-card2);color:var(--text-muted);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);border:2px solid var(--border);-webkit-tap-highlight-color:transparent;">
              🗓️ Overall
            </div>
          </div>

          <!-- Month nav -->
          <div id="s-att-month-nav" style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <button onclick="sAttChangeMonth(-1)" style="width:46px;height:46px;border-radius:50%;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:22px;flex-shrink:0;-webkit-tap-highlight-color:transparent;">‹</button>
            <div id="s-att-month-label" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-lg);flex:1;text-align:center;"></div>
            <button onclick="sAttChangeMonth(1)" style="width:46px;height:46px;border-radius:50%;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:22px;flex-shrink:0;-webkit-tap-highlight-color:transparent;">›</button>
          </div>

          <!-- Stats 2x2 grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);padding:18px;text-align:center;">
              <div id="s-att-present" style="font-family:'Rajdhani',sans-serif;font-size:30px;font-weight:700;color:#00ff88;">—</div>
              <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:4px;">✅ Present</div>
            </div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);padding:18px;text-align:center;">
              <div id="s-att-absent" style="font-family:'Rajdhani',sans-serif;font-size:30px;font-weight:700;color:#ff4466;">—</div>
              <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:4px;">❌ Absent</div>
            </div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);padding:18px;text-align:center;">
              <div id="s-att-holiday" style="font-family:'Rajdhani',sans-serif;font-size:30px;font-weight:700;color:#7a9bba;">—</div>
              <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:4px;">🏖️ Holiday</div>
            </div>
            <div style="background:var(--bg-card2);border:2px solid var(--neon-blue);border-radius:var(--radius);padding:18px;text-align:center;">
              <div id="s-att-pct" style="font-family:'Rajdhani',sans-serif;font-size:30px;font-weight:700;color:var(--neon-blue);">—</div>
              <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:4px;">📊 Attendance %</div>
            </div>
          </div>

          <!-- Attendance Progress Bar -->
          <div id="s-att-bar-wrap" style="background:var(--bg-card2);border:1px solid var(--border);
               border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;">
            <!-- Bar track -->
            <div style="position:relative;height:12px;background:rgba(255,68,102,0.15);
                        border-radius:99px;overflow:hidden;margin-bottom:10px;">
              <div id="s-att-bar-fill"
                style="position:absolute;left:0;top:0;height:100%;width:0%;
                       border-radius:99px;
                       background:linear-gradient(90deg,#00c853,#00ff88);
                       transition:width 0.6s cubic-bezier(.4,0,.2,1);
                       will-change:width;
                       -webkit-transform:translateZ(0);transform:translateZ(0);"></div>
            </div>
            <!-- Summary row: stacks on very small screens -->
            <div style="display:flex;align-items:center;justify-content:space-between;
                        gap:4px;font-family:'Rajdhani',sans-serif;flex-wrap:wrap;">
              <!-- Left: Total / P / A -->
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;min-width:0;">
                <span style="font-size:13px;color:var(--text-muted);white-space:nowrap;">
                  Total: <strong id="s-att-bar-total" style="color:var(--text-white);font-size:14px;">—</strong>
                </span>
                <span style="font-size:13px;color:#00ff88;white-space:nowrap;
                             background:rgba(0,255,136,0.08);border-radius:4px;padding:2px 7px;">
                  P <strong id="s-att-bar-p">—</strong>
                </span>
                <span style="font-size:13px;color:#ff4466;white-space:nowrap;
                             background:rgba(255,68,102,0.08);border-radius:4px;padding:2px 7px;">
                  A <strong id="s-att-bar-a">—</strong>
                </span>
              </div>
              <!-- Right: % -->
              <div id="s-att-bar-pct"
                style="font-size:16px;font-weight:700;color:var(--neon-blue);
                       white-space:nowrap;flex-shrink:0;">—</div>
            </div>
          </div>

          <!-- Legend — only shown in This Month tab -->
          <div id="s-att-legend" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;font-size:var(--fs-xs);color:var(--text-muted);">
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#00ff88;display:inline-block;"></span>Present</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#ff4466;display:inline-block;"></span>Absent</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#7a9bba;display:inline-block;"></span>Holiday</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:#ffaa00;display:inline-block;"></span>Not Marked</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:4px;background:var(--bg-card2);border:1px solid var(--border);opacity:0.5;display:inline-block;"></span>Not applicable (before joining)</span>
          </div>

          <div id="s-att-cal-wrap"></div>
          <div id="s-att-empty" class="hidden info-box">No attendance data for this period.</div>
        </div>

        <!-- ══ LEADERBOARD PANEL ══ -->
        <div id="s-panel-lb" class="hidden">

          <!-- Back button -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
            <button onclick="sSwitchMainTab('home')" style="
              width:40px;height:40px;border-radius:50%;
              background:var(--bg-card2);border:1px solid var(--border);
              color:var(--text-white);cursor:pointer;font-size:18px;
              display:flex;align-items:center;justify-content:center;
              -webkit-tap-highlight-color:transparent;
            ">←</button>
            <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;color:var(--purple);">🏆 Leaderboard</div>
          </div>

          <!-- Month/Overall sub-tabs -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
            <div id="s-lb-tab-month" onclick="sLbSwitchTab('month')"
              style="padding:13px 8px;text-align:center;border-radius:var(--radius-sm);background:rgba(139,92,246,0.15);color:var(--purple);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);border:2px solid var(--purple);-webkit-tap-highlight-color:transparent;">
              📅 This Month
            </div>
            <div id="s-lb-tab-overall" onclick="sLbSwitchTab('overall')"
              style="padding:13px 8px;text-align:center;border-radius:var(--radius-sm);background:var(--bg-card2);color:var(--text-muted);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);border:2px solid var(--border);-webkit-tap-highlight-color:transparent;">
              🌟 Overall
            </div>
          </div>

          <!-- Month navigation (for This Month tab only) -->
          <div id="s-lb-month-nav" style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px;">
            <button onclick="sLbChangeMonth(-1)" style="width:44px;height:44px;border-radius:50%;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;">‹</button>
            <div id="s-lb-month-label" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);color:var(--text-white);min-width:130px;text-align:center;"></div>
            <button onclick="sLbChangeMonth(1)" style="width:44px;height:44px;border-radius:50%;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;">›</button>
          </div>

          <div id="s-lb-loading" class="spinner"></div>
          <div id="s-lb-content" class="hidden">

            <!-- Pending message (current month not yet published) -->
            <div id="s-lb-pending" class="hidden" style="text-align:center;padding:32px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;">
              <div style="font-size:36px;margin-bottom:12px;">🗓️</div>
              <div id="s-lb-pending-msg" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);color:var(--text-white);margin-bottom:6px;"></div>
              <div style="font-size:var(--fs-xs);color:var(--text-muted);">Results are calculated after the month ends and all attendance is marked.</div>
            </div>

            <!-- Coming soon cards (shown with pending for current month) -->
            <div id="s-lb-coming-soon" class="hidden" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
              <div style="padding:14px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px;opacity:0.6;">
                <span style="font-size:22px;">🌍</span>
                <div>
                  <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--text-white);">Top 10 — All Classes</div>
                  <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">Results coming soon...</div>
                </div>
              </div>
              <div style="padding:14px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px;opacity:0.6;">
                <span style="font-size:22px;">🏫</span>
                <div>
                  <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--text-white);">Top 5 — My Class Ranking</div>
                  <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">Results coming soon...</div>
                </div>
              </div>
            </div>

            <!-- Overall progress banner (shown only in overall tab) -->
            <div id="s-lb-overall-progress" class="hidden" style="margin-bottom:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--text-white);">📊 Session Progress</div>
                <div id="s-lb-progress-text" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--neon-blue);"></div>
              </div>
              <div style="background:var(--bg-dark);border-radius:4px;height:6px;overflow:hidden;">
                <div id="s-lb-progress-bar" style="height:100%;background:linear-gradient(90deg,var(--neon-blue),var(--purple));border-radius:4px;transition:width 0.4s ease;width:0%;"></div>
              </div>
              <div id="s-lb-progress-sub" style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:6px;"></div>
            </div>

            <!-- No months published yet (overall tab) -->
            <div id="s-lb-overall-empty" class="hidden" style="margin-bottom:16px;">
              <div style="text-align:center;padding:32px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:10px;">
                <div style="font-size:36px;margin-bottom:12px;">🏆</div>
                <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);color:var(--text-white);margin-bottom:6px;">Overall Leaderboard Building...</div>
                <div id="s-lb-overall-empty-msg" style="font-size:var(--fs-xs);color:var(--text-muted);">No months have been published yet. The overall leaderboard will appear after the first month ends.</div>
              </div>
              <!-- Coming soon banners for overall tab -->
              <div style="display:flex;flex-direction:column;gap:10px;">
                <div style="padding:14px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px;opacity:0.6;">
                  <span style="font-size:22px;">🌍</span>
                  <div>
                    <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--text-white);">Top 10 — All Classes</div>
                    <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">Results coming soon...</div>
                  </div>
                </div>
                <div style="padding:14px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px;opacity:0.6;">
                  <span style="font-size:22px;">🏫</span>
                  <div>
                    <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--text-white);">Top 5 — My Class Ranking</div>
                    <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">Results coming soon...</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Leaderboard tables (shown when published) -->
            <div id="s-lb-tables" class="hidden">
              <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-base);font-weight:700;color:var(--text-muted);margin-bottom:10px;">🌍 Top 10 — All Classes</div>
              <div style="display:grid;grid-template-columns:36px 1fr 44px 42px 46px;gap:4px;padding:6px 8px;background:var(--bg-card2);border-radius:var(--radius-sm) var(--radius-sm) 0 0;border:1px solid var(--border);border-bottom:2px solid var(--border);">
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">RANK</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">NAME</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">CLASS</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">ROLL</div>
                <div style="font-size:10px;font-weight:700;color:var(--neon-blue);font-family:'Rajdhani',sans-serif;text-align:right;">%</div>
              </div>
              <div id="s-lb-overall-list" style="display:flex;flex-direction:column;"></div>
              <div id="s-lb-my-overall" class="hidden" style="margin-top:6px;border-radius:0 0 var(--radius-sm) var(--radius-sm);overflow:hidden;border-top:2px dashed rgba(139,92,246,0.4);"></div>
              <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-base);font-weight:700;color:var(--text-muted);margin:20px 0 10px;">🏫 Top 5 — <span id="s-lb-class-label" style="color:var(--neon-blue);"></span></div>
              <div style="display:grid;grid-template-columns:36px 1fr 44px 42px 46px;gap:4px;padding:6px 8px;background:var(--bg-card2);border-radius:var(--radius-sm) var(--radius-sm) 0 0;border:1px solid var(--border);border-bottom:2px solid var(--border);">
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">RANK</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">NAME</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">CLASS</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);font-family:'Rajdhani',sans-serif;">ROLL</div>
                <div style="font-size:10px;font-weight:700;color:var(--neon-blue);font-family:'Rajdhani',sans-serif;text-align:right;">%</div>
              </div>
              <div id="s-lb-class-list" style="display:flex;flex-direction:column;"></div>
              <div id="s-lb-my-class" class="hidden" style="margin-top:6px;border-radius:0 0 var(--radius-sm) var(--radius-sm);overflow:hidden;border-top:2px dashed rgba(139,92,246,0.4);"></div>
              <div id="s-lb-avg" style="margin-top:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;font-size:var(--fs-sm);color:var(--text-muted);"></div>
            </div>

            <div id="s-lb-empty" class="hidden" style="text-align:center;padding:32px 16px;color:var(--text-dim);font-size:var(--fs-sm);"></div>
          </div>
        </div>

      </div><!-- end s-page-attendance -->

    </main><!-- end main-content -->
  </div><!-- end app-layout -->
  </div><!-- end dashboard-area -->

  <!-- ── Student ID Card Modal ── -->
  <div id="modal-id-card" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;
       background:rgba(0,0,0,0.85);align-items:center;justify-content:center;padding:12px;box-sizing:border-box;overflow-y:auto;">
    <div style="width:100%;max-width:340px;position:relative;margin:auto;box-sizing:border-box;">
      <!-- Close -->
      <button onclick="document.getElementById('modal-id-card').style.display='none'"
        style="position:absolute;top:-36px;right:0;background:none;border:none;color:#fff;
               font-size:24px;cursor:pointer;z-index:10;line-height:1;">✕</button>
      <!-- Card canvas area -->
      <canvas id="id-card-canvas" style="width:100%;max-width:100%;border-radius:12px;display:block;
              box-shadow:0 0 30px rgba(0,212,255,0.3);box-sizing:border-box;"></canvas>
      <!-- Action buttons -->
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button onclick="downloadIdCard()"
          style="flex:1;padding:10px;background:linear-gradient(135deg,var(--neon-blue),#0099cc);
                 border:none;border-radius:10px;color:#000;font-weight:700;font-size:14px;
                 font-family:'Rajdhani',sans-serif;cursor:pointer;">
          ⬇️ Download
        </button>
        <button onclick="shareIdCard()"
          style="flex:1;padding:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);
                 border:none;border-radius:10px;color:#fff;font-weight:700;font-size:14px;
                 font-family:'Rajdhani',sans-serif;cursor:pointer;">
          📤 Share
        </button>
      </div>
    </div>
  </div>

  `); // end insertAdjacentHTML
}


// =============================================================
// SHOW STUDENT PAGE
// Switches between student dashboard pages
// Updates sidebar active state
// =============================================================
function showStudentPage(pageId, addHistory = true) {
  document.querySelectorAll('#dashboard-area .page').forEach(p => {
    p.classList.remove('active');
  });
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  document.querySelectorAll('#student-sidebar .nav-item').forEach(n => {
    n.classList.toggle('active', n.getAttribute('data-page') === pageId);
  });

  document.getElementById('student-sidebar')?.classList.remove('mobile-open');
  const bd2=document.getElementById('sidebar-backdrop'); if(bd2) bd2.style.display='none';

  if (addHistory) {
    history.pushState({ page: pageId, area: 'student' }, '', `#${pageId}`);
  }
}


// =============================================================
// INIT STUDENT DASHBOARD
// Called after successful login
// Builds HTML, shows dashboard, loads all data
// =============================================================

// =============================================================
// LOAD STUDENT RANKS on dashboard
// Shows latest published month rank + overall rank
// =============================================================
async function loadStudentRanks() {
  const student = AppState.currentUser;
  if (!student) return;
  const myId    = student.id || student.docId;
  const myClass = student.class || '';
  const myBoard = student.board || 'BSEB';

  // Get active session
  let sessionId = null, sessionSd = null;
  try {
    const snap = await db.collection('sessions').where('isActive','==',true).limit(1).get();
    snap.forEach(doc => { sessionId = doc.id; sessionSd = doc.data().startDate || null; });
  } catch(e) {}
  if (!sessionId || !sessionSd) return;

  const now     = new Date();
  const istNow  = new Date(now.getTime() + 5.5*60*60*1000);
  const sdDate  = new Date(sessionSd + 'T00:00:00');

  // ── Helper: get all board+class combos from leaderboard doc IDs ──
  // We need to know all classes to compute true all-class rank
  let boardClassSet = new Set();
  try {
    const studSnap = await db.collection('students').where('status','==','approved').get();
    studSnap.forEach(doc => {
      const d = doc.data();
      if (d.class) boardClassSet.add((d.board||'BSEB') + '|' + d.class);
    });
  } catch(e) {}
  if (!boardClassSet.size) return;

  // ── PART A: Latest Published Month ──
  // Walk backwards from last month until we find a published month
  let latestMonthStr  = null;
  let latestMonthData = []; // all students merged from all classes

  let checkDate = new Date(istNow.getFullYear(), istNow.getMonth()-1, 1);
  const sessionStartMonth = new Date(sdDate.getFullYear(), sdDate.getMonth(), 1);

  while (checkDate >= sessionStartMonth) {
    const monthStr = checkDate.getFullYear() + '-' + String(checkDate.getMonth()+1).padStart(2,'0');
    let monthData  = [];
    let hasPublished = false;

    for (const bc of boardClassSet) {
      const [brd, cls] = bc.split('|');
      try {
        const snap = await db.collection('leaderboard').doc(lbGetDocId(sessionId, brd, cls, monthStr)).get();
        if (snap.exists && snap.data().published) {
          hasPublished = true;
          monthData = [...monthData, ...(snap.data().data || [])];
        }
      } catch(e) {}
    }

    if (hasPublished) {
      latestMonthStr  = monthStr;
      latestMonthData = monthData;
      break;
    }
    checkDate.setMonth(checkDate.getMonth() - 1);
  }

  // ── PART B: Overall (average of all published months) ──
  // Collect all months from session start to last month
  const allMonthStrs = [];
  const tempCur = new Date(sdDate.getFullYear(), sdDate.getMonth(), 1);
  const lastMonth = new Date(istNow.getFullYear(), istNow.getMonth()-1, 1);
  while (tempCur <= lastMonth) {
    allMonthStrs.push(tempCur.getFullYear() + '-' + String(tempCur.getMonth()+1).padStart(2,'0'));
    tempCur.setMonth(tempCur.getMonth()+1);
  }

  // perStudentMonthPct: id -> { monthStr -> pct }
  const perStudentMonthPct = {};
  const studentMeta = {};
  const publishedMonthSet = new Set();

  for (const monthStr of allMonthStrs) {
    let monthHasData = false;
    for (const bc of boardClassSet) {
      const [brd, cls] = bc.split('|');
      try {
        const snap = await db.collection('leaderboard').doc(lbGetDocId(sessionId, brd, cls, monthStr)).get();
        if (snap.exists && snap.data().published) {
          monthHasData = true;
          (snap.data().data || []).forEach(e => {
            if (!studentMeta[e.id]) studentMeta[e.id] = { classId: e.classId };
            if (!perStudentMonthPct[e.id]) perStudentMonthPct[e.id] = {};
            perStudentMonthPct[e.id][monthStr] = e.pct;
          });
        }
      } catch(e) {}
    }
    if (monthHasData) publishedMonthSet.add(monthStr);
  }

  // Build overall lbData (same logic as sLbLoadOverall)
  const overallData = [];
  for (const [id, meta] of Object.entries(studentMeta)) {
    const monthPcts = perStudentMonthPct[id] || {};
    let totalPct = 0;
    for (const ms of publishedMonthSet) {
      totalPct += (monthPcts[ms] !== undefined) ? monthPcts[ms] : 75;
    }
    const pct = publishedMonthSet.size > 0 ? Math.round(totalPct / publishedMonthSet.size) : 0;
    overallData.push({ id, classId: meta.classId, pct });
  }
  overallData.sort((a,b) => b.pct !== a.pct ? b.pct - a.pct : 0);

  // ── Helper: compute rank from sorted array ──
  function getRank(arr, id) {
    let rank = 1;
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && arr[i].pct !== arr[i-1].pct) rank = i + 1;
      if (arr[i].id === id) return rank;
    }
    return null;
  }

  function rankLabel(r) {
    if (!r) return '—';
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return '#' + r;
  }

  // ── UPDATE UI: Latest Month ──
  const monthAllEl    = document.getElementById('s-rank-month-all');
  const monthClassEl  = document.getElementById('s-rank-month-class');
  const monthLabelEl  = document.getElementById('s-rank-month-label');

  if (latestMonthStr && latestMonthData.length) {
    // Sort merged data for all-class rank
    latestMonthData.sort((a,b) => b.pct !== a.pct ? b.pct - a.pct : 0);
    const monthAllRank   = getRank(latestMonthData, myId);
    const myClassData    = latestMonthData.filter(x => x.classId === myClass);
    const monthClassRank = getRank(myClassData, myId);

    // Format month label e.g. "Apr 2026"
    const [ly, lm] = latestMonthStr.split('-');
    const mName = new Date(parseInt(ly), parseInt(lm)-1, 1).toLocaleString('default',{month:'short',year:'numeric'});

    if (monthLabelEl) monthLabelEl.textContent = mName;
    if (monthAllEl)   monthAllEl.textContent   = rankLabel(monthAllRank);
    if (monthClassEl) monthClassEl.textContent = rankLabel(monthClassRank);
  } else {
    if (monthLabelEl) monthLabelEl.textContent = 'No results yet';
    if (monthAllEl)   monthAllEl.textContent   = '—';
    if (monthClassEl) monthClassEl.textContent = '—';
  }

  // ── UPDATE UI: Overall ──
  const overallAllEl    = document.getElementById('s-rank-overall-all');
  const overallClassEl  = document.getElementById('s-rank-overall-class');
  const overallLabelEl  = document.getElementById('s-rank-overall-label');

  if (overallData.length && publishedMonthSet.size > 0) {
    const overallAllRank   = getRank(overallData, myId);
    const myOverallClass   = overallData.filter(x => x.classId === myClass);
    myOverallClass.sort((a,b) => b.pct - a.pct);
    const overallClassRank = getRank(myOverallClass, myId);

    const pubCount = publishedMonthSet.size;
    if (overallLabelEl) overallLabelEl.textContent = `${pubCount} month${pubCount!==1?'s':''} avg`;
    if (overallAllEl)   overallAllEl.textContent   = rankLabel(overallAllRank);
    if (overallClassEl) overallClassEl.textContent = rankLabel(overallClassRank);
  } else {
    if (overallLabelEl) overallLabelEl.textContent = 'No results yet';
    if (overallAllEl)   overallAllEl.textContent   = '—';
    if (overallClassEl) overallClassEl.textContent = '—';
  }
}

async function initStudentDashboard() {
  // Hide all public pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Load class name map so getClassName works correctly
  if (!window._classNameMap) {
    try {
      const classSnap = await db.collection('classes').get();
      window._classNameMap = {};
      classSnap.forEach(doc => {
        window._classNameMap[doc.id] = doc.data().name || doc.id;
      });
    } catch (e) {
      window._classNameMap = {};
    }
  }

  // Build dashboard HTML
  buildStudentDashboardHTML();

  // Show dashboard
  document.getElementById('dashboard-area').style.display = 'block';

  // Push initial history state so back button works from the start
  history.replaceState({ page: 's-page-home', area: 'student' }, '', '#s-page-home'); // replace login entry — back button won't return to login

  // Load all data
  loadStudentStats();
  loadStudentHomeNotices();
  loadStudentRecentMaterials();
  loadStudentRanks();

  // Always await institute data so logo appears immediately without needing a refresh
  await loadInstituteInfo();

  // Populate quick links from institute data
  const inst = window._instituteData || {};
  const reviewLink  = document.getElementById('s-link-review');
  const youtubeLink = document.getElementById('s-link-youtube');
  const mapsLink    = document.getElementById('s-link-maps');
  if(reviewLink  && inst.hpReviewUrl)  reviewLink.href  = inst.hpReviewUrl;
  if(youtubeLink && inst.hpYoutubeUrl) youtubeLink.href = inst.hpYoutubeUrl;
  if(mapsLink    && inst.hpMapsUrl)    mapsLink.href    = inst.hpMapsUrl;
  // Hide quick links section if none of the links are set
  const quickLinks = document.getElementById('s-quick-links');
  if(quickLinks && !inst.hpReviewUrl && !inst.hpYoutubeUrl && !inst.hpMapsUrl){
    quickLinks.style.display = 'none';
  }

  console.log('✅ Student dashboard initialized for:', AppState.currentUser.name);

  // Apply attendance feature state to nav (check Firestore setting)
  try {
    const settingsDoc = await db.collection('admin').doc('settings').get();
    const attEnabled  = settingsDoc.exists
      ? settingsDoc.data().attendanceEnabled !== false
      : true;
    applyAttendanceFeatureToStudentNav(attEnabled);
  } catch(e) { /* fail open — leave nav enabled */ }
}


// =============================================================
// LOAD STUDENT STATS (counts for dashboard cards)
// Shows: folder count, file count, notice count
// Only counts items visible to this student (unlocked + their class)
// =============================================================
async function loadStudentStats() {
  const classId = AppState.currentUser.class;
  try {
    // Count unlocked root folders for this class
    const foldersSnap = await db.collection('folders')
      .where('classId', '==', classId)
      .where('isLocked', '==', false)
      .where('parentFolderId', '==', null)
      .get();

    // Count unlocked materials for this class
    const materialsSnap = await db.collection('materials')
      .where('classId', '==', classId)
      .where('isLocked', '==', false)
      .get();

    // Count notices
    const noticesSnap = await db.collection('notices').get();

    // Update stat cards
    const folderEl = document.getElementById('s-stat-folders');
    const fileEl   = document.getElementById('s-stat-files');
    const noticeEl = document.getElementById('s-stat-notices');
    if (folderEl) folderEl.textContent = foldersSnap.size;
    if (fileEl)   fileEl.textContent   = materialsSnap.size;
    if (noticeEl) noticeEl.textContent = noticesSnap.size;

  } catch (err) {
    console.error('Stats load error:', err);
  }
}


// =============================================================
// LOAD NOTICES on student home dashboard (latest 3)
// =============================================================
async function loadStudentHomeNotices() {
  const container = document.getElementById('s-home-notices');
  if (!container) return;
  try {
    const snap = await db.collection('notices')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Only show notices targeted at student dashboard
    // If notice has targetClasses, only show if student's board|class matches
    const student = AppState.currentUser;
    const studentKey = student ? ((student.board||'BSEB').toUpperCase() + '|' + student.class) : null;
    const docs = snap.docs.filter(d => {
      const nd = d.data();
      if (nd.showOnDashboard === false || nd.isPublic === false) return false;
      const tc = nd.targetClasses;
      if (!tc || tc.length === 0) return true; // no class filter → show to all
      return studentKey && tc.includes(studentKey);
    });

    if (docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px;">
          <div class="empty-state-icon" style="font-size:36px;">📢</div>
          <p>No notices yet</p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    docs.slice(0, 3).forEach(doc => {
      container.innerHTML += buildNoticeHTML(doc.data());
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:var(--fs-sm);">Could not load notices.</p>';
  }
}


// =============================================================
// LOAD FULL NOTICES PAGE
// =============================================================
async function loadStudentNotices() {
  const container = document.getElementById('s-notices-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
  try {
    const snap = await db.collection('notices')
      .orderBy('createdAt', 'desc')
      .get();

    // Only show notices targeted at student dashboard, filtered by class if applicable
    const student2 = AppState.currentUser;
    const studentKey2 = student2 ? ((student2.board||'BSEB').toUpperCase() + '|' + student2.class) : null;
    const docs = snap.docs.filter(d => {
      const nd = d.data();
      if (nd.showOnDashboard === false || nd.isPublic === false) return false;
      const tc = nd.targetClasses;
      if (!tc || tc.length === 0) return true;
      return studentKey2 && tc.includes(studentKey2);
    });

    if (docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📢</div>
          <h3>No Notices Yet</h3>
          <p>Check back later for announcements</p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    docs.forEach(doc => {
      container.innerHTML += buildNoticeHTML(doc.data(), true);
    });
  } catch (err) {
    container.innerHTML = '<div class="info-box">Could not load notices. Please check internet.</div>';
  }
}


// =============================================================
// BUILD NOTICE HTML (reusable)
// importance: normal | important | urgent
// =============================================================
function buildNoticeHTML(n, showFull = false) {
  const labels = {
    normal:    '<span class="badge badge-blue">📌 Notice</span>',
    important: '<span class="badge badge-orange">⚠️ Important</span>',
    urgent:    '<span class="badge badge-red">🚨 Urgent</span>'
  };

  // On dashboard (showFull=false) → clickable, navigates to Notices tab
  // On notices page (showFull=true) → not clickable, shows full text
  const clickable = !showFull;

  return `
    <div class="notice-item ${n.importance || 'normal'}" style="margin-bottom:12px;
         ${clickable ? 'cursor:pointer; transition:border-color 0.2s, transform 0.15s;' : ''}"
         ${clickable ? `onclick="showStudentPage('s-page-notices'); loadStudentNotices();"
                       onmouseenter="this.style.transform='translateY(-2px)'"
                       onmouseleave="this.style.transform=''"` : ''}>
      <div class="notice-title">${n.title}</div>
      <div class="notice-body" style="${!showFull ? 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;' : 'white-space:pre-line;'}">
        ${n.message.replace(/\\n/g, '\n')}
      </div>
      <div class="notice-footer">
        ${labels[n.importance || 'normal']}
        <span class="notice-date">📅 ${formatDate(n.createdAt)}</span>
        ${clickable ? '<span style="color:var(--neon-blue);font-size:var(--fs-xs);margin-left:auto;">Read more →</span>' : ''}
      </div>
    </div>`;
}


// =============================================================
// HELPER: Check if a folder (or any of its parents) is locked
// Returns TRUE if folder is locked OR any ancestor is locked
// Returns FALSE if entire chain is unlocked (or folderId is 'root'/null)
// =============================================================
async function isFolderOrParentLocked(folderId) {
  // If file is at root level, no parent to check
  if (!folderId || folderId === 'root') return false;

  try {
    // Get the folder document
    const folderDoc = await db.collection('folders').doc(folderId).get();
    
    if (!folderDoc.exists) return false; // Folder deleted? Treat as unlocked
    
    const folderData = folderDoc.data();
    
    // If THIS folder is locked, return true immediately
    if (folderData.isLocked === true) return true;
    
    // If this folder is unlocked but has a parent, check parent recursively
    if (folderData.parentFolderId) {
      return await isFolderOrParentLocked(folderData.parentFolderId);
    }
    
    // This folder is unlocked and has no parent (it's root level)
    return false;
    
  } catch (err) {
    console.error('Error checking folder lock status:', err);
    return false; // On error, default to unlocked (safer for students)
  }
}


// =============================================================
// LOAD RECENTLY ADDED MATERIALS on home dashboard
// ⚠️ FIX 3: Shows last 3 materials as notifications (navigate to Study Materials)
// ⚠️ BUG FIX: Also checks if parent folder is locked!
// =============================================================
async function loadStudentRecentMaterials() {
  const container = document.getElementById('s-recent-materials');
  if (!container) return;
  const classId = AppState.currentUser.class;
  
  // Show loading state
  container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading materials...</p></div>';
  
  try {
    const snap = await db.collection('materials')
      .where('classId', '==', classId)
      .where('isLocked', '==', false)
      .get();

    if (snap.empty) {
      container.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:8px;">📂</div>
          <p style="font-size:var(--fs-base);">No study materials added yet.</p>
          <p style="font-size:var(--fs-sm); margin-top:4px; color:var(--text-dim);">
            Check back soon — your teacher will upload materials here.
          </p>
        </div>`;
      return;
    }

    // Filter out files whose parent folder is locked
    const allMaterials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const visibleMaterials = [];
    for (const material of allMaterials) {
      const parentLocked = await isFolderOrParentLocked(material.folderId);
      if (!parentLocked) {
        visibleMaterials.push(material);
      }
    }
    
    if (visibleMaterials.length === 0) {
      container.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:8px;">📂</div>
          <p style="font-size:var(--fs-base);">No study materials available yet.</p>
          <p style="font-size:var(--fs-sm); margin-top:4px; color:var(--text-dim);">
            Check back soon — your teacher will upload materials here.
          </p>
        </div>`;
      return;
    }
    
    // ⚠️ FIX 3: Sort and take latest 3 only
    const sorted = visibleMaterials
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, 3);

    // Build folder name map for the materials' folderIds
    const folderIds = [...new Set(sorted.map(m => m.folderId).filter(id => id && id !== 'root'))];
    const folderNames = {};
    if(folderIds.length){
      await Promise.all(folderIds.map(async fid => {
        try{
          const fdoc = await db.collection('folders').doc(fid).get();
          if(fdoc.exists) folderNames[fid] = fdoc.data().name || '';
        }catch{}
      }));
    }

    // ⚠️ FIX 3: Notification-style cards that navigate to Study Materials
    const typeIcons = {
      'Notes': '📝',
      'Assignment': '📋',
      'DPP': '📊',
      'Paper': '📄',
      'Syllabus': '📑'
    };
    
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${sorted.map(m => {
          const folderName = (m.folderId && m.folderId !== 'root' && folderNames[m.folderId])
            ? folderNames[m.folderId] : null;
          return `
          <div onclick="showStudentPage('s-page-materials'); loadStudentFolders();" style="
            padding:14px 16px;
            background:var(--bg-card);
            border:1px solid var(--border);
            border-radius:var(--radius);
            cursor:pointer;
            transition:all 0.2s;
            display:flex;
            align-items:center;
            gap:12px;
          " onmouseenter="this.style.borderColor='var(--neon-blue)'; this.style.background='var(--bg-card2)';"
             onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-card)';">
            
            <div style="font-size:24px; flex-shrink:0;">${typeIcons[m.type] || '📄'}</div>
            
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600; font-size:var(--fs-sm); margin-bottom:3px; color:var(--text-white); 
                          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${m.title}
              </div>
              <div style="font-size:var(--fs-xs); color:var(--text-dim); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="badge badge-blue" style="font-size:10px; padding:3px 8px;">${m.type || 'Material'}</span>
                ${folderName ? `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.3);color:#ffaa00;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:600;">📁 ${folderName}</span>` : ''}
                <span>📅 ${formatDate(m.createdAt)}</span>
              </div>
            </div>
            
            <div style="color:var(--neon-blue); font-size:var(--fs-xs); flex-shrink:0;">
              View →
            </div>
          </div>`;
        }).join('')}
        
        <button onclick="showStudentPage('s-page-materials'); loadStudentFolders();" class="btn btn-outline btn-sm" style="margin-top:4px;">
          📚 View All Materials
        </button>
      </div>`;

  } catch (err) {
    console.error('loadStudentRecentMaterials error:', err);
    container.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--text-muted);">
        <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
        <p>Could not load materials. Please check your internet connection.</p>
      </div>`;
  }
}


// =============================================================
// LOAD STUDENT FOLDERS (root level for their class)
// Called when student opens "Study Materials" page
// Only shows UNLOCKED folders
// =============================================================
async function loadStudentFolders(parentFolderId = null) {
  const container = document.getElementById('s-folder-contents');
  if (!container) return;

  container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading...</p></div>';

  const classId = AppState.currentUser.class;
  AppState.currentFolderId = parentFolderId;

  try {
    // Run auto-unlock in background — don't block folder loading
    checkAndAutoUnlock(); // no await — fires and forgets

    // Load subfolders and files in parallel
    let foldersQuery = db.collection('folders')
      .where('classId', '==', classId)
      .where('isLocked', '==', false); // Students only see unlocked

    if (parentFolderId === null) {
      foldersQuery = foldersQuery.where('parentFolderId', '==', null);
    } else {
      foldersQuery = foldersQuery.where('parentFolderId', '==', parentFolderId);
    }

    // Run both queries in parallel — faster than sequential
    // NOTE: orderBy('sortOrder') requires a Firestore composite index:
    // folders: classId (ASC) + isLocked (ASC) + parentFolderId (ASC) + sortOrder (ASC)
    let foldersSnap, filesSnap;
    try {
      [foldersSnap, filesSnap] = await Promise.all([
        foldersQuery.get(),   // No orderBy in query — sort in JS below (avoids index dependency)
        db.collection('materials')
          .where('classId', '==', classId)
          .where('isLocked', '==', false)
          .where('folderId', '==', parentFolderId || 'root')
          .orderBy('createdAt', 'desc').get()
      ]);
    } catch(indexErr) {
      console.warn('Student folder load error, retrying without materials orderBy:', indexErr);
      [foldersSnap, filesSnap] = await Promise.all([
        foldersQuery.get(),
        db.collection('materials')
          .where('classId', '==', classId)
          .where('isLocked', '==', false)
          .where('folderId', '==', parentFolderId || 'root')
          .get()
      ]);
    }

    // Build content HTML
    let html = '';

    // Sort folders: by sortOrder (admin drag order), fallback to name for old folders
    const folderDocs = foldersSnap.docs.slice().sort((a, b) => {
      const so_a = a.data().sortOrder;
      const so_b = b.data().sortOrder;
      // If both have sortOrder → use it
      if (so_a !== undefined && so_b !== undefined) return so_a - so_b;
      // If only one has it → that one comes first
      if (so_a !== undefined) return -1;
      if (so_b !== undefined) return 1;
      // Neither has sortOrder → alphabetical fallback
      return (a.data().name || '').localeCompare(b.data().name || '');
    });

    // Folders section
    if (folderDocs.length) {
      html += `<div style="margin-bottom:24px;">
        <div style="font-size:var(--fs-sm); color:var(--text-dim);
                    text-transform:uppercase; letter-spacing:1px;
                    margin-bottom:12px; font-weight:600;">📁 Folders</div>
        <div class="folder-grid">`;

      folderDocs.forEach(doc => {
        const f = doc.data();
        html += `
          <div class="folder-item"
               onclick="enterFolder('${doc.id}', '${f.name.replace(/'/g, "\\'")}')">
            <span class="folder-icon">📁</span>
            <div class="folder-name">${f.name}</div>
            <div class="folder-meta">Click to open</div>
          </div>`;
      });

      html += `</div></div>`;
    }

    // Files section
    if (!filesSnap.empty) {
      html += `<div>
        <div style="font-size:var(--fs-sm); color:var(--text-dim);
                    text-transform:uppercase; letter-spacing:1px;
                    margin-bottom:12px; font-weight:600;">📄 Files</div>
        <div class="file-list">`;

      filesSnap.forEach(doc => {
        html += buildFileItemHTML(doc.id, doc.data(), false); // false = student view
      });

      html += `</div></div>`;
    }

    // Empty state
    if (!folderDocs.length && filesSnap.empty) {
      html = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>Nothing Here Yet</h3>
          <p>No materials have been added to this section yet.<br>
             Check back later or contact your teacher.</p>
        </div>`;
    }

    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `
      <div class="info-box">
        ⚠️ Could not load materials. Please check internet connection and try again.
      </div>`;
    console.error('Folder load error:', err);
  }
}


// =============================================================
// NAVIGATE INTO A FOLDER (student)
// Updates breadcrumb and loads folder contents
// ⚠️ FIX 4: Now pushes to browser history for back button support
// =============================================================
function enterFolder(folderId, folderName) {
  // Add to breadcrumbs
  AppState.breadcrumbs.push({ id: folderId, name: folderName });
  
  // ⚠️ FIX 4: Push to browser history
  history.pushState({ 
    page: 's-page-materials', 
    area: 'student',
    folderId: folderId,
    breadcrumbs: JSON.parse(JSON.stringify(AppState.breadcrumbs))
  }, '', `#s-page-materials/folder/${folderId}`);
  
  updateStudentBreadcrumb();
  loadStudentFolders(folderId);
}


// =============================================================
// NAVIGATE TO ROOT (student)
// Resets breadcrumbs and goes back to class root
// ⚠️ FIX 4: Now pushes to browser history
// =============================================================
function navigateToRoot() {
  AppState.breadcrumbs = [];
  AppState.currentFolderId = null;
  
  // ⚠️ FIX 4: Push to browser history
  history.pushState({
    page: 's-page-materials',
    area: 'student',
    folderId: null,
    breadcrumbs: []
  }, '', '#s-page-materials');
  
  updateStudentBreadcrumb();
  loadStudentFolders(null);
}


// =============================================================
// NAVIGATE TO BREADCRUMB ITEM (student)
// Go back to a specific level in the folder tree
// ⚠️ FIX 4: Now pushes to browser history
// =============================================================
function navigateToBreadcrumb(index) {
  // Keep breadcrumbs up to and including this index
  AppState.breadcrumbs = AppState.breadcrumbs.slice(0, index + 1);
  const target = AppState.breadcrumbs[index];
  
  // ⚠️ FIX 4: Push to browser history
  history.pushState({
    page: 's-page-materials',
    area: 'student',
    folderId: target.id,
    breadcrumbs: JSON.parse(JSON.stringify(AppState.breadcrumbs))
  }, '', `#s-page-materials/folder/${target.id}`);
  
  updateStudentBreadcrumb();
  loadStudentFolders(target.id);
}


// =============================================================
// UPDATE BREADCRUMB DISPLAY (student)
// Renders the breadcrumb trail at top of materials page
// =============================================================
function updateStudentBreadcrumb() {
  const bc = document.getElementById('s-breadcrumb');
  if (!bc) return;
  const className = AppState.currentClassName || getClassName(AppState.currentUser.class);
  let html = `
    <span class="breadcrumb-item ${AppState.breadcrumbs.length === 0 ? 'active' : ''}"
          onclick="navigateToRoot()">
      🏠 ${className}
    </span>`;

  AppState.breadcrumbs.forEach((crumb, index) => {
    html += `<span class="breadcrumb-sep">›</span>`;
    const isLast = index === AppState.breadcrumbs.length - 1;
    html += `
      <span class="breadcrumb-item ${isLast ? 'active' : ''}"
            onclick="${isLast ? '' : `navigateToBreadcrumb(${index})`}">
        📁 ${crumb.name}
      </span>`;
  });

  bc.innerHTML = html;
}


// =============================================================
// BUILD FILE CARD HTML (grid card style — for recent materials)
// =============================================================
function buildFileCardHTML(fileId, file) {
  const icon = getFileIcon(file.type);
  const typeBadge = {
    'Notes':               'badge-blue',
    'Assignment':          'badge-orange',
    'DPP':                 'badge-purple',
    'Previous Year Paper': 'badge-green',
    'Syllabus':            'badge-gray',
    'Video':               'badge-red',
  }[file.type] || 'badge-gray';

  return `
    <div class="card" style="padding:18px; transition:all 0.2s;"
         onmouseenter="this.style.borderColor='var(--neon-blue)'"
         onmouseleave="this.style.borderColor='var(--border)'">
      <div style="font-size:28px; margin-bottom:10px;">${icon}</div>
      <div style="font-weight:600; font-size:var(--fs-base);
                  margin-bottom:8px; line-height:1.3;">${file.title}</div>
      <div style="margin-bottom:10px;">
        <span class="badge ${typeBadge}">${file.type}</span>
      </div>
      ${file.description ? `
        <div style="font-size:var(--fs-xs); color:var(--text-muted);
                    margin-bottom:12px; line-height:1.5; white-space:pre-line;">
          ${file.description}
        </div>` : ''}
      ${file.link ? `
        <button onclick="openMaterial('${file.link.replace(/'/g,"\\'")}','${(file.title||'').replace(/'/g,"\\'")}','${file.type||''}')"
           class="btn btn-primary btn-sm w-full"
           style="display:flex; align-items:center;
                  justify-content:center; gap:6px; border:none; cursor:pointer;">
          📂 Open File
        </button>` : `
        <div style="font-size:var(--fs-xs); color:var(--text-dim);
                    text-align:center; padding:8px;">
          Link not available yet
        </div>`}
      <div style="font-size:var(--fs-xs); color:var(--text-dim);
                  margin-top:10px; padding-top:10px;
                  border-top:1px solid var(--border);">
        📅 ${formatDate(file.createdAt)}
      </div>
    </div>`;
}


// =============================================================
// BUILD FILE ITEM HTML (list row style — for folder browser)
// isAdmin: true = shows lock/timer controls, false = student view
// Desktop: individual buttons | Mobile: three-dot menu
// =============================================================
function buildFileItemHTML(fileId, file, isAdmin = false) {
  const icon = getFileIcon(file.type);
  const typeBadge = {
    'Notes':               'badge-blue',
    'Assignment':          'badge-orange',
    'DPP':                 'badge-purple',
    'Previous Year Paper': 'badge-green',
    'Syllabus':            'badge-gray',
    'Video':               'badge-red',
    'Audio':               'badge-purple',
    'Image':               'badge-green',
  }[file.type] || 'badge-gray';

  const safeTitle = file.title.replace(/'/g, "\\'");
  const menuId    = `f3m-${fileId}`;

  // Admin action buttons (desktop)
  const adminDesktopBtns = isAdmin ? `
    <div class="file-actions-desktop">
      <button class="lock-toggle ${file.isLocked ? 'locked' : 'unlocked'}"
              onclick="toggleFileLock('${fileId}', ${file.isLocked})">
        ${file.isLocked ? '🔒 Locked' : '🔓 Public'}
      </button>
      <button class="btn btn-ghost btn-sm btn-icon"
              onclick="openSetTimerModal('${fileId}', 'material')"
              title="Set auto-unlock timer">⏰</button>
      <button class="btn btn-ghost btn-sm btn-icon"
              onclick="openMoveFileModal('${fileId}', '${safeTitle}')"
              title="Move to another folder">📂</button>
      <button class="btn btn-ghost btn-sm btn-icon"
              onclick="openRenameFileModal('${fileId}', '${safeTitle}', '${file.type}')"
              title="Edit title / type">✏️</button>
      <button class="btn btn-danger btn-sm btn-icon"
              onclick="confirmDeleteFile('${fileId}', '${safeTitle}')">🗑️</button>
    </div>` : '';

  // Admin three-dot menu (mobile)
  const adminMobileMenu = isAdmin ? `
    <div class="file-3dot-wrap">
      <button class="file-3dot-btn"
              onclick="toggleFile3dot('${menuId}', event)">⋮</button>
      <div class="file-3dot-menu" id="${menuId}">
        <div class="f3m-item"
             onclick="toggleFileLock('${fileId}', ${file.isLocked}); closeFile3dot('${menuId}')">
          ${file.isLocked ? '🔓 Unlock file' : '🔒 Lock file'}
        </div>
        <div class="f3m-item"
             onclick="openSetTimerModal('${fileId}', 'material'); closeFile3dot('${menuId}')">
          ⏰ Set timer
        </div>
        <div class="f3m-item"
             onclick="openMoveFileModal('${fileId}', '${safeTitle}'); closeFile3dot('${menuId}')">
          📂 Move file
        </div>
        <div class="f3m-item"
             onclick="openRenameFileModal('${fileId}', '${safeTitle}', '${file.type}'); closeFile3dot('${menuId}')">
          ✏️ Edit / Rename
        </div>
        <div class="f3m-divider"></div>
        <div class="f3m-item f3m-danger"
             onclick="confirmDeleteFile('${fileId}', '${safeTitle}'); closeFile3dot('${menuId}')">
          🗑️ Delete
        </div>
      </div>
    </div>` : '';

  // Student open button
  const studentBtn = !isAdmin ? `
    ${file.link ? `
      <button onclick="openMaterial('${file.link.replace(/'/g,"\\'")}','${(file.title||'').replace(/'/g,"\\'")}','${file.type||''}')"
         class="btn btn-primary btn-sm" style="border:none;cursor:pointer;">
        📂 Open
      </button>` : `
      <span style="font-size:var(--fs-xs); color:var(--text-dim);">
        Coming soon
      </span>`}` : '';

  return `
    <div class="file-item ${file.isLocked && isAdmin ? 'locked-item' : ''}">
      <div class="file-type-icon">${icon}</div>
      <div class="file-info">
        <div class="file-title">
          ${isAdmin && file.isLocked ? '🔒 ' : ''}${file.title}
        </div>
        <div class="file-meta">
          <span class="badge ${typeBadge}" style="font-size:10px;">${file.type}</span>
          <span>📅 ${formatDate(file.createdAt)}</span>
          ${file.description ? `<span title="${file.description}">📝 ${file.description.substring(0,50)}${file.description.length>50?'...':''}</span>` : ''}
          ${isAdmin && file.unlockTimer ?
            `<span class="timer-badge">⏰ ${getCountdown(file.unlockTimer)}</span>` : ''}
        </div>
      </div>
      <div class="file-actions">
        ${adminDesktopBtns}
        ${adminMobileMenu}
        ${studentBtn}
      </div>
    </div>`;
}


// =============================================================
// CHANGE STUDENT PASSWORD
// Verifies current password, updates in Firebase
// =============================================================
async function handleChangePassword() {
  const currentPass = document.getElementById('s-current-pass').value.trim();
  const newPass     = document.getElementById('s-new-pass').value.trim();
  const confirmPass = document.getElementById('s-confirm-pass').value.trim();
  const msgEl       = document.getElementById('change-pass-msg');

  // Validate
  if (!currentPass || !newPass || !confirmPass) {
    showPassMsg('Please fill in all fields.', 'error'); return;
  }
  if (currentPass !== AppState.currentUser.password) {
    showPassMsg('Current password is incorrect.', 'error'); return;
  }
  if (newPass.length < 6) {
    showPassMsg('New password must be at least 6 characters.', 'error'); return;
  }
  if (newPass !== confirmPass) {
    showPassMsg('New passwords do not match.', 'error'); return;
  }
  if (newPass === currentPass) {
    showPassMsg('New password cannot be same as current password.', 'error'); return;
  }

  try {
    // Update in Firebase
    const pwDocRef = AppState.currentUser.id || AppState.currentUser.mobile;
    await db.collection('students').doc(pwDocRef).update({
      password: newPass
    });
    // Update local session
    AppState.currentUser.password = newPass;
    saveSession({ user: AppState.currentUser, isAdmin: false });
    showPassMsg('✅ Password updated successfully!', 'success');
    // Clear fields
    ['s-current-pass', 's-new-pass', 's-confirm-pass'].forEach(id => {
      document.getElementById(id).value = '';
    });
  } catch (err) {
    showPassMsg('Update failed. Please check internet and try again.', 'error');
    console.error('Password change error:', err);
  }
}


// =============================================================
// SHOW PASSWORD CHANGE MESSAGE
// =============================================================
function showPassMsg(msg, type) {
  const el = document.getElementById('change-pass-msg');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = msg;
  el.style.cssText = type === 'success'
    ? `display:block;padding:10px 14px;background:rgba(0,255,136,0.08);
       border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius-sm);
       margin-bottom:14px;font-size:var(--fs-sm);color:var(--success);`
    : `display:block;padding:10px 14px;background:rgba(255,68,102,0.08);
       border:1px solid rgba(255,68,102,0.3);border-radius:var(--radius-sm);
       margin-bottom:14px;font-size:var(--fs-sm);color:var(--danger);`;
  // Auto hide after 4 seconds
  setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
}


// =============================================================
// ⚠️ FIX 5: EDIT PROFILE - Open modal with current data
// Checks admin permission first
// =============================================================
async function openEditProfileModal() {
  try {
    // Check if admin allows profile editing
    const settingsDoc = await db.collection('admin').doc('settings').get();
    const allowProfileEdit = settingsDoc.exists ? settingsDoc.data().allowProfileEdit !== false : true;
    
    if (!allowProfileEdit) {
      showBilingualPopup(
        '🔒 Profile Editing Disabled',
        'Profile editing is currently disabled by admin.\nPlease contact the institute office to update your details.',
        'प्रोफ़ाइल संपादन अभी एडमिन द्वारा बंद किया गया है।\nअपनी जानकारी बदलवाने के लिए संस्थान कार्यालय से संपर्क करें।',
        null
      );
      return;
    }
    
    const student = AppState.currentUser;
    
    const modalHTML = `
      <div id="modal-edit-profile" class="modal-overlay">
        <div class="modal" style="max-width:700px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h3 class="modal-title">✏️ Edit My Profile</h3>
            <button class="btn btn-ghost btn-sm" onclick="closeModal('modal-edit-profile')" style="margin-left:auto;">✕</button>
          </div>
          <div class="modal-body">
            <div class="info-box" style="margin-bottom:16px;">
              ⚠️ Cannot change: Session, Board, Class, Roll. Contact admin for these.
            </div>
            <div id="edit-profile-msg"></div>

            <div class="form-group">
              <label>Profile Photo</label>
              <div style="display:flex;align-items:center;gap:16px;">

                <!-- Photo circle — tap to view fullscreen if photo exists -->
                <div id="edit-photo-preview"
                     onclick="viewProfilePhotoFullscreen()"
                     style="width:88px;height:88px;border-radius:50%;
                            background:var(--bg-card2);border:2px solid var(--border);
                            overflow:hidden;flex-shrink:0;display:flex;
                            align-items:center;justify-content:center;font-size:36px;
                            cursor:${student.photo ? 'pointer' : 'default'};
                            transition:border-color 0.2s;position:relative;">
                  ${student.photo
                    ? '<img id="edit-photo-img" src="' + student.photo + '" style="width:100%;height:100%;object-fit:cover;">' +
                      '<div style="position:absolute;bottom:0;left:0;right:0;' +
                      'background:rgba(0,0,0,0.45);font-size:10px;' +
                      'color:#fff;text-align:center;padding:3px 0;' +
                      'border-radius:0 0 50px 50px;">👁 View</div>'
                    : '<span id="edit-photo-img" style="font-size:36px;">👤</span>'}
                </div>

                <div style="flex:1;">
                  <!-- Hidden inputs: gallery + camera (separate for Android) -->
                  <input type="file" id="edit-photo-gallery" accept="image/*"
                         onchange="previewEditPhoto(this)" style="display:none;">
                  <input type="file" id="edit-photo-camera" accept="image/*"
                         capture="user" onchange="previewEditPhoto(this)" style="display:none;">

                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                    <!-- Gallery button -->
                    <button type="button"
                            onclick="document.getElementById('edit-photo-gallery').click()"
                            class="btn btn-outline btn-sm" style="font-size:12px;">
                      🖼️ Gallery
                    </button>
                    <!-- Camera button (Android will open camera directly) -->
                    <button type="button"
                            onclick="document.getElementById('edit-photo-camera').click()"
                            class="btn btn-outline btn-sm" style="font-size:12px;">
                      📸 Camera
                    </button>
                    <!-- Remove button — only visible when photo exists -->
                    <button type="button" id="edit-photo-remove-btn"
                            onclick="removeEditPhoto()"
                            class="btn btn-ghost btn-sm"
                            style="display:${student.photo?'inline-flex':'none'};font-size:12px;color:var(--danger);">
                      🗑️ Remove
                    </button>
                  </div>
                  <div style="font-size:11px;color:var(--text-dim);">
                    JPG/PNG · Max 3MB · Tap photo to view full screen
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Full Name <span class="required">*</span></label>
              <input class="form-control" id="edit-name" value="${student.name||''}" placeholder="Full name">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Gender <span class="required">*</span></label>
                <select class="form-control" id="edit-gender">
                  <option value="">-- Select --</option>
                  <option ${student.gender==='Male'?'selected':''}>Male</option>
                  <option ${student.gender==='Female'?'selected':''}>Female</option>
                  <option ${student.gender==='Other'?'selected':''}>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Date of Birth <span class="required">*</span></label>
                <input class="form-control" id="edit-dob" type="date" value="${student.dob||''}">
              </div>
            </div>
            
            <div class="form-group">
              <label>📱 Mobile Number <span class="required">*</span></label>
              <input class="form-control" id="edit-mobile" type="tel"
                     value="${student.mobile}" maxlength="10" placeholder="10-digit number">

            </div>

            <div class="form-group">
              <label>Alt. Mobile <span class="optional">(optional)</span></label>
              <input class="form-control" id="edit-alt-mobile" type="tel" value="${student.altMobile||''}" maxlength="10" placeholder="10 digits">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Father's Name <span class="required">*</span></label>
                <input class="form-control" id="edit-father" value="${student.fatherName||student.father||''}" placeholder="Father's name">
              </div>
              <div class="form-group">
                <label>Mother's Name <span class="required">*</span></label>
                <input class="form-control" id="edit-mother" value="${student.motherName||student.mother||''}" placeholder="Mother's name">
              </div>
            </div>
            
            <div class="form-group">
              <label>Address <span class="required">*</span></label>
              <textarea class="form-control" id="edit-address" rows="3" style="resize:vertical;" placeholder="Home address">${student.address||''}</textarea>
            </div>
          </div>
          <div class="modal-footer" style="gap:10px;">
            <button class="btn btn-ghost" onclick="closeModal('modal-edit-profile')">Cancel</button>
            <button class="btn btn-primary" onclick="saveEditedProfile()">💾 Save</button>
          </div>
        </div>
      </div>`;
    
    const existing = document.getElementById('modal-edit-profile');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    window._originalPhotoURL = student.photo || null;
    window._editPhotoFile = null;
    window._editPhotoDeleted = false;
    
    openModal('modal-edit-profile');
  } catch (err) {
    console.error('Error opening edit modal:', err);
    showBilingualPopup(
        '⚠️ Error / त्रुटि',
        'Could not open edit form. Please try again.',
        'प्रोफ़ाइल फॉर्म नहीं खुल सका। कृपया दोबारा कोशिश करें।',
        null
      );
  }
}

function previewEditPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 3*1024*1024) { showToast('Photo too large! Max 3MB.', 'error'); input.value=''; return; }
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); input.value=''; return; }

  // Compress then preview
  compressPhoto(file).then(compressed => {
    window._editPhotoCompressed = compressed;
    window._editPhotoFile = file;
    window._editPhotoDeleted = false;

    const preview = document.getElementById('edit-photo-preview');
    if (preview) {
      preview.style.cursor = 'pointer';
      preview.innerHTML =
        '<img id="edit-photo-img" src="' + compressed + '" style="width:100%;height:100%;object-fit:cover;">' +
        '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.45);' +
        'font-size:10px;color:#fff;text-align:center;padding:3px 0;border-radius:0 0 50px 50px;">👁 View</div>';
    }
    const removeBtn = document.getElementById('edit-photo-remove-btn');
    if (removeBtn) removeBtn.style.display = 'inline-flex';

    // Clear both inputs so same photo can be re-selected if needed
    ['edit-photo-gallery','edit-photo-camera'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }).catch(() => showToast('Could not load image. Try again.', 'error'));
}

function removeEditPhoto() {
  const preview = document.getElementById('edit-photo-preview');
  if (preview) {
    preview.style.cursor = 'default';
    preview.innerHTML = '<span style="font-size:36px;">👤</span>';
  }
  ['edit-photo-gallery','edit-photo-camera','edit-photo-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const removeBtn = document.getElementById('edit-photo-remove-btn');
  if (removeBtn) removeBtn.style.display = 'none';
  window._editPhotoFile = null;
  window._editPhotoCompressed = null;
  window._editPhotoDeleted = true;
}

// Fullscreen photo viewer — WhatsApp DP style
function viewProfilePhotoFullscreen() {
  const img = document.getElementById('edit-photo-img');
  if (!img || img.tagName !== 'IMG') return;
  const src = img.src;

  // Size: use the smaller of 80vw or 80vh so it's always a perfect square
  const size = 'min(80vw, 80vh)';

  const overlay = document.createElement('div');
  overlay.id = 'photo-fullscreen-overlay';
  overlay.style.cssText = [
    'position:fixed','top:0;left:0;right:0;bottom:0','z-index:9999',
    'background:rgba(0,0,0,0.92)',
    'display:flex','flex-direction:column',
    'align-items:center','justify-content:center',
    'animation:fadeIn 0.2s ease'
  ].join(';');

  overlay.innerHTML =
    // Outer wrapper for close button positioning
    '<div style="position:relative;display:inline-block;">' +

      // Square container — border-radius:50% on a square = perfect circle
      '<div style="' +
        'width:' + size + ';' +
        'height:' + size + ';' +
        'border-radius:50%;' +
        'overflow:hidden;' +
        'border:3px solid var(--neon-blue);' +
        'box-shadow:0 0 40px rgba(0,212,255,0.4),0 0 80px rgba(0,212,255,0.15);' +
      '">' +
        // Image fills square perfectly — object-fit:cover crops to fit
        '<img src="' + src + '" style="' +
          'width:100%;height:100%;' +
          'object-fit:cover;' +
          'display:block;' +
        '">' +
      '</div>' +

      // Close button — top-right corner
      '<button onclick="document.getElementById(\'photo-fullscreen-overlay\').remove()" ' +
        'style="' +
          'position:absolute;top:-8px;right:-8px;' +
          'width:34px;height:34px;border-radius:50%;' +
          'background:var(--bg-card);' +
          'border:1px solid var(--border-bright);' +
          'color:var(--text-white);font-size:16px;cursor:pointer;' +
          'display:flex;align-items:center;justify-content:center;' +
          'box-shadow:0 2px 8px rgba(0,0,0,0.5);' +
        '">✕</button>' +

    '</div>' +
    '<p style="color:var(--text-dim);font-size:12px;margin-top:20px;letter-spacing:0.5px;">Tap anywhere to close</p>';

  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.tagName === 'P') overlay.remove();
  });

  document.body.appendChild(overlay);
}

async function saveEditedProfile() {
  const msgEl = document.getElementById('edit-profile-msg');
  const showMsg = (msg, type) => {
    msgEl.innerHTML = msg;
    msgEl.style.cssText = 'display:block;padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;font-size:var(--fs-sm);' +
      (type==='success' ? 'background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);color:var(--success);' :
       type==='loading' ? 'background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);color:var(--neon-blue);' :
       'background:rgba(255,68,102,0.08);border:1px solid rgba(255,68,102,0.3);color:var(--danger);');
  };
  
  const name = document.getElementById('edit-name').value.trim();
  const gender = document.getElementById('edit-gender').value;
  const dob = document.getElementById('edit-dob').value;
  const mobile = document.getElementById('edit-mobile').value.trim();
  const altMobile = document.getElementById('edit-alt-mobile').value.trim();
  const fatherName = document.getElementById('edit-father').value.trim();
  const motherName = document.getElementById('edit-mother').value.trim();
  const address = document.getElementById('edit-address').value.trim();

  if (!name || !gender || !dob || !mobile || !fatherName || !motherName || !address) {
    showMsg('⚠️ Please fill all required fields.', 'error'); return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    showMsg('⚠️ Mobile number must be exactly 10 digits.', 'error'); return;
  }
  if (altMobile && !/^\d{10}$/.test(altMobile)) {
    showMsg('⚠️ Alt mobile must be 10 digits.', 'error'); return;
  }
  
  try {
    showMsg('⏳ Saving...', 'loading');
    
    let photoURL = AppState.currentUser.photo || null;
    if (window._editPhotoDeleted) photoURL = null;
    if (window._editPhotoFile) {
      // Use already-compressed version if available, else compress now
      photoURL = window._editPhotoCompressed ||
        await new Promise(res => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.readAsDataURL(window._editPhotoFile);
        });
      window._editPhotoCompressed = null; // clear after use
    }
    
    // Save both normalized (fatherName/motherName) and legacy (father/mother) keys for consistency
    const updateData = { name, gender, dob,
      mobile,
      altMobile: altMobile||null,
      fatherName, motherName,
      father: fatherName, mother: motherName,
      address, photo: photoURL };
    // Use .id (the Firestore doc ID = studentId) not .mobile (which is just a field)
    const docRef = AppState.currentUser.id || AppState.currentUser.mobile;
    await db.collection('students').doc(docRef).update(updateData);
    
    // ── Save edit notification for admin ──────────────────────
    try {
      const _student  = AppState.currentUser;
      const _prevData = {
        name:       _student.name,
        gender:     _student.gender,
        dob:        _student.dob,
        mobile:     _student.mobile,
        altMobile:  _student.altMobile,
        fatherName: _student.fatherName || _student.father,
        motherName: _student.motherName || _student.mother,
        address:    _student.address,
        photo:      _student.photo
      };
      // Detect which fields changed
      const _fieldLabels = {
        name:'Name', gender:'Gender', dob:'Date of Birth',
        mobile:'Mobile', altMobile:'Alt Mobile',
        fatherName:"Father's Name", motherName:"Mother's Name",
        address:'Address', photo:'Photo'
      };
      const _changed = Object.keys(_fieldLabels).filter(k => {
        const prev = String(_prevData[k]||'').trim();
        const next = String(k==='photo' ? (photoURL||'') : (updateData[k]||'')).trim();
        // For photo, just check if it changed (don't store full base64)
        if (k === 'photo') return (prev !== next);
        return prev !== next;
      }).map(k => _fieldLabels[k]);

      if (_changed.length > 0) {
        // Extract class from student ID (e.g. 2627-BSEB-10-001 → 10)
        const _sid   = _student.id || _student.mobile || 'unknown';
        const _parts = _sid.split('-');
        const _class = _parts.length >= 3 ? _parts[2] : 'unknown';
        await db.collection('adminNotifications').add({
          studentId:     _sid,
          studentName:   _student.name || 'Unknown',
          studentClass:  _class,
          changedFields: _changed,
          editedAt:      firebase.firestore.FieldValue.serverTimestamp(),
          read:          false
        });
        // Auto-cleanup: keep only latest 100 notifications (no orderBy — no index needed)
        const _allNotifs = await db.collection('adminNotifications').get();
        if (_allNotifs.size > 100) {
          // Sort client-side by editedAt, delete oldest
          const _sorted = _allNotifs.docs.sort((a, b) => {
            const ta = a.data().editedAt?.toDate ? a.data().editedAt.toDate() : new Date(0);
            const tb = b.data().editedAt?.toDate ? b.data().editedAt.toDate() : new Date(0);
            return tb - ta; // newest first
          });
          const _toDelete = _sorted.slice(100); // keep first 100, delete rest
          const _batch = db.batch();
          _toDelete.forEach(d => _batch.delete(d.ref));
          await _batch.commit();
        }
      }
    } catch(_ne) { /* notification save failed silently — don't block profile save */ }
    // ───────────────────────────────────────────────────────

    Object.assign(AppState.currentUser, updateData);
    // If mobile changed, update AppState so sidebar/session reflects new number
    if (updateData.mobile) AppState.currentUser.mobile = updateData.mobile;
    saveSession({ user: AppState.currentUser, isAdmin: false });
    
    showMsg('✅ Profile updated!', 'success');
    setTimeout(() => {
      closeModal('modal-edit-profile');
      // Update sidebar name and photo without rebuilding whole dashboard
      const sidebarName = document.querySelector('.sidebar-user-name');
      if (sidebarName) sidebarName.textContent = updateData.name;
      const sidebarPhoto = document.getElementById('s-sidebar-photo');
      const sidebarEmoji = document.getElementById('s-sidebar-emoji');
      if (sidebarPhoto && sidebarEmoji) {
        if (updateData.photo) {
          sidebarPhoto.src = updateData.photo;
          sidebarPhoto.style.display = 'block';
          sidebarEmoji.style.display = 'none';
        } else {
          sidebarPhoto.style.display = 'none';
          sidebarEmoji.style.display = 'flex';
        }
      }
      // Reload just the profile page content
      reloadStudentProfilePage();
    }, 1000);
  } catch (err) {
    console.error('Update error:', err);
    showMsg('❌ Update failed. Try again.', 'error');
  }
}


// =============================================================
// RELOAD STUDENT PROFILE PAGE (in-place, no full rebuild)
// Rebuilds only the profile details card with latest AppState data
// =============================================================
function reloadStudentProfilePage() {
  const student = AppState.currentUser;
  const className = getClassName(student.class);
  const profilePage = document.getElementById('s-page-profile');
  if (!profilePage) { showStudentPage('s-page-profile'); return; }

  // Find the profile details card (first card inside grid-2col)
  const detailsCard = profilePage.querySelector('.card');
  if (!detailsCard) { showStudentPage('s-page-profile'); return; }

  // Build photo HTML
  const photoHTML = student.photo
    ? `<img id="edit-photo-img" src="${student.photo}"
            onclick="viewProfilePhotoFullscreen()"
            style="width:80px;height:80px;border-radius:50%;object-fit:cover;
                   border:2px solid var(--neon-blue);box-shadow:0 0 10px #00d4ff33;
                   cursor:pointer;display:block;" title="Tap to view full screen">
       <div onclick="viewProfilePhotoFullscreen()"
            style="font-size:10px;color:var(--neon-blue);text-align:center;
                   margin-top:4px;cursor:pointer;letter-spacing:0.5px;">👁 View</div>`
    : `<div style="width:72px;height:72px;border-radius:50%;background:var(--bg-card2);
                   border:2px solid var(--border);display:flex;align-items:center;
                   justify-content:center;font-size:30px;">👤</div>`;

  // Build detail rows
  const fields = [
    { icon:'📅', label:'Session',        val: student.session || '—' },
    { icon:'📋', label:'Board',          val: student.board || 'BSEB' },
    { icon:'🎓', label:'Class',          val: className },
    { icon:'🔢', label:'Roll Number',    val: student.roll || '—' },
    { icon:'👤', label:'Full Name',      val: student.name },
    { icon:'⚧',  label:'Gender',         val: student.gender || '—' },
    { icon:'🎂', label:'Date of Birth',  val: formatDOB(student.dob) },
    { icon:'📱', label:'Mobile Number',  val: student.mobile || '—' },
    { icon:'📱', label:'Alt. Mobile',    val: student.altMobile || 'Not provided' },
    { icon:'👨', label:"Father's Name",  val: student.fatherName || student.father || '—' },
    { icon:'👩', label:"Mother's Name",  val: student.motherName || student.mother || '—' },
    { icon:'📍', label:'Address',        val: student.address || '—' },
  ];

  const rowsHTML = fields.map(item => `
    <div style="display:flex;gap:12px;align-items:flex-start;
                padding-bottom:14px;border-bottom:1px solid var(--border);">
      <span style="font-size:18px;flex-shrink:0;">${item.icon}</span>
      <div>
        <div style="font-size:var(--fs-xs);color:var(--text-dim);
                    text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">${item.label}</div>
        <div style="font-size:var(--fs-base);color:var(--text-white);font-weight:500;">${item.val}</div>
      </div>
    </div>`).join('');

  // Rebuild the card innerHTML
  detailsCard.innerHTML = `
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>📋 My <span>Details</span></span>
      <button class="btn btn-outline btn-sm" onclick="openEditProfileModal()" id="edit-profile-btn">
        ✏️ Edit Profile
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;
                padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="flex-shrink:0;">${photoHTML}</div>
      <div>
        <div style="font-size:var(--fs-md);font-weight:700;color:var(--text-white);">${student.name}</div>
        <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:2px;">${className} &nbsp;·&nbsp; Roll ${student.roll || '—'}</div>
        <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:2px;">${student.session || '—'}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">${rowsHTML}</div>`;

  showStudentPage('s-page-profile');
}


// =============================================================
// CONFIRM LOGOUT
// Shows confirmation before logging out
// =============================================================
function confirmLogout() {
  openModal('modal-logout-confirm');
}


// =============================================================
// PLACEHOLDER for admin functions (defined in Part 4 & 5)
// These are called from student view file items when admin
// is browsing — they do nothing if Part 4/5 not loaded yet
// =============================================================
function toggleFileLock_stub(id, locked) {
  console.log('toggleFileLock — Part 5 needed');
}
function openSetTimerModal_stub(id, type) {
  console.log('openSetTimerModal — Part 5 needed');
}
function confirmDeleteFile_stub(id, name) {
  console.log('confirmDeleteFile — Part 5 needed');
}

console.log('✅ PART 3: Student Dashboard loaded');


// =====================================================
// PART 4 — ADMIN DASHBOARD
// =====================================================
// Contains:
//   [1] Admin dashboard HTML (sidebar + all pages)
//   [2] Admin home (stats + quick actions)
//   [3] Student management (approve/reject/add/remove)
//   [4] Notice board management (add/edit/delete)
//   [5] Class management (add/rename/delete classes)
//   [6] Settings page (change admin credentials)
//   [7] All admin-side logic and data loading
// =====================================================
// PERMISSIONS (Admin):
//   ✅ See ALL students (pending, active, inactive)
//   ✅ Approve / Reject new registrations
//   ✅ Add students manually
//   ✅ Activate / Deactivate / Delete students
//   ✅ Add / Remove / Rename classes (with warning)
//   ✅ Post / Edit / Delete notices
//   ✅ See all materials (locked + unlocked)
//   ✅ Change admin credentials
//   ✅ Full access to everything
// =====================================================

// =============================================================
// BUILD ADMIN DASHBOARD HTML
// Called once when admin logs in successfully
// =============================================================
function buildAdminDashboardHTML() {
  const existing = document.getElementById('dashboard-area');
  if (existing) existing.remove();
  const existingAdmin = document.getElementById('admin-dashboard-area');
  if (existingAdmin) existingAdmin.remove();

  document.body.insertAdjacentHTML('beforeend', `

  <!-- =====================================================
       ADMIN DASHBOARD AREA
       ID: dashboard-area
       Contains sidebar + all admin pages
       ===================================================== -->
  <div id="admin-dashboard-area" style="display:none; max-width:100%; overflow-x:hidden;">
  <div class="app-layout">

    <!-- ── ADMIN SIDEBAR ── -->
    <aside class="sidebar" id="admin-sidebar">

      <!-- Brand -->
      <div class="sidebar-brand">
        <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4QAqRXhpZgAASUkqAAgAAAABADEBAgAHAAAAGgAAAAAAAABHb29nbGUAAP/bAIQAAwICCAgICAgICAgICAgICAgICAgICAgICAoICAgICAgICAgICAgICAgICAgICggICAgKCQkICAsNCggNCAgKCAEDBAQGBQUJBgYJCAgIBggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI/8AAEQgA3AEmAwERAAIRAQMRAf/EAB0AAQEAAQUBAQAAAAAAAAAAAAAIBwECBQYJBAP/xABJEAACAgEEAQMDAQUGAwMHDQABAgMEBQAGERITBwghFCIxCRUjMkFRJDdhcXW0M0KBFhmRNFJWlbHU4RcYJVNXYmWCkpTB09b/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/EAC8RAQACAQEFBQgCAwAAAAAAAAABEQIhAxIxQVETYXGBwWJykaGxstHwUvEEIjL/2gAMAwEAAhEDEQA/APVPQNA0DQNA0DQNA0DQNA0DQNBxO7NvJcq2akg5jtV5q8gBKkpNG0bgMPlftY/I+R+dBJP6WOfZNuT4ebgWsBlcjjbCj7fu+pez2AbiXoZJ5UDSxRMSjL1+w6CzNBodBEPoF/ehvj/T8R/s8foLf0DQNB+ViwFBJPAAJJ/oAOSf+g0EuexL10ym40zuTtyRvinzE0GCVYBDIlWHsD2bxo0qsrQ8NLzKJhZB6KY0UKo0DQNA0DQNA0DQNA0DQNA0DQNA0DQNA0DQNA0DQS/7+tmZmTEw5TBWrUeQwVtMmtOB5vHkY4yPNXmhikjMwRAZRGfJ5I1nhCE2OyhlT25+uVbcWGoZetwotRDzQhi5rWEPSzWZiqM3hmDKshRPJH0kACyLoMmaBoNsn4OghL25E4j1I3fh+njr5itDnq7O7qJJS8bWPEsqFpzLNetsTFKY4vppVC/aywBam9d5VsdTs37kniq04JLFiXq7+OKFC8jdI1eRyFB4VFZmPwASQNA2TvOtkada/Tk81W5BHYry9XTvHKodGKSKroSCOVdVZT8EAgjQR36Bf3ob4/0/Ef7PH6C39Bjze/rvj8fk8TiLLyi5mWsrSCRM8ZNWMSSeWQfEfPZVX4bliOeo5YBkJW0E2fqH+rRxG1MlJGR9VdRcZUTlQ0kl4+F/Gp5Mjx1jPMEVXJ8fyAvZlDuntJ9Iv2FtzEYwoqSwU43tKpLD6qxzYtkMxYsPqJZADyB1A6hFCoAzBoGg636h77rY2jbv23MdanBLYnYDkhIkLkKOR2duOqryOzFR/MaDhfQj1ciz2Jp5eCvaqw3UeSKG4ixzhFlkiVyqO6mOUJ5YnViHheNvjtwA79oGgaBoGgaBoGgaBoGgaBoGgaBoGgaBoPzmj5HB+Qf6jn/4f+Og8+9hudh74fFMFh21u9/PjfuJSnkYwiSQjtJzGrySLC32EMtjHgMoglCh6Dg6Dqnqv6jw4fG3cpZSeSCjXkszJWjEszJGOzCNCyKTx/N3RFHLMyKrMA/X009Q6uWx9PJU3L1rsEdiEsAG6uOSjqCQskbco68nq6sOTxoJE93NhsRvfZObVQsFySxgrsiqV5FkqtZJXRZHcd7DzRx9AO1d+WQOWUKh9wu31tYHM1njaYTYu+niTuWkJqy9UUR8OWLAABPkngD86DD/AOmfuaS1sjBvLIJJI47db4CAolW9agrxsEAAKVo4Ryw7MOGYsWLEOg+gX96G+P8AT8R/s8foLf0EI+o2Mlv+ruCRW7QYjb09yaKRm6I0xyUHkgjPKGZpLVAswCkrCOWPhQaC7eNBB3u1sHOb62htkrI9SkW3BfKfdHzB52rpOArqi81PCxlUdhejRXjMvJC8A3xzoNedAJ0EHe7+9LuvcWP2NUDGjWeDLblsxyACOBD2ipMOylZJFaFxwzN3sV5AhWGQ6C4tv4SKtBDWrxJDBXijgghjXrHFFEojijRR8KqIqqAPwANByGgaBoGgaBoGgaBoGgaBoGgaBoGgaBoGgaDBvvE9t0O6cJZxrlI7I6z0LDIrmCxEeVIJIKpMvavIQR+7kY/kLoOrew73KSZ/ENFfV4c5iXFLL1plaKdZF7CKxJC4WSM2FQ9w6rxPHYXj7ByFHZjGpNFJDKoeOVGjkQ/hkkUo6n/AqSP5aCLv08b0+ItZ7Zd2SVpMLca1jGmAPkxtsgxFJAqB+rlZWHReslhlUkRlIg539VDYklrak1yu0kdvDW6mVrywukUkZicwSMsp4dPHHO06+F0kMsEXBbjqwUpsndyZTG1LsJBjv0oLMbdWA62oElU9XCuAA/4ZQePyP5aCVf0oZhFt23jvlnxWcyVGWT8JK6mOXvGOe3UrIBw3BB5/z0Hz+gX96G+P9PxH+zx+gt/QRD6IW/r/AFP3bZYGVcXjKGOrzIrBIRKsEs0DleEaRrCWOPJy3EThfhDwFuORwefgcfJ0EI+wKym4M9uzeJPkinurh8YzDkx1qscUjFPJGkkYnhNKQx9IyGMncSMSQFAe8b3CLtnb97JjxmyqivQjkZeJbc5KQDozo0qxAPZlijPdoIJiOvUsA7v6G3cjJh8bJl/F+0pKkUlwQp44xI69yoQMwDKpVX6nqXDFQgIUBwPuf9fqu2cNbytkoWiQx1IHfobdt1Y16q8BmPdlLOVVjHCkshHWNiAxN+nn6F2cbi5MtljNJntwuMhkpLA4mRWLNWrshSNoikcnkkhK/upZGjAURqqhWGgaDpPrP6vUsDjLWVvv0r1Iy5ClfJK34jghV2RXmmfiONCygsfkqASA+n0n9REy2Np5KOvZqpchWdILcfisRq3PAkTlgOwHZWDFXRlYEhhoO26BoGgaBoGgaBoGgaBoMLe6jae4rNGF9s34qWQqWUteGdFMGQjjVg1KVyrmMSFgR8BHICs8QIljDHPtc988OVsnB5qBsNueDiOfHTKyR2XSJZHlpu3ZR3U+Va0kjSeMho2sorSKFXaDXQcJvPKTQVbM1au1uxFXmkgqrIsTWZUjZo66ySfu4zM4EYd/tUsCdBif2oe6KruijJYSGSldqTGrkcbOeZ6U6D7g3YJI0TnkJK8cRLRyIVV4pFAZwPyPjQQP7rcLLs7ctLe9IMMXfkix26ayF2DrJ+6hvCPq47RqqN+7MRM8Ea/P1tkkLrwOehtQw2K8iTQWIo54JoyGjlilQPHLGw+GR0YMpH5BB0ER++iq23twbe3vCHFevKMTnBEzAvTs9xFI8Y7LKsXkmboULNKlUBlKRtGFZ+qWyYsvib9BiTFkKFisGUqCBYgZEdTIjqrr2V0ZkbowVuOQBoJ7/S29QPrtnUoz8S4yezjZl6OvRoZBPGD3JLMa1iAsVIUMWUKOpUB1X9Ohnr5jf+NPMUVbcs1iCqwAeNLMtxVmHcedo54IKvR3ZlZUVl/jcuH0egX96G+P9PxH+zx+gtuXQRP+ntH9TmN+ZST4nsbikosq8CHx48ziJkUl3EjCdvITIyn7eoX55DK3v39ZhgtrZS2JfHYnhNCkQVDmxcVolMQZ07PDF5bPC9iqwM3RwrKQ5r2cekn7C21iccy9ZY6qTWR93xYtE2LA+89gFlkZAOF/h/hU/boJ39c4huzfmJ2+gM2K20py+aU8iBrLqrVK7noySOC0KmIkdoZrg5BifqF5AfGg8/t3uN873GMDiTbm0DDbueMxPFcyhc+OFzy5kj+2WBl6gAVbq9gZoyQvTOZ2GrBLZsyxwQQRvLNNK6xxRRxqWeSR3IVEVQSWYgADQMDnoLUMVmtLHPXnjWWGaF1kiljcBkkjdSVZWUghgSCNB+9y8kal5GCIqszuxCoiqCzMzHgKqqCSSQAAdB56Y7G2PUvP+eUFNk7fuc1o3jUjOXIvtdi3Lq9Unv2YMQKrJGEWSzM0Aeh1auEVVUBVUBVVQAFA+AABwAAPgAAAD+mg/XQNA0DQNA0DQNA0DQNBtK6DB/ui9pOO3PVCTdqmRr/vMdla462qMylGjcFWQyxdkTvCzjlRyjwSLFLGE67D912Y2fbgwW+EMlFi0GM3TF3kisLDHGIkvJ1eUykciWd28ySkGRJo2e2oXjjMiksaSRyJIjgMkkbK6Op/DI6kqykfgg/Og+oroIY91ft+u4TKR732tWLXa7Mc5iYXeOLLVm580ohhXmSxwxklB7gvHFYWKSWF/MFT+hHrXS3Bi6uUoODDYQFoyyNJWlAHlrThCwWaJjwVJ+R1Ycqykhyvqn6a1MxQtYy9EJqlyFoZkIB454ZJE5/hlhkVJonH3RyojggroJG/T839bxVvI7EzMjtcwzSTYmxKHUX8YZAFaLuXASLsjxxiV+sMpiUAUZSAqD3DekEWewuRxMvQfWVnjid17CKcffWm4+PmGdY5BwR/D+fnQYR/TX9W3v7eXG21WLI7cmbCW4u6swFQdK0nXyO6qYl+n7HhXlrT9AFUKgdP9mML4veO+sHJ28UtuDN1i3U8i73kmIk6RvID54EAVWSNoZV7MeWcP09ALwq+p29KTAs97H43Ixuv8CR14qsTo/PB8he7H16hl6o3JU8DQPQL+9DfH+n4j/Z4/QWfnsj4YZZevbxRSS9eeO3jUv154PHPHHPB4/odBFf6PW1GrbQExdXF/KXraqAQYlRK9DoxP8RLUjJyOB1kUflTyHz++WL9ubo2ftVY0mhFts5k0eMyKter2WMSjrJF4ZkS5CyzRFXd4U7oHfkKu9dvVivgsRfy9n5jo13m6dgpmkJEcEAY8gNPO8UCkg8GQfGgnv8ATR9IpKmImzl0H9p7pnbL2SWdgIpnllqKvZn4EiTvZ7MzO31ADM/jXqHdffP7jX2/h2+jKPmMlImPxNcnmSSewwRplQHkiujFwx4j8xgRj+9UMHM+zr27ptrB1qD9HvPzaydlfuNi3MS8pMpVHkSHkQRs6hjHGCRyzchgT3p72sbjzFHYOKnkRbJ+p3Hcrq0gpVI18sdaVkPWNpgvLJMVVnkpx/d5ypCz9j7QrY6lVoVI/DVp14q1ePkkpHCgROWYlnbqAWdiWdiWJJJJCJvdj6g3N25b/sLg5JErRsjboysUayQ1IhxKtIPyoLs6ASIkiM8oEHysdxFCzvTH00p4elXx2PgStUqxiOKNB/1eR25LSSysS8krkvI7MxJJJIdoaYAgEjk/gc/J+Ofgfz+AT/loN+gaBoGgaBoGgaBoGgaBoGg6x6i+m9HLU56GRrR26dlOk0EnPDDkMpVlKvHIjAPHLG6SRuFZGVgCAhaz6ebi9OZWs4YT53Z/k8lrEuWlyGM8szNNNTCoC0USBD3DlHaSVpoY+GtALK9BvX7G7jx8WRxk3khkUd4n6pZqvywaC1CGbxSqysOQzRyAd43lQq7BkR0B+D+NB54eqmwrXpxmJdyYOo9ja18qudxELEDHu8g/ttKLlY40B/4atzHEXlg5rxTV2rBfe1N017teG3UmjsVrEaywTxMGjlRxyrKQT8H+h+QeQQCCAEi/qHekNpYae78OIo8ztljbeR/IBYx8SyyWa7KhAkVOzMys0faB7QEillDBR/oh6xVc9iqWVpnmC3Cr9D/FDIBxPXk4+PJBKGibgkEqSCV4JCTM/ZXanqTDMTFDi97VvDKCOqpkqpRVk7dD900kkS8K4DyZB2kUdUcB+nro8uJ9Ttr5TukVLNY+bCWS35kmU2Gijd5IzHEZJp8b4hDIskrwSKQocmYOSasK/q6phHQ3tpdrX/N5ilkop+/t04WnWH7rpz4vnnvJ3DT0C/vQ3x/p+I/2eP0FAe7/AHF9JtbcM4keJ0w99Y5IiyyJLLWkihZGQhlIldD3BBX88jjQdX9hG2vpNnbfQpGhfHR2T04CkW3e0HbgAd2SZWkJHPftyTxyQwl7Jj+3d27v3WyhoYrAwWLk7o6+Gt18zIE6kF4oacvZo/hbLossvEx0G/3x5Z9w7hwOxIlmFaw8eXzksQBC1IGlKQMwcGIt4XJd+oWSakU8rP4yFxVaccESJGqRRRRqiKOFjjSNeqqPwFRFAA/AAH8vnQQb6AIm+t3Wt2SATYLAOcZgYZVcd7SJHPJfaB+UVx5vOjuqSr2o8qr1FKhS/u09x9XauGnyU5DzHmCjXJYG1adHaKLkK/RAEaSRyOFRCPyygh0T2F+3SfD417+V7y7gzTm7lbE5R50Mh7RVPIo56xpw7p2YCd5OOFVFQPk98fufs4mKvhMCps7ozJEWOrxJHM9aMt1kuSozhYx1EnhknUwhopZH5jrT6DvHtB9qlPauM+kiIsXbDCbJXyP3lyf54+WLMsEPZkhj5+OXkI8k0zMGdxoNOmg3aBoNGOgmjO+/rCjOU9v48WMvkLFtK1gY+MywUVZQzzyzt1ilSBW7zfTvIIkWXsyvEYyFMaBoGgj7179bd47dyVvINia2b2vzF0SgzplKCdYUlllUq3lAk8rlRHIhXxkzVFV+oZg9v/utwe5K6S4u7G8xjEktGRljvVuQO6zVixb923KmWPyQsRykjgqSGX0fnQbtA0H5zTBQSfwASf5/gc/gfJ/yGgxP6Ce6nCbljlfFWvLJAzCerKvhtwgSNGskldj3EUnXsjjkcEBur8oAy1zyNBEnrZ7H7ePvNuLY9gYzKgrJZxPfxYnKrH3eSF4R1jSSfkKI2ZK/cB1NSTmwA717VvfDTzr/ALNyEMmG3HCFSxiLqvXllcQ+Z5Kcc3Err0DSmBwJooxywdAsrBR+4NvwW4Ja9mKOevPG0U0EyCSOWNwVdJEYFXVgSCpBGg89tu5K16ZZpKE4axsnOXgKVtpTzg7M5J8UryycCCNV7zFyplro1lHeWCzDKHopFYWRQVIZGUMGBDI6sOQQQeGVgeQRyCP89B5+ejMh2HvObbknf/s/uiY3cPMyCKtSuyGRDSVz9ju4SGn0VvJwccSiiYkhmr9RX0WfN7ZtGv5vrsUy5aiYFLTGWokneOPoVctJA8oVYz28qxMqu0aqQn33U+pwzmxtv7yr9TawuSxeRnCAApYSdKlysrMSIU+tMLq/il5CRHx8OSoc97lfVLHw709Pc5JcqrjZ62RH1P1EXiiFmoojmlkdkjjgP18DeVmX7Q56jqAwcb6Jeu2Dh9Rt43pczioqVqji0q3JMjTSrZaOpRWRYLDTCGZo2R1YRuxUqwPHB4DKP6n/AKmwRbLySw3IVkuPTqxBJI3M4lsxvNEgBbntWjnckfhEYgjjQdx9xm+xtfYtmSJPp5KeJrUKsSN1aGadIaMIjIkRua7SeUmNyypC7Lz1HIa+z7akG2NlY43O1ZYMc2VyBnBjkhawrXbCSo6oUeAP4PGyqy+IKezAswYw/TZ2pYyBze88hE6W9xXX+kWV1kMOPrsUhjRhFE3UOBXDlV8kdKBwiBuXDl/1EfWC6kFDauF8hzW5ZTXR42KipURl+pmkZO0sYkQspdIyFrJdkLIYUEgUZ6M+lVLb+IqYqr9talCVMj8BpG5L2LEvHx3llZ5H/kC3H4A0Eb+laNv/AHac/IvO2trzS1sKjojR5C4Qhktssh7KoZYbSnxpwEpoSGjmACrfc57iqW2MRYylv94Y+sdaqJESW5O5Cxwx9yD9vJllZVdo4I5ZOr9OpDCfsa9vN3vPu/cil9xZoB1imhWM4mqOyQ14Y+zGJ5oBF2VussMQjhYK4smULFd+NBIfu7958tOaLbu2Ylym57zmBY4Sk0eKBHDWLgHdFmTnuIZ+kcMYexOyRoiWAzl7cvTrIYrD0qWUyUuWvQq5sXpmkd5GkkeURiSVnllWAOIVllbvIsYYrH2EaBk3QY59afX7EYCsbWWuw1EKu0Ubuv1FkxAF0qwc+Sdx2UcICFLp2KhgdBHAy+7vUQ8VfLtTaTk8Wj2OVy8PdmR4uPEUhkWOPlUaOFBMw8uSVegCv/Qv25YnbdMU8TVWBOe0srfvLNh/jl7E7DvIfj4X4RBwERAANBk7QNA0G0oP6aCX/cH+nzhM1K9+ssmGzQXtBlca7QOsy9jHLNBG6RzMGb75U8Vh0AXzr1j6BiOL3Dby2Wgj3TjW3BiIuwXPYnhrUaBpCDegcRryqBR5JlrIPgGxZYsSFdeivuAxG4av1mIux24g3SQAPHNC4/KTQSqk0R/mC6BXX7lZ1IYhkNW0AjQSL7nfY4160c9tu22E3JFwyzwN4auQ6yLJ478aRsHZigBkZXSVQEnisKEMQb/bD75VyFk4LcMAwu54JHilpShoq9soQBJSkkZ1YyAlkhE0nkVTJE86HlQrbkHQYA90fs3xu54Q0vallK4JoZWr9lmtJ9pQydWQ2IQUXmN3DKvbxvAx7AMGenfu+yu170W39/FVSUy/svcqKPpr0SSIka2kgQiJ0DAPMwR4g8JsIAxtShX/AKn+m2PzdCahehjtU7UYDLz/APmjlikUgrJG3WSOSNgVIBB+dBF/tp9W72y8hHsvdE8X0JWV9u5t5AkM0CszirO0jHwleTHGkrAwSAV1M0T1HIdA9+PuVxu7K0GE2zVu5zLV8jFNDeo17SRY9oW8bzw2FCeTyl1hEhBqhSZ/KDFXZg7f6YYz1T3FUqNPk6u2qsYaCZ2oEZay9dViM8teaHrzLPCXBhnpROk0jBXQRR6Dkdl/o3YaCMR2svmbMfkjlkrwywVKkxQozLLEIZZGDlAO6TRuqheGBVWAZLx/6VmyE57YiSbnj/iZLJArx/5vitxfnn57dvwOONBM3pD7JdsWt97qws+M8mNxtTHS0q31uRXwvYrU5Jm8yW1sSd3lduJZZAvbgAADgM+7k/SN2dOjrFWvUmcgiWtfld4h27FEFwWoypH7s+RJG6nnt2+7QY79UP0pshNWFbHbuyklaMtJFjsy8luizIyyV0dI5BAqrJ3MjmjMGLAiL4YOHQveDL6mjBT4fIY2nkaUggWbK4SOR7EkUDD7JKsLpJH5miSWZkopAI5GQdF7LGFR+3n3tbNkxa1qGQ+ihw2PhD08ir17cFetAF4/eFltyRBPHJ9NLOfJx/8AWxGQOkewnbsudyWU39kDIXyUk9HBwSEkU8dBM0R4Us6rI8kXiIj6qJEtuO31T9Q5D39+rdu1YobGwblMtuDr9ZMAyiljeZTPJ5A8YDSJBMZEXyMakU69A1iuWCjNi7Ox21sHDVWRa+OxNQmSeZo05VAZLFiZlCR+WaQvK5CqGeQ8Ac8AJC9CNo2t/Z6Pd2WryQYDGM8e2sZYjhb6lv4ZLtj+oSVEn4XspsLFGsrpTf6gPQftwPnQRv7rPdZee8u0tpr9VuK0vFmyCv02FhIBlnnk4ZVnRGB4IYRBkPWSWSGJwyX7UfZtjdrwM8YNvLWYx+0crOXee3IztLJ0Du/ghMjc9E4aTrG0rzugcBnySYAHk8cfnn44/nzz/T/4/wBDoI09af1AS118Bs+k24c796yPGQMbR6go8k1gskcphlaJW4kirAyBWtLIDEQ/b0T9gf8Aakzm77X/AGhzx6uPMe2NpFQyqtesY4opeFKn95XWNJFDxxI6iQhY0MIAAAAAHAAHAAHwAAPwAPgf0Gg/TQNA0DQNA0H5NXB/P8/z/jz+ef6g6CQ/Vn9OPGSz/tDblifa2XXgpZxfaOo4DKximpRyQosb9OCIGiTnguk4XxsHS8N7xNx7UnFHfOOeegvCw7nxcDyV5OfGENyJEVFdizKxRK8gdQFrThvKQsb0x9Wsbmawt4u9WvQchWkrSq/jfqG8cyA94ZQrKxilVHCsp4+RoO2sOdBg33Ue0vG7ppNXtKILkaH6DJxRq1mjJ3WQFflPLCzKBJXLp3Qt0eFyksYT16ee6XM7QuwYDe4aajI8kWL3Z25isJGqGJLygMwfqSskzyGaN+vkWwha4AvKleSREkjdZI5FV0dGDI6uAyujKSrKykEMCQQQRoOtepnpdj8xTmoZKtHbqzr1eKTkcfgh43UrJFIpAZZYmR0YAggjQea2S9QMr6ZZSPA4udd042/5ZaWCaRv2pjJppC8USxwJYlZJlPcCOIR2ZDNIIKrP3sBlTDeyPMbstV8vvy3+5iEzU9uUgIo6aztGTHNbhbv8rEnkWMvM7KnNlPEY2C3djendHG10q4+pXpVk/hgrRJDHz+SxVAOWY8szNyzMSSSSxIdiVeNBu0Gh0EQ+gX96G+P9PxH+zx+gt/QNBtKaDAvuJ9ku3tyRt9fSWO2RwmRqBILyEc8cyBCs6jsf3dlJk+SQFbqwCaf/AJSd0enCCvlKz7j2rAiwUchVRIrmNiij8deC4oQRpGXMUAkncpwOUmLEVyHcP02vT424bu88hYgu5jcErlniKvHj60LeNaUZYNLDJzGqyRGVwsEFJPzG7SB031szlj1Gz0m18bakr7bwrxTZ3IVXjcXp+xMNWFg5VkDRyrEziWMTxSWGhl+lrhwv/b+3oKcEVapDHBXgjWKGCJFjjiRBwqIigBQo+OANBHPr57qcnlcudp7M6PfQsMzmivkq4eP5SSONvlGtxsR3f7hFKogRXmMpqhmb2o+1Gltak0MTNayFpvNksnMP7RdmPLHlmLOkCOzeOHu3BZnZnkkldg5/1/8AcziNs1DaytpIeyua9ZSHuXGQD7K1fsHk+5kVpD1iiLoZJI1POgkWTbG6fUbh7ptbW2k/Yx1IyUyeWj4bxyTBlH7iRWjbpKprHhWSOyQkoC0PR30JxOBqiniaUVOHns/TlpZW4C955nLSzPwqjs7t8AfgfGg7zYmYFAFLBm4Ygj7B1Y9iCQWBYKnC8nlwfwGID9gdBroGgaBoGgaBoGg+XIY1JVaOREkjdSjxuodHVhwyurAqykEgggjgkfzOgjH1M/TpWtbbMbMyL7ayvRv7PH92JsN95Cy12SURI/YKyCOeuoVWWqGDFw4jC+//ACW37MeP37iWxrSF1r5rHBrOOtBCeZDDGZZUUoUY+EzS8yDvVr/d1C19tburXYY7NSeG1XlAaOevIk0UgP4KSRllYf5HQcb6memFDMU5sfkq0VqpOpV4pF54JBUSRuOHimTklJo2WSNuCrKRzoISv4/PemlgyVUsZzY8s7yS117T5LBr4z26M7Iq1/wwdmNdlhYSfRySiawHc/X/AN+wsQYjHbMkhv5rcS/2SU9GTGxclZJ7UMgYLYQrKBFNGyRCvPJKrCNI5wyj7VPZnXwBsX7tg5fcF6V5buXsJzJ93PENVXLtBGFP3sG7zN/EVjSGGEKT0DQNA0Gh0EQ+gX96G+P9PxH+zx+gt/QNA0DQfPkKKSo8ciJJG6lXR1Do6sOGV1YFWUj4IIII/loPNP3de1vMbTp5XLbLyNmjjbayyZjEQsnStG0fWS3jy6s0KoO5cwtHPXQr4pAkQWIKu9iO38JW2xjTgQGqTwrNNKwj+qltMoFlrviaQfVJIDE0fkcQrGkanxomgwZ6++6u/uK/JtHZLO1hmaPL59f/ACXHV/hZvpJ0JPlP3xGwOpDKUr+SSQTVwpX23e3LGbUxqUaKgfAkuXJAqzW5Qv3zTN+FVfuCRA9YU+Bye7MGBPVn302crakwWw665XJdQJ8vwjYvGpKWiM6yPzHYeFirqxSSBvkKtsh4tB2D0A/T/r1bK5vcdqTcO4X6SyWLZ8tKnKJDKBQgdB/wWIWOSQBUCK0MFT5TQV6i8DjQbtA0DQNA0DQNA0DQNA0DQaFdBw+7to1L1eSrdrQW60o4kgsRJNE/9O0bqyng/IPHI/II40EU779hVzD2xkth5WTE2u5sS4OzYkfFXuOFdfGS/VerFekyTIrNH45KRRHUOV2R+ot9FMmN3rjLG28iSESyY5ZsVcPEYaWCZRIYo+78NxJaiiBBeyD2VAy/7p/c7Swm3ZstC9e81qNYcVHHJHNFkJrQ6w+MoxWxAFYzyCMt3hjcDksvIY2/T69l67dqNk7scf7byiCS0FjhRMfHI3l+grLFyiKGKmbxMEZkjRV6woSFhhdBroGgaBoNDoIh9Av70N8f6fiP9nj9Bb+gaDTnUmaDnSw1UtsnrqwKsoZWBUhgCCCOCCD8EEEgg/kHRXk57s/SDIbPvTQYnJrhdqbvuV692RImZMNJ8+dIlWUyqk0PnkBriANAPpyUWvG+grq/vDa3pthIaSNxyC8NWEpNlMtO3jV7DAFPJJISgaVvHFFGEjQKkcUegwdk9hbm3tE97dN3/shtMJ5VxMc8cVmzEiGdZr1icRokYVu7NbRVH0wYUYeBY0Fwei/ppiMTQjrYWvVr0jxIpqlXE5KKvnlnBd7MrIqAzyySOyqg7cAAB3xWH8tBu0DQNA0DQNA0DQNA0DQNBodBhb1j94m3MCivkcrWRmZkSCAtbsuyduyiCsJXQKVKs8ojjViqllZlBCcbvuT3zutCm1cIuDx8vYx5vNsqyvHwnR4awjnEbFu/3Rw5BSvUq8ZHJCcNte1XO3N6ZWlX3TffL4KjDa/bNgOva3ZaGeKskP1M7Lj3rzeKROxUOGBgli4jcM/4/wBzsbKdqep2NgrTzxtHHk5FUYrIqp8K2hPCy/RWJD3kFiD6dIj8j6ImOMBjb2+e1zGzb9t0cfJds7e2t1uGpdmFiomTuJxGlaNvtMS9fIJmUyvJSHLyp0ch6nx/j/x/9ug3aDGu8Pclt/H2HqX81i6dmMIXr2b1eGZBIodC0ckisAyMrDkDkEH+esYzfktfN2vZW/qOSgFrH3K12uzMonqzxzxFlPDL3jZl7KfgrzyP6a2zetOe50VroNDoIh9Af70N8f6fiP8AZ4/QW/oGg2O2szO7rxWNZS7ifcpm89YtLtShjZcbSsGtJmsvYspVuTRq/nix1anE80scTmIfWO6xP94VX+G0xxuN7llFx4dYSdJmOmnn3srej+8M3NJZrZvFw05a4iMV2jZ+px19XDBmgEqx2q0kbKQ9exGSFZCJH5Ot8mObJ+o2xx7hfRevuDEXcVZVCtqF1ikZA5rzgH6eynIPV4ZOG5HyV7L+GIIee/sG29t+jjcruncvnbN4S9Lj71nKzPbao1aOKKulOIg8zlOlOMMbE6SQFYmhjcKQ+vd/pTm/Uqrfzl4z4rCValyTa+M7JHJcnWJ/Dfvkxyr4pGUKzBSxjZkgZFDTWQ/P2Ze1I5PbuPzW29w5XAZIo9e5DHKtvHSWK0rwySS0Xk/ilid5gkkhVGmSRIohwHDIm7vc7vnZsEU+56GIzWOBjilyOMtLVshnkjQMa8scPlfjyHpDRiiLNHzLAq8OGdvan75cZu6S1Fj6mSrtTjikma5BCsJMpK9I5q9iwpdSOesniZlPYKer9Qo7QNA0DQNA0DQNA0DQNA0Hn76sfpR0orIyu17YxWQryCzXq3Io7uL8sfZh9s6SyVx5Cjq7C0kBTlIQejRBkf8AT99y2b3HWyDZarU8dCx9JDlKT8V8hIhbzCOEluUjXxuLCFYpBKAEUqwUOt/p7VDYy+/MpJyJbO5JKLIqlYQuPNjxsoPLeRhZPk5Yj+HgJ2PIUh7idkYm5iLozVWtbo1q1i24sr9sPhgkJnjmXiatIkZcCeBkkRWbqwBIITb+kL6Y/Q7UFtwwly12xb++JoysUXWpAgJY+VG8ElhZQqAix14boGYLh0DQQVS9VcJivUHdj5m3RqLNQwSwNd6AOy1e0gjLg/IBQtx/Vf6a57KtzOOufpK7W7w9yfucj7NLeOvbs3XlcCII8LKlGo/gKRx3L8IaSe1FVBDxxASEecwxx2JJJXQylpmG9nGUbLLe/l/p3R+eHlXSnPaTHaYxHGptcKav15tYxUN+itkv40ELe2qKRfU7fIlZXb6THkFV6gRtDTaFeP5skJRGb/nZS3/NoLs0DQdK9ZXnGJyhrfNgY+4YPyP3n08nj+R8/wAXH415f8ne7Kez/wCtHXY12uN8L1+MV6sM/pspANl4TwdODBMZfHx/xvqp/N24/wCfv/Fz88jXvz5e7Fevzt5cOOXjr4/1Sm9cnU0DQeXu9vbRjLPqtJSybs9LKUkz8NFnKw3LUCPAIJVLv50XwZC0QfF+78sQXx9xMHp3TrqiKiAKqqFVVAVVCjgKqjgKABwAAAB8cDQeafsC9cMNtqzuLat+2MY8WfvzUHyH7lWi4gqRiSxMUi8rRwQyIrpGJFLMCQ4ADqXox6L0G3tkMTvxbOWzMzyTYW/bawMZk4JEeZkir8LHH4kMjQwxu9WGQ2oAFkrV/IHqVt3bVerEkFWGGtBGFWOCvEkMMaoAiqkcaqiqqqFAA+AAPwNBy2gaBoGgaBoGgaBoGgaDQnQRb+qT7mzg8EaNVwMhmhNUjPLB4a3j4t2EKlSHCukKNz9rSlvnoRoMGeg+889lMTT23sStJjMLUjWC/uu/EY5LMssjm9PjoXeT7pZfPIio8s0KtDGWxpWM6DJH6LUhba+QJ+Sdw2ySfkknHYrkknkkk/JOgoj305V4dobiePjscXZhPYcjrYUV5P8Ar45G6/0bg/y0H2ey/EpDtPbaxr1U4XHyEcsfvnrpPK3LEkdpJHbgcAc8AABQoZq0DQQ3tv1YxOL9Qt3NlMhRoLLQwSxG7YhgWRlq9nVDKyhioZSQPkBgdZ2Vbmce3H0n8m0ucsJ9jL7m3bWSqZb1CpZPbTLJRqYy1DuLI1F4x15pkkahVSZR4bduGZknkkiBKooRpWMTRJdnju78zOlRUcdb+Wnjw77Z2kxO5prvce6r8+lacb5LkTTnPXS/gscPOfq3aqvnu30jVnkdURFLO7sFRFUcszMSAqqPksSANB5abQ952AxXqHufJz2XlxWSix9OHJ04mtVI5K9Kr3MjQ9pWRpIJIlNeKcuw546cuA9MNj+o1DJwLax1ytdrsSomqzJNH2XkFS0ZIVgRwVbgj+mg7EDoNki88/GszG9cLHFKW2PbNntuTWU2pexrYm3Yez+xs0loRY+STsZTj7VLmQQu3j/sskXVOpYP2L+SYZTVTrWkX+/s6pMRdwzJ6R7UzcUli1m8lXtSzrGsVGhWMGPoBezOInlZ7VuV2bhrE7R8oidYYuWGunJjmybqNmghv3OYpIfUfYVyMdbNiLK1JZOWPaCKCXpH0YmNePrrX3qqufL8t9kfQLhjHxoPOH0e9A8VuLdXqRRy1SO1D9fimjY8pNXfi8fJXnQrLC56gN0YB15Rw6lkYMSe7j2N7rxtSJcbbsZ/E46druPkkcnO4ToAZEgdWR5IHSKu5FXsPLCsiVKpUvKFmfp7e8E7rxkq2VEeVxjRQX0USdJVkRvBbUsvCmcwzK8PdmSSFmIVZY+QrDQNA0DQNA0DQNA0DQNA0GEPWn2cYDP36OSylM2bFFPGi+V1hnjV3mjhtRKeJoopneRY+VDF3V/IjFCGX8JgYK0MUFaGKvBCixxQQxrFDEigBUjijCpGigABUUAD8AaCLP0zPHUfeOIRRXFHdFyWOn0KPBBOBDA3VgGETx1AsfPI4j5H55IZ795+3Tb2puGBe5Y4m7Iqxr2d2ghadEVRySZHjVOACeCePnjQcV7Dd1rc2ht+RTGfHjYKreNw4VqY+lIYgnrJxCC6HgqxI/loM+6BoOOs7druxd4InY/lnjRmP4A5LAn4A41mMYi++bk6d0VD6K+PjQBURUUc8KgCqOfzwo4Hyfn8fnWvWKZqLvpq/cEaLEUm33C++/D4GQ0UMmWzLjiHEY1fqLJkI5RLDRh1rcjhijB5vGwdYZBxyVg6j7bt2b2dLm7bsuEwskayV9u4ySWGd1kKuq5ISqQJQgQP9QJZUfyKsNE9lIWHtL0CwtLHvi62KoxY+XnzVPpo2hsFkVGewrq31EjIqqZJu7FVUduFAATPvn9NuKtN+0dnZO3tjI9+7xxSTT4+0AXZYpYHk5jQOw4U+eukYKfSnkMocPU9625ttyeLfGCIpdxGmfwyNNTX/hIpsQ9pAvldmIYvVcn7Eqt1YqFd+lPrRis3WW3ir9a7Cw5JhkHkjPCt0ngbiavKodC0U0cbr2XlR2HId1GpXyGuqlNdFNBDvuGyIt+pmyaCLJ5KNLJ5KeQIHjEU8FlYlPDcoTJQKMzgKPqIeC5PXQW+h+P+mgir9Ou9Hfv73zKiNzc3HLWSzAzNWnr0lb6bwt3eJ/sseUvGx7CZTz1MYAWt4xoPwq42OPsURELHsxVQvZv/ADm4A7N/948nQfToGgaBoGgaBoGgaBoGgaBoNk340EKeluQGF9Uc9jpesce6KFXJ0VUu3llqRS+XsWjLLIzRZOXqsghCr1+T40QLhy1BZY3iccpIjxtx8Hq6lW4P8jwf/wCf5aCKv0vL0tCvndq25lktbey86Rr1VCaln7opAEBVklsJYm+ZppI/OqMUUQghcWgaBoMcet3uDxG3qpt5a5FVj+BGh5exOxIUJXroGmmPJ5bohCL2diqo7KEgj1N3pvlumGhk2ptxpF75Sz2jy96Bg4b6QKHEZZCHH07KFfrxdYFlIUZ7cfZVgtsRg0q/nvHyeXK3Ak2QlMpJcCXoqwR8cJ44EjDKoL+Vy8jhncDgaDTvqpE6X4t+or57dFZFZXUOjgq6MAyMrDgqysCrKR8EEfI0Eh+qP6amImtnJ4Kzb21lV7Mk+MfrVaQ9eDLTJAEfC8PFWlrRydnLrIW0HSIPcpvfaQWPdOH/AG/jlJLZzCcNNHEqSMzWKwiiQlQq/fNHQQLzzLMx50FT+iHuewe44jLiL8NllAMtckxW4eSVHlqyBZkUkECTqY24+12HzoMpI3Og0d+NBDXtbtjO793buBJDJTx0VbA4+VVAifr1a2qSBU8gSauZQWDkrZjKuUC8hV/rX6hricPk8k34o0bNkfKgs8ULNGi9wU7ySdUUMCCzKODzoMBfpb+lhxez6BdekuTkmysn3Mews9I67cMB17U4Kx6r9v8AzAnsToK20DQNA0DQNA0DQNA0DQNA0DQNA0ERfqQYmbGPgd51STJty8qW4QvPmp5B468oDdT1bk+Ad2Vf7UxDBlUOFkbX3BDbrwWq8iywWYYp4JUIZZI5kEkbqw+GV0YEEfGghv3RWH2hu/H7wQv+yMui4fcEca89ZFQirbbmQKeESHgleYxUkUM5tBQF5U7AdFdSGVlDKwPIZSOVYH+YI4I/z0HxZ/dFapDJYtTw1q8Sl5Z55EhhjUDks8khVFUAHkkgfB0EU7r99OSz8zYzYWPkvSN5Ip8/dhlhxdEhQQyd0/eShWLKJwv3eLrBbVmUB2f0V/TzrRWP2tue3JufNSKQ0mQ/fUa371pFSrWmDcLGSQnbiOPlvHDCDwAsFF40G7QbW1J4DCHrDvm3W3DtGnDO0dbI2svFdhCoVnWviLFmAMzIzr45kWQeNk5I4bsPjXHCZ7Td6bPXxizLTDzxj4zTOOu4aDTjQCNBLHrv+nbg8vI92kHwWXJkePJYv+zt5ZAwaSeCJokmLlmMrI0E0oZwZlLltBi87839swpHkqp3lg4ginI0w65iCMFVL2YSZZJnjTs58gmEnAMl6Is5UP09Tv1R8HNtyzaw9mT9szp9JSx0kLfXQ2p16pIY1DxvHBz5RLHI8buqxgmRwhDPnsn9uw2xt6njm6m04NvIOv4a3YCmUA8DssKLFWV+AWSBW4HJGgw5+pJuSa+MNs6jL47e5b8SWHWN5TXo1mV5pWWNg4XydZCPhWhr2QzRry2gsbau2oaVaCpXRY4K0MVeFFVVVI4UWONQqBVHCqBwqqP6AaDldA0DQNA0DQNA0DQNA0DQNA0DQfDmczFXieaaWOGKJe0ksrrHHGo/LO7kKo/xJ0EA+pXuTym+/qMFs2oDiph9LltxZGt1qpDKgZ46tedezO6h4mDwPNyVKpX5Swgdl/T/APUO1ibeQ2FmJVe9hOZcZOBJ1uUJeJuFaQH/AMn88bIhbkQymJQRTY6CtvVr0tp5rG3MXej8lW7EYpAOOynkNHNGSCFlglVJo24PWRFPB40Hnns33U5zYiy7PyOLtZq9FLFDtaaLxxQ36ckgiijlKh5F8KgsqoLLh2NdzAsSTMGSMF7M85uqWO/v26RWWSKxV21jZnipwHxdWFx1JfzfcykwzySL2l62kWTooWzs/ZFPH10q0a0FStGOEgrxrFGv+IVAByeByx+Tx8k6DmwNBroGg0OpIwB64YKeTc2ypY4ZpIq9vNPYlSJ3irrJhbEUbTyKpSISSssaGQr3dgo5PxrljE9tM8t2dfiZ64V7WP1UBrsGgaBoNCdBwG/N7VMbTs37sywVakLTTSswUKqD8Dkjs7twiJ+XdlUclgCEH+2H0jl3buSTfmRo/Q4+Lxrt2myQrLMIfIqX7apHzIQzNNHIzljMy9HaKtAzhe27t1wUas9y1KsNerDJPPK34jjiUs7n+Z4A/AHJPA/noPMr2T+53GZjemWzeaspTv3ooaW3a9oNFElNpmj8MUrs0P1chWFOoYeWaS2Y/wDiMgD1NEg/qNBu0DQNA0DQNA0DQNA0DQNA0DQfNkJ2VWKKGcKxRSeoZgPtUtweoZuAW4PH54Og8xvSfbuT9R8tkoN1X3x9PCWvHJtSmZa8jl2crJbk5UyRxPHGgn/es7K5QURIjTh6S7Q2RUx9aKnRrxVKsClYa8CLHFGCSzdVUAcszMzMeSzMzEksSQnD3y+3G3kIaecwZMW48C5s0XVQ7W4lDGWgVZ1iLSEh0LrJz1khCgWCVDvXtL91VPdWPM8KmveqlYcpj5ORNSscMCCp4ZoJWSTwykDsEdGCSRTIga+672o0d1UVhnZqt6qxmxuShX+0UphwQQQVZ4HZVMsPde3VGVo5I4pEDBHpN7wcht7If9m99MkUvZVxe4uvix+QhCBVa1M3VIpeQC9gngPIVmWHp5ZguGpbV1VlKsrKGVlIZWVvlWUj4KkfII5BHyNB++gaBoGg2snOg3aBoGgaDHvrR67YrAVGu5a5FUg56p2PaaduQPHWgTtLPIOQSsSN0Xl2KqrMoRbiPTvO+pNqvdzcUmH2dXsPLVw/MsN/KeMr4pbZ+OIpAX5mVk6IrRwJzL9aA9A8NhYasUVevFHDBDGkMMMSLHFFHGoWOONEAVERQFVFAAA+OONBAnrdveb1AzR2nilmTb+NtK+5MsEBhnesxdKEHPjbjzxCJZVlDvL3lEbQ1Q9gKj9XfaLgM3i4sXcoRrBUr/TUJYVWO1jkRFjj+knKs0YQRxkxN3ilMaeWOUDjQSufU3cvp1JHXzKvn9niRYKuVTj9pYxJCqwRWl+BIsKRsnRlKyNJH0tRkJUAXb6eb/rZSlWyFN2kqW4lmryNHJEzxt/CxjlVJF5HyOyjkcH5BGg7JoGgaBoGgaBoGgaBoGgaBoGghr3k7Htbey1XfuFrPO1cGpuWnAkYNvHHqTab7Cwav4o1ll4kZVWrIfHFVnOgrb0s9UKeYx9XJUJRNVtxLLEwK9l5+GilCswSaFw0csZJMciOp+RxoO36CKPcp7csxjMud47QBkvyGNc1hC5EGXhXqnkjUkKLCoB2QdeSvmjImEiWwzf7ZPdXjN0VZJaXlgtVX8N/HWlEdylLyw4lQMe0blH8cqnhurKwjkSWOMO5erno3jc7UajlKcNys3LBZV++JyjxiaCQffBOqSOFljZWUMQD8nQRnF6Ub02M7jb3Tc+2w3dcRal6ZKgn7x3StJ9oZOSoDQ+dmJHNNerSMGZfRP8AUO23l5BUksSYnJqXWXHZaM1JkeM9XQTN/ZnYHkiPyrL15JiTqwUKYSyDwR8gjkEcEH/Lj86D9dA0DQNBozcaDrm9vUWhja7Wchbr066AlpbMqRJ/kOxHYn+SqGJ5HAPI0Egbo/ULsZaWTH7FxM+dtr1EmRsRSVsVV7FvudpTBI54B6rI1YN8spm6lGD7/R/2BS2Ly57etwZ3MHyGOlz5MNSDNxGsMEkSeQxxhSE6RwJIznpO6xz6CzmlCg8/gD8ngD/roIK9afc9e3Zcfa+yZT1Pkjze4Qsi1aMCuYpYqkvCmWSXghZ4TzKpXwOQzzwBVvt59vuP21jYsZjkKwoTLNI55mtTuqLLZnYcAySBEXhQFRERFCqgGgyRYnCgkngAEkkgAADkkk/AAHySdB56WLz+pG5okjRzszbdl2llJUw5jJRchRHJHKpaHxSK6FDJ1r9mbob0QQPQfH0FiVUjVERFVERFCIiqOFRFUAKqj4CgAAfA0H1aBoGgaBoGgaBoGgaBoGgaBoPmyFBJEeN0SRJFZHR1DI6sCGV1blWVgSCpBBBI/noPPHMYyz6YZie7WryT7IzM8JtRRGWR8DZI8YlWMu48UrHjvx++jWKuSr16vnC/tp7rr3a0NyrPFYrWI1lgmiYPHIjfhlYfB/oR+QQQQCCNBzGgkv3Mex437see25cXA7jrmST6uOP+z5DvH18d1VDcMSFBseKcNG0qywWe0ZhDrfpN7/5adkYbfNQbfyocJFcIZcRfVjyJY5yZIq4RGjV5GsSQdyxMlYkwxhaFa1G6q6Mrqy9ldSGVgf5qw5BB/wACf5aDF3rR7WcBuAH9q4urakKogtBPDdVY2LLGt2Ex2VjDM3Mfk6Hsw6nsdBN3/dw5HFNE21N35jExxM5+htn66j+8/pArwwfa0k8h81Wx2lkV18LJ3YPro571ZxvUT0tuZ2JFEkjV5pK1mThengjeRqkay8oJSxqOp8pAf/liD4c374960SqXPTjIzu/LKcfdltxhRwOJDTx19UfnkgPIhKn+A8diHG/947ur/wCzHcH/AOrI/wD+f0HYqnuY9Rb6D6LY8ND6hQ0E2UySkQDjt/aq/wDYrIYgFQhSBlZl5HweQ+W56S+qWZBW/n8Tt2vIjK8eHhkmsr3KRsokfiSN1RXmjkgyIYO/HZOV8Icrsr9LbCrLHbztzJbmvKF7T5K1MIWIcSfEKyvKY/J5G8M9mwjCaQOH55AV1tbZ9OhAtalVrUqyFilerBFXgQsSzFYoVRFLMSx4UckknQdL9cfcdhtu1zPlb8NYlHaGAsrW7PTjkVqwYSzcFlBZQEUsvZ05B0EdWaG7fUflZVl2rs+QjmMgPlMvF5RyGDdTGp8PPJWOGMTj7coFJAW36RejeOwdKPH4uqlSrGSwReWZ3b+OWWRy0k0rABTJIzN1VV+FVQA7nI/H+eggD3Eetl7ed+xs3arIaY/d7jzxXyVa0JYq9aAjhZWkKMgCN2surIjJFHZnQLT9K/SehhaMOOx1da9WBeERf4nJ/jllf+KWaQ/c8jkszf5DQdw0DQNA0DQNA0DQNA0DQNA0DQNA0HGbj25BbgmrWYo5688bxTQSqHiljcdXR0YEMrD4I4/9g4Dz5zm2M56ZTS28arZbZEtpZbWPLPLkMMsvYSvWd+FMKsVZZHdll6rHMIHY25AuT0l9YsdnKcd/F2o7VaUchk5V4yCQY5omAkhkUggpIqn454IIJDumg6V6pei+LzdZqeVpQ3a5DALKv3RlhwXhlUrLBJx+JIXRxwPn4HASJY9m25tsytNsjNmSkzMXwOcdp6iKwkIFWXqehR2UKB9NIwVfJYmClXD7Mf8AqSWMWyV94bbyeDkJ6m5Xj+sxzcKnLiRSGAaQsPHA1woGi5Zu5ZQpD0v90m38yqtjctSsljx4hMIrIPdowGqzeOwpZ0ITtEPIOGTurKSGVAdBt8eg3caDaicaDj81uGGuhknmhgjBALzSJGgJ5IHZ2UckD8c/+P40E1epH6mG0ccWRcicnOFLCDExNdL8BG6rMClQt1Yt82QB0cMVZeCGOcn6veoe5iUwmJj2pjXRVOQzS85EnyqsrQVmRzEwVZEVXqOCn7wWImkhMYd89Gf07cPSmGQy7z7jzDEPJfypM0YccEeCm7SRIqMOY/MbDxk/a6DhVCsVGg+TLZWOCN5pXSKKJGklkkZUSNEHZ3d2IVUVQSzMQAPn+Wg8/N9+v2a3/Ynw2zX+iwSxrHltxWYp4WkErKXgooQk4bxdlMZWOSYsyu9SLrLKFi+gPoDjduY2HG4yHxwx/fLI/BntTEASWrMgA8k0nAH4CRoEjjWNI0RQyVoGgaBoGgaBoGgaBoGgaBoGgaBoGgaD85oufj+X8x/I/wCB/wANBDvqZ7DbmHuPnNh2/wBl3CS9rCyO/wCycj2MnKmMyCOIIs0piryK0EbCPw/RlQ2g7X6I/qIULU8eK3BVn23nSwjNPIJJHXmZpCkbVrMioOspA6iYRgsSqPOFDsFcRycjkfj+X+PP8xx/LQb9B8l/HJKpSREdG47I6h1bg8jlWBB4PyOR8H5/loJy9Qv04tnZIEyYWvVfrIFkxzPQ6mRVXuIq7JXZk6hkEkMiKe32nu/YMYzfpd/SxMmF3duXFFC30irbMtaqryFpEWCB6TsGRpEBWeMhmDsZOGVw/bG+0HftKNYafqHNPECzF7+LjsThmPyPNasX5mT+gaYBfwFA0H0//Nt9R/8A09g/9S0//wCrQca36fm5bc5lyfqJnJY5gDZq0Y5aMZIQALAEyDVYVVwrErQHkAblUZywDl8T+lFtxpGnytnL5yYgqJMjkJeypwvRe1bwSnxkOV5k6/vGBU8KQFH+mnt9wuG5/ZeLo0WbjvJBXjWZ+OQA83UysByeFLkDs3AHY8hkPQaMdBgH3Ce93Bbcda1qaS1kZQPBi6Mf1FyUu3SNSqnpCZG+EEzoz/8AKrfjQTzi/QPcu/ZYru62nwWAUpLW23XllSxa4dG/+kyyxso5i5Vpo/PGHYRpUJLuFxbA9P6eLqQUMfXiq06ydIYIl6qgJLMf5szu5aSSRyzySMzszM5Og7HoGgaBoGgaBoGgaBoGgaBoGgaBoGgaBoGg0I0GNvW/274fcVda2XoxW0TkxOS0c8BYqWaCxEyTRdii91RwsgUB1kXlSEoN7Y977VKnaebGYxUXaQ4TONG0zcJ1WCvZ8aKqnnsBDYxqLIqkrKHkGg5PaX6rmHS0+O3BTu4HIQEJZDqt2pFLzGDEZapacMO7MQ1ZVVY2DOH4QhXewfVPG5SET46/VvREA9608c3HJYAMEJKHlWHVgpBVhwCpADtPkGgK+g3aBoNC2g2mUaD4c3uKvWjaaxPFXiUctJNIsUaj8fLuVUfPx+fnkf1Ggkb1f/VX2niyyQWZsvOpC9MbGrwg/f8ALWpmigZAVALQvMfvjKqw8hQIO9V/1UM3m7kdaK1Jt7DyyCGwcfGtjICvI6iWY2ZAsomijDMi02q8dmBMhCHQekntQ9n22sLFDksUpyNm3Ek65q3ILNqeOwGkEkLcLFAkqSnkwRRvIhAlaYqCApYDQa6BoGgaBoGgaBoGgaBoGgaBoGgaBoGgaBoGgaDQnQRr+ot71l21j/oqMqftzIRf2b4ST6KEt1kuyxseAxAkjqhwVeYM5V0ryKweFE1tmJZiWYklmJJLE/JZifkkkkkn5JJ0H6UcpJFIksTtHLG6yRyISkkboQUdHUhkZGAZWUgqQCCCBoM6enPv13di+BXzl2WPvGxhuuL8ZEZP7sfWCZ4o3BKusDxdgQeeVUqGbcH+shu2JSHhw1gliQ81OwrKOFHQCvdrp15BblkLcseWIChQyPQ/W+yKxoJcDSeUIokeO5NGjuFHdkjaKVo1ZuSEaWQqCAXfjkh+/wD34V3/ANHqv/rCX/3bQdE3B+s9uhzKIaeFgRzJ4j9PblmhUk9OZGuiKWSMcfea4R2HPjAPUBiD1D/Ur3lkVaNsu9ONlRWXHRR0mJSTyBxYiX6pGJ4RvHOivGvQqVaQOE+bo31dvMr3blq46Aqr27Eth1DEsQrTO5UFiSQCAT8/nQcK786DQaD0O/S7978uLmj25chsWqVyw70WrpPZnpTSANJEtaMSu1OUq0xSvGDFM00pVxNK0Yey6NoN2gaBoGgaBoGgaBoGgaBoGgaBoGgaBoGgaBoGg0YaDzW99H6Y+X3BmLOax2TqyNZECCjd80P06QQQwdYJ1FhXVmWSdkMcAUu3BkZjyHn56i+w/d2L5a1g7jRhuvlqKl+Mjhz3JpNOyJ1jZiZFToOoYIXUEMF2aLISrgow45VgVYcgMPtYA8EHkf4Ef1Gg/DQNA0DQNBqq6DtGy/SzJZKRYcfRt3ZGHKrWrzTfaHWMuSiFVjWR1RpGIRCy8kc6CmPTz9KPeN8FpalbGJ9vVsjbRC/JcHiKotudOnUc+WKMnuhUPyeoWx6Q/oyYSr0fMXbWVcD7oYv7DUPy35EbPabhSoBWzH8hzwQyhAtn0x9GMXhYErYujXpQoqoBCn7xwvbgyzMWmnb7mJkmkd2ZnYsSzch3bQNA0DQNA0DQNA0DQNA0DQNA0DQNA0DQNA0DQNA0GhGgBdB1zePpxjshGY79ClejJUmO3VgsoSnyhKzI6kqf4SR8fy40GHdy+w3Z9tXWTb+Oj838RrRGoy8FT+6NZojF+OP3fX4JH8zyHQs5+k7smWPpHj7NZuynyw5G6zgA/K8WZrEXDfz/AHfP9CNBwH/c77P/APxX/wDep/7voP0rfo+7OVlYrk3CsrGN73COAwJRikKOFcfaSjo3BPDKeCA7riv0yNkV5FmTCq7J2IWe5fsRHlSv3wzWnjccHkdlPBAI4IB0GSNre0ja9N1avt7Do8cqzRytj60s0cihCjxzSxvLGUKKy9HUKwLDhiSQy3VppGoREVFHPCooVRySTwAABySSfj8k6D9Ao/poN2gaBoGgaBoGgaBoGgaBoGgaD//Z"
             class="sidebar-logo" alt="BCI"
             onerror="this.style.display='none'">
        <div class="sidebar-brand-text">
          <h2 id="a-sidebar-shortname">B.C.I</h2>
          <span>Admin Panel</span>
        </div>
      </div>

      <!-- Admin user info -->
      <div class="sidebar-user">
        <div class="sidebar-user-name">👑 Administrator</div>
        <div class="sidebar-user-role">Full Access</div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">

        <div class="nav-section-title">Overview</div>
        <div class="nav-item active" data-page="a-page-home"
             onclick="showAdminPage('a-page-home')">
          <span class="nav-icon">📊</span> Dashboard
        </div>

        <div class="nav-section-title">Students</div>
        <div class="nav-item" data-page="a-page-pending"
             onclick="showAdminPage('a-page-pending'); loadPendingStudents()">
          <span class="nav-icon">⏳</span> Pending Approvals
          <span class="nav-badge" id="pending-badge" style="display:none;">0</span>
        </div>
        <div class="nav-item" data-page="a-page-students"
             onclick="showAdminPage('a-page-students'); loadAllStudents()">
          <span class="nav-icon">👥</span> All Students
        </div>
        <div class="nav-item" data-page="a-page-add-student"
             onclick="showAdminPage('a-page-add-student')">
          <span class="nav-icon">➕</span> Add Student
        </div>

        <div class="nav-section-title">Content</div>
        <div class="nav-item" data-page="a-page-classes"
             onclick="showAdminPage('a-page-classes'); loadAdminClasses()">
          <span class="nav-icon">🎓</span> Manage Classes
        </div>
        <div class="nav-item" data-page="a-page-materials"
             onclick="showAdminPage('a-page-materials'); loadAdminMaterialsPage()">
          <span class="nav-icon">📁</span> Materials & Folders
        </div>
        <div class="nav-item" data-page="a-page-notices"
             onclick="showAdminPage('a-page-notices'); loadAdminNotices()">
          <span class="nav-icon">📢</span> Notice Board
        </div>
        <div class="nav-item" data-page="a-page-homepage"
             onclick="showAdminPage('a-page-homepage'); loadHomepageEditor()">
          <span class="nav-icon">🌐</span> Home Page
        </div>

        <div class="nav-section-title">System</div>
        <div class="nav-item" data-page="a-page-sessions"
             onclick="showAdminPage('a-page-sessions'); loadAdminSessions()">
          <span class="nav-icon">📅</span> Sessions
        </div>
        <div class="nav-item" data-page="a-page-attendance"
             onclick="showAdminPage('a-page-attendance'); initAdminAttendance();">
          <span class="nav-icon">📊</span> Attendance
        </div>

        <div class="nav-item" data-page="a-page-leaderboard"
             onclick="showAdminPage('a-page-leaderboard'); initAdminLeaderboard();">
          <span class="nav-icon">🏆</span> Leaderboard
        </div>

        <div class="nav-item" data-page="a-page-notifications"
             onclick="showAdminPage('a-page-notifications'); loadAdminNotifications();">
          <span class="nav-icon">🔔</span> Notifications
          <span class="nav-badge" id="notif-badge" style="display:none;">0</span>
        </div>

        <div class="nav-item" data-page="a-page-settings"
             onclick="showAdminPage('a-page-settings'); loadInstituteInfo(); loadSessionTimeoutUI(); loadProfileEditPermission(); loadAttendanceFeatureState();">
          <span class="nav-icon">⚙️</span> Settings
        </div>

      </nav>

      <!-- Logout -->
      <div class="sidebar-footer">
        <div id="admin-session-expiry" style="font-size:10px;color:var(--text-dim);text-align:center;margin-bottom:8px;"></div>
        <button id="pwa-btn-admin" class="pwa-install-sidebar-btn" onclick="pwaInstall()" title="Install BCI as app on your device">
          📲 Install App
        </button>
        <button class="btn btn-danger w-full btn-sm" onclick="confirmLogout()">
          🚪 Logout
        </button>
      </div>
    </aside>

    <!-- ── ADMIN MAIN CONTENT ── -->
    <main class="main-content">

      <!-- ================================================
           ADMIN PAGE: HOME / DASHBOARD
           ID: a-page-home
           ================================================ -->
      <div id="a-page-home" class="page active">

        <div class="page-header">
          <h1>📊 Admin <span>Dashboard</span></h1>
          <p style="color:var(--text-muted);">
            Welcome back! Here is an overview of <span id="a-dash-name">Brilliant Coaching Institute</span>.
          </p>
        </div>

        <!-- Stats grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-icon">👥</div>
            <div class="stat-card-value" id="a-stat-total">—</div>
            <div class="stat-card-label">Total Students</div>
          </div>
          <div class="stat-card" style="animation-delay:0.1s;">
            <div class="stat-card-icon">⏳</div>
            <div class="stat-card-value" id="a-stat-pending"
                 style="color:var(--warning);">—</div>
            <div class="stat-card-label">Pending Approvals</div>
          </div>
          <div class="stat-card" style="animation-delay:0.2s;">
            <div class="stat-card-icon">✅</div>
            <div class="stat-card-value" id="a-stat-active"
                 style="color:var(--success);">—</div>
            <div class="stat-card-label">Active Students</div>
          </div>
          <div class="stat-card" style="animation-delay:0.3s;">
            <div class="stat-card-icon">📁</div>
            <div class="stat-card-value" id="a-stat-materials">—</div>
            <div class="stat-card-label">Total Materials</div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="card" style="margin-bottom:24px;">
          <div class="card-title">⚡ Quick <span>Actions</span></div>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary"
                    onclick="showAdminPage('a-page-pending'); loadPendingStudents()">
              ⏳ Review Pending
            </button>
            <button class="btn btn-success"
                    onclick="showAdminPage('a-page-add-student')">
              ➕ Add Student
            </button>
            <button class="btn btn-outline"
                    onclick="showAdminPage('a-page-materials'); loadAdminMaterialsPage()">
              📁 Manage Materials
            </button>
            <button class="btn btn-warning"
                    onclick="showAdminPage('a-page-notices'); loadAdminNotices()">
              📢 Post Notice
            </button>
          </div>
        </div>

        <!-- Recent pending students -->
        <div class="card">
          <div class="card-title">⏳ Recent <span>Pending Approvals</span></div>
          <div id="a-home-pending">
            <div class="loading-screen"><div class="spinner"></div></div>
          </div>
        </div>

      </div><!-- end a-page-home -->


      <!-- ================================================
           ADMIN PAGE: PENDING APPROVALS
           ID: a-page-pending
           ================================================ -->
      <div id="a-page-pending" class="page">

        <div class="page-header">
          <h1>⏳ Pending <span>Approvals</span></h1>
          <p style="color:var(--text-muted);">
            Review new student registrations and approve or reject them
          </p>
        </div>

        <div class="info-box">
          💡 Students cannot login until you approve them.
          After approval they can immediately access their class materials.
        </div>

        <div id="a-pending-list">
          <div class="loading-screen"><div class="spinner"></div></div>
        </div>

      </div><!-- end a-page-pending -->


      <!-- ================================================
           ADMIN PAGE: ALL STUDENTS
           ID: a-page-students
           ================================================ -->
      <div id="a-page-students" class="page">

        <div class="page-header-actions">
          <div>
            <h1 style="font-size:var(--fs-2xl); font-family:'Rajdhani',sans-serif;">
              👥 All <span style="color:var(--neon-blue);">Students</span>
            </h1>
            <p style="color:var(--text-muted); margin-top:4px;">
              Manage all registered students
            </p>
          </div>
          <button class="btn btn-primary"
                  onclick="showAdminPage('a-page-add-student')">
            ➕ Add Student
          </button>
          <button class="btn btn-outline"
                  onclick="printStudentList()">
            🖨️ Print List
          </button>
        </div>

        <!-- Search and filter bar -->
        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
          <div class="search-bar" style="flex:1; min-width:200px;">
            <span class="search-bar-icon">🔍</span>
            <input type="text" placeholder="Search by name, mobile, roll no..."
                   id="student-search-input"
                   oninput="filterStudentsTable()">
          </div>
          <button class="btn btn-outline btn-sm" onclick="resetStudentFilters()"
                  style="white-space:nowrap;">🔄 Reset Filters</button>
        </div>

        <!-- Filter row — Multi-select dropdowns -->
        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; align-items:center;">

          <!-- Board filter -->
          <div class="ms-wrap" id="msw-board">
            <button class="ms-btn" onclick="toggleMsDropdown('ms-board')">
              <span id="ms-board-label">All Boards</span> ▾
            </button>
            <div class="ms-dropdown" id="ms-board" style="display:none;">
              <label class="ms-item"><input type="checkbox" value="BSEB" onchange="filterStudentsTable()"> 📘 BSEB</label>
              <label class="ms-item"><input type="checkbox" value="CBSE" onchange="filterStudentsTable()"> 📗 CBSE</label>
            </div>
          </div>

          <!-- Session filter -->
          <div class="ms-wrap" id="msw-session">
            <button class="ms-btn" onclick="toggleMsDropdown('ms-session')">
              <span id="ms-session-label">All Sessions</span> ▾
            </button>
            <div class="ms-dropdown" id="ms-session" style="display:none;">
              <div id="ms-session-options"><div style="padding:8px;color:var(--text-muted);font-size:var(--fs-xs);">Loading...</div></div>
            </div>
          </div>

          <!-- Class filter -->
          <div class="ms-wrap" id="msw-class">
            <button class="ms-btn" onclick="toggleMsDropdown('ms-class')">
              <span id="ms-class-label">All Classes</span> ▾
            </button>
            <div class="ms-dropdown" id="ms-class" style="display:none; min-width:200px;">
              <div id="ms-class-options"><div style="padding:8px;color:var(--text-muted);font-size:var(--fs-xs);">Loading...</div></div>
            </div>
          </div>

          <!-- Gender filter -->
          <div class="ms-wrap" id="msw-gender">
            <button class="ms-btn" onclick="toggleMsDropdown('ms-gender')">
              <span id="ms-gender-label">All Genders</span> ▾
            </button>
            <div class="ms-dropdown" id="ms-gender" style="display:none;">
              <label class="ms-item"><input type="checkbox" value="Male"   onchange="filterStudentsTable()"> 👦 Male</label>
              <label class="ms-item"><input type="checkbox" value="Female" onchange="filterStudentsTable()"> 👧 Female</label>
              <label class="ms-item"><input type="checkbox" value="Other"  onchange="filterStudentsTable()"> 🧑 Other</label>
            </div>
          </div>

          <!-- Status filter — Pending excluded (handled in Pending Approvals tab) -->
          <div class="ms-wrap" id="msw-status">
            <button class="ms-btn" onclick="toggleMsDropdown('ms-status')">
              <span id="ms-status-label">All Status</span> ▾
            </button>
            <div class="ms-dropdown" id="ms-status" style="display:none;">
              <label class="ms-item"><input type="checkbox" value="approved" onchange="filterStudentsTable()"> ✅ Active</label>
              <label class="ms-item"><input type="checkbox" value="inactive" onchange="filterStudentsTable()"> ⛔ Inactive</label>
              <label class="ms-item"><input type="checkbox" value="rejected" onchange="filterStudentsTable()"> ❌ Rejected</label>
            </div>
          </div>

          <div id="student-filter-count" style="font-size:var(--fs-xs);color:var(--text-muted);white-space:nowrap;"></div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Roll No</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Board</th>
                <th>Session</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="a-students-tbody">
              <tr><td colspan="10" style="text-align:center;padding:32px;">
                <div class="spinner" style="margin:0 auto;"></div>
              </td></tr>
            </tbody>
          </table>
        </div>

      </div><!-- end a-page-students -->


      <!-- ================================================
           ADMIN PAGE: ADD STUDENT MANUALLY
           ID: a-page-add-student
           ================================================ -->
      <div id="a-page-add-student" class="page">

        <div class="page-header">
          <h1>➕ Add <span>Student</span></h1>
          <p style="color:var(--text-muted);">Manually add a student — account is approved instantly</p>
        </div>

        <div style="max-width:620px;">
          <div class="card">
            <div class="info-box">💡 Students added manually are approved instantly. Share their Roll No and password with them directly.</div>
            <div id="add-student-msg"></div>

            <div class="form-row">
              <div class="form-group">
                <label>Session <span class="required">*</span></label>
                <select class="form-control" id="as-session"><option value="">-- Select --</option></select>
              </div>
              <div class="form-group">
                <label>Board <span class="required">*</span></label>
                <select class="form-control" id="as-board" onchange="onAsBoardChange()">
                  <option value="">-- Select Board --</option>
                  <option value="BSEB">📘 BSEB (Bihar Board)</option>
                  <option value="CBSE">📗 CBSE</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Class <span class="required">*</span></label>
                <select class="form-control" id="as-class" disabled>
                  <option value="">-- Select Board first --</option>
                </select>
              </div>
              <div class="form-group">
                <label>Coaching Roll No. <span class="required">*</span></label>
                <input class="form-control" id="as-roll" type="number" min="1" placeholder="e.g. 15">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Full Name <span class="required">*</span></label>
                <input class="form-control" id="as-name" type="text" placeholder="Student's full name">
              </div>
              <div class="form-group">
                <label>Gender <span class="required">*</span></label>
                <select class="form-control" id="as-gender">
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Date of Birth <span class="required">*</span></label>
                <input class="form-control" id="as-dob" type="date">
              </div>
              <div class="form-group">
                <label>Mobile Number <span class="required">*</span></label>
                <input class="form-control" id="as-mobile" type="tel" placeholder="10-digit mobile" maxlength="10">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Alt. Mobile <span class="optional">(optional)</span></label>
                <input class="form-control" id="as-alt-mobile" type="tel" placeholder="Alternative number" maxlength="10">
              </div>
              <div class="form-group">
                <label>Password <span class="required">*</span></label>
                <input class="form-control" id="as-password" type="text" placeholder="Set a password for student">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Father's Name <span class="required">*</span></label>
                <input class="form-control" id="as-father" type="text" placeholder="Father's full name">
              </div>
              <div class="form-group">
                <label>Mother's Name <span class="required">*</span></label>
                <input class="form-control" id="as-mother" type="text" placeholder="Mother's full name">
              </div>
            </div>

            <div class="form-group">
              <label>Address <span class="required">*</span></label>
              <textarea class="form-control" id="as-address" rows="2" placeholder="Student's address" style="resize:vertical;"></textarea>
            </div>

            <!-- Photo Upload -->
            <div class="form-group">
              <label>Photo <span class="optional">(optional)</span></label>
              <div style="display:flex; align-items:center; gap:16px;">
                <div id="as-photo-preview" style="
                  width:64px; height:64px; border-radius:50%;
                  background:var(--bg-card2); border:2px solid var(--border);
                  display:flex; align-items:center; justify-content:center;
                  font-size:28px; flex-shrink:0;">👤</div>
                <div>
                  <input type="file" id="as-photo" accept="image/*"
                         onchange="previewAsPhoto(this)" style="display:none;">
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button"
                            onclick="document.getElementById('as-photo').click()"
                            class="btn btn-outline btn-sm">📷 Upload Photo</button>
                    <button type="button" id="as-photo-remove-btn" onclick="removeAsPhoto()"
                            class="btn btn-ghost btn-sm" style="display:none;">🗑️ Remove</button>
                  </div>
                  <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:4px;">
                    JPG/PNG, max 3MB. Default photo used if not uploaded.
                  </div>
                </div>
              </div>
            </div>

            <button class="btn btn-primary" onclick="handleAddStudentManually()" id="add-student-btn">➕ Add Student</button>
          </div>
        </div>

      </div><!-- end a-page-add-student -->


      <!-- ================================================
           ADMIN PAGE: MANAGE CLASSES
           ID: a-page-classes
           ================================================ -->
      <div id="a-page-classes" class="page">

        <div class="page-header-actions">
          <div>
            <h1 style="font-size:var(--fs-2xl); font-family:'Rajdhani',sans-serif;">
              🎓 Manage <span style="color:var(--neon-blue);">Classes</span>
            </h1>
            <p style="color:var(--text-muted); margin-top:4px;">
              Add, rename or remove classes — organised by board
            </p>
          </div>
          <button class="btn btn-primary" onclick="openAddClassModal()">
            ➕ Add New Class
          </button>
        </div>

        <div class="warning-box">
          <strong>⚠️ Warning about deleting classes:</strong>
          Deleting a class will permanently remove ALL folders, materials
          and student access linked to that class. This cannot be undone.
          Students in that class will lose access immediately.
        </div>

        <!-- Board Tabs -->
        <div style="display:flex; gap:0; margin-bottom:24px; border-bottom:2px solid var(--border);">
          <button id="tab-bseb" onclick="switchClassTab('BSEB')" style="
            padding:10px 28px; font-family:'Rajdhani',sans-serif; font-weight:700;
            font-size:var(--fs-base); border:none; cursor:pointer; letter-spacing:0.5px;
            background:transparent; border-bottom:3px solid var(--neon-blue);
            color:var(--neon-blue); margin-bottom:-2px; transition:all 0.2s;">
            📘 BSEB (Bihar Board)
          </button>
          <button id="tab-cbse" onclick="switchClassTab('CBSE')" style="
            padding:10px 28px; font-family:'Rajdhani',sans-serif; font-weight:700;
            font-size:var(--fs-base); border:none; cursor:pointer; letter-spacing:0.5px;
            background:transparent; border-bottom:3px solid transparent;
            color:var(--text-muted); margin-bottom:-2px; transition:all 0.2s;">
            📗 CBSE
          </button>
        </div>

        <div id="a-classes-grid"
             style="display:grid;
                    grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
                    gap:16px;">
          <div class="loading-screen" style="grid-column:1/-1;">
            <div class="spinner"></div>
          </div>
        </div>

      </div><!-- end a-page-classes -->


      <!-- ================================================
           ADMIN PAGE: MATERIALS & FOLDERS
           ID: a-page-materials
           (Full folder management in Part 5)
           ================================================ -->
      <div id="a-page-materials" class="page">
        <div class="page-header">
          <h1>📁 Materials <span>&amp; Folders</span></h1>
          <p style="color:var(--text-muted);">
            Manage class folders, sub-folders and study materials
          </p>
        </div>
        <!-- Content injected by Part 5 -->
        <div id="a-materials-content">
          <div class="loading-screen"><div class="spinner"></div></div>
        </div>
      </div>


      <!-- ================================================
           ADMIN PAGE: NOTICE BOARD
           ID: a-page-notices
           ================================================ -->
      <div id="a-page-notices" class="page">

        <div class="page-header-actions">
          <div>
            <h1 style="font-size:var(--fs-2xl); font-family:'Rajdhani',sans-serif;">
              📢 Notice <span style="color:var(--neon-blue);">Board</span>
            </h1>
            <p style="color:var(--text-muted); margin-top:4px;">
              Post announcements for all students
            </p>
          </div>
          <button class="btn btn-primary" onclick="openModal('modal-add-notice'); loadNoticeClassGrid()">
            ➕ Post Notice
          </button>
        </div>

        <div id="a-notices-list">
          <div class="loading-screen"><div class="spinner"></div></div>
        </div>

      </div><!-- end a-page-notices -->


      <!-- ================================================
           ADMIN PAGE: SESSIONS
           ID: a-page-sessions
           ================================================ -->
      <div id="a-page-sessions" class="page">
        <div class="page-header">
          <h1>📅 <span>Sessions</span></h1>
          <p style="color:var(--text-muted);">Manage academic sessions. The active session appears in student registration and login.</p>
        </div>
        <div class="grid-2col" style="max-width:800px;">
          <!-- Add new session -->
          <div class="card">
            <div class="card-title">➕ Add New <span>Session</span></div>
            <div id="session-msg"></div>
            <div class="form-group">
              <label>Session Name <span class="required">*</span></label>
              <input class="form-control" id="new-session-name" placeholder="e.g. 2027-28">
              <div style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:4px;">Format: YYYY-YY (e.g. 2026-27)</div>
            </div>
            <button class="btn btn-primary" onclick="handleAddSession()">➕ Add Session</button>
          </div>
          <!-- Sessions list -->
          <div class="card">
            <div class="card-title">📋 All <span>Sessions</span></div>
            <div id="sessions-list"><div class="loading-screen"><div class="spinner"></div></div></div>
          </div>
        </div>
      </div><!-- end a-page-sessions -->

      <!-- ================================================
           ADMIN PAGE: SETTINGS
           ID: a-page-settings
           ================================================ -->
      <div id="a-page-settings" class="page">

        <div class="page-header">
          <h1>⚙️ <span>Settings</span></h1>
          <p style="color:var(--text-muted);">
            Manage admin credentials and institute settings
          </p>
        </div>

        <div class="grid-2col" style="max-width:800px;">

          <!-- Change admin credentials -->
          <div class="card">
            <div class="card-title">🔑 Change Admin <span>Credentials</span></div>
            <div class="info-box">
              Change your admin login ID and password.
              You will need to use new credentials next time you login.
            </div>
            <div id="settings-msg"></div>
            <div class="form-group">
              <label>New Admin ID <span class="required">*</span></label>
              <input class="form-control" id="set-username"
                     placeholder="New admin username">
            </div>
            <div class="form-group">
              <label>Current Password (to confirm) <span class="required">*</span></label>
              <input class="form-control" id="set-current-pass"
                     type="password" placeholder="Enter current password">
            </div>
            <div class="form-group">
              <label>New Password <span class="required">*</span></label>
              <input class="form-control" id="set-new-pass"
                     type="password" placeholder="New password (min 6 chars)">
            </div>
            <div class="form-group">
              <label>Confirm New Password <span class="required">*</span></label>
              <input class="form-control" id="set-confirm-pass"
                     type="password" placeholder="Re-enter new password">
            </div>
            <button class="btn btn-primary" onclick="handleChangeAdminCredentials()">
              💾 Save Changes
            </button>
          </div>

          <!-- Institute info display card
               – ✏️ Edit button opens the full Edit Institute Info modal
               – 🌐 Edit Home Page button is a prominent CTA below the info rows -->
          <div class="card" id="inst-info-card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
              <div class="card-title" style="margin:0;">🏫 Institute <span>Info</span></div>
              <!-- Small edit button kept in header for quick access -->
              <button class="btn btn-outline btn-sm" onclick="openEditInstituteModal()" title="Edit all institute info including home page">✏️ Edit</button>
            </div>

            <!-- Logo display -->
            <div style="display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--border); margin-bottom:4px;">
              <div id="inst-logo-display" style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid var(--border);flex-shrink:0;background:var(--bg-card2);display:flex;align-items:center;justify-content:center;">
                <img id="inst-logo-img" src="" alt="Logo" style="width:100%;height:100%;object-fit:cover;display:none;" onerror="this.style.display='none'; document.getElementById('inst-logo-fallback').style.display='flex'">
                <img id="inst-logo-fallback" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGExNjI4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzExMjI0NCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ2xvdyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMGQ0ZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA5OWNjIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIEJhY2tncm91bmQgY2lyY2xlIC0tPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPgogIDwhLS0gT3V0ZXIgcmluZyAtLT4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjkyIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iOCA0IiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEdyYWR1YXRpb24gY2FwIGJhc2UgKG1vcnRhcmJvYXJkKSAtLT4KICA8IS0tIENhcCB0b3AgZGlhbW9uZCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjEwMCw0MiAxNDgsNjUgMTAwLDg4IDUyLDY1IiBmaWxsPSJ1cmwoI2dsb3cpIiBvcGFjaXR5PSIwLjk1Ii8+CiAgPCEtLSBDYXAgYm9hcmQgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxMDAsNDggMTQyLDY4IDEwMCw4OCA1OCw2OCIgZmlsbD0iIzAwZDRmZiIgb3BhY2l0eT0iMC4xNSIvPgogIDwhLS0gQ2FwIG91dGxpbmUgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxMDAsNDIgMTQ4LDY1IDEwMCw4OCA1Miw2NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDwhLS0gQ2FwIHN0ZW0gLS0+CiAgPHJlY3QgeD0iOTciIHk9IjY1IiB3aWR0aD0iNiIgaGVpZ2h0PSIyOCIgcng9IjMiIGZpbGw9InVybCgjZ2xvdykiLz4KICA8IS0tIENhcCB0YXNzZWwgYmFzZSBjaXJjbGUgLS0+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iOTMiIHI9IjciIGZpbGw9IiMwMGQ0ZmYiIG9wYWNpdHk9IjAuOSIvPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjkzIiByPSI0IiBmaWxsPSIjMGExNjI4Ii8+CiAgPCEtLSBUYXNzZWwgcm9wZSAtLT4KICA8cGF0aCBkPSJNIDE0NSA2NSBRIDE1NSA3MCAxNTMgODIgTCAxNTAgOTUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMTUwIiB5MT0iOTUiIHgyPSIxNDciIHkyPSIxMDgiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNiIvPgogIDxsaW5lIHgxPSIxNTAiIHkxPSI5NSIgeDI9IjE1MyIgeTI9IjEwOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC42Ii8+CiAgPGxpbmUgeDE9IjE1MCIgeTE9Ijk1IiB4Mj0iMTUwIiB5Mj0iMTEwIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjYiLz4KICA8IS0tIE9wZW4gYm9vayBiZWxvdyAtLT4KICA8cGF0aCBkPSJNIDU1IDExOCBRIDEwMCAxMDggMTQ1IDExOCBMIDE0NSAxNDggUSAxMDAgMTM4IDU1IDE0OCBaIiBmaWxsPSIjMTEyMjQ0IiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPGxpbmUgeDE9IjEwMCIgeTE9IjEwOCIgeDI9IjEwMCIgeTI9IjE0OCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8IS0tIEJvb2sgcGFnZXMgbGluZXMgbGVmdCAtLT4KICA8bGluZSB4MT0iNjUiIHkxPSIxMjMiIHgyPSI5NiIgeTI9IjExOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjY1IiB5MT0iMTMwIiB4Mj0iOTYiIHkyPSIxMjUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIwLjgiIG9wYWNpdHk9IjAuNSIvPgogIDxsaW5lIHgxPSI2NSIgeTE9IjEzNyIgeDI9Ijk2IiB5Mj0iMTMyIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEJvb2sgcGFnZXMgbGluZXMgcmlnaHQgLS0+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEyMyIgeDI9IjEwNCIgeTI9IjExOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEzMCIgeDI9IjEwNCIgeTI9IjEyNSIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEzNyIgeDI9IjEwNCIgeTI9IjEzMiIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPCEtLSBUZXh0IC0tPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTY4IiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMwMGQ0ZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIzIj5JTlNUSVRVVEU8L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSIxODIiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM3ZWNmZWQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxIiBvcGFjaXR5PSIwLjgiPkxPR088L3RleHQ+Cjwvc3ZnPg==" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:none;" alt="Default Logo">
              </div>
              <div>
                <div id="inst-display-name" style="font-size:var(--fs-base);font-weight:700;color:var(--text-white);"></div>
                <div id="inst-display-short" style="font-size:var(--fs-xs);color:var(--neon-blue);margin-top:2px;"></div>
                
              </div>
            </div>

            <!-- Info rows (director, phone, city, address, classes) -->
            <div id="inst-info-rows"></div>

            <!-- Quick link to dedicated Home Page editor -->
            <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border); text-align:center;">
              <button class="btn btn-ghost btn-sm" style="font-size:var(--fs-xs); color:var(--text-muted);"
                      onclick="showAdminPage('a-page-homepage'); loadHomepageEditor()">
                🌐 Edit Home Page →
              </button>
            </div>
          </div>

        </div><!-- end grid-2col -->

        <!-- ⚠️ FIX 5: Student Profile Edit Permission Toggle -->
        <div style="max-width:800px; margin-top:24px;">
          <div class="card">
            <div class="card-title">👤 Student Profile <span>Settings</span></div>
            <div class="info-box" style="margin-bottom:16px;">
              Control whether students can edit their own profile details.<br>
              <strong>Note:</strong> Students cannot change Session, Board, Class, or Roll Number regardless of this setting.
            </div>
            
            <div id="profile-edit-msg"></div>
            
            <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; background:var(--bg-card2); border-radius:var(--radius); border:1px solid var(--border);">
              <div>
                <div style="font-weight:600; font-size:var(--fs-base); margin-bottom:4px;">Allow Students to Edit Profile</div>
                <div style="font-size:var(--fs-xs); color:var(--text-dim);">Students can update: Name, Gender, DOB, Alt Mobile, Parents' Names, Address, Photo</div>
              </div>
              <label class="switch" style="flex-shrink:0;">
                <input type="checkbox" id="allow-profile-edit-toggle" onchange="toggleProfileEditPermission(this.checked)">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div style="max-width:800px; margin-top:24px;">
          <div class="card">
            <div class="card-title">⏱️ Session Timeout <span>Settings</span></div>
            <div class="info-box" style="margin-bottom:20px;">
              Control how long admin and student sessions stay active before auto-logout.
              <strong style="color:#ffb400;"> Minimum allowed: 11 minutes</strong> (to ensure the 10-min warning has time to show).
            </div>

            <div id="session-timeout-msg"></div>

            <div style="display:flex; gap:20px; flex-wrap:wrap;">

              <!-- Admin timeout -->
              <div style="flex:1; min-width:220px;">
                <label style="display:block; font-size:var(--fs-sm); color:var(--text-muted); margin-bottom:8px;">
                  👑 Admin Session Duration
                </label>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <input type="number" id="set-admin-timeout-val" min="1"
                         class="form-control" style="width:90px;"
                         placeholder="e.g. 24">
                  <select id="set-admin-timeout-unit" class="form-control" style="width:110px;">
                    <option value="min">Minutes</option>
                    <option value="hr" selected>Hours</option>
                    <option value="day">Days</option>
                  </select>
                </div>
                <div id="set-admin-current" style="font-size:11px; color:var(--text-dim); margin-top:6px;"></div>
              </div>

              <!-- Student timeout -->
              <div style="flex:1; min-width:220px;">
                <label style="display:block; font-size:var(--fs-sm); color:var(--text-muted); margin-bottom:8px;">
                  🎓 Student Session Duration
                </label>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <input type="number" id="set-student-timeout-val" min="1"
                         class="form-control" style="width:90px;"
                         placeholder="e.g. 3">
                  <select id="set-student-timeout-unit" class="form-control" style="width:110px;">
                    <option value="min">Minutes</option>
                    <option value="hr">Hours</option>
                    <option value="day" selected>Days</option>
                  </select>
                </div>
                <div id="set-student-current" style="font-size:11px; color:var(--text-dim); margin-top:6px;"></div>
              </div>

            </div>

            <button class="btn btn-primary" style="margin-top:20px;" onclick="saveSessionTimeouts()">
              💾 Save Timeout Settings
            </button>
          </div>

          <!-- Feature Controls card -->
          <div class="card" style="grid-column: 1 / -1; margin-top:20px;">
            <div class="card-title">🎛️ Feature <span>Controls</span></div>
            <div style="color:var(--text-muted); font-size:var(--fs-sm); margin-bottom:18px;">
              Enable or disable features for students. Disabled features become
              unclickable in the student sidebar.
            </div>

            <!-- Attendance toggle row -->
            <div style="display:flex; align-items:center; justify-content:space-between;
                        gap:12px; flex-wrap:wrap;
                        padding:14px 16px; background:var(--bg-card2); border-radius:var(--radius);
                        border:1px solid var(--border); margin-bottom:10px;">
              <div style="flex:1; min-width:0;">
                <div style="font-weight:600; color:var(--text-white); margin-bottom:3px;">
                  📊 Attendance Tab
                </div>
                <div style="font-size:var(--fs-xs); color:var(--text-muted); line-height:1.4;">
                  When disabled, students cannot open the Attendance section.
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                <span id="att-feature-label" style="font-size:var(--fs-sm);
                      color:var(--text-muted); white-space:nowrap;">Loading...</span>
                <button id="att-feature-btn" onclick="toggleAttendanceFeature()"
                  style="padding:8px 18px; border-radius:var(--radius-sm);
                         border:none; font-size:var(--fs-sm); font-weight:600;
                         cursor:pointer; transition:all .2s; min-width:80px; white-space:nowrap;">
                  ...
                </button>
              </div>
            </div>

          </div>

        </div><!-- end grid-2col -->

      </div><!-- end a-page-settings -->

      <!-- ============================================================
           HOME PAGE EDITOR PAGE
           ID: a-page-homepage
           A dedicated full-page editor for every visible element on
           the public home page. Divided into 4 clear sections:
             1. Hero — badge text, Hindi slogan, English slogan
             2. Feature Cards — 4 cards × icon + title + desc
             3. Social & Map Links — Maps, YouTube, Google Review
             4. Contact Info — director, phone, address, city (mirrors core)
           All data saved to Firestore admin/institute.
           Each section has its own Save button. Changes are saved per-section to Firestore.
           ============================================================ -->
      <div id="a-page-homepage" class="page">

        <div class="page-header">
          <h1>🌐 <span>Home Page</span> Editor</h1>
          <p style="color:var(--text-muted);">
            Customise every visible element on the public home page.
            Changes are saved to Firestore and applied instantly.
          </p>
        </div>

        <!-- Slim status bar — just shows current edit context, no save button here -->
        <div id="hp-editor-bar" style="
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; flex-wrap:wrap;
          padding:8px 14px; margin-bottom:24px;
          background:var(--bg-card); border:1px solid var(--border);
          border-radius:var(--radius-sm);
        ">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:8px;height:8px;flex-shrink:0;border-radius:50%;background:#00d4ff;
                        box-shadow:0 0 8px #00d4ff;animation:pulse 2s infinite;"></div>
            <span style="font-size:var(--fs-xs);color:var(--text-muted);">
              Editing: <strong style="color:var(--text-white);">Public Home Page</strong>
            </span>
            <span style="font-size:10px;color:var(--text-dim);">— Each section has its own Save button</span>
          </div>
          <!-- Global status message shown by any section save -->
          <div id="hp-editor-msg" style="font-size:var(--fs-xs);display:none;flex-shrink:0;"></div>
        </div>

        <div style="max-width:860px;width:100%;box-sizing:border-box;">

          <!-- ════════════════════════════════════════════════════
               SECTION 1 — HERO BADGE & SLOGANS
               ════════════════════════════════════════════════════ -->
          <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);">
              <div style="font-size:28px;">🎓</div>
              <div>
                <div class="card-title" style="margin:0;">Hero <span>Badge &amp; Slogans</span></div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">
                  The glowing badge and two taglines shown below the logo on the home page
                </div>
              </div>
            </div>

            <!-- Live preview strip -->
            <div style="padding:12px 16px; background:rgba(0,212,255,0.05); border:1px solid rgba(0,212,255,0.15);
                        border-radius:var(--radius-sm); margin-bottom:20px; text-align:center; overflow:hidden;">
              <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Live Preview</div>
              <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:20px;padding:4px 14px;font-size:11px;color:var(--neon-blue);letter-spacing:1px;text-transform:uppercase;font-weight:600;margin-bottom:8px;max-width:100%;flex-wrap:wrap;justify-content:center;word-break:break-word;">
                🎓 <span id="hpe-preview-badge">Secure Learning Platform</span> — <span id="hpe-preview-city">Buxar, Bihar</span>
              </div><br>
              <div id="hpe-preview-hindi" style="font-size:var(--fs-sm);color:var(--text-muted);font-weight:500;word-break:break-word;">आपका भविष्य, हमारी ज़िम्मेदारी</div>
              <div id="hpe-preview-en" style="font-size:12px;color:var(--text-dim);margin-top:2px;word-break:break-word;">Your Future, Our Responsibility</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
              <div class="form-group" style="grid-column:1/-1;">
                <label>🎓 Badge Text
                  <span style="font-size:10px;color:var(--text-dim);font-weight:400;margin-left:6px;">City is appended automatically after " — "</span>
                </label>
                <input class="form-control" id="hpe-badge" placeholder="Secure Learning Platform"
                       oninput="document.getElementById('hpe-preview-badge').textContent=this.value||'...'">
              </div>
              <div class="form-group">
                <label>🇮🇳 Hindi Slogan</label>
                <input class="form-control" id="hpe-slogan-hindi" placeholder="आपका भविष्य, हमारी ज़िम्मेदारी"
                       oninput="document.getElementById('hpe-preview-hindi').textContent=this.value||'...'">
              </div>
              <div class="form-group">
                <label>🇬🇧 English Slogan</label>
                <input class="form-control" id="hpe-slogan-en" placeholder="Your Future, Our Responsibility"
                       oninput="document.getElementById('hpe-preview-en').textContent=this.value||'...'">
              </div>
            </div>

            <!-- Section 1 save button -->
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
              <button class="btn btn-primary btn-sm" id="btn-save-hero"
                      onclick="saveHpSection('hero')" style="min-width:140px;">
                💾 Save Hero &amp; Slogans
              </button>
            </div>
          </div>

          <!-- ════════════════════════════════════════════════════
               SECTION 2 — FEATURE CARDS
               4 cards laid out in a 2×2 grid, each with icon/title/desc
               ════════════════════════════════════════════════════ -->
          <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);">
              <div style="font-size:28px;">🃏</div>
              <div>
                <div class="card-title" style="margin:0;">Feature <span>Cards</span></div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">
                  The 4 cards shown below the CTA buttons on the home page hero section
                </div>
              </div>
            </div>

            <!-- 2×2 card grid — collapses to 1 column on mobile (<600px) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">
              <!-- Card 1 -->
              <div style="padding:14px;background:var(--bg-card2);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="font-size:var(--fs-xs);color:var(--neon-blue);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Card 1</div>
                <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:nowrap;">
                  <div class="form-group" style="width:60px;flex-shrink:0;margin-bottom:0;">
                    <label style="font-size:10px;">Icon</label>
                    <input class="form-control" id="hpe-c1-icon" placeholder="📚"
                           style="text-align:center;font-size:22px;padding:6px 2px;">
                  </div>
                  <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                    <label style="font-size:10px;">Title</label>
                    <input class="form-control" id="hpe-c1-title" placeholder="Study Materials">
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:10px;">Description</label>
                  <textarea class="form-control" id="hpe-c1-desc" rows="3"
                            placeholder="Notes, assignments, DPPs..."></textarea>
                </div>
              </div>

              <!-- Card 2 -->
              <div style="padding:14px;background:var(--bg-card2);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="font-size:var(--fs-xs);color:var(--neon-blue);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Card 2</div>
                <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:nowrap;">
                  <div class="form-group" style="width:60px;flex-shrink:0;margin-bottom:0;">
                    <label style="font-size:10px;">Icon</label>
                    <input class="form-control" id="hpe-c2-icon" placeholder="🎯"
                           style="text-align:center;font-size:22px;padding:6px 2px;">
                  </div>
                  <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                    <label style="font-size:10px;">Title</label>
                    <input class="form-control" id="hpe-c2-title" placeholder="Bihar &amp; CBSE Board">
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:10px;">Description</label>
                  <textarea class="form-control" id="hpe-c2-desc" rows="3"
                            placeholder="Expert preparation..."></textarea>
                </div>
              </div>

              <!-- Card 3 -->
              <div style="padding:14px;background:var(--bg-card2);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="font-size:var(--fs-xs);color:var(--neon-blue);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Card 3</div>
                <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:nowrap;">
                  <div class="form-group" style="width:60px;flex-shrink:0;margin-bottom:0;">
                    <label style="font-size:10px;">Icon</label>
                    <input class="form-control" id="hpe-c3-icon" placeholder="👨‍🏫"
                           style="text-align:center;font-size:22px;padding:6px 2px;">
                  </div>
                  <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                    <label style="font-size:10px;">Title</label>
                    <input class="form-control" id="hpe-c3-title" placeholder="Director">
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:10px;">Description</label>
                  <textarea class="form-control" id="hpe-c3-desc" rows="3"
                            placeholder="10+ years of teaching..."></textarea>
                </div>
              </div>

              <!-- Card 4 -->
              <div style="padding:14px;background:var(--bg-card2);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="font-size:var(--fs-xs);color:var(--neon-blue);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Card 4</div>
                <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:nowrap;">
                  <div class="form-group" style="width:60px;flex-shrink:0;margin-bottom:0;">
                    <label style="font-size:10px;">Icon</label>
                    <input class="form-control" id="hpe-c4-icon" placeholder="🔒"
                           style="text-align:center;font-size:22px;padding:6px 2px;">
                  </div>
                  <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                    <label style="font-size:10px;">Title</label>
                    <input class="form-control" id="hpe-c4-title" placeholder="Secure Portal">
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:10px;">Description</label>
                  <textarea class="form-control" id="hpe-c4-desc" rows="3"
                            placeholder="Only admin-approved students..."></textarea>
                </div>
              </div>

            </div><!-- /2×2 grid -->

            <!-- Section 2 save button -->
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
              <button class="btn btn-primary btn-sm" id="btn-save-cards"
                      onclick="saveHpSection('cards')" style="min-width:140px;">
                💾 Save Feature Cards
              </button>
            </div>
          </div><!-- /feature cards card -->

          <!-- ════════════════════════════════════════════════════
               SECTION 3 — SOCIAL & MAP LINKS
               ════════════════════════════════════════════════════ -->
          <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);">
              <div style="font-size:28px;">🔗</div>
              <div>
                <div class="card-title" style="margin:0;">Social &amp; <span>Map Links</span></div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">
                  The three buttons at the bottom of the Contact section on the home page
                </div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr;gap:16px;">

              <!-- Maps -->
              <div style="display:flex;align-items:flex-start;gap:14px;">
                <div style="width:44px;height:44px;border-radius:10px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);
                            display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📍</div>
                <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                  <label>Google Maps URL
                    <span style="font-size:10px;color:var(--text-dim);font-weight:400;margin-left:6px;">Appears as "Find Us on Google Maps" button</span>
                  </label>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input class="form-control" id="hpe-maps-url" placeholder="https://maps.app.goo.gl/..." type="url" style="flex:1;min-width:0;">
                    <a id="hpe-maps-test" href="#" target="_blank"
                       style="font-size:11px;color:var(--neon-blue);white-space:nowrap;text-decoration:none;padding:8px 10px;border:1px solid rgba(0,212,255,0.3);border-radius:6px;flex-shrink:0;"
                       onclick="this.href=document.getElementById('hpe-maps-url').value||'#'">Test ↗</a>
                  </div>
                </div>
              </div>

              <!-- YouTube -->
              <div style="display:flex;align-items:flex-start;gap:14px;">
                <div style="width:44px;height:44px;border-radius:10px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);
                            display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">▶️</div>
                <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                  <label>YouTube Channel URL
                    <span style="font-size:10px;color:var(--text-dim);font-weight:400;margin-left:6px;">Appears as "Subscribe on YouTube" button</span>
                  </label>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input class="form-control" id="hpe-youtube-url" placeholder="https://www.youtube.com/@..." type="url" style="flex:1;min-width:0;">
                    <a id="hpe-yt-test" href="#" target="_blank"
                       style="font-size:11px;color:#ff4444;white-space:nowrap;text-decoration:none;padding:8px 10px;border:1px solid rgba(255,0,0,0.3);border-radius:6px;flex-shrink:0;"
                       onclick="this.href=document.getElementById('hpe-youtube-url').value||'#'">Test ↗</a>
                  </div>
                </div>
              </div>

              <!-- Google Review -->
              <div style="display:flex;align-items:flex-start;gap:14px;">
                <div style="width:44px;height:44px;border-radius:10px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);
                            display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⭐</div>
                <div class="form-group" style="flex:1;margin-bottom:0;min-width:0;">
                  <label>Google Review URL
                    <span style="font-size:10px;color:var(--text-dim);font-weight:400;margin-left:6px;">Appears as "Rate Us on Google" button</span>
                  </label>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input class="form-control" id="hpe-review-url" placeholder="https://g.page/r/..." type="url" style="flex:1;min-width:0;">
                    <a id="hpe-rev-test" href="#" target="_blank"
                       style="font-size:11px;color:#ffd700;white-space:nowrap;text-decoration:none;padding:8px 10px;border:1px solid rgba(255,215,0,0.3);border-radius:6px;flex-shrink:0;"
                       onclick="this.href=document.getElementById('hpe-review-url').value||'#'">Test ↗</a>
                  </div>
                </div>
              </div>

            </div>

            <!-- Section 3 save button -->
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
              <button class="btn btn-primary btn-sm" id="btn-save-links"
                      onclick="saveHpSection('links')" style="min-width:140px;">
                💾 Save Social Links
              </button>
            </div>
          </div><!-- /social links -->

          <!-- ════════════════════════════════════════════════════
               SECTION 4 — CONTACT INFO
               These mirror the core institute fields — editing here
               updates the same Firestore fields as Settings → Edit
               ════════════════════════════════════════════════════ -->
          <div class="card" style="margin-bottom:28px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);">
              <div style="font-size:28px;">📋</div>
              <div>
                <div class="card-title" style="margin:0;">Contact <span>Info</span></div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">
                  Shown in the Contact section on the home page and in student/print records.
                  These are the same fields as Settings → Institute Info.
                </div>
              </div>
            </div>
            <div style="padding:8px 12px;background:rgba(255,200,0,0.06);border:1px solid rgba(255,200,0,0.25);border-radius:var(--radius-sm);margin-bottom:16px;font-size:var(--fs-xs);color:#ffb400;line-height:1.6;">
              ⚠️ Changing these fields also updates them everywhere else — student portal, admin panel, printed records.
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
              <div class="form-group">
                <label>Director Name <span class="required">*</span></label>
                <input class="form-control" id="hpe-director" placeholder="e.g. Pradeep Kumar">
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input class="form-control" id="hpe-phone" placeholder="e.g. 6206437776" type="tel">
              </div>
              <div class="form-group">
                <label>City</label>
                <input class="form-control" id="hpe-city" placeholder="e.g. Buxar, Bihar"
                       oninput="document.getElementById('hpe-preview-city').textContent=this.value||'...'">
              </div>
              <div class="form-group">
                <label>Classes Offered</label>
                <input class="form-control" id="hpe-classes" placeholder="e.g. Class 6 to 10 (BSEB Bihar Board)">
              </div>
              <div class="form-group" style="grid-column:1/-1;">
                <label>Address</label>
                <textarea class="form-control" id="hpe-address" rows="2"
                          placeholder="Full address e.g. Turha Toli, Civil Line, Buxar — 802101"></textarea>
              </div>
            </div>
            <!-- Section 4 save button -->
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
              <button class="btn btn-primary btn-sm" id="btn-save-contact"
                      onclick="saveHpSection('contact')" style="min-width:140px;">
                💾 Save Contact Info
              </button>
            </div>
          </div><!-- /contact info -->

        </div><!-- /max-width container -->
      </div><!-- end a-page-homepage -->

      <!-- ============================================================
           ATTENDANCE PAGE (ADMIN)
           ID: a-page-attendance
           ============================================================ -->
      <div id="a-page-attendance" class="page">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <h2 style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-xl);font-weight:700;margin-bottom:4px;">
              📊 <span style="color:var(--neon-blue);">Attendance</span> Management
            </h2>
            <p style="font-size:var(--fs-sm);color:var(--text-muted);">Mark and manage class-wise attendance.</p>
          </div>
          <span id="att-sync-badge" style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:var(--fs-xs);font-weight:600;background:rgba(0,255,136,0.1);color:var(--success);border:1px solid rgba(0,255,136,0.3);">✅ Synced</span>
        </div>

        <!-- Leaderboard publish notification -->
        <div id="att-lb-notify" class="hidden" style="margin-bottom:16px;padding:12px 16px;border-radius:var(--radius-sm);display:flex;align-items:flex-start;gap:12px;">
          <div id="att-lb-notify-icon" style="font-size:20px;flex-shrink:0;margin-top:2px;"></div>
          <div>
            <div id="att-lb-notify-title" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);margin-bottom:2px;"></div>
            <div id="att-lb-notify-msg" style="font-size:var(--fs-xs);color:var(--text-muted);line-height:1.5;"></div>
          </div>
        </div>

        <!-- Step Nav -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;" id="att-step-nav">
          <div id="att-step-1-btn" onclick="attAdminGoStep(1)"
            style="padding:6px 16px;border-radius:20px;font-size:var(--fs-sm);background:var(--neon-blue);color:#000;border:1px solid var(--neon-blue);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;">1. Board</div>
          <span style="color:var(--text-dim);">›</span>
          <div id="att-step-2-btn" onclick="attAdminGoStep(2)"
            style="padding:6px 16px;border-radius:20px;font-size:var(--fs-sm);background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;">2. Class</div>
          <span style="color:var(--text-dim);">›</span>
          <div id="att-step-3-btn" onclick="attAdminGoStep(3)"
            style="padding:6px 16px;border-radius:20px;font-size:var(--fs-sm);background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;">3. View</div>
        </div>

        <!-- Step 1: Board -->
        <div id="att-admin-step-1">
          <div class="card">
            <div class="card-title">📋 Select Board</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:8px;">
              <div onclick="attSelectBoard('BSEB')"
                style="background:var(--bg-card2);border:2px solid var(--border);border-radius:var(--radius);padding:20px 16px;text-align:center;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.borderColor='var(--neon-blue)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="font-size:28px;margin-bottom:8px;">📘</div>
                <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-md);">BSEB</div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">Bihar Board</div>
              </div>
              <div onclick="attSelectBoard('CBSE')"
                style="background:var(--bg-card2);border:2px solid var(--border);border-radius:var(--radius);padding:20px 16px;text-align:center;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.borderColor='var(--neon-blue)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="font-size:28px;margin-bottom:8px;">📗</div>
                <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-md);">CBSE</div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">Central Board</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Class -->
        <div id="att-admin-step-2" class="hidden">
          <div class="card">
            <div class="card-title">🏫 Select Class — <span id="att-board-label" style="color:var(--neon-blue);"></span></div>
            <div id="att-class-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:8px;">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Step 3: View -->
        <div id="att-admin-step-3" class="hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
            <div>
              <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;color:var(--neon-blue);" id="att-view-class-title"></div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                <span style="font-size:var(--fs-xs);color:var(--text-muted);">Session:</span>
                <select id="att-session-select"
                  onchange="attChangeSession(this.value)"
                  style="background:var(--bg-card2);border:1px solid var(--border);
                         color:var(--text-white);padding:4px 10px;border-radius:var(--radius-sm);
                         font-size:var(--fs-xs);outline:none;cursor:pointer;">
                </select>
                <span id="att-session-readonly-badge" style="display:none;
                  background:rgba(255,170,0,0.12);border:1px solid #ffaa00;
                  color:#ffaa00;font-size:10px;font-weight:600;
                  padding:2px 8px;border-radius:4px;">👁️ VIEW ONLY</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="attExportPDF()">⬇️ Export PDF</button>
          </div>

          <!-- View Tabs -->
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
            <div id="att-tab-register" onclick="attSwitchView('register')"
              style="padding:8px 18px;border-radius:var(--radius-sm);background:rgba(0,212,255,0.1);border:1px solid var(--neon-blue);color:var(--neon-blue);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-sm);">📋 Register</div>
            <div id="att-tab-summary" onclick="attSwitchView('summary')"
              style="padding:8px 18px;border-radius:var(--radius-sm);background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-sm);">📊 Summary</div>
            <div id="att-tab-calendar" onclick="attSwitchView('calendar')"
              style="padding:8px 18px;border-radius:var(--radius-sm);background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-sm);">📅 Calendar</div>
          </div>

          <!-- Month Nav -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
            <button onclick="attChangeMonth(-1)" style="width:34px;height:34px;border-radius:50%;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:16px;">‹</button>
            <div id="att-month-label" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-md);min-width:130px;text-align:center;"></div>
            <button onclick="attChangeMonth(1)" style="width:34px;height:34px;border-radius:50%;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:16px;">›</button>
          </div>


          <!-- Filters -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
            <select id="att-filter-gender" onchange="attApplyFilters()" style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);padding:7px 12px;border-radius:var(--radius-sm);font-size:var(--fs-sm);outline:none;">
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select id="att-sort-pct" onchange="attApplyFilters()" style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);padding:7px 12px;border-radius:var(--radius-sm);font-size:var(--fs-sm);outline:none;">
              <option value="">Sort by Roll No</option>
              <option value="asc">% Low → High</option>
              <option value="desc">% High → Low</option>
            </select>
            <div style="margin-left:auto;font-size:var(--fs-xs);color:var(--text-muted);">Showing: <span id="att-filter-count">—</span> students</div>
          </div>

          <!-- Legend -->
          <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:12px;font-size:var(--fs-xs);color:var(--text-muted);">
            <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#00ff88;"></div>Present</div>
            <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#ff4466;"></div>Absent</div>
            <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#7a9bba;"></div>Holiday</div>
            <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#ffaa00;"></div>Not Marked</div>
          </div>

          <!-- Register View -->
          <div id="att-register-view">
            <div id="att-reg-loading" class="spinner"></div>
            <div id="att-reg-content" class="hidden" style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);">
              <table id="att-reg-table" style="border-collapse:collapse;min-width:100%;font-size:11px;"></table>
            </div>
            <div id="att-reg-empty" class="hidden info-box">No students found in this class.</div>
          </div>

          <!-- Summary View -->
          <div id="att-summary-view" class="hidden">
            <div id="att-sum-loading" class="spinner"></div>
            <div id="att-sum-content" class="hidden"></div>
            <div id="att-sum-empty" class="hidden info-box">No data available.</div>
          </div>

          <!-- Calendar View -->
          <div id="att-calendar-view" class="hidden">
            <div id="att-cal-loading" class="spinner"></div>
            <div id="att-cal-content" class="hidden">
              <!-- Calendar Legend -->
              <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:12px;font-size:var(--fs-xs);color:var(--text-muted);">
                <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#00ff88;"></div>Open Day</div>
                <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#7a9bba;"></div>Holiday</div>
                <div style="display:flex;align-items:center;gap:5px;"><div style="width:10px;height:10px;border-radius:50%;background:#ffaa00;"></div>Not Marked</div>
              </div>
              <!-- Working days summary -->
              <div id="att-cal-summary" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:var(--fs-xs);">
                <span>📅 Open Days: <strong id="att-cal-open-count" style="color:#00ff88;">0</strong></span>
                <span>🏖️ Holidays: <strong id="att-cal-holiday-count" style="color:#7a9bba;">0</strong></span>
                <span>❓ Not Marked: <strong id="att-cal-nm-count" style="color:#ffaa00;">0</strong></span>
                <span style="margin-left:auto;">Working Days: <strong id="att-cal-working" style="color:var(--neon-blue);">0</strong></span>
              </div>
              <div id="att-cal-grid-wrap" style="margin-top:4px;"></div>
            </div>
          </div>
        </div>

        <!-- Cycle hint instead of popup -->
        <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:6px;">
          💡 Tap a cell to toggle: <span style="color:#ffaa00;">? NM</span> → <span style="color:#00ff88;">✅ P</span> → <span style="color:#ff4466;">❌ A</span> → repeat &nbsp;|&nbsp; <span style="color:#7a9bba;">🏖 H</span> = set from Calendar
          &nbsp;|&nbsp; <span style="opacity:0.4;">—</span> <span style="opacity:0.6;">= Before student's joining date (not applicable)</span>
        </div>

        <!-- Date Mark All Modal (click on date header in Register) -->
        <div id="att-date-mark-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;color:var(--text-white);text-align:center;margin-bottom:14px;">Mark All Students</div>
            <!-- Date display — large and clear -->
            <div style="background:var(--bg-card2);border:2px solid var(--neon-blue);border-radius:var(--radius-sm);padding:14px;text-align:center;margin-bottom:18px;">
              <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:4px;">Selected Date</div>
              <div id="att-dm-date" style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-xl);font-weight:700;color:var(--text-white);letter-spacing:1px;"></div>
              <div id="att-dm-dayname" style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:3px;"></div>
              <div id="att-dm-count" style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:4px;"></div>
            </div>
            <!-- Two options: Present or Absent -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
              <button id="att-dm-btn-P" onclick="attDmSelect('P')"
                style="padding:18px 8px;border-radius:var(--radius-sm);background:rgba(0,255,136,0.06);border:2px solid rgba(0,255,136,0.2);color:rgba(0,255,136,0.5);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-lg);transition:all 0.15s;text-align:center;">
                ✅<br><span style="font-size:var(--fs-sm);">All Present</span>
              </button>
              <button id="att-dm-btn-A" onclick="attDmSelect('A')"
                style="padding:18px 8px;border-radius:var(--radius-sm);background:rgba(255,68,102,0.06);border:2px solid rgba(255,68,102,0.2);color:rgba(255,68,102,0.5);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-lg);transition:all 0.15s;text-align:center;">
                ❌<br><span style="font-size:var(--fs-sm);">All Absent</span>
              </button>
            </div>
            <div style="display:flex;gap:10px;">
              <button onclick="attDmCancel()" style="flex:1;padding:11px;border-radius:var(--radius-sm);background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-base);">Cancel</button>
              <button id="att-dm-save" onclick="attDmSave()" disabled
                style="flex:2;padding:11px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card2);color:var(--text-dim);cursor:not-allowed;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);transition:all 0.2s;">
                Select Present or Absent
              </button>
            </div>
          </div>
        </div>

        <!-- PDF Export Modal -->
        <div id="att-pdf-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:36px;margin-bottom:10px;">📄</div>
              <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;color:var(--text-white);margin-bottom:6px;">Export PDF</div>
              <div style="font-size:var(--fs-sm);color:var(--text-muted);">Choose export range:</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
              <button onclick="attPdfExportRun(true)" style="padding:12px;border-radius:var(--radius-sm);background:rgba(0,212,255,0.1);border:1px solid var(--neon-blue);color:var(--neon-blue);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);">
                📅 Current Month Only
              </button>
              <button onclick="attPdfExportRun(false)" style="padding:12px;border-radius:var(--radius-sm);background:rgba(139,92,246,0.1);border:1px solid var(--purple);color:var(--purple);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);">
                🗓️ Full Session (All Months)
              </button>
              <button onclick="attPdfModalClose()" style="padding:10px;border-radius:var(--radius-sm);background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-sm);">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Calendar Day Confirm Modal -->
        <!-- Day Status Modal (Calendar) -->
        <div id="att-day-status-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;color:var(--text-white);margin-bottom:4px;text-align:center;">Set Day Status</div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center;margin:12px 0 16px;">
              <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:4px;">Selected Date</div>
              <div id="att-ds-date" style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-xl);font-weight:700;color:var(--text-white);"></div>
              <div id="att-ds-dayname" style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:2px;"></div>
              <div id="att-ds-current" style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:4px;"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
              <button onclick="attDsSelect('open')" id="att-ds-btn-open"
                style="padding:14px 16px;border-radius:var(--radius-sm);background:rgba(0,255,136,0.08);border:2px solid rgba(0,255,136,0.25);color:rgba(0,255,136,0.6);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.15s;">
                <span style="font-size:20px;">📗</span>
                <div><div>Open Day</div><div style="font-size:11px;font-weight:400;opacity:0.7;margin-top:2px;">Working day — attendance can be marked</div></div>
              </button>
              <button onclick="attDsSelect('holiday')" id="att-ds-btn-holiday"
                style="padding:14px 16px;border-radius:var(--radius-sm);background:rgba(122,155,186,0.08);border:2px solid rgba(122,155,186,0.25);color:rgba(122,155,186,0.6);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.15s;">
                <span style="font-size:20px;">🏖️</span>
                <div><div>Holiday</div><div style="font-size:11px;font-weight:400;opacity:0.7;margin-top:2px;">All students auto-marked H, register locked</div></div>
              </button>
              <button onclick="attDsSelect('nm')" id="att-ds-btn-nm"
                style="padding:14px 16px;border-radius:var(--radius-sm);background:rgba(255,170,0,0.08);border:2px solid rgba(255,170,0,0.2);color:rgba(255,170,0,0.5);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.15s;">
                <span style="font-size:20px;">❓</span>
                <div><div>Not Marked</div><div style="font-size:11px;font-weight:400;opacity:0.7;margin-top:2px;">Reset to default — register locked</div></div>
              </button>
            </div>
            <div style="display:flex;gap:10px;">
              <button onclick="attDsCancel()" style="flex:1;padding:10px;border-radius:var(--radius-sm);background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-base);">Cancel</button>
              <button id="att-ds-save" onclick="attDsSave()" disabled style="flex:2;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card2);color:var(--text-dim);cursor:not-allowed;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);transition:all 0.2s;">Select a status first</button>
            </div>
          </div>
        </div>

      </div><!-- end a-page-attendance -->

      <!-- ADMIN LEADERBOARD PAGE -->
      <div id="a-page-leaderboard" class="page" style="padding-bottom:24px;">

        <div class="page-header">
          <h1>🏆 <span>Leaderboard</span></h1>
          <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:4px;">Rankings across attendance, exams, and more.</p>
        </div>

        <!-- Category tabs -->
        <div style="display:flex;gap:0;margin-bottom:24px;border-bottom:2px solid var(--border);">
          <div id="alb-cat-attendance" onclick="aLbSwitchCategory('attendance')"
            style="padding:10px 14px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);
                   cursor:pointer;color:var(--neon-blue);border-bottom:3px solid var(--neon-blue);
                   margin-bottom:-2px;transition:all 0.15s;white-space:nowrap;">
            📊 Attendance Rankings
          </div>
          <div id="alb-cat-exam" onclick="aLbSwitchCategory('exam')"
            style="padding:10px 14px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);
                   cursor:pointer;color:var(--text-dim);border-bottom:3px solid transparent;
                   margin-bottom:-2px;transition:all 0.15s;position:relative;white-space:nowrap;">
            📝 Exam Rankings
            <span style="font-size:9px;font-weight:700;background:rgba(255,170,0,0.15);border:1px solid #ffaa00;
                         color:#ffaa00;padding:1px 5px;border-radius:4px;margin-left:4px;vertical-align:middle;">SOON</span>
          </div>
        </div>

        <!-- Attendance Rankings Panel -->
        <div id="alb-panel-attendance">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
            <select id="alb-session-select" onchange="aLbLoad()"
              style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);
                     padding:8px 12px;border-radius:var(--radius-sm);font-size:var(--fs-sm);outline:none;cursor:pointer;">
            </select>
            <div style="display:flex;gap:6px;">
              <button id="alb-tab-month" onclick="aLbSwitchTab('month')"
                style="padding:8px 16px;border-radius:var(--radius-sm);font-family:'Rajdhani',sans-serif;
                       font-weight:600;font-size:var(--fs-sm);cursor:pointer;
                       border:1px solid var(--neon-blue);background:rgba(0,212,255,0.1);color:var(--neon-blue);">
                📅 This Month
              </button>
              <button id="alb-tab-overall" onclick="aLbSwitchTab('overall')"
                style="padding:8px 16px;border-radius:var(--radius-sm);font-family:'Rajdhani',sans-serif;
                       font-weight:600;font-size:var(--fs-sm);cursor:pointer;
                       border:1px solid var(--border);background:var(--bg-card2);color:var(--text-muted);">
                🗓️ Overall
              </button>
            </div>
            <div id="alb-month-nav" style="display:flex;align-items:center;gap:8px;">
              <button onclick="aLbChangeMonth(-1)"
                style="width:32px;height:32px;border-radius:50%;background:var(--bg-card2);
                       border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:16px;">&#8249;</button>
              <div id="alb-month-label"
                style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);
                       min-width:120px;text-align:center;color:var(--text-white);"></div>
              <button onclick="aLbChangeMonth(1)"
                style="width:32px;height:32px;border-radius:50%;background:var(--bg-card2);
                       border:1px solid var(--border);color:var(--text-white);cursor:pointer;font-size:16px;">&#8250;</button>
            </div>
            <select id="alb-class-filter" onchange="aLbRender()"
              style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-white);
                     padding:8px 12px;border-radius:var(--radius-sm);font-size:var(--fs-sm);outline:none;cursor:pointer;">
              <option value="">All Classes</option>
            </select>
          </div>
          <div id="alb-loading" style="text-align:center;padding:40px;color:var(--text-muted);">
            <div class="spinner" style="margin:0 auto 12px;"></div>
            Loading leaderboard...
          </div>
          <div id="alb-empty" class="hidden" style="text-align:center;padding:40px;">
            <div style="font-size:40px;margin-bottom:12px;">🏆</div>
            <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-md);font-weight:700;
                        color:var(--text-white);margin-bottom:8px;">No leaderboard data yet</div>
            <div style="font-size:var(--fs-sm);color:var(--text-muted);line-height:1.6;" id="alb-empty-msg">
              Monthly leaderboards publish automatically on the 1st of each month.
            </div>
          </div>
          <div id="alb-content" class="hidden"></div>
        </div>

        <!-- Exam Rankings Panel -->
        <div id="alb-panel-exam" class="hidden" style="text-align:center;padding:60px 24px;">
          <div style="font-size:56px;margin-bottom:16px;">📝</div>
          <div style="font-family:'Rajdhani',sans-serif;font-size:var(--fs-lg);font-weight:700;
                      color:var(--text-white);margin-bottom:10px;">Exam Rankings</div>
          <div style="font-size:var(--fs-sm);color:var(--text-muted);max-width:340px;
                      margin:0 auto 20px;line-height:1.7;">
            Term-wise marks leaderboard will appear here once the Exam Records feature is added.
          </div>
          <div style="display:inline-block;background:rgba(255,170,0,0.1);border:1px solid #ffaa00;
                      color:#ffaa00;font-weight:600;font-size:var(--fs-sm);
                      padding:10px 24px;border-radius:var(--radius-sm);">
            🚧 Coming Soon
          </div>
        </div>

      </div><!-- end a-page-leaderboard -->

      <!-- ================================================
           ID: a-page-notifications
      ================================================== -->
      <div id="a-page-notifications" class="page" style="padding-bottom:24px;">
        <div class="page-header">
          <h1 class="page-title">🔔 Student Edit Notifications</h1>
        </div>

        <!-- Filters -->
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px; align-items:center;">
          <!-- Time filter -->
          <div style="display:flex; gap:6px;">
            <button id="notif-filter-all" onclick="notifSetFilter('all')"
              class="btn btn-sm btn-primary" style="font-size:12px;">All</button>
            <button id="notif-filter-today" onclick="notifSetFilter('today')"
              class="btn btn-sm btn-ghost" style="font-size:12px;">Today</button>
            <button id="notif-filter-month" onclick="notifSetFilter('month')"
              class="btn btn-sm btn-ghost" style="font-size:12px;">This Month</button>
          </div>
          <!-- Class filter -->
          <select id="notif-filter-class" onchange="notifApplyFilters()"
            style="background:var(--bg-card2);border:1px solid var(--border);
            color:var(--text-white);border-radius:var(--radius-sm);
            padding:6px 10px;font-size:12px;cursor:pointer;">
            <option value="all">All Classes</option>
            <option value="6">Class 6</option>
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
          </select>
          <!-- Mark all read -->
          <button onclick="notifMarkAllRead()"
            class="btn btn-sm btn-ghost" style="font-size:12px; margin-left:auto;">
            ✅ Mark All Read
          </button>
        </div>

        <!-- Notification list -->
        <div id="notif-list" style="display:flex; flex-direction:column; gap:10px;">
          <div style="text-align:center; color:var(--text-dim); padding:40px 0;">
            Loading notifications...
          </div>
        </div>
      </div><!-- end a-page-notifications -->

    </main><!-- end admin main-content -->
  </div><!-- end admin app-layout -->
  </div><!-- end admin-dashboard-area -->


  <!-- =====================================================
       ADMIN MODALS
       All popup dialogs for admin actions
       ===================================================== -->

  <!-- Modal: Add New Class -->
  <div class="modal-overlay" id="modal-add-class">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">🎓 Add New Class</div>
        <button class="modal-close" onclick="closeModal('modal-add-class')">✕</button>
      </div>
      <div class="form-group">
        <label>Board <span class="required">*</span></label>
        <select class="form-control" id="new-class-board">
          <option value="BSEB">📘 BSEB (Bihar Board)</option>
          <option value="CBSE">📗 CBSE</option>
        </select>
      </div>
      <div class="form-group">
        <label>Class Name <span class="required">*</span></label>
        <input class="form-control" id="new-class-name"
               placeholder="e.g. Class 11, Special Batch, JEE Foundation">
      </div>
      <div class="form-group">
        <label>Display Order</label>
        <input class="form-control" id="new-class-order" type="number"
               placeholder="e.g. 1, 2, 3 (for sorting)" value="10">
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal('modal-add-class')">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="handleAddClass()">
          ➕ Add Class
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Rename Class -->
  <div class="modal-overlay" id="modal-rename-class">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">✏️ Rename Class</div>
        <button class="modal-close" onclick="closeModal('modal-rename-class')">✕</button>
      </div>
      <input type="hidden" id="rename-class-id">
      <div class="form-group">
        <label>New Class Name <span class="required">*</span></label>
        <input class="form-control" id="rename-class-name" placeholder="New class name">
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal('modal-rename-class')">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="handleRenameClass()">
          ✏️ Rename
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Add Notice -->
  <div class="modal-overlay" id="modal-add-notice">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">📢 Post New Notice</div>
        <button class="modal-close" onclick="closeModal('modal-add-notice')">✕</button>
      </div>
      <div class="form-group">
        <label>Notice Title <span class="required">*</span></label>
        <input class="form-control" id="notice-title"
               placeholder="e.g. Exam Schedule — March 2025">
      </div>
      <div class="form-group">
        <label>Message <span class="required">*</span></label>
        <textarea class="form-control" id="notice-message"
                  placeholder="Write the full announcement here..."
                  rows="5"></textarea>
      </div>
      <div class="form-group">
        <label>Importance Level</label>
        <select class="form-control" id="notice-importance">
          <option value="normal">📌 Normal</option>
          <option value="important">⚠️ Important</option>
          <option value="urgent">🚨 Urgent</option>
        </select>
      </div>

      <div class="form-group">
        <label>Visible On</label>
        <div style="display:flex; gap:16px; margin-top:6px; flex-wrap:wrap;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;
                        background:var(--bg-card2); border:1px solid var(--border);
                        border-radius:var(--radius-sm); padding:10px 16px; flex:1;
                        transition:border-color 0.2s;"
                 id="notice-vis-home-label">
            <input type="checkbox" id="notice-vis-home" checked
                   onchange="document.getElementById('notice-vis-home-label').style.borderColor = this.checked ? 'var(--neon-blue)' : 'var(--border)'"
                   style="width:16px;height:16px;accent-color:var(--neon-blue);cursor:pointer;">
            <span>
              <span style="font-size:15px;">🌐</span>
              <strong style="color:var(--text-white);margin-left:4px;">Home Page</strong>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Visible to everyone publicly</div>
            </span>
          </label>
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;
                        background:var(--bg-card2); border:1px solid var(--neon-blue);
                        border-radius:var(--radius-sm); padding:10px 16px; flex:1;
                        transition:border-color 0.2s;"
                 id="notice-vis-dash-label">
            <input type="checkbox" id="notice-vis-dashboard" checked
                   onchange="document.getElementById('notice-vis-dash-label').style.borderColor = this.checked ? 'var(--neon-blue)' : 'var(--border)'"
                   style="width:16px;height:16px;accent-color:var(--neon-blue);cursor:pointer;">
            <span>
              <span style="font-size:15px;">🎓</span>
              <strong style="color:var(--text-white);margin-left:4px;">Student Dashboard</strong>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Only registered students</div>
            </span>
          </label>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">
          ℹ️ At least one must be selected.
        </div>
      </div>

      <!-- Target Classes section -->
      <div class="form-group">
        <label>Target Classes
          <span style="font-size:11px;font-weight:400;color:var(--text-dim);margin-left:6px;">
            (leave unselected = visible to all classes)
          </span>
        </label>
        <div id="notice-class-loading" style="font-size:var(--fs-sm);color:var(--text-dim);margin-top:6px;">
          Loading classes...
        </div>
        <div id="notice-class-grid" style="display:none;margin-top:8px;"></div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">
          💡 Select specific classes to restrict this notice. Class-targeted notices are hidden from the public Home Page.
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal('modal-add-notice')">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="handleAddNotice()">
          📢 Post Notice
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Edit Notice -->
  <div class="modal-overlay" id="modal-edit-notice">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">✏️ Edit Notice</div>
        <button class="modal-close" onclick="closeModal('modal-edit-notice')">✕</button>
      </div>
      <input type="hidden" id="edit-notice-id">
      <input type="hidden" id="edit-notice-isPublic">
      <div class="form-group">
        <label>Notice Title <span class="required">*</span></label>
        <input class="form-control" id="edit-notice-title">
      </div>
      <div class="form-group">
        <label>Message <span class="required">*</span></label>
        <textarea class="form-control" id="edit-notice-message" rows="5"></textarea>
      </div>
      <div class="form-group">
        <label>Importance Level</label>
        <select class="form-control" id="edit-notice-importance">
          <option value="normal">📌 Normal</option>
          <option value="important">⚠️ Important</option>
          <option value="urgent">🚨 Urgent</option>
        </select>
      </div>

      <div class="form-group">
        <label>Visible On</label>
        <div style="display:flex; gap:16px; margin-top:6px; flex-wrap:wrap;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;
                        background:var(--bg-card2); border:1px solid var(--neon-blue);
                        border-radius:var(--radius-sm); padding:10px 16px; flex:1;
                        transition:border-color 0.2s;"
                 id="edit-notice-vis-home-label">
            <input type="checkbox" id="edit-notice-vis-home" checked
                   onchange="document.getElementById('edit-notice-vis-home-label').style.borderColor = this.checked ? 'var(--neon-blue)' : 'var(--border)'"
                   style="width:16px;height:16px;accent-color:var(--neon-blue);cursor:pointer;">
            <span>
              <span style="font-size:15px;">🌐</span>
              <strong style="color:var(--text-white);margin-left:4px;">Home Page</strong>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Visible to everyone publicly</div>
            </span>
          </label>
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;
                        background:var(--bg-card2); border:1px solid var(--neon-blue);
                        border-radius:var(--radius-sm); padding:10px 16px; flex:1;
                        transition:border-color 0.2s;"
                 id="edit-notice-vis-dash-label">
            <input type="checkbox" id="edit-notice-vis-dashboard" checked
                   onchange="document.getElementById('edit-notice-vis-dash-label').style.borderColor = this.checked ? 'var(--neon-blue)' : 'var(--border)'"
                   style="width:16px;height:16px;accent-color:var(--neon-blue);cursor:pointer;">
            <span>
              <span style="font-size:15px;">🎓</span>
              <strong style="color:var(--text-white);margin-left:4px;">Student Dashboard</strong>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Only registered students</div>
            </span>
          </label>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">
          ℹ️ At least one must be selected.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal('modal-edit-notice')">
          Cancel
        </button>
        <button class="btn btn-primary" onclick="handleEditNotice()">
          💾 Save Changes
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: View Student Details -->
  <div class="modal-overlay" id="modal-view-student">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">👤 Student Details</div>
        <button class="modal-close" onclick="closeModal('modal-view-student')">✕</button>
      </div>
      <div id="view-student-content"></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal('modal-view-student')">
          Close
        </button>
      </div>
    </div>
  </div>

  `); // end insertAdjacentHTML
}


// =============================================================
// SHOW ADMIN PAGE
// Switches between admin dashboard pages
// =============================================================
function showAdminPage(pageId, addHistory = true) {
  // Remove active from ALL admin pages (some may be outside #dashboard-area)
  document.querySelectorAll('#admin-dashboard-area .page').forEach(p => {
    p.classList.remove('active');
  });
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  document.querySelectorAll('#admin-sidebar .nav-item').forEach(n => {
    n.classList.toggle('active', n.getAttribute('data-page') === pageId);
  });

  document.getElementById('admin-sidebar')?.classList.remove('mobile-open');
  const bd3=document.getElementById('sidebar-backdrop'); if(bd3) bd3.style.display='none';

  if (addHistory) {
    history.pushState({ page: pageId, area: 'admin' }, '', `#${pageId}`);
  }
}


// =============================================================
// HOME PAGE EDITOR — DEDICATED PAGE (a-page-homepage)
// Loads current values from _instituteData (or INST_DEFAULTS)
// into the standalone editor fields, and saves them back via
// saveHpSection(). Completely separate from the Institute
// Info modal to keep the UI clean and uncluttered.
// =============================================================

/** Pre-fill all Home Page Editor fields — fetches from Firestore if data not yet loaded */
async function loadHomepageEditor() {
  // If institute data isn't loaded yet, fetch it now (fixes logo missing on first load)
  if (!window._instituteData) {
    await loadInstituteInfo();
  }
  const d = window._instituteData || INST_DEFAULTS;

  // ── Hero / badge / slogans ────────────────────────────────
  const badge = d.hpBadge || INST_DEFAULTS.hpBadge;
  const hi    = d.hpSloganHindi || INST_DEFAULTS.hpSloganHindi;
  const en    = d.hpSloganEn    || INST_DEFAULTS.hpSloganEn;

  setVal('hpe-badge',        badge);
  setVal('hpe-slogan-hindi', hi);
  setVal('hpe-slogan-en',    en);

  // Live preview
  setText('hpe-preview-badge',  badge);
  setText('hpe-preview-city',   d.city || INST_DEFAULTS.city);
  setText('hpe-preview-hindi',  hi);
  setText('hpe-preview-en',     en);

  // ── Feature cards ─────────────────────────────────────────
  setVal('hpe-c1-icon',  d.hpCard1Icon  || INST_DEFAULTS.hpCard1Icon);
  setVal('hpe-c1-title', d.hpCard1Title || INST_DEFAULTS.hpCard1Title);
  setVal('hpe-c1-desc',  d.hpCard1Desc  || INST_DEFAULTS.hpCard1Desc);

  setVal('hpe-c2-icon',  d.hpCard2Icon  || INST_DEFAULTS.hpCard2Icon);
  setVal('hpe-c2-title', d.hpCard2Title || INST_DEFAULTS.hpCard2Title);
  setVal('hpe-c2-desc',  d.hpCard2Desc  || INST_DEFAULTS.hpCard2Desc);

  setVal('hpe-c3-icon',  d.hpCard3Icon  || INST_DEFAULTS.hpCard3Icon);
  setVal('hpe-c3-title', d.hpCard3Title || INST_DEFAULTS.hpCard3Title);
  setVal('hpe-c3-desc',  d.hpCard3Desc  || INST_DEFAULTS.hpCard3Desc);

  setVal('hpe-c4-icon',  d.hpCard4Icon  || INST_DEFAULTS.hpCard4Icon);
  setVal('hpe-c4-title', d.hpCard4Title || INST_DEFAULTS.hpCard4Title);
  setVal('hpe-c4-desc',  d.hpCard4Desc  || INST_DEFAULTS.hpCard4Desc);

  // ── Social / map links ────────────────────────────────────
  setVal('hpe-maps-url',    d.hpMapsUrl    || INST_DEFAULTS.hpMapsUrl);
  setVal('hpe-youtube-url', d.hpYoutubeUrl || INST_DEFAULTS.hpYoutubeUrl);
  setVal('hpe-review-url',  d.hpReviewUrl  || INST_DEFAULTS.hpReviewUrl);

  // ── Contact / core fields ─────────────────────────────────
  setVal('hpe-director', d.director || INST_DEFAULTS.director);
  setVal('hpe-phone',    d.phone    || INST_DEFAULTS.phone);
  setVal('hpe-city',     d.city     || INST_DEFAULTS.city);
  setVal('hpe-address',  d.address  || INST_DEFAULTS.address);
  setVal('hpe-classes',  d.classes  || INST_DEFAULTS.classes);

  // Hide any previous status message
  const msg = document.getElementById('hp-editor-msg');
  if (msg) msg.style.display = 'none';
}


/** Show a status message in the slim editor bar */
function showHpEditorMsg(text, type) {
  const el = document.getElementById('hp-editor-msg');
  if (!el) return;
  el.textContent = text;
  el.style.cssText = `display:block; font-size:var(--fs-xs); font-weight:600;
    color:${type === 'success' ? '#00d4ff' : 'var(--danger)'};`;
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 4000);
}

/** Per-section save — only saves fields belonging to the requested section.
 *  section: 'hero' | 'cards' | 'links' | 'contact'
 *  Always spreads ...window._instituteData so other sections aren't lost. */
async function saveHpSection(section) {
  // Map section → button ID
  const btnIds = { hero:'btn-save-hero', cards:'btn-save-cards', links:'btn-save-links', contact:'btn-save-contact' };
  const btn = document.getElementById(btnIds[section]);
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }

  // Build partial update from only this section's fields
  let partial = {};

  if (section === 'hero') {
    partial = {
      hpBadge:       getVal('hpe-badge')        || INST_DEFAULTS.hpBadge,
      hpSloganHindi: getVal('hpe-slogan-hindi')  || INST_DEFAULTS.hpSloganHindi,
      hpSloganEn:    getVal('hpe-slogan-en')     || INST_DEFAULTS.hpSloganEn,
    };
  } else if (section === 'cards') {
    partial = {
      hpCard1Icon:  getVal('hpe-c1-icon')  || INST_DEFAULTS.hpCard1Icon,
      hpCard1Title: getVal('hpe-c1-title') || INST_DEFAULTS.hpCard1Title,
      hpCard1Desc:  getVal('hpe-c1-desc')  || INST_DEFAULTS.hpCard1Desc,
      hpCard2Icon:  getVal('hpe-c2-icon')  || INST_DEFAULTS.hpCard2Icon,
      hpCard2Title: getVal('hpe-c2-title') || INST_DEFAULTS.hpCard2Title,
      hpCard2Desc:  getVal('hpe-c2-desc')  || INST_DEFAULTS.hpCard2Desc,
      hpCard3Icon:  getVal('hpe-c3-icon')  || INST_DEFAULTS.hpCard3Icon,
      hpCard3Title: getVal('hpe-c3-title') || INST_DEFAULTS.hpCard3Title,
      hpCard3Desc:  getVal('hpe-c3-desc')  || INST_DEFAULTS.hpCard3Desc,
      hpCard4Icon:  getVal('hpe-c4-icon')  || INST_DEFAULTS.hpCard4Icon,
      hpCard4Title: getVal('hpe-c4-title') || INST_DEFAULTS.hpCard4Title,
      hpCard4Desc:  getVal('hpe-c4-desc')  || INST_DEFAULTS.hpCard4Desc,
    };
  } else if (section === 'links') {
    partial = {
      hpMapsUrl:    getVal('hpe-maps-url')    || INST_DEFAULTS.hpMapsUrl,
      hpYoutubeUrl: getVal('hpe-youtube-url') || INST_DEFAULTS.hpYoutubeUrl,
      hpReviewUrl:  getVal('hpe-review-url')  || INST_DEFAULTS.hpReviewUrl,
    };
  } else if (section === 'contact') {
    const director = getVal('hpe-director') || INST_DEFAULTS.director;
    if (!director.trim()) {
      showHpEditorMsg('⚠️ Director name is required.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      return;
    }
    partial = {
      director,
      phone:   getVal('hpe-phone')    || INST_DEFAULTS.phone,
      city:    getVal('hpe-city')     || INST_DEFAULTS.city,
      address: getVal('hpe-address')  || INST_DEFAULTS.address,
      classes: getVal('hpe-classes')  || INST_DEFAULTS.classes,
    };
  }

  try {
    // Merge with existing data so logo / other sections aren't lost
    const updated = { ...window._instituteData, ...partial };
    await db.collection('admin').doc('institute').set(updated);
    window._instituteData = updated;

    // Push to live DOM
    applyInstituteDataEverywhere(updated);
    renderInstituteInfoCard();

    // Show success on the button itself (green flash)
    if (btn) {
      btn.textContent = '✅ Saved!';
      btn.style.background = '#00a86b';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = origText;
        btn.style.background = '';
      }, 2000);
    }
    showHpEditorMsg('✅ Saved!', 'success');
    showToast('✅ Saved!', 'success');
  } catch (err) {
    showHpEditorMsg('❌ Save failed. Check connection.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = origText; }
    console.error('saveHpSection error:', err);
  }
}

/** Safe value getter for form fields */
function getVal(id) {
  return (document.getElementById(id)?.value || '').trim();
}

/** Safe value setter for form fields (input + textarea) */
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}
async function initAdminDashboard() {
  // Check unread notification count for badge
  setTimeout(_notifCheckUnread, 1500); // slight delay to let Firebase connect
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  buildAdminDashboardHTML();

  // ── Load institute info FIRST (awaited) so logo + name appear immediately ──
  // This prevents the "logo missing on first load, shows after refresh" bug.
  await loadInstituteInfo();

  document.getElementById('admin-dashboard-area').style.display = 'block';

  // Push initial history state so back button works from the start
  history.replaceState({ page: 'a-page-home', area: 'admin' }, '', '#a-page-home'); // replace login entry — back button won't return to login

  // Load all dashboard data
  loadAdminStats();
  loadAdminHomePending();
  loadClassesIntoAdminDropdowns();

  console.log('✅ Admin dashboard initialized');
}


// =============================================================
// LOAD ADMIN STATS (counts for stat cards)
// =============================================================
async function loadAdminStats() {
  try {
    const studentsSnap  = await db.collection('students').get();
    const materialsSnap = await db.collection('materials').get();

    let total = 0, pending = 0, active = 0;
    studentsSnap.forEach(doc => {
      total++;
      const s = doc.data();
      if (s.status === 'pending')  pending++;
      if (s.status === 'approved') active++;
    });

    // Update stat cards
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('a-stat-total',     total);
    set('a-stat-pending',   pending);
    set('a-stat-active',    active);
    set('a-stat-materials', materialsSnap.size);

    // Update pending badge in sidebar
    const badge = document.getElementById('pending-badge');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }

  } catch (err) {
    console.error('Admin stats error:', err);
    showToast('Could not load stats. Check internet.', 'error');
  }
}


// =============================================================
// LOAD HOME DASHBOARD — recent pending students (last 5)
// =============================================================
async function loadAdminHomePending() {
  const container = document.getElementById('a-home-pending');
  if (!container) return;
  try {
    let snap;
    try {
      snap = await db.collection('students')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    } catch(indexErr) {
      // Fallback: no orderBy
      snap = await db.collection('students')
        .where('status', '==', 'pending')
        .limit(10)
        .get();
    }

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px;">
          <div class="empty-state-icon" style="font-size:32px;">✅</div>
          <p>No pending approvals. All students are reviewed!</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Mobile</th><th>Class</th>
              <th>Registered</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${snap.docs.map(doc => {
              const s = doc.data();
              return `<tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.mobile}</td>
                <td><span class="badge badge-blue">${getClassName(s.class)}</span></td>
                <td>${formatDate(s.createdAt)}</td>
                <td style="display:flex; gap:6px;">
                  <button class="btn btn-success btn-sm"
                          onclick="approveStudent('${doc.id}')">
                    ✅ Approve
                  </button>
                  <button class="btn btn-danger btn-sm"
                          onclick="rejectStudent('${doc.id}', '${s.name.replace(/'/g,"\\'")}')">
                    ❌ Reject
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-ghost btn-sm"
                onclick="showAdminPage('a-page-pending'); loadPendingStudents()">
          View All Pending →
        </button>
      </div>`;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted);">Could not load data.</p>';
  }
}


// =============================================================
// LOAD ALL PENDING STUDENTS (full page)
// =============================================================
async function loadPendingStudents() {
  const container = document.getElementById('a-pending-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';

  try {
    // Ensure class name map is loaded
    if (!window._classNameMap) {
      const classSnap = await db.collection('classes').get();
      window._classNameMap = {};
      classSnap.forEach(doc => {
        window._classNameMap[doc.id] = doc.data().name || doc.id;
      });
    }

    const snap = await (async () => {
      try {
        return await db.collection('students').where('status','==','pending').orderBy('createdAt','desc').get();
      } catch(e) {
        return await db.collection('students').where('status','==','pending').get();
      }
    })();

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h3>No Pending Approvals</h3>
          <p>All student registrations have been reviewed.</p>
        </div>`;
      return;
    }

    container.innerHTML = snap.docs.map(doc => {
      const s = doc.data();
      const className = getClassName(s.class);
      const studentId = s.studentId || doc.id;
      return `
        <div class="card" style="margin-bottom:14px;">
          <div class="pending-card-row" style="display:flex; justify-content:space-between;
                      align-items:flex-start; flex-wrap:wrap; gap:14px;">
            <div style="display:flex; gap:16px; align-items:flex-start;">
              <div style="
                width:48px; height:48px; border-radius:50%;
                background:rgba(0,212,255,0.1);
                border:1px solid rgba(0,212,255,0.3);
                display:flex; align-items:center; justify-content:center;
                font-size:20px; flex-shrink:0;
              ">${s.photo ? `<img src="${s.photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">` : '👤'}</div>
              <div>
                <div style="font-weight:700; font-size:var(--fs-md);
                            margin-bottom:4px;">${s.name}</div>
                <div style="font-size:var(--fs-xs); color:var(--neon-blue);
                            margin-bottom:6px; font-weight:600;">
                  🆔 ${studentId}
                </div>
                <!-- Row 1: mobile, class, board, roll, registration date -->
                <div style="display:flex; gap:8px; flex-wrap:wrap;
                            font-size:var(--fs-xs); color:var(--text-muted); margin-bottom:6px;">
                  <span>📱 ${s.mobile}</span>
                  ${s.altMobile ? `<span>📱 Alt: ${s.altMobile}</span>` : ''}
                  <span>🎓 ${className}</span>
                  <span class="badge ${(s.board||'BSEB')==='CBSE' ? 'badge-green' : 'badge-blue'}" style="font-size:10px;">${(s.board||'BSEB')==='CBSE' ? '📗 CBSE' : '📘 BSEB'}</span>
                  ${s.roll ? `<span>🔢 Roll: ${s.roll}</span>` : ''}
                  <span>📅 ${formatDate(s.createdAt)}</span>
                </div>
                <!-- Row 2: gender, dob, father, mother -->
                <div style="display:flex; gap:8px; flex-wrap:wrap;
                            font-size:var(--fs-xs); color:var(--text-muted); margin-bottom:6px;">
                  ${s.gender ? `<span>⚧ ${s.gender}</span>` : ''}
                  ${s.dob ? `<span>🎂 ${s.dob}</span>` : ''}
                  ${s.fatherName ? `<span>👨 ${s.fatherName}</span>` : ''}
                  ${s.motherName ? `<span>👩 ${s.motherName}</span>` : ''}
                </div>
                <!-- Row 3: address -->
                ${s.address ? `<div style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:2px; line-height:1.4;">📍 ${s.address}</div>` : ''}
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <span class="badge badge-orange">⏳ Pending</span>
              <button class="btn btn-ghost btn-sm"
                      onclick="viewPendingStudentDetails('${doc.id}')"
                      title="View full details">
                👁️ View
              </button>
              <button class="btn btn-success btn-sm"
                      onclick="approveStudent('${doc.id}')">
                ✅ Approve
              </button>
              <button class="btn btn-danger btn-sm"
                      onclick="rejectStudent('${doc.id}','${s.name.replace(/'/g,"\\'")}')">
                ❌ Reject
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div class="info-box">Could not load pending students.</div>';
  }
}


// =============================================================
// VIEW PENDING STUDENT DETAILS (opens modal with FULL form data)
// ⚠️ FIX: Now shows ALL registration fields
// =============================================================
async function viewPendingStudentDetails(mobile) {
  try {
    const doc = await db.collection('students').doc(mobile).get();
    if (!doc.exists) {
      showToast('Student not found.', 'error');
      return;
    }
    
    const s = doc.data();
    const className = getClassName(s.class);
    
    const modalHTML = `
      <div id="modal-view-pending-student" class="modal-overlay">
        <div class="modal" style="max-width:700px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header">
            <h3 class="modal-title">📋 Student Registration Details</h3>
            <button class="btn btn-ghost btn-sm" onclick="closeModal('modal-view-pending-student')" style="margin-left:auto;">✕</button>
          </div>
          <div class="modal-body">
            ${s.photo ? `
              <div style="text-align:center; margin-bottom:20px;">
                <img src="${s.photo}" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid var(--neon-blue);">
              </div>` : `
              <div style="text-align:center; margin-bottom:20px;">
                <div style="width:120px; height:120px; border-radius:50%; background:var(--bg-card2); border:3px solid var(--border); margin:0 auto; display:flex; align-items:center; justify-content:center; font-size:48px;">👤</div>
              </div>`}
            
            <div style="display:grid; gap:16px;">
              
              <!-- Session, Board, Class, Roll -->
              <div style="background:var(--bg-card2); padding:16px; border-radius:12px; border:1px solid var(--border);">
                <div style="color:var(--text-dim); font-size:10px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; font-weight:600;">Academic Details</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div>
                    <div style="color:var(--text-muted); font-size:11px; margin-bottom:3px;">Session</div>
                    <div style="font-weight:600; color:var(--neon-blue);">${s.session || '—'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-muted); font-size:11px; margin-bottom:3px;">Board</div>
                    <div style="font-weight:600;">${(s.board||'BSEB')==='CBSE' ? '📗 CBSE' : '📘 BSEB'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-muted); font-size:11px; margin-bottom:3px;">Class</div>
                    <div style="font-weight:600;">${className}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-muted); font-size:11px; margin-bottom:3px;">Roll Number</div>
                    <div style="font-weight:600;">${s.roll || '—'}</div>
                  </div>
                </div>
              </div>
              
              <!-- Student ID -->
              <div class="form-group">
                <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Student ID</label>
                <div style="font-weight:600; font-size:var(--fs-base); color:var(--neon-blue);">${s.studentId || mobile}</div>
              </div>
              
              <!-- Full Name -->
              <div class="form-group">
                <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Full Name</label>
                <div style="font-weight:600; font-size:var(--fs-md);">${s.name}</div>
              </div>
              
              <!-- Gender & DOB -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div class="form-group">
                  <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Gender</label>
                  <div style="font-weight:600;">${s.gender || '—'}</div>
                </div>
                <div class="form-group">
                  <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Date of Birth</label>
                  <div style="font-weight:600;">${formatDOB(s.dob)}</div>
                </div>
              </div>
              
              <!-- Mobile Numbers -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div class="form-group">
                  <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Mobile Number</label>
                  <div style="font-weight:600;">${s.mobile}</div>
                </div>
                <div class="form-group">
                  <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Alt. Mobile</label>
                  <div style="font-weight:600;">${s.altMobile || '—'}</div>
                </div>
              </div>
              
              <!-- Father & Mother Name -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div class="form-group">
                  <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Father's Name</label>
                  <div style="font-weight:600;">${s.fatherName || '—'}</div>
                </div>
                <div class="form-group">
                  <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Mother's Name</label>
                  <div style="font-weight:600;">${s.motherName || '—'}</div>
                </div>
              </div>
              
              <!-- Address -->
              <div class="form-group">
                <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Address</label>
                <div style="font-weight:600; line-height:1.6; white-space:pre-wrap;">${s.address || '—'}</div>
              </div>
              
              <!-- Registration Date -->
              <div class="form-group">
                <label style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px;">Registration Date</label>
                <div style="font-weight:600;">${formatDate(s.createdAt)}</div>
              </div>
              
              <!-- Status Badge -->
              <div style="background:rgba(255,180,0,0.1); border-left:3px solid var(--warning); padding:14px; border-radius:10px; margin-top:4px;">
                <div style="color:var(--warning); font-weight:600; font-size:var(--fs-sm); margin-bottom:4px;">⏳ Pending Approval</div>
                <div style="color:var(--text-muted); font-size:var(--fs-xs); line-height:1.5;">This student is waiting for admin approval to access the portal. Review all details carefully before approving.</div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="gap:10px;">
            <button class="btn btn-ghost" onclick="closeModal('modal-view-pending-student')">Close</button>
            <button class="btn btn-danger" onclick="closeModal('modal-view-pending-student'); rejectStudent('${mobile}','${s.name.replace(/'/g,"\\'")}')">❌ Reject</button>
            <button class="btn btn-success" onclick="closeModal('modal-view-pending-student'); approveStudent('${mobile}')">✅ Approve</button>
          </div>
        </div>
      </div>`;
    
    // Remove existing modal if any
    const existing = document.getElementById('modal-view-pending-student');
    if (existing) existing.remove();
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    openModal('modal-view-pending-student');
    
  } catch (err) {
    console.error('Error loading student details:', err);
    showToast('Could not load student details. Please try again.', 'error');
  }
}


// =============================================================
// APPROVE STUDENT
// Sets status to 'approved' — student can now login
// =============================================================
async function approveStudent(mobile) {
  try {
    await db.collection('students').doc(mobile).update({ status: 'approved' });
    showToast('✅ Student approved! They can now login.', 'success');
    loadPendingStudents();
    loadAdminStats();
    loadAdminHomePending();
    loadAllStudents(); // Fix: refresh All Students table so status updates instantly
  } catch (err) {
    showToast('Failed to approve. Please try again.', 'error');
    console.error('Approve error:', err);
  }
}


// =============================================================
// REJECT STUDENT
// Sets status to 'rejected' — student cannot login
// =============================================================
function rejectStudent(docId, name) {
  window._pendingRejectId   = docId;
  window._pendingRejectName = name;
  document.getElementById('reject-student-name').textContent = name;
  openModal('modal-reject-student');
}

async function executeRejectStudent() {
  const docId = window._pendingRejectId;
  const name  = window._pendingRejectName;
  if (!docId) return;
  const btn = document.getElementById('reject-confirm-btn');
  btn.disabled = true; btn.textContent = 'Rejecting...';
  try {
    await db.collection('students').doc(docId).update({ status: 'rejected' });
    closeModal('modal-reject-student');
    showToast(`Registration rejected for ${name}.`, 'warning');
    loadPendingStudents(); loadAdminStats(); loadAdminHomePending(); loadAllStudents();
  } catch (err) {
    showToast('Failed to reject. Try again.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = '❌ Reject';
  }
}


// =============================================================
// LOAD ALL STUDENTS (full table with search/filter)
// =============================================================
async function loadAllStudents() {
  const tbody = document.getElementById('a-students-tbody');
  if (!tbody) return;

  try {
    // Load class name map first: { "class-cbse-class-9-xxx": "Class 9", ... }
    const classSnap = await db.collection('classes').get();
    window._classNameMap = {};
    classSnap.forEach(doc => {
      window._classNameMap[doc.id] = doc.data().name || doc.id;
    });

    const snap = await db.collection('students')
      .orderBy('createdAt', 'desc')
      .get();

    // Store only approved students (pending go to Pending Approvals tab)
    window._allStudents = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s => s.status !== 'pending');

    renderStudentsTable(window._allStudents);
    loadClassFilterDropdown();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;
      color:var(--text-muted);">Could not load students.</td></tr>`;
  }
}


// Helper: get class display name from doc ID
// e.g. "class-cbse-class-9-1772711310827" → "Class 9"
// Falls back to the stored name field or the ID itself
function getClassName(classId) {
  if (!classId) return '—';
  if (window._classNameMap && window._classNameMap[classId]) {
    return window._classNameMap[classId];
  }
  // Fallback: try to extract from ID pattern "class-X" → "Class X"
  const simple = classId.match(/^class-(\d+)$/);
  if (simple) return `Class ${simple[1]}`;
  return classId;
}

// =============================================================
// RENDER STUDENTS TABLE (called by filter functions too)
// ⚠️ SORTING: Class DESC (10→9→8) + Roll ASC (1→51) within class
// =============================================================
function renderStudentsTable(students) {
  const tbody = document.getElementById('a-students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;
      padding:32px; color:var(--text-muted);">No students found.</td></tr>`;
    return;
  }

  // Sort: Extract class number, sort DESC, then by roll ASC
  const sorted = students.slice().sort((a, b) => {
    // Extract class number from class name
    const getClassNum = (s) => {
      const className = getClassName(s.class);
      const match = className.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };
    
    const classA = getClassNum(a);
    const classB = getClassNum(b);
    
    // Class DESC (10 first, then 9, 8...)
    if (classA !== classB) return classB - classA;
    
    // Within same class: Roll ASC (1, 2, 3...)
    const rollA = parseInt(a.roll) || 999;
    const rollB = parseInt(b.roll) || 999;
    return rollA - rollB;
  });

  students = sorted; // Use sorted array

  const statusBadge = {
    approved: '<span class="badge badge-green">✅ Active</span>',
    pending:  '<span class="badge badge-orange">⏳ Pending</span>',
    inactive: '<span class="badge badge-gray">⛔ Inactive</span>',
    rejected: '<span class="badge badge-red">❌ Rejected</span>',
  };

  tbody.innerHTML = students.map(s => {
    // Build 3-dot dropdown items based on status
    let dropdownItems = `
      <div class="std-action-item" onclick="closeAllStudentDropdowns(); openEditStudentModal('${s.id}')">
        ✏️ Edit
      </div>`;

    if (s.status === 'pending') {
      dropdownItems += `
      <div class="std-action-item std-action-success" onclick="closeAllStudentDropdowns(); approveStudent('${s.id}')">
        ✅ Approve
      </div>
      <div class="std-action-item std-action-danger" onclick="closeAllStudentDropdowns(); rejectStudent('${s.id}','${s.name.replace(/'/g,"\\'")}')">
        ❌ Reject
      </div>`;
    }
    if (s.status === 'approved') {
      dropdownItems += `
      <div class="std-action-item std-action-warning" onclick="closeAllStudentDropdowns(); deactivateStudent('${s.id}','${s.name.replace(/'/g,"\\'")}')">
        ⛔ Deactivate
      </div>`;
    }
    if (s.status === 'inactive') {
      dropdownItems += `
      <div class="std-action-item std-action-success" onclick="closeAllStudentDropdowns(); reactivateStudent('${s.id}')">
        ✅ Activate
      </div>`;
    }
    dropdownItems += `
      <div class="std-action-divider"></div>
      <div class="std-action-item std-action-danger" onclick="closeAllStudentDropdowns(); deleteStudent('${s.id}','${s.name.replace(/'/g,"\\'")}')">
        🗑️ Delete
      </div>`;

    return `
    <tr>
      <td><span class="badge badge-blue">${getClassName(s.class)}</span></td>
      <td style="font-weight:600;text-align:center;">${s.roll || '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          ${s.photo
            ? `<img src="${s.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:32px;height:32px;border-radius:50%;background:var(--bg-card2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">👤</div>`}
          <div>
            <strong>${s.name}</strong>
            <div style="font-size:var(--fs-xs);color:var(--text-dim);">${s.father ? 'S/O '+s.father : ''}</div>
          </div>
        </div>
      </td>
      <td>${s.mobile || '—'}</td>
      <td>
        <span class="badge ${(s.board||'BSEB')==='CBSE' ? 'badge-green' : 'badge-blue'}" style="font-size:10px;">
          ${(s.board||'BSEB')==='CBSE' ? '📗 CBSE' : '📘 BSEB'}
        </span>
      </td>
      <td><span class="badge badge-blue" style="font-size:10px;">${s.session || '—'}</span></td>
      <td style="font-size:var(--fs-xs);color:var(--text-dim);">${formatDate(s.createdAt)}</td>
      <td>${statusBadge[s.status] || statusBadge.pending}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="viewStudentDetails('${s.id}')">
            👁️ View
          </button>
          <div class="std-action-wrap" style="position:relative;">
            <button class="btn btn-ghost btn-sm std-dot-btn"
                    onclick="toggleStudentDropdown(event,'dd-${s.id}')"
                    title="More actions">⋮</button>
            <div id="dd-${s.id}" class="std-action-dropdown" style="display:none;">
              ${dropdownItems}
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}


function handleEditPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const msgEl = document.getElementById('edit-s-photo-msg');

  // Type check
  if (!file.type.startsWith('image/')) {
    msgEl.style.display = 'block';
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = '⚠️ Only image files (JPG, PNG) are allowed.';
    input.value = ''; return;
  }

  // 3MB size check (before compression)
  if (file.size > 3 * 1024 * 1024) {
    msgEl.style.display = 'block';
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = '⚠️ Photo too large! Maximum size is 3MB. Please choose a smaller image.';
    input.value = ''; return;
  }

  msgEl.style.display = 'block';
  msgEl.style.color = 'var(--text-muted)';
  msgEl.textContent = '⏳ Compressing photo...';

  compressPhoto(file).then(compressed => {
    window._editPhotoData = compressed;
    const preview = document.getElementById('edit-s-photo-preview');
    if (preview) preview.src = compressed;
    const removeBtn = document.getElementById('edit-s-remove-photo-btn');
    if (removeBtn) removeBtn.style.display = 'inline-flex';

    // Show before/after size
    const origKB  = (file.size / 1024).toFixed(0);
    const compKB  = Math.round(compressed.length * 0.75 / 1024); // approx base64 to bytes
    msgEl.style.color = 'var(--success)';
    msgEl.textContent = `✅ Compressed: ${origKB}KB → ~${compKB}KB`;
  }).catch(() => {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = '⚠️ Could not process photo. Try another image.';
    input.value = '';
  });
}

function removeAdminEditPhoto() {
  window._editPhotoData = '';
  const preview = document.getElementById('edit-s-photo-preview');
  if (preview) preview.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="40" r="22" fill="%23334"/><ellipse cx="50" cy="85" rx="35" ry="25" fill="%23334"/></svg>';
  const removeBtn = document.getElementById('edit-s-remove-photo-btn');
  if (removeBtn) removeBtn.style.display = 'none';
  ['edit-s-camera-input','edit-s-gallery-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const msgEl = document.getElementById('edit-s-photo-msg');
  if (msgEl) msgEl.style.display = 'none';
}

// =============================================================
// EDIT STUDENT (admin side)
// Session, Board, Class, Roll are protected — cannot be edited
// =============================================================
function openEditStudentModal(docId) {
  const student = window._allStudents?.find(s => s.id === docId);
  if (!student) { showToast('Student not found.', 'error'); return; }

  window._editingStudentId = docId;
  window._editPhotoData = student.photo || ''; // track current photo

  // Set photo preview
  const photoPreview = document.getElementById('edit-s-photo-preview');
  const removeBtn = document.getElementById('edit-s-remove-photo-btn');
  if (photoPreview) {
    photoPreview.src = student.photo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="40" r="22" fill="%23334"/><ellipse cx="50" cy="85" rx="35" ry="25" fill="%23334"/></svg>';
  }
  if (removeBtn) removeBtn.style.display = student.photo ? 'inline-flex' : 'none';
  // Reset file inputs and message
  ['edit-s-camera-input','edit-s-gallery-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const msgEl = document.getElementById('edit-s-photo-msg');
  if (msgEl) msgEl.style.display = 'none';

  // Populate protected (read-only) fields
  document.getElementById('edit-s-session').textContent = student.session || '—';
  document.getElementById('edit-s-board').textContent   = student.board   || 'BSEB';
  document.getElementById('edit-s-class').textContent   = getClassName(student.class);
  document.getElementById('edit-s-roll').textContent    = student.roll    || '—';

  // Populate editable fields
  document.getElementById('edit-s-name').value      = student.name      || '';
  document.getElementById('edit-s-gender').value    = student.gender    || '';
  document.getElementById('edit-s-dob').value       = student.dob       || '';
  document.getElementById('edit-s-mobile').value    = student.mobile    || '';
  document.getElementById('edit-s-alt-mobile').value= student.altMobile || '';
  document.getElementById('edit-s-password').value  = student.password  || '';
  document.getElementById('edit-s-father').value    = student.father    || '';
  document.getElementById('edit-s-mother').value    = student.mother    || '';
  document.getElementById('edit-s-address').value   = student.address   || '';

  document.getElementById('edit-s-msg').innerHTML = '';
  openModal('modal-edit-student');
}

async function saveStudentEdits() {
  const docId = window._editingStudentId;
  if (!docId) return;

  const name     = document.getElementById('edit-s-name').value.trim();
  const gender   = document.getElementById('edit-s-gender').value.trim();
  const dob      = document.getElementById('edit-s-dob').value.trim();
  const mobile   = document.getElementById('edit-s-mobile').value.trim();
  const altMobile= document.getElementById('edit-s-alt-mobile').value.trim();
  const password = document.getElementById('edit-s-password').value.trim();
  const father   = document.getElementById('edit-s-father').value.trim();
  const mother   = document.getElementById('edit-s-mother').value.trim();
  const address  = document.getElementById('edit-s-address').value.trim();
  const msgEl    = document.getElementById('edit-s-msg');

  // Validation
  if (!name)     { msgEl.innerHTML = '<div class="info-box" style="color:var(--danger);">Name is required.</div>'; return; }
  if (!mobile)   { msgEl.innerHTML = '<div class="info-box" style="color:var(--danger);">Mobile is required.</div>'; return; }
  if (!password) { msgEl.innerHTML = '<div class="info-box" style="color:var(--danger);">Password is required.</div>'; return; }

  const btn = document.getElementById('edit-s-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const updateData = {
      name, gender, dob, mobile, altMobile, password, father, mother, address,
      photo: window._editPhotoData || ''
    };
    await db.collection('students').doc(docId).update(updateData);

    // Update local cache so table reflects changes immediately
    const idx = window._allStudents.findIndex(s => s.id === docId);
    if (idx !== -1) {
      Object.assign(window._allStudents[idx], updateData);
    }

    // If this is the currently logged-in student, update their live session too
    if (AppState.currentUser && AppState.currentUser.id === docId) {
      Object.assign(AppState.currentUser, updateData);
      // Update sidebar photo immediately
      const sidebarPhoto = document.getElementById('s-sidebar-photo');
      if (sidebarPhoto) {
        sidebarPhoto.src = window._editPhotoData || '';
        sidebarPhoto.style.display = window._editPhotoData ? 'block' : 'none';
      }
      const sidebarEmoji = document.getElementById('s-sidebar-emoji');
      if (sidebarEmoji) sidebarEmoji.style.display = window._editPhotoData ? 'none' : 'inline';
    }

    closeModal('modal-edit-student');
    showToast(`✅ ${name}'s details updated successfully.`, 'success');
    filterStudentsTable();

  } catch (err) {
    msgEl.innerHTML = '<div class="info-box" style="color:var(--danger);">Failed to save. Please try again.</div>';
    console.error('Edit student error:', err);
  } finally {
    btn.disabled = false; btn.textContent = '💾 Save Changes';
  }
}


// =============================================================
// PRINT STUDENT LIST — A4 Black & White
// Prints currently filtered students
// =============================================================
function printStudentList() {
  if (!window._allStudents || window._allStudents.length === 0) {
    showToast('No students to print.', 'error'); return;
  }

  const q        = document.getElementById('student-search-input')?.value.toLowerCase() || '';
  const boards   = getMsValues('ms-board');
  const sessions = getMsValues('ms-session');
  const classes  = getMsValues('ms-class');
  const genders  = getMsValues('ms-gender');
  const statuses = getMsValues('ms-status');

  const students = window._allStudents.filter(s => {
    const matchQ  = !q               || s.name.toLowerCase().includes(q) || (s.mobile||'').includes(q) || String(s.roll||'').includes(q);
    const matchB  = boards.length   === 0 || boards.includes(s.board || 'BSEB');
    const matchSe = sessions.length === 0 || sessions.includes(s.session);
    const matchC  = classes.length  === 0 || classes.includes(s.class);
    const matchG  = genders.length  === 0 || genders.includes(s.gender);
    const matchSt = statuses.length === 0 || statuses.includes(s.status);
    return matchQ && matchB && matchSe && matchC && matchG && matchSt;
  });

  if (students.length === 0) {
    showToast('No students match current filters.', 'error'); return;
  }

  const filterParts = [];
  if (boards.length)   filterParts.push(`Board: ${boards.join(', ')}`);
  if (sessions.length) filterParts.push(`Session: ${sessions.join(', ')}`);
  if (classes.length)  filterParts.push(`Class: ${classes.map(c => getClassName(c)).join(', ')}`);
  if (genders.length)  filterParts.push(`Gender: ${genders.join(', ')}`);
  if (statuses.length) filterParts.push(`Status: ${statuses.join(', ')}`);
  if (q)               filterParts.push(`Search: "${q}"`);
  const filterDesc = filterParts.length ? filterParts.join(' | ') : 'All Students';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

  const rows = students.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.board || 'BSEB'}</td>
      <td>${getClassName(s.class)}</td>
      <td>${s.roll || '—'}</td>
      <td>${s.name}</td>
      <td>${s.gender || '—'}</td>
      <td>${s.dob || '—'}</td>
      <td>${s.mobile || '—'}</td>
      <td>${s.altMobile || '—'}</td>
      <td>${s.father || '—'}</td>
      <td>${s.mother || '—'}</td>
      <td>${s.address || '—'}</td>
      <td>${s.session || '—'}</td>
      <td>${s.status}</td>
    </tr>
  `).join('');

  const printHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>BCI Student List</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 8px; color: #000; background: #fff; }
    .header { text-align:center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .header h1 { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
    .header h2 { font-size: 11px; font-weight: normal; margin-top: 2px; }
    .meta { display:flex; justify-content:space-between; font-size:8px; margin-bottom:8px; }
    .meta span { font-weight: bold; }
    table { width:100%; border-collapse: collapse; }
    th { background: #000; color: #fff; padding: 4px 3px; text-align:left; font-size:7px; text-transform:uppercase; letter-spacing:0.3px; }
    td { padding: 3px; border-bottom: 1px solid #ccc; font-size:7.5px; vertical-align:top; word-break:break-word; }
    tr:nth-child(even) td { background: #f5f5f5; }
    .footer { margin-top:12px; text-align:center; font-size:7px; color:#555; border-top:1px solid #ccc; padding-top:6px; }
    @page { size: A4 landscape; margin: 10mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${((window._instituteData||INST_DEFAULTS).name||'').toUpperCase()} (${(window._instituteData||INST_DEFAULTS).shortName}) — ${(window._instituteData||INST_DEFAULTS).city}</h1>
    <h2>${(window._instituteData||INST_DEFAULTS).address} | Contact: ${(window._instituteData||INST_DEFAULTS).phone}</h2>
  </div>
  <div class="meta">
    <div>Filter: <span>${filterDesc}</span></div>
    <div>Total Students: <span>${students.length}</span></div>
    <div>Printed on: <span>${dateStr}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Board</th><th>Class</th><th>Roll</th>
        <th>Full Name</th><th>Gender</th><th>DOB</th>
        <th>Mobile</th><th>Alt. Mobile</th><th>Father's Name</th>
        <th>Mother's Name</th><th>Address</th><th>Session</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    ${(window._instituteData||INST_DEFAULTS).name}, ${(window._instituteData||INST_DEFAULTS).city} — Confidential Student Record — ${dateStr}
  </div>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=800');
  win.document.write(printHTML);
  win.document.close();
}

// =============================================================
// MULTI-SELECT DROPDOWN TOGGLE + OUTSIDE CLICK CLOSE
// =============================================================
function toggleMsDropdown(id) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;
  const isOpen = dropdown.style.display === 'block';
  // Close all open dropdowns first
  document.querySelectorAll('.ms-dropdown').forEach(d => d.style.display = 'none');
  dropdown.style.display = isOpen ? 'none' : 'block';
}

// Close all multi-select dropdowns when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.ms-wrap')) {
    document.querySelectorAll('.ms-dropdown').forEach(d => d.style.display = 'none');
  }
});

// Helper: get checked values from a multi-select dropdown
function getMsValues(dropdownId) {
  return Array.from(
    document.querySelectorAll(`#${dropdownId} input[type="checkbox"]:checked`)
  ).map(cb => cb.value);
}

// Helper: update button label based on selected count
function updateMsLabel(labelId, allText, selected) {
  const el = document.getElementById(labelId);
  const btn = el?.closest('.ms-btn');
  if (!el) return;
  if (selected.length === 0) {
    el.textContent = allText;
    btn?.classList.remove('ms-active');
  } else if (selected.length === 1) {
    el.textContent = selected[0];
    btn?.classList.add('ms-active');
  } else {
    el.textContent = `${selected.length} selected`;
    btn?.classList.add('ms-active');
  }
}

// =============================================================
// FILTER STUDENTS TABLE
// =============================================================
function filterStudentsTable() {
  if (!window._allStudents) return;
  const q       = document.getElementById('student-search-input')?.value.toLowerCase() || '';
  const boards  = getMsValues('ms-board');
  const sessions= getMsValues('ms-session');
  const classes = getMsValues('ms-class');
  const genders = getMsValues('ms-gender');
  const statuses= getMsValues('ms-status');

  // Update all button labels
  updateMsLabel('ms-board-label',   'All Boards',   boards);
  updateMsLabel('ms-session-label', 'All Sessions', sessions);
  updateMsLabel('ms-class-label',   'All Classes',  classes.map(c => getClassName(c)));
  updateMsLabel('ms-gender-label',  'All Genders',  genders);
  updateMsLabel('ms-status-label',  'All Status',   statuses);

  const filtered = window._allStudents.filter(s => {
    const matchQ  = !q               || s.name.toLowerCase().includes(q) || (s.mobile||'').includes(q) || String(s.roll||'').includes(q);
    const matchB  = boards.length   === 0 || boards.includes(s.board || 'BSEB');
    const matchSe = sessions.length === 0 || sessions.includes(s.session);
    const matchC  = classes.length  === 0 || classes.includes(s.class);
    const matchG  = genders.length  === 0 || genders.includes(s.gender);
    const matchSt = statuses.length === 0 || statuses.includes(s.status);
    return matchQ && matchB && matchSe && matchC && matchG && matchSt;
  });

  renderStudentsTable(filtered);

  const countEl = document.getElementById('student-filter-count');
  if (countEl) {
    const total = window._allStudents.length;
    countEl.textContent = filtered.length === total
      ? `${total} students`
      : `${filtered.length} of ${total} students`;
  }
}

function resetStudentFilters() {
  // Clear search
  const searchEl = document.getElementById('student-search-input');
  if (searchEl) searchEl.value = '';
  // Uncheck all multi-select checkboxes
  ['ms-board','ms-session','ms-class','ms-gender','ms-status'].forEach(id => {
    document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(cb => cb.checked = false);
  });
  // Reset all labels
  updateMsLabel('ms-board-label',   'All Boards',   []);
  updateMsLabel('ms-session-label', 'All Sessions', []);
  updateMsLabel('ms-class-label',   'All Classes',  []);
  updateMsLabel('ms-gender-label',  'All Genders',  []);
  updateMsLabel('ms-status-label',  'All Status',   []);
  filterStudentsTable();
}


// =============================================================
// LOAD CLASS & SESSION FILTER DROPDOWNS in students table
// =============================================================
async function loadClassFilterDropdown() {
  // Load classes into multi-select
  const classOpts = document.getElementById('ms-class-options');
  if (classOpts) {
    try {
      const snap = await db.collection('classes').orderBy('order').get();
      let html = '';
      snap.docs.filter(d => !d.data().board || d.data().board === 'BSEB').forEach(doc => {
        html += `<label class="ms-item"><input type="checkbox" value="${doc.id}" onchange="filterStudentsTable()"> [BSEB] ${doc.data().name}</label>`;
      });
      snap.docs.filter(d => d.data().board === 'CBSE').forEach(doc => {
        html += `<label class="ms-item"><input type="checkbox" value="${doc.id}" onchange="filterStudentsTable()"> [CBSE] ${doc.data().name}</label>`;
      });
      classOpts.innerHTML = html || '<div style="padding:8px;color:var(--text-muted);font-size:var(--fs-xs);">No classes found</div>';
    } catch {
      classOpts.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:var(--fs-xs);">Could not load</div>';
    }
  }

  // Load sessions into multi-select
  const sesOpts = document.getElementById('ms-session-options');
  if (sesOpts) {
    try {
      const snap = await db.collection('sessions').orderBy('createdAt','desc').get();
      let html = '';
      snap.forEach(doc => {
        html += `<label class="ms-item"><input type="checkbox" value="${doc.id}" onchange="filterStudentsTable()"> ${doc.id}</label>`;
      });
      sesOpts.innerHTML = html || '<div style="padding:8px;color:var(--text-muted);font-size:var(--fs-xs);">No sessions</div>';
    } catch {
      sesOpts.innerHTML = `<label class="ms-item"><input type="checkbox" value="2026-27" onchange="filterStudentsTable()"> 2026-27</label>`;
    }
  }

  // Update count
  const countEl = document.getElementById('student-filter-count');
  if (countEl && window._allStudents) {
    countEl.textContent = `${window._allStudents.length} students`;
  }
}


// =============================================================
// VIEW STUDENT DETAILS (popup modal)
// =============================================================
// 3-dot dropdown helpers for All Students table
function toggleStudentDropdown(e, id) {
  e.stopPropagation();
  const dd = document.getElementById(id);
  if (!dd) return;
  const isOpen = dd.style.display === 'block';
  closeAllStudentDropdowns();
  if (!isOpen) dd.style.display = 'block';
}
function closeAllStudentDropdowns() {
  document.querySelectorAll('.std-action-dropdown').forEach(d => d.style.display = 'none');
}
// Close dropdown when clicking anywhere else
document.addEventListener('click', closeAllStudentDropdowns);

function viewStudentDetails(mobile) {
  const student = window._allStudents?.find(s => s.id === mobile);
  if (!student) return;

  document.getElementById('view-student-content').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="text-align:center; margin-bottom:12px;">
        ${student.photo ? `
          <!-- Photo circle — tappable for fullscreen -->
          <div style="position:relative; display:inline-block;">
            <img id="admin-view-photo-img"
                 src="${student.photo}"
                 onclick="adminViewPhotoFullscreen('${student.photo}', '${student.name.replace(/'/g, "\\'")}')"
                 style="width:96px;height:96px;border-radius:50%;object-fit:cover;
                         border:2px solid var(--neon-blue);margin:0 auto;display:block;
                         cursor:pointer;box-shadow:0 0 12px rgba(0,212,255,0.3);">
            <div onclick="adminViewPhotoFullscreen('${student.photo}', '${student.name.replace(/'/g, "\\'")}')"
                 style="font-size:10px;color:var(--neon-blue);margin-top:4px;
                         cursor:pointer;letter-spacing:0.5px;">👁 View Full</div>
          </div>
          <!-- Download button -->
          <div style="margin-top:10px;">
            <button onclick="adminDownloadPhoto('${student.photo}', '${student.name.replace(/'/g, "\\'")}')"
                    class="btn btn-outline btn-sm"
                    style="font-size:12px;gap:6px;">
              ⬇️ Download Photo
            </button>
          </div>
        ` : `
          <div style="width:96px;height:96px;border-radius:50%;
                      background:var(--bg-card2);border:2px solid var(--border);
                      display:flex;align-items:center;justify-content:center;
                      font-size:40px;margin:0 auto;">👤</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">No photo uploaded</div>
        `}
      </div>
      ${[
        { icon:'🆔', label:'Student ID',      val: `<strong style="color:var(--neon-blue);">${student.studentId || student.id}</strong>` },
        { icon:'📅', label:'Session',         val: student.session || '—' },
        { icon:'📋', label:'Board',           val: student.board || 'BSEB' },
        { icon:'🎓', label:'Class',           val: getClassName(student.class) },
        { icon:'🔢', label:'Roll Number',     val: student.roll    || '—' },
        { icon:'👤', label:'Full Name',       val: student.name },
        { icon:'⚧',  label:'Gender',          val: student.gender  || '—' },
        { icon:'🎂', label:'Date of Birth',   val: formatDOB(student.dob) },
        { icon:'📱', label:'Mobile',          val: student.mobile },
        { icon:'📱', label:'Alt. Mobile',     val: student.altMobile || '—' },
        { icon:'🔒', label:'Password',        val: `
            <span id="view-pwd-text" style="letter-spacing:3px;">••••••••</span>
            <button onclick="toggleViewPassword('${student.password}')"
                    id="view-pwd-btn"
                    style="margin-left:10px; background:var(--bg-card2); border:1px solid var(--border);
                           color:var(--text-muted); border-radius:4px; padding:2px 8px;
                           font-size:var(--fs-xs); cursor:pointer;">
              👁️ Show
            </button>` },
        { icon:'👨', label:"Father's Name",   val: student.father  || '—' },
        { icon:'👩', label:"Mother's Name",   val: student.mother  || '—' },
        { icon:'📍', label:'Address',         val: student.address || '—' },
        { icon:'📅', label:'Registered',      val: formatDate(student.createdAt) },
        { icon:'📊', label:'Status',          val: student.status },
      ].map(item => `
        <div style="display:flex; gap:12px; padding-bottom:12px;
                    border-bottom:1px solid var(--border);">
          <span style="font-size:16px; width:24px; flex-shrink:0;">${item.icon}</span>
          <div>
            <div style="font-size:var(--fs-xs); color:var(--text-dim);
                        text-transform:uppercase; letter-spacing:0.5px;">
              ${item.label}
            </div>
            <div style="font-size:var(--fs-base); color:var(--text-white);
                        font-weight:500; margin-top:2px;">
              ${item.val}
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;

  openModal('modal-view-student');
}


// =============================================================
// ADMIN — VIEW STUDENT PHOTO FULLSCREEN (WhatsApp DP style)
// =============================================================
function adminViewPhotoFullscreen(src, studentName) {
  if (!src) return;
  const size = 'min(80vw, 80vh)';

  const overlay = document.createElement('div');
  overlay.id = 'admin-photo-fullscreen-overlay';
  overlay.style.cssText = [
    'position:fixed','top:0;left:0;right:0;bottom:0','z-index:9999',
    'background:rgba(0,0,0,0.92)',
    'display:flex','flex-direction:column',
    'align-items:center','justify-content:center',
    'animation:fadeIn 0.2s ease'
  ].join(';');

  overlay.innerHTML =
    '<div style="position:relative;display:inline-block;">' +
      '<div style="' +
        'width:' + size + ';height:' + size + ';' +
        'border-radius:50%;overflow:hidden;' +
        'border:3px solid var(--neon-blue);' +
        'box-shadow:0 0 40px rgba(0,212,255,0.4),0 0 80px rgba(0,212,255,0.15);' +
      '">' +
        '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;">' +
      '</div>' +
      '<button id="admin-photo-close-btn" ' +
        'style="position:absolute;top:-8px;right:-8px;width:34px;height:34px;' +
        'border-radius:50%;background:var(--bg-card);border:1px solid var(--border-bright);' +
        'color:var(--text-white);font-size:16px;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.5);">✕</button>' +
    '</div>' +
    '<div style="color:var(--text-white);font-size:14px;font-weight:600;margin-top:16px;">' + studentName + '</div>' +
    '<div style="display:flex;gap:12px;margin-top:12px;">' +
      '<button id="admin-photo-download-btn" ' +
        'style="background:rgba(0,212,255,0.1);border:1px solid var(--neon-blue);' +
        'color:var(--neon-blue);padding:8px 20px;border-radius:20px;' +
        'font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;">' +
        '⬇️ Download Photo' +
      '</button>' +
    '</div>' +
    '<p style="color:var(--text-dim);font-size:12px;margin-top:12px;">Tap anywhere to close</p>';

  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.tagName === 'P') overlay.remove();
  });
  document.body.appendChild(overlay);

  document.getElementById('admin-photo-close-btn').addEventListener('click', () => overlay.remove());
  document.getElementById('admin-photo-download-btn').addEventListener('click', () => {
    adminDownloadPhoto(src, studentName);
  });
}

// =============================================================
// ADMIN — DOWNLOAD STUDENT PHOTO
// Works on both PC (saves file) and Android (opens in browser)
// =============================================================
function adminDownloadPhoto(src, studentName) {
  if (!src) { showToast('No photo to download.', 'error'); return; }

  try {
    // Create a temporary anchor and trigger download
    const link = document.createElement('a');
    // Clean filename — remove special chars
    const filename = (studentName || 'student').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_') + '_photo.jpg';
    link.download = filename;
    link.href = src; // base64 data URL works directly
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Photo download started!', 'success');
  } catch (err) {
    showToast('Could not download photo. Try long-pressing the image.', 'error');
  }
}

function toggleViewPassword(actualPassword) {
  const txt = document.getElementById('view-pwd-text');
  const btn = document.getElementById('view-pwd-btn');
  if (!txt || !btn) return;
  if (txt.textContent === '••••••••') {
    txt.textContent = actualPassword;
    txt.style.letterSpacing = 'normal';
    btn.textContent = '🙈 Hide';
  } else {
    txt.textContent = '••••••••';
    txt.style.letterSpacing = '3px';
    btn.textContent = '👁️ Show';
  }
}


// =============================================================
// DEACTIVATE STUDENT (blocks login without deleting)
// =============================================================
function deactivateStudent(docId, name) {
  window._pendingDeactivateId   = docId;
  window._pendingDeactivateName = name;
  document.getElementById('deactivate-student-name').textContent = name;
  openModal('modal-deactivate-student');
}

async function executeDeactivateStudent() {
  const docId = window._pendingDeactivateId;
  const name  = window._pendingDeactivateName;
  if (!docId) return;
  const btn = document.getElementById('deactivate-confirm-btn');
  btn.disabled = true; btn.textContent = 'Deactivating...';
  try {
    await db.collection('students').doc(docId).update({ status: 'inactive' });
    closeModal('modal-deactivate-student');
    showToast(`${name} has been deactivated.`, 'warning');
    loadAllStudents(); loadAdminStats();
  } catch (err) {
    showToast('Failed to deactivate. Try again.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = '⛔ Deactivate';
  }
}


// =============================================================
// REACTIVATE STUDENT
// =============================================================
async function reactivateStudent(mobile) {
  try {
    await db.collection('students').doc(mobile).update({ status: 'approved' });
    showToast('Student reactivated successfully! ✅', 'success');
    loadAllStudents(); loadAdminStats();
  } catch (err) {
    showToast('Failed to reactivate. Try again.', 'error');
  }
}


// =============================================================
// DELETE STUDENT PERMANENTLY
// =============================================================
// Opens the permanent delete confirmation modal (bilingual)
function deleteStudent(docId, name) {
  window._pendingDeleteStudentId   = docId;
  window._pendingDeleteStudentName = name;

  document.getElementById('perm-delete-student-info').innerHTML = `
    <div style="font-size:var(--fs-sm); line-height:1.8;">
      <div style="font-weight:700; font-size:var(--fs-base);
                  color:var(--text-white); margin-bottom:8px;">
        👤 ${name}
      </div>
      <div style="color:var(--text-muted);">
        Student ID: <strong style="color:var(--neon-blue);">${docId}</strong>
      </div>
      <div style="color:var(--text-dim); font-size:var(--fs-xs); margin-top:4px;">
        छात्र ID: <strong>${docId}</strong>
      </div>
    </div>
  `;
  openModal('modal-perm-delete-student');
}

// Executes the actual Firestore delete after confirmation
async function executePermDeleteStudent() {
  const docId = window._pendingDeleteStudentId;
  const name  = window._pendingDeleteStudentName;
  if (!docId) return;

  const btn = document.getElementById('perm-delete-confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting... / हटाया जा रहा है...';

  try {
    await db.collection('students').doc(docId).delete();
    closeModal('modal-perm-delete-student');
    window._pendingDeleteStudentId   = null;
    window._pendingDeleteStudentName = null;
    showToast(`✅ "${name}" permanently deleted. Roll Number is now free.`, 'success');
    loadAllStudents();
    loadAdminStats();
  } catch (err) {
    showToast('Failed to delete. Please try again. / दोबारा कोशिश करें।', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🗑️ Delete Forever / हमेशा के लिए हटाएं';
  }
}


// =============================================================
// ADD STUDENT MANUALLY (Admin)
// Auto-approved — student can login immediately
// =============================================================
async function handleAddStudentManually() {
  const btn = document.getElementById('add-student-btn');
  if (btn && btn.disabled) return; // prevent double-submit
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Adding...'; }
  const session  = document.getElementById('as-session').value.trim();
  const board    = document.getElementById('as-board').value.trim();
  const cls      = document.getElementById('as-class').value.trim();
  const roll     = document.getElementById('as-roll').value.trim();
  const name     = document.getElementById('as-name').value.trim();
  const gender   = document.getElementById('as-gender').value.trim();
  const dob      = document.getElementById('as-dob').value.trim();
  const mobile   = document.getElementById('as-mobile').value.trim();
  const altMobile= document.getElementById('as-alt-mobile').value.trim();
  const password = document.getElementById('as-password').value.trim();
  const father   = document.getElementById('as-father').value.trim();
  const mother   = document.getElementById('as-mother').value.trim();
  const address  = document.getElementById('as-address').value.trim();
  if (!session || !board || !cls || !roll || !name || !gender || !dob || !mobile || !password || !father || !mother || !address) {
    if (btn) { btn.disabled = false; btn.textContent = '➕ Add Student'; }
    showAddStudentMsg('Please fill in all required fields.', 'error'); return;
  }
  if (mobile.length !== 10 || isNaN(mobile)) {
    if (btn) { btn.disabled = false; btn.textContent = '➕ Add Student'; }
    showAddStudentMsg('Please enter a valid 10-digit mobile number.', 'error'); return;
  }
  if (isNaN(roll) || parseInt(roll) < 1) {
    if (btn) { btn.disabled = false; btn.textContent = '➕ Add Student'; }
    showAddStudentMsg('Roll number must be a positive number.', 'error'); return;
  }

  // Get class display name from dropdown
  const asClassSelect = document.getElementById('as-class');
  const asClassName = asClassSelect.options[asClassSelect.selectedIndex]?.text || cls;
  const docId = generateStudentId(session, board, asClassName, roll);

  try {
    const existing = await db.collection('students').doc(docId).get();
    if (existing.exists) {
      showAddStudentMsg(`Student ID ${docId} already exists. This Roll No is already registered for ${board} in this session.`, 'error');
      return;
    }

    // Handle photo — compress before saving
    let photoData = '';
    const photoFile = document.getElementById('as-photo').files[0];
    if (photoFile) {
      try { photoData = await compressPhoto(photoFile); }
      catch { photoData = ''; }
    }

    await db.collection('students').doc(docId).set({
      session, board, class: cls, roll: parseInt(roll),
      name, gender, dob, mobile,
      altMobile: altMobile || '',
      password, father, mother, address,
      photo: photoData || '',
      status: 'approved',
      studentId: docId,
      addedByAdmin: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (btn) { btn.disabled = false; btn.textContent = '➕ Add Student'; }
    showAddStudentMsg(
      `✅ Student "${name}" added!\nID: ${docId} | Board: ${board} | Session: ${session} | Class: ${cls} | Roll: ${roll}`,
      'success'
    );

    // Reset form fields
    ['as-session','as-roll','as-name','as-gender','as-dob',
     'as-mobile','as-alt-mobile','as-password','as-father','as-mother','as-address']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    // Reset board + class
    const boardEl = document.getElementById('as-board');
    if (boardEl) boardEl.value = '';
    const classEl = document.getElementById('as-class');
    if (classEl) {
      classEl.innerHTML = '<option value="">-- Select Board first --</option>';
      classEl.disabled = true;
    }

    // Reset photo preview
    const preview = document.getElementById('as-photo-preview');
    if (preview) preview.innerHTML = '👤';
    const photoInput = document.getElementById('as-photo');
    if (photoInput) photoInput.value = '';
    const asRemoveBtn = document.getElementById('as-photo-remove-btn');
    if (asRemoveBtn) asRemoveBtn.style.display = 'none';

    loadAdminStats();

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '➕ Add Student'; }
    showAddStudentMsg('Failed to add student. Check internet and try again.', 'error');
    console.error('Add student error:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '➕ Add Student';
  }
}


// =============================================================
// LOAD CLASSES filtered by board into a specific dropdown
// board: 'BSEB' | 'CBSE'
// Existing classes without a board field default to BSEB
// =============================================================
async function loadClassesForBoard(board, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">-- Loading... --</option>';
  select.disabled = true;
  try {
    const snap = await db.collection('classes').orderBy('order').get();
    const filtered = snap.docs.filter(doc => {
      const b = doc.data().board;
      return (b === board) || (!b && board === 'BSEB');
    });
    if (filtered.length === 0) {
      select.innerHTML = '<option value="">-- No classes for this board --</option>';
    } else {
      select.innerHTML = '<option value="">-- Select Class --</option>';
      filtered.forEach(doc => {
        const c = doc.data();
        select.innerHTML += `<option value="${doc.id}">${c.name}</option>`;
      });
      select.disabled = false;
    }
  } catch {
    select.innerHTML = '<option value="">-- Error loading classes --</option>';
  }
}

// When board changes in registration form
function onRegBoardChange() {
  const board = document.getElementById('reg-board').value;
  const classSelect = document.getElementById('reg-class');
  if (!board) {
    classSelect.innerHTML = '<option value="">-- Select Board first --</option>';
    classSelect.disabled = true;
    return;
  }
  loadClassesForBoard(board, 'reg-class');
}

// When board changes in login form
function onLoginBoardChange() {
  const board = document.getElementById('login-board').value;
  const classSelect = document.getElementById('login-class');
  if (!board) {
    classSelect.innerHTML = '<option value="">-- Select Board first --</option>';
    classSelect.disabled = true;
    return;
  }
  loadClassesForBoard(board, 'login-class');
}

// When board changes in Admin Add Student form
function onAsBoardChange() {
  const board = document.getElementById('as-board').value;
  const classSelect = document.getElementById('as-class');
  if (!board) {
    classSelect.innerHTML = '<option value="">-- Select Board first --</option>';
    classSelect.disabled = true;
    return;
  }
  loadClassesForBoard(board, 'as-class');
}

// Photo preview for Admin Add Student form
function previewAsPhoto(input) {
  if (input.files && input.files[0]) {
    compressPhoto(input.files[0]).then(compressed => {
      const preview = document.getElementById('as-photo-preview');
      if (preview) preview.innerHTML = `<img src="${compressed}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`;
      // Show Remove button
      const removeBtn = document.getElementById('as-photo-remove-btn');
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    }).catch(() => {
      const preview = document.getElementById('as-photo-preview');
      if (preview) preview.innerHTML = '👤';
    });
  }
}

function removeAsPhoto() {
  const preview = document.getElementById('as-photo-preview');
  if (preview) preview.innerHTML = '👤';
  const input = document.getElementById('as-photo');
  if (input) input.value = '';
  const removeBtn = document.getElementById('as-photo-remove-btn');
  if (removeBtn) removeBtn.style.display = 'none';
}

// =============================================================
// SHOW ADD STUDENT MESSAGE
// =============================================================
function showAddStudentMsg(msg, type) {
  const el = document.getElementById('add-student-msg');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = msg.replace(/\n/g, '<br>');
  el.style.cssText = type === 'success'
    ? `display:block;padding:12px 14px;background:rgba(0,255,136,0.08);
       border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius-sm);
       margin-bottom:16px;font-size:var(--fs-sm);color:var(--success);line-height:1.7;`
    : `display:block;padding:12px 14px;background:rgba(255,68,102,0.08);
       border:1px solid rgba(255,68,102,0.3);border-radius:var(--radius-sm);
       margin-bottom:16px;font-size:var(--fs-sm);color:var(--danger);`;
}


// =============================================================
// MANAGE CLASSES — Load all classes
// =============================================================
// =============================================================
// BOARD TAB STATE for Manage Classes page
// =============================================================
let AdminClassTab = 'BSEB';

function switchClassTab(board) {
  AdminClassTab = board;
  const bsebBtn = document.getElementById('tab-bseb');
  const cbseBtn = document.getElementById('tab-cbse');
  if (bsebBtn) {
    bsebBtn.style.borderBottomColor = board === 'BSEB' ? 'var(--neon-blue)' : 'transparent';
    bsebBtn.style.color = board === 'BSEB' ? 'var(--neon-blue)' : 'var(--text-muted)';
  }
  if (cbseBtn) {
    cbseBtn.style.borderBottomColor = board === 'CBSE' ? 'var(--neon-blue)' : 'transparent';
    cbseBtn.style.color = board === 'CBSE' ? 'var(--neon-blue)' : 'var(--text-muted)';
  }
  loadAdminClasses();
}

function openAddClassModal() {
  // Pre-select current tab's board
  const boardSel = document.getElementById('new-class-board');
  if (boardSel) boardSel.value = AdminClassTab;
  openModal('modal-add-class');
}

async function loadAdminClasses() {
  const grid = document.getElementById('a-classes-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-screen" style="grid-column:1/-1;"><div class="spinner"></div></div>';
  try {
    const snap = await db.collection('classes').orderBy('order').get();
    if (snap.empty) {
      await seedDefaultClasses();
      loadAdminClasses();
      return;
    }
    // Filter to current tab; classes without board field = legacy BSEB
    const filtered = snap.docs.filter(doc => {
      const b = doc.data().board;
      return (b === AdminClassTab) || (!b && AdminClassTab === 'BSEB');
    });
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🎓</div>
          <h3>No ${AdminClassTab} Classes Yet</h3>
          <p>Click "Add New Class" to add a ${AdminClassTab} class.</p>
        </div>`;
      return;
    }
    grid.innerHTML = filtered.map(doc => {
      const c = doc.data();
      const boardBadge = (c.board || 'BSEB') === 'CBSE'
        ? '<span class="badge badge-green" style="font-size:10px;margin-bottom:10px;display:inline-block;">📗 CBSE</span>'
        : '<span class="badge badge-blue" style="font-size:10px;margin-bottom:10px;display:inline-block;">📘 BSEB</span>';
      return `
        <div class="card" style="text-align:center; padding:20px;">
          <div style="font-size:36px; margin-bottom:8px;">🎓</div>
          <div style="font-weight:700; font-size:var(--fs-lg); margin-bottom:6px;">${c.name}</div>
          ${boardBadge}
          <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm"
                    onclick="openRenameClassModal('${doc.id}','${c.name.replace(/'/g,"\\'")}')">
              ✏️ Rename
            </button>
            <button class="btn btn-danger btn-sm"
                    onclick="confirmDeleteClass('${doc.id}','${c.name.replace(/'/g,"\\'")}')">
              🗑️ Delete
            </button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<div class="info-box">Could not load classes.</div>';
  }
}


// =============================================================
// SEED DEFAULT CLASSES (all BSEB)
// =============================================================
async function seedDefaultClasses() {
  const batch = db.batch();
  const defaults = [
    { id:'class-6',  name:'Class 6',  order:1, board:'BSEB' },
    { id:'class-7',  name:'Class 7',  order:2, board:'BSEB' },
    { id:'class-8',  name:'Class 8',  order:3, board:'BSEB' },
    { id:'class-9',  name:'Class 9',  order:4, board:'BSEB' },
    { id:'class-10', name:'Class 10', order:5, board:'BSEB' },
  ];
  defaults.forEach(cls => {
    batch.set(db.collection('classes').doc(cls.id), {
      name: cls.name, order: cls.order, board: cls.board,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
  showToast('Default BSEB classes created!', 'success');
}


// =============================================================
// ADD NEW CLASS (board-aware)
// =============================================================
async function handleAddClass() {
  const board = document.getElementById('new-class-board').value;
  const name  = document.getElementById('new-class-name').value.trim();
  const order = parseInt(document.getElementById('new-class-order').value) || 10;
  if (!board) { showToast('Please select a board.', 'error'); return; }
  if (!name)  { showToast('Please enter a class name.', 'error'); return; }
  try {
    const id = 'class-' + board.toLowerCase() + '-' + name.toLowerCase().replace(/\s+/g,'-') + '-' + Date.now();
    await db.collection('classes').doc(id).set({
      name, order, board,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`${board} Class "${name}" added! ✅`, 'success');
    closeModal('modal-add-class');
    document.getElementById('new-class-name').value = '';
    AdminClassTab = board;
    switchClassTab(board);
    loadClassesIntoAdminDropdowns();
  } catch (err) {
    showToast('Failed to add class. Try again.', 'error');
  }
}


// =============================================================
// OPEN RENAME CLASS MODAL
// =============================================================
function openRenameClassModal(classId, currentName) {
  document.getElementById('rename-class-id').value   = classId;
  document.getElementById('rename-class-name').value = currentName;
  openModal('modal-rename-class');
}


// =============================================================
// RENAME CLASS
// =============================================================
async function handleRenameClass() {
  const id   = document.getElementById('rename-class-id').value;
  const name = document.getElementById('rename-class-name').value.trim();
  if (!name) { showToast('Please enter a new name.', 'error'); return; }

  try {
    await db.collection('classes').doc(id).update({ name });
    showToast(`Class renamed to "${name}" ✅`, 'success');
    closeModal('modal-rename-class');
    loadAdminClasses();
    loadClassesIntoAdminDropdowns();
  } catch (err) {
    showToast('Failed to rename. Try again.', 'error');
  }
}


// =============================================================
// CONFIRM + DELETE CLASS (strong double warning)
// Deletes class AND all folders/materials inside it
// =============================================================
async function confirmDeleteClass(classId, className) {
  // First warning
  if (!confirm(
    `⚠️ WARNING: Delete class "${className}"?\n\n` +
    `This will permanently delete:\n` +
    `• All folders in this class\n` +
    `• All study materials in this class\n` +
    `• Student access to this class\n\n` +
    `This CANNOT be undone!`
  )) return;

  // Second confirmation
  if (!confirm(
    `🚨 FINAL CONFIRMATION\n\n` +
    `Are you 100% sure you want to permanently delete "${className}" and everything inside it?`
  )) return;

  try {
    // Delete all materials in this class
    const materials = await db.collection('materials')
      .where('classId','==', classId).get();
    const foldersSnap = await db.collection('folders')
      .where('classId','==', classId).get();

    const batch = db.batch();
    materials.forEach(doc => batch.delete(doc.ref));
    foldersSnap.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('classes').doc(classId));
    await batch.commit();

    showToast(`Class "${className}" deleted.`, 'warning');
    loadAdminClasses();
    loadAdminStats();
    loadClassesIntoAdminDropdowns();
  } catch (err) {
    showToast('Failed to delete class. Try again.', 'error');
    console.error('Delete class error:', err);
  }
}


// =============================================================
// LOAD CLASSES INTO ALL ADMIN DROPDOWNS
// Refreshes: add-student form, register form, materials page
// =============================================================
async function loadClassesIntoAdminDropdowns() {
  try {
    const snap = await db.collection('classes').orderBy('order').get();
    const bsebOpts = snap.docs
      .filter(d => !d.data().board || d.data().board === 'BSEB')
      .map(d => `<option value="${d.id}">[BSEB] ${d.data().name}</option>`).join('');
    const cbseOpts = snap.docs
      .filter(d => d.data().board === 'CBSE')
      .map(d => `<option value="${d.id}">[CBSE] ${d.data().name}</option>`).join('');

    // as-class: reset (loaded on-demand when board chosen)
    const asClass = document.getElementById('as-class');
    if (asClass && !document.getElementById('as-board')?.value) {
      asClass.innerHTML = '<option value="">-- Select Board first --</option>';
      asClass.disabled = true;
    }
    // Refresh board-filtered dropdowns if board already selected
    const asBoard = document.getElementById('as-board')?.value;
    if (asBoard) loadClassesForBoard(asBoard, 'as-class');
    const regBoard = document.getElementById('reg-board')?.value;
    if (regBoard) loadClassesForBoard(regBoard, 'reg-class');
    const loginBoard = document.getElementById('login-board')?.value;
    if (loginBoard) loadClassesForBoard(loginBoard, 'login-class');
  } catch { /* silent */ }

  // Also load sessions into admin add-student form
  try {
    const snap = await db.collection('sessions').orderBy('createdAt','desc').get();
    const el = document.getElementById('as-session');
    if (el) {
      el.innerHTML = '<option value="">-- Select Session --</option>';
      if (snap.empty) {
        el.innerHTML += '<option value="2026-27">2026-27</option>';
      } else {
        snap.forEach(doc => {
          el.innerHTML += `<option value="${doc.id}"${doc.data().isActive?' selected':''}>${doc.id}</option>`;
        });
      }
    }
  } catch {}
}


// =============================================================
// NOTICE BOARD — Load all notices (admin view with edit/delete)
// =============================================================
async function loadAdminNotices() {
  const container = document.getElementById('a-notices-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';

  try {
    const snap = await db.collection('notices')
      .orderBy('createdAt', 'desc').get();

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📢</div>
          <h3>No Notices Posted Yet</h3>
          <p>Click "Post Notice" to add an announcement for students.</p>
        </div>`;
      return;
    }

    const importanceLabel = {
      normal:    '<span class="badge badge-blue">📌 Normal</span>',
      important: '<span class="badge badge-orange">⚠️ Important</span>',
      urgent:    '<span class="badge badge-red">🚨 Urgent</span>'
    };

    // Store notices in memory so emojis aren't corrupted via HTML attributes
    window._adminNotices = {};
    snap.docs.forEach(doc => {
      const n = doc.data();
      window._adminNotices[doc.id] = {
        title:   n.title   || '',
        message: n.message || '',
        date:    formatDate(n.createdAt)
      };
    });

    container.innerHTML = snap.docs.map(doc => {
      const n = doc.data();
      const isPublic = n.isPublic !== false;
      const showHome = n.showOnHome !== false;
      const showDash = n.showOnDashboard !== false;

      // Visibility badge
      let visBadge = '';
      if (showHome && showDash)
        visBadge = '<span class="badge badge-green" style="font-size:10px;">🌐 Home + 🎓 Dashboard</span>';
      else if (showHome)
        visBadge = '<span class="badge badge-blue" style="font-size:10px;">🌐 Home Page Only</span>';
      else if (showDash)
        visBadge = '<span class="badge badge-orange" style="font-size:10px;">🎓 Students Only</span>';
      else
        visBadge = '<span class="badge badge-gray" style="font-size:10px;">👁️ Hidden</span>';

      // Target classes badge
      const tc = n.targetClasses;
      let classBadge = '';
      if (tc && tc.length > 0) {
        const labels = tc.map(key => {
          const [board, clsId] = key.split('|');
          const name = getClassName(clsId) || clsId;
          const color = board === 'CBSE' ? '#00c896' : 'var(--neon-blue)';
          return `<span style="background:rgba(0,212,255,0.1);border:1px solid ${color};
                               color:${color};border-radius:4px;padding:1px 6px;
                               font-size:10px;font-weight:600;">${board} ${name}</span>`;
        }).join(' ');
        classBadge = `<div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap;">
          <span style="font-size:10px;color:var(--text-dim);">🎯 Target:</span> ${labels}
        </div>`;
      }

      return `
        <div class="notice-item ${n.importance || 'normal'}"
             style="margin-bottom:14px; opacity:${isPublic ? '1' : '0.65'}; position:relative;">
          <div style="display:flex; justify-content:space-between;
                      align-items:flex-start; gap:12px;">
            <div>
              <div class="notice-title">${n.title}</div>
              <div style="margin-top:4px; display:flex; gap:6px; flex-wrap:wrap;">
                ${isPublic
                  ? '<span class=\"badge badge-green\" style=\"font-size:10px;\">🟢 Active</span>'
                  : '<span class=\"badge badge-gray\" style=\"font-size:10px;\">🔒 Private</span>'}
                ${visBadge}
              </div>
              ${classBadge}
            </div>

            <!-- 3-dot menu -->
            <div style="position:relative; flex-shrink:0;">
              <button onclick="toggleNoticeMenu('${doc.id}')"
                      style="background:var(--bg-card2); border:1px solid var(--border);
                             color:var(--text-white); border-radius:var(--radius-sm);
                             width:36px; height:36px; font-size:20px; cursor:pointer;
                             display:flex; align-items:center; justify-content:center;
                             line-height:1;">⋮</button>
              <div id="notice-menu-${doc.id}"
                   style="display:none; position:absolute; right:0; top:40px;
                          background:var(--bg-card); border:1px solid var(--border-bright);
                          border-radius:var(--radius); min-width:200px;
                          box-shadow:0 8px 24px rgba(0,0,0,0.4); z-index:999;
                          overflow:hidden;">
                <button onclick="toggleNoticeVisibility('${doc.id}', ${isPublic}); toggleNoticeMenu('${doc.id}')"
                        style="width:100%; padding:12px 16px; background:none; border:none;
                               color:var(--text-white); text-align:left; cursor:pointer;
                               font-size:var(--fs-sm); display:flex; align-items:center; gap:10px;
                               border-bottom:1px solid var(--border);">
                  ${isPublic ? '🔒 Make Private' : '🌐 Make Public'}
                </button>
                <button onclick="shareNoticeWhatsApp_id('${doc.id}'); toggleNoticeMenu('${doc.id}')"
                        style="width:100%; padding:12px 16px; background:none; border:none;
                               color:#25D366; text-align:left; cursor:pointer;
                               font-size:var(--fs-sm); display:flex; align-items:center; gap:10px;
                               white-space:nowrap; border-bottom:1px solid var(--border);">
                  📤 Share on WhatsApp
                </button>
                <button onclick="openEditNoticeModal('${doc.id}',
                          '${n.title.replace(/'/g, "\\'")}',
                          '${n.message.replace(/'/g, "\\'").replace(/\n/g, '\\n')}',
                          '${n.importance || 'normal'}',
                          ${showHome}, ${showDash}, ${isPublic}); toggleNoticeMenu('${doc.id}')"
                        style="width:100%; padding:12px 16px; background:none; border:none;
                               color:var(--text-white); text-align:left; cursor:pointer;
                               font-size:var(--fs-sm); display:flex; align-items:center; gap:10px;
                               border-bottom:1px solid var(--border);">
                  ✏️ Edit Notice
                </button>
                <button onclick="deleteNotice('${doc.id}',
                          '${n.title.replace(/'/g, "\\'")}'); toggleNoticeMenu('${doc.id}')"
                        style="width:100%; padding:12px 16px; background:none; border:none;
                               color:var(--danger); text-align:left; cursor:pointer;
                               font-size:var(--fs-sm); display:flex; align-items:center; gap:10px;">
                  🗑️ Delete Notice
                </button>
              </div>
            </div>
          </div>
          <div class="notice-body" style="margin-top:8px;white-space:pre-line;">${n.message}</div>
          <div class="notice-footer" style="margin-top:10px;">
            ${importanceLabel[n.importance || 'normal']}
            <span class="notice-date">📅 ${formatDate(n.createdAt)}</span>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div class="info-box">Could not load notices.</div>';
  }
}



// =============================================================
// TOGGLE NOTICE 3-DOT MENU
// =============================================================
function toggleNoticeMenu(noticeId) {
  const menu = document.getElementById(`notice-menu-${noticeId}`);
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  // Close all other open menus first
  document.querySelectorAll('[id^="notice-menu-"]').forEach(m => m.style.display = 'none');
  menu.style.display = isOpen ? 'none' : 'block';
}

// Close notice menu when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('[id^="notice-menu-"]') && !e.target.closest('button[onclick*="toggleNoticeMenu"]')) {
    document.querySelectorAll('[id^="notice-menu-"]').forEach(m => m.style.display = 'none');
  }
});

// WhatsApp share by notice ID
function shareNoticeWhatsApp_id(noticeId) {
  const n = window._adminNotices?.[noticeId];
  if (!n) return;
  const inst = window._instituteData || INST_DEFAULTS;
  const text = `📢 *${n.title}*\n\n${n.message}\n\n— ${inst.shortName}, ${inst.city} | ${n.date}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// =============================================================
// TOGGLE NOTICE PUBLIC / PRIVATE
// =============================================================
async function toggleNoticeVisibility(noticeId, currentlyPublic) {
  try {
    await db.collection('notices').doc(noticeId).update({
      isPublic: !currentlyPublic
    });
    const msg = currentlyPublic ? '🔒 Notice is now Private' : '🌐 Notice is now Public';
    showToast(msg, currentlyPublic ? 'info' : 'success');
    loadAdminNotices();
    loadHomeNotices();
  } catch (err) {
    showToast('Failed to update notice visibility.', 'error');
  }
}

// =============================================================
// SHARE NOTICE ON WHATSAPP
// =============================================================
function shareNoticeWhatsApp(btn) {
  const noticeId = btn.getAttribute('data-id');
  const snap = window._adminNotices && window._adminNotices[noticeId];

  const title   = snap ? snap.title   : '';
  const message = snap ? snap.message : '';
  const date    = snap ? snap.date    : '';

  const inst = window._instituteData || INST_DEFAULTS;
  const divider = '- - - - - - - - - - - - - - - - - - - - - -';

  const text = '\uD83D\uDCE2 *' + inst.name.toUpperCase() + ' (' + inst.shortName + ')*\n'
    + divider + '\n\n'
    + '*' + title + '*\n\n'
    + message + '\n\n'
    + divider + '\n'
    + '\uD83D\uDCC5 ' + date + '\n'
    + '\uD83C\uDF10 bcibuxar.netlify.app\n\n'
    + '— *' + inst.director + '*\n'
    + '\uD83D\uDCDE ' + inst.phone + '\n'
    + '_Director, ' + inst.shortName + ', ' + inst.city + '_';

  const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

// =============================================================
// ADD NEW NOTICE
// =============================================================
async function handleAddNotice() {
  const submitBtn = document.querySelector('#modal-add-notice .btn-primary');
  if (submitBtn && submitBtn.disabled) return;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Posting...'; }
  const title      = document.getElementById('notice-title').value.trim();
  const message    = document.getElementById('notice-message').value.trim();
  const importance = document.getElementById('notice-importance').value;
  let showOnHome      = document.getElementById('notice-vis-home').checked;
  const showOnDashboard = document.getElementById('notice-vis-dashboard').checked;

  // Collect selected target classes (array of "BOARD|classId" strings)
  const checkedBoxes = document.querySelectorAll('#notice-class-grid input[type=checkbox]:checked');
  const targetClasses = Array.from(checkedBoxes).map(cb => cb.value);

  // If class-targeted → auto-hide from public Home Page (class notice = student-only)
  if (targetClasses.length > 0) showOnHome = false;

  if (!title || !message) {
    showToast('Please fill in title and message.', 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📢 Post Notice'; }
    return;
  }
  if (!showOnHome && !showOnDashboard) {
    showToast('Please select at least one visibility option.', 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📢 Post Notice'; }
    return;
  }

  try {
    await db.collection('notices').add({
      title, message, importance,
      isPublic: true,
      showOnHome,
      showOnDashboard,
      targetClasses,   // [] = all classes, ["BSEB|class-10"] = specific class only
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Notice posted successfully! 📢', 'success');
    closeModal('modal-add-notice');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📢 Post Notice'; }
    document.getElementById('notice-title').value   = '';
    document.getElementById('notice-message').value = '';
    // Reset checkboxes to default
    document.getElementById('notice-vis-home').checked = true;
    document.getElementById('notice-vis-dashboard').checked = true;
    document.getElementById('notice-vis-home-label').style.borderColor = 'var(--neon-blue)';
    document.getElementById('notice-vis-dash-label').style.borderColor = 'var(--neon-blue)';
    // Uncheck all class checkboxes
    document.querySelectorAll('#notice-class-grid input[type=checkbox]').forEach(cb => {
      cb.checked = false;
      const lbl = cb.closest('label');
      if (lbl) lbl.style.borderColor = 'var(--border)';
    });
    loadAdminNotices();
    loadHomeNotices();
  } catch (err) {
    showToast('Failed to post notice. Try again.', 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📢 Post Notice'; }
  }
}


// =============================================================
// LOAD CLASS GRID INTO POST NOTICE MODAL
// Groups classes by board (BSEB / CBSE), each as a toggleable card
// Value stored: "BOARD|classId"  e.g. "BSEB|class-10"
// =============================================================
async function loadNoticeClassGrid() {
  const loading = document.getElementById('notice-class-loading');
  const grid    = document.getElementById('notice-class-grid');
  if (!grid) return;
  if (loading) loading.style.display = 'block';
  grid.style.display = 'none';
  try {
    const snap = await db.collection('classes').orderBy('order').get();
    if (snap.empty) {
      if (loading) loading.textContent = 'No classes found.';
      return;
    }

    // Group by board
    const bseb = [], cbse = [], other = [];
    snap.forEach(doc => {
      const c = { id: doc.id, ...doc.data() };
      const b = (c.board || 'BSEB').toUpperCase();
      if      (b === 'BSEB') bseb.push(c);
      else if (b === 'CBSE') cbse.push(c);
      else                   other.push(c);
    });

    let html = '';

    function buildBoardSection(label, emoji, color, classes) {
      if (!classes.length) return '';
      return `
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:${color};letter-spacing:0.5px;
                      margin-bottom:6px;">${emoji} ${label}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${classes.map(c => {
              const val = (c.board||'BSEB').toUpperCase() + '|' + c.id;
              const safeVal = val.replace(/'/g, "\\'");
              return `<label id="ncls-lbl-${c.id}-${(c.board||'BSEB')}"
                style="display:flex;align-items:center;gap:6px;cursor:pointer;
                       background:var(--bg-card2);border:1px solid var(--border);
                       border-radius:var(--radius-sm);padding:7px 12px;
                       transition:border-color 0.15s;font-size:var(--fs-sm);">
                <input type="checkbox" value="${safeVal}"
                  style="width:14px;height:14px;accent-color:${color};cursor:pointer;"
                  onchange="
                    document.getElementById('ncls-lbl-${c.id}-${(c.board||'BSEB')}').style.borderColor
                      = this.checked ? '${color}' : 'var(--border)';
                    noticeClassSelectionHint();
                  ">
                <span style="color:var(--text-white);font-weight:500;">${c.name}</span>
              </label>`;
            }).join('')}
          </div>
        </div>`;
    }

    html += buildBoardSection('BSEB', '📘', 'var(--neon-blue)', bseb);
    html += buildBoardSection('CBSE', '📗', '#00c896', cbse);
    html += buildBoardSection('OTHER', '📙', '#ffaa00', other);

    grid.innerHTML = html;
    if (loading) loading.style.display = 'none';
    grid.style.display = 'block';
  } catch(e) {
    if (loading) loading.textContent = 'Could not load classes.';
  }
}

// Show hint when class selection changes
function noticeClassSelectionHint() {
  const checked = document.querySelectorAll('#notice-class-grid input[type=checkbox]:checked');
  const homeCheck = document.getElementById('notice-vis-home');
  if (checked.length > 0) {
    // Auto-uncheck Home Page when targeting a class
    if (homeCheck) {
      homeCheck.checked = false;
      document.getElementById('notice-vis-home-label').style.borderColor = 'var(--border)';
    }
  }
}
function openEditNoticeModal(id, title, message, importance, showOnHome, showOnDashboard, isPublic) {
  document.getElementById('edit-notice-id').value         = id;
  document.getElementById('edit-notice-isPublic').value   = (isPublic !== false) ? 'true' : 'false';
  document.getElementById('edit-notice-title').value      = title;
  document.getElementById('edit-notice-message').value    = message.replace(/\\n/g, '\n');
  document.getElementById('edit-notice-importance').value = importance;

  // Pre-fill visibility — default true if field doesn't exist (old notices)
  const home = showOnHome !== false;
  const dash = showOnDashboard !== false;
  document.getElementById('edit-notice-vis-home').checked      = home;
  document.getElementById('edit-notice-vis-dashboard').checked = dash;
  document.getElementById('edit-notice-vis-home-label').style.borderColor = home ? 'var(--neon-blue)' : 'var(--border)';
  document.getElementById('edit-notice-vis-dash-label').style.borderColor = dash ? 'var(--neon-blue)' : 'var(--border)';

  openModal('modal-edit-notice');
}


// =============================================================
// EDIT NOTICE — Save changes
// =============================================================
async function handleEditNotice() {
  const id         = document.getElementById('edit-notice-id').value;
  const title      = document.getElementById('edit-notice-title').value.trim();
  const message    = document.getElementById('edit-notice-message').value.trim();
  const importance = document.getElementById('edit-notice-importance').value;
  const showOnHome      = document.getElementById('edit-notice-vis-home').checked;
  const showOnDashboard = document.getElementById('edit-notice-vis-dashboard').checked;
  // Preserve the existing isPublic state — editing should never silently change visibility
  const isPublic = document.getElementById('edit-notice-isPublic').value !== 'false';

  if (!title || !message) {
    showToast('Please fill in title and message.', 'error'); return;
  }
  if (!showOnHome && !showOnDashboard) {
    showToast('Please select at least one visibility option.', 'error'); return;
  }

  try {
    await db.collection('notices').doc(id).update({ title, message, importance, showOnHome, showOnDashboard, isPublic });
    showToast('Notice updated! ✅', 'success');
    closeModal('modal-edit-notice');
    loadAdminNotices();
    loadHomeNotices();
  } catch (err) {
    showToast('Failed to update notice. Try again.', 'error');
  }
}


// =============================================================
// DELETE NOTICE
// =============================================================
function deleteNotice(id, title) {
  // Show bilingual confirmation modal
  document.getElementById('notice-delete-title').textContent = title;
  window._pendingDeleteNoticeId = id;
  openModal('modal-delete-notice');
}

async function executeDeleteNotice() {
  const id = window._pendingDeleteNoticeId;
  if (!id) return;
  const btn = document.getElementById('notice-delete-confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  try {
    await db.collection('notices').doc(id).delete();
    closeModal('modal-delete-notice');
    window._pendingDeleteNoticeId = null;
    showToast('Notice deleted. / नोटिस हटा दिया गया।', 'warning');
    loadAdminNotices();
    loadHomeNotices();
  } catch (err) {
    showToast('Failed to delete. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🗑️ Delete / हटाएं';
  }
}


// =============================================================
// SESSION TIMEOUT SETTINGS — Load current values into UI
// =============================================================
function loadSessionTimeoutUI() {
  function msToDisplay(ms) {
    const totalMins = Math.round(ms / (60 * 1000));
    if (totalMins % (60 * 24) === 0) return { val: totalMins / (60 * 24), unit: 'day' };
    if (totalMins % 60 === 0)        return { val: totalMins / 60,        unit: 'hr'  };
    return { val: totalMins, unit: 'min' };
  }

  function unitLabel(unit, val) {
    if (unit === 'day') return val === 1 ? '1 Day'    : `${val} Days`;
    if (unit === 'hr')  return val === 1 ? '1 Hour'   : `${val} Hours`;
    return val === 1 ? '1 Minute' : `${val} Minutes`;
  }

  const admin   = msToDisplay(ADMIN_EXPIRY_MS);
  const student = msToDisplay(STUDENT_EXPIRY_MS);

  const av = document.getElementById('set-admin-timeout-val');
  const au = document.getElementById('set-admin-timeout-unit');
  const sv = document.getElementById('set-student-timeout-val');
  const su = document.getElementById('set-student-timeout-unit');
  if (av) av.value = admin.val;
  if (au) au.value = admin.unit;
  if (sv) sv.value = student.val;
  if (su) su.value = student.unit;

  const ac = document.getElementById('set-admin-current');
  const sc = document.getElementById('set-student-current');
  if (ac) ac.textContent = `Current: ${unitLabel(admin.unit, admin.val)}`;
  if (sc) sc.textContent = `Current: ${unitLabel(student.unit, student.val)}`;
}

// =============================================================
// SESSION TIMEOUT SETTINGS — Save
// =============================================================
async function saveSessionTimeouts() {
  const MIN_MS = 11 * 60 * 1000; // 11 minutes minimum
  const msgEl  = document.getElementById('session-timeout-msg');

  function toMs(val, unit) {
    const n = parseFloat(val);
    if (!n || n <= 0) return null;
    if (unit === 'min') return n * 60 * 1000;
    if (unit === 'hr')  return n * 60 * 60 * 1000;
    if (unit === 'day') return n * 24 * 60 * 60 * 1000;
    return null;
  }

  const adminMs   = toMs(
    document.getElementById('set-admin-timeout-val').value,
    document.getElementById('set-admin-timeout-unit').value
  );
  const studentMs = toMs(
    document.getElementById('set-student-timeout-val').value,
    document.getElementById('set-student-timeout-unit').value
  );

  if (!adminMs || !studentMs) {
    msgEl.innerHTML = '<div class="alert alert-error">Please enter valid values for both timeouts.</div>';
    return;
  }
  if (adminMs < MIN_MS) {
    msgEl.innerHTML = '<div class="alert alert-error">⚠️ Admin timeout must be at least 11 minutes.</div>';
    return;
  }
  if (studentMs < MIN_MS) {
    msgEl.innerHTML = '<div class="alert alert-error">⚠️ Student timeout must be at least 11 minutes.</div>';
    return;
  }

  try {
    await db.collection('admin').doc('sessionTimeouts').set({ adminMs, studentMs });

    // Hot-apply — takes effect immediately without page reload
    ADMIN_EXPIRY_MS   = adminMs;
    STUDENT_EXPIRY_MS = studentMs;

    // Reset the current session's savedAt to NOW so the full new duration
    // starts from this moment (not from original login time)
    try {
      const key = AppState.isAdmin ? ADMIN_SESSION_KEY : STUDENT_SESSION_KEY;
      const raw = localStorage.getItem(key) || localStorage.getItem(SESSION_KEY);
      if (raw) {
        const existing = JSON.parse(raw);
        saveSession(existing); // saveSession always sets savedAt = Date.now()
        window._sessionWarnShown = false; // reset warning so it fires again at correct time
      }
    } catch {}

    msgEl.innerHTML = '<div class="alert alert-success">✅ Session timeouts saved and applied! Your session timer has been reset to the full new duration.</div>';
    setTimeout(() => { if (msgEl) msgEl.innerHTML = ''; }, 4000);
    loadSessionTimeoutUI(); // refresh "Current:" labels
  } catch (err) {
    msgEl.innerHTML = '<div class="alert alert-error">Failed to save. Please try again.</div>';
  }
}


// =============================================================
// CHANGE ADMIN CREDENTIALS
// Updates username + password in Firebase
// =============================================================
async function handleChangeAdminCredentials() {
  const username    = document.getElementById('set-username').value.trim();
  const currentPass = document.getElementById('set-current-pass').value.trim();
  const newPass     = document.getElementById('set-new-pass').value.trim();
  const confirmPass = document.getElementById('set-confirm-pass').value.trim();
  const msgEl       = document.getElementById('settings-msg');

  if (!username || !currentPass || !newPass || !confirmPass) {
    showSettingsMsg('Please fill in all fields.', 'error'); return;
  }
  if (newPass.length < 6) {
    showSettingsMsg('New password must be at least 6 characters.', 'error'); return;
  }
  if (newPass !== confirmPass) {
    showSettingsMsg('New passwords do not match.', 'error'); return;
  }

  try {
    // Verify current password
    let currentCreds = DEFAULT_ADMIN;
    try {
      const doc = await db.collection('admin').doc('credentials').get();
      if (doc.exists) currentCreds = doc.data();
    } catch {}

    if (currentPass !== currentCreds.password) {
      showSettingsMsg('Current password is incorrect.', 'error'); return;
    }

    // Save new credentials to Firebase
    await db.collection('admin').doc('credentials').set({
      username, password: newPass
    });

    showSettingsMsg('✅ Credentials updated! Use new details next time you login.', 'success');

    // Update session
    AppState.currentUser.username = username;
    saveSession({ user: AppState.currentUser, isAdmin: true });

    // Clear fields
    ['set-username','set-current-pass','set-new-pass','set-confirm-pass']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  } catch (err) {
    showSettingsMsg('Failed to update. Check internet and try again.', 'error');
    console.error('Settings error:', err);
  }
}


// =============================================================
// SHOW SETTINGS MESSAGE
// =============================================================
function showSettingsMsg(msg, type) {
  const el = document.getElementById('settings-msg');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = msg;
  el.style.cssText = type === 'success'
    ? `display:block;padding:10px 14px;background:rgba(0,255,136,0.08);
       border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius-sm);
       margin-bottom:14px;font-size:var(--fs-sm);color:var(--success);`
    : `display:block;padding:10px 14px;background:rgba(255,68,102,0.08);
       border:1px solid rgba(255,68,102,0.3);border-radius:var(--radius-sm);
       margin-bottom:14px;font-size:var(--fs-sm);color:var(--danger);`;
  setTimeout(() => { if (el) el.style.display = 'none'; }, 5000);
}


// =============================================================
// ⚠️ FIX 5: PROFILE EDIT PERMISSION - Load and Toggle
// =============================================================
async function loadProfileEditPermission() {
  try {
    const doc = await db.collection('admin').doc('settings').get();
    const allowProfileEdit = doc.exists ? doc.data().allowProfileEdit !== false : true;
    const toggle = document.getElementById('allow-profile-edit-toggle');
    if (toggle) toggle.checked = allowProfileEdit;
  } catch (err) {
    console.error('Error loading profile edit permission:', err);
  }
}

async function toggleProfileEditPermission(isEnabled) {
  const msgEl = document.getElementById('profile-edit-msg');
  const showMsg = (msg, type) => {
    if (!msgEl) return;
    msgEl.innerHTML = msg;
    msgEl.style.cssText = 'display:block;padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;font-size:var(--fs-sm);' +
      (type==='success' ? 'background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);color:var(--success);' :
       'background:rgba(255,68,102,0.08);border:1px solid rgba(255,68,102,0.3);color:var(--danger);');
    setTimeout(() => { if (msgEl) msgEl.style.display = 'none'; }, 3000);
  };
  
  try {
    await db.collection('admin').doc('settings').set({
      allowProfileEdit: isEnabled
    }, { merge: true });
    
    showMsg('✅ Profile editing '+(isEnabled ? 'enabled' : 'disabled')+' for students', 'success');
  } catch (err) {
    console.error('Toggle error:', err);
    showMsg('❌ Update failed. Try again.', 'error');
    // Revert toggle on error
    const toggle = document.getElementById('allow-profile-edit-toggle');
    if (toggle) toggle.checked = !isEnabled;
  }
}


// =============================================================
// ATTENDANCE FEATURE — Enable / Disable for students
// Stored in: admin/settings.attendanceEnabled (boolean, default true)
// =============================================================

// Load current state and update button UI in Settings page
async function loadAttendanceFeatureState() {
  try {
    const doc = await db.collection('admin').doc('settings').get();
    const enabled = doc.exists ? doc.data().attendanceEnabled !== false : true;
    _updateAttFeatureUI(enabled);
  } catch(e) {
    console.error('loadAttendanceFeatureState error:', e);
  }
}

function _updateAttFeatureUI(enabled) {
  const label = document.getElementById('att-feature-label');
  const btn   = document.getElementById('att-feature-btn');
  if (label) label.textContent = enabled ? '✅ Enabled' : '🚫 Disabled';
  if (label) label.style.color = enabled ? 'var(--success)' : 'var(--danger)';
  if (btn) {
    btn.textContent = enabled ? 'Disable' : 'Enable';
    btn.style.background   = enabled ? 'rgba(255,68,102,0.15)' : 'rgba(0,255,136,0.12)';
    btn.style.color        = enabled ? 'var(--danger)' : 'var(--success)';
    btn.style.border       = enabled ? '1px solid rgba(255,68,102,0.4)' : '1px solid rgba(0,255,136,0.3)';
  }
  // Also update student nav appearance immediately if student is logged in
  applyAttendanceFeatureToStudentNav(enabled);
}

async function toggleAttendanceFeature() {
  try {
    const doc     = await db.collection('admin').doc('settings').get();
    const current = doc.exists ? doc.data().attendanceEnabled !== false : true;
    const newVal  = !current;
    await db.collection('admin').doc('settings').set(
      { attendanceEnabled: newVal }, { merge: true }
    );
    _updateAttFeatureUI(newVal);
    showToast(
      newVal ? '✅ Attendance enabled for students.' : '🚫 Attendance disabled for students.',
      newVal ? 'success' : 'warning'
    );
  } catch(e) {
    showToast('Failed to update. Try again.', 'error');
  }
}

// Apply enabled/disabled visual state to student sidebar nav
function applyAttendanceFeatureToStudentNav(enabled) {
  const navItem = document.getElementById('student-nav-attendance');
  if (!navItem) return;
  if (enabled) {
    navItem.style.opacity        = '1';
    navItem.style.pointerEvents  = 'auto';
    navItem.style.cursor         = 'pointer';
    navItem.title                = '';
  } else {
    navItem.style.opacity        = '0.4';
    navItem.style.pointerEvents  = 'none';
    navItem.style.cursor         = 'not-allowed';
    navItem.title                = 'Attendance is currently disabled by admin';
  }
}

// Called when student taps Attendance nav — checks feature flag first
async function handleStudentAttendanceNav() {
  try {
    const doc     = await db.collection('admin').doc('settings').get();
    const enabled = doc.exists ? doc.data().attendanceEnabled !== false : true;
    if (!enabled) {
      showToast('📊 Attendance is currently disabled by admin.', 'warning');
      return;
    }
    showStudentPage('s-page-attendance');
    initStudentAttendance();
  } catch(e) {
    // If fetch fails, allow access (fail open)
    showStudentPage('s-page-attendance');
    initStudentAttendance();
  }
}


// =============================================================
// INSTITUTE INFO — Load, Display, Edit
// Stored in: admin/institute in Firestore
// =============================================================

// Default placeholder logo shown when no custom logo is uploaded
const DEFAULT_LOGO_SRC = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGExNjI4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzExMjI0NCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ2xvdyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMGQ0ZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA5OWNjIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIEJhY2tncm91bmQgY2lyY2xlIC0tPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPgogIDwhLS0gT3V0ZXIgcmluZyAtLT4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjkyIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iOCA0IiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEdyYWR1YXRpb24gY2FwIGJhc2UgKG1vcnRhcmJvYXJkKSAtLT4KICA8IS0tIENhcCB0b3AgZGlhbW9uZCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjEwMCw0MiAxNDgsNjUgMTAwLDg4IDUyLDY1IiBmaWxsPSJ1cmwoI2dsb3cpIiBvcGFjaXR5PSIwLjk1Ii8+CiAgPCEtLSBDYXAgYm9hcmQgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxMDAsNDggMTQyLDY4IDEwMCw4OCA1OCw2OCIgZmlsbD0iIzAwZDRmZiIgb3BhY2l0eT0iMC4xNSIvPgogIDwhLS0gQ2FwIG91dGxpbmUgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxMDAsNDIgMTQ4LDY1IDEwMCw4OCA1Miw2NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDwhLS0gQ2FwIHN0ZW0gLS0+CiAgPHJlY3QgeD0iOTciIHk9IjY1IiB3aWR0aD0iNiIgaGVpZ2h0PSIyOCIgcng9IjMiIGZpbGw9InVybCgjZ2xvdykiLz4KICA8IS0tIENhcCB0YXNzZWwgYmFzZSBjaXJjbGUgLS0+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iOTMiIHI9IjciIGZpbGw9IiMwMGQ0ZmYiIG9wYWNpdHk9IjAuOSIvPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjkzIiByPSI0IiBmaWxsPSIjMGExNjI4Ii8+CiAgPCEtLSBUYXNzZWwgcm9wZSAtLT4KICA8cGF0aCBkPSJNIDE0NSA2NSBRIDE1NSA3MCAxNTMgODIgTCAxNTAgOTUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMTUwIiB5MT0iOTUiIHgyPSIxNDciIHkyPSIxMDgiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNiIvPgogIDxsaW5lIHgxPSIxNTAiIHkxPSI5NSIgeDI9IjE1MyIgeTI9IjEwOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC42Ii8+CiAgPGxpbmUgeDE9IjE1MCIgeTE9Ijk1IiB4Mj0iMTUwIiB5Mj0iMTEwIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjYiLz4KICA8IS0tIE9wZW4gYm9vayBiZWxvdyAtLT4KICA8cGF0aCBkPSJNIDU1IDExOCBRIDEwMCAxMDggMTQ1IDExOCBMIDE0NSAxNDggUSAxMDAgMTM4IDU1IDE0OCBaIiBmaWxsPSIjMTEyMjQ0IiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPGxpbmUgeDE9IjEwMCIgeTE9IjEwOCIgeDI9IjEwMCIgeTI9IjE0OCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8IS0tIEJvb2sgcGFnZXMgbGluZXMgbGVmdCAtLT4KICA8bGluZSB4MT0iNjUiIHkxPSIxMjMiIHgyPSI5NiIgeTI9IjExOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjY1IiB5MT0iMTMwIiB4Mj0iOTYiIHkyPSIxMjUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIwLjgiIG9wYWNpdHk9IjAuNSIvPgogIDxsaW5lIHgxPSI2NSIgeTE9IjEzNyIgeDI9Ijk2IiB5Mj0iMTMyIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEJvb2sgcGFnZXMgbGluZXMgcmlnaHQgLS0+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEyMyIgeDI9IjEwNCIgeTI9IjExOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEzMCIgeDI9IjEwNCIgeTI9IjEyNSIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEzNyIgeDI9IjEwNCIgeTI9IjEzMiIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPCEtLSBUZXh0IC0tPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTY4IiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMwMGQ0ZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIzIj5JTlNUSVRVVEU8L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSIxODIiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM3ZWNmZWQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxIiBvcGFjaXR5PSIwLjgiPkxPR088L3RleHQ+Cjwvc3ZnPg==";

// Default values (fallback if not in Firestore)
const INST_DEFAULTS = {
  // ── Core Info ──────────────────────────────────────────────
  name:      INSTITUTE_CONFIG.name,
  shortName: INSTITUTE_CONFIG.shortName,
  director:  INSTITUTE_CONFIG.director,
  phone:     INSTITUTE_CONFIG.phone,
  city:      INSTITUTE_CONFIG.city,
  address:   INSTITUTE_CONFIG.address,
  classes:   'Class 6 to 10 (BSEB Bihar Board)',
  logo:      '',

  // ── Home Page — Hero / Badge / Slogans ────────────────────
  // These appear in the top badge and tagline lines below the logo
  hpBadge:      'Secure Learning Platform',   // text inside hero badge (city is appended automatically)
  hpSloganHindi:'आपका भविष्य, हमारी ज़िम्मेदारी',  // Hindi tagline below heading
  hpSloganEn:   'Your Future, Our Responsibility', // English tagline below Hindi

  // ── Home Page — Feature Cards (4 cards) ───────────────────
  // Each card: icon (emoji), title, description
  hpCard1Icon: '📚',
  hpCard1Title:'Study Materials',
  hpCard1Desc: 'Notes, assignments, DPPs and previous year papers — all organised by subject and chapter.',

  hpCard2Icon: '🎯',
  hpCard2Title:'Bihar & CBSE Board',
  hpCard2Desc: 'Expert preparation for Class 6-10 BSEB and Class 9-10 CBSE students of Buxar.',

  hpCard3Icon: '👨‍🏫',
  hpCard3Title:'Director',
  hpCard3Desc: '10+ years of teaching experience. Personal guidance for every student at Civil Line, Buxar.',

  hpCard4Icon: '🔒',
  hpCard4Title:'Secure Portal',
  hpCard4Desc: 'Only admin-approved students can access materials. Your data is safe and private.',

  // ── Home Page — Social / Map Links ───────────────────────
  // These links appear in the Contact section buttons
  hpMapsUrl:    'https://maps.app.goo.gl/pWSuecRDyFpVsxVq5',
  hpYoutubeUrl: 'https://www.youtube.com/@PradeepsirBCI',
  hpReviewUrl:  'https://g.page/r/CVV3GUY-gKWqEBM/review',
};

// In-memory state
window._instituteData = null;
window._newLogoData   = null;  // pending new logo (not yet saved)

// Load institute data from Firestore and render info card
async function loadInstituteInfo() {
  // Clean, simple load — no _defaultLogoSrc capture (that caused logo poisoning)
  try {
    const doc = await db.collection('admin').doc('institute').get();
    window._instituteData = doc.exists ? { ...INST_DEFAULTS, ...doc.data() } : { ...INST_DEFAULTS };
  } catch {
    window._instituteData = { ...INST_DEFAULTS };
  }
  // If no logo saved in Firestore yet, use the SVG default
  if (!window._instituteData.logo) {
    window._instituteData.logo = DEFAULT_LOGO_SRC;
  }
  renderInstituteInfoCard();
}

// Render the info card fields + logo
function renderInstituteInfoCard() {
  const d = window._instituteData;
  if (!d) return;

  // Logo — use saved logo or default hardcoded logo
  const logoImg      = document.getElementById('inst-logo-img');
  const logoFallback = document.getElementById('inst-logo-fallback');
  if (logoImg && logoFallback) {
    const logoSrc = d.logo || DEFAULT_LOGO_SRC;
    if (logoSrc) {
      logoImg.src            = logoSrc;
      logoImg.style.display  = 'block';
      logoFallback.style.display = 'none';
    } else {
      logoImg.style.display  = 'none';
      logoFallback.style.display = 'flex';
    }
  }

  // Name & short name
  const nameEl  = document.getElementById('inst-display-name');
  const shortEl = document.getElementById('inst-display-short');
  if (nameEl)  nameEl.textContent  = d.name      || '';
  if (shortEl) shortEl.textContent = d.shortName || '';

  // ── Always apply logo + data everywhere, regardless of which page is active ──
  applyLogoToSidebars(d.logo);
  applyShortNameToSidebars(d.shortName);
  applyInstituteDataEverywhere(d);

  // Info rows — only rendered when Settings page is active
  const rowsEl = document.getElementById('inst-info-rows');
  if (!rowsEl) return;
  const rows = [
    { label: 'Director', val: d.director },
    { label: 'Phone',    val: d.phone    },
    { label: 'City',     val: d.city     },
    { label: 'Address',  val: d.address  },
    { label: 'Classes',  val: d.classes  },
  ];
  rowsEl.innerHTML = rows.map(r => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;gap:12px;">
      <div style="font-size:var(--fs-xs);color:var(--text-dim);min-width:90px;padding-top:2px;text-transform:uppercase;letter-spacing:0.5px;">${r.label}</div>
      <div style="font-size:var(--fs-sm);color:var(--text-white);font-weight:500;">${r.val || '—'}</div>
    </div>
  `).join('');
}

// Update logo EVERYWHERE — sidebars, homepage navbar, hero, login page
function applyLogoToSidebars(logoSrc) {
  // Sidebar logos are now permanently hardcoded — no dynamic update needed.
  // Homepage logos (nav, hero, login) are also hardcoded in the HTML.
  // This function is kept as a no-op to avoid errors from existing call sites.
}

// Update short name in sidebars
function applyShortNameToSidebars(shortName) {
  if (!shortName) return;
  document.querySelectorAll('.sidebar-brand-text h2').forEach(el => {
    el.textContent = shortName;
  });
}

// Update ALL hardcoded institute text across every page
// Called after loadInstituteInfo() and after saveInstituteInfo()
// Any new DOM element that should reflect Firestore data must be added here.
function applyInstituteDataEverywhere(d) {
  if (!d) return;
  const n    = d.name      || '';
  const sn   = d.shortName || '';
  const dir  = d.director  || '';
  const ph   = d.phone     || '';
  const city = d.city      || '';
  const addr = d.address   || '';

  // ── Page <title> ─────────────────────────────────────────
  document.title = `${sn} — ${n} | ${city}`;

  // ── Homepage navbar ────────────────────────────────────────
  setText('hp-nav-shortname',  sn);
  setText('hp-nav-fullname',   n);

  // ── Hero section — badge + city ───────────────────────────
  // hpBadge holds the prefix text ("Secure Learning Platform"), city is appended separately
  setText('hp-badge-prefix', d.hpBadge || INST_DEFAULTS.hpBadge);
  setText('hp-hero-city',    city);

  // ── Hero section — slogans ────────────────────────────────
  setText('hp-slogan-hindi', d.hpSloganHindi || INST_DEFAULTS.hpSloganHindi);
  setText('hp-slogan-en',    d.hpSloganEn    || INST_DEFAULTS.hpSloganEn);

  // ── Feature cards (all 4) — icon, title, desc ─────────────
  // Card 1
  setText('hp-card-1-icon',  d.hpCard1Icon  || INST_DEFAULTS.hpCard1Icon);
  setText('hp-card-1-title', d.hpCard1Title || INST_DEFAULTS.hpCard1Title);
  setText('hp-card-1-desc',  d.hpCard1Desc  || INST_DEFAULTS.hpCard1Desc);
  // Card 2
  setText('hp-card-2-icon',  d.hpCard2Icon  || INST_DEFAULTS.hpCard2Icon);
  setText('hp-card-2-title', d.hpCard2Title || INST_DEFAULTS.hpCard2Title);
  setText('hp-card-2-desc',  d.hpCard2Desc  || INST_DEFAULTS.hpCard2Desc);
  // Card 3 — also updates the inner director span used elsewhere
  setText('hp-card-3-icon',  d.hpCard3Icon  || INST_DEFAULTS.hpCard3Icon);
  setText('hp-card-3-title', d.hpCard3Title || INST_DEFAULTS.hpCard3Title);
  setText('hp-card-3-desc',  d.hpCard3Desc  || INST_DEFAULTS.hpCard3Desc);
  // hp-feature-director is a legacy inner span inside card-3-desc — keep it updated too
  setText('hp-feature-director', d.hpCard3Desc || INST_DEFAULTS.hpCard3Desc);
  // Card 4
  setText('hp-card-4-icon',  d.hpCard4Icon  || INST_DEFAULTS.hpCard4Icon);
  setText('hp-card-4-title', d.hpCard4Title || INST_DEFAULTS.hpCard4Title);
  setText('hp-card-4-desc',  d.hpCard4Desc  || INST_DEFAULTS.hpCard4Desc);

  // ── Contact section ────────────────────────────────────────
  setHTML('hp-contact-director', dir);
  setHTML('hp-contact-phone',    ph);
  setHTML('hp-contact-address',  addr);

  // ── Contact section — social / map links (update href) ────
  // setHref() is a safe helper defined below that only updates existing elements
  setHref('hp-maps-link',    d.hpMapsUrl    || INST_DEFAULTS.hpMapsUrl);
  setHref('hp-review-link',  d.hpReviewUrl  || INST_DEFAULTS.hpReviewUrl);
  setHref('hp-youtube-link', d.hpYoutubeUrl || INST_DEFAULTS.hpYoutubeUrl);

  // ── Notice board tagline ───────────────────────────────────
  setText('hp-notice-name', sn);

  // ── Footer ─────────────────────────────────────────────────
  setText('hp-footer-name', n);
  setText('hp-footer-city', city);

  // ── Student sidebar ────────────────────────────────────────
  setText('s-sidebar-shortname', sn);

  // ── Student stat card ──────────────────────────────────────
  setText('s-stat-shortname', sn);
  setText('s-stat-name',      n.length > 18 ? sn : n);

  // ── Student notice board page ──────────────────────────────
  setText('s-noticeboard-name',  n);
  setText('s-notice-empty-name', sn);

  // ── Admin sidebar ──────────────────────────────────────────
  setText('a-sidebar-shortname', sn);

  // ── Admin dashboard welcome ────────────────────────────────
  setText('a-dash-name', n);
}

// Helpers — safe DOM updaters used by applyInstituteDataEverywhere()
function setText(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.textContent = val;
}
function setHTML(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.innerHTML = val;
}
// Update an anchor's href attribute (used for map/review/youtube links)
function setHref(id, url) {
  if (!url) return;
  const el = document.getElementById(id);
  if (el) el.href = url;
}

// Open Edit Institute modal — pre-fill ALL fields (core + home page)
function openEditInstituteModal() {
  const d = window._instituteData || INST_DEFAULTS;

  // ── Core fields ──────────────────────────────────────────
  document.getElementById('ei-name').value      = d.name      || '';
  document.getElementById('ei-shortname').value = d.shortName || '';
  document.getElementById('ei-director').value  = d.director  || '';
  document.getElementById('ei-phone').value     = d.phone     || '';
  document.getElementById('ei-city').value      = d.city      || '';
  document.getElementById('ei-address').value   = d.address   || '';
  document.getElementById('ei-classes').value   = d.classes   || '';

  // Hide any previous error message
  const msgEl = document.getElementById('edit-inst-msg');
  if (msgEl) msgEl.style.display = 'none';

  openModal('modal-edit-institute');
}

// Save institute info to Firestore
// Show confirmation modal before applying changes
// Validates required fields and shows a preview of all new values
function confirmInstituteEdit() {
  const name      = document.getElementById('ei-name').value.trim();
  const shortName = document.getElementById('ei-shortname').value.trim();
  const director  = document.getElementById('ei-director').value.trim();
  const msgEl     = document.getElementById('edit-inst-msg');

  // Required-field validation
  if (!name || !shortName || !director) {
    msgEl.style.cssText = 'display:block;padding:10px 14px;background:rgba(255,68,102,0.08);border:1px solid rgba(255,68,102,0.3);border-radius:var(--radius-sm);margin-bottom:12px;font-size:var(--fs-sm);color:var(--danger);';
    msgEl.textContent   = '⚠️ Name, Short Name and Director are required.';
    return;
  }

  // ── Core fields preview ───────────────────────────────────
  document.getElementById('inst-confirm-name').textContent      = name;
  document.getElementById('inst-confirm-short').textContent     = shortName;
  document.getElementById('inst-confirm-director').textContent  = director;
  document.getElementById('inst-confirm-phone').textContent     = document.getElementById('ei-phone').value.trim()   || '—';
  document.getElementById('inst-confirm-city').textContent      = document.getElementById('ei-city').value.trim()    || '—';
  document.getElementById('inst-confirm-address').textContent   = document.getElementById('ei-address').value.trim() || '—';
  document.getElementById('inst-confirm-classes').textContent   = document.getElementById('ei-classes').value.trim() || '—';

  openModal('modal-confirm-institute');
}

// Save ALL institute info (core + home page fields) to Firestore
// Falls back to INST_DEFAULTS for any field left blank
async function saveInstituteInfo() {
  const msgEl = document.getElementById('edit-inst-msg');

  // ── Read core fields ──────────────────────────────────────
  const name      = document.getElementById('ei-name').value.trim();
  const shortName = document.getElementById('ei-shortname').value.trim();
  const director  = document.getElementById('ei-director').value.trim();
  const phone     = document.getElementById('ei-phone').value.trim();
  const city      = document.getElementById('ei-city').value.trim();
  const address   = document.getElementById('ei-address').value.trim();
  const classes   = document.getElementById('ei-classes').value.trim();

  // ── Required field guard (should have been caught by confirmInstituteEdit,
  //    but we double-check here for safety) ──────────────────
  if (!name || !shortName || !director) {
    msgEl.style.cssText = 'display:block;padding:10px 14px;background:rgba(255,68,102,0.08);border:1px solid rgba(255,68,102,0.3);border-radius:var(--radius-sm);margin-bottom:12px;font-size:var(--fs-sm);color:var(--danger);';
    msgEl.textContent   = '⚠️ Name, Short Name and Director are required.';
    return;
  }

  try {
    // Build the complete updated object — spread existing data first so
    // fields not in this form (e.g. logo, logoHistory) are preserved
    const updated = {
      ...window._instituteData,
      // Core fields only — HP fields are managed by Home Page Editor
      name, shortName, director, phone, city, address, classes,
    };

    // Persist to Firestore
    await db.collection('admin').doc('institute').set(updated);

    // Update in-memory cache so rest of app sees new values immediately
    window._instituteData = updated;

    // Re-render the info card in Settings and push to all DOM elements
    renderInstituteInfoCard();

    closeModal('modal-edit-institute');
    showToast('✅ Institute info updated!', 'success');
  } catch (err) {
    msgEl.style.cssText = 'display:block;padding:10px 14px;background:rgba(255,68,102,0.08);border:1px solid rgba(255,68,102,0.3);border-radius:var(--radius-sm);margin-bottom:12px;font-size:var(--fs-sm);color:var(--danger);';
    msgEl.textContent   = '❌ Failed to save. Check internet and try again.';
    console.error('saveInstituteInfo error:', err);
  }
}


// =============================================================
// LOGO CHANGE — Preview, Save, Undo History
// =============================================================

// Open logo change modal
function openLogoChangeModal() {
  window._newLogoData = null;

  // Show current logo in modal — use saved logo or default hardcoded logo
  const d = window._instituteData || {};
  const currentLogoSrc = d.logo || DEFAULT_LOGO_SRC;
  const currentEl = document.getElementById('logo-current-preview');
  if (currentEl) {
    currentEl.innerHTML = currentLogoSrc
      ? `<img src="${currentLogoSrc}" style="width:100%;height:100%;object-fit:cover;">`
      : `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGExNjI4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzExMjI0NCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ2xvdyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMGQ0ZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA5OWNjIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIEJhY2tncm91bmQgY2lyY2xlIC0tPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPgogIDwhLS0gT3V0ZXIgcmluZyAtLT4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjkyIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iOCA0IiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEdyYWR1YXRpb24gY2FwIGJhc2UgKG1vcnRhcmJvYXJkKSAtLT4KICA8IS0tIENhcCB0b3AgZGlhbW9uZCAtLT4KICA8cG9seWdvbiBwb2ludHM9IjEwMCw0MiAxNDgsNjUgMTAwLDg4IDUyLDY1IiBmaWxsPSJ1cmwoI2dsb3cpIiBvcGFjaXR5PSIwLjk1Ii8+CiAgPCEtLSBDYXAgYm9hcmQgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxMDAsNDggMTQyLDY4IDEwMCw4OCA1OCw2OCIgZmlsbD0iIzAwZDRmZiIgb3BhY2l0eT0iMC4xNSIvPgogIDwhLS0gQ2FwIG91dGxpbmUgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIxMDAsNDIgMTQ4LDY1IDEwMCw4OCA1Miw2NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDwhLS0gQ2FwIHN0ZW0gLS0+CiAgPHJlY3QgeD0iOTciIHk9IjY1IiB3aWR0aD0iNiIgaGVpZ2h0PSIyOCIgcng9IjMiIGZpbGw9InVybCgjZ2xvdykiLz4KICA8IS0tIENhcCB0YXNzZWwgYmFzZSBjaXJjbGUgLS0+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iOTMiIHI9IjciIGZpbGw9IiMwMGQ0ZmYiIG9wYWNpdHk9IjAuOSIvPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjkzIiByPSI0IiBmaWxsPSIjMGExNjI4Ii8+CiAgPCEtLSBUYXNzZWwgcm9wZSAtLT4KICA8cGF0aCBkPSJNIDE0NSA2NSBRIDE1NSA3MCAxNTMgODIgTCAxNTAgOTUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMTUwIiB5MT0iOTUiIHgyPSIxNDciIHkyPSIxMDgiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNiIvPgogIDxsaW5lIHgxPSIxNTAiIHkxPSI5NSIgeDI9IjE1MyIgeTI9IjEwOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC42Ii8+CiAgPGxpbmUgeDE9IjE1MCIgeTE9Ijk1IiB4Mj0iMTUwIiB5Mj0iMTEwIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjYiLz4KICA8IS0tIE9wZW4gYm9vayBiZWxvdyAtLT4KICA8cGF0aCBkPSJNIDU1IDExOCBRIDEwMCAxMDggMTQ1IDExOCBMIDE0NSAxNDggUSAxMDAgMTM4IDU1IDE0OCBaIiBmaWxsPSIjMTEyMjQ0IiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPGxpbmUgeDE9IjEwMCIgeTE9IjEwOCIgeDI9IjEwMCIgeTI9IjE0OCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8IS0tIEJvb2sgcGFnZXMgbGluZXMgbGVmdCAtLT4KICA8bGluZSB4MT0iNjUiIHkxPSIxMjMiIHgyPSI5NiIgeTI9IjExOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjY1IiB5MT0iMTMwIiB4Mj0iOTYiIHkyPSIxMjUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIwLjgiIG9wYWNpdHk9IjAuNSIvPgogIDxsaW5lIHgxPSI2NSIgeTE9IjEzNyIgeDI9Ijk2IiB5Mj0iMTMyIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEJvb2sgcGFnZXMgbGluZXMgcmlnaHQgLS0+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEyMyIgeDI9IjEwNCIgeTI9IjExOCIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEzMCIgeDI9IjEwNCIgeTI9IjEyNSIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPGxpbmUgeDE9IjEzNSIgeTE9IjEzNyIgeDI9IjEwNCIgeTI9IjEzMiIgc3Ryb2tlPSIjMDBkNGZmIiBzdHJva2Utd2lkdGg9IjAuOCIgb3BhY2l0eT0iMC41Ii8+CiAgPCEtLSBUZXh0IC0tPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTY4IiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMwMGQ0ZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIzIj5JTlNUSVRVVEU8L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSIxODIiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM3ZWNmZWQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxIiBvcGFjaXR5PSIwLjgiPkxPR088L3RleHQ+Cjwvc3ZnPg==" style="width:100%;height:100%;object-fit:cover;">`; 
  }

  // Reset new preview
  const newEl = document.getElementById('logo-new-preview');
  if (newEl) newEl.innerHTML = '?';

  // Reset file input + buttons
  const fileInput = document.getElementById('logo-file-input');
  if (fileInput) fileInput.value = '';
  const clearBtn = document.getElementById('logo-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  const saveBtn = document.getElementById('logo-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed'; }
  const msgEl = document.getElementById('logo-file-msg');
  if (msgEl) msgEl.textContent = '';

  // Show undo bar if history exists
  renderLogoHistory();

  openModal('modal-change-logo');
}

// Preview newly selected logo file
function previewNewLogo(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const msgEl = document.getElementById('logo-file-msg');

  if (!file.type.startsWith('image/')) {
    if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = '⚠️ Only image files allowed.'; }
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = '⚠️ File too large. Max 3MB.'; }
    return;
  }

  if (msgEl) { msgEl.style.color = 'var(--text-muted)'; msgEl.textContent = '⏳ Processing...'; }

  compressPhoto(file, 400, 0.85).then(compressed => {
    window._newLogoData = compressed;
    const newEl = document.getElementById('logo-new-preview');
    if (newEl) newEl.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;">`;
    const clearBtn = document.getElementById('logo-clear-btn');
    if (clearBtn) clearBtn.style.display = 'inline-flex';
    const saveBtn = document.getElementById('logo-save-btn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
    const kb = Math.round(compressed.length * 0.75 / 1024);
    if (msgEl) { msgEl.style.color = 'var(--success)'; msgEl.textContent = `✅ Ready (~${kb}KB)`; }
  }).catch(() => {
    if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = '⚠️ Could not process image. Try another file.'; }
  });
}

// Clear new logo selection
function clearNewLogo() {
  window._newLogoData = null;
  const fileInput = document.getElementById('logo-file-input');
  if (fileInput) fileInput.value = '';
  const newEl = document.getElementById('logo-new-preview');
  if (newEl) newEl.innerHTML = '?';
  const clearBtn = document.getElementById('logo-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  const saveBtn = document.getElementById('logo-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed'; }
  const msgEl = document.getElementById('logo-file-msg');
  if (msgEl) msgEl.textContent = '';
}

// Save new logo — pushes current to history (max 3), applies new
async function saveNewLogo() {
  if (!window._newLogoData) return;
  const d = window._instituteData || {};

  // Push current logo into history (max 3 entries)
  const history = d.logoHistory || [];
  if (d.logo) history.unshift(d.logo);
  const trimmedHistory = history.slice(0, 3);

  const updated = { ...d, logo: window._newLogoData, logoHistory: trimmedHistory };

  try {
    await db.collection('admin').doc('institute').set(updated);
    window._instituteData = updated;
    renderInstituteInfoCard();
    closeModal('modal-change-logo');
    showToast('✅ Logo updated everywhere!', 'success');
  } catch (err) {
    showToast('❌ Failed to save logo. Try again.', 'error');
    console.error(err);
  }
}

// Render undo history thumbnails
function renderLogoHistory() {
  const d = window._instituteData || {};
  const history = d.logoHistory || [];
  const bar     = document.getElementById('logo-undo-bar');
  const list    = document.getElementById('logo-history-list');
  if (!bar || !list) return;

  if (history.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';

  list.innerHTML = history.map((src, i) => `
    <div style="text-align:center;">
      <div onclick="restoreLogo(${i})" title="Restore this logo"
           style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid var(--border);cursor:pointer;background:var(--bg-card2);transition:border-color 0.2s;"
           onmouseover="this.style.borderColor='var(--neon-blue)'" onmouseout="this.style.borderColor='var(--border)'">
        <img src="${src}" style="width:100%;height:100%;object-fit:cover;">
      </div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">v${history.length - i}</div>
    </div>
  `).join('') + `<div style="font-size:var(--fs-xs);color:var(--text-dim);margin-left:4px;">← click to restore</div>`;
}

// Restore a logo from history
async function restoreLogo(index) {
  const d       = window._instituteData || {};
  const history = [...(d.logoHistory || [])];
  const logoToRestore = history[index];
  if (!logoToRestore) return;

  // Push current logo into history, remove the one being restored
  const newHistory = [];
  if (d.logo) newHistory.push(d.logo);
  history.forEach((h, i) => { if (i !== index) newHistory.push(h); });
  const trimmedHistory = newHistory.slice(0, 3);

  const updated = { ...d, logo: logoToRestore, logoHistory: trimmedHistory };

  try {
    await db.collection('admin').doc('institute').set(updated);
    window._instituteData = updated;
    renderInstituteInfoCard();
    closeModal('modal-change-logo');
    showToast('✅ Previous logo restored!', 'success');
  } catch (err) {
    showToast('❌ Failed to restore logo.', 'error');
    console.error(err);
  }
}


// =============================================================
// PLACEHOLDER — loadAdminMaterialsPage is built in Part 5
// =============================================================
function loadAdminMaterialsPage() {
  const container = document.getElementById('a-materials-content');
  if (!container) return;
  if (typeof buildAdminMaterialsPage === 'function') {
    buildAdminMaterialsPage();
  } else {
    container.innerHTML = `
      <div class="info-box">
        ⚠️ Part 5 (Folders & Materials) not loaded yet.
        Please add Part 5 code to your file.
      </div>`;
  }
}

console.log('✅ PART 4: Admin Dashboard loaded');

// Auto-create default session 2026-27 only if NO sessions exist at all.
// startDate / endDate are intentionally excluded — admin sets them manually.
// Including them (even as '') would overwrite saved values on re-create.
(async function initDefaultSession() {
  try {
    const snap = await db.collection('sessions').limit(1).get();
    if (snap.empty) {
      await db.collection('sessions').doc('2026-27').set({
        isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
        // Do NOT include startDate / endDate here
      });
      console.log('✅ Default session 2026-27 created');
      loadActiveSessionIntoDropdowns();
    }
  } catch(e) { /* silent */ }
})();

// =====================================================
// PART 5 — FOLDER SYSTEM, FILE MANAGER,
//           LOCK/UNLOCK & AUTO-UNLOCK TIMERS
// =====================================================
// Contains:
//   [1] Admin folder browser (class selector → folders)
//   [2] Create / Rename / Delete folders (any level)
//   [3] Add files inside any folder
//   [4] Lock / Unlock any folder or file
//   [5] Set auto-unlock timer on any folder or file
//   [6] Breadcrumb navigation for admin
//   [7] All folder/file CRUD logic with Firebase
// =====================================================
// RULES:
//   ✅ Admin can create unlimited folder levels
//   ✅ Admin can lock/unlock any folder or file
//   ✅ Admin can set timer → auto unlocks at set time
//   ✅ Locked folder = entire folder hidden from students
//   ✅ Locked file = file hidden even if folder is open
//   ✅ Admin always sees everything (with 🔒 badge)
//   ❌ Students can NEVER delete/edit/move anything
//   ❌ Students never see locked items
// =====================================================

// =============================================================
// DRAG-DROP SORTING FOR FOLDERS (Admin only)
// Lightweight implementation using HTML5 drag-drop API
// =============================================================
function initFolderDragSort() {
  const folderGrid = document.getElementById('sortable-folders');
  if (!folderGrid) return;

  const folderItems = folderGrid.querySelectorAll('.folder-item[draggable="true"]');
  let draggedItem = null;

  folderItems.forEach(item => {
    item.addEventListener('dragstart', function(e) {
      draggedItem = this;
      this.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', function() {
      this.style.opacity = '1';
      draggedItem = null;
    });

    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (this === draggedItem) return;
      
      const rect = this.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      
      if (e.clientX < midpoint) {
        this.parentNode.insertBefore(draggedItem, this);
      } else {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
      }
    });

    item.addEventListener('drop', async function(e) {
      e.preventDefault();
      await saveFolderOrder();
    });
  });
}

// Save new folder order to Firebase
async function saveFolderOrder() {
  const folderGrid = document.getElementById('sortable-folders');
  if (!folderGrid) return;

  const folderItems = folderGrid.querySelectorAll('.folder-item[draggable="true"]');
  const batch = db.batch();

  folderItems.forEach((item, index) => {
    const folderId = item.getAttribute('data-folder-id');
    const folderRef = db.collection('folders').doc(folderId);
    batch.update(folderRef, { sortOrder: index });
  });

  try {
    await batch.commit();
    console.log('✅ Folder order saved');
  } catch (err) {
    console.error('Error saving folder order:', err);
    showToast('Could not save folder order. Please try again.', 'error');
  }
}


// =============================================================
// ADMIN MATERIALS PAGE STATE
// Tracks which class and folder admin is browsing
// =============================================================
let AdminFolderState = {
  currentBoard:     null,  // 'BSEB' or 'CBSE'
  currentClassId:   null,
  currentClassName: null,
  currentFolderId:  null,
  breadcrumbs:      [],
};


// =============================================================
// BUILD ADMIN MATERIALS PAGE — shows board selector first
// =============================================================
function buildAdminMaterialsPage() {
  const container = document.getElementById('a-materials-content');
  if (!container) return;

  AdminFolderState = {
    currentBoard: null, currentClassId: null, currentClassName: null,
    currentFolderId: null, breadcrumbs: []
  };

  container.innerHTML = `

    <!-- ── BOARD SELECTOR ── -->
    <div id="admin-board-selector" style="margin-bottom:24px;">
      <p style="color:var(--text-muted); margin-bottom:16px; font-size:var(--fs-sm);">
        Select a board first, then choose a class to manage its folders and materials:
      </p>
      <div style="display:flex; gap:14px; flex-wrap:wrap;">
        <div onclick="selectBoardForMaterials('BSEB')" style="
          padding:20px 36px; border-radius:var(--radius); cursor:pointer;
          border:2px solid var(--neon-blue); background:rgba(0,212,255,0.06);
          text-align:center; transition:all 0.2s; min-width:160px;"
          onmouseenter="this.style.background='rgba(0,212,255,0.14)'"
          onmouseleave="this.style.background='rgba(0,212,255,0.06)'">
          <div style="font-size:32px; margin-bottom:6px;">📘</div>
          <div style="font-family:'Rajdhani',sans-serif; font-weight:700;
                      font-size:var(--fs-lg); color:var(--neon-blue);">BSEB</div>
          <div style="font-size:var(--fs-xs); color:var(--text-muted); margin-top:2px;">Bihar Board</div>
        </div>
        <div onclick="selectBoardForMaterials('CBSE')" style="
          padding:20px 36px; border-radius:var(--radius); cursor:pointer;
          border:2px solid var(--success); background:rgba(0,255,136,0.04);
          text-align:center; transition:all 0.2s; min-width:160px;"
          onmouseenter="this.style.background='rgba(0,255,136,0.12)'"
          onmouseleave="this.style.background='rgba(0,255,136,0.04)'">
          <div style="font-size:32px; margin-bottom:6px;">📗</div>
          <div style="font-family:'Rajdhani',sans-serif; font-weight:700;
                      font-size:var(--fs-lg); color:var(--success);">CBSE</div>
          <div style="font-size:var(--fs-xs); color:var(--text-muted); margin-top:2px;">Central Board</div>
        </div>
      </div>
    </div>

    <!-- ── CLASS SELECTOR (shown after board selected) ── -->
    <div id="admin-class-selector" style="display:none;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="backToBoardSelector()">← All Boards</button>
        <span id="admin-board-label" style="font-weight:700; color:var(--neon-blue); font-size:var(--fs-base);"></span>
      </div>
      <p style="color:var(--text-muted); margin-bottom:16px; font-size:var(--fs-sm);">
        Select a class to manage its folders and materials:
      </p>
      <div id="admin-class-cards"
           style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:14px;">
        <div class="loading-screen" style="grid-column:1/-1;"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- ── FOLDER BROWSER (shown after class selected) ── -->
    <div id="admin-folder-browser" style="display:none;">

      <!-- Top action bar -->
      <div style="display:flex; justify-content:space-between;
                  align-items:center; margin-bottom:20px;
                  flex-wrap:wrap; gap:12px;">
        <button class="btn btn-ghost btn-sm"
                onclick="backToClassSelector()">
          ← All Classes
        </button>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm"
                  onclick="openModal('modal-add-folder')">
            📁 New Folder
          </button>
          <button class="btn btn-success btn-sm"
                  onclick="openAddFileModal()">
            📄 Add File
          </button>
        </div>
      </div>

      <!-- Breadcrumb -->
      <div class="breadcrumb" id="admin-breadcrumb"></div>

      <!-- Folder + File contents -->
      <div id="admin-folder-contents">
        <div class="loading-screen">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>

    </div>

    <!-- ── MODALS for folder/file management ── -->

    <!-- Modal: Add Folder -->
    <div class="modal-overlay" id="modal-add-folder">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">📁 New Folder</div>
          <button class="modal-close"
                  onclick="closeModal('modal-add-folder')">✕</button>
        </div>
        <div class="info-box" id="add-folder-location-info"></div>
        <div class="form-group">
          <label>Folder Name <span class="required">*</span></label>
          <input class="form-control" id="new-folder-name"
                 placeholder="e.g. Chapter 1 - Motion, Physics Notes">
        </div>
        <div class="form-group">
          <label>Lock this folder? <span class="optional">(optional)</span></label>
          <select class="form-control" id="new-folder-locked">
            <option value="false">🔓 Public (students can see)</option>
            <option value="true">🔒 Locked (only admin sees)</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost"
                  onclick="closeModal('modal-add-folder')">Cancel</button>
          <button class="btn btn-primary"
                  onclick="handleAddFolder()">📁 Create Folder</button>
        </div>
      </div>
    </div>

    <!-- Modal: Rename Folder -->
    <div class="modal-overlay" id="modal-rename-folder">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">✏️ Rename Folder</div>
          <button class="modal-close"
                  onclick="closeModal('modal-rename-folder')">✕</button>
        </div>
        <input type="hidden" id="rename-folder-id">
        <div class="form-group">
          <label>New Folder Name <span class="required">*</span></label>
          <input class="form-control" id="rename-folder-name"
                 placeholder="New folder name">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost"
                  onclick="closeModal('modal-rename-folder')">Cancel</button>
          <button class="btn btn-primary"
                  onclick="handleRenameFolder()">✏️ Rename</button>
        </div>
      </div>
    </div>

    <!-- Modal: Add File -->
    <div class="modal-overlay" id="modal-add-file">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div class="modal-title">📄 Add Study Material</div>
          <button class="modal-close" onclick="closeModal('modal-add-file')">✕</button>
        </div>
        <div class="info-box" id="add-file-location-info"></div>

        <!-- Title + Type -->
        <div class="form-row">
          <div class="form-group">
            <label>Title <span class="required">*</span></label>
            <input class="form-control" id="new-file-title"
                   placeholder="e.g. Chapter 1 Notes, Assignment 2">
          </div>
          <div class="form-group">
            <label>Material Type <span class="required">*</span></label>
            <select class="form-control" id="new-file-type">
              <option value="Notes">📄 Notes</option>
              <option value="Assignment">📝 Assignment</option>
              <option value="DPP">📋 DPP (Practice)</option>
              <option value="Previous Year Paper">📜 Previous Year Paper</option>
              <option value="Syllabus">📑 Syllabus</option>
              <option value="Video">🎥 Video Link</option>
              <option value="Audio">🎵 Audio</option>
              <option value="Image">🖼️ Image</option>
              <option value="Other">📌 Other</option>
            </select>
          </div>
        </div>

        <!-- Source toggle -->
        <div style="margin-bottom:14px;">
          <label style="font-size:var(--fs-xs); color:var(--text-muted);
                        text-transform:uppercase; letter-spacing:.05em;
                        margin-bottom:8px; display:block;">
            File Source <span class="optional">(choose one)</span>
          </label>
          <div style="display:flex; gap:8px;">
            <button type="button" id="src-btn-upload" onclick="switchFileSource('upload')"
              style="flex:1; padding:9px 12px; border-radius:var(--radius-sm);
                     border:2px solid var(--neon-blue); background:rgba(0,212,255,0.12);
                     color:var(--neon-blue); font-size:var(--fs-sm);
                     cursor:pointer; font-weight:600; transition:all .2s;">
              ☁️ Upload File
            </button>
            <button type="button" id="src-btn-link" onclick="switchFileSource('link')"
              style="flex:1; padding:9px 12px; border-radius:var(--radius-sm);
                     border:2px solid var(--border); background:transparent;
                     color:var(--text-muted); font-size:var(--fs-sm);
                     cursor:pointer; font-weight:600; transition:all .2s;">
              🔗 Paste Link
            </button>
          </div>
        </div>

        <!-- Upload panel -->
        <div id="file-source-upload" class="form-group">
          <div onclick="document.getElementById('new-file-upload-input').click()"
               id="upload-drop-zone"
               style="border:2px dashed rgba(0,212,255,0.3); border-radius:var(--radius-sm);
                      padding:20px; text-align:center; cursor:pointer;
                      background:rgba(0,212,255,0.02);">
            <div style="font-size:2rem; margin-bottom:8px;">📁</div>
            <div style="color:var(--text-muted); font-size:var(--fs-sm);">Click to select file</div>
            <div style="color:var(--text-dim); font-size:var(--fs-xs); margin-top:4px;">
              PDF, Audio, Image, DOC — any format
            </div>
            <input type="file" id="new-file-upload-input" style="display:none;"
                   onchange="handleFileSelected(this)">
          </div>
          <!-- File preview (after selection) -->
          <div id="upload-file-info" style="display:none; margin-top:10px;
               background:rgba(0,212,255,0.06); border:1px solid rgba(0,212,255,0.2);
               border-radius:var(--radius-sm); padding:10px 14px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span id="upload-file-name" style="color:var(--text-primary);
                    font-weight:500; word-break:break-all; font-size:var(--fs-sm);"></span>
              <button type="button" onclick="clearSelectedFile()"
                style="background:none;border:none;color:var(--text-dim);
                       cursor:pointer;font-size:1rem;padding:0 0 0 8px;flex-shrink:0;">✕</button>
            </div>
            <div id="upload-file-size" style="font-size:var(--fs-xs);
                 color:var(--text-dim); margin-top:3px;"></div>
          </div>
          <!-- Progress bar -->
          <div id="upload-progress-wrap" style="display:none; margin-top:10px;">
            <div style="display:flex; justify-content:space-between;
                        font-size:var(--fs-xs); color:var(--text-muted); margin-bottom:5px;">
              <span>Uploading...</span>
              <span id="upload-progress-pct">0%</span>
            </div>
            <div style="background:var(--border); border-radius:999px; height:8px; overflow:hidden;">
              <div id="upload-progress-bar"
                   style="height:100%; width:0%; border-radius:999px;
                          background:linear-gradient(90deg,var(--neon-blue),#00ffcc);
                          transition:width .3s ease;"></div>
            </div>
          </div>
        </div>

        <!-- Link panel -->
        <div id="file-source-link" class="form-group" style="display:none;">
          <label>Google Drive / YouTube / Any Link
            <span class="optional">(optional — can add later)</span>
          </label>
          <input class="form-control" id="new-file-link"
                 placeholder="https://drive.google.com/file/d/...">
          <div style="margin-top:8px; background:rgba(0,212,255,0.04);
            border:1px solid rgba(0,212,255,0.15); border-radius:var(--radius-sm);
            padding:10px 12px; font-size:var(--fs-xs); color:var(--text-muted); line-height:1.7;">
            💡 <strong style="color:var(--neon-blue);">Google Drive tip:</strong>
            Right-click file → Share → "Anyone with the link" → Copy link
          </div>
        </div>

        <div class="form-group">
          <label>Description <span class="optional">(optional)</span></label>
          <textarea class="form-control" id="new-file-desc" rows="2"
                    placeholder="Brief description of this material..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Visibility</label>
            <select class="form-control" id="new-file-locked">
              <option value="false">🔓 Public immediately</option>
              <option value="true">🔒 Locked (private)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Auto-Unlock Date & Time <span class="optional">(optional)</span></label>
            <input class="form-control" id="new-file-timer" type="datetime-local">
            <div style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:4px;">
              File will auto-unlock at this date/time
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-add-file')">Cancel</button>
          <button class="btn btn-primary" id="btn-add-material"
                  onclick="handleAddFile()">📄 Add Material</button>
        </div>
      </div>
    </div>

    <!-- Modal: Rename File -->
    <div class="modal-overlay" id="modal-rename-file">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">✏️ Edit Material</div>
          <button class="modal-close" onclick="closeModal('modal-rename-file')">✕</button>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input class="form-control" id="rename-file-input"
                 placeholder="Enter new title for this file">
        </div>
        <div class="form-group">
          <label>Material Type</label>
          <select class="form-control" id="rename-file-type">
            <option value="Notes">📄 Notes</option>
            <option value="Assignment">📝 Assignment</option>
            <option value="DPP">📋 DPP (Practice)</option>
            <option value="Previous Year Paper">📜 Previous Year Paper</option>
            <option value="Syllabus">📑 Syllabus</option>
            <option value="Video">🎥 Video Link</option>
            <option value="Audio">🎵 Audio</option>
            <option value="Image">🖼️ Image</option>
            <option value="Other">📌 Other</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-rename-file')">Cancel</button>
          <button class="btn btn-primary" onclick="confirmRenameFile()">✏️ Save Changes</button>
        </div>
        <input type="hidden" id="rename-file-id" value="">
      </div>
    </div>

    <!-- Modal: Move File -->
    <div class="modal-overlay" id="modal-move-file">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">📂 Move File to Another Folder</div>
          <button class="modal-close" onclick="closeModal('modal-move-file')">✕</button>
        </div>
        <div style="margin-bottom:14px; font-size:var(--fs-sm); color:var(--text-muted);">
          Moving: <strong id="move-file-name" style="color:var(--text-primary);"></strong>
        </div>
        <div class="form-group">
          <label>Select Destination Folder</label>
          <select class="form-control" id="move-folder-select">
            <option value="root">📁 Root (top level)</option>
          </select>
          <div style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:6px;">
            🔒 Lock status and publish timer are kept unchanged after moving.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-move-file')">Cancel</button>
          <button class="btn btn-primary" onclick="confirmMoveFile()">📂 Move File</button>
        </div>
        <input type="hidden" id="move-file-id" value="">
      </div>
    </div>

    <!-- Modal: Move Folder -->
    <div class="modal-overlay" id="modal-move-folder">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">📦 Move Folder</div>
          <button class="modal-close" onclick="closeModal('modal-move-folder')">✕</button>
        </div>
        <div style="margin-bottom:14px; font-size:var(--fs-sm); color:var(--text-muted);">
          Moving: <strong id="move-folder-name" style="color:var(--text-primary);"></strong>
        </div>
        <div class="form-group">
          <label>Select Destination</label>
          <select class="form-control" id="move-folder-dest-select">
            <option value="root">📁 Root (top level)</option>
          </select>
          <div style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:6px;">
            ⚠️ Cannot move a folder into itself or its own subfolders.
            Lock status and timer are kept unchanged.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-move-folder')">Cancel</button>
          <button class="btn btn-primary" onclick="confirmMoveFolder()">📦 Move Folder</button>
        </div>
        <input type="hidden" id="move-folder-id" value="">
      </div>
    </div>

    <!-- Modal: Set Timer -->
    <div class="modal-overlay" id="modal-set-timer">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">⏰ Set Auto-Unlock Timer</div>
          <button class="modal-close"
                  onclick="closeModal('modal-set-timer')">✕</button>
        </div>
        <input type="hidden" id="timer-item-id">
        <input type="hidden" id="timer-item-type">
        <div class="info-box">
          Set a date and time when this item will automatically
          become public for students. Until then it stays locked.
        </div>
        <div class="form-group">
          <label>Unlock Date & Time <span class="required">*</span></label>
          <input class="form-control" id="timer-datetime"
                 type="datetime-local">
        </div>
        <div id="timer-current-info"
             style="font-size:var(--fs-xs); color:var(--text-muted);
                    margin-bottom:16px;">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost"
                  onclick="closeModal('modal-set-timer')">Cancel</button>
          <button class="btn btn-danger btn-sm"
                  onclick="clearTimer()">🗑️ Remove Timer</button>
          <button class="btn btn-primary"
                  onclick="handleSetTimer()">⏰ Set Timer</button>
        </div>
      </div>
    </div>

  `; // end container innerHTML
  // Board selector is shown — user clicks BSEB or CBSE to load classes
}


// =============================================================
// MATERIALS PAGE: SELECT BOARD
// =============================================================
function selectBoardForMaterials(board) {
  AdminFolderState.currentBoard = board;
  document.getElementById('admin-board-selector').style.display = 'none';
  document.getElementById('admin-class-selector').style.display = 'block';
  const label = document.getElementById('admin-board-label');
  if (label) label.textContent = board === 'BSEB' ? '📘 BSEB — Bihar Board' : '📗 CBSE';
  loadClassCardsForAdmin(board);
}

function backToBoardSelector() {
  AdminFolderState.currentBoard    = null;
  AdminFolderState.currentClassId  = null;
  AdminFolderState.currentFolderId = null;
  AdminFolderState.breadcrumbs     = [];
  document.getElementById('admin-board-selector').style.display = 'block';
  document.getElementById('admin-class-selector').style.display = 'none';
  document.getElementById('admin-folder-browser').style.display = 'none';
}

// =============================================================
// LOAD CLASS CARDS filtered by board
// =============================================================
async function loadClassCardsForAdmin(board) {
  const grid = document.getElementById('admin-class-cards');
  if (!grid) return;
  try {
    const snap = await db.collection('classes').orderBy('order').get();
    const filtered = snap.docs.filter(doc => {
      const b = doc.data().board;
      return (b === board) || (!b && board === 'BSEB');
    });
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🎓</div>
          <h3>No ${board} Classes Yet</h3>
          <p>Go to "Manage Classes" to add ${board} classes first.</p>
        </div>`;
      return;
    }
    grid.innerHTML = filtered.map(doc => {
      const c = doc.data();
      return `
        <div class="card" style="text-align:center; padding:24px; cursor:pointer; transition:all 0.2s;"
          onclick="selectClassForAdmin('${doc.id}','${c.name.replace(/'/g,"\\'")}' )"
          onmouseenter="this.style.borderColor='var(--neon-blue)';this.style.transform='translateY(-3px)'"
          onmouseleave="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
          <div style="font-size:40px; margin-bottom:12px;">🎓</div>
          <div style="font-weight:700; font-size:var(--fs-lg); margin-bottom:6px;">${c.name}</div>
          <div class="badge badge-blue" style="margin-top:4px;">Click to Manage →</div>
        </div>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<div class="info-box">Could not load classes.</div>';
  }
}


// =============================================================
// SELECT CLASS — switches to folder browser
// =============================================================
function selectClassForAdmin(classId, className) {
  AdminFolderState.currentClassId   = classId;
  AdminFolderState.currentClassName = className;
  AdminFolderState.currentFolderId  = null;
  AdminFolderState.breadcrumbs      = [];

  document.getElementById('admin-class-selector').style.display  = 'none';
  document.getElementById('admin-folder-browser').style.display  = 'block';

  updateAdminBreadcrumb();
  loadAdminFolderContents(null);
}


// =============================================================
// BACK TO CLASS SELECTOR (from folder browser)
// =============================================================
function backToClassSelector() {
  AdminFolderState.currentClassId  = null;
  AdminFolderState.currentFolderId = null;
  AdminFolderState.breadcrumbs     = [];

  document.getElementById('admin-class-selector').style.display = 'block';
  document.getElementById('admin-folder-browser').style.display = 'none';
}


// =============================================================
// LOAD ADMIN FOLDER CONTENTS
// Shows folders + files at current level
// Admin sees ALL items (locked + unlocked)
// Locked items shown with 🔒 badge and red border
// =============================================================
async function loadAdminFolderContents(parentFolderId) {
  const container = document.getElementById('admin-folder-contents');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>`;

  AdminFolderState.currentFolderId = parentFolderId;
  const classId = AdminFolderState.currentClassId;

  try {
    // ── Load subfolders ──
    let foldersQuery = db.collection('folders')
      .where('classId', '==', classId);

    foldersQuery = parentFolderId === null
      ? foldersQuery.where('parentFolderId', '==', null)
      : foldersQuery.where('parentFolderId', '==', parentFolderId);

    const foldersSnap = await foldersQuery.get();
    
    // ⚠️ FIX 2: Sort folders by sortOrder field (for drag-drop), fallback to name
    const folders = foldersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

    // ── Load files in this folder ──
    let filesSnap;
    try {
      filesSnap = await db.collection('materials')
        .where('classId', '==', classId)
        .where('folderId', '==', parentFolderId || 'root')
        .orderBy('createdAt', 'desc')
        .get();
    } catch(indexErr) {
      // Fallback: no orderBy
      filesSnap = await db.collection('materials')
        .where('classId', '==', classId)
        .where('folderId', '==', parentFolderId || 'root')
        .get();
    }

    let html = '';

    // ── FOLDERS SECTION ──
    if (folders.length > 0) {
      html += `
        <div style="margin-bottom:28px;">
          <div style="
            font-size:var(--fs-xs); color:var(--text-dim);
            text-transform:uppercase; letter-spacing:1.5px;
            font-weight:600; margin-bottom:14px;
            display:flex; align-items:center; gap:8px;
          ">
            📁 Folders
            <span class="badge badge-gray">${folders.length}</span>
            <span style="font-size:10px;color:var(--text-dim);margin-left:auto;">⋮⋮ Drag to reorder</span>
          </div>
          <div class="folder-grid" id="sortable-folders">`;

      folders.forEach((f, idx) => {
        const isLocked = f.isLocked;
        const countdown = f.unlockTimer ? getCountdown(f.unlockTimer) : null;

        html += `
          <div class="folder-item ${isLocked ? 'locked-item' : ''}"
               draggable="true"
               data-folder-id="${f.id}"
               data-sort-order="${f.sortOrder !== undefined ? f.sortOrder : idx}"
               style="border-color:${isLocked ? 'rgba(255,68,102,0.4)' : 'var(--border)'}; cursor:grab;"
               onclick="adminEnterFolder('${f.id}', '${f.name.replace(/'/g,"\\'")}')">

            <!-- Drag handle -->
            <div style="
              position:absolute; top:8px; left:8px;
              font-size:14px; color:var(--text-dim); cursor:grab;
            " onmousedown="event.stopPropagation();" title="Drag to reorder">⋮⋮</div>

            <!-- Lock indicator -->
            <div style="
              position:absolute; top:8px; left:32px;
              display:flex; gap:4px; align-items:center;
            ">
              ${isLocked
                ? `<span style="font-size:12px; color:var(--danger);">🔒</span>`
                : `<span style="font-size:12px; color:var(--success);">🔓</span>`}
            </div>

            <!-- Timer badge if set -->
            ${countdown ? `
              <div style="
                position:absolute; top:8px; right:36px;
                font-size:10px;
              ">
                <span class="timer-badge">⏰ ${countdown}</span>
              </div>` : ''}

            <span class="folder-icon" style="margin-top:8px;">
              ${isLocked ? '🔒' : '📁'}
            </span>
            <div class="folder-name">${f.name}</div>
            <div class="folder-meta">Tap to open</div>

            <!-- 3-dot menu -->
            <div style="position:absolute;top:8px;right:8px;">
              <button class="btn btn-ghost btn-sm folder-menu-btn"
                      onclick="event.stopPropagation();toggleFolderMenu('fmenu-${f.id}',this)"
                      style="font-size:20px;font-weight:900;padding:0 6px;line-height:1;border:none;">⋮</button>
              <div id="fmenu-${f.id}" class="folder-dropdown-menu" style="display:none;">
                <div class="fdm-item" onclick="event.stopPropagation();closeFolderMenus();adminEnterFolder('${f.id}','${f.name.replace(/'/g,"\\'")}')">📂 Open</div>
                <div class="fdm-item" onclick="event.stopPropagation();closeFolderMenus();toggleFolderLock('${f.id}',${isLocked})">${isLocked ? '🔓 Unlock' : '🔒 Lock'}</div>
                <div class="fdm-item" onclick="event.stopPropagation();closeFolderMenus();openSetTimerModal('${f.id}','folder','${countdown||''}')">⏰ Set Timer${countdown ? ' ✓':''}</div>
                <div class="fdm-item" onclick="event.stopPropagation();closeFolderMenus();openRenameFolderModal('${f.id}','${f.name.replace(/'/g,"\\'")}')">✏️ Rename</div>
                <div class="fdm-item" onclick="event.stopPropagation();closeFolderMenus();openMoveFolderModal('${f.id}','${f.name.replace(/'/g,"\\'")}')">📦 Move</div>
                <div class="fdm-item fdm-danger" onclick="event.stopPropagation();closeFolderMenus();confirmDeleteFolder('${f.id}','${f.name.replace(/'/g,"\\'")}')">🗑️ Delete</div>
              </div>
            </div>
          </div>`;
      });

      html += `</div></div>`;
    }

    // ── FILES SECTION ──
    if (!filesSnap.empty) {
      html += `
        <div>
          <div style="
            font-size:var(--fs-xs); color:var(--text-dim);
            text-transform:uppercase; letter-spacing:1.5px;
            font-weight:600; margin-bottom:14px;
            display:flex; align-items:center; gap:8px;
          ">
            📄 Files
            <span class="badge badge-gray">${filesSnap.size}</span>
          </div>
          <div class="file-list">`;

      filesSnap.forEach(doc => {
        html += buildFileItemHTML(doc.id, doc.data(), true); // true = admin view
      });

      html += `</div></div>`;
    }

    // ── EMPTY STATE ──
    if (foldersSnap.empty && filesSnap.empty) {
      html = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>This Folder is Empty</h3>
          <p>Use the buttons above to add folders or files here.</p>
          <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
            <button class="btn btn-primary btn-sm"
                    onclick="openModal('modal-add-folder')">
              📁 Add Folder
            </button>
            <button class="btn btn-success btn-sm"
                    onclick="openAddFileModal()">
              📄 Add File
            </button>
          </div>
        </div>`;
    }

    container.innerHTML = html;
    
    // ⚠️ FIX 2: Enable drag-and-drop sorting for folders
    initFolderDragSort();

  } catch (err) {
    container.innerHTML = `
      <div class="info-box">
        ⚠️ Could not load contents. Please check internet connection.
        <br><small style="color:var(--text-dim);">${err.message}</small>
      </div>`;
    console.error('Load folder error:', err);
  }
}


// =============================================================
// ADMIN: ENTER A FOLDER (navigate deeper)
// =============================================================
function adminEnterFolder(folderId, folderName) {
  AdminFolderState.breadcrumbs.push({ id: folderId, name: folderName });
  updateAdminBreadcrumb();
  loadAdminFolderContents(folderId);
}


// =============================================================
// ADMIN: NAVIGATE TO BREADCRUMB LEVEL
// =============================================================
function adminNavigateToBreadcrumb(index) {
  AdminFolderState.breadcrumbs = AdminFolderState.breadcrumbs.slice(0, index + 1);
  const target = AdminFolderState.breadcrumbs[index];
  updateAdminBreadcrumb();
  loadAdminFolderContents(target.id);
}


// =============================================================
// ADMIN: NAVIGATE TO ROOT of current class
// =============================================================
function adminNavigateToRoot() {
  AdminFolderState.breadcrumbs      = [];
  AdminFolderState.currentFolderId  = null;
  updateAdminBreadcrumb();
  loadAdminFolderContents(null);
}


// =============================================================
// UPDATE ADMIN BREADCRUMB DISPLAY
// =============================================================
function updateAdminBreadcrumb() {
  const bc = document.getElementById('admin-breadcrumb');
  if (!bc) return;

  const className = AdminFolderState.currentClassName || 'Class';
  let html = `
    <span class="breadcrumb-item ${AdminFolderState.breadcrumbs.length === 0 ? 'active' : ''}"
          onclick="adminNavigateToRoot()">
      🏠 ${className}
    </span>`;

  AdminFolderState.breadcrumbs.forEach((crumb, index) => {
    const isLast = index === AdminFolderState.breadcrumbs.length - 1;
    html += `<span class="breadcrumb-sep">›</span>`;
    html += `
      <span class="breadcrumb-item ${isLast ? 'active' : ''}"
            onclick="${isLast ? '' :
              `adminNavigateToBreadcrumb(${index})`}">
        📁 ${crumb.name}
      </span>`;
  });

  bc.innerHTML = html;

  // Update "add folder" and "add file" location info modals
  const locationText = AdminFolderState.breadcrumbs.length === 0
    ? `📍 Location: Root of ${className}`
    : `📍 Location: ${className} → ${AdminFolderState.breadcrumbs.map(b=>b.name).join(' → ')}`;

  const folderInfo = document.getElementById('add-folder-location-info');
  const fileInfo   = document.getElementById('add-file-location-info');
  if (folderInfo) folderInfo.textContent = locationText;
  if (fileInfo)   fileInfo.textContent   = locationText;
}


// =============================================================
// ADD FOLDER — creates folder at current location in Firebase
// =============================================================
async function handleAddFolder() {
  const name     = document.getElementById('new-folder-name').value.trim();
  const isLocked = document.getElementById('new-folder-locked').value === 'true';

  if (!name) {
    showToast('Please enter a folder name.', 'error'); return;
  }

  const classId      = AdminFolderState.currentClassId;
  const parentId     = AdminFolderState.currentFolderId;

  if (!classId) {
    showToast('No class selected. Please go back and select a class.', 'error'); return;
  }

  try {
    // Get current max sortOrder to place new folder at end
    const existingSnap = await db.collection('folders')
      .where('classId', '==', classId)
      .where('parentFolderId', '==', parentId)
      .get();
    const maxSort = existingSnap.docs.reduce((max, d) => {
      const s = d.data().sortOrder;
      return (s !== undefined && s > max) ? s : max;
    }, -1);

    await db.collection('folders').add({
      name,
      classId,
      parentFolderId: parentId,   // null = root level
      isLocked,
      unlockTimer: null,
      sortOrder: maxSort + 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast(`Folder "${name}" created! ✅`, 'success');
    closeModal('modal-add-folder');
    document.getElementById('new-folder-name').value = '';
    document.getElementById('new-folder-locked').value = 'false';

    // Reload current folder view
    loadAdminFolderContents(parentId);

  } catch (err) {
    showToast('Failed to create folder. Try again.', 'error');
    console.error('Add folder error:', err);
  }
}


// =============================================================
// OPEN RENAME FOLDER MODAL
// =============================================================
function openRenameFolderModal(folderId, currentName) {
  document.getElementById('rename-folder-id').value   = folderId;
  document.getElementById('rename-folder-name').value = currentName;
  openModal('modal-rename-folder');
}


// =============================================================
// RENAME FOLDER
// =============================================================
async function handleRenameFolder() {
  const id   = document.getElementById('rename-folder-id').value;
  const name = document.getElementById('rename-folder-name').value.trim();

  if (!name) {
    showToast('Please enter a folder name.', 'error'); return;
  }

  try {
    await db.collection('folders').doc(id).update({ name });
    showToast(`Folder renamed to "${name}" ✅`, 'success');
    closeModal('modal-rename-folder');
    loadAdminFolderContents(AdminFolderState.currentFolderId);
  } catch (err) {
    showToast('Failed to rename. Try again.', 'error');
  }
}


// =============================================================
// DELETE FOLDER (with warning — deletes all children too)
// =============================================================
async function confirmDeleteFolder(folderId, folderName) {
  if (!confirm(
    `⚠️ Delete folder "${folderName}"?\n\n` +
    `This will also delete ALL sub-folders and files inside it.\n` +
    `This CANNOT be undone!`
  )) return;

  try {
    // Recursively delete all children
    await deletefolderRecursive(folderId);

    showToast(`Folder "${folderName}" deleted.`, 'warning');
    loadAdminFolderContents(AdminFolderState.currentFolderId);

  } catch (err) {
    showToast('Failed to delete folder. Try again.', 'error');
    console.error('Delete folder error:', err);
  }
}


// =============================================================
// RECURSIVE FOLDER DELETE
// Deletes folder + all sub-folders + all files inside
// =============================================================
async function deletefolderRecursive(folderId) {
  // Delete all files in this folder
  const files = await db.collection('materials')
    .where('folderId', '==', folderId).get();
  for (const doc of files.docs) {
    await doc.ref.delete();
  }

  // Get all sub-folders
  const subFolders = await db.collection('folders')
    .where('parentFolderId', '==', folderId).get();

  // Recursively delete each sub-folder
  for (const doc of subFolders.docs) {
    await deletefolderRecursive(doc.id);
  }

  // Finally delete this folder itself
  await db.collection('folders').doc(folderId).delete();
}


// =============================================================
// TOGGLE FOLDER LOCK (lock/unlock with one click)
// =============================================================
// =============================================================
// FOLDER 3-DOT MENU TOGGLE
// =============================================================
function toggleFolderMenu(menuId, btn) {
  // Close all other open menus first
  document.querySelectorAll('.folder-dropdown-menu').forEach(m => {
    if (m.id !== menuId) m.style.display = 'none';
  });
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'block';
  // Close on outside click
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', closeFolderMenus, { once: true });
    }, 10);
  }
}

function closeFolderMenus() {
  document.querySelectorAll('.folder-dropdown-menu').forEach(m => {
    m.style.display = 'none';
  });
}

async function toggleFolderLock(folderId, currentlyLocked) {
  try {
    const newState = !currentlyLocked;
    await db.collection('folders').doc(folderId).update({
      isLocked: newState,
      // If unlocking manually, clear any existing timer
      unlockTimer: newState ? null : null
    });
    showToast(
      newState ? '🔒 Folder locked — hidden from students.' :
                 '🔓 Folder unlocked — students can now see it.',
      newState ? 'warning' : 'success'
    );
    loadAdminFolderContents(AdminFolderState.currentFolderId);
  } catch (err) {
    showToast('Failed to update. Try again.', 'error');
  }
}


// =============================================================
// TOGGLE FILE LOCK (called from file item buttons)
// =============================================================
async function toggleFileLock(fileId, currentlyLocked) {
  try {
    const newState = !currentlyLocked;
    await db.collection('materials').doc(fileId).update({
      isLocked: newState
    });
    showToast(
      newState ? '🔒 File locked — hidden from students.' :
                 '🔓 File unlocked — students can now access it.',
      newState ? 'warning' : 'success'
    );
    loadAdminFolderContents(AdminFolderState.currentFolderId);
  } catch (err) {
    showToast('Failed to update lock. Try again.', 'error');
  }
}


// =============================================================
// CLOUDINARY — Toggle between upload / link panels
// =============================================================
function switchFileSource(mode) {
  const uploadPanel = document.getElementById('file-source-upload');
  const linkPanel   = document.getElementById('file-source-link');
  const uploadBtn   = document.getElementById('src-btn-upload');
  const linkBtn     = document.getElementById('src-btn-link');
  if (mode === 'upload') {
    uploadPanel.style.display = 'block'; linkPanel.style.display = 'none';
    uploadBtn.style.cssText += 'border-color:var(--neon-blue);background:rgba(0,212,255,0.12);color:var(--neon-blue);';
    linkBtn.style.cssText   += 'border-color:var(--border);background:transparent;color:var(--text-muted);';
    const lf = document.getElementById('new-file-link'); if (lf) lf.value = '';
  } else {
    uploadPanel.style.display = 'none'; linkPanel.style.display = 'block';
    linkBtn.style.cssText   += 'border-color:var(--neon-blue);background:rgba(0,212,255,0.12);color:var(--neon-blue);';
    uploadBtn.style.cssText += 'border-color:var(--border);background:transparent;color:var(--text-muted);';
    clearSelectedFile();
  }
}

// =============================================================
// CLOUDINARY — File selected: preview only, no upload yet
// Upload happens only when "Add Material" clicked
// =============================================================
function handleFileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('upload-file-info').style.display = 'block';
  document.getElementById('upload-file-name').textContent   = file.name;
  document.getElementById('upload-file-size').textContent   = formatFileSize(file.size);
  window._pendingUploadFile = file;
}

function clearSelectedFile() {
  const inp = document.getElementById('new-file-upload-input');
  if (inp) inp.value = '';
  ['upload-file-info','upload-progress-wrap'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  window._pendingUploadFile = null;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(2) + ' MB';
}

// =============================================================
// CLOUDINARY — Upload (called at submit time)
// Returns Promise { url, publicId }
// =============================================================
function uploadToCloudinary(file, title) {
  return new Promise((resolve, reject) => {
    const progressWrap = document.getElementById('upload-progress-wrap');
    const progressBar  = document.getElementById('upload-progress-bar');
    const progressPct  = document.getElementById('upload-progress-pct');
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%'; progressPct.textContent = '0%';

    const classId  = AdminFolderState.currentClassId  || 'general';
    const folderId = AdminFolderState.currentFolderId || 'root';

    // Select correct Cloudinary endpoint based on file type
    // Audio → /video/upload (Cloudinary's requirement for mp3, wav, etc.)
    // Image → /image/upload
    // PDF / DOC / others → /raw/upload
    let uploadUrl;
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      uploadUrl = CLOUDINARY_UPLOAD_URL_VIDEO;
    } else if (file.type.startsWith('image/')) {
      uploadUrl = CLOUDINARY_UPLOAD_URL_IMAGE;
    } else {
      uploadUrl = CLOUDINARY_UPLOAD_URL_RAW; // PDF, DOC, etc.
    }

    const fd = new FormData();
    fd.append('file',          file);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder',        `bci_materials/${classId}/${folderId}`);
    fd.append('public_id',     `${Date.now()}_${title.replace(/[^a-z0-9_\-]/gi,'_')}`);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const p = Math.round(e.loaded/e.total*100);
        progressBar.style.width = p+'%'; progressPct.textContent = p+'%';
      }
    });
    xhr.addEventListener('load', () => {
      progressWrap.style.display = 'none';
      if (xhr.status === 200) {
        const r = JSON.parse(xhr.responseText);
        resolve({ url: r.secure_url, publicId: r.public_id });
      } else reject(new Error('Upload failed: '+xhr.status));
    });
    xhr.addEventListener('error', () => { progressWrap.style.display='none'; reject(new Error('Network error')); });
    xhr.open('POST', uploadUrl);
    xhr.send(fd);
  });
}


// =============================================================
// OPEN ADD FILE MODAL
// =============================================================
function openAddFileModal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const ti = document.getElementById('new-file-timer');
  if (ti) ti.min = now.toISOString().slice(0,16);
  switchFileSource('upload');
  clearSelectedFile();
  updateAdminBreadcrumb();
  openModal('modal-add-file');
}


// =============================================================
// ADD FILE — upload happens here on button click
// =============================================================
async function handleAddFile() {
  const title    = document.getElementById('new-file-title').value.trim();
  const type     = document.getElementById('new-file-type').value;
  const desc     = document.getElementById('new-file-desc').value.trim();
  const isLocked = document.getElementById('new-file-locked').value === 'true';
  const timerVal = document.getElementById('new-file-timer').value;

  if (!title) { showToast('Please enter a title.', 'error'); return; }

  const classId  = AdminFolderState.currentClassId;
  const folderId = AdminFolderState.currentFolderId || 'root';
  if (!classId) { showToast('No class selected.', 'error'); return; }

  const uploadPanel  = document.getElementById('file-source-upload');
  const isUploadMode = uploadPanel && uploadPanel.style.display !== 'none';
  let finalUrl = '', cloudinaryId = '';

  if (isUploadMode && window._pendingUploadFile) {
    const addBtn = document.getElementById('btn-add-material');
    if (addBtn) { addBtn.disabled = true; addBtn.textContent = '⏳ Uploading...'; }
    try {
      const r = await uploadToCloudinary(window._pendingUploadFile, title);
      finalUrl = r.url; cloudinaryId = r.publicId;
    } catch(e) {
      showToast('Upload failed. Check internet.', 'error');
      if (addBtn) { addBtn.disabled=false; addBtn.textContent='📄 Add Material'; }
      return;
    }
    if (addBtn) { addBtn.disabled=false; addBtn.textContent='📄 Add Material'; }
  } else if (!isUploadMode) {
    finalUrl = (document.getElementById('new-file-link').value||'').trim();
  }

  let unlockTimer = null;
  if (timerVal) unlockTimer = firebase.firestore.Timestamp.fromDate(new Date(timerVal));

  try {
    await db.collection('materials').add({
      title, type,
      link:         finalUrl     || '',
      cloudinaryId: cloudinaryId || '',
      description:  desc         || '',
      classId, folderId,
      isLocked: timerVal ? true : isLocked,
      unlockTimer,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`"${title}" added successfully! ✅`, 'success');
    closeModal('modal-add-file');
    ['new-file-title','new-file-link','new-file-desc','new-file-timer'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    document.getElementById('new-file-locked').value = 'false';
    document.getElementById('new-file-type').value   = 'Notes';
    clearSelectedFile();
    window._pendingUploadFile = null;
    loadAdminFolderContents(AdminFolderState.currentFolderId);
    loadAdminStats();
  } catch(err) {
    showToast('Failed to add file. Try again.', 'error');
    console.error(err);
  }
}


// =============================================================
// CONFIRM DELETE FILE
// =============================================================
async function confirmDeleteFile(fileId, fileName) {
  if (!confirm(`Delete "${fileName}"?\n\nThis cannot be undone.`)) return;
  try {
    await db.collection('materials').doc(fileId).delete();
    showToast(`"${fileName}" deleted.`, 'warning');
    loadAdminFolderContents(AdminFolderState.currentFolderId);
    loadAdminStats();
  } catch(err) { showToast('Failed to delete. Try again.', 'error'); }
}


// =============================================================
// RENAME / EDIT FILE — updates title + type in Firestore
// Cloudinary URL is permanent and unchanged
// =============================================================
function openRenameFileModal(fileId, currentTitle, currentType) {
  document.getElementById('rename-file-id').value    = fileId;
  document.getElementById('rename-file-input').value = currentTitle;
  // Pre-select current type in dropdown
  const typeSelect = document.getElementById('rename-file-type');
  if (typeSelect && currentType) typeSelect.value = currentType;
  openModal('modal-rename-file');
  setTimeout(() => document.getElementById('rename-file-input').focus(), 200);
}

async function confirmRenameFile() {
  const fileId   = document.getElementById('rename-file-id').value;
  const newTitle = document.getElementById('rename-file-input').value.trim();
  const newType  = document.getElementById('rename-file-type').value;
  if (!newTitle) { showToast('Please enter a title.', 'error'); return; }
  try {
    await db.collection('materials').doc(fileId).update({ title: newTitle, type: newType });
    showToast('✅ Material updated successfully!', 'success');
    closeModal('modal-rename-file');
    loadAdminFolderContents(AdminFolderState.currentFolderId);
  } catch(err) { showToast('Failed to update. Try again.', 'error'); }
}


// =============================================================
// MOVE FILE — updates folderId in Firestore
// Lock/timer are unaffected (they stay as-is)
// =============================================================
async function openMoveFileModal(fileId, fileName) {
  document.getElementById('move-file-id').value           = fileId;
  document.getElementById('move-file-name').textContent   = fileName;
  const select = document.getElementById('move-folder-select');
  select.innerHTML = '<option value="root">📁 Root (top level)</option>';
  const classId = AdminFolderState.currentClassId;
  if (classId) {
    try {
      const snap = await db.collection('folders').where('classId','==',classId).get();
      const allFolders = {};
      snap.forEach(doc => { allFolders[doc.id] = { id:doc.id, ...doc.data() }; });
      function buildFileOptions(parentId, depth) {
        Object.values(allFolders)
          .filter(f => (f.parentFolderId||null) === (parentId||null))
          .sort((a,b) => (a.name||'').localeCompare(b.name||''))
          .forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = '  '.repeat(depth) + '📁 ' + f.name;
            select.appendChild(opt);
            buildFileOptions(f.id, depth + 1);
          });
      }
      buildFileOptions(null, 0);
    } catch(e) {}
  }
  openModal('modal-move-file');
}

async function confirmMoveFile() {
  const fileId      = document.getElementById('move-file-id').value;
  const newFolderId = document.getElementById('move-folder-select').value;
  if (!fileId) return;
  try {
    await db.collection('materials').doc(fileId).update({ folderId: newFolderId });
    showToast('📂 File moved successfully!', 'success');
    closeModal('modal-move-file');
    loadAdminFolderContents(AdminFolderState.currentFolderId);
  } catch(err) { showToast('Failed to move file. Try again.', 'error'); }
}


// =============================================================
// MOVE FOLDER — changes parentFolderId in Firestore
// Only shows folders within the same class.
// Guards against moving into self or own subfolders.
// =============================================================
async function openMoveFolderModal(folderId, folderName) {
  document.getElementById('move-folder-id').value         = folderId;
  document.getElementById('move-folder-name').textContent = folderName;
  const select = document.getElementById('move-folder-dest-select');
  select.innerHTML = '<option value="root">📁 Root (top level)</option>';

  const classId = AdminFolderState.currentClassId;
  if (!classId) { openModal('modal-move-folder'); return; }

  try {
    const blockedIds = await getAllSubfolderIds(folderId);
    blockedIds.add(folderId); // can't move into itself

    const snap = await db.collection('folders').where('classId','==',classId).get();
    // Build a map for hierarchy rendering
    const allFolders = {};
    snap.forEach(doc => { allFolders[doc.id] = { id:doc.id, ...doc.data() }; });

    // Build sorted tree — root folders first, then children
    function buildOptions(parentId, depth) {
      Object.values(allFolders)
        .filter(f => (f.parentFolderId||null) === (parentId||null))
        .sort((a,b) => (a.name||'').localeCompare(b.name||''))
        .forEach(f => {
          if (blockedIds.has(f.id)) return;
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = '  '.repeat(depth) + '📁 ' + f.name;
          select.appendChild(opt);
          buildOptions(f.id, depth + 1);
        });
    }
    buildOptions(null, 0);
  } catch(e) {}
  openModal('modal-move-folder');
}

// Recursively collect all subfolder IDs of a given folder
async function getAllSubfolderIds(folderId) {
  const ids = new Set();
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift();
    const snap = await db.collection('folders').where('parentFolderId','==',current).get();
    snap.forEach(doc => { ids.add(doc.id); queue.push(doc.id); });
  }
  return ids;
}

async function confirmMoveFolder() {
  const folderId  = document.getElementById('move-folder-id').value;
  const destId    = document.getElementById('move-folder-dest-select').value;
  if (!folderId) return;
  // destId 'root' → parentFolderId = null, else use the selected folder id
  const newParent = destId === 'root' ? null : destId;
  try {
    // Also inherit classId from destination folder (or keep current if moving to root)
    let updateData = { parentFolderId: newParent };
    if (destId !== 'root') {
      const destDoc = await db.collection('folders').doc(destId).get();
      if (destDoc.exists && destDoc.data().classId) {
        updateData.classId = destDoc.data().classId;
      }
    }
    await db.collection('folders').doc(folderId).update(updateData);
    showToast('📦 Folder moved successfully!', 'success');
    closeModal('modal-move-folder');
    loadAdminFolderContents(AdminFolderState.currentFolderId);
  } catch(err) { showToast('Failed to move folder. Try again.', 'error'); }
}


// =============================================================
// THREE-DOT MENU — toggle open/close for mobile file actions
// =============================================================
function toggleFile3dot(menuId, event) {
  event.stopPropagation();
  // Close all other open menus first
  document.querySelectorAll('.file-3dot-menu.open').forEach(m => {
    if (m.id !== menuId) m.classList.remove('open');
  });
  const menu = document.getElementById(menuId);
  if (menu) menu.classList.toggle('open');
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', () => closeAllFile3dots(), { once: true });
  }, 10);
}

function closeFile3dot(menuId) {
  const menu = document.getElementById(menuId);
  if (menu) menu.classList.remove('open');
}

function closeAllFile3dots() {
  document.querySelectorAll('.file-3dot-menu.open').forEach(m => m.classList.remove('open'));
}


// =============================================================
// OPEN SET TIMER MODAL
// Works for both folders and files
// type: 'folder' | 'material'
// =============================================================
function openSetTimerModal(itemId, itemType, currentCountdown) {
  document.getElementById('timer-item-id').value   = itemId;
  document.getElementById('timer-item-type').value = itemType;

  // Set minimum datetime to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const timerInput = document.getElementById('timer-datetime');
  if (timerInput) {
    timerInput.min   = now.toISOString().slice(0, 16);
    timerInput.value = '';
  }

  // Show current timer info if exists
  const infoEl = document.getElementById('timer-current-info');
  if (infoEl) {
    infoEl.textContent = currentCountdown
      ? `⏰ Current timer: ${currentCountdown}`
      : 'No timer currently set.';
  }

  openModal('modal-set-timer');
}


// =============================================================
// SET TIMER on folder or file
// Automatically locks the item and sets unlock time
// =============================================================
async function handleSetTimer() {
  const itemId   = document.getElementById('timer-item-id').value;
  const itemType = document.getElementById('timer-item-type').value;
  const timerVal = document.getElementById('timer-datetime').value;

  if (!timerVal) {
    showToast('Please select a date and time.', 'error'); return;
  }

  const unlockTime = new Date(timerVal);
  if (unlockTime <= new Date()) {
    showToast('Please select a future date and time.', 'error'); return;
  }

  const unlockTimer = firebase.firestore.Timestamp.fromDate(unlockTime);
  const collection  = itemType === 'folder' ? 'folders' : 'materials';

  try {
    // Setting a timer automatically locks the item
    await db.collection(collection).doc(itemId).update({
      isLocked: true,
      unlockTimer
    });

    const timeStr = unlockTime.toLocaleString('en-IN', {
      day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });

    showToast(
      `⏰ Timer set! Will auto-unlock on ${timeStr}`,
      'success'
    );
    closeModal('modal-set-timer');

    // Reload to show updated timer badge
    if (AdminFolderState.currentClassId) {
      loadAdminFolderContents(AdminFolderState.currentFolderId);
    }

  } catch (err) {
    showToast('Failed to set timer. Try again.', 'error');
    console.error('Set timer error:', err);
  }
}


// =============================================================
// CLEAR TIMER from folder or file
// Removes the timer but keeps the item locked
// Admin must manually unlock after clearing timer
// =============================================================
async function clearTimer() {
  const itemId   = document.getElementById('timer-item-id').value;
  const itemType = document.getElementById('timer-item-type').value;
  const collection = itemType === 'folder' ? 'folders' : 'materials';

  if (!confirm('Remove the timer from this item?\n\nThe item will stay locked until you manually unlock it.')) return;

  try {
    await db.collection(collection).doc(itemId).update({
      unlockTimer: null
    });
    showToast('Timer removed. Item stays locked until manually unlocked.', 'info');
    closeModal('modal-set-timer');

    if (AdminFolderState.currentClassId) {
      loadAdminFolderContents(AdminFolderState.currentFolderId);
    }
  } catch (err) {
    showToast('Failed to remove timer. Try again.', 'error');
  }
}


// =============================================================
// FIREBASE INDEXES NEEDED
// Run these in Firebase Console > Firestore > Indexes
// (The app will show a link in console if index is missing)
// =============================================================
// Index 1: folders — classId ASC, parentFolderId ASC, name ASC
// Index 2: folders — classId ASC, isLocked ASC, parentFolderId ASC
// Index 3: materials — classId ASC, isLocked ASC, folderId ASC
// Index 4: materials — classId ASC, folderId ASC, createdAt DESC
// Index 5: materials — classId ASC, isLocked ASC, createdAt DESC
// Index 6: students — status ASC, createdAt DESC
// These are created automatically when you first run queries —
// Firebase will show a link in the browser console — just click it!
// =============================================================

console.log('✅ PART 5: Folder System & File Manager loaded');
console.log('🎉 ALL PARTS LOADED — BCI Website is ready!');
console.log('📋 Next step: Add your Firebase config keys (Part 1)');
console.log('🌐 Then deploy to Netlify for free hosting');

// Pre-initialize PDF.js worker at app load — saves ~50ms on first PDF open
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}



// ============================================================
// BLOCK 3
// ============================================================


const Att={board:null,classId:null,className:null,sessionId:null,sessionData:null,month:new Date(),view:'register',students:[],cache:{},offlineQ:[],popupDate:null,popupStudentId:null,sTab:'month',sMonth:new Date(),dayStatusCache:{},_myActiveDays:0,lbMode:'month',lbMonth:new Date(),studentPsd:null};

// ── DAY STATUS (Calendar) ──
async function attLoadDayStatus(sessionId, classId, y, m, resetCache=true){
  if(resetCache) Att.dayStatusCache={};
  const safeClassId=(Att.className||classId).toLowerCase().replace(/\s+/g,'-');
  const docId=sessionId+'_'+safeClassId;
  // Load all dates for this month by fetching specific date docs
  const total=attDaysInMonth(y,m);
  const proms=[];
  for(let d=1;d<=total;d++){
    const dk=attDateKey(y,m,d);
    proms.push(
      db.collection('dayStatus').doc(docId).collection('dates').doc(dk).get()
        .then(snap=>{ if(snap.exists) Att.dayStatusCache[dk]=snap.data().status||'nm'; })
        .catch(()=>{})
    );
  }
  await Promise.all(proms);
}

async function attSaveDayStatus(date, status){
  if(Att._sessionReadonly){
    const s=Att._allSessions?.find(s=>s.id===Att.sessionId);
    const type=attSessionType(s);
    showToast(type==='future'
      ? '🔮 Upcoming session — cannot set day status yet.'
      : '👁️ Past session — view only. Cannot change day status.','warning',3000);
    return;
  }
  const safeClassId=(Att.className||Att.classId).toLowerCase().replace(/\s+/g,'-');
  const docId=Att.sessionId+'_'+safeClassId;
  const y=new Date(date).getFullYear();
  const m=new Date(date).getMonth();
  const monthStr=`${y}-${String(m+1).padStart(2,'0')}`;
  try{
    await db.collection('dayStatus').doc(docId).collection('dates').doc(date)
      .set({status,month:monthStr,updatedAt:Date.now()});
    Att.dayStatusCache[date]=status;

    // If Holiday → auto-fill all students as H in attendance
    if(status==='holiday'){
      await Promise.all(Att.students.map(s=>attMark(Att.sessionId,Att.classId,date,s.id,'H')));
      showToast(`🏖️ ${date} marked as Holiday — all students set to H`,'success',2500);
    }
    // If set to NM → clear ALL student attendance for this date (Firestore + cache)
    if(status==='nm'){
      if(Att.students.length>0){
        await Promise.all(Att.students.map(s=>attMark(Att.sessionId,Att.classId,date,s.id,'N')));
        showToast(`↩️ ${date} set to Not Marked — all attendance cleared`,'info',2500);
      }
    }
    // If changed FROM holiday to open → also clear the auto-set H marks
    if(status==='open'){
      const prevWasHoliday=Object.values((Att.cache[date]||{})).every(v=>v==='H');
      if(prevWasHoliday && Att.students.length>0){
        await Promise.all(Att.students.map(s=>attMark(Att.sessionId,Att.classId,date,s.id,'N')));
        showToast(`↩️ ${date} holiday removed — students reset to Not Marked`,'info',2500);
      }
    }
  }catch(e){
    console.error('dayStatus save error:',e);
    showToast('Failed to save day status','error');
  }
}

// Open Day Status Modal
function attOpenDayStatus(date){
  const d=new Date(date);
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const current=Att.dayStatusCache[date]||'nm';
  const labels={open:'Open Day',holiday:'Holiday',nm:'Not Marked'};

  document.getElementById('att-ds-date').textContent=`${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('att-ds-dayname').textContent=dayNames[d.getDay()];
  document.getElementById('att-ds-current').textContent=`Current: ${labels[current]}`;

  Att._pendingDsDate=date;
  Att._pendingDsStatus=null;

  // Reset buttons
  attDsHighlight(null);
  const saveBtn=document.getElementById('att-ds-save');
  if(saveBtn){saveBtn.disabled=true;saveBtn.style.background='var(--bg-card2)';saveBtn.style.borderColor='var(--border)';saveBtn.style.color='var(--text-dim)';saveBtn.style.cursor='not-allowed';saveBtn.textContent='Select a status first';}

  document.getElementById('att-day-status-modal').style.display='flex';
}

function attDsHighlight(sel){
  const configs={
    open:{bg:'rgba(0,255,136,0.15)',border:'#00ff88',col:'#00ff88'},
    holiday:{bg:'rgba(122,155,186,0.15)',border:'#7a9bba',col:'#7a9bba'},
    nm:{bg:'rgba(255,170,0,0.1)',border:'#ffaa00',col:'#ffaa00'},
  };
  const faded={
    open:{bg:'rgba(0,255,136,0.06)',border:'rgba(0,255,136,0.2)',col:'rgba(0,255,136,0.5)'},
    holiday:{bg:'rgba(122,155,186,0.06)',border:'rgba(122,155,186,0.2)',col:'rgba(122,155,186,0.5)'},
    nm:{bg:'rgba(255,170,0,0.05)',border:'rgba(255,170,0,0.15)',col:'rgba(255,170,0,0.4)'},
  };
  ['open','holiday','nm'].forEach(s=>{
    const btn=document.getElementById(`att-ds-btn-${s}`); if(!btn) return;
    const c=s===sel?configs[s]:faded[s];
    btn.style.background=c.bg; btn.style.borderColor=c.border; btn.style.color=c.col;
    btn.style.transform=s===sel?'scale(1.02)':'scale(1)';
  });
}

function attDsSelect(status){
  Att._pendingDsStatus=status;
  attDsHighlight(status);
  const labels={open:'✅ Set as Open Day',holiday:'🏖️ Set as Holiday',nm:'❓ Set as Not Marked'};
  const colors={open:'#00ff88',holiday:'#7a9bba',nm:'#ffaa00'};
  const saveBtn=document.getElementById('att-ds-save');
  if(saveBtn){
    saveBtn.disabled=false;
    saveBtn.style.background=`rgba(${status==='open'?'0,255,136':status==='holiday'?'122,155,186':'255,170,0'},0.15)`;
    saveBtn.style.borderColor=colors[status];
    saveBtn.style.color=colors[status];
    saveBtn.style.cursor='pointer';
    saveBtn.textContent=labels[status];
  }
}

function attDsCancel(){
  document.getElementById('att-day-status-modal').style.display='none';
  Att._pendingDsDate=null; Att._pendingDsStatus=null;
}

async function attDsSave(){
  const date=Att._pendingDsDate, status=Att._pendingDsStatus;
  document.getElementById('att-day-status-modal').style.display='none';
  if(!date||!status) return;
  await attSaveDayStatus(date, status);
  // Re-render using full attRenderView so Att.cache is refreshed
  // (holiday auto-marks students as H — needs fresh load to show in register H column)
  await attRenderView();
}

function attDateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function attTodayKey(){const n=new Date();return attDateKey(n.getFullYear(),n.getMonth(),n.getDate());}
function attMonthName(d){return d.toLocaleString('default',{month:'long',year:'numeric'});}
function attDaysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function attFirstDay(y,m){return new Date(y,m,1).getDay();}

const ATT_Q_KEY='bci_att_queue';
function attLoadQ(){try{Att.offlineQ=JSON.parse(localStorage.getItem(ATT_Q_KEY)||'[]');}catch{Att.offlineQ=[];}}
function attSaveQ(){localStorage.setItem(ATT_Q_KEY,JSON.stringify(Att.offlineQ));}
function attUpdateSyncBadge(){
  const b=document.getElementById('att-sync-badge');if(!b)return;
  if(Att.offlineQ.length>0){b.style.background='rgba(255,170,0,0.1)';b.style.color='var(--warning)';b.style.borderColor='rgba(255,170,0,0.3)';b.textContent=`⏳ ${Att.offlineQ.length} pending`;}
  else{b.style.background='rgba(0,255,136,0.1)';b.style.color='var(--success)';b.style.borderColor='rgba(0,255,136,0.3)';b.textContent='✅ Synced';}
}

async function attSyncQ(){
  if(!navigator.onLine||!Att.offlineQ.length)return;
  const q=[...Att.offlineQ];let done=0;
  for(const item of q){
    try{
      await db.collection('attendance').doc(item.sessionId+'_'+item.classId).collection('records').doc(item.date)
        .set({[item.studentId]:item.status,markedAt:Date.now(),markedBy:'admin'},{merge:true});
      Att.offlineQ=Att.offlineQ.filter(x=>!(x.sessionId===item.sessionId&&x.classId===item.classId&&x.date===item.date&&x.studentId===item.studentId&&x.ts===item.ts));
      done++;
    }catch{}
  }
  attSaveQ();if(done>0)showToast(`✅ Synced ${done} offline record(s)`,'success');attUpdateSyncBadge();
}

async function attMark(sessionId,classId,date,studentId,status){
  // Block writes on old (inactive) sessions — view only
  if(Att._sessionReadonly){
    const s=Att._allSessions?.find(s=>s.id===Att.sessionId);
    const type=attSessionType(s);
    const msg=type==='future'
      ? '🔮 This is an upcoming session — cannot mark attendance yet.'
      : '👁️ This is a past session — view only. Switch to active session to mark attendance.';
    showToast(msg,'warning',3000);
    return;
  }
  if(!Att.cache[date])Att.cache[date]={};
  Att.cache[date][studentId]=status;
  if(!navigator.onLine){
    Att.offlineQ=Att.offlineQ.filter(x=>!(x.sessionId===sessionId&&x.classId===classId&&x.date===date&&x.studentId===studentId));
    Att.offlineQ.push({sessionId,classId,date,studentId,status,ts:Date.now()});
    attSaveQ();attUpdateSyncBadge();return;
  }
  // Use safe doc ID: sessionId + class value (e.g. "2026-27_class-10")
  const safeClassId = (Att.className||classId).toLowerCase().replace(/\s+/g,'-');
  const docId = sessionId+'_'+safeClassId;
  try{
    await db.collection('attendance').doc(docId).collection('records').doc(date)
      .set({[studentId]:status,markedAt:Date.now(),markedBy:'admin'},{merge:true});
    attSyncQ();
  }catch(e){
    console.error('attMark error:',e);
    Att.offlineQ.push({sessionId,classId:safeClassId,date,studentId,status,ts:Date.now()});
    attSaveQ();attUpdateSyncBadge();showToast('⚠️ Saved offline — will sync when possible','warning');
  }
}

async function attLoadMonth(sessionId,classId,y,m){
  Att.cache={};
  const safeClassId=(Att.className||classId).toLowerCase().replace(/\s+/g,'-');
  const docId=sessionId+'_'+safeClassId;
  const days=attDaysInMonth(y,m);const proms=[];
  for(let d=1;d<=days;d++){
    const dk=attDateKey(y,m,d);
    proms.push(db.collection('attendance').doc(docId).collection('records').doc(dk).get()
      .then(s=>{if(s.exists)Att.cache[dk]=s.data();}).catch(()=>{}));
  }
  await Promise.all(proms);
  for(const q of Att.offlineQ){
    if(q.sessionId===sessionId&&q.classId===safeClassId){if(!Att.cache[q.date])Att.cache[q.date]={};Att.cache[q.date][q.studentId]=q.status;}
  }
}

function attCalcStats(studentId,dateKeys){
  let P=0,A=0,H=0,N=0;
  for(const dk of dateKeys){const s=(Att.cache[dk]||{})[studentId]||'N';if(s==='P')P++;else if(s==='A')A++;else if(s==='H')H++;else N++;}
  const total=P+A;return{P,A,H,N,pct:total>0?Math.round(P/total*100):null};
}

function attGetDays(y,m){
  const sd=Att.sessionData?.startDate||null;const total=attDaysInMonth(y,m);const keys=[];
  for(let d=1;d<=total;d++){const dk=attDateKey(y,m,d);if(!sd||dk>=sd)keys.push(dk);}
  return keys;
}

// ── ADMIN ──
async function initAdminAttendance(){
  attLoadQ();attUpdateSyncBadge();Att.month=new Date();
  // Load ALL sessions ordered newest first
  try{
    const snap=await db.collection('sessions').orderBy('createdAt','desc').get();
    Att._allSessions=[];
    snap.forEach(doc=>{
      const d=doc.data();
      Att._allSessions.push({id:doc.id,...d});
      // Default: pick the active session
      if(d.isActive){Att.sessionId=doc.id;Att.sessionData={id:doc.id,...d};}
    });
    // Fallback: if no active session, use the first (most recent)
    if(!Att.sessionId && Att._allSessions.length){
      const s=Att._allSessions[0];
      Att.sessionId=s.id;Att.sessionData=s;
    }
  }catch{}
  attAdminGoStep(1);
}

function attAdminGoStep(step){
  [1,2,3].forEach(s=>{
    const el=document.getElementById(`att-admin-step-${s}`);if(el)el.classList.toggle('hidden',s!==step);
    const btn=document.getElementById(`att-step-${s}-btn`);
    if(btn){
      if(s===step){btn.style.background='var(--neon-blue)';btn.style.color='#000';btn.style.borderColor='var(--neon-blue)';}
      else if(s<step){btn.style.background='transparent';btn.style.color='var(--neon-blue)';btn.style.borderColor='var(--neon-blue-dim)';}
      else{btn.style.background='var(--bg-card2)';btn.style.color='var(--text-muted)';btn.style.borderColor='var(--border)';}
    }
  });
}

function attSelectBoard(board){
  Att.board=board;
  document.getElementById('att-board-label').textContent=board;
  attAdminGoStep(2);attLoadClasses(board);
}

async function attLoadClasses(board){
  const grid=document.getElementById('att-class-grid');
  grid.innerHTML='<div class="spinner"></div>';
  try{
    const snap=await db.collection('classes').get();
    const cls=[];
    snap.forEach(doc=>{const d=doc.data();if((d.board||'BSEB')===board)cls.push({id:doc.id,...d});});
    cls.sort((a,b)=>(a.order||0)-(b.order||0));
    if(!cls.length){grid.innerHTML=`<div class="info-box">No ${board} classes found.</div>`;return;}
    grid.innerHTML=cls.map(c=>`
      <div onclick="attSelectClass('${c.id}','${(c.name||c.id).replace(/'/g,"\\'")}')"
        style="background:var(--bg-card2);border:2px solid var(--border);border-radius:var(--radius);padding:20px 16px;text-align:center;cursor:pointer;transition:all 0.2s;"
        onmouseover="this.style.borderColor='var(--neon-blue)';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
        <div style="font-size:28px;margin-bottom:8px;">🏫</div>
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-md);">${c.name||c.id}</div>
      </div>`).join('');
  }catch{grid.innerHTML='<div class="info-box" style="color:var(--danger);">Failed to load classes.</div>';}
}

async function attSelectClass(classId,className){
  Att.classId=classId;Att.className=className;Att.month=new Date();
  document.getElementById('att-view-class-title').textContent=className;
  attAdminGoStep(3);

  // Populate session selector dropdown
  const sel=document.getElementById('att-session-select');
  if(sel && Att._allSessions && Att._allSessions.length){
    sel.innerHTML=Att._allSessions.map(s=>{
      const label=s.id+(s.isActive?' (Active)':'');
      return `<option value="${s.id}" ${s.id===Att.sessionId?'selected':''}>${label}</option>`;
    }).join('');
  }

  // Show/hide readonly badge
  attUpdateReadonlyBadge();

  Att.students=await attLoadStudents(classId);
  attUpdateMonthLabel();attRenderView();
  lbCheckAndPublish();
}

// Returns 'past', 'future', or 'active' for a session
function attSessionType(session){
  if(!session) return 'active';
  if(session.isActive) return 'active';
  const today = new Date();
  // Use startDate if available, otherwise parse session ID e.g. "2027-28" → starts 2027
  let startYear = null;
  if(session.startDate){
    startYear = new Date(session.startDate).getFullYear();
  } else {
    // session.id like "2026-27" → first 4 chars = 2026
    startYear = parseInt((session.id||'').substring(0,4)) || null;
  }
  if(startYear && startYear > today.getFullYear()) return 'future';
  return 'past';
}

function attUpdateReadonlyBadge(){
  const badge=document.getElementById('att-session-readonly-badge');
  if(!badge) return;
  const selectedSession=Att._allSessions?.find(s=>s.id===Att.sessionId);
  const isReadonly = selectedSession && !selectedSession.isActive;
  Att._sessionReadonly = isReadonly;
  if(!isReadonly){ badge.style.display='none'; return; }
  // Show correct label based on past vs future
  const type = attSessionType(selectedSession);
  if(type==='future'){
    badge.textContent='🔮 UPCOMING SESSION';
    badge.style.background='rgba(138,43,226,0.12)';
    badge.style.borderColor='#a855f7';
    badge.style.color='#a855f7';
  } else {
    badge.textContent='👁️ VIEW ONLY';
    badge.style.background='rgba(255,170,0,0.12)';
    badge.style.borderColor='#ffaa00';
    badge.style.color='#ffaa00';
  }
  badge.style.display='inline-block';
}

async function attChangeSession(sessionId){
  const s=Att._allSessions?.find(s=>s.id===sessionId);
  if(!s) return;
  Att.sessionId=sessionId;
  Att.sessionData=s;
  Att.month=new Date();
  attUpdateReadonlyBadge();
  // If past session → jump to last month of that session
  const type=attSessionType(s);
  if(type==='past' && s.endDate){
    const ed=new Date(s.endDate);
    Att.month=new Date(ed.getFullYear(),ed.getMonth(),1);
  }
  // If future session → jump to start month
  if(type==='future' && s.startDate){
    const sd=new Date(s.startDate);
    Att.month=new Date(sd.getFullYear(),sd.getMonth(),1);
  }
  attUpdateMonthLabel();
  const toastMsg = s.isActive
    ? `✅ Switched to active session: ${sessionId}`
    : type==='future'
      ? `🔮 Upcoming session: ${sessionId} — no data yet`
      : `👁️ Viewing past session: ${sessionId} (read-only)`;
  showToast(toastMsg, s.isActive?'success':'info', 3000);
  Att.students = await attLoadStudents(Att.classId);
  attRenderView();
}

async function attLoadStudents(classId){
  try{
    // Convert "Class 10" → "class-10" (how students store their class)
    const cn = Att.className || '';
    const studentClassVal = cn.toLowerCase().replace(/\s+/g, '-');
    const sessionId = Att.sessionId; // e.g. "2026-27" or "2027-28"

    // PRIMARY query: class + session + status (session-isolated)
    // This ensures 2026-27 students don't show in 2027-28 and vice versa
    let snap = await db.collection('students')
      .where('class','==', studentClassVal)
      .where('session','==', sessionId)
      .where('status','==','approved').get();

    // Fallback 1: try className as-is (edge case for old data)
    if(snap.empty && cn !== studentClassVal){
      snap = await db.collection('students')
        .where('class','==', cn)
        .where('session','==', sessionId)
        .where('status','==','approved').get();
    }

    // Fallback 2: status=active (some older students may have this)
    if(snap.empty){
      snap = await db.collection('students')
        .where('class','==', studentClassVal)
        .where('session','==', sessionId)
        .where('status','==','active').get();
    }

    const arr=[];
    snap.forEach(doc=>arr.push({id:doc.id,...doc.data()}));
    arr.sort((a,b)=>parseInt(a.roll||a.rollNo||0)-parseInt(b.roll||b.rollNo||0));
    return arr;
  }catch(e){
    console.error('attLoadStudents:',e);
    // If error contains "index" it means composite index is missing
    if(e.message && e.message.toLowerCase().includes('index')){
      showToast('⚠️ Firestore index needed for session filter. Check console for link.','warning',6000);
      console.warn('🔥 Create this Firestore index:\nCollection: students\nFields: class (ASC), session (ASC), status (ASC)\nOr click the link in the error above.');
    }
    return[];
  }
}

function attUpdateMonthLabel(){const el=document.getElementById('att-month-label');if(el)el.textContent=attMonthName(Att.month);}

function attChangeMonth(dir){
  const d=new Date(Att.month);d.setMonth(d.getMonth()+dir);
  const now=new Date();
  // For old (readonly) sessions: allow browsing within session start→end range
  if(Att._sessionReadonly){
    if(Att.sessionData?.startDate){const sd=new Date(Att.sessionData.startDate);if(d<new Date(sd.getFullYear(),sd.getMonth(),1)){showToast('Cannot go before session start','warning');return;}}
    if(Att.sessionData?.endDate){const ed=new Date(Att.sessionData.endDate);if(d>new Date(ed.getFullYear(),ed.getMonth(),1)){showToast('Cannot go past session end','warning');return;}}
  } else {
    // Active session: block future months
    if(d.getFullYear()>now.getFullYear()||(d.getFullYear()===now.getFullYear()&&d.getMonth()>now.getMonth())){showToast('Cannot view future months','warning');return;}
    if(Att.sessionData?.startDate){const sd=new Date(Att.sessionData.startDate);if(d<new Date(sd.getFullYear(),sd.getMonth(),1)){showToast('Cannot go before session start','warning');return;}}
  }
  Att.month=d;attUpdateMonthLabel();attRenderView();
}

function attSwitchView(view){
  Att.view=view;
  ['register','summary','calendar'].forEach(v=>{
    const t=document.getElementById(`att-tab-${v}`);
    const p=document.getElementById(`att-${v}-view`);
    if(t){if(v===view){t.style.background='rgba(0,212,255,0.1)';t.style.borderColor='var(--neon-blue)';t.style.color='var(--neon-blue)';}
      else{t.style.background='var(--bg-card2)';t.style.borderColor='var(--border)';t.style.color='var(--text-muted)';}}
    if(p)p.classList.toggle('hidden',v!==view);
  });
  attRenderView();
}

function attApplyFilters(){attRenderView();}

function attGetFilteredStudents(y,m){
  const gf=document.getElementById('att-filter-gender')?.value||'';
  const sp=document.getElementById('att-sort-pct')?.value||'';
  let arr=[...Att.students];
  if(gf)arr=arr.filter(s=>(s.gender||'')===gf);
  if(sp){
    const allDays=attGetDays(y,m).filter(dk=>dk<=attTodayKey()&&(Att.dayStatusCache[dk]||'nm')!=='nm');
    arr.sort((a,b)=>{
      let sJoinA=null,sJoinB=null;
      if(a.createdAt?.seconds){const jd=new Date(a.createdAt.seconds*1000);sJoinA=attDateKey(jd.getFullYear(),jd.getMonth(),jd.getDate());}
      if(b.createdAt?.seconds){const jd=new Date(b.createdAt.seconds*1000);sJoinB=attDateKey(jd.getFullYear(),jd.getMonth(),jd.getDate());}
      const daysA=sJoinA?allDays.filter(dk=>dk>=sJoinA):allDays;
      const daysB=sJoinB?allDays.filter(dk=>dk>=sJoinB):allDays;
      const pa=attCalcStats(a.id,daysA).pct||(sp==='asc'?999:-1); // ?? replaced with || for Android 7 compat
      const pb=attCalcStats(b.id,daysB).pct||(sp==='asc'?999:-1); // ?? replaced with || for Android 7 compat
      return sp==='asc'?pa-pb:pb-pa;
    });
  }
  const fc=document.getElementById('att-filter-count');if(fc)fc.textContent=arr.length;
  return arr;
}

async function attRenderView(){
  if(!Att.sessionId||!Att.classId){showToast('No active session found','warning');return;}
  const y=Att.month.getFullYear(),m=Att.month.getMonth();
  ['att-reg-loading','att-sum-loading','att-cal-loading'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('hidden');});
  ['att-reg-content','att-reg-empty','att-sum-content','att-sum-empty','att-cal-content'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('hidden');});
  // Load attendance AND day status in parallel
  await Promise.all([
    attLoadMonth(Att.sessionId,Att.classId,y,m),
    attLoadDayStatus(Att.sessionId,Att.classId,y,m)
  ]);
  ['att-reg-loading','att-sum-loading','att-cal-loading'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('hidden');});
  if(Att.view==='register')attRenderRegister(y,m);
  else if(Att.view==='summary')attRenderSummary(y,m);
  else attRenderCalendar(y,m);
}

function attRenderRegister(y,m){
  const students=attGetFilteredStudents(y,m);
  const content=document.getElementById('att-reg-content');
  const empty=document.getElementById('att-reg-empty');
  if(!students.length){empty?.classList.remove('hidden');return;}

  const total=attDaysInMonth(y,m),sd=Att.sessionData?.startDate||null,today=attTodayKey();
  const DN=['Su','Mo','Tu','We','Th','Fr','Sa'];

  // Build valid days (within session, not future)
  const validDays=[];
  for(let d=1;d<=total;d++){
    const dk=attDateKey(y,m,d);
    if(sd&&dk<sd) continue;
    if(dk>today) continue;
    validDays.push({d,dk});
  }

  // Window: 5 days visible, default ending at today
  const WIN=5;
  const todayIdx=validDays.findIndex(x=>x.dk===today);
  const monthKey=y+'-'+m;
  if(Att.regWindowEnd===undefined||Att.regWindowMonth!==monthKey){
    Att.regWindowEnd=todayIdx>=0?todayIdx:validDays.length-1;
    Att.regWindowMonth=monthKey;
  }
  const endIdx=Math.min(Att.regWindowEnd,validDays.length-1);
  const startIdx=Math.max(0,endIdx-WIN+1);
  const vis=validDays.slice(startIdx,endIdx+1);
  const canLeft=startIdx>0,canRight=endIdx<validDays.length-1;

  const btnStyle=(active,right)=>`padding:6px 14px;border-radius:var(--radius-sm);background:var(--bg-card2);border:1px solid ${active?(right?'var(--neon-blue)':'var(--border)'):'rgba(30,58,95,0.3)'};color:${active?(right?'var(--neon-blue)':'var(--text-white)'):'var(--text-dim)'};cursor:${active?'pointer':'not-allowed'};font-size:var(--fs-sm);font-family:'Rajdhani',sans-serif;font-weight:600;`;

  let html=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
    <button onclick="attRegScroll(-5)" ${!canLeft?'disabled':''} style="${btnStyle(canLeft,false)}">⟪ -5</button>
    <button onclick="attRegScroll(-1)" ${!canLeft?'disabled':''} style="${btnStyle(canLeft,false)}">‹ Prev</button>
    <span style="font-size:var(--fs-xs);color:var(--text-muted);flex:1;text-align:center;">Day ${startIdx+1}–${endIdx+1} of ${validDays.length}</span>
    <button onclick="attRegScroll(1)" ${!canRight?'disabled':''} style="${btnStyle(canRight,true)}">Next ›</button>
    <button onclick="attRegScroll(5)" ${!canRight?'disabled':''} style="${btnStyle(canRight,true)}">+5 ⟫</button>
    <button onclick="attRegGoToday()" style="padding:6px 14px;border-radius:var(--radius-sm);background:rgba(0,212,255,0.1);border:1px solid var(--neon-blue);color:var(--neon-blue);cursor:pointer;font-size:var(--fs-sm);font-family:'Rajdhani',sans-serif;font-weight:600;">📅 Today</button>
  </div>
  <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius);border:1px solid var(--border);">
  <table style="border-collapse:collapse;width:100%;font-size:11px;">
  <thead><tr>
    <th style="background:var(--bg-card2);color:var(--text-muted);padding:8px 6px;border-bottom:2px solid var(--border);position:sticky;left:0;z-index:3;min-width:36px;">#</th>
    <th style="background:var(--bg-card2);color:var(--text-muted);padding:8px 6px;text-align:left;border-bottom:2px solid var(--border);position:sticky;left:36px;z-index:3;min-width:100px;">Name</th>`;

  vis.forEach(({d,dk})=>{
    const dw=new Date(y,m,d).getDay(),isToday=dk===today;
    const ds=Att.dayStatusCache?.[dk]||'nm';
    const isHoliday=ds==='holiday';
    const isOpen=ds==='open';
    const isNm=ds==='nm';
    // Header color by day status
    let headerBg,headerColor,statusTag;
    if(isHoliday){headerBg='rgba(122,155,186,0.08)';headerColor='#7a9bba';statusTag='H';}
    else if(isOpen){headerBg=isToday?'rgba(0,212,255,0.08)':'var(--bg-card2)';headerColor=isToday?'var(--neon-blue)':'var(--text-white)';statusTag='Open';}
    else{headerBg='rgba(255,170,0,0.05)';headerColor='#ffaa00';statusTag='NM';}

    const clickable=isOpen&&!isHoliday;
    html+=`<th onclick="${clickable?`attOpenDateMark('${dk}')`:'void(0)'}"
      style="background:${headerBg};color:${headerColor};padding:6px 4px;
      border-bottom:2px solid ${isToday?'var(--neon-blue)':isHoliday?'#7a9bba30':isOpen?'var(--border)':'rgba(255,170,0,0.2)'};
      min-width:56px;text-align:center;font-family:'Rajdhani',sans-serif;
      cursor:${clickable?'pointer':'default'};
      ${clickable?'transition:background 0.15s;':''}"
      ${clickable?`onmouseover="this.style.background='rgba(0,212,255,0.08)'" onmouseout="this.style.background='${headerBg}'"`:''}>
      <div style="font-size:15px;font-weight:700;line-height:1;">${d}</div>
      <div style="font-size:9px;font-weight:600;margin-top:2px;">${DN[dw]}</div>
      <div style="font-size:8px;margin-top:2px;opacity:0.8;">${isToday?'TODAY':statusTag}</div>
      ${clickable?`<div style="font-size:8px;margin-top:1px;color:var(--neon-blue);opacity:0.7;">tap all</div>`:''}
    </th>`;
  });

  html+=`<th style="background:var(--bg-card2);color:#00ff88;padding:5px 8px;border-bottom:2px solid var(--border);font-size:10px;">P</th>
    <th style="background:var(--bg-card2);color:#ff4466;padding:5px 8px;border-bottom:2px solid var(--border);font-size:10px;">A</th>
    <th style="background:var(--bg-card2);color:#7a9bba;padding:5px 8px;border-bottom:2px solid var(--border);font-size:10px;">H</th>
    <th style="background:var(--bg-card2);color:var(--neon-blue);padding:5px 8px;border-bottom:2px solid var(--border);font-size:10px;">%</th>
  </tr></thead><tbody>`;

  for(const s of students){
    // Compute this student's joining date (psd) — days before this are faded/excluded
    let sJoinDk=null;
    if(s.createdAt?.seconds){
      const jd=new Date(s.createdAt.seconds*1000);
      sJoinDk=attDateKey(jd.getFullYear(),jd.getMonth(),jd.getDate());
    } else if(s.createdAt && typeof s.createdAt==='string'){
      sJoinDk=s.createdAt.substring(0,10);
    }
    // Summary: use Open Days only, and only from student's joining date onward
    let P=0,A=0,H=0;
    validDays.forEach(({dk})=>{
      if(sJoinDk && dk<sJoinDk) return; // before joining — skip
      const st=(Att.cache[dk]||{})[s.id]||'N';
      if(st==='P')P++;else if(st==='A')A++;else if(st==='H')H++;
    });
    // Working days = P + A (open days only)
    const tot=P+A,pct=tot>0?Math.round(P/tot*100):null;

    html+=`<tr>
      <td style="position:sticky;left:0;z-index:1;background:var(--bg-card);padding:6px 8px;color:var(--text-muted);font-weight:600;font-size:10px;border-bottom:1px solid var(--border);">${s.roll||s.rollNo||'—'}</td>
      <td style="position:sticky;left:36px;z-index:1;background:var(--bg-card);padding:6px 8px;color:var(--text-white);font-size:11px;border-bottom:1px solid var(--border);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.name}">${s.name}</td>`;

    vis.forEach(({d,dk})=>{
      const ds=Att.dayStatusCache?.[dk]||'nm';
      const isHoliday=ds==='holiday';
      const isOpen=ds==='open';
      const isToday=dk===today;
      const cellBg=isToday?'rgba(0,212,255,0.03)':'';

      // Before student's joining date — faded, not clickable
      if(sJoinDk && dk<sJoinDk){
        html+=`<td style="border-bottom:1px solid rgba(30,58,95,0.3);">
          <div style="width:56px;height:34px;margin:auto;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:9px;opacity:0.25;" title="Before joining date">—</div></td>`;
        return;
      }

      if(isHoliday){
        // Locked — auto H
        html+=`<td style="border-bottom:1px solid rgba(30,58,95,0.3);background:rgba(122,155,186,0.08);">
          <div style="width:56px;height:34px;margin:auto;display:flex;align-items:center;justify-content:center;color:#7a9bba;font-size:10px;font-weight:700;opacity:0.7;" title="Holiday — locked">🏖 H</div></td>`;
        return;
      }
      if(!isOpen){
        // Locked — NM, not clickable
        html+=`<td style="border-bottom:1px solid rgba(30,58,95,0.3);">
          <div style="width:56px;height:34px;margin:auto;display:flex;align-items:center;justify-content:center;color:#ffaa00;font-size:9px;font-weight:600;opacity:0.4;" title="Set as Open Day in Calendar first">🔒</div></td>`;
        return;
      }

      // Open day — clickable
      const st=(Att.cache[dk]||{})[s.id]||'N';
      const bg=st==='P'?'rgba(0,255,136,0.15)':st==='A'?'rgba(255,68,102,0.15)':'rgba(255,170,0,0.1)';
      const col=st==='P'?'#00ff88':st==='A'?'#ff4466':'#ffaa00';
      const lbl=st==='P'?'✅ P':st==='A'?'❌ A':'? NM';
      html+=`<td style="border-bottom:1px solid rgba(30,58,95,0.3);${cellBg}padding:2px;">
        <div onclick="attCycleStatus(event,'${dk}','${s.id}')"
          style="width:52px;height:32px;margin:auto;display:flex;align-items:center;justify-content:center;background:${bg};color:${col};font-size:10px;font-weight:700;cursor:pointer;border-radius:4px;user-select:none;">${lbl}</div></td>`;
    });

    html+=`<td style="padding:4px 8px;font-weight:700;color:#00ff88;font-size:11px;border-bottom:1px solid var(--border);">${P}</td>
      <td style="padding:4px 8px;font-weight:700;color:#ff4466;font-size:11px;border-bottom:1px solid var(--border);">${A}</td>
      <td style="padding:4px 8px;font-weight:700;color:#7a9bba;font-size:11px;border-bottom:1px solid var(--border);">${H}</td>
      <td style="padding:4px 8px;font-weight:700;color:var(--neon-blue);font-size:11px;border-bottom:1px solid var(--border);">${pct!==null?pct+'%':'N/A'}</td>
    </tr>`;
  }

  html+='</tbody></table></div>';
  content.innerHTML=html;
  content?.classList.remove('hidden');
}

function attRegScroll(delta){
  const y=Att.month.getFullYear(),m=Att.month.getMonth();
  const total=attDaysInMonth(y,m),sd=Att.sessionData?.startDate||null,today=attTodayKey();
  let count=0;
  for(let d=1;d<=total;d++){const dk=attDateKey(y,m,d);if((!sd||dk>=sd)&&dk<=today)count++;}
  const WIN=5;
  const cur=Att.regWindowEnd!==undefined?Att.regWindowEnd:count-1;
  Att.regWindowEnd=Math.max(WIN-1,Math.min(count-1,cur+delta));
  attRenderRegister(y,m);
}

function attRegGoToday(){
  const y=Att.month.getFullYear(),m=Att.month.getMonth();
  const total=attDaysInMonth(y,m),sd=Att.sessionData?.startDate||null,today=attTodayKey();
  const validDays=[];
  for(let d=1;d<=total;d++){const dk=attDateKey(y,m,d);if((!sd||dk>=sd)&&dk<=today)validDays.push(dk);}
  const idx=validDays.indexOf(today);
  Att.regWindowEnd=idx>=0?idx:validDays.length-1;
  Att.regWindowMonth=y+'-'+m;
  attRenderView();
}


function attRenderSummary(y,m){
  const students=attGetFilteredStudents(y,m);
  const container=document.getElementById('att-sum-content');
  const empty=document.getElementById('att-sum-empty');
  if(!students.length){empty?.classList.remove('hidden');return;}
  // Exclude only 'nm' days — include both 'open' and 'holiday' days
  const allDays=attGetDays(y,m).filter(dk=>dk<=attTodayKey()&&(Att.dayStatusCache[dk]||'nm')!=='nm');
  let html='';
  students.forEach((s,i)=>{
    // Per-student joining date — same logic as register
    let sJoinDk=null;
    if(s.createdAt?.seconds){const jd=new Date(s.createdAt.seconds*1000);sJoinDk=attDateKey(jd.getFullYear(),jd.getMonth(),jd.getDate());}
    else if(s.createdAt&&typeof s.createdAt==='string') sJoinDk=s.createdAt.substring(0,10);
    const days=sJoinDk?allDays.filter(dk=>dk>=sJoinDk):allDays;
    const st=attCalcStats(s.id,days);
    const pct=st.pct!==null?st.pct:0;
    const bar=pct>=75?'#00ff88':pct>=50?'#ffaa00':'#ff4466';
    html+=`<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
      <div style="width:34px;height:34px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);color:var(--text-muted);flex-shrink:0;">${i+1}</div>
      <div style="flex:1;min-width:100px;">
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;">${s.name}</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);">Roll: ${s.roll||s.rollNo||'—'}</div>
        <div style="width:100%;background:var(--bg-card);border-radius:4px;height:5px;margin-top:6px;overflow:hidden;"><div style="height:100%;background:${bar};width:${pct}%;border-radius:4px;"></div></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:#00ff88;">${st.P}</div><div style="font-size:10px;color:var(--text-muted);">P</div></div>
        <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:#ff4466;">${st.A}</div><div style="font-size:10px;color:var(--text-muted);">A</div></div>
        <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:#7a9bba;">${st.H}</div><div style="font-size:10px;color:var(--text-muted);">H</div></div>
        <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--neon-blue);">${st.pct!==null?st.pct+'%':'N/A'}</div><div style="font-size:10px;color:var(--text-muted);">%</div></div>
      </div>
    </div>`;
  });
  container.innerHTML=html;container?.classList.remove('hidden');
}

function attRenderCalendar(y,m){
  const wrap=document.getElementById('att-cal-grid-wrap');
  const content=document.getElementById('att-cal-content');
  if(!wrap||!content) return;

  const total=attDaysInMonth(y,m),fd=attFirstDay(y,m);
  const today=attTodayKey(),sd=Att.sessionData?.startDate||null;
  const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];

  let openCount=0,holidayCount=0,nmCount=0;

  let html='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">';
  DN.forEach(d=>html+=`<div style="text-align:center;font-size:11px;color:var(--text-dim);font-weight:600;padding:6px 0;font-family:'Rajdhani',sans-serif;">${d}</div>`);
  for(let i=0;i<fd;i++) html+=`<div></div>`;

  for(let d=1;d<=total;d++){
    const dk=attDateKey(y,m,d);
    const isToday=dk===today;
    const bef=sd&&dk<sd;
    const fut=dk>today;

    // Greyed out: before session or future
    if(bef||fut){
      html+=`<div style="width:36px;height:36px;aspect-ratio:1;border-radius:var(--radius-sm);background:var(--bg-card2);opacity:0.25;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;color:var(--text-dim);min-height:44px;">
        <span style="font-weight:600;">${d}</span>
      </div>`;
      continue;
    }

    // Get day status from dayStatus cache
    const ds=Att.dayStatusCache?.[dk]||'nm';
    let bg,col,icon,label;
    if(ds==='open'){
      bg='rgba(0,255,136,0.12)';col='#00ff88';icon='📗';label='Open';openCount++;
    } else if(ds==='holiday'){
      bg='rgba(122,155,186,0.12)';col='#7a9bba';icon='🏖️';label='Holiday';holidayCount++;
    } else {
      bg='rgba(255,170,0,0.08)';col='#ffaa00';icon='❓';label='NM';nmCount++;
    }

    html+=`<div onclick="attOpenDayStatus('${dk}')"
      style="width:36px;height:36px;aspect-ratio:1;border-radius:var(--radius-sm);background:${bg};color:${col};
      border:2px solid ${isToday?'var(--neon-blue)':'transparent'};
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      cursor:pointer;min-height:44px;transition:transform 0.1s;user-select:none;"
      onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
      <span style="font-size:13px;font-weight:700;line-height:1;">${d}</span>
      <span style="font-size:9px;margin-top:3px;opacity:0.85;">${label}</span>
    </div>`;
  }
  html+='</div>';
  wrap.innerHTML=html;
  content.classList.remove('hidden');

  // Update summary counts
  const od=document.getElementById('att-cal-open-count');
  const hd=document.getElementById('att-cal-holiday-count');
  const nd=document.getElementById('att-cal-nm-count');
  const wd=document.getElementById('att-cal-working');
  if(od) od.textContent=openCount;
  if(hd) hd.textContent=holidayCount;
  if(nd) nd.textContent=nmCount;
  if(wd) wd.textContent=openCount;
}

// Cycle order: N → P → A → N  (H is set from calendar only, not per-student)
const ATT_CYCLE = {N:'P', P:'A', A:'N'};

async function attCycleStatus(event, date, studentId){
  event.stopPropagation();
  const cell = event.currentTarget; // save BEFORE await
  const current = (Att.cache[date]||{})[studentId]||'N';
  const next = ATT_CYCLE[current]||'P';
  // Update UI immediately (before await)
  const bg = next==='P'?'rgba(0,255,136,0.15)':next==='A'?'rgba(255,68,102,0.15)':'rgba(255,170,0,0.1)';
  const col = next==='P'?'#00ff88':next==='A'?'#ff4466':'#ffaa00';
  const lbl = next==='P'?'✅ P':next==='A'?'❌ A':'? NM';
  if(cell){ cell.style.background=bg; cell.style.color=col; cell.textContent=lbl; }
  // Then save to Firebase
  await attMark(Att.sessionId, Att.classId, date, studentId, next);
  // Update row summary
  if(cell) attUpdateRowSummary(cell, studentId);
}

function attUpdateRowSummary(cell, studentId){
  const row = cell.closest('tr'); if(!row) return;
  const y=Att.month.getFullYear(),m=Att.month.getMonth();
  const sd=Att.sessionData?.startDate||null,today=attTodayKey();
  const total=attDaysInMonth(y,m);
  // Get this student's joining date
  const student=Att.students.find(s=>s.id===studentId);
  let sJoinDk=null;
  if(student?.createdAt?.seconds){const jd=new Date(student.createdAt.seconds*1000);sJoinDk=attDateKey(jd.getFullYear(),jd.getMonth(),jd.getDate());}
  else if(student?.createdAt && typeof student.createdAt==='string') sJoinDk=student.createdAt.substring(0,10);
  let P=0,A=0,H=0;
  for(let d=1;d<=total;d++){
    const dk=attDateKey(y,m,d);
    if(sd&&dk<sd) continue;
    if(dk>today) continue;
    if(sJoinDk&&dk<sJoinDk) continue; // before student joining date
    if((Att.dayStatusCache[dk]||'nm')==='nm') continue;
    const st=(Att.cache[dk]||{})[studentId]||'N';
    if(st==='P')P++;else if(st==='A')A++;else if(st==='H')H++;
  }
  const tot=P+A,pct=tot>0?Math.round(P/tot*100):null;
  const cells=row.querySelectorAll('td');
  const len=cells.length;
  if(len>=4){
    cells[len-4].textContent=P; cells[len-4].style.color='#00ff88';
    cells[len-3].textContent=A; cells[len-3].style.color='#ff4466';
    cells[len-2].textContent=H; cells[len-2].style.color='#7a9bba';
    cells[len-1].textContent=pct!==null?pct+'%':'N/A'; cells[len-1].style.color='var(--neon-blue)';
  }
}

// Calendar day cycle (all students)
async function attCycleDay(event, date){
  event.stopPropagation();
  if(!Att.students.length) return;
  const dayData=Att.cache[date]||{};
  const statuses=Att.students.map(s=>dayData[s.id]||'N');
  const allSame=statuses.every(s=>s===statuses[0]);
  const current=allSame?statuses[0]:'N';
  const d=new Date(date);
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const labels={P:'Present',A:'Absent',H:'Holiday',N:'Not Marked'};
  // Set modal content
  document.getElementById('att-cal-modal-date').textContent=`${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('att-cal-modal-dayname').textContent=dayNames[d.getDay()];
  document.getElementById('att-cal-modal-current').textContent=`Current: ${labels[current]}`;
  document.getElementById('att-cal-modal-count').textContent=Att.students.length;
  // Reset all buttons to faded state
  Att._pendingCalDate=date;
  Att._pendingCalNext=null;
  attCalSelectStatus(null);
  document.getElementById('att-cal-modal').style.display='flex';
}

function attCalSelectStatus(status){
  const configs={
    P:{bg:'rgba(0,255,136,0.18)',border:'#00ff88',color:'#00ff88'},
    A:{bg:'rgba(255,68,102,0.18)',border:'#ff4466',color:'#ff4466'},
    H:{bg:'rgba(122,155,186,0.18)',border:'#7a9bba',color:'#7a9bba'},
    N:{bg:'rgba(255,170,0,0.18)',border:'#ffaa00',color:'#ffaa00'},
  };
  const faded={
    P:{bg:'rgba(0,255,136,0.06)',border:'rgba(0,255,136,0.2)',color:'rgba(0,255,136,0.4)'},
    A:{bg:'rgba(255,68,102,0.06)',border:'rgba(255,68,102,0.2)',color:'rgba(255,68,102,0.4)'},
    H:{bg:'rgba(122,155,186,0.06)',border:'rgba(122,155,186,0.2)',color:'rgba(122,155,186,0.4)'},
    N:{bg:'rgba(255,170,0,0.06)',border:'rgba(255,170,0,0.2)',color:'rgba(255,170,0,0.4)'},
  };
  ['P','A','H','N'].forEach(s=>{
    const btn=document.getElementById(`att-cal-btn-${s}`);
    if(!btn) return;
    const style=s===status?configs[s]:faded[s];
    btn.style.background=style.bg;
    btn.style.borderColor=style.border;
    btn.style.color=style.color;
    btn.style.transform=s===status?'scale(1.03)':'scale(1)';
    btn.style.boxShadow=s===status?`0 0 12px ${configs[s].border}44`:'none';
  });
  Att._pendingCalNext=status;
  // Update save button
  const saveBtn=document.getElementById('att-cal-modal-save');
  if(saveBtn){
    if(status){
      const labels={P:'Present',A:'Absent',H:'Holiday',N:'Not Marked'};
      const colors={P:'#00ff88',A:'#ff4466',H:'#7a9bba',N:'#ffaa00'};
      saveBtn.disabled=false;
      saveBtn.style.background=configs[status].bg;
      saveBtn.style.borderColor=configs[status].border;
      saveBtn.style.color=configs[status].color;
      saveBtn.style.cursor='pointer';
      saveBtn.textContent=`✅ Save as ${labels[status]}`;
    } else {
      saveBtn.disabled=true;
      saveBtn.style.background='var(--bg-card2)';
      saveBtn.style.borderColor='var(--border)';
      saveBtn.style.color='var(--text-dim)';
      saveBtn.style.cursor='not-allowed';
      saveBtn.textContent='Select a status first';
    }
  }
}

function attCalModalCancel(){
  document.getElementById('att-cal-modal').style.display='none';
  Att._pendingCalDate=null; Att._pendingCalNext=null;
}

async function attCalModalConfirm(){
  const date=Att._pendingCalDate, next=Att._pendingCalNext;
  document.getElementById('att-cal-modal').style.display='none';
  if(!date||!next) return;
  await Promise.all(Att.students.map(s=>attMark(Att.sessionId,Att.classId,date,s.id,next)));
  const labels={P:'Present',A:'Absent',H:'Holiday',N:'Not Marked'};
  showToast(`✅ All ${Att.students.length} students → ${labels[next]} for ${date}`,'success',2500);
  attRenderCalendar(Att.month.getFullYear(),Att.month.getMonth());
}

// ── DATE MARK ALL (click on date header in Register) ──
function attOpenDateMark(date){
  if(!Att.students.length){showToast('No students loaded','warning');return;}
  const d=new Date(date);
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];

  document.getElementById('att-dm-date').textContent=`${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('att-dm-dayname').textContent=dayNames[d.getDay()];
  document.getElementById('att-dm-count').textContent=`${Att.students.length} students will be marked`;

  // Reset buttons to faded
  attDmHighlight(null);
  const saveBtn=document.getElementById('att-dm-save');
  if(saveBtn){saveBtn.disabled=true;saveBtn.style.background='var(--bg-card2)';saveBtn.style.borderColor='var(--border)';saveBtn.style.color='var(--text-dim)';saveBtn.style.cursor='not-allowed';saveBtn.textContent='Select Present or Absent';}

  Att._pendingDmDate=date;
  Att._pendingDmStatus=null;
  document.getElementById('att-date-mark-modal').style.display='flex';
}

function attDmHighlight(sel){
  const btnP=document.getElementById('att-dm-btn-P');
  const btnA=document.getElementById('att-dm-btn-A');
  if(btnP){
    btnP.style.background=sel==='P'?'rgba(0,255,136,0.18)':'rgba(0,255,136,0.06)';
    btnP.style.borderColor=sel==='P'?'#00ff88':'rgba(0,255,136,0.2)';
    btnP.style.color=sel==='P'?'#00ff88':'rgba(0,255,136,0.5)';
    btnP.style.transform=sel==='P'?'scale(1.03)':'scale(1)';
    btnP.style.boxShadow=sel==='P'?'0 0 12px rgba(0,255,136,0.3)':'none';
  }
  if(btnA){
    btnA.style.background=sel==='A'?'rgba(255,68,102,0.18)':'rgba(255,68,102,0.06)';
    btnA.style.borderColor=sel==='A'?'#ff4466':'rgba(255,68,102,0.2)';
    btnA.style.color=sel==='A'?'#ff4466':'rgba(255,68,102,0.5)';
    btnA.style.transform=sel==='A'?'scale(1.03)':'scale(1)';
    btnA.style.boxShadow=sel==='A'?'0 0 12px rgba(255,68,102,0.3)':'none';
  }
}

function attDmSelect(status){
  Att._pendingDmStatus=status;
  attDmHighlight(status);
  const saveBtn=document.getElementById('att-dm-save');
  if(saveBtn){
    saveBtn.disabled=false;
    saveBtn.style.background=status==='P'?'rgba(0,255,136,0.15)':'rgba(255,68,102,0.15)';
    saveBtn.style.borderColor=status==='P'?'#00ff88':'#ff4466';
    saveBtn.style.color=status==='P'?'#00ff88':'#ff4466';
    saveBtn.style.cursor='pointer';
    saveBtn.textContent=status==='P'?'✅ Mark All Present':'❌ Mark All Absent';
  }
}

function attDmCancel(){
  document.getElementById('att-date-mark-modal').style.display='none';
  Att._pendingDmDate=null;Att._pendingDmStatus=null;
}

async function attDmSave(){
  const date=Att._pendingDmDate,status=Att._pendingDmStatus;
  document.getElementById('att-date-mark-modal').style.display='none';
  if(!date||!status) return;
  await Promise.all(Att.students.map(s=>attMark(Att.sessionId,Att.classId,date,s.id,status)));
  const label=status==='P'?'Present':'Absent';
  showToast(`✅ All ${Att.students.length} students marked ${label} for ${date}`,'success',2500);
  attRenderView();
}

async function attExportPDF(){
  if(!Att.sessionId||!Att.classId){showToast('Select a class first','warning');return;}
  document.getElementById('att-pdf-modal').style.display='flex';
}

function attPdfModalClose(){
  document.getElementById('att-pdf-modal').style.display='none';
}

async function attPdfExportRun(currentMonthOnly){
  attPdfModalClose();
  if(!window.jspdf){
    showToast('Loading PDF library...','info',2000);
    await new Promise((resolve,reject)=>{
      const s1=document.createElement('script');
      s1.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s1.onload=()=>{
        const s2=document.createElement('script');
        s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
        s2.onload=resolve;s2.onerror=reject;
        document.head.appendChild(s2);
      };
      s1.onerror=reject;document.head.appendChild(s1);
    });
  }
  const choice=currentMonthOnly;
  showToast('Generating PDF...','info',3000);
  const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const now=new Date(),sd=Att.sessionData?.startDate;
  let months=[];
  if(choice){months=[{y:Att.month.getFullYear(),m:Att.month.getMonth()}];}
  else if(sd){let cur=new Date(new Date(sd).getFullYear(),new Date(sd).getMonth(),1);while(cur<=now){months.push({y:cur.getFullYear(),m:cur.getMonth()});cur.setMonth(cur.getMonth()+1);}}
  else months=[{y:now.getFullYear(),m:now.getMonth()}];
  for(let mi=0;mi<months.length;mi++){
    const{y,m}=months[mi];await attLoadMonth(Att.sessionId,Att.classId,y,m);
    if(mi>0)doc.addPage('a4','landscape');
    const total=attDaysInMonth(y,m),today=attTodayKey();
    doc.setFontSize(13);doc.text('Brilliant Coaching Institute — Attendance Register',14,12);
    doc.setFontSize(9);doc.text(`Class: ${Att.className} | Session: ${Att.sessionId} | Month: ${attMonthName(new Date(y,m))}`,14,18);
    const head=[['#','Name',...Array.from({length:total},(_,i)=>String(i+1)),'P','A','H','%']];
    const body=Att.students.map(s=>{
      let P=0,A=0,H=0;const row=[s.roll||s.rollNo||'—',s.name];
      for(let d=1;d<=total;d++){
        const dk=attDateKey(y,m,d);
        if(dk>today||(sd&&dk<sd)){row.push('—');continue;}
        const st=(Att.cache[dk]||{})[s.id]||'N';if(st==='P')P++;else if(st==='A')A++;else if(st==='H')H++;
        row.push(st==='N'?'?':st);
      }
      const tot=P+A;row.push(P,A,H,tot>0?Math.round(P/tot*100)+'%':'N/A');return row;
    });
    doc.autoTable({head,body,startY:22,styles:{fontSize:6,cellPadding:1.5,halign:'center'},
      headStyles:{fillColor:[13,22,38],textColor:[232,244,255]},
      columnStyles:{0:{cellWidth:8},1:{cellWidth:22,halign:'left'}},
      didParseCell:(data)=>{if(data.section==='body'&&data.column.index>=2){const v=data.cell.raw;if(v==='P')data.cell.styles.textColor=[0,200,100];if(v==='A')data.cell.styles.textColor=[220,50,70];if(v==='H')data.cell.styles.textColor=[100,140,180];}}
    });
    doc.setFontSize(7);doc.text(`Generated: ${new Date().toLocaleDateString()}`,14,doc.lastAutoTable.finalY+4);
  }
  doc.save(`BCI_Attendance_${Att.className}_${Att.sessionId}.pdf`);
  showToast('✅ PDF exported!','success');
}

// ── STUDENT ──
async function initStudentAttendance(){
  const student=AppState.currentUser;if(!student)return;
  Att.classId=student.class;
  Att.className=student.class;
  Att.sMonth=new Date();Att.sTab='month';Att.lbMode='month';
  sSwitchMainTab('home');
  try{
    const snap=await db.collection('sessions').where('isActive','==',true).limit(1).get();
    snap.forEach(doc=>{Att.sessionId=doc.id;Att.sessionData={id:doc.id,...doc.data()};});
    if(Att.sessionData && !Att.sessionData.startDate){
      const sid=Att.sessionId||'';
      const yr=sid.split('-')[0];
      if(yr&&!isNaN(yr)) Att.sessionData.startDate=`${yr}-04-01`;
    }
  }catch{}
  Att.students=await attLoadStudents(Att.classId);

  // Compute psd (personal start date) = max(sessionStartDate, studentJoiningDate)
  // Mid-session joiners won't see NM '?' for days before they registered
  const sessionSd=Att.sessionData?.startDate||null;
  let studentJoinDate=null;
  if(student.createdAt?.seconds){
    const d=new Date(student.createdAt.seconds*1000);
    studentJoinDate=attDateKey(d.getFullYear(),d.getMonth(),d.getDate());
  } else if(student.createdAt && typeof student.createdAt==='string'){
    studentJoinDate=student.createdAt.substring(0,10);
  }
  // psd = whichever is later: session start OR student joining date
  if(sessionSd && studentJoinDate) Att.studentPsd=sessionSd>=studentJoinDate?sessionSd:studentJoinDate;
  else Att.studentPsd=sessionSd||studentJoinDate||null;

  // Clamp initial month to psd (don't open before joining month)
  if(Att.studentPsd){
    const psdDate=new Date(Att.studentPsd+'T00:00:00');
    const psdMonth=new Date(psdDate.getFullYear(),psdDate.getMonth(),1);
    const curMonth=new Date(Att.sMonth.getFullYear(),Att.sMonth.getMonth(),1);
    if(curMonth<psdMonth) Att.sMonth=psdDate;
  }

  sAttUpdateMonthLabel();
}

// ── STUDENT ATTENDANCE FUNCTIONS ──
function sAttUpdateMonthLabel(){
  const el=document.getElementById('s-att-month-label');
  if(el) el.textContent=Att.sMonth.toLocaleString('default',{month:'long',year:'numeric'});
}

function sAttSwitchTab(tab){
  Att.sTab=tab;
  const mt=document.getElementById('s-att-tab-month'),ot=document.getElementById('s-att-tab-overall');
  const nav=document.getElementById('s-att-month-nav');
  const legend=document.getElementById('s-att-legend');
  if(mt){if(tab==='month'){mt.style.background='rgba(0,212,255,0.15)';mt.style.borderColor='var(--neon-blue)';mt.style.color='var(--neon-blue)';}else{mt.style.background='var(--bg-card2)';mt.style.borderColor='var(--border)';mt.style.color='var(--text-muted)';}}
  if(ot){if(tab==='overall'){ot.style.background='rgba(0,212,255,0.15)';ot.style.borderColor='var(--neon-blue)';ot.style.color='var(--neon-blue)';}else{ot.style.background='var(--bg-card2)';ot.style.borderColor='var(--border)';ot.style.color='var(--text-muted)';}}
  if(nav) nav.style.display=tab==='month'?'flex':'none';
  if(legend) legend.style.display=tab==='month'?'flex':'none';
  sAttRender();
}

function sAttChangeMonth(dir){
  const d=new Date(Att.sMonth);d.setMonth(d.getMonth()+dir);
  const now=new Date();
  if(d>new Date(now.getFullYear(),now.getMonth(),1)){showToast('Cannot view future months','warning');return;}
  if(Att.studentPsd){
    const psd=new Date(Att.studentPsd+'T00:00:00');
    if(d<new Date(psd.getFullYear(),psd.getMonth(),1)){showToast('No attendance data before your joining month','info');return;}
  } else if(Att.sessionData?.startDate){
    const sd=new Date(Att.sessionData.startDate);
    if(d<new Date(sd.getFullYear(),sd.getMonth(),1)){showToast('Cannot go before session start','warning');return;}
  }
  Att.sMonth=d;sAttUpdateMonthLabel();sAttRender();
}

async function sAttRender(){
  const student=AppState.currentUser;if(!student||!Att.sessionId||!Att.classId)return;
  const studentId=student.id||student.docId;if(!studentId)return;
  const now=new Date();let dateKeys=[];
  const calWrap=document.getElementById('s-att-cal-wrap');
  const monthNav=document.getElementById('s-att-month-nav');

  if(Att.sTab==='month'){
    if(monthNav) monthNav.style.display='flex';
    document.getElementById('s-att-legend').style.display='flex';
    const y=Att.sMonth.getFullYear(),m=Att.sMonth.getMonth();
    await Promise.all([
      attLoadMonth(Att.sessionId,Att.classId,y,m),
      attLoadDayStatus(Att.sessionId,Att.classId,y,m)
    ]);
    const psd=Att.studentPsd||null;
    dateKeys=attGetDays(y,m).filter(dk=>dk<=attTodayKey()&&(Att.dayStatusCache[dk]||'nm')!=='nm'&&(!psd||dk>=psd));
    sAttRenderCal(y,m,studentId);
  }else{
    if(monthNav) monthNav.style.display='none';
    document.getElementById('s-att-legend').style.display='none';
    if(calWrap) calWrap.innerHTML='';
    const sd=Att.sessionData?.startDate;
    if(!sd){
      if(calWrap) calWrap.innerHTML='<div class="info-box" style="color:var(--warning);">Session start date not set by admin.</div>';
      return;
    }
    let cur=new Date(new Date(sd).getFullYear(),new Date(sd).getMonth(),1);
    let firstMonth=true;
    while(cur<=now){
      const y=cur.getFullYear(),m=cur.getMonth();
      await Promise.all([
        attLoadMonth(Att.sessionId,Att.classId,y,m),
        attLoadDayStatus(Att.sessionId,Att.classId,y,m,firstMonth)
      ]);
      firstMonth=false;
      const psd=Att.studentPsd||sd;
      attGetDays(y,m).filter(dk=>dk<=attTodayKey()&&dk>=psd&&(Att.dayStatusCache[dk]||'nm')!=='nm').forEach(dk=>dateKeys.push(dk));
      cur.setMonth(cur.getMonth()+1);
    }
    if(calWrap) calWrap.innerHTML='';
  }
  const stats=attCalcStats(studentId,dateKeys);
  document.getElementById('s-att-present').textContent=stats.P;
  document.getElementById('s-att-absent').textContent=stats.A;
  document.getElementById('s-att-holiday').textContent=stats.H;
  const pctEl=document.getElementById('s-att-pct');
  if(pctEl){
    pctEl.textContent=stats.pct!==null?stats.pct+'%':'N/A';
    pctEl.style.color=stats.pct===null?'var(--text-muted)':stats.pct>=75?'#00ff88':stats.pct>=50?'#ffaa00':'#ff4466';
  }
  // Update progress bar
  const total=stats.P+stats.A;
  const pct=stats.pct;
  const barFill=document.getElementById('s-att-bar-fill');
  const barTotal=document.getElementById('s-att-bar-total');
  const barP=document.getElementById('s-att-bar-p');
  const barA=document.getElementById('s-att-bar-a');
  const barPct=document.getElementById('s-att-bar-pct');
  if(barTotal) barTotal.textContent=total||'0';
  if(barP) barP.textContent=stats.P;
  if(barA) barA.textContent=stats.A;
  if(barPct){
    barPct.textContent=pct!==null?pct+'%':'N/A';
    barPct.style.color=pct===null?'var(--text-muted)':pct>=75?'#00ff88':pct>=50?'#ffaa00':'#ff4466';
  }
  if(barFill){
    const fillColor=pct===null?'#7a9bba':pct>=75?'linear-gradient(90deg,#00c853,#00ff88)':pct>=50?'linear-gradient(90deg,#e65c00,#ffaa00)':'linear-gradient(90deg,#c62828,#ff4466)';
    barFill.style.transition='none';       // disable transition
    barFill.style.width='0%';             // snap to 0
    barFill.style.background=fillColor;
    barFill.offsetWidth;                  // force reflow — browser MUST render 0% before next line
    barFill.style.transition='width 0.6s cubic-bezier(.4,0,.2,1)'; // re-enable
    requestAnimationFrame(()=>{
      barFill.style.width=(pct!==null?pct:0)+'%'; // animate to target
    });
  }
}

function sAttRenderCal(y,m,studentId){
  const wrap=document.getElementById('s-att-cal-wrap');if(!wrap)return;
  const total=attDaysInMonth(y,m),fd=attFirstDay(y,m),today=attTodayKey();
  const psd=Att.studentPsd||Att.sessionData?.startDate||null;
  const DN=['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;width:100%;box-sizing:border-box;">';
  DN.forEach(d=>html+=`<div style="text-align:center;font-size:10px;color:var(--text-dim);font-weight:700;padding:4px 0;font-family:'Rajdhani',sans-serif;letter-spacing:0;">${d}</div>`);
  for(let i=0;i<fd;i++)html+=`<div></div>`;
  const icons={P:'✓',A:'✗',H:'H',N:'?'};
  const bgs={P:'rgba(0,255,136,0.12)',A:'rgba(255,68,102,0.12)',H:'rgba(122,155,186,0.12)',N:'rgba(255,170,0,0.1)'};
  const cols={P:'#00ff88',A:'#ff4466',H:'#7a9bba',N:'#ffaa00'};
  for(let d=1;d<=total;d++){
    const dk=attDateKey(y,m,d),fut=dk>today,bef=psd&&dk<psd,isToday=dk===today;
    if(fut||bef){html+=`<div style="width:36px;height:36px;aspect-ratio:1;border-radius:4px;background:var(--bg-card2);opacity:0.35;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-dim);">${d}</div>`;continue;}
    const st=(Att.cache[dk]||{})[studentId]||'N';
    html+=`<div style="width:36px;height:36px;aspect-ratio:1;border-radius:4px;background:${bgs[st]};color:${cols[st]};border:2px solid ${isToday?'var(--neon-blue)':'transparent'};display:flex;flex-direction:column;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;">
      <span style="font-size:12px;font-weight:700;">${d}</span><span style="font-size:9px;margin-top:1px;">${icons[st]}</span></div>`;
  }
  html+='</div>';wrap.innerHTML=html;
}

// ── LEADERBOARD ──
// ── MAIN TAB SWITCH (Attendance / Leaderboard) ──
function sSwitchMainTab(tab){
  const selection=document.getElementById('s-att-selection');
  const attPanel=document.getElementById('s-panel-att');
  const lbPanel=document.getElementById('s-panel-lb');
  selection?.classList.add('hidden');
  attPanel?.classList.add('hidden');
  lbPanel?.classList.add('hidden');
  if(tab==='home'){
    selection?.classList.remove('hidden');
  } else if(tab==='att'){
    attPanel?.classList.remove('hidden');
    sAttRender();
  } else if(tab==='lb'){
    lbPanel?.classList.remove('hidden');
    sLbInit();
  }
}

function sLbSwitchTab(mode){
  Att.lbMode=mode;
  const mt=document.getElementById('s-lb-tab-month'),ot=document.getElementById('s-lb-tab-overall');
  const nav=document.getElementById('s-lb-month-nav');
  if(mt){if(mode==='month'){mt.style.background='rgba(139,92,246,0.12)';mt.style.borderColor='var(--purple)';mt.style.color='var(--purple)';}else{mt.style.background='var(--bg-card2)';mt.style.borderColor='var(--border)';mt.style.color='var(--text-muted)';}}
  if(ot){if(mode==='overall'){ot.style.background='rgba(139,92,246,0.12)';ot.style.borderColor='var(--purple)';ot.style.color='var(--purple)';}else{ot.style.background='var(--bg-card2)';ot.style.borderColor='var(--border)';ot.style.color='var(--text-muted)';}}
  // Show/hide month navigation (only for month tab)
  if(nav) nav.style.display=mode==='month'?'flex':'none';
  // Panel visibility per tab
  if(mode==='month'){
    document.getElementById('s-lb-overall-progress')?.classList.add('hidden');
    document.getElementById('s-lb-overall-empty')?.classList.add('hidden');
  } else {
    document.getElementById('s-lb-pending')?.classList.add('hidden');
    document.getElementById('s-lb-coming-soon')?.classList.add('hidden');
  }
  sLbLoad();
}

// ── MONTH NAVIGATION ──
function sLbChangeMonth(dir){
  const d=new Date(Att.lbMonth);
  d.setMonth(d.getMonth()+dir);
  const now=new Date();
  const curMonth=new Date(now.getFullYear(),now.getMonth(),1);
  const sd=Att.sessionData?.startDate;
  const sessionMonth=sd?new Date(new Date(sd+'T00:00:00').getFullYear(),new Date(sd+'T00:00:00').getMonth(),1):curMonth;
  if(d<sessionMonth){showToast('No data before session start','info');return;}
  if(d>curMonth){showToast('Cannot view future months','warning');return;}
  Att.lbMonth=d;
  sLbUpdateMonthLabel();
  sLbLoad();
}

function sLbUpdateMonthLabel(){
  const el=document.getElementById('s-lb-month-label');
  if(!el||!Att.lbMonth) return;
  el.textContent=Att.lbMonth.toLocaleString('default',{month:'long',year:'numeric'});
}

function sLbInit(){
  const now=new Date();
  let initMonth=new Date(now.getFullYear(),now.getMonth(),1);
  // Clamp to session start month — never show before session
  if(Att.sessionData?.startDate){
    const sd=new Date(Att.sessionData.startDate+'T00:00:00');
    const sessionMonth=new Date(sd.getFullYear(),sd.getMonth(),1);
    if(initMonth<sessionMonth) initMonth=sessionMonth;
  }
  Att.lbMonth=initMonth;
  sLbUpdateMonthLabel();
  const nav=document.getElementById('s-lb-month-nav');
  if(nav) nav.style.display=Att.lbMode==='month'?'flex':'none';
  sLbLoad();
}

// ── LEADERBOARD DOC ID HELPER ──
// Format: {sessionId}_{BOARD}-{classNum}_{YYYY-MM}
// e.g. "2627-BSEB-10_BSEB-10_2026-04" → clean, short, predictable
function lbGetDocId(sessionId, board, className, monthStr){
  const b=(board||'BSEB').toUpperCase();
  // Extract class number from various formats: "Class 10", "class-10", "10"
  const classNum=(className||'').replace(/^class[-\s]*/i,'').replace(/[^0-9a-zA-Z]/g,'').trim()||'X';
  return `${sessionId}_${b}-${classNum}_${monthStr}`;
}

// ── LEADERBOARD PUBLISH CHECK (runs on admin load) ──
async function lbCheckAndPublish(){
  // Only run on/after 1st of current month — checks previous month
  const now=new Date();
  // IST offset = UTC+5:30
  const istNow=new Date(now.getTime()+5.5*60*60*1000);
  if(istNow.getDate()<1) return; // safety check

  const prevMonth=new Date(istNow.getFullYear(),istNow.getMonth()-1,1);
  const py=prevMonth.getFullYear(),pm=prevMonth.getMonth();
  const monthStr=py+'-'+String(pm+1).padStart(2,'0');

  if(!Att.sessionId||!Att.classId) return;

  // ── GUARD: Previous month must be within this session's range ──
  // If session starts in April 2026 and prev month is March 2026 → skip silently
  // No cross-session leaderboard notifications
  // If startDate not set → derive from sessionId (e.g. "2026-27" → April 2026)
  let _sessionStartDate = Att.sessionData?.startDate || null;
  if(!_sessionStartDate && Att.sessionId){
    // Derive from sessionId format "2026-27" → start = April 2026
    const yr = parseInt((Att.sessionId||'').substring(0,4));
    if(!isNaN(yr)) _sessionStartDate = `${yr}-04-01`;
  }
  if(_sessionStartDate){
    const sd = new Date(_sessionStartDate+'T00:00:00');
    const sessionStartMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
    if(prevMonth < sessionStartMonth) return; // prev month is before this session → ignore
  } else {
    // No session date info at all → cannot determine range → skip safely
    return;
  }

  const notifyEl=document.getElementById('att-lb-notify');
  const notifyIcon=document.getElementById('att-lb-notify-icon');
  const notifyTitle=document.getElementById('att-lb-notify-title');
  const notifyMsg=document.getElementById('att-lb-notify-msg');

  const showNotify=(type,title,msg)=>{
    if(!notifyEl) return;
    notifyEl.classList.remove('hidden');
    notifyEl.style.background=type==='success'?'rgba(0,255,136,0.06)':'rgba(255,170,0,0.06)';
    notifyEl.style.border=type==='success'?'1px solid rgba(0,255,136,0.25)':'1px solid rgba(255,170,0,0.25)';
    if(notifyIcon) notifyIcon.textContent=type==='success'?'✅':'⚠️';
    if(notifyTitle){notifyTitle.textContent=title;notifyTitle.style.color=type==='success'?'var(--success)':'var(--warning)';}
    if(notifyMsg) notifyMsg.textContent=msg;
  };

  try{
    const lbDocId=lbGetDocId(Att.sessionId,Att.board,Att.className,monthStr);
    const lbRef=db.collection('leaderboard').doc(lbDocId);

    // Load day status first — needed for both publish check and notification
    await attLoadDayStatus(Att.sessionId,Att.classId,py,pm);
    const sd=Att.sessionData?.startDate||null;
    const ed=Att.sessionData?.endDate||null;
    let totalSessionDays=0,openDays=0,holidayDays=0;
    const totalInMonth=attDaysInMonth(py,pm);
    for(let d=1;d<=totalInMonth;d++){
      const dk=attDateKey(py,pm,d);
      if(sd&&dk<sd) continue; // before session start
      if(ed&&dk>ed) continue; // after session end
      totalSessionDays++;
      const ds=Att.dayStatusCache[dk]||'nm';
      if(ds==='open') openDays++;
      else if(ds==='holiday') holidayDays++;
    }
    const nmDays=totalSessionDays-(openDays+holidayDays);
    const mName=prevMonth.toLocaleString('default',{month:'long',year:'numeric'});

    // No session days in this month — outside session range, skip silently
    if(totalSessionDays===0) return;

    // Already published and data is valid — just notify
    const lbSnap=await lbRef.get();
    if(lbSnap.exists&&lbSnap.data().published&&(lbSnap.data().openDays||0)>0){
      showNotify('success',`${mName} Leaderboard Published!`,`The ${mName} attendance leaderboard is now live for all students.`);
      return;
    }

    if(nmDays>0){
      showNotify('warning',`${mName} Leaderboard On Hold`,`Cannot publish — ${nmDays} day${nmDays!==1?'s':''} still marked as ?NM. Resolve all NM days in the Calendar to publish.`);
      return;
    }

    // All days resolved — calculate and publish
    const lbData=await lbCalculateMonth(py,pm,openDays,sd,ed);
    await lbRef.set({
      published:true,
      publishedAt:Date.now(),
      month:monthStr,
      sessionId:Att.sessionId,
      board:Att.board,
      className:Att.className,
      openDays,holidayDays,nmDays:0,
      data:lbData
    });
    showNotify('success',`${mName} Leaderboard Published!`,`Calculated from ${openDays} open day${openDays!==1?'s':''} — now live for all students.`);
  }catch(e){console.error('lbCheckAndPublish:',e);}
}

// ── CALCULATE LEADERBOARD FOR A MONTH ──
async function lbCalculateMonth(y,m,totalOpenDays,sessionSd,sessionEd){
  const snap=await db.collection('students').where('status','==','approved').get();
  const allStudents=[];
  snap.forEach(doc=>allStudents.push({id:doc.id,...doc.data()}));

  // Group by class and load attendance
  const classesSeen=new Set(allStudents.map(s=>s.class).filter(Boolean));
  const classRecords={};
  for(const cls of classesSeen){
    const safeId=cls.toLowerCase().replace(/\s+/g,'-');
    const docId=Att.sessionId+'_'+safeId;
    classRecords[cls]={};
    try{
      const rSnap=await db.collection('attendance').doc(docId).collection('records').get();
      rSnap.forEach(r=>{classRecords[cls][r.id]=r.data();});
    }catch{}
  }

  const today=attTodayKey();
  const lbData=[];

  for(const s of allStudents){
    const cls=s.class; if(!cls) continue;
    const recs=classRecords[cls]||{};

    // Student's personal start date
    let sJoinDk=null;
    if(s.createdAt?.seconds){const jd=new Date(s.createdAt.seconds*1000);sJoinDk=attDateKey(jd.getFullYear(),jd.getMonth(),jd.getDate());}
    else if(s.createdAt&&typeof s.createdAt==='string') sJoinDk=s.createdAt.substring(0,10);
    const psd=sessionSd&&sJoinDk?(sessionSd>=sJoinDk?sessionSd:sJoinDk):sessionSd||sJoinDk||null;

    // Get open days from this student's psd onwards
    let studentOpenDays=0;
    let P=0,A=0;
    // We need dayStatusCache for this month — already loaded by caller
    for(let d=1;d<=attDaysInMonth(y,m);d++){
      const dk=attDateKey(y,m,d);
      if(psd&&dk<psd) continue;          // before student joining date
      if(dk>today) continue;             // future date
      if(sessionEd&&dk>sessionEd) continue; // after session end date
      const ds=Att.dayStatusCache[dk]||'nm';
      if(ds==='open'){
        studentOpenDays++;
        const st=(recs[dk]||{})[s.id]||'N';
        if(st==='P') P++;
        else if(st==='A') A++;
      }
    }

    // Skip if no open days at all for this student
    if(studentOpenDays===0) continue;

    // Fairness formula
    const missedDays=studentOpenDays-(P+A);
    let pct;
    if(missedDays===0){
      // Full data: P / totalOpenDays (student's open days) × 100
      pct=Math.round(P/studentOpenDays*100);
    } else {
      // Late joiner formula: assume 75% for missed days
      pct=Math.round((P*1+missedDays*0.75)/studentOpenDays*100);
    }

    const classDisplay=cls.replace(/^class-/i,'Class ').replace(/-/g,' ').replace(/\w/g,c=>c.toUpperCase());
    lbData.push({id:s.id,name:s.name,classId:cls,classDisplay,roll:s.roll||s.rollNo||'—',pct,P,A,studentOpenDays,missedDays});
  }

  // Sort & rank
  lbData.sort((a,b)=>b.pct!==a.pct?b.pct-a.pct:a.name.localeCompare(b.name));
  let rank=1;
  for(let i=0;i<lbData.length;i++){
    lbData[i].rank=i>0&&lbData[i].pct===lbData[i-1].pct?lbData[i-1].rank:rank;rank++;
  }
  return lbData;
}

// ── LOAD LEADERBOARD (student side) ──
async function sLbLoad(){
  const student=AppState.currentUser; if(!student||!Att.sessionId) return;
  const myId=student.id||student.docId;
  const myClass=Att.classId;
  const lb=document.getElementById('s-lb-loading');
  const content=document.getElementById('s-lb-content');
  lb?.classList.remove('hidden');
  content?.classList.add('hidden');

  const classDisplayLabel=myClass?myClass.replace(/^class-/i,'Class ').replace(/-/g,' ').replace(/\w/g,c=>c.toUpperCase()):'-';
  const classLabelEl=document.getElementById('s-lb-class-label');
  if(classLabelEl) classLabelEl.textContent=classDisplayLabel;

  try{
    if(Att.lbMode==='month'){
      await sLbLoadMonth(myId,myClass);
    } else {
      await sLbLoadOverall(myId,myClass);
    }
  }catch(e){console.error('Leaderboard:',e);}

  lb?.classList.add('hidden');
  content?.classList.remove('hidden');
}

async function sLbLoadMonth(myId,myClass){
  const pending=document.getElementById('s-lb-pending');
  const tables=document.getElementById('s-lb-tables');
  const pendingMsg=document.getElementById('s-lb-pending-msg');
  const emptyEl=document.getElementById('s-lb-empty');

  // Hide all first
  pending?.classList.add('hidden');
  tables?.classList.add('hidden');
  emptyEl?.classList.add('hidden');

  const now=new Date();
  const istNow=new Date(now.getTime()+5.5*60*60*1000);
  const curY=istNow.getFullYear(),curM=istNow.getMonth();
  const lbY=Att.lbMonth.getFullYear(),lbM=Att.lbMonth.getMonth();

  // If viewing current month → always show pending
  if(lbY===curY&&lbM===curM){
    const nextMonth=new Date(curY,curM+1,1);
    if(pendingMsg) pendingMsg.textContent=`${Att.lbMonth.toLocaleString('default',{month:'long',year:'numeric'})} leaderboard will be available on 1 ${nextMonth.toLocaleString('default',{month:'long'})} ${nextMonth.getFullYear()}`;
    pending?.classList.remove('hidden');
    // Add coming soon structure below pending message
    const comingSoon=document.getElementById('s-lb-coming-soon');
    if(comingSoon) comingSoon.classList.remove('hidden');
    return;
  }
  // Hide coming soon for past months
  const comingSoon=document.getElementById('s-lb-coming-soon');
  if(comingSoon) comingSoon.classList.add('hidden');

  // Previous month — load ALL classes to get true cross-class Top 10
  const monthStr=lbY+'-'+String(lbM+1).padStart(2,'0');

  try{
    // Get all classes from students collection
    const studentsSnap=await db.collection('students').where('status','==','approved').get();
    const classesSeen=new Set();
    studentsSnap.forEach(doc=>{if(doc.data().class) classesSeen.add(doc.data().class);});

    // Load leaderboard doc for each class and merge using board+class combination
    const boardClassSeen=new Set(allStudents.map(s=>(s.board||'BSEB')+'|'+(s.class||'')).filter(x=>x.split('|')[1]));
    let allData=[];
    for(const bc of boardClassSeen){
      const [brd,cls]=bc.split('|');
      const docId=lbGetDocId(Att.sessionId,brd,cls,monthStr);
      try{
        const snap=await db.collection('leaderboard').doc(docId).get();
        if(snap.exists&&snap.data().published){
          allData=[...allData,...(snap.data().data||[])];
        }
      }catch{}
    }

    if(!allData.length){
      if(emptyEl){emptyEl.classList.remove('hidden');emptyEl.textContent='Leaderboard not available for this month.';}
      return;
    }

    // Re-sort and re-rank merged data
    allData.sort((a,b)=>b.pct!==a.pct?b.pct-a.pct:a.name.localeCompare(b.name));
    let rank=1;
    for(let i=0;i<allData.length;i++){
      allData[i].rank=i>0&&allData[i].pct===allData[i-1].pct?allData[i-1].rank:rank;rank++;
    }
    sLbRenderTables(allData,myId,myClass);
    tables?.classList.remove('hidden');
  }catch(e){
    if(emptyEl){emptyEl.classList.remove('hidden');emptyEl.textContent='Failed to load leaderboard.';}
  }
}

async function sLbLoadOverall(myId,myClass){
  // ── OVERALL LEADERBOARD ──
  // Logic: average of each published month's pct per student across ALL classes.
  // If a student has no entry in a published month → assume 75% (fairness rule).
  // This builds month by month throughout the session.

  const tables      = document.getElementById('s-lb-tables');
  const emptyEl     = document.getElementById('s-lb-empty');
  const progressEl  = document.getElementById('s-lb-overall-progress');
  const overallEmpty= document.getElementById('s-lb-overall-empty');
  const pendingEl   = document.getElementById('s-lb-pending');

  // Hide all panels first
  tables?.classList.add('hidden');
  emptyEl?.classList.add('hidden');
  progressEl?.classList.add('hidden');
  overallEmpty?.classList.add('hidden');
  pendingEl?.classList.add('hidden');
  document.getElementById('s-lb-coming-soon')?.classList.add('hidden');

  const sd = Att.sessionData?.startDate;
  const ed = Att.sessionData?.endDate || null;

  if(!sd){
    if(overallEmpty){ overallEmpty.classList.remove('hidden'); document.getElementById('s-lb-overall-empty-msg').textContent='Session start date not set.'; }
    return;
  }

  const now    = new Date();
  const istNow = new Date(now.getTime() + 5.5*60*60*1000);

  // ── STEP 1: Build list of all months from session start → last completed month ──
  const sdDate = new Date(sd+'T00:00:00');
  let cur = new Date(sdDate.getFullYear(), sdDate.getMonth(), 1);

  // Last completed month = current month - 1 (clamped to session end)
  let lastMonthDate = new Date(istNow.getFullYear(), istNow.getMonth()-1, 1);
  if(ed){
    const edDate  = new Date(ed+'T00:00:00');
    const edMonth = new Date(edDate.getFullYear(), edDate.getMonth(), 1);
    if(edMonth < lastMonthDate) lastMonthDate = edMonth;
  }

  // Collect all month strings in session range
  const allMonthStrs = [];
  const tempCur = new Date(cur);
  while(tempCur <= lastMonthDate){
    allMonthStrs.push(tempCur.getFullYear()+'-'+String(tempCur.getMonth()+1).padStart(2,'0'));
    tempCur.setMonth(tempCur.getMonth()+1);
  }

  // Total possible months in full session (for progress bar)
  const edForProgress = ed ? new Date(ed+'T00:00:00') : new Date(sdDate.getFullYear()+1, sdDate.getMonth(), 1);
  const sessionEndMonth = new Date(edForProgress.getFullYear(), edForProgress.getMonth(), 1);
  let totalSessionMonths = 0;
  const tCur = new Date(sdDate.getFullYear(), sdDate.getMonth(), 1);
  while(tCur <= sessionEndMonth){ totalSessionMonths++; tCur.setMonth(tCur.getMonth()+1); }

  // ── STEP 2: Get all unique board+class combos from approved students ──
  let boardClassSet = new Set();
  try{
    const studSnap = await db.collection('students').where('status','==','approved').get();
    studSnap.forEach(doc=>{
      const d = doc.data();
      if(d.class){ boardClassSet.add((d.board||'BSEB')+'|'+(d.class)); }
    });
  }catch(e){ console.error('Overall LB: students fetch failed',e); }

  if(!boardClassSet.size){
    if(overallEmpty){ overallEmpty.classList.remove('hidden'); document.getElementById('s-lb-overall-empty-msg').textContent='No approved students found.'; }
    return;
  }

  // ── STEP 3: For each month, fetch ALL class leaderboard docs ──
  // Structure: monthData[monthStr] = { published: bool, students: { id -> pct } }
  let publishedMonthCount = 0;

  // studentMeta: id -> { name, classId, classDisplay, roll }  (filled from any doc)
  const studentMeta = {};

  // perStudentMonthPct: id -> { [monthStr]: pct }  (actual pct from published doc)
  const perStudentMonthPct = {};

  for(const monthStr of allMonthStrs){
    let monthHasData = false;

    for(const bc of boardClassSet){
      const [brd, cls] = bc.split('|');
      const docId = lbGetDocId(Att.sessionId, brd, cls, monthStr);
      try{
        const snap = await db.collection('leaderboard').doc(docId).get();
        if(snap.exists && snap.data().published){
          monthHasData = true;
          const entries = snap.data().data || [];
          entries.forEach(e=>{
            // Save student meta (name, class, roll) — use latest seen
            if(!studentMeta[e.id]){
              studentMeta[e.id] = {
                name: e.name,
                classId: e.classId,
                classDisplay: e.classDisplay || (e.classId||'').replace(/^class-/i,'Class ').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),
                roll: e.roll || '—'
              };
            }
            // Save this student's pct for this month
            if(!perStudentMonthPct[e.id]) perStudentMonthPct[e.id] = {};
            perStudentMonthPct[e.id][monthStr] = e.pct;
          });
        }
      }catch{}
    }

    if(monthHasData) publishedMonthCount++;
  }

  // ── STEP 4: No months published yet ──
  if(publishedMonthCount === 0){
    const nextMonthDate = new Date(istNow.getFullYear(), istNow.getMonth()+1, 1);
    const nextMonthName = nextMonthDate.toLocaleString('default',{month:'long', year:'numeric'});
    if(overallEmpty){
      overallEmpty.classList.remove('hidden');
      document.getElementById('s-lb-overall-empty-msg').textContent =
        `No months published yet. Overall leaderboard will appear after ${new Date(istNow.getFullYear(),istNow.getMonth(),1).toLocaleString('default',{month:'long',year:'numeric'})} ends on 1 ${nextMonthName}.`;
    }
    return;
  }

  // ── STEP 5: Calculate overall % for each student ──
  // Pre-compute which months are actually published (has at least one student entry)
  // Do this ONCE outside the student loop for efficiency
  const publishedMonthSet = new Set();
  for(const monthStr of allMonthStrs){
    const hasData = Object.values(perStudentMonthPct).some(mp => mp[monthStr] !== undefined);
    if(hasData) publishedMonthSet.add(monthStr);
  }

  // For each published month: use actual pct if available, else assume 75%
  const allStudentIds = new Set([...Object.keys(perStudentMonthPct)]);

  const lbData = [];
  for(const id of allStudentIds){
    const meta = studentMeta[id]; if(!meta) continue;
    const monthPcts = perStudentMonthPct[id] || {};

    let totalPct = 0;
    for(const monthStr of publishedMonthSet){
      // Student has actual data → use it; missing → 75% assumption
      totalPct += (monthPcts[monthStr] !== undefined) ? monthPcts[monthStr] : 75;
    }

    const overallPct = publishedMonthSet.size > 0 ? Math.round(totalPct / publishedMonthSet.size) : 0;
    lbData.push({
      id,
      name: meta.name,
      classId: meta.classId,
      classDisplay: meta.classDisplay,
      roll: meta.roll,
      pct: overallPct,
      monthsIncluded: publishedMonthSet.size
    });
  }

  // ── STEP 6: Sort and rank ──
  lbData.sort((a,b)=>b.pct!==a.pct?b.pct-a.pct:a.name.localeCompare(b.name));
  let rank=1;
  for(let i=0;i<lbData.length;i++){
    lbData[i].rank = i>0&&lbData[i].pct===lbData[i-1].pct ? lbData[i-1].rank : rank;
    rank++;
  }

  // ── STEP 7: Show progress banner ──
  const publishedCount = publishedMonthSet.size;
  if(progressEl){
    progressEl.classList.remove('hidden');
    const barPct = Math.round((publishedCount / totalSessionMonths)*100);
    document.getElementById('s-lb-progress-bar').style.width = barPct+'%';
    document.getElementById('s-lb-progress-text').textContent = `${publishedCount} / ${totalSessionMonths} months`;

    // Next month publish info
    const nextPub = new Date(istNow.getFullYear(), istNow.getMonth()+1, 1);
    const nextPubStr = `1 ${nextPub.toLocaleString('default',{month:'long',year:'numeric'})}`;
    const curMonthName = istNow.toLocaleString('default',{month:'long',year:'numeric'});
    document.getElementById('s-lb-progress-sub').textContent =
      publishedCount < totalSessionMonths
        ? `Based on ${publishedCount} completed month${publishedCount!==1?'s':''} · ${curMonthName} results publish on ${nextPubStr}`
        : `✅ Session complete — all ${totalSessionMonths} months included`;
  }

  // ── STEP 8: Render tables ──
  sLbRenderTables(lbData, myId, myClass);
  tables?.classList.remove('hidden');
}

function sLbRenderTables(lbData,myId,myClass){
  const top10=lbData.slice(0,10);
  const classData=lbData.filter(x=>x.classId===myClass);
  const top5=classData.slice(0,5);
  const myEntry=lbData.find(x=>x.id===myId);

  document.getElementById('s-lb-overall-list').innerHTML=
    top10.length?top10.map(e=>sLbRowHTML(e,e.id===myId)).join(''):
    '<div style="text-align:center;color:var(--text-dim);padding:16px;font-size:var(--fs-sm);">No data yet</div>';

  const myOverallEl=document.getElementById('s-lb-my-overall');
  if(myEntry&&!top10.find(x=>x.id===myId)){myOverallEl.innerHTML=sLbRowHTML(myEntry,true);myOverallEl.classList.remove('hidden');}
  else myOverallEl?.classList.add('hidden');

  document.getElementById('s-lb-class-list').innerHTML=
    top5.length?top5.map(e=>sLbRowHTML(e,e.id===myId)).join(''):
    '<div style="text-align:center;color:var(--text-dim);padding:16px;font-size:var(--fs-sm);">No class data yet</div>';

  const myClassEl=document.getElementById('s-lb-my-class');
  if(myEntry&&!top5.find(x=>x.id===myId)&&classData.find(x=>x.id===myId)){myClassEl.innerHTML=sLbRowHTML(myEntry,true);myClassEl.classList.remove('hidden');}
  else myClassEl?.classList.add('hidden');

  const avgEl=document.getElementById('s-lb-avg');
  if(avgEl&&classData.length){
    const avg=Math.round(classData.reduce((s,x)=>s+x.pct,0)/classData.length);
    avgEl.textContent=`📊 Class Average (${myClass}): ${avg}% — ${classData.length} students ranked`;
  }
}

function sLbRowHTML(entry,isMe){
  const rankEmoji=entry.rank===1?'🥇':entry.rank===2?'🥈':entry.rank===3?'🥉':`#${entry.rank}`;
  const rankColor=entry.rank===1?'#FFD700':entry.rank===2?'#C0C0C0':entry.rank===3?'#CD7F32':isMe?'var(--purple)':'var(--text-muted)';
  const pctColor=entry.pct>=75?'#00ff88':entry.pct>=50?'#ffaa00':'#ff4466';
  const bg=isMe?'rgba(139,92,246,0.08)':'var(--bg-card2)';
  const border=isMe?'var(--purple)':'var(--border)';
  const classDisplay=entry.classDisplay||(entry.classId||'').replace(/^class-/i,'Class ').replace(/-/g,' ').replace(/\w/g,c=>c.toUpperCase());
  return `<div style="display:grid;grid-template-columns:36px 1fr 44px 42px 46px;gap:4px;padding:9px 8px;background:${bg};border:1px solid ${border};border-top:none;align-items:center;${isMe?'border-left:3px solid var(--purple);':''}">
    <div style="font-size:${entry.rank<=3?'16px':'var(--fs-sm)'};font-weight:700;color:${rankColor};font-family:'Rajdhani',sans-serif;text-align:center;">${rankEmoji}</div>
    <div style="min-width:0;">
      <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isMe?'color:var(--purple);':''}">${entry.name}${isMe?' ★':''}</div>
    </div>
    <div style="font-size:10px;color:var(--text-muted);text-align:center;">${classDisplay}</div>
    <div style="font-size:var(--fs-xs);color:var(--text-muted);text-align:center;">${entry.roll}</div>
    <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:${pctColor};font-size:var(--fs-sm);text-align:right;">${entry.pct}%</div>
  </div>`;
}

window.addEventListener('online',()=>attSyncQ());

// =============================================================
// STUDENT ID CARD — Canvas-based futuristic digital ID
// =============================================================
// roundRect polyfill — ctx.roundRect not supported on old Android (Chrome < 99)
// Uses manual path drawing as fallback
function _roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  else if (Array.isArray(r)) {
    if (r.length === 1) r = [r[0], r[0], r[0], r[0]];
    else if (r.length === 2) r = [r[0], r[1], r[0], r[1]];
    else if (r.length === 3) r = [r[0], r[1], r[2], r[1]];
  }
  const [tl, tr, br, bl] = r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function showStudentIdCard(){
  const modal = document.getElementById('modal-id-card');
  if(!modal) return;
  modal.style.display = 'flex';
  generateIdCard();
}

async function generateIdCard(skipPhoto = false){
  const student = AppState.currentUser;
  if(!student) return;
  const canvas = document.getElementById('id-card-canvas');
  if(!canvas) return;

  const inst      = window._instituteData || {};
  const instName  = (inst.name  || 'Brilliant Coaching Institute').toUpperCase();
  const instShort = inst.shortName || 'B.C.I';
  const instCity  = inst.city  || 'Buxar, Bihar';
  const instPhone = inst.phone || '6206437776';

  // Get logo — try sidebar img first (hardcoded), then Firebase, then fallback
  let logoSrc = null;
  try{
    // 1. Try to get from sidebar img (hardcoded base64 logo)
    const sidebarLogo = document.querySelector('.sidebar-logo');
    if(sidebarLogo && sidebarLogo.src && !sidebarLogo.src.endsWith('undefined') && sidebarLogo.naturalWidth > 0){
      logoSrc = sidebarLogo.src;
    }
    // 2. Try Firebase institute data (uploaded logo)
    if(!logoSrc){
      const instLogo = window._instituteData?.logo;
      if(instLogo && !instLogo.startsWith('data:image/svg')){
        logoSrc = instLogo;
      }
    }
    // 3. Try fetch fresh from Firestore
    if(!logoSrc){
      const doc = await db.collection('admin').doc('institute').get();
      if(doc.exists && doc.data().logo && !doc.data().logo.startsWith('data:image/svg')){
        logoSrc = doc.data().logo;
      }
    }
  }catch(e){ logoSrc = null; }

  const className = AppState.currentClassName || getClassName(student.class) || 'Class —';
  const board     = (student.board || 'BSEB').toUpperCase();
  const studentId = student.studentId || student.id || '—';
  const roll      = student.roll || student.rollNo || '—';
  const session   = student.session || '—';
  const sessEnd   = session ? (parseInt((session||'0-0').split('-')[1]||'0') + 2000) : null;
  const validTill = sessEnd ? 'Valid Till: March ' + sessEnd : '';

  // Portrait ID card: 54mm × 86mm at 96dpi → 204 × 325px → scale 3x
  const SCALE = 2;
  const W = 320, H = 490;
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width  = '100%';   // responsive — fills container width
  canvas.style.height = 'auto';   // auto height maintains aspect ratio
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#0a1628');
  bg.addColorStop(1,   '#060d1a');
  ctx.fillStyle = bg;
  _roundRect(ctx, 0, 0, W, H, 14); ctx.fill();

  // ── Top gradient bar ──
  const topBar = ctx.createLinearGradient(0, 0, W, 0);
  topBar.addColorStop(0, '#00d4ff'); topBar.addColorStop(0.5, '#7c3aed'); topBar.addColorStop(1, '#00d4ff');
  ctx.fillStyle = topBar;
  _roundRect(ctx, 0, 0, W, 5, [14,14,0,0]); ctx.fill();

  // ── Bottom gradient bar ──
  ctx.fillStyle = topBar;
  _roundRect(ctx, 0, H-4, W, 4, [0,0,14,14]); ctx.fill();

  // ── Subtle glow top-right ──
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 180);
  glow.addColorStop(0, 'rgba(0,212,255,0.08)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // ── HEADER SECTION (top 100px) ──
  // Logo
  const logoSize = 44, logoX = 14, logoY = 12;
  if(logoSrc){
    try{
      const logoImg = await loadImage(logoSrc);
      ctx.save();
      ctx.beginPath(); ctx.arc(logoX+logoSize/2, logoY+logoSize/2, logoSize/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
      // Circle border
      ctx.strokeStyle = 'rgba(0,212,255,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(logoX+logoSize/2, logoY+logoSize/2, logoSize/2, 0, Math.PI*2); ctx.stroke();
    }catch{ drawLogoFallback(ctx, logoX, logoY, logoSize, instShort); }
  } else {
    drawLogoFallback(ctx, logoX, logoY, logoSize, instShort);
  }

  // Institute name next to logo
  const tx = logoX + logoSize + 10;
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 18px Rajdhani, sans-serif';
  ctx.fillText(instShort, tx, logoY + 16);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 13px Rajdhani, sans-serif';
  // Wrap long name
  const maxW = W - tx - 10;
  wrapText(ctx, instName, tx, logoY + 30, maxW, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText(instCity, tx, logoY + 54);

  // Divider
  ctx.strokeStyle = 'rgba(0,212,255,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(14, 68); ctx.lineTo(W-14, 68); ctx.stroke();

  // "STUDENT IDENTITY CARD" label
  ctx.fillStyle = 'rgba(0,212,255,0.8)';
  ctx.font = 'bold 9px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('— STUDENT IDENTITY CARD —', W/2, 81);
  ctx.textAlign = 'left';

  // ── PHOTO (centered) ──
  const pW=100, pH=122, pX=(W-pW)/2, pY=88, pR=8;
  // Glow border
  ctx.shadowColor='#00d4ff'; ctx.shadowBlur=12;
  ctx.strokeStyle='rgba(0,212,255,0.7)'; ctx.lineWidth=2;
  _roundRect(ctx, pX, pY, pW, pH, pR); ctx.stroke();
  ctx.shadowBlur=0;
  // Photo — skip if skipPhoto=true (avoids tainted canvas for share/download)
  ctx.save();
  _roundRect(ctx, pX, pY, pW, pH, pR); ctx.clip();
  if(student.photo && !skipPhoto){
    try{
      const pImg = await loadImage(student.photo);
      ctx.drawImage(pImg, pX, pY, pW, pH);
    }catch{ drawPhotoPlaceholder(ctx, pX, pY, pW, pH); }
  } else { drawPhotoPlaceholder(ctx, pX, pY, pW, pH); }
  ctx.restore();

  // ── STUDENT NAME (below photo, centered) ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((student.name || '—').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '), W/2, pY + pH + 19);
  ctx.textAlign = 'left';

  // ── DATA FIELDS ──
  const fy = pY + pH + 28, lh = 30, lx = 16, rVal = 16;

  function field(label, value, y, color){
    ctx.fillStyle = 'rgba(0,212,255,0.55)';
    ctx.font = '9px Rajdhani, sans-serif';
    ctx.fillText(label, lx, y);
    ctx.fillStyle = color || 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 14px Rajdhani, sans-serif';
    ctx.fillText(value, lx, y + 13);
    // subtle underline
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(lx, y+18); ctx.lineTo(W-lx, y+18); ctx.stroke();
  }

  field('STUDENT ID',  studentId, fy,       '#00d4ff');
  field('CLASS',       className, fy+lh,    '#ffffff');
  field('BOARD',       board === 'CBSE' ? 'CBSE — Central Board' : 'BSEB — Bihar Board', fy+lh*2, board==='CBSE'?'#00c896':'#4d9fff');
  field('ROLL NO.',    String(roll),   fy+lh*3, '#a78bfa');
  field('SESSION',     session,        fy+lh*4, '#ffffff');

  // ── VALID TILL badge ──
  if(validTill){
    const vy = fy + lh*5 + 4;
    ctx.fillStyle = 'rgba(0,212,255,0.1)';
    ctx.strokeStyle = 'rgba(0,212,255,0.5)'; ctx.lineWidth=1;
    _roundRect(ctx, lx, vy, W-lx*2, 22, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(validTill, W/2, vy+15);
    ctx.textAlign = 'left';
  }

  // ── BOTTOM STRIP ──
  ctx.fillStyle = 'rgba(0,212,255,0.04)';
  ctx.fillRect(0, H-42, W, 38);
  ctx.strokeStyle = 'rgba(0,212,255,0.15)'; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.moveTo(0,H-42); ctx.lineTo(W,H-42); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '9px Arial, sans-serif';
  ctx.fillText('📞 ' + instPhone, lx, H-26);
  ctx.fillText('🌐 bcibuxar.netlify.app', lx, H-12);

  // ── Left accent bar ──
  const leftBar = ctx.createLinearGradient(0, 80, 0, H-40);
  leftBar.addColorStop(0, 'rgba(0,212,255,0.4)');
  leftBar.addColorStop(0.5, 'rgba(139,92,246,0.4)');
  leftBar.addColorStop(1, 'rgba(0,212,255,0.1)');
  ctx.fillStyle = leftBar;
  ctx.fillRect(0, 80, 3, H-120);

  // ── Watermark ──
  ctx.save();
  ctx.globalAlpha=0.035; ctx.fillStyle='#00d4ff';
  ctx.font='bold 64px Rajdhani, sans-serif';
  ctx.textAlign='center';
  ctx.fillText(instShort, W/2, H/2+20);
  ctx.restore(); ctx.textAlign='left';
}

function drawLogoFallback(ctx, x, y, size, text){
  ctx.fillStyle='rgba(0,212,255,0.15)';
  ctx.beginPath(); ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,212,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#00d4ff'; ctx.font='bold 14px Rajdhani,sans-serif';
  ctx.textAlign='center'; ctx.fillText(text,x+size/2,y+size/2+5); ctx.textAlign='left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for(let w of words){
    const test = line + w + ' ';
    if(ctx.measureText(test).width > maxWidth && line){
      ctx.fillText(line.trim(), x, lineY);
      line = w + ' ';
      lineY += lineHeight;
    } else { line = test; }
  }
  ctx.fillText(line.trim(), x, lineY);
}
function drawPhotoPlaceholder(ctx, x, y, w, h){
  ctx.fillStyle = 'rgba(0,212,255,0.06)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,212,255,0.3)';
  ctx.font = '52px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('👤', x + w/2, y + h/2 + 18);
  ctx.textAlign = 'left';
}

function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = ()=> resolve(img);
    img.onerror = ()=> reject();
    img.src = src;
  });
}

function downloadIdCard(){
  const canvas = document.getElementById('id-card-canvas');
  if(!canvas) return;
  const student = AppState.currentUser;
  const name = (student?.name||'student').replace(/\s+/g,'-').toLowerCase();
  const link = document.createElement('a');
  link.download = `BCI-ID-${name}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function shareIdCard(){
  const canvas = document.getElementById('id-card-canvas');
  if(!canvas) return;
  try{
    // Convert canvas to blob — use dataURL fallback for Android browsers
    // where toBlob() may return null
    let blob;
    try{
      blob = await new Promise((res, rej) => {
        canvas.toBlob(b => {
          if(b) res(b);
          else rej(new Error('toBlob returned null'));
        }, 'image/png');
      });
    } catch {
      // Fallback: convert dataURL to blob manually
      const dataUrl = canvas.toDataURL('image/png');
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) u8arr[n] = bstr.charCodeAt(n);
      blob = new Blob([u8arr], {type: mime});
    }

    const file = new File([blob], 'BCI-Student-ID.png', {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({
        title: 'My BCI Student ID Card',
        text: 'My Student ID Card — Brilliant Coaching Institute, Buxar',
        files: [file]
      });
    } else {
      downloadIdCard();
      showToast('Sharing not supported — downloaded instead.','info',3000);
    }
  }catch(e){
    if(e.name!=='AbortError') showToast('Could not share. Try downloading instead.','warning',3000);
  }
}

// =============================================================
// ADMIN LEADERBOARD
// =============================================================
const ALb = { tab:'month', month:new Date(), sessionId:null, allSessions:[], data:[] };

function aLbSwitchCategory(cat){
  const att=document.getElementById('alb-cat-attendance');
  const exam=document.getElementById('alb-cat-exam');
  const attP=document.getElementById('alb-panel-attendance');
  const examP=document.getElementById('alb-panel-exam');
  if(cat==='attendance'){
    att.style.cssText='padding:12px 20px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:var(--fs-base);cursor:pointer;color:var(--neon-blue);border-bottom:3px solid var(--neon-blue);margin-bottom:-2px;transition:all 0.15s;';
    exam.style.cssText='padding:12px 20px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:var(--fs-base);cursor:pointer;color:var(--text-dim);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.15s;position:relative;';
    attP.classList.remove('hidden'); examP.classList.add('hidden');
  } else {
    exam.style.cssText='padding:12px 20px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:var(--fs-base);cursor:pointer;color:#ffaa00;border-bottom:3px solid #ffaa00;margin-bottom:-2px;transition:all 0.15s;position:relative;';
    att.style.cssText='padding:12px 20px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:var(--fs-base);cursor:pointer;color:var(--text-dim);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.15s;';
    examP.classList.remove('hidden'); attP.classList.add('hidden');
  }
}

async function initAdminLeaderboard(){
  // Load sessions
  const sel=document.getElementById('alb-session-select');
  try{
    const snap=await db.collection('sessions').orderBy('createdAt','desc').get();
    ALb.allSessions=[];
    snap.forEach(doc=>ALb.allSessions.push({id:doc.id,...doc.data()}));
    if(sel){
      sel.innerHTML=ALb.allSessions.map(s=>
        `<option value="${s.id}"${s.isActive?' selected':''}>${s.id}${s.isActive?' (Active)':''}</option>`
      ).join('');
      ALb.sessionId=sel.value;
    }
  }catch(e){ console.error('initAdminLeaderboard sessions:',e); }
  // Load class filter
  const cf=document.getElementById('alb-class-filter');
  if(cf){
    try{
      const snap=await db.collection('classes').orderBy('order').get();
      cf.innerHTML='<option value="">All Classes</option>';
      snap.forEach(doc=>{
        const d=doc.data();
        const o=document.createElement('option');
        o.value=doc.id; o.textContent=`${d.board||'BSEB'} ${d.name}`;
        cf.appendChild(o);
      });
    }catch(e){}
  }
  ALb.month=new Date();
  aLbUpdateMonthLabel();
  aLbSwitchTab('month');
  aLbLoad();
}

function aLbSwitchTab(tab){
  ALb.tab=tab;
  const m=document.getElementById('alb-tab-month');
  const o=document.getElementById('alb-tab-overall');
  const nav=document.getElementById('alb-month-nav');
  if(m){m.style.background=tab==='month'?'rgba(0,212,255,0.1)':'var(--bg-card2)';m.style.color=tab==='month'?'var(--neon-blue)':'var(--text-muted)';m.style.borderColor=tab==='month'?'var(--neon-blue)':'var(--border)';}
  if(o){o.style.background=tab==='overall'?'rgba(0,212,255,0.1)':'var(--bg-card2)';o.style.color=tab==='overall'?'var(--neon-blue)':'var(--text-muted)';o.style.borderColor=tab==='overall'?'var(--neon-blue)':'var(--border)';}
  if(nav) nav.style.display=tab==='month'?'flex':'none';
  aLbLoad();
}

function aLbChangeMonth(dir){
  const d=new Date(ALb.month); d.setMonth(d.getMonth()+dir);
  ALb.month=d; aLbUpdateMonthLabel(); aLbLoad();
}

function aLbUpdateMonthLabel(){
  const el=document.getElementById('alb-month-label');
  if(el) el.textContent=ALb.month.toLocaleString('default',{month:'long',year:'numeric'});
}

async function aLbLoad(){
  const sessionId=document.getElementById('alb-session-select')?.value||ALb.sessionId;
  ALb.sessionId=sessionId;
  const loading=document.getElementById('alb-loading');
  const content=document.getElementById('alb-content');
  const empty=document.getElementById('alb-empty');
  const emptyMsg=document.getElementById('alb-empty-msg');

  if(!sessionId){
    if(loading) loading.classList.add('hidden');
    if(empty){ empty.classList.remove('hidden'); if(emptyMsg) emptyMsg.textContent='No active session found. Please create a session first.'; }
    return;
  }

  if(loading) loading.classList.remove('hidden');
  if(content) content.classList.add('hidden');
  if(empty) empty.classList.add('hidden');

  try{
    const classSnap=await db.collection('classes').orderBy('order').get();
    const classes=[]; classSnap.forEach(doc=>classes.push({id:doc.id,...doc.data()}));
    ALb.data=[];

    if(ALb.tab==='month'){
      const y=ALb.month.getFullYear(),m=ALb.month.getMonth();
      const monthStr=`${y}-${String(m+1).padStart(2,'0')}`;
      for(const cls of classes){
        const board=(cls.board||'BSEB').toUpperCase();
        const docId=lbGetDocId(sessionId,board,cls.name,monthStr);
        try{
          const snap=await db.collection('leaderboard').doc(docId).get();
          if(snap.exists){
            (snap.data().data||[]).forEach(e=>ALb.data.push({...e,classDisplay:`${board} ${cls.name}`}));
          }
        }catch{}
      }
    } else {
      const sessData=ALb.allSessions.find(s=>s.id===sessionId);
      const sd=sessData?.startDate;
      if(!sd){
        if(loading) loading.classList.add('hidden');
        if(empty){ empty.classList.remove('hidden'); if(emptyMsg) emptyMsg.textContent='Session start date not set. Please set it in Sessions page.'; }
        return;
      }
      const months=[]; let cur=new Date(new Date(sd).getFullYear(),new Date(sd).getMonth(),1); const now=new Date();
      while(cur<=now){ months.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`); cur.setMonth(cur.getMonth()+1); }
      for(const cls of classes){
        const board=(cls.board||'BSEB').toUpperCase();
        const totals={}; let published=0;
        for(const monthStr of months){
          try{
            const snap=await db.collection('leaderboard').doc(lbGetDocId(sessionId,board,cls.name,monthStr)).get();
            if(!snap.exists) continue; published++;
            (snap.data().data||[]).forEach(e=>{
              if(!totals[e.id]) totals[e.id]={id:e.id,name:e.name,roll:e.roll||'—',pcts:[],classDisplay:`${board} ${cls.name}`};
              totals[e.id].pcts.push(e.pct);
            });
          }catch{}
        }
        if(!published) continue;
        Object.values(totals).forEach(s=>{
          const missed=published-s.pcts.length;
          const avg=Math.round((s.pcts.reduce((a,b)=>a+b,0)+missed*75)/published);
          ALb.data.push({...s,pct:avg});
        });
      }
      ALb.data.sort((a,b)=>b.pct-a.pct||a.name.localeCompare(b.name));
      let rank=1; for(let i=0;i<ALb.data.length;i++){ALb.data[i].rank=i>0&&ALb.data[i].pct===ALb.data[i-1].pct?ALb.data[i-1].rank:rank;rank++;}
    }

    if(loading) loading.classList.add('hidden');
    aLbRender();
  }catch(e){
    console.error('aLbLoad:',e);
    if(loading) loading.classList.add('hidden');
    if(empty){ empty.classList.remove('hidden'); if(emptyMsg) emptyMsg.textContent='Failed to load. Please try again.'; }
  }
}

function aLbRender(){
  const content=document.getElementById('alb-content');
  const empty=document.getElementById('alb-empty');
  const emptyMsg=document.getElementById('alb-empty-msg');
  if(!content) return;
  const classFilter=document.getElementById('alb-class-filter')?.value||'';
  const classFilterText=document.getElementById('alb-class-filter')?.options[document.getElementById('alb-class-filter')?.selectedIndex]?.textContent||'';

  let data=ALb.data.slice();
  if(ALb.tab==='month'){
    data.sort((a,b)=>b.pct-a.pct||a.name.localeCompare(b.name));
    let rank=1; for(let i=0;i<data.length;i++){data[i].rank=i>0&&data[i].pct===data[i-1].pct?data[i-1].rank:rank;rank++;}
  }
  const filtered=classFilter?data.filter(e=>e.classDisplay===classFilterText||e.classId===classFilter):data;

  if(!filtered.length){
    content.classList.add('hidden');
    empty.classList.remove('hidden');
    const now=new Date(); const next=new Date(ALb.month.getFullYear(),ALb.month.getMonth()+1,1);
    const isCurrentMonth=ALb.month.getMonth()===now.getMonth()&&ALb.month.getFullYear()===now.getFullYear();
    if(emptyMsg) emptyMsg.textContent=ALb.tab==='month'&&isCurrentMonth
      ? `${ALb.month.toLocaleString('default',{month:'long',year:'numeric'})} leaderboard will publish on 1st ${next.toLocaleString('default',{month:'long',year:'numeric'})}.`
      : 'No published data for this period.';
    return;
  }
  empty.classList.add('hidden');

  // Group by class
  const byClass={};
  filtered.forEach(e=>{ const k=e.classDisplay||e.classId; if(!byClass[k]) byClass[k]=[]; byClass[k].push(e); });

  let html='';
  if(!classFilter && filtered.length){
    html+=`<div style="margin-bottom:24px;">
      <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-md);color:var(--neon-blue);margin-bottom:10px;">🏆 Overall Top 10 — All Classes</div>
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">
        <div style="display:grid;grid-template-columns:40px 1fr 70px 44px 50px;padding:8px 10px;background:var(--bg-card2);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-dim);letter-spacing:0.5px;">
          <div>RANK</div><div>NAME</div><div style="text-align:center;">CLASS</div><div style="text-align:center;">ROLL</div><div style="text-align:right;">%</div>
        </div>
        ${filtered.slice(0,10).map(e=>aLbRowHTML(e,false)).join('')}
      </div>
    </div>`;
  }

  Object.entries(byClass).forEach(([cls,entries])=>{
    const avg=Math.round(entries.reduce((s,e)=>s+e.pct,0)/entries.length);
    html+=`<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:var(--fs-base);color:var(--text-white);">📚 ${cls}</div>
        <span style="font-size:11px;color:var(--text-dim);">${entries.length} students</span>
        <span style="font-size:11px;color:#00ff88;">Avg: ${avg}%</span>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">
        <div style="display:grid;grid-template-columns:40px 1fr 44px 50px;padding:8px 10px;background:var(--bg-card2);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-dim);letter-spacing:0.5px;">
          <div>RANK</div><div>NAME</div><div style="text-align:center;">ROLL</div><div style="text-align:right;">%</div>
        </div>
        ${entries.map(e=>aLbRowHTML(e,true)).join('')}
      </div>
    </div>`;
  });

  content.innerHTML=html;
  content.classList.remove('hidden');
}

function aLbRowHTML(entry, hideClass){
  const rankEmoji=entry.rank===1?'🥇':entry.rank===2?'🥈':entry.rank===3?'🥉':`#${entry.rank}`;
  const rankColor=entry.rank===1?'#FFD700':entry.rank===2?'#C0C0C0':entry.rank===3?'#CD7F32':'var(--text-muted)';
  const pctColor=entry.pct>=75?'#00ff88':entry.pct>=50?'#ffaa00':'#ff4466';
  const clsDisplay=entry.classDisplay||(entry.classId||'').replace(/^class-/i,'Class ');
  if(hideClass){
    return `<div style="display:grid;grid-template-columns:40px 1fr 44px 50px;padding:9px 10px;background:var(--bg-card2);border-top:1px solid rgba(30,58,95,0.4);align-items:center;">
      <div style="font-size:${entry.rank<=3?'15px':'12px'};font-weight:700;color:${rankColor};font-family:'Rajdhani',sans-serif;">${rankEmoji}</div>
      <div style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.name}</div>
      <div style="font-size:var(--fs-xs);color:var(--text-muted);text-align:center;">${entry.roll}</div>
      <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:${pctColor};font-size:var(--fs-sm);text-align:right;">${entry.pct}%</div>
    </div>`;
  }
  return `<div style="display:grid;grid-template-columns:40px 1fr 70px 44px 50px;padding:9px 10px;background:var(--bg-card2);border-top:1px solid rgba(30,58,95,0.4);align-items:center;">
    <div style="font-size:${entry.rank<=3?'15px':'12px'};font-weight:700;color:${rankColor};font-family:'Rajdhani',sans-serif;">${rankEmoji}</div>
    <div style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.name}</div>
    <div style="font-size:10px;color:var(--text-muted);text-align:center;">${clsDisplay}</div>
    <div style="font-size:var(--fs-xs);color:var(--text-muted);text-align:center;">${entry.roll}</div>
    <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:${pctColor};font-size:var(--fs-sm);text-align:right;">${entry.pct}%</div>
  </div>`;
}


// =============================================================
// ADMIN LEADERBOARD — reads published Firestore data
// Reuses lbGetDocId + sLbRowHTML from student side
// =============================================================

// =============================================================
// OPEN MATERIAL — Smart URL handler
//
// Priority logic:
//   1. Google Drive link  → extract file ID → /preview (inline, no download)
//   2. Cloudinary URL     → Google Docs Viewer (prevents download prompt)
//   3. Audio/Image/Video  → open directly (no viewer needed)
//   4. Any other URL      → Google Docs Viewer (safe default for documents)
// =============================================================

function isAudioVideoImage(url, type) {
  if (!url) return false;
  const mediaTypes = ['audio', 'video', 'image'];
  if (mediaTypes.includes((type||'').toLowerCase())) return true;
  const u = url.toLowerCase();
  return u.includes('youtube.com') || u.includes('youtu.be') ||
         u.match(/\.(mp3|mp4|wav|ogg|m4a|aac|webm|jpg|jpeg|png|gif|webp)(\?|$)/);
}

function isAudioFile(url, type) {
  if (!url) return false;
  if ((type||'').toLowerCase() === 'audio') return true;
  const u = url.toLowerCase();
  return u.match(/\.(mp3|wav|ogg|m4a|aac)(\?|$)/);
}

function openMaterial(url, title, type) {
  if (!url) return;

  // ── Case 1: Google Drive link ─────────────────────────────
  if (url.includes('drive.google.com')) {
    let fileId = null;
    const matchPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchPath) fileId = matchPath[1];
    if (!fileId) {
      const matchParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchParam) fileId = matchParam[1];
    }
    if (fileId) {
      window.open('https://drive.google.com/file/d/' + fileId + '/preview', '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // ── Case 2: Audio → custom in-app player ─────────────────
  if (isAudioFile(url, type)) {
    openAudioPlayer(url, title || 'Audio Lecture');
    return;
  }

  // ── Case 3: Image / Video / YouTube → open directly ──────
  if (isAudioVideoImage(url, type)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // ── Case 4: PDF / other document → PDF.js viewer ─────────
  openPdfViewer(url, title || 'Document');
}

// =============================================================
// PDF.js IN-APP VIEWER
// =============================================================
let _pdfDoc       = null;
let _pdfPage      = 1;
let _pdfUrl       = '';
let _pdfRendering = false;
let _pdfResizeTimer = null;

// ── Zoom & Pan State ─────────────────────────────────────────
let _pdfZoom      = 1;
const _PDF_ZOOM_MIN = 0.5;
const _PDF_ZOOM_MAX = 4;
let _pdfPanX      = 0;
let _pdfPanY      = 0;
let _pdfIsPinching = false;
let _pdfPinchStartDist = 0;

// ── Zoom Quality (Hybrid approach) ───────────────────────────
let _pdfLastRenderedZoom = 1;   // zoom level at which canvas was last rendered
let _pdfZoomRenderTimer  = null; // debounce timer for re-render after zoom settles
const _PDF_MAX_RENDER_SCALE = 5; // safe cap — prevents memory issues on low-end devices
// Base canvas CSS size (set at render time)
let _pdfBaseW = 0;
let _pdfBaseH = 0;
// Focal point for zoom (0-1 ratio of canvas)
let _pdfFocalX = 0.5;
let _pdfFocalY = 0.0;
let _pdfPinchStartZoom = 1;
let _pdfIsDragging = false;
let _pdfDragStartX = 0;
let _pdfDragStartY = 0;
let _pdfLastTap    = 0;
let _pdfPinchCenterX  = 0;   // pinch midpoint X relative to wrap
let _pdfPinchCenterY  = 0;   // pinch midpoint Y relative to wrap
let _pdfPinchStartPanX = 0;  // pan at pinch start
let _pdfPinchStartPanY = 0;

// Re-render on orientation change / window resize
window.addEventListener('resize', function() {
  if (!_pdfDoc) return;
  clearTimeout(_pdfResizeTimer);
  _pdfResizeTimer = setTimeout(function() {
    _pdfZoom = 1; _pdfPanX = 0; _pdfPanY = 0;
    _pdfApplyTransform();
    _pdfRendering = false;
    _pdfRenderPage(_pdfPage);
  }, 300);
});

// Page Visibility API — re-render when tab becomes visible again
// Handles: phone lock/unlock, tab switch, browser suspend/resume
// Canvas gets cleared by browser during suspend → re-render on resume
document.addEventListener('visibilitychange', function() {
  // Pause audio when user leaves tab/app — manual resume only
  if (document.hidden) {
    const audio = document.getElementById('bci-audio-el');
    if (audio && !audio.paused) audio.pause();
    return;
  }
  // Tab visible again — PDF canvas re-render check
  if (!_pdfDoc) return;

  // Tab is visible again — check if canvas needs re-render
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas) return;

  // Check if canvas is blank — try/catch for security errors
  let isBlank = false;
  try {
    const ctx   = canvas.getContext('2d');
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    isBlank = pixel[3] === 0;
  } catch(e) {
    isBlank = true; // assume blank if check fails — safe to re-render
  }

  if (isBlank) {
    _pdfRendering = false;
    _pdfRenderPage(_pdfPage);
  }
});

// =============================================================
// PDF RESUME — Last Viewed Page (localStorage)
// =============================================================
const _PDF_RESUME_EXPIRY_DAYS = 7;
const _PDF_RESUME_MAX_ENTRIES = 20;
const _PDF_RESUME_PREFIX      = 'bci_pdf_';

// Extract unique ID from Cloudinary URL
// Uses version + filename → changes if admin reuploads
// Get current logged-in student ID for per-student cache isolation
// Returns student doc ID (e.g. 2627-BSEB-10-001) or 'guest' if not logged in
function _getStudentCacheId() {
  try {
    const id = window.AppState && AppState.currentUser && AppState.currentUser.id;
    return id ? String(id).replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest';
  } catch(e) { return 'guest'; }
}

function _pdfGetId(url) {
  try {
    // Extract version (v1234567) and filename from Cloudinary URL
    const vMatch = url.match(/\/(v\d+)\//);
    const fMatch = url.match(/\/([^\/]+\.pdf)/i);
    const version  = vMatch ? vMatch[1] : '';
    const filename = fMatch ? fMatch[1] : url.slice(-20);
    const fileKey  = (version + '_' + filename).replace(/[^a-zA-Z0-9_]/g, '_');
    // Include student ID — prevents cross-student cache pollution on shared browser
    return _getStudentCacheId() + '_' + fileKey;
  } catch(e) { return null; }
}

// Save last viewed page (debounced — called on page change)
function _pdfResumeSave(url, page) {
  try {
    const id = _pdfGetId(url);
    if (!id) return;
    const data = JSON.stringify({ page: page, savedAt: Date.now() });
    localStorage.setItem(_PDF_RESUME_PREFIX + id, data);
    _pdfResumeCleanup(); // keep storage clean
  } catch(e) { /* silent — incognito or storage full */ }
}

// Load saved page — returns page number or 1 (fallback)
function _pdfResumeLoad(url, totalPages) {
  try {
    const id = _pdfGetId(url);
    if (!id) return 1;
    const raw = localStorage.getItem(_PDF_RESUME_PREFIX + id);
    if (!raw) return 1;
    const data = JSON.parse(raw);
    // Check expiry (7 days)
    const ageMs  = Date.now() - (data.savedAt || 0);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > _PDF_RESUME_EXPIRY_DAYS) {
      localStorage.removeItem(_PDF_RESUME_PREFIX + id); // expired → delete
      return 1;
    }
    // Validate page number against current PDF
    const page = parseInt(data.page, 10);
    if (!page || page < 1 || page > totalPages) return 1; // invalid → fresh start
    return page;
  } catch(e) { return 1; /* any error → fresh start, no crash */ }
}

// Auto cleanup — remove expired + keep max 20 entries
function _pdfResumeCleanup() {
  try {
    const now      = Date.now();
    const expiryMs = _PDF_RESUME_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const entries  = [];

    // Collect all bci_pdf_ entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(_PDF_RESUME_PREFIX)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (now - (data.savedAt || 0) > expiryMs) {
          localStorage.removeItem(key); // expired → delete immediately
        } else {
          entries.push({ key, savedAt: data.savedAt || 0 });
        }
      } catch(e) { localStorage.removeItem(key); } // corrupt → delete
    }

    // If still over max limit → delete oldest first
    if (entries.length > _PDF_RESUME_MAX_ENTRIES) {
      entries.sort(function(a,b) { return a.savedAt - b.savedAt; }); // oldest first
      const toDelete = entries.slice(0, entries.length - _PDF_RESUME_MAX_ENTRIES);
      toDelete.forEach(function(e) { localStorage.removeItem(e.key); });
    }
  } catch(e) { /* silent */ }
}

function openPdfViewer(url, title) {
  _pdfUrl  = url;
  _pdfPage = 1;
  _pdfDoc  = null;
  _pdfRendering = false;

  // Show modal
  const modal = document.getElementById('modal-pdf-viewer');
  if (!modal) {
    console.error('[PDF Viewer] Modal element not found in DOM');
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  modal.style.display = 'flex';

  // Push history state so Android back button closes viewer instead of navigating
  history.pushState({ pdfViewer: true }, '', location.href);
  document.body.style.overflow = 'hidden';

  // Set title
  document.getElementById('pdf-viewer-title').textContent = title || 'Document';

  // Show loading, hide others
  _pdfSetState('loading');

  if (!window.pdfjsLib) {
    _pdfSetState('error', 'PDF viewer not loaded. Please refresh and try again.');
    return;
  }

  // Streaming approach — PDF.js loads only what's needed per page
  // rangeChunkSize: 256KB chunks — fewer round trips, faster for small+medium files
  // disableStream: false — enables progressive loading
  // disableAutoFetch: true — disable background prefetch (reduces unnecessary requests)
  // getDocument() called ONCE per file open (friend's rule ✅)
  // URL never opened directly in browser — PDF.js handles internally (no download popup ✅)
  pdfjsLib.getDocument({
    url: url,
    rangeChunkSize: 262144,
    disableStream: false,
    disableAutoFetch: true,  // faster initial load — pages fetched on demand only
    withCredentials: false
  }).promise
    .then(function(pdf) {
      _pdfDoc = pdf;

      // Resume last viewed page (safe — fallback to 1 on any issue)
      const resumePage = _pdfResumeLoad(url, pdf.numPages);
      _pdfPage = resumePage;

      _pdfUpdatePageUI();
      _pdfSetState('canvas');
      _pdfInitTouchHandlers();
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          _pdfResetZoom();
          _pdfRenderPage(_pdfPage);
        });
      });
    })
    .catch(function(err) {
      console.error('[PDF Viewer] Error:', err);
      _pdfSetState('error', 'Failed to load file. Try downloading it instead.');
    });
}

function _pdfSetState(state, msg) {
  document.getElementById('pdf-loading').style.display     = state === 'loading' ? 'flex' : 'none';
  document.getElementById('pdf-error').style.display       = state === 'error'   ? 'flex' : 'none';
  document.getElementById('pdf-canvas-wrap').style.display = state === 'canvas'  ? 'flex' : 'none';
  // Show/hide bottom nav arrows with canvas
  const nav = document.getElementById('pdf-bottom-nav');
  if (nav) nav.style.display = state === 'canvas' ? 'block' : 'none';
  if (state === 'error' && msg) {
    document.getElementById('pdf-error-msg').textContent = msg;
  }
}

// ── Central page update — keeps all UI in sync ───────────────
function _pdfUpdatePageUI() {
  if (!_pdfDoc) return;
  const info = document.getElementById('pdf-page-info');
  if (info) info.textContent = 'Page ' + _pdfPage + ' / ' + _pdfDoc.numPages;
  // Dim prev/next arrows at boundaries
  const prev = document.getElementById('pdf-btn-prev');
  const next = document.getElementById('pdf-btn-next');
  if (prev) prev.style.opacity = _pdfPage <= 1 ? '0.3' : '1';
  if (next) next.style.opacity = _pdfPage >= _pdfDoc.numPages ? '0.3' : '1';
}

function _pdfRenderPage(pageNum) {
  if (!_pdfDoc || _pdfRendering) return;
  _pdfRendering = true;

  _pdfDoc.getPage(pageNum).then(function(page) {
    const canvas = document.getElementById('pdf-canvas');
    if (!canvas) { _pdfRendering = false; return; } // safety — canvas missing
    const ctx    = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const modal  = document.getElementById('modal-pdf-viewer');
    const freshW = modal ? modal.clientWidth : window.innerWidth;
    const maxW   = Math.min(freshW - 16, 900);
    const baseVP = page.getViewport({ scale: 1 });

    const fitScale    = maxW / baseVP.width;
    const MIN_SCALE   = 1.5;
    const renderScale = Math.max(fitScale, MIN_SCALE) * dpr;
    const displayScale = fitScale;

    const viewport = page.getViewport({ scale: renderScale });

    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width  = (baseVP.width  * displayScale) + 'px';
    canvas.style.height = (baseVP.height * displayScale) + 'px';

    page.render({
      canvasContext: ctx,
      viewport: viewport,
      intent: 'display'
    }).promise.then(function() {
      _pdfRendering = false;
      _pdfBaseW = parseFloat(canvas.style.width)  || canvas.offsetWidth;
      _pdfBaseH = parseFloat(canvas.style.height) || canvas.offsetHeight;
      _pdfResetZoom();

      // Preload adjacent pages into PDF.js internal cache
      // Makes next/prev navigation near-instant (cached → no re-fetch)
      // Only ±1 page — controlled bandwidth & memory usage
      if (_pdfDoc) {
        if (_pdfPage > 1)                _pdfDoc.getPage(_pdfPage - 1); // prev
        if (_pdfPage < _pdfDoc.numPages) _pdfDoc.getPage(_pdfPage + 1); // next
      }
    });
  }).catch(function(err) {
    _pdfRendering = false;
    console.error('[PDF Viewer] Render error:', err);
  });
}

// ── Zoom quality re-render ────────────────────────────────────
// Called after zoom settles (debounced 250ms)
// Re-renders current page at new zoom scale for sharp output
// Active render task reference — used to cancel if zoom changes again
let _pdfActiveRenderTask = null;

function _pdfZoomRerender() {
  if (!_pdfDoc) return;
  // Only re-render if zoom changed significantly
  if (Math.abs(_pdfZoom - _pdfLastRenderedZoom) < 0.3) return;

  const oldCanvas = document.getElementById('pdf-canvas');
  const wrap      = document.getElementById('pdf-canvas-wrap');
  const modal     = document.getElementById('modal-pdf-viewer');
  if (!oldCanvas || !wrap || !modal) return;

  // Cancel any in-progress render (user zoomed again)
  if (_pdfActiveRenderTask) {
    try { _pdfActiveRenderTask.cancel(); } catch(e) {}
    _pdfActiveRenderTask = null;
  }

  const dpr        = Math.min(window.devicePixelRatio || 1, 2);
  const freshW     = modal.clientWidth;
  const maxW       = Math.min(freshW - 16, 900);
  const targetZoom = _pdfZoom; // capture zoom at this moment

  _pdfDoc.getPage(_pdfPage).then(function(page) {
    // If zoom changed again while fetching page — abort
    if (targetZoom !== _pdfZoom) return;

    const baseVP      = page.getViewport({ scale: 1 });
    const fitScale    = maxW / baseVP.width;
    const baseRender  = Math.max(fitScale, 1.5) * dpr;
    const zoomedScale = Math.min(baseRender * targetZoom, _PDF_MAX_RENDER_SCALE);
    const viewport    = page.getViewport({ scale: zoomedScale });

    // ── Double buffer: render on hidden canvas ────────────────
    const offscreen = document.createElement('canvas');
    offscreen.width  = viewport.width;
    offscreen.height = viewport.height;
    // CSS display size = zoomed size
    offscreen.style.display      = 'block';
    offscreen.style.marginLeft   = oldCanvas.style.marginLeft;
    offscreen.style.marginRight  = oldCanvas.style.marginRight;
    offscreen.style.width        = (_pdfBaseW * targetZoom) + 'px';
    offscreen.style.height       = (_pdfBaseH * targetZoom) + 'px';
    offscreen.style.imageRendering = 'auto';
    offscreen.style.borderRadius = '4px';
    offscreen.style.background   = '#fff';
    offscreen.style.boxShadow    = '0 4px 32px rgba(0,0,0,0.6)';

    // Save scroll before swap
    const savedLeft = wrap.scrollLeft;
    const savedTop  = wrap.scrollTop;

    const ctx = offscreen.getContext('2d');
    _pdfActiveRenderTask = page.render({
      canvasContext: ctx,
      viewport: viewport,
      intent: 'display'
    });

    _pdfActiveRenderTask.promise.then(function() {
      _pdfActiveRenderTask = null;
      // If zoom changed during render — discard, don't swap
      if (targetZoom !== _pdfZoom) return;

      // ── Instant swap: old canvas out, new canvas in ───────
      offscreen.id = 'pdf-canvas';
      wrap.insertBefore(offscreen, oldCanvas);
      wrap.removeChild(oldCanvas); // remove old immediately after swap

      _pdfLastRenderedZoom = targetZoom;
      // Restore scroll
      wrap.scrollLeft = savedLeft;
      wrap.scrollTop  = savedTop;

    }).catch(function(err) {
      _pdfActiveRenderTask = null;
      // Render was cancelled — silent, old canvas still visible ✅
    });
  });
}

function pdfNextPage() {
  if (!_pdfDoc || _pdfPage >= _pdfDoc.numPages) return;
  _pdfPage++;
  _pdfUpdatePageUI();
  _pdfResumeSave(_pdfUrl, _pdfPage); // save last viewed page
  _pdfResetZoom();
  _pdfRenderPage(_pdfPage);
}

function pdfPrevPage() {
  if (!_pdfDoc || _pdfPage <= 1) return;
  _pdfPage--;
  _pdfUpdatePageUI();
  _pdfResumeSave(_pdfUrl, _pdfPage); // save last viewed page
  _pdfResetZoom();
  _pdfRenderPage(_pdfPage);
}

// ── Page selector open/close/select ─────────────────────────
function pdfOpenPageSelector() {
  if (!_pdfDoc) return;
  const overlay = document.getElementById('pdf-page-selector');
  const grid    = document.getElementById('pdf-page-grid');
  if (!overlay || !grid) return;

  // Build page number grid
  const total = _pdfDoc.numPages;
  let html = '';
  for (let i = 1; i <= total; i++) {
    const isCurrent = i === _pdfPage;
    html += `<button onclick="pdfGoToPage(${i})"
      style="background:${isCurrent ? 'var(--neon-blue,#00d4ff)' : 'var(--bg-card2,#252540)'};
      color:${isCurrent ? '#000' : 'var(--text-white,#fff)'};
      border:1px solid ${isCurrent ? 'var(--neon-blue,#00d4ff)' : 'var(--border,#333)'};
      border-radius:6px; padding:8px 4px; font-size:13px; font-weight:${isCurrent ? '700' : '400'};
      cursor:pointer; width:100%;">${i}</button>`;
  }
  grid.innerHTML = html;

  // Scroll current page into view
  overlay.style.display = 'flex';
  // After render, scroll highlighted button into view
  requestAnimationFrame(function() {
    const active = grid.querySelector('button[style*="color:#000"]');
    if (active) active.scrollIntoView({ block: 'center' });
  });
}

function pdfClosePageSelector() {
  const overlay = document.getElementById('pdf-page-selector');
  if (overlay) overlay.style.display = 'none';
}

function pdfGoToPage(pageNum) {
  if (!_pdfDoc || pageNum < 1 || pageNum > _pdfDoc.numPages) return;
  pdfClosePageSelector();
  _pdfPage = pageNum;
  _pdfUpdatePageUI();
  _pdfResumeSave(_pdfUrl, _pdfPage); // save last viewed page
  _pdfResetZoom();
  _pdfRenderPage(_pdfPage);
}

function pdfDownload() {
  if (!_pdfUrl) return;
  const a = document.createElement('a');
  a.href = _pdfUrl;
  a.download = document.getElementById('pdf-viewer-title').textContent || 'document.pdf';
  a.target = '_blank';
  a.click();
}

function closePdfViewer() {
  const modal = document.getElementById('modal-pdf-viewer');
  modal.style.display = 'none';
  document.body.style.overflow = '';

  // Cancel any in-progress zoom re-render
  if (_pdfActiveRenderTask) {
    try { _pdfActiveRenderTask.cancel(); } catch(e) {}
    _pdfActiveRenderTask = null;
  }
  clearTimeout(_pdfZoomRenderTimer);

  _pdfDoc       = null;
  _pdfUrl       = '';
  _pdfPage      = 1;
  _pdfZoom      = 1;
  _pdfPanX      = 0;
  _pdfPanY      = 0;
  _pdfBaseW     = 0;
  _pdfBaseH     = 0;
  _pdfRendering = false;
  _pdfFocalX    = 0.5;
  _pdfFocalY    = 0.0;
  _pdfLastRenderedZoom = 1;
  _pdfIsPinching = false;
  _pdfIsDragging = false;
  clearTimeout(_pdfResizeTimer);

  // Hide page selector and bottom nav
  const sel = document.getElementById('pdf-page-selector');
  if (sel) sel.style.display = 'none';
  const nav = document.getElementById('pdf-bottom-nav');
  if (nav) nav.style.display = 'none';
  const canvas = document.getElementById('pdf-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.transform = '';
  }
}

// ── Apply zoom to canvas (scroll handles pan natively) ───────

function _pdfApplyTransform() {
  const canvas = document.getElementById('pdf-canvas');
  const wrap   = document.getElementById('pdf-canvas-wrap');
  if (!canvas || !_pdfBaseW) return;

  const oldZoomedW = _pdfBaseW * (_pdfZoom / (_pdfZoom)); // = _pdfBaseW (before)
  // Actually we need old canvas size BEFORE this call
  const oldW = parseFloat(canvas.style.width)  || _pdfBaseW;
  const oldH = parseFloat(canvas.style.height) || _pdfBaseH;

  const newZoomedW = _pdfBaseW * _pdfZoom;
  const newZoomedH = _pdfBaseH * _pdfZoom;

  // Point on canvas that should stay fixed (in px, old size)
  const focalPxX = _pdfFocalX * oldW;
  const focalPxY = _pdfFocalY * oldH;

  // Where that point was on screen (relative to wrap)
  const screenX = focalPxX - (wrap ? wrap.scrollLeft : 0);
  const screenY = focalPxY - (wrap ? wrap.scrollTop  : 0);

  // Update canvas size
  canvas.style.width  = newZoomedW + 'px';
  canvas.style.height = newZoomedH + 'px';

  // Center horizontally if canvas narrower than wrap
  if (wrap && newZoomedW <= wrap.clientWidth) {
    canvas.style.marginLeft  = 'auto';
    canvas.style.marginRight = 'auto';
  } else {
    canvas.style.marginLeft  = '0';
    canvas.style.marginRight = '0';
  }

  canvas.style.transform = 'none';

  // Adjust scroll so focal point stays at same screen position
  if (wrap) {
    // Where focal point is now (new size)
    const newFocalPxX = _pdfFocalX * newZoomedW;
    const newFocalPxY = _pdfFocalY * newZoomedH;
    wrap.scrollLeft = newFocalPxX - screenX;
    wrap.scrollTop  = newFocalPxY - screenY;
  }

  // Update zoom indicator
  const ind = document.getElementById('pdf-zoom-ind');
  if (ind) ind.textContent = Math.round(_pdfZoom * 100) + '%';

  // Debounced re-render for sharpness (friend's hybrid approach)
  // During zoom: CSS resize only (smooth, no lag)
  // After zoom settles 250ms: re-render at new scale (sharp) ✅
  clearTimeout(_pdfZoomRenderTimer);
  _pdfZoomRenderTimer = setTimeout(_pdfZoomRerender, 250);
}

// ── Reset zoom (page change / orientation change) ─────────────
function _pdfResetZoom() {
  _pdfZoom = 1;
  _pdfPanX = 0;
  _pdfPanY = 0;
  _pdfLastRenderedZoom = 1; // reset so next zoom triggers re-render
  clearTimeout(_pdfZoomRenderTimer); // cancel any pending zoom re-render
  _pdfApplyTransform();
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (wrap) { wrap.scrollTop = 0; wrap.scrollLeft = 0; }
}

// ── Zoom In / Out buttons ─────────────────────────────────────
function pdfZoomIn() {
  // Zoom from center of visible area
  _pdfFocalX = 0.5; _pdfFocalY = 0.5;
  _pdfZoom = Math.min(_pdfZoom * 1.3, _PDF_ZOOM_MAX);
  _pdfApplyTransform();
}
function pdfZoomOut() {
  _pdfFocalX = 0.5; _pdfFocalY = 0.5;
  _pdfZoom = Math.max(_pdfZoom / 1.3, _PDF_ZOOM_MIN);
  if (_pdfZoom < 1.05) { _pdfZoom = 1; }
  _pdfApplyTransform();
}

// ── Pinch zoom + pan touch handler ───────────────────────────
function _pdfInitTouchHandlers() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap || wrap._pdfTouchBound) return;
  wrap._pdfTouchBound = true;

  // ── PINCH ZOOM ───────────────────────────────────────────
  wrap.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      _pdfIsPinching = true;
      _pdfIsDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _pdfPinchStartDist = Math.sqrt(dx*dx + dy*dy);
      _pdfPinchStartZoom = _pdfZoom;
      // Pinch midpoint relative to canvas → convert to % for transformOrigin
      const canvas = document.getElementById('pdf-canvas');
      const cRect  = canvas ? canvas.getBoundingClientRect() : wrap.getBoundingClientRect();
      const midX   = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY   = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // Clamp to 0-100%
      _pdfZoomOriginX = Math.min(100, Math.max(0, ((midX - cRect.left) / cRect.width)  * 100));
      _pdfZoomOriginY = Math.min(100, Math.max(0, ((midY - cRect.top)  / cRect.height) * 100));
      e.preventDefault();
    } else if (e.touches.length === 1) {
      _pdfIsDragging = true;
      _pdfIsPinching = false;
      _pdfDragStartX = e.touches[0].clientX - _pdfPanX;
      _pdfDragStartY = e.touches[0].clientY - _pdfPanY;
      // Double tap detection
      const now = Date.now();
      if (now - _pdfLastTap < 280) {
        if (_pdfZoom > 1.05) {
          // Reset zoom — back to center
          _pdfZoomOriginX = 50;
          _pdfZoomOriginY = 0;
          _pdfResetZoom();
        } else {
          // Zoom 2x from tap position
          const canvas = document.getElementById('pdf-canvas');
          const cRect  = canvas ? canvas.getBoundingClientRect() : wrap.getBoundingClientRect();
          _pdfFocalX = Math.min(1, Math.max(0, (e.touches[0].clientX - cRect.left) / cRect.width));
          _pdfFocalY = Math.min(1, Math.max(0, (e.touches[0].clientY - cRect.top)  / cRect.height));
          _pdfZoom = 2;
          _pdfApplyTransform();
        }
        _pdfLastTap = 0;
        e.preventDefault();
        return;
      }
      _pdfLastTap = now;
    }
  }, { passive: false });

  wrap.addEventListener('touchmove', function(e) {
    if (_pdfIsPinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist    = Math.sqrt(dx*dx + dy*dy);
      const newZoom = Math.min(Math.max(_pdfPinchStartZoom * (dist / _pdfPinchStartDist), _PDF_ZOOM_MIN), _PDF_ZOOM_MAX);

      // Set focal point = pinch midpoint as ratio of current canvas size
      const canvas  = document.getElementById('pdf-canvas');
      const cRect   = canvas ? canvas.getBoundingClientRect() : null;
      if (cRect && cRect.width > 0) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        _pdfFocalX = Math.min(1, Math.max(0, (midX - cRect.left) / cRect.width));
        _pdfFocalY = Math.min(1, Math.max(0, (midY - cRect.top)  / cRect.height));
      }

      _pdfZoom = newZoom;
      _pdfApplyTransform();
      e.preventDefault();
    }
    // Single finger drag → native scroll handles it
  }, { passive: false });

  wrap.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) _pdfIsPinching = false;
    if (e.touches.length === 0) {
      _pdfIsDragging = false;
      // Snap zoom back if below min
      if (_pdfZoom < _PDF_ZOOM_MIN) {
        _pdfZoom = _PDF_ZOOM_MIN;
        _pdfApplyTransform();
      }
    }
  }, { passive: true });
}


// =============================================================
// CUSTOM AUDIO PLAYER
// =============================================================
let _audioUrl         = '';
let _audioTitle       = '';
let _audioDeliveryUrl = ''; // compressed/optimized URL used for playback & download
let _audioDragging = false; // true while finger/mouse drags seekbar

// =============================================================
// MINI AUDIO PLAYER
// =============================================================
let _audioMiniOpen = false; // panel expanded or collapsed

function audioMinimize() {
  const modal = document.getElementById('modal-audio-player');
  if (modal) modal.style.display = 'none';
  // Only restore body scroll if PDF viewer is also not open
  const pdfOpen = document.getElementById('modal-pdf-viewer');
  if (!pdfOpen || pdfOpen.style.display !== 'flex') {
    document.body.style.overflow = '';
  }
  _audioShowMiniTab();
  _audioMiniOpen = false;
}

function _audioShowMiniTab() {
  const tab   = document.getElementById('audio-mini-tab');
  const panel = document.getElementById('audio-mini-panel');
  const title = document.getElementById('audio-mini-title');
  const arrow = document.getElementById('audio-mini-arrow');
  if (tab)   tab.style.display   = 'flex';
  if (panel) panel.style.display = 'block';
  if (title) title.textContent   = _audioTitle || 'Audio';
  if (arrow) arrow.style.transform = 'rotate(0deg)'; // always ◀ on fresh show
  _audioMiniOpen = false; // start collapsed
  _audioMiniSyncBtn();
}

function _audioHideMiniPlayer() {
  const tab   = document.getElementById('audio-mini-tab');
  const panel = document.getElementById('audio-mini-panel');
  if (tab)   tab.style.display   = 'none';
  if (panel) {
    panel.style.display   = 'none';
    panel.style.transform = 'translateY(-50%) translateX(calc(100% + 54px))';
  }
  _audioMiniOpen = false;
}

function audioToggleMini() {
  _audioMiniOpen = !_audioMiniOpen;
  const panel = document.getElementById('audio-mini-panel');
  const arrow = document.getElementById('audio-mini-arrow');
  if (!panel) return;
  if (_audioMiniOpen) {
    // Slide panel into view — stops just left of arrow tab
    panel.style.transform = 'translateY(-50%) translateX(0)';
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    // Slide panel out to right
    panel.style.transform = 'translateY(-50%) translateX(calc(100% + 54px))';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
}

function audioExpandFull() {
  // Hide mini panel (keep tab hidden too until re-minimized)
  const panel = document.getElementById('audio-mini-panel');
  const tab   = document.getElementById('audio-mini-tab');
  if (panel) {
    panel.style.transform = 'translateY(-50%) translateX(calc(100% + 54px))';
    panel.style.display   = 'none';
  }
  if (tab) tab.style.display = 'none';
  _audioMiniOpen = false;

  // Open full player — z-index:11000 so it sits above PDF viewer (9999)
  const modal = document.getElementById('modal-audio-player');
  if (modal) modal.style.display = 'flex';
  // Don't set body overflow hidden if PDF is open — PDF manages its own scroll
  const pdfOpen = document.getElementById('modal-pdf-viewer');
  if (!pdfOpen || pdfOpen.style.display !== 'flex') {
    document.body.style.overflow = 'hidden';
  }
  history.pushState({ audioPlayer: true }, '', location.href);
}

// Keep mini play button in sync with audio state
function _audioMiniSyncBtn() {
  const audio = document.getElementById('bci-audio-el');
  const btn   = document.getElementById('audio-mini-play-btn');
  if (!btn) return;
  const playing = audio && !audio.paused;
  btn.textContent = playing ? '⏸' : '▶';
}

// =============================================================
// AUDIO RESUME — Last Position (localStorage)
// Same logic as PDF resume: 7 day expiry, max 20 entries
// =============================================================
const _AUD_RESUME_PREFIX      = 'bci_aud_';
const _AUD_RESUME_EXPIRY_DAYS = 7;
const _AUD_RESUME_MAX_ENTRIES = 20;
let   _audResumeTimer         = null; // debounce timer

// Extract unique ID from Cloudinary URL (same as PDF)
function _audGetId(url) {
  try {
    const vMatch = url.match(/\/(v\d+)\//);
    const fMatch = url.match(/\/([^\/]+\.(mp3|wav|ogg|m4a|aac))(\?|$)/i);
    const version  = vMatch ? vMatch[1] : '';
    const filename = fMatch ? fMatch[1] : url.slice(-20);
    const fileKey  = (version + '_' + filename).replace(/[^a-zA-Z0-9_]/g, '_');
    // Include student ID — prevents cross-student cache pollution on shared browser
    return _getStudentCacheId() + '_' + fileKey;
  } catch(e) { return null; }
}

// Save current position (debounced 2s — not on every timeupdate)
function _audResumeSave(url, currentTime) {
  clearTimeout(_audResumeTimer);
  _audResumeTimer = setTimeout(function() {
    try {
      const id = _audGetId(url);
      if (!id) return;
      localStorage.setItem(_AUD_RESUME_PREFIX + id,
        JSON.stringify({ time: Math.floor(currentTime), savedAt: Date.now() })
      );
      _audResumeCleanup();
    } catch(e) { /* silent — incognito or storage full */ }
  }, 2000);
}

// Load saved position — returns seconds or 0 (fallback)
function _audResumeLoad(url) {
  try {
    const id  = _audGetId(url);
    if (!id) return 0;
    const raw = localStorage.getItem(_AUD_RESUME_PREFIX + id);
    if (!raw) return 0;
    const data    = JSON.parse(raw);
    const ageDays = (Date.now() - (data.savedAt || 0)) / (1000 * 60 * 60 * 24);
    if (ageDays > _AUD_RESUME_EXPIRY_DAYS) {
      localStorage.removeItem(_AUD_RESUME_PREFIX + id);
      return 0; // expired → start from beginning
    }
    return parseFloat(data.time) || 0;
  } catch(e) { return 0; /* any error → start from 0, no crash */ }
}

// Clear saved position when audio ends (no need to resume a finished audio)
function _audResumeClear(url) {
  try {
    const id = _audGetId(url);
    if (id) localStorage.removeItem(_AUD_RESUME_PREFIX + id);
  } catch(e) {}
}

// Auto cleanup — remove expired + keep max 20 entries
function _audResumeCleanup() {
  try {
    const now      = Date.now();
    const expiryMs = _AUD_RESUME_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const entries  = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(_AUD_RESUME_PREFIX)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (now - (data.savedAt || 0) > expiryMs) {
          localStorage.removeItem(key);
        } else {
          entries.push({ key, savedAt: data.savedAt || 0 });
        }
      } catch(e) { localStorage.removeItem(key); }
    }
    if (entries.length > _AUD_RESUME_MAX_ENTRIES) {
      entries.sort(function(a,b) { return a.savedAt - b.savedAt; });
      entries.slice(0, entries.length - _AUD_RESUME_MAX_ENTRIES)
             .forEach(function(e) { localStorage.removeItem(e.key); });
    }
  } catch(e) {}
}

// ── Audio loader hide helper ───────────────────────────────
// Enforces minimum 300ms visibility to prevent flicker on fast loads
// Called by: canplay, play, error events and 6s safety timeout
function _audioHideLoader() {
  clearTimeout(window._audioLoaderTimeout); // cancel safety timeout if already fired
  const elapsed = Date.now() - (window._audioLoaderShownAt || 0);
  const remaining = Math.max(0, 300 - elapsed); // enforce min 300ms
  setTimeout(function() {
    const sub = document.getElementById('audio-player-subtitle');
    if (sub && sub.querySelector('#audio-loading-dot')) {
      sub.innerHTML = 'BCI Audio Lecture';
    }
  }, remaining);
}

function openAudioPlayer(url, title) {
  _audioUrl   = url;
  _audioTitle = title || 'Audio Lecture';

  const modal = document.getElementById('modal-audio-player');
  const audio = document.getElementById('bci-audio-el');
  if (!modal || !audio) return;

  // Set title
  document.getElementById('audio-player-title').textContent = _audioTitle;

  // ── Cloudinary Audio Optimization ──────────────────────────────
  // Transforms Cloudinary audio URL for optimized delivery:
  //   q_auto  → auto quality
  //   f_mp3   → convert to mp3
  //   br_96k  → 96kbps bitrate (ideal for voice/lectures)
  // Only ONE variant is generated and cached by Cloudinary.
  // Non-Cloudinary URLs are used as-is (no transformation applied).
  // To disable optimization: set AUDIO_OPTIMIZE = false
  // To change bitrate: update br_96k → br_64k / br_128k etc.
  // ───────────────────────────────────────────────────────────────
  const AUDIO_OPTIMIZE = true; // set false to disable optimization

  // Builds playback URL — no fl_attachment (would block streaming)
  function _buildAudioUrl(rawUrl) {
    if (!AUDIO_OPTIMIZE) return rawUrl;
    const match = rawUrl.match(/^(https:\/\/res\.cloudinary\.com\/[^\/]+\/video\/upload\/)(.+)$/);
    if (!match) return rawUrl; // not a Cloudinary URL — use as-is
    const base = match[1];
    const rest = match[2];
    if (rest.startsWith('q_auto') || rest.startsWith('fl_')) return rawUrl; // avoid double-apply
    return base + 'q_auto,f_mp3,br_64k/' + rest;
  }

  const deliveryUrl = _buildAudioUrl(url); // for playback
  // Download uses same compressed URL as playback
  // fl_attachment not used — requires paid Cloudinary plan (causes 423 on free plan)
  // Browser download is triggered via <a download> in audioDownload()
  _audioDeliveryUrl = deliveryUrl;
  // Download button intentionally disabled/hidden
  // To re-enable: uncomment below and remove display:none from HTML
  // const _dlBtn = document.getElementById('audio-download-btn');
  // if (_dlBtn) { _dlBtn.disabled=false; _dlBtn.style.opacity='1'; _dlBtn.style.cursor='pointer'; _dlBtn.style.display=''; }

  // Streaming load — HTML5 audio streams natively (no full download)
  // preload="metadata" — loads only duration/headers, NOT full audio
  // This saves bandwidth — full audio streams on play, not on open
  audio.src     = deliveryUrl;
  audio.preload = 'metadata';
  audio.load();

  // Store resume time — will be applied in canplay event
  // canplay fires after loadedmetadata AND enough buffer — more reliable
  audio._bciResumeTime = _audResumeLoad(url);

  // Show modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  history.pushState({ audioPlayer: true }, '', location.href);
  _audioHideMiniPlayer(); // hide mini if it was showing

  // Reset UI
  _audioUpdatePlayBtn(false);
  _audioSetFill(0);
  document.getElementById('audio-current-time').textContent = '0:00';
  const _remEl = document.getElementById('audio-remain-time');
  if (_remEl) _remEl.textContent = '-0:00';

  // ── Audio Loading Indicator ────────────────────────────────
  // Shows spinner while audio buffers (non-blocking — user can still interact)
  // Hidden by: canplay event (primary) | play event (fallback) | 6s timeout (safety)
  // Minimum visible duration: 300ms (prevents flicker on fast loads)
  // ───────────────────────────────────────────────────────────
  const _subLoading = document.getElementById('audio-player-subtitle');
  if (_subLoading) {
    _subLoading.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:5px;">' +
      '<span id="audio-loading-dot" style="' +
        'display:inline-block;width:10px;height:10px;border-radius:50%;' +
        'border:2px solid rgba(0,212,255,0.3);border-top-color:#00d4ff;' +
        'animation:spin 0.7s linear infinite;flex-shrink:0;' +
      '"></span>' +
      '<span style="color:var(--neon-blue,#00d4ff);font-size:11px;">Preparing audio...</span>' +
      '</span>';
  }
  // Record when loader started — for minimum duration enforcement
  window._audioLoaderShownAt = Date.now();
  // Safety timeout — hide loader after 6s if canplay never fires (network issue)
  clearTimeout(window._audioLoaderTimeout);
  window._audioLoaderTimeout = setTimeout(function() {
    _audioHideLoader();
  }, 6000);
  const volEl = document.getElementById('audio-volume');
  const volLbl = document.getElementById('audio-vol-label');
  if (volEl) volEl.value = '100';
  if (volLbl) volLbl.textContent = '100%';
  audio.volume = 1;
  audio.playbackRate = 1;
  audioSetSpeed(1); // reset speed highlight to 1x
  _audioStopPulse();
}

function closeAudioPlayer() {
  const modal = document.getElementById('modal-audio-player');
  const audio = document.getElementById('bci-audio-el');

  // Cancel pending debounce timer
  clearTimeout(_audResumeTimer);

  // Save current position immediately before closing
  // (debounce would be cancelled, so save directly)
  if (_audioUrl && audio && audio.currentTime > 0 && audio.duration > 0) {
    try {
      const id = _audGetId(_audioUrl);
      if (id) {
        localStorage.setItem(_AUD_RESUME_PREFIX + id,
          JSON.stringify({ time: Math.floor(audio.currentTime), savedAt: Date.now() })
        );
      }
    } catch(e) {}
  }

  if (modal) modal.style.display = 'none';
  if (audio) { audio.pause(); audio.src = ''; }
  document.body.style.overflow = '';
  _audioUrl = ''; _audioTitle = ''; _audioDeliveryUrl = '';
  // Download button is hidden — no reset needed
  // const _dlBtnClose = document.getElementById('audio-download-btn');
  // if (_dlBtnClose) { _dlBtnClose.disabled=true; _dlBtnClose.style.opacity='0.4'; _dlBtnClose.textContent='⬇️'; }
  _audioSpeedIdx = 1; // reset speed to 1x for next open
  const _speedBtn = document.getElementById('audio-speed-btn');
  if (_speedBtn) _speedBtn.textContent = '1x';
  // Reset loader state — important when switching between audios
  clearTimeout(window._audioLoaderTimeout);
  window._audioLoaderShownAt = 0;
  const _subClose = document.getElementById('audio-player-subtitle');
  if (_subClose && _subClose.querySelector('#audio-loading-dot')) {
    _subClose.innerHTML = 'BCI Audio Lecture';
  }
  _audioUpdatePlayBtn(false);
  _audioStopPulse();
  _audioHideMiniPlayer(); // hide mini player too
}

function audioDownload() {
  // ── Audio Download ───────────────────────────────────────────
  // Uses direct anchor click — browser handles everything natively:
  //   ✅ Large file safety  — no RAM spike, browser streams to disk
  //   ✅ Network resilience — browser handles drop/resume natively
  //   ✅ Memory safe        — no blob in JS memory (safe on low-end Android)
  //   ✅ Simple & stable    — minimal code, maximum reliability
  // Downloads compressed version: q_auto,f_mp3,br_64k
  // ─────────────────────────────────────────────────────────────

  // Safety check — URL not ready yet
  if (!_audioDeliveryUrl && !_audioUrl) {
    showToast('Audio is not ready yet. Please wait a moment.', 'warning', 3000);
    return;
  }

  const btn = document.getElementById('audio-download-btn');
  // Prevent multiple taps
  if (btn && btn.disabled) return;

  const downloadUrl = _audioDeliveryUrl || _audioUrl;
  const filename    = (_audioTitle || 'audio') + '.mp3';

  // Show downloading state immediately
  if (btn) {
    btn.disabled      = true;
    btn.textContent   = '⏳';
    btn.style.opacity = '0.6';
    btn.style.cursor  = 'not-allowed';
  }
  showToast('Downloading ' + filename + '...', 'info', 3000);

  // fetch → blob → object URL approach
  // This forces download instead of opening in new tab
  // (cross-origin audio URLs open in new tab with direct anchor)
  fetch(downloadUrl)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.blob();
    })
    .then(function(blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href     = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 5000);
      showToast('Download complete!', 'success', 2500);
      if (btn) {
        btn.disabled      = false;
        btn.textContent   = '⬇️';
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
      }
    })
    .catch(function() {
      // Fallback — direct anchor if fetch fails
      const a = document.createElement('a');
      a.href     = downloadUrl;
      a.download = filename;
      a.target   = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (btn) {
        btn.disabled      = false;
        btn.textContent   = '⬇️';
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
      }
    });
}

function audioTogglePlay() {
  const audio = document.getElementById('bci-audio-el');
  if (!audio) return;
  if (audio.paused) { audio.play().catch(function(){}); }
  else { audio.pause(); }
}

function audioSkip(seconds) {
  const audio = document.getElementById('bci-audio-el');
  if (!audio || !audio.duration || isNaN(audio.duration)) return;
  const newTime = audio.currentTime + seconds;
  audio.currentTime = Math.max(0, Math.min(audio.duration, newTime));
}

function audioSetVolume(val) {
  const audio = document.getElementById('bci-audio-el');
  if (!audio) return;
  audio.volume = val / 100;
  const lbl = document.getElementById('audio-vol-label');
  if (lbl) lbl.textContent = val + '%';
}

// Speed cycle: tap once → next speed
const _AUDIO_SPEEDS = [0.75, 1, 1.25, 1.5, 2];
let _audioSpeedIdx  = 1; // default: 1x (index 1)

function audioCycleSpeed() {
  const audio = document.getElementById('bci-audio-el');
  if (!audio) return;
  _audioSpeedIdx = (_audioSpeedIdx + 1) % _AUDIO_SPEEDS.length;
  const speed    = _AUDIO_SPEEDS[_audioSpeedIdx];
  audio.playbackRate = speed;
  const btn = document.getElementById('audio-speed-btn');
  if (btn) btn.textContent = speed + 'x';
}

function audioSetSpeed(speed) {
  // Used on reset — set to 1x
  const audio = document.getElementById('bci-audio-el');
  if (!audio) return;
  audio.playbackRate = speed;
  _audioSpeedIdx = _AUDIO_SPEEDS.indexOf(speed);
  if (_audioSpeedIdx < 0) _audioSpeedIdx = 1;
  const btn = document.getElementById('audio-speed-btn');
  if (btn) btn.textContent = speed + 'x';
}

// Tap to seek (mouse click on desktop)
function audioSeek(e) {
  const audio = document.getElementById('bci-audio-el');
  if (!audio || !audio.duration) return;
  const wrap  = document.getElementById('audio-seekbar-wrap');
  const rect  = wrap.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = ratio * audio.duration;
}

// ── Helper: set seekbar fill % ─────────────────────────────
function _audioSetFill(pct) {
  const fill = document.getElementById('audio-seekbar-fill');
  if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

// ── Format seconds → m:ss ─────────────────────────────────
function _audioFmt(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function _audioUpdatePlayBtn(playing) {
  const btn = document.getElementById('audio-play-btn');
  if (btn) btn.textContent = playing ? '⏸' : '▶';
}

// Pulse animation on icon when playing
function _audioStartPulse() {
  const wrap = document.getElementById('audio-icon-wrap');
  if (wrap) {
    wrap.style.animation = 'audioPulse 2s ease-in-out infinite';
    wrap.style.willChange = 'transform, opacity'; // GPU hint
  }
}
function _audioStopPulse() {
  const wrap = document.getElementById('audio-icon-wrap');
  if (wrap) {
    wrap.style.animation  = '';
    wrap.style.opacity    = '1';
    wrap.style.transform  = 'scale(1)';
    wrap.style.willChange = 'auto';
    wrap.style.background = 'linear-gradient(135deg,rgba(0,212,255,0.18),rgba(139,92,246,0.18))';
  }
}

// ── Show/hide drag time preview tooltip ───────────────────
function _audioShowDragPreview(ratio, x) {
  const audio   = document.getElementById('bci-audio-el');
  const preview = document.getElementById('audio-drag-preview');
  const wrap    = document.getElementById('audio-seekbar-wrap');
  if (!preview || !audio || !audio.duration) return;
  const time     = ratio * audio.duration;
  const wrapRect = wrap.getBoundingClientRect();
  const leftPx   = Math.max(20, Math.min(wrapRect.width - 20, x - wrapRect.left));
  preview.textContent   = _audioFmt(time);
  preview.style.left    = leftPx + 'px';
  preview.style.display = 'block';
}
function _audioHideDragPreview() {
  const preview = document.getElementById('audio-drag-preview');
  if (preview) preview.style.display = 'none';
}

// ── Seekbar touch drag (Android) ──────────────────────────
function _audioInitSeekbar() {
  const wrap  = document.getElementById('audio-seekbar-wrap');
  const thumb = document.getElementById('audio-seekbar-thumb');
  if (!wrap) return;

  function getRatio(clientX) {
    const rect = wrap.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  // Touch start — begin drag
  wrap.addEventListener('touchstart', function(e) {
    const audio = document.getElementById('bci-audio-el');
    if (!audio || !audio.duration) return;
    _audioDragging = true;
    if (thumb) thumb.style.transform = 'translateY(-50%) scale(1.3)';
    const ratio = getRatio(e.touches[0].clientX);
    _audioSetFill(ratio * 100);
    _audioShowDragPreview(ratio, e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });

  // Touch move — scrub in real-time
  wrap.addEventListener('touchmove', function(e) {
    if (!_audioDragging) return;
    const audio = document.getElementById('bci-audio-el');
    if (!audio || !audio.duration) return;
    const ratio = getRatio(e.touches[0].clientX);
    _audioSetFill(ratio * 100);
    document.getElementById('audio-current-time').textContent = _audioFmt(ratio * audio.duration);
    _audioShowDragPreview(ratio, e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });

  // Touch end — commit seek
  wrap.addEventListener('touchend', function(e) {
    if (!_audioDragging) return;
    _audioDragging = false;
    if (thumb) thumb.style.transform = 'translateY(-50%) scale(1)';
    _audioHideDragPreview();
    const audio = document.getElementById('bci-audio-el');
    if (!audio || !audio.duration) return;
    const ratio = getRatio(e.changedTouches[0].clientX);
    audio.currentTime = ratio * audio.duration;
  }, { passive: true });

  // Mouse drag (desktop)
  wrap.addEventListener('mousedown', function(e) {
    const audio = document.getElementById('bci-audio-el');
    if (!audio || !audio.duration) return;
    _audioDragging = true;
    if (thumb) thumb.style.transform = 'translateY(-50%) scale(1.3)';
    const ratio = getRatio(e.clientX);
    _audioSetFill(ratio * 100);
    _audioShowDragPreview(ratio, e.clientX);
  });
  document.addEventListener('mousemove', function(e) {
    if (!_audioDragging) return;
    const audio = document.getElementById('bci-audio-el');
    if (!audio || !audio.duration) return;
    const ratio = getRatio(e.clientX);
    _audioSetFill(ratio * 100);
    document.getElementById('audio-current-time').textContent = _audioFmt(ratio * audio.duration);
    _audioShowDragPreview(ratio, e.clientX);
  });
  document.addEventListener('mouseup', function(e) {
    if (!_audioDragging) return;
    _audioDragging = false;
    if (thumb) thumb.style.transform = 'translateY(-50%) scale(1)';
    _audioHideDragPreview();
    const audio = document.getElementById('bci-audio-el');
    if (!audio || !audio.duration) return;
    const ratio = getRatio(e.clientX);
    audio.currentTime = ratio * audio.duration;
  });
}

// ── Audio element event listeners ─────────────────────────
// Using direct attachment (not DOMContentLoaded) since element is always in DOM
(function _audioBindEvents() {
  // Retry until element is ready
  function bind() {
    const audio = document.getElementById('bci-audio-el');
    if (!audio) { setTimeout(bind, 100); return; }

    // canplay: enough data buffered — set resume position THEN play
    audio.addEventListener('canplay', function() {
      const modal = document.getElementById('modal-audio-player');
      if (!modal || modal.style.display !== 'flex') return;

      // Hide loading indicator — audio is ready (canplay = primary event)
      _audioHideLoader();

      // Apply resume position once (before first play)
      if (audio._bciResumeTime && audio._bciResumeTime > 0 && audio.duration > 0) {
        const t = audio._bciResumeTime;
        audio._bciResumeTime = 0; // clear so it only applies once
        if (t < audio.duration - 3) {
          audio.currentTime = t;
        }
      }
      if (audio.paused) {
        audio.play().catch(function(){});
      }
    });

    audio.addEventListener('play', function() {
      _audioUpdatePlayBtn(true);
      _audioMiniSyncBtn();
      _audioStartPulse();
      // Hide loading indicator if still showing (play = fallback event)
      _audioHideLoader();
      // Also reset subtitle if it was showing an error
      const sub = document.getElementById('audio-player-subtitle');
      if (sub && sub.textContent.includes('Failed')) {
        sub.innerHTML = 'BCI Audio Lecture';
      }
    });
    audio.addEventListener('pause', function() {
      _audioUpdatePlayBtn(false);
      _audioMiniSyncBtn();
      _audioStopPulse();
    });
    audio.addEventListener('ended', function() {
      _audioUpdatePlayBtn(false);
      _audioStopPulse();
      _audioSetFill(0);
      audio.currentTime = 0;
      // Clear saved position — audio completed, next open starts fresh
      if (_audioUrl) _audResumeClear(_audioUrl);
    });
    audio.addEventListener('loadedmetadata', function() {
      const remain = document.getElementById('audio-remain-time');
      if (remain) remain.textContent = '-' + _audioFmt(audio.duration);
    });
    audio.addEventListener('timeupdate', function() {
      if (_audioDragging || !audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      _audioSetFill(pct);
      document.getElementById('audio-current-time').textContent = _audioFmt(audio.currentTime);
      const remain = document.getElementById('audio-remain-time');
      if (remain) remain.textContent = '-' + _audioFmt(audio.duration - audio.currentTime);
      // Save position every 2s (debounced) — only when playing
      if (_audioUrl && !audio.paused) _audResumeSave(_audioUrl, audio.currentTime);
    });
    audio.addEventListener('error', function() {
      // Only show error if audio is genuinely not playing/loadable
      // Ignore false errors during seek/resume operations
      if (audio.error && audio.error.code && audio.readyState === 0) {
        // ── Fallback: if optimized Cloudinary URL failed, retry with original URL ──
        // This handles cases where transformation is not yet generated or CDN hiccup
        if (_audioUrl && audio.src !== _audioUrl) {
          // optimized URL failed → silently fallback to original
          // Fallback: use original URL for both playback and download
          _audioDeliveryUrl = _audioUrl;
          audio.src     = _audioUrl;
          audio.preload = 'metadata';
          audio.load();
          return; // wait for next error event — if original also fails, show error
        }
        const sub = document.getElementById('audio-player-subtitle');
        if (sub) sub.textContent = 'Failed to load — check your connection';
      }
    });

    // Init seekbar touch/mouse drag
    _audioInitSeekbar();
  }
  bind();
})();

// =============================================================
// ADMIN NOTIFICATIONS
// =============================================================
let _notifAll      = [];  // all loaded notifications
let _notifFilter   = 'all'; // 'all' | 'today' | 'month'
let _notifLoaded   = false; // true after successful load

// Load notifications from Firestore (called on tab open)
async function loadAdminNotifications() {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;
  _notifLoaded = false; // reset on fresh load
  listEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:40px 0;">Loading...</div>';

  try {
    // No orderBy — avoids Firestore composite index requirement
    // Sort client-side after fetching (max 100 docs, negligible performance impact)
    const snap = await db.collection('adminNotifications')
      .limit(100)
      .get();

    _notifAll = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.editedAt?.toDate ? a.editedAt.toDate() : new Date(a.editedAt || 0);
        const tb = b.editedAt?.toDate ? b.editedAt.toDate() : new Date(b.editedAt || 0);
        return tb - ta; // newest first
      });
    _notifLoaded = true; // mark as loaded before applying filters
    notifApplyFilters();
    // Update badge count (unread)
    _notifUpdateBadge();
  } catch(e) {
    _notifLoaded = false; // keep false so filters don't overwrite error message
    listEl.innerHTML = '<div style="text-align:center;color:var(--danger);padding:40px 0;">Failed to load notifications.</div>';
  }
}

// Set time filter and re-render
function notifSetFilter(filter) {
  _notifFilter = filter;
  ['all','today','month'].forEach(f => {
    const btn = document.getElementById('notif-filter-' + f);
    if (btn) {
      btn.className = 'btn btn-sm ' + (f === filter ? 'btn-primary' : 'btn-ghost');
      btn.style.fontSize = '12px';
    }
  });
  notifApplyFilters();
}

// Apply both time + class filters and render
function notifApplyFilters() {
  // Don't apply filters if data hasn't loaded yet (prevents "No notifications found"
  // showing when load actually failed)
  if (!_notifLoaded) return;

  const classFilter = document.getElementById('notif-filter-class')?.value || 'all';
  const now   = new Date();
  const today = now.toDateString();
  const thisMonth = now.getMonth() + '-' + now.getFullYear();

  const filtered = _notifAll.filter(n => {
    // Time filter
    if (_notifFilter !== 'all' && n.editedAt) {
      const d = n.editedAt.toDate ? n.editedAt.toDate() : new Date(n.editedAt);
      if (_notifFilter === 'today'  && d.toDateString() !== today) return false;
      if (_notifFilter === 'month'  && (d.getMonth() + '-' + d.getFullYear()) !== thisMonth) return false;
    }
    // Class filter
    if (classFilter !== 'all' && String(n.studentClass) !== String(classFilter)) return false;
    return true;
  });

  _notifRender(filtered);
}

// Render notification list
function _notifRender(list) {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;

  if (!list.length) {
    listEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:40px 0;">No notifications found.</div>';
    return;
  }

  listEl.innerHTML = list.map(n => {
    const isRead  = n.read === true;
    const timeStr = n.editedAt
      ? (n.editedAt.toDate ? n.editedAt.toDate() : new Date(n.editedAt))
          .toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric',
                                     hour:'2-digit', minute:'2-digit', hour12:true })
      : 'Unknown time';
    const fields  = Array.isArray(n.changedFields) ? n.changedFields.join(', ') : '—';

    return `<div id="notif-${n.id}" onclick="notifMarkRead('${n.id}')" style="
      background:${isRead ? 'var(--bg-card)' : 'rgba(0,212,255,0.06)'};
      border:1px solid ${isRead ? 'var(--border)' : 'rgba(0,212,255,0.3)'};
      border-radius:var(--radius-sm); padding:12px 14px;
      cursor:pointer; transition:background 0.2s;
      display:flex; flex-direction:column; gap:4px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          ${!isRead ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--neon-blue);flex-shrink:0;"></span>' : '<span style="width:8px;height:8px;flex-shrink:0;"></span>'}
          <span style="font-weight:600; color:var(--neon-blue); font-size:13px;">${n.studentId}</span>
          <span style="color:var(--text-dim); font-size:12px;">Class ${n.studentClass}</span>
        </div>
        <span style="font-size:11px; color:var(--text-dim); white-space:nowrap;">${timeStr}</span>
      </div>
      <div style="font-size:12px; color:var(--text-white); padding-left:16px;">
        <strong>${n.studentName}</strong> edited their profile
      </div>
      <div style="font-size:11px; color:var(--text-dim); padding-left:16px;">
        Changed: ${fields}
      </div>
    </div>`;
  }).join('');
}

// Mark single notification as read
async function notifMarkRead(id) {
  try {
    await db.collection('adminNotifications').doc(id).update({ read: true });
    const n = _notifAll.find(x => x.id === id);
    if (n) n.read = true;
    const el = document.getElementById('notif-' + id);
    if (el) {
      el.style.background = 'var(--bg-card)';
      el.style.border = '1px solid var(--border)';
      const dot = el.querySelector('span[style*="border-radius:50%"]');
      if (dot) dot.style.background = 'transparent';
    }
    _notifUpdateBadge();
  } catch(e) {}
}

// Mark all as read
async function notifMarkAllRead() {
  try {
    const unread = _notifAll.filter(n => !n.read);
    if (!unread.length) return;
    const batch = db.batch();
    unread.forEach(n => {
      batch.update(db.collection('adminNotifications').doc(n.id), { read: true });
      n.read = true;
    });
    await batch.commit();
    notifApplyFilters();
    _notifUpdateBadge();
    showToast('All notifications marked as read', 'success', 2000);
  } catch(e) {}
}

// Update sidebar badge count
function _notifUpdateBadge() {
  const unreadCount = _notifAll.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (unreadCount > 0) {
    badge.style.display = 'inline-flex';
    badge.textContent   = unreadCount > 99 ? '99+' : unreadCount;
  } else {
    badge.style.display = 'none';
  }
}

// Check unread count on admin dashboard load (for badge)
async function _notifCheckUnread() {
  try {
    const snap = await db.collection('adminNotifications').limit(100).get();
    const unreadCount = snap.docs.filter(d => d.data().read === false).length;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (unreadCount > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent   = unreadCount > 99 ? '99+' : unreadCount;
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}

// =============================================================
// PWA — Service Worker + Sidebar Install Button
// =============================================================
let _pwaInstallPrompt = null;

// ── Update both sidebar buttons ───────────────────────────────
function _pwaUpdateButtons(state) {
  ['pwa-btn-student', 'pwa-btn-admin'].forEach(function(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.remove('pwa-ready', 'pwa-installed');
    if (state === 'ready') {
      btn.classList.add('pwa-ready');
      btn.innerHTML = '📲 Install App';
      btn.disabled = false;
    } else if (state === 'installed') {
      btn.classList.add('pwa-installed');
      btn.innerHTML = '✅ Installed';
      btn.disabled = true;
    }
    // 'hidden' → no class → display:none via CSS
  });
}

// ── Apply correct state right now based on current conditions ──
function _pwaApplyState() {
  // Already installed and running as PWA → show faded Installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    _pwaUpdateButtons('installed');
    return;
  }
  // Prompt available → show Install button
  if (_pwaInstallPrompt) {
    _pwaUpdateButtons('ready');
    return;
  }
  // No prompt yet → hide (default) — browser hasn't decided eligibility yet
  _pwaUpdateButtons('hidden');
}

// ── Register service worker ───────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(reg) {
        console.log('[BCI PWA] SW registered:', reg.scope);
      })
      .catch(function(err) {
        console.log('[BCI PWA] SW registration failed:', err);
      });
  });
}

// ── Capture install prompt ────────────────────────────────────
// Chrome fires this once per session. We store it permanently
// so we can show the button whenever the sidebar is visible.
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  _pwaInstallPrompt = e;
  console.log('[BCI PWA] Install prompt captured');
  _pwaApplyState();
});

// ── Apply state on every page load ───────────────────────────
document.addEventListener('DOMContentLoaded', _pwaApplyState);
window.addEventListener('load', _pwaApplyState);

// ── Re-apply when SPA navigates (student/admin page switches) ─
// We patch showStudentPage and showAdminPage to re-check state
// after the sidebar becomes visible with the correct buttons.
(function() {
  function patchNavFn(fnName) {
    var orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function() {
      var result = orig.apply(this, arguments);
      // Small delay to ensure sidebar DOM is fully shown
      setTimeout(_pwaApplyState, 50);
      return result;
    };
  }
  // Patch after all scripts have loaded
  window.addEventListener('load', function() {
    patchNavFn('showStudentPage');
    patchNavFn('showAdminPage');
  });
})();

// ── Install button click ──────────────────────────────────────
function pwaInstall() {
  if (!_pwaInstallPrompt) {
    console.log('[BCI PWA] No install prompt available');
    return;
  }
  _pwaInstallPrompt.prompt();
  _pwaInstallPrompt.userChoice.then(function(choice) {
    console.log('[BCI PWA] User choice:', choice.outcome);
    if (choice.outcome === 'accepted') {
      _pwaInstallPrompt = null;
      _pwaUpdateButtons('installed');
    } else {
      // User dismissed — keep button visible so they can try again
      _pwaUpdateButtons('ready');
    }  });
}

// ── App installed via browser menu ───────────────────────────
window.addEventListener('appinstalled', function() {
  _pwaInstallPrompt = null;
  _pwaUpdateButtons('installed');
  console.log('[BCI PWA] App installed successfully');
});


