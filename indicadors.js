// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Indicadors
// ═══════════════════════════════════════════

import { G, MODULES_DEF, ROLES_DEF } from './firebase-config.js';
import { badge, roleChip } from './ui.js';

let _db, _ref, _get;

export function initIndicadorsModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get } = fbFns);
}

export async function renderIndicadors() {
  const [aSnap, cSnap, uSnap, absSnap, gSnap] = await Promise.all([
    _get(_ref(_db, 'gestiona/alumnes')),
    _get(_ref(_db, 'gestiona/classes')),
    _get(_ref(_db, 'gestiona/users')),
    _get(_ref(_db, 'gestiona/absencies')),
    _get(_ref(_db, 'gestiona/grups')),
  ]);

  const nAlumnes = aSnap.exists() ? Object.keys(aSnap.val()).length : 0;
  const nClasses = cSnap.exists() ? Object.keys(cSnap.val()).length : 0;
  const nGrups   = gSnap.exists() ? Object.keys(gSnap.val()).length : 0;
  const users    = uSnap.exists() ? uSnap.val() : {};
  const nUsers   = Object.keys(users).length;

  const totalAbs = absSnap.exists()
    ? Object.values(absSnap.val()).reduce((s, d) => s + Object.keys(d).length, 0)
    : 0;

  // Distribució per rol
  const rolCount = {};
  Object.values(users).forEach(u => { rolCount[u.rol] = (rolCount[u.rol] || 0) + 1; });
  const total = Object.values(rolCount).reduce((s, n) => s + n, 0) || 1;

  const rolBars = Object.entries(rolCount).map(([rol, n]) => {
    const def = ROLES_DEF[rol] || { label: rol, color: '#999' };
    const pct = ((n / total) * 100).toFixed(0);
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--ink-05)">
      <span class="role-chip"
        style="min-width:110px;background:${def.color}18;color:${def.color};border-color:${def.color}40">
        ${def.label}
      </span>
      <div style="flex:1;height:7px;background:var(--ink-10);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${def.color};border-radius:99px;transition:width .4s"></div>
      </div>
      <span style="font-size:13px;font-weight:700;color:var(--ink);min-width:20px;text-align:right">${n}</span>
    </div>`;
  }).join('');

  const modList = G.activeModules.map(m => {
    const def = MODULES_DEF[m];
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--ink-05)">
      <span style="font-size:20px;width:28px;text-align:center">${def.icon}</span>
      <span style="font-size:13.5px;font-weight:600;color:var(--ink);flex:1">${def.label}</span>
      ${badge('Actiu', 'ok')}
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Indicadors</div>
      <div class="page-sub">Estadístiques i KPIs del centre educatiu</div>
    </div>
  </div>

  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-val">${nAlumnes}</div>
      <div class="stat-label">Alumnes matriculats</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📁</div>
      <div class="stat-val">${nGrups}</div>
      <div class="stat-label">Grups / Cursos</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📚</div>
      <div class="stat-val">${nClasses}</div>
      <div class="stat-label">Classes actives</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📋</div>
      <div class="stat-val">${totalAbs}</div>
      <div class="stat-label">Absències totals</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Usuaris per rol <span>${nUsers} total</span></div>
      ${rolBars || '<p style="color:var(--ink-40);font-size:13px">Cap usuari</p>'}
    </div>
    <div class="card">
      <div class="card-title">Mòduls actius <span>${G.activeModules.length}</span></div>
      ${modList || '<p style="color:var(--ink-40);font-size:13px">Cap mòdul actiu</p>'}
    </div>
  </div>`;
}

export function bindIndicadors() {}
