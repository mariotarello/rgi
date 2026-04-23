let participants = [];

const state = {
  presence: new Set(),
  filter: 'all',
  sort: 'name'
};

const STORAGE_KEY = 'rgi_checkin_presence';

function getImagePath(lastName) {
  const normalized = lastName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
  return `img/${normalized}.jpg`;
}

function getVisible() {
  let list = [...participants];
  if (state.filter === 'present') {
    list = list.filter(p => state.presence.has(p.id));
  } else if (state.filter === 'absent') {
    list = list.filter(p => !state.presence.has(p.id));
  }
  list.sort((a, b) => {
    if (state.sort === 'company') {
      return a.company.localeCompare(b.company, 'it') || a.lastName.localeCompare(b.lastName, 'it');
    }
    return a.lastName.localeCompare(b.lastName, 'it');
  });
  return list;
}

function createCard(p) {
  const isPresent = state.presence.has(p.id);
  const imgSrc = getImagePath(p.lastName);
  const card = document.createElement('div');
  card.className = 'participant-card' + (isPresent ? ' is-present' : '');
  card.dataset.id = p.id;
  card.innerHTML = `
    <div class="avatar">
      <img src="${imgSrc}" alt="${p.lastName} ${p.firstName}" onerror="this.onerror=null;this.src='img/placeholder.jpg';">
      <div class="avatar-badge">✓</div>
    </div>
    <div class="participant-info">
      <div class="participant-name">${p.lastName} ${p.firstName}</div>
      <div class="participant-company">${p.company}</div>
      <div class="participant-role">${p.role}</div>
    </div>
    <div class="toggle-wrapper">
      <span class="toggle-label">Presente</span>
      <div class="toggle-switch">
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </div>
    </div>
  `;
  return card;
}

function renderList() {
  const container = document.getElementById('participantsList');
  container.innerHTML = '';
  getVisible().forEach(p => container.appendChild(createCard(p)));
}

function togglePresence(id) {
  if (state.presence.has(id)) {
    state.presence.delete(id);
  } else {
    state.presence.add(id);
  }
  if (state.filter !== 'all') {
    renderList();
  } else {
    const card = document.querySelector(`.participant-card[data-id="${id}"]`);
    card.classList.toggle('is-present', state.presence.has(id));
  }
  savePresence();
  document.getElementById('presentCount').textContent = state.presence.size;
}

// ── localStorage ─────────────────────────────────────────────

function loadPresence() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) state.presence = new Set(ids);
    }
  } catch (e) {}
}

function savePresence() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.presence)));
  } catch (e) {}
}

// ── Modale foto ───────────────────────────────────────────────

function openModal(p) {
  document.getElementById('modalPhoto').src = getImagePath(p.lastName);
  document.getElementById('modalPhoto').alt = `${p.lastName} ${p.firstName}`;
  document.getElementById('modalName').textContent    = `${p.lastName} ${p.firstName}`;
  document.getElementById('modalCompany').textContent = p.company;
  document.getElementById('modalRole').textContent    = p.role;

  const expSection   = document.getElementById('modalExperienceSection');
  const expContainer = document.getElementById('modalExperience');
  expContainer.innerHTML = '';
  if (p.experience && p.experience.length > 0) {
    p.experience.forEach(exp => {
      const group = document.createElement('div');
      group.className = 'modal-exp-group';
      const rolesHtml = exp.roles.map(r => `
        <div class="modal-exp-role-item">
          <div class="modal-exp-role">${r.role}</div>
          <div class="modal-exp-period">${r.period}</div>
        </div>
      `).join('');
      group.innerHTML = `<div class="modal-exp-company">${exp.company}</div>${rolesHtml}`;
      expContainer.appendChild(group);
    });
    expSection.style.display = '';
  } else {
    expSection.style.display = 'none';
  }

  document.getElementById('modalInfo').scrollTop = 0;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ── Event listeners ───────────────────────────────────────────

document.getElementById('modalOverlay').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', e => { e.stopPropagation(); closeModal(); });

document.getElementById('participantsList').addEventListener('click', e => {
  const modalTrigger = e.target.closest('.avatar, .participant-info');
  if (modalTrigger) {
    const card = modalTrigger.closest('.participant-card');
    if (card) {
      const p = participants.find(p => p.id === Number(card.dataset.id));
      if (p) openModal(p);
    }
    return;
  }
  const toggle = e.target.closest('.toggle-switch');
  if (!toggle) return;
  const card = toggle.closest('.participant-card');
  if (card) togglePresence(Number(card.dataset.id));
});

document.getElementById('filterSelect').addEventListener('change', function () {
  state.filter = this.value;
  renderList();
});

document.querySelector('.sort-group').addEventListener('click', e => {
  const chip = e.target.closest('[data-sort]');
  if (!chip) return;
  state.sort = chip.dataset.sort;
  document.querySelectorAll('.sort-group [data-sort]').forEach(c => c.classList.toggle('active', c === chip));
  renderList();
});

// ── Init: carica i dati e avvia ───────────────────────────────

fetch('participants.json')
  .then(r => r.json())
  .then(data => {
    participants = data;
    loadPresence();
    renderList();
    document.getElementById('presentCount').textContent = state.presence.size;
  });
