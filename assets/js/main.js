// Main Application Logic for ist3Dye.com

document.addEventListener('DOMContentLoaded', () => {

  // ================= DYNAMIC CONFIG & STORAGE =================
  const DEFAULT_CONFIG = {
    baseSetupFee: 35,
    baseGramPrice: 2.4,
    minOrderPrice: 65,
    discount5: 10,
    discount10: 15,
    whatsappPhone: '905000000000',
    contactEmail: 'teklif@ist3dye.com',
    workshopAddress: 'İstanbul / Bahçelievler, Türkiye'
  };

  function getSiteConfig() {
    const saved = localStorage.getItem('ist3dye_config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  }

  // Material densities (g/cm³) for precise gram calculation
  const MATERIAL_DENSITIES = {
    'pla': 1.24,
    'petg': 1.27,
    'abs': 1.04,
    'asa': 1.07,
    'tpu': 1.21
  };

  // ================= STATE & CONFIG =================
  let currentModel = {
    name: 'Örnek Test Modeli',
    volumeCm3: 25,
    x: 64,
    y: 64,
    z: 18,
    triangles: 1440,
    format: 'DEMO',
    hasFile: false
  };

  let selectedInfill = 20; // default 20%

  // ================= ELEMENTS =================
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const resetCameraBtn = document.getElementById('resetCameraBtn');
  const wireframeToggleBtn = document.getElementById('wireframeToggleBtn');

  const materialSelect = document.getElementById('materialSelect');
  const qualitySelect = document.getElementById('qualitySelect');
  const colorSelect = document.getElementById('colorSelect');
  const qtyInput = document.getElementById('qtyInput');
  const decreaseQty = document.getElementById('decreaseQty');
  const increaseQty = document.getElementById('increaseQty');
  const userNote = document.getElementById('userNote');

  // Live Analysis Elements
  const calculatedPriceEl = document.getElementById('calculatedPrice');
  const quoteGramsEl = document.getElementById('quoteGrams');
  const quoteDimsEl = document.getElementById('quoteDims');
  const quoteTimeEl = document.getElementById('quoteTime');
  const quoteUnitPriceEl = document.getElementById('quoteUnitPrice');
  const modelStatusDot = document.getElementById('modelStatusDot');
  const modelStatusText = document.getElementById('modelStatusText');
  const modelFormatBadge = document.getElementById('modelFormatBadge');

  const infillLabel = document.getElementById('infillLabel');
  const infillBtns = document.querySelectorAll('.infill-btn');

  const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
  const openEmailModalBtn = document.getElementById('openEmailModalBtn');

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  // Load Custom Materials from Admin if configured
  function populateMaterialsFromStorage() {
    const saved = localStorage.getItem('ist3dye_materials');
    if (!saved) return;
    try {
      const mats = JSON.parse(saved);
      if (mats && mats.length > 0) {
        materialSelect.innerHTML = '';
        mats.forEach((m, idx) => {
          const opt = document.createElement('option');
          opt.value = m.id || m.name.toLowerCase();
          opt.setAttribute('data-rate', m.rate);
          opt.textContent = `${m.name} (${m.desc})`;
          if (idx === 0) opt.selected = true;
          materialSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Malzemeler okunamadı:', e);
    }
  }

  // Load Custom Gallery Items from Admin if configured
  function populateGalleryFromStorage() {
    const saved = localStorage.getItem('ist3dye_gallery');
    if (!saved) return;
    try {
      const items = JSON.parse(saved);
      const grid = document.getElementById('galleryGrid');
      if (grid && items && items.length > 0) {
        grid.innerHTML = '';
        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'gallery-item group relative rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden hover:border-brand-500/50 transition-all duration-300';
          div.setAttribute('data-category', item.category);
          div.innerHTML = `
            <div class="relative h-64 bg-slate-900 overflow-hidden flex items-center justify-center p-6">
              <i data-lucide="box" class="w-24 h-24 text-brand-500/80 group-hover:scale-110 transition-transform duration-500"></i>
              <span class="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur text-[11px] font-semibold text-brand-400 border border-slate-700 capitalize">${item.category}</span>
              <span class="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">${item.material}</span>
            </div>
            <div class="p-6 space-y-2">
              <h4 class="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">${item.title}</h4>
              <p class="text-xs text-slate-400 leading-relaxed">${item.desc}</p>
              <div class="pt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800">
                <span>${item.specs}</span>
              </div>
            </div>
          `;
          grid.appendChild(div);
        });
        lucide.createIcons();
      }
    } catch (e) {
      console.error('Galeri okunamadı:', e);
    }
  }

  populateMaterialsFromStorage();
  populateGalleryFromStorage();

  // ================= PRICE & WEIGHT CALCULATION =================
  function calculatePrice() {
    const cfg = getSiteConfig();
    const baseSetupFee = cfg.baseSetupFee || 35; // Makine hazırlık bedeli
    const baseGramPrice = cfg.baseGramPrice || 2.4; // Gram başı baz TL
    
    // Malzeme katsayısı ve yoğunluğu
    const selectedOption = materialSelect.options[materialSelect.selectedIndex];
    const materialMultiplier = parseFloat(selectedOption?.getAttribute('data-rate') || 1.0);
    const materialKey = (materialSelect.value || 'pla').toLowerCase();
    const density = MATERIAL_DENSITIES[materialKey] || 1.24;

    // Doluluk (Infill) katsayısı
    let infillMultiplier = 1.0;
    if (selectedInfill === 15) infillMultiplier = 0.92;
    else if (selectedInfill === 20) infillMultiplier = 1.0;
    else if (selectedInfill === 40) infillMultiplier = 1.35;
    else if (selectedInfill === 100) infillMultiplier = 2.2;

    // Katman kalitesi katsayısı
    const qualityVal = parseFloat(qualitySelect.value || 0.20);
    let qualityMultiplier = 1.0;
    if (qualityVal === 0.28) qualityMultiplier = 0.88;
    else if (qualityVal === 0.20) qualityMultiplier = 1.0;
    else if (qualityVal === 0.12) qualityMultiplier = 1.45;

    // Adet
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);

    // Gerçekçi Gramaj Hesabı:
    // Dış kabuklar (perimeters) ve taban/tavan katı kısımlar ~%25 pay alır, kalan %75 infill oranına göre ölçeklenir
    const infillRatio = 0.25 + (selectedInfill / 100) * 0.75;
    const rawGrams = currentModel.volumeCm3 * density * infillRatio;
    const estimatedGrams = Math.max(5, Math.round(rawGrams));

    // Baskı Süresi Tahmini:
    // Standart 0.20mm katmanda saatte ~22 gram basılır
    let speedPerHour = 22;
    if (qualityVal >= 0.28) speedPerHour = 32;
    else if (qualityVal <= 0.12) speedPerHour = 14;

    const totalHours = estimatedGrams / speedPerHour;
    const printHours = Math.floor(totalHours);
    const printMins = Math.round((totalHours - printHours) * 60);
    let printTimeText = '';
    if (printHours === 0) {
      printTimeText = `~${Math.max(20, printMins)} Dk`;
    } else if (printMins === 0) {
      printTimeText = `~${printHours} Saat`;
    } else {
      printTimeText = `~${printHours}s ${printMins}dk`;
    }

    // Birim Fiyat
    let unitPrice = baseSetupFee + (estimatedGrams * baseGramPrice * materialMultiplier * qualityMultiplier * infillMultiplier);
    unitPrice = Math.max(cfg.minOrderPrice || 65, Math.round(unitPrice));

    // Adet İndirimi
    let discount = 1.0;
    if (qty >= 10) discount = (100 - (cfg.discount10 || 15)) / 100;
    else if (qty >= 5) discount = (100 - (cfg.discount5 || 10)) / 100;

    const totalPrice = Math.round(unitPrice * qty * discount);

    // Update UI Elements
    if (calculatedPriceEl) calculatedPriceEl.textContent = `${totalPrice.toLocaleString('tr-TR')} ₺`;
    if (quoteGramsEl) quoteGramsEl.textContent = `~${estimatedGrams} gr`;
    if (quoteDimsEl) quoteDimsEl.textContent = `${currentModel.x}×${currentModel.y}×${currentModel.z} mm`;
    if (quoteTimeEl) quoteTimeEl.textContent = printTimeText;
    if (quoteUnitPriceEl) {
      const discountText = discount < 1 ? ` (%${Math.round((1 - discount) * 100)} İndirim)` : '';
      quoteUnitPriceEl.textContent = `${unitPrice} ₺ / adet${discountText}`;
    }

    if (modelStatusDot) {
      modelStatusDot.className = currentModel.hasFile 
        ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0'
        : 'w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0';
    }
    if (modelStatusText) {
      modelStatusText.textContent = currentModel.name;
    }
    if (modelFormatBadge) {
      modelFormatBadge.textContent = currentModel.format;
      modelFormatBadge.className = currentModel.hasFile
        ? 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold shrink-0'
        : 'text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono shrink-0';
    }

    return { unitPrice, totalPrice, estimatedGrams, printTimeText, qty };
  }

  // ================= 3D VIEWER HOOK =================
  window.triggerPriceUpdate = (data) => {
    if (typeof data === 'number') {
      currentModel.volumeCm3 = data;
      currentModel.hasFile = true;
    } else if (data) {
      currentModel.name = data.name || currentModel.name;
      currentModel.volumeCm3 = data.volumeCm3 || currentModel.volumeCm3;
      currentModel.x = data.x || currentModel.x;
      currentModel.y = data.y || currentModel.y;
      currentModel.z = data.z || currentModel.z;
      currentModel.triangles = data.triangles || currentModel.triangles;
      currentModel.format = data.format || 'STL';
      currentModel.hasFile = true;
    }
    calculatePrice();
  };

  // Color selection updates 3D model color
  const colorMap = {
    'Siyah': 0x1e293b,
    'Beyaz': 0xe2e8f0,
    'Gri': 0x64748b,
    'Kırmızı': 0xef4444,
    'Mavi': 0x3b82f6,
    'Turuncu': 0xf97316,
    'Özel': 0x06b6d4
  };

  colorSelect?.addEventListener('change', () => {
    const hex = colorMap[colorSelect.value] || 0x3b82f6;
    if (window.viewer3DInstance) {
      window.viewer3DInstance.updateMaterialColor(hex);
    }
  });

  // ================= FORM EVENTS =================
  materialSelect?.addEventListener('change', calculatePrice);
  qualitySelect?.addEventListener('change', calculatePrice);

  // Infill Button Group
  infillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      infillBtns.forEach(b => {
        b.classList.remove('border-2', 'border-brand-500', 'bg-brand-500/10', 'font-bold', 'text-white');
        b.classList.add('border-slate-700', 'bg-slate-950', 'text-slate-300');
      });
      btn.classList.add('border-2', 'border-brand-500', 'bg-brand-500/10', 'font-bold', 'text-white');
      btn.classList.remove('border-slate-700', 'bg-slate-950', 'text-slate-300');

      selectedInfill = parseInt(btn.getAttribute('data-infill'));
      
      const infillDescriptions = {
        15: '%15 (Hafif / Dekoratif)',
        20: '%20 (Standart Parça)',
        40: '%40 (Yüksek Mukavemet)',
        100: '%100 (Masif / Endüstriyel)'
      };
      if (infillLabel) infillLabel.textContent = infillDescriptions[selectedInfill] || `%${selectedInfill}`;
      calculatePrice();
    });
  });

  // Quantity Counter
  decreaseQty?.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    if (val > 1) {
      qtyInput.value = val - 1;
      calculatePrice();
    }
  });

  increaseQty?.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    qtyInput.value = val + 1;
    calculatePrice();
  });

  qtyInput?.addEventListener('input', calculatePrice);

  // ================= FILE UPLOAD & DROPZONE =================
  dropZone?.addEventListener('click', (e) => {
    if (e.target !== loadDemoBtn && !loadDemoBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-brand-500', 'bg-brand-500/10');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-brand-500', 'bg-brand-500/10');
    });
  });

  dropZone?.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  function handleSelectedFile(file) {
    if (!file) return;

    if (window.viewer3DInstance) {
      window.viewer3DInstance.loadFile(file);
    } else {
      // Fallback if viewer is not ready
      const ext = file.name.split('.').pop().toUpperCase();
      currentModel.name = file.name;
      currentModel.hasFile = true;
      currentModel.format = ext;
      calculatePrice();
    }
  }

  // Load Demo Model Button
  loadDemoBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.viewer3DInstance) {
      window.viewer3DInstance.loadSampleDemoModel();
    }
  });

  // Viewer Controls
  resetCameraBtn?.addEventListener('click', () => {
    if (window.viewer3DInstance) window.viewer3DInstance.resetCamera();
  });

  wireframeToggleBtn?.addEventListener('click', () => {
    if (window.viewer3DInstance) window.viewer3DInstance.toggleWireframe();
  });

  // ================= WHATSAPP INTEGRATION =================
  sendWhatsAppBtn?.addEventListener('click', () => {
    const pricing = calculatePrice();
    const materialName = materialSelect.options[materialSelect.selectedIndex].text.split('(')[0].trim();
    const qualityText = qualitySelect.options[qualitySelect.selectedIndex].text;
    const colorText = colorSelect.value;
    const note = userNote.value.trim() ? userNote.value.trim() : 'Yok';

    const message = 
`*ist3Dye.com - 3D Baskı Fiyat Teklifi Talebi*
---------------------------------------
📂 *Model / Dosya:* ${currentModel.name} (${currentModel.format})
📐 *Parça Ebatları:* ${currentModel.x} × ${currentModel.y} × ${currentModel.z} mm
⚖️ *Tahmini Ağırlık:* ~${pricing.estimatedGrams} gram
⏱️ *Baskı Süresi:* ${pricing.printTimeText}
⚙️ *Malzeme:* ${materialName}
🎯 *Doluluk (Infill):* %${selectedInfill}
📏 *Katman Kalitesi:* ${qualityText}
🎨 *Renk:* ${colorText}
🔢 *Adet:* ${pricing.qty} adet
📝 *Müşteri Notu:* ${note}
---------------------------------------
💰 *Tahmini Toplam Tutar:* ${pricing.totalPrice.toLocaleString('tr-TR')} ₺
---------------------------------------
Merhaba, yukarıdaki teknik parametrelerde 3D baskı yaptırmak ve kesin teklif almak istiyorum. Dosyamı göndermek üzere bilgi verir misiniz?`;

    const cfg = getSiteConfig();
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cfg.whatsappPhone || '905000000000'}?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  });

  // Open Email / Phone scroll
  openEmailModalBtn?.addEventListener('click', () => {
    const contactSection = document.getElementById('iletisim');
    contactSection?.scrollIntoView({ behavior: 'smooth' });
    
    // Auto populate message field with quote parameters
    const pricing = calculatePrice();
    const contactMsg = document.getElementById('contactMessage');
    if (contactMsg) {
      contactMsg.value = `Model: ${currentModel.name} (${currentModel.format}) | Ebat: ${currentModel.x}x${currentModel.y}x${currentModel.z} mm | Ağırlık: ~${pricing.estimatedGrams} gr | Süre: ${pricing.printTimeText} | Malzeme: ${materialSelect.value.toUpperCase()} | Doluluk: %${selectedInfill} | Renk: ${colorSelect.value} | Adet: ${pricing.qty} | Tahmini Tutar: ${pricing.totalPrice} TL`;
    }
  });

  // Check for successful form submit return
  if (window.location.search.includes('success=1')) {
    const contactStatus = document.getElementById('contactStatus');
    if (contactStatus) {
      contactStatus.textContent = '✓ Talebiniz ve bilgileriniz başarıyla bize ulaştı! En kısa sürede sizinle iletişime geçeceğiz.';
      contactStatus.className = 'text-sm text-center text-emerald-400 font-semibold block p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30';
    }
  }

  // Sync 3D quote selections into form before submit
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', () => {
    const pricing = calculatePrice();
    const hiddenModel = document.getElementById('hiddenModelName');
    const hiddenMat = document.getElementById('hiddenMaterial');
    const hiddenInf = document.getElementById('hiddenInfill');
    const hiddenQual = document.getElementById('hiddenQuality');
    const hiddenCol = document.getElementById('hiddenColor');
    const hiddenQuantity = document.getElementById('hiddenQty');
    const hiddenPr = document.getElementById('hiddenPrice');

    if (hiddenModel) hiddenModel.value = currentModel.hasFile ? `${currentModel.name} (${currentModel.x}x${currentModel.y}x${currentModel.z}mm, ~${pricing.estimatedGrams}gr)` : 'Model yüklenmedi';
    if (hiddenMat) hiddenMat.value = materialSelect.options[materialSelect.selectedIndex].text.split('(')[0].trim();
    if (hiddenInf) hiddenInf.value = `%${selectedInfill}`;
    if (hiddenQual) hiddenQual.value = qualitySelect.options[qualitySelect.selectedIndex].text;
    if (hiddenCol) hiddenCol.value = colorSelect.value;
    if (hiddenQuantity) hiddenQuantity.value = pricing.qty;
    if (hiddenPr) hiddenPr.value = `${pricing.totalPrice} ₺`;
  });

  // ================= GALLERY FILTER =================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-brand-600', 'text-white', 'active');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      btn.classList.add('bg-brand-600', 'text-white', 'active');
      btn.classList.remove('bg-slate-800', 'text-slate-300');

      const filter = btn.getAttribute('data-filter');
      galleryItems.forEach(item => {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // ================= FAQ ACCORDION =================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const chevron = questionBtn?.querySelector('i');

    questionBtn?.addEventListener('click', () => {
      const isOpen = !answer.classList.contains('hidden');
      
      // Close all
      document.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
      document.querySelectorAll('.faq-question i').forEach(c => c.style.transform = 'rotate(0deg)');

      if (!isOpen) {
        answer.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      }
    });
  });

  // ================= MOBILE MENU TOGGLE =================
  mobileMenuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Initial price calculation
  calculatePrice();
});
