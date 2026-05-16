// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Guàrdies
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, badge, initials, avatar } from './ui.js';

let _db, _ref, _get, _set;

export function initGuardiesModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, set: _set } = fbFns);
}

const TODAY = () => new Date().toISOString().split('T')[0];

export async function renderGuardies() {
  const avui = TODAY();
  const [absSnap, usersSnap, cfgSnap, guardiesSnap] = await Promise.all([
    _get(_ref(_db, `gestiona/absencies/${avui}`)),
    _get(_ref(_db, 'gestiona/users')),
    _get(_ref(_db, 'gestiona/config/curs')),
    _get(_ref(_db, `gestiona/guardies/${avui}`)),
  ]);

  const absAvui    = absSnap.exists()     ? absSnap.val()     : {};
  const guardies   = guardiesSnap.exists()? guardiesSnap.val(): {};
  const users      = usersSnap.exists()   ? usersSnap.val()   : {};
  const numFranges = cfgSnap.exists()     ? (cfgSnap.val().franges || 6) : 6;

  const professors = Object.entries(users).filter(([, u]) =>
    ['professor','tutor','cap_estudis','director'].includes(u.rol) && u.actiu !== false
  );
  const absents    = professors.filter(([uid]) => absAvui[uid]);
  const disponibles = professors.filter(([uid]) => !absAvui[uid]);

  const horaBase = 8;
  const frangesHtml = Array.from({ length: numFranges }, (_, i) => {
    const key       = `franja_${i}`;
    const assignat  = guardies[key]?.uid || '';
    const nomAssig  = assignat && users[assignat] ? users[assignat].nom : '';
    return `
    <div class="guard-slot ${assignat ? 'ok' : absents.length ? 'alert' : 'ok'}" style="margin-bottom:8px">
      <div style="width:80px;flex-shrink:0;font-size:12.5px;font-weight:700;color:var(--ink-40)">
        ${horaBase + i}:00–${horaBase + i + 1}:00
      </div>
      <select class="form-select" style="flex:1;font-size:13px;padding:7px 10px" id="guard_${i}">
        <option value="">— Sense cobrir —</option>
        ${disponibles.map(([uid, u]) =>
          `<option value="${uid}" ${assignat === uid ? 'selected' : ''}>${u.nom}</option>`
        ).join('')}
      </select>
      ${nomAssig ? `<span style="font-size:12px;color:var(--green);font-weight:600;margin-left:8px">✓ ${nomAssig}</span>` : ''}
      <button class="btn btn-xs btn-secondary" style="margin-left:8px;flex-shrink:0"
        onclick="guardesGuardar(${i})">💾</button>
    </div>`;
  }).join('');

  const absentsHtml = absents.length
    ? absents.map(([uid, u]) => `
      <div class="guard-slot alert" style="margin-bottom:8px">
        ${avatar(initials(u.nom), 'var(--accent)')}
        <div style="flex:1;margin-left:10px">
          <div style="font-size:13.5px;font-weight:600;color:var(--ink)">${u.nom}</div>
          <div style="font-size:12px;color:var(--ink-40)">${absAvui[uid]?.motiu || '—'}</div>
        </div>
      </div>`).join('')
    : `<div class="empty-state" style="padding:24px 16px">
        <div class="empty-icon" style="font-size:32px">✅</div>
        <div style="font-size:13px;color:var(--ink-40)">Cap absent avui</div>
       </div>`;

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Guàrdies</div>
      <div class="page-sub">Assignació de guàrdies per cobrir absències · ${new Date().toLocaleDateString('ca-ES', { weekday:'long', day:'numeric', month:'long' })}</div>
    </div>
    <div class="page-actions">
      ${badge(`${absents.length} absent${absents.length !== 1 ? 's' : ''} avui`, absents.length ? 'alert' : 'ok')}
      ${badge(`${disponibles.length} disponibles`, 'ok')}
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:20px">
    <div class="card">
      <div class="card-title">Professors absents avui</div>
      ${absentsHtml}
    </div>
    <div class="card">
      <div class="card-title">Professors disponibles <span>${disponibles.length}</span></div>
      ${disponibles.slice(0, 8).map(([, u]) => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--ink-05)">
          ${avatar(initials(u.nom), 'var(--green)')}
          <span style="font-size:13px;font-weight:500;color:var(--ink);flex:1">${u.nom}</span>
          ${u.especialitat ? `<span style="font-size:11.5px;color:var(--ink-40)">${u.especialitat}</span>` : ''}
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Franges horàries del dia</div>
    ${frangesHtml}
    <div style="margin-top:14px">
      <button class="btn btn-primary" onclick="guardesGuardarTotes(${numFranges})">
        💾 Guardar totes les guàrdies
      </button>
    </div>
  </div>`;
}

export function bindGuardies() {
  const avui = TODAY();

  window.guardesGuardar = async function (i) {
    const uid = document.getElementById(`guard_${i}`)?.value || '';
    await _set(
      _ref(_db, `gestiona/guardies/${avui}/franja_${i}`),
      uid ? { uid, ts: Date.now(), assignatPer: G.user?.uid } : null
    );
    showToast(`Guàrdia franja ${i + 1} guardada!`, 'success');
  };

  window.guardesGuardarTotes = async function (n) {
    for (let i = 0; i < n; i++) await window.guardesGuardar(i);
    showToast('Totes les guàrdies guardades!', 'success');
  };
}
