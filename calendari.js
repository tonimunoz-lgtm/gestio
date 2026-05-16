// ═══════════════════════════════════════════
//  Gestiona — Mòdul: Calendari
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, showModal, hideModal } from './ui.js';

let _db, _ref, _get, _push;
let _calDate = new Date();

export function initCalendariModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, get: _get, push: _push } = fbFns);
}

const TODAY = () => new Date().toISOString().split('T')[0];
const MONTHS = ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'];
const DAYS   = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];
const COLOR_MAP = {
  accent: { bg:'#fff0f1', fg:'#e04050' },
  teal:   { bg:'#e0faf8', fg:'#007a6e' },
  purple: { bg:'#f5f0ff', fg:'#5b21b6' },
  amber:  { bg:'#fffbeb', fg:'#92400e' },
  blue:   { bg:'#eff6ff', fg:'#1d4ed8' },
};

export async function renderCalendari() {
  return `
  <div class="page-header">
    <div>
      <div class="page-title">Calendari</div>
      <div class="page-sub">Events, reunions i dates importants del centre</div>
    </div>
    <button class="btn btn-primary" onclick="showModal('newEventModal')">+ Nou event</button>
  </div>

  <div class="card" style="overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
      <button class="btn btn-secondary btn-sm" onclick="calCanviarMes(-1)">‹ Anterior</button>
      <span style="font-size:16px;font-weight:800;color:var(--ink)" id="calLabel"></span>
      <button class="btn btn-secondary btn-sm" onclick="calCanviarMes(1)">Següent ›</button>
    </div>
    <div id="calGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--ink-10);border-radius:8px;overflow:hidden"></div>
  </div>

  <div id="newEventModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-title">Nou event
        <button class="modal-close" onclick="hideModal('newEventModal')">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Títol *</label>
        <input class="form-input" id="evTitol" placeholder="Reunió de pares, examen...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data inici</label>
          <input class="form-input" type="date" id="evInici" value="${TODAY()}">
        </div>
        <div class="form-group">
          <label class="form-label">Data fi</label>
          <input class="form-input" type="date" id="evFi" value="${TODAY()}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Hora</label>
          <input class="form-input" type="time" id="evHora">
        </div>
        <div class="form-group">
          <label class="form-label">Tipus / Color</label>
          <select class="form-select" id="evColor">
            <option value="accent">🔴 Reunions</option>
            <option value="teal">🟢 Exàmens</option>
            <option value="purple">🟣 Festius</option>
            <option value="amber">🟡 Sortides</option>
            <option value="blue">🔵 Activitats</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripció</label>
        <textarea class="form-textarea" id="evDesc" style="min-height:70px"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newEventModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="calCrearEvent()">Crear event</button>
      </div>
    </div>
  </div>`;
}

export async function bindCalendari() {
  await _calRender();

  window.calCanviarMes = async function (dir) {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + dir, 1);
    await _calRender();
  };

  window.calCrearEvent = async function () {
    const titol = document.getElementById('evTitol')?.value.trim();
    if (!titol) { showToast('Introdueix el títol', 'error'); return; }
    await _push(_ref(_db, 'gestiona/events'), {
      titol,
      inici:     document.getElementById('evInici').value,
      fi:        document.getElementById('evFi').value,
      hora:      document.getElementById('evHora').value,
      color:     document.getElementById('evColor').value,
      desc:      document.getElementById('evDesc').value.trim(),
      createdBy: G.user?.uid,
      createdAt: Date.now(),
    });
    hideModal('newEventModal');
    showToast('Event creat!', 'success');
    await _calRender();
  };
}

async function _calRender() {
  const lbl  = document.getElementById('calLabel');
  const grid = document.getElementById('calGrid');
  if (!lbl || !grid) return;

  const y = _calDate.getFullYear();
  const m = _calDate.getMonth();
  lbl.textContent = `${MONTHS[m]} ${y}`;

  const evSnap = await _get(_ref(_db, 'gestiona/events'));
  const events = evSnap.exists() ? Object.values(evSnap.val()) : [];
  const today  = new Date();

  // Capçalera dies de la setmana
  let html = DAYS.map(d => `
    <div style="background:var(--ink-05);padding:8px 4px;text-align:center;font-size:11px;font-weight:700;color:var(--ink-40);text-transform:uppercase">
      ${d}
    </div>`).join('');

  // Cel·les buides fins al primer dia
  let start = new Date(y, m, 1).getDay() - 1;
  if (start < 0) start = 6;
  for (let i = 0; i < start; i++) {
    html += `<div style="background:var(--white);min-height:80px;padding:6px"></div>`;
  }

  // Dies del mes
  const dim = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
    const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvs  = events.filter(e => e.inici <= dateStr && (!e.fi || e.fi >= dateStr));

    const evHtml = dayEvs.slice(0, 2).map(e => {
      const col = COLOR_MAP[e.color] || COLOR_MAP.accent;
      return `<div style="font-size:10px;padding:2px 5px;border-radius:3px;margin-top:2px;
        background:${col.bg};color:${col.fg};overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;font-weight:600" title="${e.titol}">${e.titol}</div>`;
    }).join('');

    const more = dayEvs.length > 2 ? `<div style="font-size:10px;color:var(--ink-40);margin-top:2px">+${dayEvs.length - 2} més</div>` : '';

    html += `
    <div style="background:var(--white);min-height:80px;padding:6px;cursor:pointer;transition:background .1s"
      onmouseover="this.style.background='var(--ink-05)'" onmouseout="this.style.background='var(--white)'">
      <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:${isToday ? '800' : '600'};
        background:${isToday ? 'var(--accent)' : 'transparent'};
        color:${isToday ? '#fff' : 'var(--ink)'}">
        ${d}
      </div>
      ${evHtml}${more}
    </div>`;
  }
  grid.innerHTML = html;
}
