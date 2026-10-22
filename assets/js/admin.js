// Admin Panel Logic for ist3Dye.com

// ================= DEFAULT DATA =================
const DEFAULT_CONFIG = {
  adminUsername: 'admin',
  adminPassword: 'admin',
  baseSetupFee: 35,
  baseGramPrice: 2.4,
  minOrderPrice: 65,
  discount5: 10,
  discount10: 15,
  whatsappPhone: '905000000000',
  contactEmail: 'teklif@ist3dye.com',
  workshopAddress: 'İstanbul / Bahçelievler, Türkiye'
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
  if (!config.adminUsername) config.adminUsername = 'admin';
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

    const expectedUser = (cfg.adminUsername || 'admin').trim();
    const expectedPass = (cfg.adminPassword || 'admin').trim();

    if (enteredUser === expectedUser && enteredPass === expectedPass) {
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
    lucide.createIcons();
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
      document.getElementById('cfgAdminUsername').value = cfg.adminUsername || 'admin';
    }

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
        <td class="px-4 py-3 font-semibold text-white">${mat.name}</td>
        <td class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono font-bold">${mat.rate}x</span></td>
        <td class="px-4 py-3 text-slate-400">${mat.desc}</td>
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
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-medium capitalize">${item.category}</span>
          <button class="delete-gal-btn text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10" data-idx="${idx}">
            Sil
          </button>
        </div>
        <h4 class="text-sm font-bold text-white">${item.title}</h4>
        <p class="text-xs text-slate-400 line-clamp-2">${item.desc}</p>
        <div class="text-[11px] text-slate-500 border-t border-slate-800 pt-2 space-y-1">
          <p class="text-emerald-400 font-mono">${item.material}</p>
          <p>${item.specs}</p>
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

});
