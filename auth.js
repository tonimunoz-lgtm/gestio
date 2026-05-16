// ═══════════════════════════════════════════
//  Gestiona — Auth Module
//  Login, logout, gestió de rols i perfil
// ═══════════════════════════════════════════

import { G, ROLES_DEF, MODULES_DEF } from './firebase-config.js';
import { showToast } from './ui.js';

let _auth, _db, _ref, _set, _get, _update, _push, _onValue, _onAuthStateChanged,
    _signIn, _signInPopup, _GoogleProvider, _signOut, _resetEmail;

export async function initAuth(auth, db, fbFns) {
  _auth = auth; _db = db;
  ({ ref: _ref, set: _set, get: _get, update: _update, push: _push,
     onValue: _onValue, onAuthStateChanged: _onAuthStateChanged,
     signInWithEmailAndPassword: _signIn,
     signInWithPopup: _signInPopup,
     GoogleAuthProvider: _GoogleProvider,
     signOut: _signOut,
     sendPasswordResetEmail: _resetEmail } = fbFns);
}

// ── Login amb email/password ──
export async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { showLoginError('Introdueix correu i contrasenya'); return; }
  const btn = document.getElementById('btnLogin');
  btn.textContent = 'Entrant...'; btn.disabled = true;
  try {
    await _signIn(_auth, email, pass);
  } catch (e) {
    showLoginError(friendlyAuthError(e.code));
    btn.textContent = 'Entrar a Gestiona'; btn.disabled = false;
  }
}

// ── Login amb Google ──
export async function doLoginGoogle() {
  try {
    await _signInPopup(_auth, new _GoogleProvider());
  } catch (e) {
    showLoginError('Error Google: ' + e.message);
  }
}

// ── Logout ──
export async function doLogout() {
  G.unsubs.forEach(u => u && u());
  G.unsubs = [];
  await _signOut(_auth);
}

// ── Reset password ──
export async function doResetPassword() {
  const email = document.getElementById('resetEmail').value.trim();
  if (!email) { showToast('Introdueix el correu', 'error'); return; }
  try {
    await _resetEmail(_auth, email);
    window.hideModal('resetModal');
    showToast('Correu de recuperació enviat!', 'success');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Escolta canvis d'autenticació ──
export function listenAuth(onLogin, onLogout) {
  _onAuthStateChanged(_auth, async user => {
    if (user) {
      G.user = user;
      await loadUserProfile(user);
      await loadModules();
      onLogin(user);
    } else {
      G.user = null; G.profile = null;
      onLogout();
    }
  });
}

// ── Carrega el perfil de l'usuari des de DB ──
async function loadUserProfile(user) {
  const snap = await _get(_ref(_db, `gestiona/users/${user.uid}`));
  if (snap.exists()) {
    G.profile = snap.val();
  } else {
    // Primer accés: comprova si és el primer usuari → admin
    const usersSnap = await _get(_ref(_db, 'gestiona/users'));
    const isFirst   = !usersSnap.exists();
    G.profile = {
      email:    user.email,
      nom:      user.displayName || user.email.split('@')[0],
      rol:      isFirst ? 'admin' : 'professor',
      actiu:    true,
      createdAt: Date.now(),
      assignedClasses: [],
      assignedGroups:  [],
    };
    await _set(_ref(_db, `gestiona/users/${user.uid}`), G.profile);
    if (isFirst) await _set(_ref(_db, 'gestiona/config/adminUid'), user.uid);
  }
  updateUserUI();
}

// ── Carrega mòduls actius ──
async function loadModules() {
  const snap = await _get(_ref(_db, 'gestiona/config/modules'));
  if (snap.exists()) {
    G.modules = snap.val();
  } else {
    G.modules = {};
    Object.entries(MODULES_DEF).forEach(([k, v]) => { G.modules[k] = v.defaultOn; });
    await _set(_ref(_db, 'gestiona/config/modules'), G.modules);
  }
  const rol     = G.profile?.rol || 'professor';
  const rolDef  = ROLES_DEF[rol];
  const allowed = rolDef?.modules === '*' ? Object.keys(MODULES_DEF) : (rolDef?.modules || []);
  G.activeModules = Object.keys(G.modules).filter(m => G.modules[m] && (allowed.includes(m) || rol === 'admin'));
}

// ── Crea un usuari nou via Firebase REST API ──
export async function createUserViaRest(email, password, profileData, fbApiKey) {
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${fbApiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) }
  );
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  await _set(_ref(_db, `gestiona/users/${data.localId}`), {
    ...profileData, email, actiu: true, createdAt: Date.now(),
    assignedClasses: [], assignedGroups: [], createdBy: G.user?.uid
  });
  return data.localId;
}

// ── Actualitza UI de l'usuari a la sidebar ──
export function updateUserUI() {
  const nom    = G.profile?.nom || G.user?.email || '—';
  const rol    = G.profile?.rol || 'professor';
  const rolDef = ROLES_DEF[rol] || { label: rol, color: '#999' };
  const ini    = nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const el = {
    name:   document.getElementById('uName'),
    role:   document.getElementById('uRole'),
    avatar: document.getElementById('uAvatar'),
  };
  if (el.name)   el.name.textContent   = nom;
  if (el.role)   el.role.textContent   = rolDef.label;
  if (el.avatar) { el.avatar.textContent = ini; el.avatar.style.background = rolDef.color; }
}

// ── Helpers ──
function showLoginError(msg) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4500);
}

export function friendlyAuthError(code) {
  return {
    'auth/user-not-found':    'Usuari no trobat',
    'auth/wrong-password':    'Contrasenya incorrecta',
    'auth/invalid-email':     'Correu invàlid',
    'auth/invalid-credential':'Credencials incorrectes',
    'auth/too-many-requests': 'Massa intents, espera uns minuts',
    'auth/email-already-in-use': 'Aquest correu ja està registrat',
  }[code] || code;
}

// Exposem al window
window.doLogin        = doLogin;
window.doLoginGoogle  = doLoginGoogle;
window.doLogout       = doLogout;
window.doResetPassword = doResetPassword;
