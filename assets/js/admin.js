// HTML kacis (XSS koruması): kullanıcı/admin verisini innerHTML'e basmadan once temizler
function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// Admin Panel Logic for ist3Dye.com

// ================= DEFAULT DATA =================
const DEFAULT_WORKING_HOURS = {
  mode: 'auto',
  weekdayStart: '09:00',
  weekdayEnd: '19:00',
  saturdayStart: '10:00',
  saturdayEnd: '16:00',
  sundayOpen: false,
  sundayStart: '10:00',
  sundayEnd: '16:00',
  activeNote: 'Genellikle 15 dakika içinde yanıt verilir',
  passiveNote: 'Şu an mesai dışı • Mesajınızı iletebilirsiniz, ilk mesaide yanıtlanır'
};

const DEFAULT_CONFIG = {
  adminUsername: 'Rıfatcan',
  adminPassword: '123Rifatcan.123',
  baseSetupFee: 35,
  baseGramPrice: 2.4,
  minOrderPrice: 65,
  discount5: 10,
  discount10: 15,
  whatsappPhone: '905000000000',
  contactEmail: 'teklif@ist3dye.com',
  workshopAddress: 'İstanbul / Bahçelievler, Türkiye',
  workingHours: { ...DEFAULT_WORKING_HOURS }
};

const DEFAULT_MATERIALS = [
  { id: 'pla', name: 'PLA Standart', rate: 1.0, desc: 'Ekonomik & Çevre Dostu - Dekoratif ve Prototip' },
  { id: 'petg', name: 'PETG Dayanıklı', rate: 1.25, desc: 'Yüksek Mukavemet & Kimyasal ve Dış Ortam Direnci' },
  { id: 'abs', name: 'ABS Endüstriyel', rate: 1.35, desc: 'Sıcaklığa ve Darbeye Dirençli Fonksiyonel Parça' },
  { id: 'asa', name: 'ASA Filament', rate: 1.40, desc: 'UV & Dış Hava Şartlarına Ultra Dayanıklı Endüstriyel' },
  { id: 'tpu', name: 'TPU Esnek', rate: 1.60, desc: 'Kauçuk benzeri, bükülebilir ve kırılmaz esnek parça' }
];

const DEFAULT_GALLERY = [
  {
    id: 1,
    title: 'Yüksek Torklu Helisel Dişli',
    category: 'muhendislik',
    material: 'PETG - %60 Infill',
    specs: 'Baskı Süresi: 6 Saat | Katman: 0.16 mm',
    desc: 'Özel paketleme makinesi için aşınmaya ve yüksek torka dayanıklı yedek parça üretimi.'
  },
  {
    id: 2,
    title: 'Yüksek Çözünürlüklü Karakter Modeli',
    category: 'figur',
    material: 'Hassas PLA+',
    specs: 'Baskı Süresi: 9 Saat | Katman: 0.12 mm',
    desc: 'Özel destek yapıları ve 0.12mm ince katman yüksekliği ile hassas FDM yüzey kalitesi.'
  },
  {
    id: 3,
    title: '1:100 Ölçekli Konut Projesi',
    category: 'mimari',
    material: 'Mat Beyaz PLA+',
    specs: 'Baskı Süresi: 18 Saat | Katman: 0.16 mm',
    desc: 'Mimarlık ofisi sunumu için modüler olarak basılıp birleştirilen detaylı bina maketi.'
  },
  {
    id: 4,
    title: 'IoT Cihaz Muhafazası (Enclosure)',
    category: 'prototip',
    material: 'ABS Dayanıklı',
    specs: 'Baskı Süresi: 4.5 Saat | Katman: 0.20 mm',
    desc: 'Pirinç dişli soket eklemeli, geçmeli kapak sistemine sahip elektronik kutusu prototipi.'
  },
  {
    id: 5,
    title: 'FPV Drone Titreşim Sönümleyici',
    category: 'muhendislik',
    material: 'TPU Esnek',
    specs: 'Baskı Süresi: 3 Saat | Katman: 0.20 mm',
    desc: 'Düşmelere ve titreşime karşı kırılmaz, esnek kauçuksu TPU filament ile basılmış kamera yuvası.'
  },
  {
    id: 6,
    title: 'Parametrik Geometrik Vazo',
    category: 'figur',
    material: 'Silk Bronz PLA',
    specs: 'Baskı Süresi: 5 Saat | Katman: 0.24 mm',
    desc: 'İpek parlaklığında bronz filament ile tek parça spiral vazo modu üretimi.'
  }
];

// LocalStorage Helpers
function getConfig() {
  const saved = localStorage.getItem('ist3dye_config');
  let config = { ...DEFAULT_CONFIG };
  if (saved) {
    try {
      config = { ...config, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Config parsing error:', e);
    }
  }

  config.workingHours = {
    ...DEFAULT_WORKING_HOURS,
    ...(config.workingHours || {})
  };

  // Automatically migrate legacy default credentials
  if (!config.adminUsername || config.adminUsername === 'admin') {
    config.adminUsername = 'Rıfatcan';
  }
  if (!config.adminPassword || config.adminPassword === 'admin') {
    config.adminPassword = '123Rifatcan.123';
  }

  return config;
}

function saveConfig(cfg) {
  localStorage.setItem('ist3dye_config', JSON.stringify(cfg));
}

function getMaterials() {
  const saved = localStorage.getItem('ist3dye_materials');
  return saved ? JSON.parse(saved) : DEFAULT_MATERIALS;
}

function saveMaterials(mats) {
  localStorage.setItem('ist3dye_materials', JSON.stringify(mats));
}

function getGallery() {
  const saved = localStorage.getItem('ist3dye_gallery');
  return saved ? JSON.parse(saved) : DEFAULT_GALLERY;
}

function saveGallery(gal) {
  localStorage.setItem('ist3dye_gallery', JSON.stringify(gal));
}

// Helper: Normalize username for Turkish character flexibility (i/ı, casing)
function normalizeUsername(str) {
  return (str || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/i/g, 'ı');
}

// ================= DOM ELEMENTS & EVENTS =================
document.addEventListener('DOMContentLoaded', () => {

  const loginScreen = document.getElementById('loginScreen');
  const adminDashboard = document.getElementById('adminDashboard');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminUsernameInput = document.getElementById('adminUsernameInput');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');

  // Rate-limiting / Failed attempt tracking
  let failedAttempts = parseInt(sessionStorage.getItem('ist3dye_failed_attempts') || '0', 10);
  let lockUntil = parseInt(sessionStorage.getItem('ist3dye_lock_until') || '0', 10);

  function isLocked() {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      const remainingSec = Math.ceil((lockUntil - now) / 1000);
      loginError.textContent = `Çok fazla hatalı deneme yapıldı. Lütfen ${remainingSec} saniye bekleyin.`;
      loginError.classList.remove('hidden');
      return true;
    }
    return false;
  }

  // Check login state
  if (sessionStorage.getItem('ist3dye_logged_in') === 'true') {
    showDashboard();
  }

  // Toggle Password View
  togglePasswordVisibility?.addEventListener('click', () => {
    const isPassword = adminPasswordInput.type === 'password';
    adminPasswordInput.type = isPassword ? 'text' : 'password';
  });

  // Login Form Submit
  adminLoginForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    if (isLocked()) return;

    const enteredUser = (adminUsernameInput?.value || '').trim();
    const enteredPass = (adminPasswordInput?.value || '').trim();
    const cfg = getConfig();

    const expectedUser = (cfg.adminUsername || 'Rıfatcan').trim();
    const expectedPass = (cfg.adminPassword || '123Rifatcan.123').trim();

    // Check username (case-insensitive & Turkish character tolerant)
    const isUserValid = normalizeUsername(enteredUser) === normalizeUsername(expectedUser) ||
                        normalizeUsername(enteredUser) === normalizeUsername('Rıfatcan');

    // Check password (allows configured password or master password)
    const isPassValid = enteredPass === expectedPass || enteredPass === '123Rifatcan.123';

    if (isUserValid && isPassValid) {
      // Login Success
      sessionStorage.setItem('ist3dye_logged_in', 'true');
      sessionStorage.removeItem('ist3dye_failed_attempts');
      sessionStorage.removeItem('ist3dye_lock_until');
      failedAttempts = 0;
      lockUntil = 0;
      loginError.classList.add('hidden');
      showDashboard();
    } else {
      // Login Failed
      failedAttempts++;
      sessionStorage.setItem('ist3dye_failed_attempts', failedAttempts.toString());

      if (failedAttempts >= 5) {
        lockUntil = Date.now() + 30000; // 30 sec lock
        sessionStorage.setItem('ist3dye_lock_until', lockUntil.toString());
        loginError.textContent = '5 kez hatalı giriş yapıldı. Güvenlik nedeniyle sistem 30 saniye kilitlendi.';
      } else {
        loginError.textContent = `Hatalı kullanıcı adı veya şifre! (Kalan deneme hakkı: ${5 - failedAttempts})`;
      }
      loginError.classList.remove('hidden');
    }
  });

  // Logout
  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem('ist3dye_logged_in');
    adminDashboard.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    if (adminUsernameInput) adminUsernameInput.value = '';
    if (adminPasswordInput) adminPasswordInput.value = '';
    loginError.classList.add('hidden');
  });

  function showDashboard() {
    loginScreen.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    loadAllAdminData();
    syncWithServerConfig();
    lucide.createIcons();
  }

  async function syncWithServerConfig() {
    try {
      const res = await fetch('data/config.json?v=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        const localCfg = getConfig();
        if (data.pricing && data.contact) {
          const merged = {
            ...localCfg,
            ...data.pricing,
            ...data.contact,
            workingHours: { ...DEFAULT_WORKING_HOURS, ...(data.workingHours || {}) }
          };
          saveConfig(merged);
        }
        if (data.materials && !localStorage.getItem('ist3dye_materials')) {
          saveMaterials(data.materials);
        }
        if (data.gallery && !localStorage.getItem('ist3dye_gallery')) {
          saveGallery(data.gallery);
        }
        loadAllAdminData();
      }
    } catch (e) {
      console.warn('Server config sync notice:', e);
    }
  }

  // Tabs Switcher
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active', 'bg-brand-600', 'text-white');
        b.classList.add('bg-slate-900', 'text-slate-300');
      });
      btn.classList.add('active', 'bg-brand-600', 'text-white');
      btn.classList.remove('bg-slate-900', 'text-slate-300');

      const target = btn.getAttribute('data-tab');
      tabContents.forEach(c => c.classList.add('hidden'));
      document.getElementById(`tab-${target}`).classList.remove('hidden');
      lucide.createIcons();
    });
  });

  // Load all data into inputs
  function loadAllAdminData() {
    const cfg = getConfig();
    document.getElementById('cfgBaseSetupFee').value = cfg.baseSetupFee;
    document.getElementById('cfgBaseGramPrice').value = cfg.baseGramPrice;
    document.getElementById('cfgMinOrderPrice').value = cfg.minOrderPrice;
    document.getElementById('cfgDiscount5').value = cfg.discount5;
    document.getElementById('cfgDiscount10').value = cfg.discount10;

    document.getElementById('cfgWhatsappPhone').value = cfg.whatsappPhone;
    document.getElementById('cfgContactEmail').value = cfg.contactEmail;
    document.getElementById('cfgWorkshopAddress').value = cfg.workshopAddress;

    if (document.getElementById('cfgAdminUsername')) {
      document.getElementById('cfgAdminUsername').value = cfg.adminUsername || 'Rıfatcan';
    }

    // Working Hours & Support Status
    const wh = cfg.workingHours || DEFAULT_WORKING_HOURS;
    const mode = wh.mode || 'auto';

    document.querySelectorAll('input[name="workingMode"]').forEach(radio => {
      radio.checked = (radio.value === mode);
    });
    updateWorkingHoursModeUI(mode);

    if (document.getElementById('cfgWeekdayStart')) document.getElementById('cfgWeekdayStart').value = wh.weekdayStart || '09:00';
    if (document.getElementById('cfgWeekdayEnd')) document.getElementById('cfgWeekdayEnd').value = wh.weekdayEnd || '19:00';
    if (document.getElementById('cfgSaturdayStart')) document.getElementById('cfgSaturdayStart').value = wh.saturdayStart || '10:00';
    if (document.getElementById('cfgSaturdayEnd')) document.getElementById('cfgSaturdayEnd').value = wh.saturdayEnd || '16:00';
    if (document.getElementById('cfgSundayOpen')) document.getElementById('cfgSundayOpen').checked = !!wh.sundayOpen;
    if (document.getElementById('cfgSundayStart')) document.getElementById('cfgSundayStart').value = wh.sundayStart || '10:00';
    if (document.getElementById('cfgSundayEnd')) document.getElementById('cfgSundayEnd').value = wh.sundayEnd || '16:00';
    if (document.getElementById('cfgActiveNote')) document.getElementById('cfgActiveNote').value = wh.activeNote || 'Genellikle 15 dakika içinde yanıt verilir';
    if (document.getElementById('cfgPassiveNote')) document.getElementById('cfgPassiveNote').value = wh.passiveNote || 'Şu an mesai dışı • Mesajınızı iletebilirsiniz, ilk mesaide yanıtlanır';

    renderMaterialsTable();
    renderGalleryGrid();
  }

  // ================= TAB 1: PRICING SAVE =================
  document.getElementById('savePricingBtn')?.addEventListener('click', () => {
    const cfg = getConfig();
    cfg.baseSetupFee = parseFloat(document.getElementById('cfgBaseSetupFee').value) || 35;
    cfg.baseGramPrice = parseFloat(document.getElementById('cfgBaseGramPrice').value) || 2.4;
    cfg.minOrderPrice = parseFloat(document.getElementById('cfgMinOrderPrice').value) || 65;
    cfg.discount5 = parseFloat(document.getElementById('cfgDiscount5').value) || 10;
    cfg.discount10 = parseFloat(document.getElementById('cfgDiscount10').value) || 15;

    saveConfig(cfg);

    const notice = document.getElementById('pricingSaveNotice');
    notice.classList.remove('hidden');
    setTimeout(() => notice.classList.add('hidden'), 3000);
  });

  // ================= TAB 2: MATERIALS =================
  function renderMaterialsTable() {
    const materials = getMaterials();
    const tbody = document.getElementById('materialsTableBody');
    tbody.innerHTML = '';

    materials.forEach((mat, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-950/60 transition-colors';
      tr.innerHTML = `
        <td class="px-4 py-3 font-semibold text-white">${escapeHtml(mat.name)}</td>
        <td class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono font-bold">${escapeHtml(mat.rate)}x</span></td>
        <td class="px-4 py-3 text-slate-400">${escapeHtml(mat.desc)}</td>
        <td class="px-4 py-3 text-right">
          <button class="delete-mat-btn text-red-400 hover:text-red-300 p-1.5 rounded bg-red-500/10 hover:bg-red-500/20" data-idx="${idx}">
            Sil
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.delete-mat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        if (confirm('Bu malzemeyi silmek istediğinizden emin misiniz?')) {
          const mats = getMaterials();
          mats.splice(idx, 1);
          saveMaterials(mats);
          renderMaterialsTable();
        }
      });
    });
  }

  // Material Modal
  const materialModal = document.getElementById('materialModal');
  document.getElementById('openNewMaterialModalBtn')?.addEventListener('click', () => {
    materialModal.classList.remove('hidden');
  });

  document.getElementById('saveNewMaterialBtn')?.addEventListener('click', () => {
    const name = document.getElementById('newMatName').value.trim();
    const rate = parseFloat(document.getElementById('newMatRate').value) || 1.0;
    const desc = document.getElementById('newMatDesc').value.trim();

    if (!name) {
      alert('Lütfen malzeme adını girin.');
      return;
    }

    const mats = getMaterials();
    mats.push({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: name,
      rate: rate,
      desc: desc || 'Özel Malzeme'
    });
    saveMaterials(mats);
    renderMaterialsTable();

    // Reset and close
    document.getElementById('newMatName').value = '';
    document.getElementById('newMatDesc').value = '';
    materialModal.classList.add('hidden');
  });

  // ================= TAB 3: GALLERY =================
  function renderGalleryGrid() {
    const gallery = getGallery();
    const grid = document.getElementById('adminGalleryList');
    grid.innerHTML = '';

    gallery.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-medium capitalize">${escapeHtml(item.category)}</span>
          <button class="delete-gal-btn text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10" data-idx="${idx}">
            Sil
          </button>
        </div>
        <h4 class="text-sm font-bold text-white">${escapeHtml(item.title)}</h4>
        <p class="text-xs text-slate-400 line-clamp-2">${escapeHtml(item.desc)}</p>
        <div class="text-[11px] text-slate-500 border-t border-slate-800 pt-2 space-y-1">
          <p class="text-emerald-400 font-mono">${escapeHtml(item.material)}</p>
          <p>${escapeHtml(item.specs)}</p>
        </div>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll('.delete-gal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        if (confirm('Bu vitrin baskısını silmek istediğinize emin misiniz?')) {
          const gal = getGallery();
          gal.splice(idx, 1);
          saveGallery(gal);
          renderGalleryGrid();
        }
      });
    });
  }

  // Gallery Modal
  const galleryModal = document.getElementById('galleryModal');
  document.getElementById('openNewGalleryModalBtn')?.addEventListener('click', () => {
    galleryModal.classList.remove('hidden');
  });

  document.getElementById('saveNewGalleryBtn')?.addEventListener('click', () => {
    const title = document.getElementById('newGalTitle').value.trim();
    const cat = document.getElementById('newGalCategory').value;
    const mat = document.getElementById('newGalMaterial').value.trim() || 'Özel Malzeme';
    const specs = document.getElementById('newGalSpecs').value.trim() || 'Hassas Katman';
    const desc = document.getElementById('newGalDesc').value.trim() || '3D Baskı örneği.';

    if (!title) {
      alert('Lütfen bir başlık girin.');
      return;
    }

    const gal = getGallery();
    gal.unshift({
      id: Date.now(),
      title,
      category: cat,
      material: mat,
      specs,
      desc
    });
    saveGallery(gal);
    renderGalleryGrid();

    // Reset and close
    document.getElementById('newGalTitle').value = '';
    document.getElementById('newGalMaterial').value = '';
    document.getElementById('newGalSpecs').value = '';
    document.getElementById('newGalDesc').value = '';
    galleryModal.classList.add('hidden');
  });

  // Modal Closes
  document.querySelectorAll('.closeModalBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      materialModal.classList.add('hidden');
      galleryModal.classList.add('hidden');
    });
  });

  // ================= TAB 4: GENERAL & SECURITY =================
  document.getElementById('saveGeneralSettingsBtn')?.addEventListener('click', () => {
    const cfg = getConfig();
    const phone = document.getElementById('cfgWhatsappPhone').value.trim();
    const email = document.getElementById('cfgContactEmail').value.trim();
    const address = document.getElementById('cfgWorkshopAddress').value.trim();
    const newUsername = document.getElementById('cfgAdminUsername')?.value.trim();
    const newPass = document.getElementById('cfgNewAdminPassword').value.trim();

    if (phone) cfg.whatsappPhone = phone;
    if (email) cfg.contactEmail = email;
    if (address) cfg.workshopAddress = address;

    let changes = [];

    if (newUsername && newUsername !== cfg.adminUsername) {
      cfg.adminUsername = newUsername;
      changes.push(`Kullanıcı Adı: "${newUsername}"`);
    }

    if (newPass) {
      cfg.adminPassword = newPass;
      changes.push(`Şifre başarıyla güncellendi`);
      document.getElementById('cfgNewAdminPassword').value = '';
    }

    saveConfig(cfg);

    if (changes.length > 0) {
      alert('Yönetici güvenlik bilgileri güncellendi:\n' + changes.join('\n'));
    }

    const notice = document.getElementById('generalSaveNotice');
    notice.classList.remove('hidden');
    setTimeout(() => notice.classList.add('hidden'), 3000);
  });

  // ================= TAB: WORKING HOURS & LIVE SUPPORT =================
  function updateWorkingHoursModeUI(selectedMode) {
    const cardAuto = document.getElementById('modeCardAuto');
    const cardActive = document.getElementById('modeCardActive');
    const cardPassive = document.getElementById('modeCardPassive');

    // Reset base styles
    [cardAuto, cardActive, cardPassive].forEach(c => {
      if (!c) return;
      c.classList.remove(
        'border-brand-500', 'bg-brand-500/10', 'ring-1', 'ring-brand-500',
        'border-emerald-500', 'bg-emerald-500/10', 'ring-emerald-500',
        'border-rose-500', 'bg-rose-500/10', 'ring-rose-500'
      );
      c.classList.add('border-slate-800', 'bg-slate-950/80');
    });

    let effectiveActive = false;

    if (selectedMode === 'manual_active') {
      effectiveActive = true;
      if (cardActive) {
        cardActive.classList.remove('border-slate-800', 'bg-slate-950/80');
        cardActive.classList.add('border-emerald-500', 'bg-emerald-500/10', 'ring-1', 'ring-emerald-500');
      }
    } else if (selectedMode === 'manual_passive') {
      effectiveActive = false;
      if (cardPassive) {
        cardPassive.classList.remove('border-slate-800', 'bg-slate-950/80');
        cardPassive.classList.add('border-rose-500', 'bg-rose-500/10', 'ring-1', 'ring-rose-500');
      }
    } else {
      // Auto mode
      if (cardAuto) {
        cardAuto.classList.remove('border-slate-800', 'bg-slate-950/80');
        cardAuto.classList.add('border-brand-500', 'bg-brand-500/10', 'ring-1', 'ring-brand-500');
      }

      // Check current Istanbul time
      const now = new Date();
      const trTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      const day = trTime.getDay();
      const currentTime = trTime.getHours() + trTime.getMinutes() / 60;
      
      const wh = getConfig().workingHours || DEFAULT_WORKING_HOURS;
      function parseH(str, def) {
        if (!str) return def;
        const p = str.split(':');
        return (parseInt(p[0], 10) || def) + (parseInt(p[1], 10) || 0) / 60;
      }
      const wStart = parseH(wh.weekdayStart, 9.0);
      const wEnd = parseH(wh.weekdayEnd, 19.0);
      const sStart = parseH(wh.saturdayStart, 10.0);
      const sEnd = parseH(wh.saturdayEnd, 16.0);
      const suStart = parseH(wh.sundayStart, 10.0);
      const suEnd = parseH(wh.sundayEnd, 16.0);

      if (day >= 1 && day <= 5 && currentTime >= wStart && currentTime < wEnd) {
        effectiveActive = true;
      } else if (day === 6 && currentTime >= sStart && currentTime < sEnd) {
        effectiveActive = true;
      } else if (day === 0 && wh.sundayOpen && currentTime >= suStart && currentTime < suEnd) {
        effectiveActive = true;
      } else {
        effectiveActive = false;
      }
    }

    const previewDot = document.getElementById('previewDot');
    const previewTitle = document.getElementById('previewTitle');

    if (previewDot) {
      if (effectiveActive) {
        previewDot.innerHTML = `
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        `;
      } else {
        previewDot.innerHTML = `
          <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.95)]"></span>
        `;
      }
    }

    if (previewTitle) {
      if (effectiveActive) {
        previewTitle.textContent = selectedMode === 'manual_active' ? 'Canlı Destek Zorla Aktif (Yeşil)' : 'Canlı Destek Aktif (Yeşil)';
        previewTitle.className = 'text-xs font-bold text-emerald-400';
      } else {
        previewTitle.textContent = selectedMode === 'manual_passive' ? 'Canlı Destek Zorla Pasif (Kırmızı)' : 'Canlı Destek Pasif (Kırmızı)';
        previewTitle.className = 'text-xs font-bold text-rose-400';
      }
    }
  }

  // Click card to select radio
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updateWorkingHoursModeUI(radio.value);
      }
    });
  });

  document.querySelectorAll('input[name="workingMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateWorkingHoursModeUI(radio.value);
    });
  });

  function getWorkingHoursFromForm() {
    const selectedMode = document.querySelector('input[name="workingMode"]:checked')?.value || 'auto';
    return {
      mode: selectedMode,
      weekdayStart: document.getElementById('cfgWeekdayStart')?.value || '09:00',
      weekdayEnd: document.getElementById('cfgWeekdayEnd')?.value || '19:00',
      saturdayStart: document.getElementById('cfgSaturdayStart')?.value || '10:00',
      saturdayEnd: document.getElementById('cfgSaturdayEnd')?.value || '16:00',
      sundayOpen: !!document.getElementById('cfgSundayOpen')?.checked,
      sundayStart: document.getElementById('cfgSundayStart')?.value || '10:00',
      sundayEnd: document.getElementById('cfgSundayEnd')?.value || '16:00',
      activeNote: document.getElementById('cfgActiveNote')?.value.trim() || 'Genellikle 15 dakika içinde yanıt verilir',
      passiveNote: document.getElementById('cfgPassiveNote')?.value.trim() || 'Şu an mesai dışı • Mesajınızı iletebilirsiniz, ilk mesaide yanıtlanır'
    };
  }

  // Save Working Hours Locally
  document.getElementById('saveWorkingHoursBtn')?.addEventListener('click', () => {
    const cfg = getConfig();
    cfg.workingHours = getWorkingHoursFromForm();
    saveConfig(cfg);

    const notice = document.getElementById('workingHoursSaveNotice');
    if (notice) {
      notice.classList.remove('hidden');
      setTimeout(() => notice.classList.add('hidden'), 3500);
    }
    updateWorkingHoursModeUI(cfg.workingHours.mode);
  });

  // ================= SHARED GITHUB PUBLISHER =================
  async function publishConfigToGitHub(commitMessage = 'Admin Panel: Yapılandırma güncellendi') {
    const githubTokenInput = document.getElementById('cfgGithubToken');
    const token = githubTokenInput?.value.trim() || localStorage.getItem('ist3dye_github_token');
    if (!token) {
      return {
        success: false,
        noToken: true,
        error: 'GitHub Access Token bulunamadı. Lütfen "Canlıya Yayınla" sekmesinden tokenınızı bir defaya mahsus kaydedin.'
      };
    }

    const repo = 'rifatcan98/ist3dye';
    const filePath = 'data/config.json';
    const fullConfig = exportFullConfig();
    const contentStr = JSON.stringify(fullConfig, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(contentStr)));

    try {
      // 1. Get current SHA if exists
      let sha = '';
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      // 2. Put file
      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitMessage,
          content: base64Content,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        return { success: true };
      } else {
        const errData = await putRes.json();
        return { success: false, error: errData.message || 'Yetkilendirme veya yükleme başarısız oldu.' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'GitHub sunucusuna ulaşılamadı veya ağ bağlantısı koptu.' };
    }
  }

  // Publish from Working Hours tab directly
  document.getElementById('publishWorkingHoursBtn')?.addEventListener('click', async () => {
    // 1. Save locally first
    const cfg = getConfig();
    cfg.workingHours = getWorkingHoursFromForm();
    saveConfig(cfg);
    updateWorkingHoursModeUI(cfg.workingHours.mode);

    const btn = document.getElementById('publishWorkingHoursBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Canlıya Aktarılıyor...</span>
    `;

    const modeLabels = {
      'auto': 'Otomatik Mod 🤖',
      'manual_active': 'Zorla AKTİF 🟢',
      'manual_passive': 'Zorla PASİF 🔴'
    };

    const res = await publishConfigToGitHub(`Admin Panel: Çalışma saatleri ve canlı destek modu güncellendi (${cfg.workingHours.mode})`);
    btn.disabled = false;
    btn.innerHTML = originalText;
    if (window.lucide) lucide.createIcons();

    if (res && res.success) {
      alert(`✓ Başarıyla GitHub ve Cloudflare'e aktarıldı!\n\nSite yaklaşık 15-20 saniye içinde tüm dünyadaki ziyaretçiler için yeni canlı destek durumunu (${modeLabels[cfg.workingHours.mode] || cfg.workingHours.mode}) gösterecektir.`);
    } else if (res && res.noToken) {
      alert(res.error);
      const publishTabBtn = document.querySelector('.tab-btn[data-tab="yayinla"]');
      if (publishTabBtn) publishTabBtn.click();
      document.getElementById('cfgGithubToken')?.focus();
    } else if (res && !res.success) {
      alert('Yayınlama hatası: ' + res.error);
    }
  });

  // ================= TAB 5: CENTRALIZED CONFIG & PUBLISH =================
  const githubTokenInput = document.getElementById('cfgGithubToken');
  const btnSaveGithubToken = document.getElementById('btnSaveGithubToken');
  const btnPublishLive = document.getElementById('btnPublishLive');
  const publishStatus = document.getElementById('publishStatus');
  const btnDownloadConfig = document.getElementById('btnDownloadConfig');
  const btnCopyConfig = document.getElementById('btnCopyConfig');
  const copyNotice = document.getElementById('copyNotice');

  // Load saved token
  if (githubTokenInput) {
    githubTokenInput.value = localStorage.getItem('ist3dye_github_token') || '';
  }

  btnSaveGithubToken?.addEventListener('click', () => {
    const token = githubTokenInput.value.trim();
    if (token) {
      localStorage.setItem('ist3dye_github_token', token);
      alert('GitHub Token tarayıcınızda başarıyla kaydedildi.');
    } else {
      localStorage.removeItem('ist3dye_github_token');
      alert('GitHub Token kaldırıldı.');
    }
  });

  function exportFullConfig() {
    const cfg = getConfig();
    const mats = getMaterials();
    const gal = getGallery();

    return {
      pricing: {
        baseSetupFee: cfg.baseSetupFee,
        baseGramPrice: cfg.baseGramPrice,
        minOrderPrice: cfg.minOrderPrice,
        discount5: cfg.discount5,
        discount10: cfg.discount10
      },
      contact: {
        whatsappPhone: cfg.whatsappPhone,
        contactEmail: cfg.contactEmail,
        workshopAddress: cfg.workshopAddress
      },
      workingHours: cfg.workingHours || DEFAULT_WORKING_HOURS,
      materials: mats,
      gallery: gal
    };
  }

  // Publish to GitHub -> Cloudflare
  btnPublishLive?.addEventListener('click', async () => {
    const token = githubTokenInput?.value.trim() || localStorage.getItem('ist3dye_github_token');
    if (!token) {
      alert('Lütfen önce GitHub Access Token girin ve Kaydet butonuna basın.');
      githubTokenInput?.focus();
      return;
    }

    btnPublishLive.disabled = true;
    btnPublishLive.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>GitHub ve Cloudflare'e Aktarılıyor...</span>
    `;

    publishStatus.classList.remove('hidden');
    publishStatus.className = 'text-xs p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300';
    publishStatus.textContent = 'GitHub deposuna bağlanılıyor ve dosya hazırlanıyor...';

    const res = await publishConfigToGitHub('Admin Panel: Canlı fiyat, malzeme, saat ve vitrin yapılandırması güncellendi');

    btnPublishLive.disabled = false;
    btnPublishLive.innerHTML = `
      <i data-lucide="upload-cloud" class="w-4 h-4"></i>
      <span>Tüm Dünyaya Yayınla (Cloudflare Canlısı)</span>
    `;
    lucide.createIcons();

    if (res && res.success) {
      publishStatus.className = 'text-xs p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium space-y-1';
      publishStatus.innerHTML = `
        <p class="font-bold flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-4 h-4"></i> Başarıyla GitHub'a Aktarıldı!</p>
        <p class="text-[11px] text-slate-400">Cloudflare Pages yaklaşık 15-20 saniye içinde sitenizi otomatik olarak tüm dünyada güncelleyecektir.</p>
      `;
      lucide.createIcons();
    } else {
      publishStatus.className = 'text-xs p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium';
      publishStatus.textContent = 'Hata oluştu: ' + (res?.error || 'Yetkilendirme başarısız oldu.');
    }
  });

  // Download config.json
  btnDownloadConfig?.addEventListener('click', () => {
    const fullConfig = exportFullConfig();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullConfig, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'config.json');
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  });

  // Copy config JSON
  btnCopyConfig?.addEventListener('click', () => {
    const fullConfig = exportFullConfig();
    navigator.clipboard.writeText(JSON.stringify(fullConfig, null, 2)).then(() => {
      copyNotice.classList.remove('hidden');
      setTimeout(() => copyNotice.classList.add('hidden'), 2500);
    });
  });

});
