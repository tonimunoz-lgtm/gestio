// ═══════════════════════════════════════════
//  Gestiona — Mòdul Secretaria
//  Alumnes, grups, importació Excel/CSV
// ═══════════════════════════════════════════

import { G } from './firebase-config.js';
import { showToast, showModal, hideModal, showConfirm, openDynModal,
         initTabs, badge, initials, avatar, exportCSV, filterTable } from './ui.js';
import { navigate } from './router.js';

let _db, _ref, _set, _get, _update, _push, _remove;

export function initSecretariaModule(db, fbFns) {
  _db = db;
  ({ ref: _ref, set: _set, get: _get, update: _update, push: _push, remove: _remove } = fbFns);
}

// ── Carrega grups com a opcions select ──
async function getGrupOptions(selected = '') {
  const snap = await _get(_ref(_db, 'gestiona/grups'));
  if (!snap.exists()) return '<option value="">Sense grup</option>';
  return '<option value="">Sense grup</option>' +
    Object.entries(snap.val())
      .map(([id, g]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${g.nom}</option>`)
      .join('');
}

// ════════════════════════════════
//  RENDER
// ════════════════════════════════
export async function renderSecretaria() {
  const [alumnesSnap, grupsSnap] = await Promise.all([
    _get(_ref(_db, 'gestiona/alumnes')),
    _get(_ref(_db, 'gestiona/grups')),
  ]);
  const alumnes = alumnesSnap.exists() ? Object.entries(alumnesSnap.val()) : [];
  const grups   = grupsSnap.exists()   ? Object.entries(grupsSnap.val())   : [];
  const grupsMap = Object.fromEntries(grups);
  const grupOptions = await getGrupOptions();

  const alumnesRows = alumnes.map(([id, a]) => {
    const grupNom = grupsMap[a.grupId]?.nom || '—';
    const ini = initials(a.nom);
    return `<tr data-grupid="${a.grupId || ''}">
      <td><div class="td-main">
        ${avatar(ini, 'var(--blue)', 'sm')}
        <div>
          <div style="font-weight:600;color:var(--ink)">${a.nom} ${a.cognoms || ''}</div>
          <div style="font-size:11px;color:var(--ink-40)">${a.email || '—'}</div>
        </div>
      </div></td>
      <td>${grupNom}</td>
      <td style="font-size:12.5px;color:var(--ink-60)">${a.telefon || '—'}</td>
      <td>${a.naix || '—'}</td>
      <td><div style="display:flex;gap:5px">
        <button class="btn btn-xs btn-secondary" onclick="secEditAlumne('${id}')">✏</button>
        <button class="btn btn-xs" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5"
          onclick="secDeleteAlumne('${id}')">🗑</button>
      </div></td>
    </tr>`;
  }).join('');

  const grupsRows = grups.map(([id, g]) =>
    `<tr>
      <td style="font-weight:600;color:var(--ink)">${g.nom}</td>
      <td>${g.curs || '—'}</td>
      <td>${g.torn === 'tarda' ? 'Tarda' : 'Matí'}</td>
      <td>${g.numAlumnes || 0}</td>
      <td><div style="display:flex;gap:5px">
        <button class="btn btn-xs btn-secondary" onclick="secEditGrup('${id}')">✏</button>
        <button class="btn btn-xs" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5"
          onclick="secDeleteGrup('${id}')">🗑</button>
      </div></td>
    </tr>`
  ).join('');

  return `
  <div class="page-header">
    <div><div class="page-title">Secretaria</div>
    <div class="page-sub">Gestió d'alumnes, grups i importació de dades</div></div>
  </div>

  <div class="tabs">
    <button class="tab-btn" data-tab="secAlumnes">👥 Alumnes (${alumnes.length})</button>
    <button class="tab-btn" data-tab="secGrups">📁 Grups (${grups.length})</button>
    <button class="tab-btn" data-tab="secImport">📥 Importar Excel / CSV</button>
  </div>

  <!-- ALUMNES -->
  <div id="secAlumnes" class="tab-panel">
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <input class="form-input" style="width:200px;font-size:13px;padding:8px 12px"
        placeholder="🔍 Cercar alumne..." oninput="filterTable('alumnesBody',this.value)">
      <select class="form-select" style="width:160px;font-size:13px;padding:8px 12px"
        onchange="secFilterByGrup(this.value)">
        <option value="">Tots els grups</option>
        ${grups.map(([id, g]) => `<option value="${id}">${g.nom}</option>`).join('')}
      </select>
      <button class="btn btn-secondary btn-sm" onclick="showModal('newAlumneModal')">+ Nou alumne</button>
      <button class="btn btn-secondary btn-sm" onclick="secExportAlumnes()">⬇ Exportar CSV</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Alumne/a</th><th>Grup</th><th>Telèfon família</th><th>Naix.</th><th>Accions</th></tr></thead>
        <tbody id="alumnesBody">
          ${alumnesRows || `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--ink-40)">
            Cap alumne. Afegeix-ne un o importa un CSV.
          </td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <!-- GRUPS -->
  <div id="secGrups" class="tab-panel hidden">
    <div style="margin-bottom:14px">
      <button class="btn btn-secondary btn-sm" onclick="showModal('newGrupModal')">+ Nou grup</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Grup</th><th>Curs</th><th>Torn</th><th>Alumnes</th><th>Accions</th></tr></thead>
        <tbody>
          ${grupsRows || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--ink-40)">Cap grup creat</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <!-- IMPORTAR -->
  <div id="secImport" class="tab-panel hidden">
    <div class="card">
      <div class="card-title">Importar alumnes des d'Excel / CSV</div>
      <p style="font-size:13px;color:var(--ink-60);margin-bottom:16px;line-height:1.6">
        Importa alumnes des d'un fitxer <strong>.csv</strong> o <strong>.xlsx</strong>.<br>
        Podràs seleccionar quines files importar i mapejar les columnes del teu arxiu.
      </p>
      <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <div class="drop-icon">📊</div>
        <div style="font-weight:600;margin-bottom:4px">Arrossega l'arxiu aquí o fes clic per seleccionar</div>
        <div style="font-size:12px;opacity:.6">Formats acceptats: .csv, .xlsx, .xls</div>
      </div>
      <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display:none"
        onchange="secHandleFile(this)">
      <div id="excelPreviewArea" style="margin-top:16px"></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">Format CSV esperat</div>
      <pre style="font-family:monospace;font-size:12px;background:var(--ink-05);padding:12px;border-radius:8px;color:var(--ink-60);overflow-x:auto">"Nom","Cognoms","Email família","Telèfon","Data naix."
"Joan","García Martí","familia@gmail.com","600123456","2010-05-14"
"Anna","López Puig","anna.familia@mail.cat","677234567","2011-03-22"</pre>
    </div>
  </div>

  <!-- MODAL NOU ALUMNE -->
  <div id="newAlumneModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-title">Nou alumne
        <button class="modal-close" onclick="hideModal('newAlumneModal')">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nom *</label>
          <input class="form-input" id="aNom" placeholder="Joan"></div>
        <div class="form-group"><label class="form-label">Cognoms</label>
          <input class="form-input" id="aCognoms" placeholder="García Martí"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Grup</label>
          <select class="form-select" id="aGrup">${grupOptions}</select></div>
        <div class="form-group"><label class="form-label">Data de naixement</label>
          <input class="form-input" type="date" id="aNaix"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Correu família</label>
          <input class="form-input" type="email" id="aEmail" placeholder="familia@mail.com"></div>
        <div class="form-group"><label class="form-label">Telèfon família</label>
          <input class="form-input" id="aTel" placeholder="6XX XXX XXX"></div>
      </div>
      <div class="form-group"><label class="form-label">Observacions</label>
        <textarea class="form-textarea" id="aObs" style="min-height:60px"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newAlumneModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="secCreateAlumne()">Afegir alumne</button>
      </div>
    </div>
  </div>

  <!-- MODAL NOU GRUP -->
  <div id="newGrupModal" class="modal-overlay hidden">
    <div class="modal-box modal-sm">
      <div class="modal-title">Nou grup
        <button class="modal-close" onclick="hideModal('newGrupModal')">✕</button>
      </div>
      <div class="form-group"><label class="form-label">Nom del grup *</label>
        <input class="form-input" id="gNom" placeholder="2n ESO B"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Curs</label>
          <select class="form-select" id="gCurs">
            ${['1r ESO','2n ESO','3r ESO','4t ESO','1r Batxillerat','2n Batxillerat',
               '1r CFGM','2n CFGM','1r CFGS','2n CFGS']
              .map(c => `<option>${c}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Torn</label>
          <select class="form-select" id="gTorn">
            <option value="mati">Matí</option>
            <option value="tarda">Tarda</option>
          </select></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal('newGrupModal')">Cancel·lar</button>
        <button class="btn btn-primary" onclick="secCreateGrup()">Crear grup</button>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════
//  BIND
// ════════════════════════════════
export function bindSecretaria() {
  initTabs(document.getElementById('pageContainer'));

  // ── Drag & Drop ──
  const dz = document.getElementById('dropZone');
  if (dz) {
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      const fi = document.getElementById('fileInput');
      if (e.dataTransfer.files[0]) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fi.files = dt.files;
        secHandleFile(fi);
      }
    });
  }

  // ── CRUD Alumnes ──
  window.secCreateAlumne = async function () {
    const nom = document.getElementById('aNom').value.trim();
    if (!nom) { showToast('Introdueix el nom', 'error'); return; }
    const grupId = document.getElementById('aGrup').value;
    await _push(_ref(_db, 'gestiona/alumnes'), {
      nom, cognoms: document.getElementById('aCognoms').value.trim(),
      grupId, email:   document.getElementById('aEmail').value.trim(),
      telefon:  document.getElementById('aTel').value.trim(),
      naix:     document.getElementById('aNaix').value,
      obs:      document.getElementById('aObs').value.trim(),
      createdAt: Date.now(), createdBy: G.user?.uid,
    });
    hideModal('newAlumneModal');
    showToast('Alumne afegit!', 'success');
    navigate('secretaria');
  };

  window.secEditAlumne = async function (id) {
    const snap = await _get(_ref(_db, `gestiona/alumnes/${id}`));
    const a = snap.val(); if (!a) return;
    const grupOpts = await getGrupOptions(a.grupId);
    openDynModal('editAlumneModal', `
      <div class="modal-box">
        <div class="modal-title">Editar alumne
          <button class="modal-close" onclick="hideModal('editAlumneModal')">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nom</label>
            <input class="form-input" id="eaNom" value="${a.nom || ''}"></div>
          <div class="form-group"><label class="form-label">Cognoms</label>
            <input class="form-input" id="eaCognoms" value="${a.cognoms || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Grup</label>
            <select class="form-select" id="eaGrup">${grupOpts}</select></div>
          <div class="form-group"><label class="form-label">Data naix.</label>
            <input class="form-input" type="date" id="eaNaix" value="${a.naix || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Email família</label>
            <input class="form-input" type="email" id="eaEmail" value="${a.email || ''}"></div>
          <div class="form-group"><label class="form-label">Telèfon</label>
            <input class="form-input" id="eaTel" value="${a.telefon || ''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Observacions</label>
          <textarea class="form-textarea" id="eaObs" style="min-height:60px">${a.obs || ''}</textarea></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="hideModal('editAlumneModal')">Cancel·lar</button>
          <button class="btn btn-primary" onclick="secSaveAlumne('${id}')">Guardar</button>
        </div>
      </div>`);
  };

  window.secSaveAlumne = async function (id) {
    await _update(_ref(_db, `gestiona/alumnes/${id}`), {
      nom:     document.getElementById('eaNom').value.trim(),
      cognoms: document.getElementById('eaCognoms').value.trim(),
      grupId:  document.getElementById('eaGrup').value,
      naix:    document.getElementById('eaNaix').value,
      email:   document.getElementById('eaEmail').value.trim(),
      telefon: document.getElementById('eaTel').value.trim(),
      obs:     document.getElementById('eaObs').value.trim(),
      updatedAt: Date.now(),
    });
    hideModal('editAlumneModal');
    showToast('Alumne actualitzat!', 'success');
    navigate('secretaria');
  };

  window.secDeleteAlumne = function (id) {
    showConfirm('Eliminar alumne', 'Vols eliminar aquest alumne? Aquesta acció no es pot desfer.', async () => {
      await _remove(_ref(_db, `gestiona/alumnes/${id}`));
      showToast('Alumne eliminat');
      navigate('secretaria');
    });
  };

  window.secFilterByGrup = function (grupId) {
    document.querySelectorAll('#alumnesBody tr').forEach(tr => {
      tr.style.display = !grupId || tr.dataset.grupid === grupId ? '' : 'none';
    });
  };

  window.filterTable = (id, val) => filterTable(id, val);

  // ── CRUD Grups ──
  window.secCreateGrup = async function () {
    const nom = document.getElementById('gNom').value.trim();
    if (!nom) { showToast('Introdueix el nom del grup', 'error'); return; }
    await _push(_ref(_db, 'gestiona/grups'), {
      nom, curs: document.getElementById('gCurs').value,
      torn: document.getElementById('gTorn').value,
      numAlumnes: 0, createdAt: Date.now(),
    });
    hideModal('newGrupModal');
    showToast('Grup creat!', 'success');
    navigate('secretaria');
  };

  window.secEditGrup = async function (id) {
    const snap = await _get(_ref(_db, `gestiona/grups/${id}`));
    const g = snap.val(); if (!g) return;
    const cursOpts = ['1r ESO','2n ESO','3r ESO','4t ESO','1r Batxillerat','2n Batxillerat','1r CFGM','2n CFGM','1r CFGS','2n CFGS']
      .map(c => `<option ${g.curs === c ? 'selected' : ''}>${c}</option>`).join('');
    openDynModal('editGrupModal', `
      <div class="modal-box modal-sm">
        <div class="modal-title">Editar grup
          <button class="modal-close" onclick="hideModal('editGrupModal')">✕</button>
        </div>
        <div class="form-group"><label class="form-label">Nom</label>
          <input class="form-input" id="egNom" value="${g.nom || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Curs</label>
            <select class="form-select" id="egCurs">${cursOpts}</select></div>
          <div class="form-group"><label class="form-label">Torn</label>
            <select class="form-select" id="egTorn">
              <option value="mati" ${g.torn === 'mati' ? 'selected' : ''}>Matí</option>
              <option value="tarda" ${g.torn === 'tarda' ? 'selected' : ''}>Tarda</option>
            </select></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="hideModal('editGrupModal')">Cancel·lar</button>
          <button class="btn btn-primary" onclick="secSaveGrup('${id}')">Guardar</button>
        </div>
      </div>`);
  };

  window.secSaveGrup = async function (id) {
    await _update(_ref(_db, `gestiona/grups/${id}`), {
      nom:  document.getElementById('egNom').value.trim(),
      curs: document.getElementById('egCurs').value,
      torn: document.getElementById('egTorn').value,
      updatedAt: Date.now(),
    });
    hideModal('editGrupModal');
    showToast('Grup actualitzat!', 'success');
    navigate('secretaria');
  };

  window.secDeleteGrup = function (id) {
    showConfirm('Eliminar grup', 'Vols eliminar aquest grup?', async () => {
      await _remove(_ref(_db, `gestiona/grups/${id}`));
      showToast('Grup eliminat');
      navigate('secretaria');
    });
  };

  // ── Exportar ──
  window.secExportAlumnes = async function () {
    const [aSnap, gSnap] = await Promise.all([
      _get(_ref(_db, 'gestiona/alumnes')),
      _get(_ref(_db, 'gestiona/grups')),
    ]);
    if (!aSnap.exists()) { showToast('No hi ha alumnes', 'error'); return; }
    const grups = gSnap.exists() ? gSnap.val() : {};
    const rows  = [['Nom', 'Cognoms', 'Grup', 'Email família', 'Telèfon', 'Data naix.', 'Observacions']];
    Object.values(aSnap.val()).forEach(a => {
      rows.push([a.nom, a.cognoms || '', grups[a.grupId]?.nom || '', a.email || '', a.telefon || '', a.naix || '', a.obs || '']);
    });
    exportCSV(rows, 'alumnes_gestiona.csv');
    showToast('CSV exportat!', 'success');
  };

  // ── Importar CSV/Excel ──
  window.secHandleFile = function (input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      let rows = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Parser CSV robust
        const text = e.target.result;
        rows = parseCSV(text);
      } else {
        // Excel: necessita SheetJS. Si no disponible, avisa.
        showToast('Per a .xlsx usa SheetJS o converteix a CSV primer', 'warn');
        return;
      }
      if (rows.length < 2) { showToast('Arxiu buit o sense dades', 'error'); return; }
      renderExcelPreview(rows);
    };
    reader.readAsText(file, 'utf-8');
  };
}

// ── Parser CSV robust ──
function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim()); cur = '';
      } else { cur += ch; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// ── Vista prèvia i importació selectiva ──
function renderExcelPreview(rows) {
  const headers  = rows[0];
  const dataRows = rows.slice(1).filter(r => r.some(c => c));

  const fields = [
    { key: 'nom',     label: 'Nom' },
    { key: 'cognoms', label: 'Cognoms' },
    { key: 'email',   label: 'Email família' },
    { key: 'telefon', label: 'Telèfon' },
    { key: 'naix',    label: 'Data naix.' },
  ];

  // Auto-detecció de columnes per nom
  function autoDetect(fieldLabel) {
    const idx = headers.findIndex(h =>
      h.toLowerCase().includes(fieldLabel.toLowerCase()) ||
      fieldLabel.toLowerCase().includes(h.toLowerCase())
    );
    return idx >= 0 ? idx : -1;
  }

  const colOpts = (sel) => `<option value="-1">— No importar —</option>` +
    headers.map((h, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${h}</option>`).join('');

  const mapRows = fields.map(f => {
    const auto = autoDetect(f.label);
    return `<div class="col-map-row" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;align-items:center">
      <label style="font-size:12.5px;color:var(--ink-60);font-weight:600">${f.label}</label>
      <select class="form-select" id="colmap_${f.key}" style="font-size:12px;padding:5px 8px">
        ${colOpts(auto)}
      </select>
    </div>`;
  }).join('');

  const tableRows = dataRows.map((r, i) => `
    <tr id="exrow_${i}" class="selected">
      <td><input type="checkbox" class="row-checkbox" checked
        onchange="document.getElementById('exrow_${i}').classList.toggle('selected',this.checked)"></td>
      ${r.map(c => `<td>${c}</td>`).join('')}
    </tr>`).join('');

  document.getElementById('excelPreviewArea').innerHTML = `
    <div style="background:var(--ink-05);border-radius:var(--radius-sm);padding:16px;margin-bottom:14px">
      <div style="font-size:13.5px;font-weight:700;color:var(--ink);margin-bottom:12px">
        Assigna les columnes del teu arxiu
      </div>
      ${mapRows}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:13px;font-weight:600;color:var(--ink)">
        Vista prèvia — ${dataRows.length} files
      </div>
      <label style="font-size:12.5px;color:var(--ink-60);cursor:pointer">
        <input type="checkbox" id="selAll" checked
          onchange="document.querySelectorAll('.row-checkbox').forEach(c=>{c.checked=this.checked;c.closest('tr').classList.toggle('selected',this.checked)})">
        Seleccionar totes
      </label>
    </div>
    <div class="excel-preview">
      <table class="excel-table">
        <thead><tr>
          <th style="width:32px"></th>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      <button class="btn btn-secondary" onclick="document.getElementById('excelPreviewArea').innerHTML=''">
        Cancel·lar
      </button>
      <button class="btn btn-primary" onclick="secImportSelected(${JSON.stringify(dataRows)})">
        ⬆ Importar files seleccionades
      </button>
    </div>`;

  // Expose
  window.secImportSelected = async function (dataRows) {
    const get = key => parseInt(document.getElementById('colmap_' + key)?.value ?? -1);
    const mapping = { nom: get('nom'), cognoms: get('cognoms'), email: get('email'), telefon: get('telefon'), naix: get('naix') };
    let count = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!document.getElementById(`exrow_${i}`)?.classList.contains('selected')) continue;
      const nom = mapping.nom >= 0 ? row[mapping.nom] : '';
      if (!nom) continue;
      await _push(_ref(_db, 'gestiona/alumnes'), {
        nom,
        cognoms:  mapping.cognoms  >= 0 ? row[mapping.cognoms]  : '',
        email:    mapping.email    >= 0 ? row[mapping.email]    : '',
        telefon:  mapping.telefon  >= 0 ? row[mapping.telefon]  : '',
        naix:     mapping.naix     >= 0 ? row[mapping.naix]     : '',
        createdAt: Date.now(), createdBy: G.user?.uid,
      });
      count++;
    }
    showToast(`${count} alumnes importats correctament!`, 'success');
    navigate('secretaria');
  };
}
