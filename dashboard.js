// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Dashboard
// ═══════════════════════════════════════════

import { G, MODULES_DEF } from './firebase-config.js';

let _db, _ref, _get;

export function initDashboardModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get } = fbFns);
}

export async function renderDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const [alumnesSnap, classesSnap, usersSnap, absSnap, cfgSnap] = await Promise.all([
    _get(_ref(_db, 'gestiona/alumnes')),
    _get(_ref(_db, 'gestiona/classes')),
    _get(_ref(_db, 'gestiona/users')),
    _get(_ref(_db, `gestiona/absencies/${today}`)),
    _get(_ref(_db, 'gestiona/config/curs')),
  ]);

  const nAlumnes = alumnesSnap.exists() ? Object.keys(alumnesSnap.val()).length : 0;
  const nClasses = classesSnap.exists() ? Object.keys(classesSnap.val()).length : 0;
  const nUsuaris = usersSnap.exists()   ? Object.keys(usersSnap.val()).length   : 0;
  const nAbsAvui = absSnap.exists()     ? Object.keys(absSnap.val()).length     : 0;
  const curs     = cfgSnap.exists()     ? cfgSnap.val().nom : '—';

  const nom    = (G.profile?.nom || '').split(' ')[0] || 'usuari';
  const hora   = new Date().getHours();
  const salut  = hora < 12 ? 'Bon dia' : hora < 19 ? 'Bona tarda' : 'Bona nit';
  const avuiStr = new Date().toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const modCards = G.activeModules.slice(0, 6).map(m => {
    const def = MODULES_DEF[m];
    return `<div class="module-card" style="cursor:pointer" onclick="navigate('${m}')">
      <div class="module-icon-wrap" style="font-size:24px">${def.icon}</div>
      <div class="module-info">
        <div class="module-name">${def.label}</div>
        <div class="module-desc">${def.desc}</div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">${salut}, ${nom} 👋</div>
      <div class="page-sub">${avuiStr.charAt(0).toUpperCase() + avuiStr.slice(1)} · Curs ${curs}</div>
    </div>
  </div>

  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-val">${nAlumnes}</div>
      <div class="stat-label">Alumnes</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📚</div>
      <div class="stat-val">${nClasses}</div>
      <div class="stat-label">Classes</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">👤</div>
      <div class="stat-val">${nUsuaris}</div>
      <div class="stat-label">Usuaris</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📋</div>
      <div class="stat-val" style="color:${nAbsAvui > 0 ? 'var(--accent)' : 'var(--green)'}">${nAbsAvui}</div>
      <div class="stat-label">Absències avui</div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Accés ràpid als mòduls</div>
    <div class="grid-3">
      ${modCards || '<p style="color:var(--ink-40);font-size:13px">Cap mòdul disponible.</p>'}
    </div>
  </div>`;
}

export function bindDashboard() {}
