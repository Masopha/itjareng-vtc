/* ============================================================
   ITJARENG VTC — MAIN JAVASCRIPT v2
   All features: SPA nav, canvas BG, gallery, lightbox,
   video modal, multi-step form, JSON-driven selects
============================================================ */

'use strict';

/* ---- STATE ---- */
let DATA = null;
let currentStep = 1;
const TOTAL_STEPS = 4;
let lightboxIndex = 0;
let currentPage = 'home';

/* ============================================================
   BOOT — load JSON then init everything
============================================================ */
async function boot() {
  try {
    const res = await fetch('data/itjareng.json');
    if (!res.ok) throw new Error('fetch failed');
    DATA = await res.json();
  } catch (e) {
    console.warn('Could not load itjareng.json, using fallback data');
    DATA = fallbackData();
  }
  initAll();
}

function initAll() {
  initCanvas();
  renderStats();
  renderHomeProgramsPreview();
  renderProgramsPage();
  renderAvailabilityBanner();
  renderEnrollStatus();
  renderGalleryImages();
  renderGalleryVideos();
  renderStakeholders();
  populateDistricts();
  populateDisabilityTypes();
  populateProgramSelects();
  initFormEvents();
  updateStepper();
  navigate('home', false);
}

/* ============================================================
   SPA NAVIGATION
============================================================ */
function navigate(pageId, scroll = true) {
  currentPage = pageId;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  const link = document.querySelector(`.nav-links a[data-page="${pageId}"]`);
  if (link) link.classList.add('active');

  document.querySelector('.nav-links').classList.remove('open');

  // Canvas only visible on home
  const canvas = document.getElementById('bg-canvas');
  if (canvas) canvas.style.opacity = pageId === 'home' ? '1' : '0';

  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleNav() {
  document.querySelector('.nav-links').classList.toggle('open');
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.boxShadow = window.scrollY > 30 ? '0 4px 36px rgba(0,0,0,0.5)' : 'none';
});

/* ============================================================
   CANVAS BACKGROUND ANIMATION (Home only)
============================================================ */
function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const icons = ['⚙️','🪵','🧵','👜','🌱','💻','📚','🤟','🔨','📐','🔧','✂️','🌾','🏗️','🖥️','📏'];
  const particles = [];
  const lines = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 38; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      icon: icons[Math.floor(Math.random() * icons.length)],
      size: Math.random() * 20 + 10,
      sx: (Math.random() - 0.5) * 0.38,
      sy: (Math.random() - 0.5) * 0.38,
      opacity: Math.random() * 0.22 + 0.04,
      rot: Math.random() * Math.PI * 2,
      rotS: (Math.random() - 0.5) * 0.007,
      phase: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < 10; i++) {
    lines.push({
      x1: Math.random() * 1200, y1: Math.random() * 800,
      x2: Math.random() * 1200, y2: Math.random() * 800,
      sx1: (Math.random() - 0.5) * 0.28, sy1: (Math.random() - 0.5) * 0.28,
      sx2: (Math.random() - 0.5) * 0.28, sy2: (Math.random() - 0.5) * 0.28,
      opacity: Math.random() * 0.07 + 0.02
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    const gr = ctx.createRadialGradient(
      canvas.width / 2, canvas.height * 0.4, 0,
      canvas.width / 2, canvas.height * 0.4, canvas.width * 0.65
    );
    gr.addColorStop(0, 'rgba(30,77,140,0.09)');
    gr.addColorStop(1, 'rgba(7,21,41,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Hexagon grid
    const hs = 72;
    const ox = (frame * 0.08) % (hs * Math.sqrt(3));
    const oy = (frame * 0.05) % (hs * 1.5);
    ctx.strokeStyle = 'rgba(26,58,107,0.12)';
    ctx.lineWidth = 0.5;
    for (let r = -1; r < canvas.height / (hs * 1.5) + 2; r++) {
      for (let c = -1; c < canvas.width / (hs * Math.sqrt(3)) + 2; c++) {
        const cx = c * hs * Math.sqrt(3) + (r % 2) * hs * Math.sqrt(3) / 2 + ox;
        const cy = r * hs * 1.5 + oy;
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (Math.PI / 3) * s - Math.PI / 6;
          const px = cx + hs * 0.88 * Math.cos(a);
          const py = cy + hs * 0.88 * Math.sin(a);
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Moving lines
    lines.forEach(l => {
      l.x1 += l.sx1; l.y1 += l.sy1; l.x2 += l.sx2; l.y2 += l.sy2;
      if (l.x1 < 0 || l.x1 > canvas.width)  l.sx1 *= -1;
      if (l.y1 < 0 || l.y1 > canvas.height) l.sy1 *= -1;
      if (l.x2 < 0 || l.x2 > canvas.width)  l.sx2 *= -1;
      if (l.y2 < 0 || l.y2 > canvas.height) l.sy2 *= -1;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.strokeStyle = `rgba(201,168,76,${l.opacity})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    });

    // Icon particles
    particles.forEach(p => {
      p.x += p.sx; p.y += p.sy; p.rot += p.rotS; p.phase += 0.013;
      if (p.x < -60) p.x = canvas.width + 60;
      if (p.x > canvas.width + 60) p.x = -60;
      if (p.y < -60) p.y = canvas.height + 60;
      if (p.y > canvas.height + 60) p.y = -60;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.opacity + Math.sin(p.phase) * 0.07);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, 0);
      ctx.restore();
    });

    requestAnimationFrame(animate);
  }
  animate();
}

/* ============================================================
   RENDER: STATS BAR
============================================================ */
function renderStats() {
  const el = document.getElementById('stats-container');
  if (!el || !DATA.key_facts) return;
  el.innerHTML = DATA.key_facts.map((f, i) => `
    <div class="stat-item">
      <div class="stat-num" data-val="${f.value}">${f.value}</div>
      <div class="stat-lbl">${f.label}</div>
    </div>
    ${i < DATA.key_facts.length - 1 ? '<div class="stat-div"></div>' : ''}
  `).join('');

  const bar = document.querySelector('.stats-bar');
  if (bar) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { animateCounters(); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(bar);
  }
}

function animateCounters() {
  document.querySelectorAll('.stat-num[data-val]').forEach(el => {
    const raw = el.getAttribute('data-val');
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const suffix = raw.replace(/[\d.]/g, '');
    const dur = 1600, t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(e * num) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* ============================================================
   RENDER: HOME PROGRAMS PREVIEW
============================================================ */
function renderHomeProgramsPreview() {
  const el = document.getElementById('home-programs-grid');
  if (!el || !DATA.programs) return;
  el.innerHTML = DATA.programs
    .filter(p => p.name !== 'Computer Literacy')
    .slice(0, 6)
    .map(p => `
      <div class="mission-card">
        <div class="mission-icon-wrap">${p.icon}</div>
        <h3>${p.name}</h3>
        <p>${p.description.substring(0, 115)}…</p>
      </div>
    `).join('');
}

/* ============================================================
   RENDER: AVAILABILITY BANNER (Programs page)
============================================================ */
function renderAvailabilityBanner() {
  const el = document.getElementById('avail-chips');
  if (!el || !DATA.programs) return;
  el.innerHTML = DATA.programs
    .filter(p => p.name !== 'Computer Literacy')
    .map(p => `
      <div class="avail-chip open">
        <span class="chip-dot"></span>
        ${p.icon} ${p.name}
      </div>
    `).join('');
}

/* ============================================================
   RENDER: PROGRAMS PAGE GRID
============================================================ */
function renderProgramsPage() {
  const el = document.getElementById('programs-grid');
  if (!el || !DATA.programs) return;
  el.innerHTML = DATA.programs
    .filter(p => p.name !== 'Computer Literacy')
    .map(p => `
      <div class="prog-card">
        <div class="prog-icon-box">${p.icon}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="prog-skills">
          ${p.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
        <div class="prog-duration">⏱ ${p.duration} Residential Training</div>
      </div>
    `).join('');
}

/* ============================================================
   RENDER: ENROLLMENT STATUS on Register page
============================================================ */
function renderEnrollStatus() {
  const el = document.getElementById('enroll-chips');
  if (!el || !DATA.programs) return;
  el.innerHTML = DATA.programs
    .filter(p => p.name !== 'Computer Literacy')
    .map(p => `
      <div class="enroll-chip open">
        <span class="edot"></span>
        ${p.icon} ${p.name}
      </div>
    `).join('');
}

/* ============================================================
   RENDER: IMAGE GALLERY
============================================================ */
function renderGalleryImages() {
  const el = document.getElementById('img-gallery');
  if (!el || !DATA.gallery) return;
  el.innerHTML = DATA.gallery.images.map((img, i) => `
    <div class="img-item" onclick="openLightbox(${i})">
      <img src="${img.url}" alt="${img.title}" loading="lazy"/>
      <div class="img-caption">
        <span class="img-category">${img.category}</span>
        <strong>${img.title}</strong><br>${img.caption}
      </div>
    </div>
  `).join('');
}

/* ============================================================
   RENDER: VIDEO GALLERY
============================================================ */
function renderGalleryVideos() {
  const el = document.getElementById('video-gallery');
  if (!el || !DATA.gallery) return;
  el.innerHTML = DATA.gallery.videos.map(v => `
    <div class="video-card" onclick="openVideoModal('${v.youtube_id}','${escHtml(v.title)}')">
      <div class="video-thumb">
        <img src="https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg" alt="${v.title}" loading="lazy"/>
        <div class="video-play-btn">
          <div class="play-circle">▶</div>
        </div>
        <div class="video-duration">${v.duration}</div>
        <div class="video-cat">${v.category}</div>
      </div>
      <div class="video-info">
        <h3>${v.title}</h3>
        <p>${v.description}</p>
      </div>
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ============================================================
   LIGHTBOX
============================================================ */
function openLightbox(index) {
  lightboxIndex = index;
  updateLightbox();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightbox() {
  if (!DATA.gallery) return;
  const img = DATA.gallery.images[lightboxIndex];
  document.getElementById('lb-img').src             = img.url;
  document.getElementById('lb-img').alt             = img.title;
  document.getElementById('lb-title').textContent   = img.title;
  document.getElementById('lb-caption').textContent = img.caption;
}

function lightboxPrev() {
  const len = DATA.gallery.images.length;
  lightboxIndex = (lightboxIndex - 1 + len) % len;
  updateLightbox();
}

function lightboxNext() {
  const len = DATA.gallery.images.length;
  lightboxIndex = (lightboxIndex + 1) % len;
  updateLightbox();
}

document.addEventListener('click', e => {
  const lb = document.getElementById('lightbox');
  if (lb && e.target === lb) closeLightbox();
});

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (lb && lb.classList.contains('open')) {
    if (e.key === 'ArrowLeft')  lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
    if (e.key === 'Escape')     closeLightbox();
  }
  const vm = document.getElementById('video-modal');
  if (vm && vm.classList.contains('open') && e.key === 'Escape') closeVideoModal();
});

/* ============================================================
   VIDEO MODAL
============================================================ */
function openVideoModal(youtubeId, title) {
  const modal   = document.getElementById('video-modal');
  const iframe  = document.getElementById('vm-iframe');
  const titleEl = document.getElementById('vm-title');
  iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
  titleEl.textContent = title;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  const modal  = document.getElementById('video-modal');
  const iframe = document.getElementById('vm-iframe');
  iframe.src = '';
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  const vm = document.getElementById('video-modal');
  if (vm && e.target === vm) closeVideoModal();
});

/* ============================================================
   RENDER: STAKEHOLDERS (About page)
============================================================ */
function renderStakeholders() {
  const el = document.getElementById('stakeholders-list');
  if (!el || !DATA.stakeholders) return;
  el.innerHTML = DATA.stakeholders.map(s => `
    <div class="stk-chip">
      <span class="stk-dot"></span>
      <div>
        <div class="stk-name">${s.name}</div>
        <div class="stk-role">${s.role}</div>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   POPULATE FORM SELECTS FROM JSON
============================================================ */
function populateDistricts() {
  const el = document.getElementById('district');
  if (!el || !DATA.districts) return;
  el.innerHTML = '<option value="">-- Select District --</option>' +
    DATA.districts.map(d => `<option value="${d}">${d}</option>`).join('');
}

function populateDisabilityTypes() {
  const el = document.getElementById('disability_type');
  if (!el || !DATA.disability_types) return;
  el.innerHTML = '<option value="">-- Select Disability Type --</option>' +
    DATA.disability_types.map(d => `<option value="${d}">${d}</option>`).join('');
}

function populateProgramSelects() {
  if (!DATA.programs) return;
  const makeOpts = (includeEmpty) =>
    (includeEmpty ? '<option value="">-- Select Program --</option>' : '') +
    DATA.programs
      .filter(p => p.name !== 'Computer Literacy')
      .map(p => `<option value="${p.name}">${p.icon} ${p.name}</option>`)
      .join('');

  const p1 = document.getElementById('preferred_program');
  const p2 = document.getElementById('second_choice');
  if (p1) p1.innerHTML = makeOpts(true);
  if (p2) p2.innerHTML = '<option value="">-- No second choice --</option>' + makeOpts(false);
}

/* ============================================================
   MULTI-STEP FORM
============================================================ */
function initFormEvents() {
  document.querySelectorAll('.fg input, .fg select, .fg textarea').forEach(el => {
    el.addEventListener('input',  () => el.classList.remove('error'));
    el.addEventListener('change', () => el.classList.remove('error'));
  });
}

function updateStepper() {
  document.querySelectorAll('.step-btn').forEach((btn, i) => {
    const s = i + 1;
    btn.classList.remove('active', 'done');
    if (s === currentStep) btn.classList.add('active');
    if (s < currentStep)  btn.classList.add('done');
  });

  document.querySelectorAll('.fsec').forEach((sec, i) => {
    sec.classList.toggle('active', i + 1 === currentStep);
  });

  const bar = document.getElementById('step-progress-bar');
  if (bar) {
    const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    bar.style.width = pct + '%';
  }

  const prevBtn = document.getElementById('btn-prev');
  if (prevBtn) prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) {
    nextBtn.innerHTML = currentStep === TOTAL_STEPS
      ? '✓ Submit Application'
      : 'Continue <span>→</span>';
  }
}

function formNext() {
  if (!validateStep()) return;
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    updateStepper();
    const reg = document.getElementById('register');
    if (reg) reg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    submitApplication();
  }
}

function formPrev() {
  if (currentStep > 1) { currentStep--; updateStepper(); }
}

function validateStep() {
  const sec = document.querySelector('.fsec.active');
  if (!sec) return true;
  let valid = true;
  let firstInvalid = null;

  sec.querySelectorAll('[required]').forEach(f => {
    f.classList.remove('error');
    const val = f.type === 'checkbox' ? f.checked : f.value.trim();
    if (!val) {
      f.classList.add('error');
      valid = false;
      if (!firstInvalid) firstInvalid = f;
    }
  });

  if (!valid) {
    showToast('Please fill in all required fields.', 'error');
    if (firstInvalid) firstInvalid.focus();
  }
  return valid;
}

function submitApplication() {
  const form = document.getElementById('application-form');
  const fd   = new FormData(form);
  const data = {};
  fd.forEach((v, k) => { data[k] = v; });
  data.timestamp     = new Date().toISOString();
  data.applicationId = 'IVTC-' + Date.now().toString(36).toUpperCase();

  // Attach session user info if available
  try {
    if (window.IVTC_SESSION) {
      data.submittedByUserId = window.IVTC_SESSION.userId || null;
      data.submittedByUsername = window.IVTC_SESSION.username || null;
    }
  } catch (e) {}

  // Send to backend server
  fetch(window.API_BASE_URL + '/api/application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(response => {
    if (response.success) {
      // Backup to localStorage
      try {
        const prev = JSON.parse(localStorage.getItem('ivtc_applications') || '[]');
        prev.push(data);
        localStorage.setItem('ivtc_applications', JSON.stringify(prev));
      } catch (e) {}

      document.getElementById('form-wrap').style.display = 'none';
      const ss = document.getElementById('success-screen');
      ss.style.display = 'block';
      document.getElementById('app-ref-id').textContent = data.applicationId;

      showToast('Application submitted successfully!', 'success');
      currentStep = 1;
      form.reset();
    } else {
      showToast(response.message || 'Failed to submit application.', 'error');
    }
  })
  .catch(err => {
    console.error('Submit error:', err);
    showToast('Cannot connect to server. Make sure backend is running on port 3000', 'error');
  });
}

function resetApplicationForm() {
  document.getElementById('form-wrap').style.display = 'block';
  document.getElementById('success-screen').style.display = 'none';
  updateStepper();
}

/* ============================================================
   CONTACT FORM
============================================================ */
function submitContact(e) {
  e.preventDefault();
  const name = document.getElementById('c-name').value;
  showToast(`Thank you, ${name}! We'll get back to you soon.`, 'success');
  e.target.reset();
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg, type = 'info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.4s';
    setTimeout(() => t.remove(), 420);
  }, 4200);
}

/* ============================================================
   FALLBACK DATA (if JSON fails to load)
============================================================ */
function fallbackData() {
  return {
    institution: { name: 'Itjareng Vocational Training Centre', short_name: 'IVTC' },
    programs: [
      { id:1, name:'Metalwork & Welding',  icon:'⚙️', available:true, slots_remaining:8,  description:'Hands-on metal fabrication training.',           duration:'2 years', skills:['Welding','Fabrication'] },
      { id:2, name:'Carpentry & Joinery',  icon:'🪵', available:true, slots_remaining:5,  description:'Furniture making and woodworking.',               duration:'2 years', skills:['Furniture','Joinery'] },
      { id:3, name:'Leatherwork',          icon:'👜', available:true, slots_remaining:6,  description:'Leather crafts and products.',                    duration:'2 years', skills:['Cutting','Stitching'] },
      { id:4, name:'Sewing & Tailoring',   icon:'🧵', available:true, slots_remaining:3,  description:'Garment construction and design.',                duration:'2 years', skills:['Garments','Patterns'] },
      { id:5, name:'Agriculture',          icon:'🌱', available:true, slots_remaining:7,  description:'Piggery, chicken breeding, vegetable gardening.', duration:'2 years', skills:['Piggery','Gardening'] },
      { id:7, name:'Literacy & Numeracy',  icon:'📚', available:true, slots_remaining:10, description:'Reading, writing and maths.',                     duration:'2 years', skills:['Reading','Maths'] },
      { id:8, name:'Sign Language',        icon:'🤟', available:true, slots_remaining:4,  description:'Lesotho Sign Language training.',                 duration:'2 years', skills:['LSL','Communication'] }
    ],
    gallery: { images: [], videos: [] },
    key_facts: [
      { label:'Established',       value:'1986' },
      { label:'Students Served',   value:'400+' },
      { label:'Training Duration', value:'2 Years' },
      { label:'Registration Fee',  value:'M250' },
      { label:'Programs Offered',  value:'8 Vocational' },
      { label:'Max Capacity',      value:'70 Students' }
    ],
    stakeholders: [
      { name:'LNAPD',                           role:'Founding & Governing Body' },
      { name:'SMART Leadership Transformation', role:'Support Partner' },
      { name:'Basotho Educational Trust',       role:'UK Funding Partner' },
      { name:'Ministry of Education',           role:'Regulatory Authority' },
      { name:'LNFOD',                           role:'Disability Federation Partner' }
    ],
    disability_types: [
      'Physical Disability', 'Hearing Impairment', 'Intellectual Disability',
      'Mental Health Condition', 'Multiple Disabilities', 'Other'
    ],
    districts: [
      'Maseru', 'Berea', 'Leribe', 'Butha-Buthe', 'Mokhotlong',
      'Thaba-Tseka', "Qacha's Nek", 'Quthing', "Mohale's Hoek", 'Mafeteng'
    ]
  };
}

/* ============================================================
   START
============================================================ */
document.addEventListener('DOMContentLoaded', boot);