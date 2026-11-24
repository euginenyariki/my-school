/* Schola — a small, local-first school operations dashboard.
   All data lives in localStorage. No account, no server, no secrets. */
const KEY = 'schola:v1';
const CLASSES = ['Form 1A', 'Form 2A', 'Form 3B', 'Form 4A'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const seed = [
  ['Amina Yusuf', 'Form 2A', 'ADM-101', 'Halima Yusuf', '0712 345 678', 18000, 18000],
  ['Brian Otieno', 'Form 2A', 'ADM-102', 'Mary Otieno', '0722 118 904', 18000, 9000],
  ['Cynthia Wanjiku', 'Form 3B', 'ADM-103', 'Peter Wanjiku', '0701 552 310', 22000, 0],
  ['David Kiptoo', 'Form 1A', 'ADM-104', 'Jane Kiptoo', '0759 220 118', 18000, 18000],
  ['Esha Mohamed', 'Form 4A', 'ADM-105', 'Ali Mohamed', '0711 908 442', 24000, 12000],
  ['Faith Njeri', 'Form 2A', 'ADM-106', 'Samuel Njeri', '0733 410 775', 18000, 4000],
  ['George Mwangi', 'Form 3B', 'ADM-107', 'Anne Mwangi', '0708 662 190', 22000, 22000],
  ['Hannah Achieng', 'Form 1A', 'ADM-108', 'Victor Achieng', '0725 330 011', 18000, 0],
].map(([name, cls, adm, guardian, phone, fee, paid], i) => ({
  id: i + 1, name, cls, adm, guardian, phone, fee, paid,
  days: Array.from({ length: 7 }, (_, d) => (i + d) % 7 !== 0),
  present: (i + new Date().getDay()) % 7 !== 0,
}));

let state = load();
let activeClass = 'all';
let editingId = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.students)) return parsed;
    }
  } catch (_) { /* corrupt or blocked storage — fall back to demo data */ }
  return { students: structuredClone(seed) };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode */ }
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}
function money(n) { return 'KES ' + Number(n).toLocaleString('en-KE'); }
function balance(s) { return Math.max(0, s.fee - s.paid); }
function feeStatus(s) {
  const b = balance(s);
  if (b === 0) return ['Cleared', 'ok'];
  if (s.paid > 0) return ['Partial', 'warn'];
  return ['Unpaid', 'bad'];
}
function esc(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const titles = {
    overview: ['Overview', 'A clear view of the school today.'],
    students: ['Students', 'Registry of every enrolled learner.'],
    attendance: ['Attendance', 'Tap a student to toggle today’s attendance.'],
    fees: ['Fees', 'Term balances and payment status.'],
    timetable: ['Timetable', 'Weekly classes for Form 2A.'],
  };
  document.getElementById('pageTitle').textContent = titles[name][0];
  document.getElementById('pageSub').textContent = titles[name][1];
}

function render() {
  const all = state.students;
  const q = (document.getElementById('search').value || '').toLowerCase();
  const visible = all.filter(s => (activeClass === 'all' || s.cls === activeClass) &&
    (!q || [s.name, s.adm, s.cls, s.guardian].join(' ').toLowerCase().includes(q)));

  renderStats(all);
  renderChart(all);
  renderFees(all);
  document.getElementById('recentStudents').innerHTML = studentTable(all.slice(0, 5), true);
  document.getElementById('studentTable').innerHTML = studentTable(visible);
  document.getElementById('attendanceTable').innerHTML = attendanceTable(visible);
  document.getElementById('feeTable').innerHTML = feeTable(visible);
  document.getElementById('classFilters').innerHTML = ['all', ...CLASSES].map(c =>
    `<button class="chip ${c === activeClass ? 'active' : ''}" data-class="${c}">${c === 'all' ? 'All classes' : c}</button>`).join('');
  document.getElementById('addBtn').style.display = ['overview', 'students'].includes(currentView()) ? '' : 'none';
  renderTimetable();
  save();
}
function currentView() { return document.querySelector('.view.active')?.id.replace('view-', '') || 'overview'; }

function renderStats(all) {
  const present = all.filter(s => s.present).length;
  const owing = all.reduce((sum, s) => sum + balance(s), 0);
  const cleared = all.filter(s => balance(s) === 0).length;
  const avg = all.length ? Math.round(all.reduce((n, s) => n + s.days.filter(Boolean).length, 0) / (all.length * 7) * 100) : 0;
  document.getElementById('stats').innerHTML = [
    ['Enrolled', all.length, `${CLASSES.length} classes`],
    ['Present today', `${present}/${all.length}`, present === all.length ? 'Full attendance' : 'Check register'],
    ['Fees outstanding', money(owing), `${cleared} fully cleared`],
    ['Weekly attendance', avg + '%', 'Across all learners'],
  ].map(([label, value, hint]) => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`).join('');
}

function renderChart(all) {
  const counts = DAYS.map((_, i) => all.filter(s => s.days[i]).length);
  const max = Math.max(1, ...counts);
  document.getElementById('attendanceChart').innerHTML = counts.map((n, i) =>
    `<div class="bar-wrap"><div class="bar" style="height:${Math.round(n / max * 110)}px" title="${n} present"></div><div class="bar-label">${DAYS[i]}</div></div>`).join('');
}

function renderFees(all) {
  const rows = CLASSES.map(c => {
    const list = all.filter(s => s.cls === c);
    const due = list.reduce((n, s) => n + balance(s), 0);
    return [c, due, list.filter(s => balance(s) > 0).length];
  }).filter(r => r[1] > 0);
  document.getElementById('feeBreakdown').innerHTML = rows.length
    ? rows.map(([c, due, n]) => `<div class="fee-row"><span>${c} <span class="muted">(${n})</span></span><span>${money(due)}</span></div>`).join('')
    : '<div class="empty">All fees cleared 🎉</div>';
}

function studentTable(list, short = false) {
  if (!list.length) return '<div class="empty">No students match this view.</div>';
  const cols = short ? ['Name', 'Class', 'Balance', 'Status'] : ['Name', 'Admission', 'Class', 'Guardian', 'Phone', 'Balance', 'Status', ''];
  const head = '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
  const body = list.map(s => {
    const [label, tone] = feeStatus(s);
    const cells = [
      `<strong>${esc(s.name)}</strong>`,
      esc(s.adm),
      esc(s.cls), esc(s.guardian), esc(s.phone),
      money(balance(s)),
      `<span class="badge ${tone}">${label}</span>`,
    ];
    const shown = short ? [cells[0], cells[2], cells[5], cells[6]] : cells;
    const action = short ? '' : `<button class="row-btn" data-del="${s.id}" title="Remove student">×</button>`;
    return '<tr>' + shown.map(c => `<td>${c}</td>`).join('') + (short ? '' : `<td>${action}</td>`) + '</tr>';
  }).join('');
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

function attendanceTable(list) {
  if (!list.length) return '<div class="empty">No students match this view.</div>';
  return '<table><thead><tr><th>Student</th><th>Class</th>' + DAYS.map(d => `<th>${d}</th>`).join('') + '<th>Today</th></tr></thead><tbody>' +
    list.map(s => `<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.cls)}</td>` +
      s.days.map((v, i) => `<td>${v ? '✓' : '<span class="muted">–</span>'}</td>`).join('') +
      `<td><button class="chip ${s.present ? 'active' : ''}" data-attend="${s.id}">${s.present ? 'Present' : 'Absent'}</button></td></tr>`).join('') +
    '</tbody></table>';
}

function feeTable(list) {
  if (!list.length) return '<div class="empty">No students match this view.</div>';
  return '<table><thead><tr><th>Student</th><th>Term fee</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>' +
    list.map(s => { const [label, tone] = feeStatus(s); return `<tr><td><strong>${esc(s.name)}</strong></td><td>${money(s.fee)}</td><td>${money(s.paid)}</td><td>${money(balance(s))}</td><td><span class="badge ${tone}">${label}</span></td></tr>`; }).join('') +
    '</tbody></table>';
}

function renderTimetable() {
  const grid = [
    ['08:00', 'Math', 'English', 'Physics', 'Math', 'History'],
    ['09:00', 'English', 'Math', 'Chemistry', 'Biology', 'Math'],
    ['10:00', 'Biology', 'Physics', 'English', 'Chemistry', 'Sport'],
    ['11:00', 'History', 'Geography', 'Math', 'English', 'Physics'],
  ];
  document.getElementById('timetable').innerHTML =
    '<div class="tt-cell head">Time</div>' + DAYS.slice(0, 5).map(d => `<div class="tt-cell head">${d}</div>`).join('') +
    grid.flatMap(row => `<div class="tt-cell head">${row[0]}</div>` + row.slice(1).map(v => `<div class="tt-cell lesson">${v}</div>`).join('')).join('');
}

function openModal(id = null) {
  editingId = id;
  const s = id ? state.students.find(x => x.id === id) : null;
  document.getElementById('modalTitle').textContent = s ? 'Edit student' : 'Add student';
  const vals = s || { name: '', cls: CLASSES[0], adm: '', guardian: '', phone: '', fee: 18000, paid: 0 };
  for (const [key, field] of Object.entries({ name: 'fName', cls: 'fClass', adm: 'fAdm', guardian: 'fGuardian', phone: 'fPhone', fee: 'fFee', paid: 'fPaid' })) {
    document.getElementById(field).value = vals[key];
  }
  document.getElementById('modal').classList.add('open');
  document.getElementById('fName').focus();
}
function closeModal() { document.getElementById('modal').classList.remove('open'); editingId = null; }

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('schola:dark') === 'true') document.body.classList.add('dark');
  document.getElementById('nav').addEventListener('click', e => {
    const b = e.target.closest('.nav-item'); if (b) switchView(b.dataset.view);
  });
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.goto)));
  document.getElementById('search').addEventListener('input', render);
  document.getElementById('classFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-class]'); if (!b) return;
    activeClass = b.dataset.class; render();
  });
  document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('schola:dark', document.body.classList.contains('dark'));
  });
  document.getElementById('addBtn').addEventListener('click', () => openModal());
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('studentForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      name: document.getElementById('fName').value.trim(),
      cls: document.getElementById('fClass').value,
      adm: document.getElementById('fAdm').value.trim(),
      guardian: document.getElementById('fGuardian').value.trim(),
      phone: document.getElementById('fPhone').value.trim(),
      fee: Number(document.getElementById('fFee').value) || 0,
      paid: Number(document.getElementById('fPaid').value) || 0,
    };
    if (!data.name || !data.adm) return;
    if (editingId) {
      const s = state.students.find(x => x.id === editingId);
      Object.assign(s, data);
    } else {
      state.students.unshift({ id: Date.now(), ...data, days: Array(7).fill(true), present: true });
    }
    closeModal(); render(); toast(editingId ? 'Student updated' : 'Student added');
  });
  document.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del && confirm('Remove this student from the registry?')) {
      state.students = state.students.filter(s => s.id !== Number(del.dataset.del));
      render(); toast('Student removed');
    }
    const att = e.target.closest('[data-attend]');
    if (att) {
      const s = state.students.find(x => x.id === Number(att.dataset.attend));
      if (s) { s.present = !s.present; const i = (new Date().getDay() + 6) % 7; s.days[i] = s.present; render(); }
    }
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all demo data?')) return;
    state = { students: structuredClone(seed) }; render(); toast('Demo data restored');
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const rows = [['Name', 'Admission', 'Class', 'Guardian', 'Phone', 'Fee', 'Paid', 'Balance'],
      ...state.students.map(s => [s.name, s.adm, s.cls, s.guardian, s.phone, s.fee, s.paid, balance(s)])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'schola-fees.csv'; a.click(); URL.revokeObjectURL(a.href);
    toast('CSV exported');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  render();
});
