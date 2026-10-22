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

  // Material densities (g/cm³) for accurate weight calculation
  const MATERIAL_DENSITIES = {
    'pla': 1.24,
    'petg': 1.27,
    'abs': 1.04,
    'asa': 1.07,
    'tpu': 1.21
  };

  const MATERIAL_BRIEFS = {
    'pla': 'Ekonomik, prototip ve dekoratif parçalar için ideal (Isı: 55°C).',
    'petg': 'Yüksek darbe direnci, kimyasal ve dış ortam dayanımı (Isı: 75°C).',
    'abs': 'Sıcaklığa ve sürtünmeye dayanıklı endüstriyel mühendislik (Isı: 100°C).',
    'asa': 'Güneş (UV), yağmur ve hava şartlarına ultra dayanıklı (Isı: 105°C).',
    'tpu': 'Bükülebilir, kırılmaz elastik kauçuk benzeri malzeme (Shore 95A).'
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
    scale: 1.0,
    isOversize: false,
    hasFile: false
  };

  let selectedInfill = 20; // default 20%
  let selectedSpeed = 'standard'; // 'standard' or 'express'

  // ================= ELEMENTS =================
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const noModelHelpBtn = document.getElementById('noModelHelpBtn');
  const resetCameraBtn = document.getElementById('resetCameraBtn');
  const wireframeToggleBtn = document.getElementById('wireframeToggleBtn');

  const materialSelect = document.getElementById('materialSelect');
  const qualitySelect = document.getElementById('qualitySelect');
  const colorSelect = document.getElementById('colorSelect');
  const qtyInput = document.getElementById('qtyInput');
  const decreaseQty = document.getElementById('decreaseQty');
  const increaseQty = document.getElementById('increaseQty');
  const userNote = document.getElementById('userNote');
  const ndaCheckbox = document.getElementById('ndaCheckbox');

  // Live Analysis Elements
  const calculatedPriceEl = document.getElementById('calculatedPrice');
  const quoteGramsEl = document.getElementById('quoteGrams');
  const quoteDimsEl = document.getElementById('quoteDims');
  const quoteTimeEl = document.getElementById('quoteTime');
  const quoteUnitPriceEl = document.getElementById('quoteUnitPrice');
  const modelStatusDot = document.getElementById('modelStatusDot');
  const modelStatusText = document.getElementById('modelStatusText');
  const modelFormatBadge = document.getElementById('modelFormatBadge');
  const oversizeWarning = document.getElementById('oversizeWarning');
  const selectedMaterialBrief = document.getElementById('selectedMaterialBrief');

  const infillLabel = document.getElementById('infillLabel');
  const infillBtns = document.querySelectorAll('.infill-btn');
  const speedBtns = document.querySelectorAll('.speed-btn');
  const matPills = document.querySelectorAll('.mat-pill');

  const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
  const openEmailModalBtn = document.getElementById('openEmailModalBtn');

  // Modals
  const materialGuideModal = document.getElementById('materialGuideModal');
  const openMaterialGuideBtn = document.getElementById('openMaterialGuideBtn');
  const closeMaterialGuideBtn = document.getElementById('closeMaterialGuideBtn');

  const designHelpModal = document.getElementById('designHelpModal');
  const closeDesignHelpBtn = document.getElementById('closeDesignHelpBtn');
  const cancelDesignBtn = document.getElementById('cancelDesignBtn');
  const whatsappDesignBtn = document.getElementById('whatsappDesignBtn');

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

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

    // Doluluk (Infill) makine zorluk katsayısı
    let infillMultiplier = 1.0;
    if (selectedInfill === 15) infillMultiplier = 0.98;
    else if (selectedInfill === 20) infillMultiplier = 1.0;
    else if (selectedInfill === 40) infillMultiplier = 1.05;
    else if (selectedInfill === 100) infillMultiplier = 1.15;

    // Katman kalitesi katsayısı
    const qualityVal = parseFloat(qualitySelect.value || 0.20);
    let qualityMultiplier = 1.0;
    if (qualityVal === 0.28) qualityMultiplier = 0.88;
    else if (qualityVal === 0.20) qualityMultiplier = 1.0;
    else if (qualityVal === 0.12) qualityMultiplier = 1.45;

    // Hız / Ekspres Teslimat katsayısı
    const speedMultiplier = (selectedSpeed === 'express') ? 1.25 : 1.0;

    // Adet
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);

    // Gerçekçi Gramaj Hesabı
    const infillRatio = 0.25 + (selectedInfill / 100) * 0.75;
    const rawGrams = currentModel.volumeCm3 * density * infillRatio;
    const estimatedGrams = Math.max(5, Math.round(rawGrams));

    // Baskı Süresi Hesabı
    let speedPerHour = 22;
    if (qualityVal >= 0.28) speedPerHour = 32;
    else if (qualityVal <= 0.12) speedPerHour = 14;

    const totalHours = estimatedGrams / speedPerHour;
    const printHours = Math.floor(totalHours);
    const printMins = Math.round((totalHours - printHours) * 60);
    let printTimeText = '';
    if (printHours >= 24) {
      const days = Math.floor(printHours / 24);
      const remHours = printHours % 24;
      printTimeText = `~${days} Gün ${remHours}s`;
    } else if (printHours === 0) {
      printTimeText = `~${Math.max(20, printMins)} Dk`;
    } else if (printMins === 0) {
      printTimeText = `~${printHours} Saat`;
    } else {
      printTimeText = `~${printHours}s ${printMins}dk`;
    }

    // Ağırlık Metni
    let weightText = '';
    if (estimatedGrams >= 1000) {
      weightText = `~${(estimatedGrams / 1000).toFixed(1)} kg`;
    } else {
      weightText = `~${estimatedGrams} gr`;
    }

    // Birim Fiyat (Hız farkı dahil)
    let unitPrice = (baseSetupFee + (estimatedGrams * baseGramPrice * materialMultiplier * qualityMultiplier * infillMultiplier)) * speedMultiplier;
    unitPrice = Math.max(cfg.minOrderPrice || 65, Math.round(unitPrice));

    // Adet İndirimi
    let discount = 1.0;
    if (qty >= 10) discount = (100 - (cfg.discount10 || 15)) / 100;
    else if (qty >= 5) discount = (100 - (cfg.discount5 || 10)) / 100;

    const totalPrice = Math.round(unitPrice * qty * discount);

    // Update UI Elements
    if (calculatedPriceEl) {
      calculatedPriceEl.innerHTML = `${totalPrice.toLocaleString('tr-TR')} <span class="text-xl sm:text-2xl font-black text-white ml-1.5 inline-block drop-shadow">TL</span>`;
    }
    if (quoteGramsEl) quoteGramsEl.textContent = weightText;
    if (quoteDimsEl) quoteDimsEl.textContent = `${currentModel.x}×${currentModel.y}×${currentModel.z} mm`;
    if (quoteTimeEl) quoteTimeEl.textContent = printTimeText;
    if (quoteUnitPriceEl) {
      const discountText = discount < 1 ? ` (%${Math.round((1 - discount) * 100)} İndirim)` : '';
      quoteUnitPriceEl.textContent = `${unitPrice} TL / adet${discountText}`;
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
      modelFormatBadge.textContent = currentModel.scale !== 1.0 
        ? `${currentModel.format} (%${Math.round(currentModel.scale * 100)})` 
        : currentModel.format;
      modelFormatBadge.className = currentModel.hasFile
        ? 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold shrink-0'
        : 'text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono shrink-0';
    }

    // Oversize Warning
    if (oversizeWarning) {
      if (currentModel.isOversize) {
        oversizeWarning.classList.remove('hidden');
      } else {
        oversizeWarning.classList.add('hidden');
      }
    }

    return { unitPrice, totalPrice, estimatedGrams, weightText, printTimeText, qty };
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
      currentModel.isOversize = !!data.isOversize;
      currentModel.scale = data.scale || 1.0;
      currentModel.hasFile = true;
    }
    calculatePrice();
    if (window.lucide) lucide.createIcons();
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

  // ================= INTERACTIVE MATERIAL SELECTION =================
  function selectMaterial(matKey) {
    if (!materialSelect) return;
    materialSelect.value = matKey;

    matPills.forEach(pill => {
      const pKey = pill.getAttribute('data-mat');
      if (pKey === matKey) {
        pill.classList.add('border-2', 'border-brand-500', 'bg-brand-500/10', 'active');
        pill.classList.remove('border-slate-700', 'bg-slate-950');
        const span = pill.querySelector('span');
        if (span) { span.classList.add('text-white'); span.classList.remove('text-slate-300'); }
      } else {
        pill.classList.remove('border-2', 'border-brand-500', 'bg-brand-500/10', 'active');
        pill.classList.add('border-slate-700', 'bg-slate-950');
        const span = pill.querySelector('span');
        if (span) { span.classList.remove('text-white'); span.classList.add('text-slate-300'); }
      }
    });

    if (selectedMaterialBrief) {
      selectedMaterialBrief.textContent = MATERIAL_BRIEFS[matKey] || 'Seçilen teknik malzeme.';
    }

    calculatePrice();
  }

  matPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const matKey = pill.getAttribute('data-mat');
      selectMaterial(matKey);
    });
  });

  materialSelect?.addEventListener('change', () => {
    selectMaterial(materialSelect.value);
  });

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

  // Production Speed Selection (Standard vs Express)
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => {
        b.classList.remove('border-2', 'border-brand-500', 'border-amber-500', 'bg-brand-500/10', 'bg-amber-500/10', 'active');
        b.classList.add('border-slate-700', 'bg-slate-950');
      });

      selectedSpeed = btn.getAttribute('data-speed');
      if (selectedSpeed === 'express') {
        btn.classList.add('border-2', 'border-amber-500', 'bg-amber-500/10', 'active');
      } else {
        btn.classList.add('border-2', 'border-brand-500', 'bg-brand-500/10', 'active');
      }
      btn.classList.remove('border-slate-700', 'bg-slate-950');

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
  ndaCheckbox?.addEventListener('change', calculatePrice);

  // ================= MODEL SCALING & UNIT CONVERSIONS =================
  document.querySelectorAll('.scale-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scale-btn').forEach(b => {
        b.classList.remove('bg-brand-600', 'text-white', 'active', 'font-bold');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('bg-brand-600', 'text-white', 'active', 'font-bold');
      btn.classList.remove('text-slate-400');

      const scale = parseFloat(btn.getAttribute('data-scale') || '1.0');
      if (window.viewer3DInstance) {
        window.viewer3DInstance.setScale(scale);
      }
    });
  });

  document.getElementById('unitConvertInchBtn')?.addEventListener('click', () => {
    if (window.viewer3DInstance) {
      window.viewer3DInstance.convertUnit(25.4);
    }
  });

  document.getElementById('unitConvertCmBtn')?.addEventListener('click', () => {
    if (window.viewer3DInstance) {
      window.viewer3DInstance.convertUnit(10.0);
    }
  });

  // ================= FILE UPLOAD & DROPZONE =================
  dropZone?.addEventListener('click', (e) => {
    if (e.target !== loadDemoBtn && !loadDemoBtn?.contains(e.target) &&
        e.target !== noModelHelpBtn && !noModelHelpBtn?.contains(e.target)) {
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

  // ================= MODAL: 3D ÇİZİM & TASARIM DESTEĞİ =================
  noModelHelpBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const cfg = getSiteConfig();
    const designMsg = encodeURIComponent("Merhaba, elimde hazır 3D model dosyası veya teknik çizim yok. Bir parçamın 3D modellenmesi ve baskısı için tasarım desteği almak istiyorum.");
    if (whatsappDesignBtn) {
      whatsappDesignBtn.href = `https://api.whatsapp.com/send?phone=${cfg.whatsappPhone || '905000000000'}&text=${designMsg}`;
    }
    designHelpModal?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  });

  closeDesignHelpBtn?.addEventListener('click', () => {
    designHelpModal?.classList.add('hidden');
  });
  cancelDesignBtn?.addEventListener('click', () => {
    designHelpModal?.classList.add('hidden');
  });

  // ================= MODAL: MALZEME REHBERİ =================
  openMaterialGuideBtn?.addEventListener('click', () => {
    materialGuideModal?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  });

  closeMaterialGuideBtn?.addEventListener('click', () => {
    materialGuideModal?.classList.add('hidden');
  });

  document.querySelectorAll('.select-guide-mat').forEach(btn => {
    btn.addEventListener('click', () => {
      const mat = btn.getAttribute('data-mat');
      selectMaterial(mat);
      materialGuideModal?.classList.add('hidden');
    });
  });

  // Close modals on backdrop click
  [materialGuideModal, designHelpModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // ================= WHATSAPP INTEGRATION =================
  sendWhatsAppBtn?.addEventListener('click', () => {
    const pricing = calculatePrice();
    const materialName = materialSelect.options[materialSelect.selectedIndex].text.split('(')[0].trim();
    const qualityText = qualitySelect.options[qualitySelect.selectedIndex].text;
    const colorText = colorSelect.value;
    const note = userNote.value.trim();

    const speedText = (selectedSpeed === 'express') 
      ? '24 Saat Ekspres Baskı (+%25 Hızlı)' 
      : 'Standart Üretim (2-3 İş Günü)';

    const scaleText = (currentModel.scale !== 1.0)
      ? ` (%${Math.round(currentModel.scale * 100)} Ölçek)`
      : '';

    // Dynamic notes & requests block
    const notesList = [];
    if (note) {
      notesList.push(`• Müşteri Notu: ${note}`);
    }
    if (ndaCheckbox?.checked) {
      notesList.push('• Gizlilik: Kurumsal NDA Sözleşmesi Talep Edildi');
    }
    if (currentModel.isOversize) {
      notesList.push('• Ebat Bildirimi: Parça 340×320×340 mm alanını aşıyor, montajlı/parçalı üretim önerisi isteniyor');
    }

    let notesSection = '';
    if (notesList.length > 0) {
      notesSection = `\n[ ÖZEL TALEPLER & NOTLAR ]\n${notesList.join('\n')}\n`;
    }

    const message = 
`════════════════════════════
*ist3Dye.com | 3D BASKI TEKLİF TALEBİ*
════════════════════════════

[ MODEL BİLGİLERİ ]
• Dosya: ${currentModel.name} (${currentModel.format})${scaleText}
• Boyutlar: ${currentModel.x} × ${currentModel.y} × ${currentModel.z} mm
• Ağırlık & Süre: ${pricing.weightText} | ${pricing.printTimeText}

[ BASKI PARAMETRELERİ ]
• Malzeme: ${materialName}
• Renk: ${colorText}
• İç Doluluk: %${selectedInfill}
• Katman Kalitesi: ${qualityText}
• Üretim Hızı: ${speedText}
• Sipariş Adedi: ${pricing.qty} Adet
${notesSection}
════════════════════════════
*TAHMİNİ TOPLAM: ${pricing.totalPrice.toLocaleString('tr-TR')} TL*
(+KDV / Kargo Hariç)
════════════════════════════

Merhaba, web siteniz üzerinden aldığım bu ön teklif için 3D dosyamı iletmek ve kesin sipariş onayı almak istiyorum. Yardımcı olabilir misiniz?`;

    const cfg = getSiteConfig();
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cfg.whatsappPhone || '905000000000'}&text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  });

  // Open Email / Phone scroll
  openEmailModalBtn?.addEventListener('click', () => {
    const contactSection = document.getElementById('iletisim');
    contactSection?.scrollIntoView({ behavior: 'smooth' });
    
    const pricing = calculatePrice();
    const contactMsg = document.getElementById('contactMessage');
    const speedText = (selectedSpeed === 'express') ? 'Ekspres (24s)' : 'Standart (2-3g)';
    const ndaText = ndaCheckbox?.checked ? ' [NDA Talep Edildi]' : '';

    if (contactMsg) {
      contactMsg.value = `Model: ${currentModel.name} (${currentModel.format}) | Ebat: ${currentModel.x}x${currentModel.y}x${currentModel.z} mm | Ağırlık: ${pricing.weightText} | Süre: ${pricing.printTimeText} | Malzeme: ${materialSelect.value.toUpperCase()} | Doluluk: %${selectedInfill} | Hız: ${speedText} | Adet: ${pricing.qty} | Tutar: ${pricing.totalPrice} TL${ndaText}`;
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

    const ndaText = ndaCheckbox?.checked ? ' [NDA Talep Edildi]' : '';
    if (hiddenModel) hiddenModel.value = currentModel.hasFile ? `${currentModel.name} (${currentModel.x}x${currentModel.y}x${currentModel.z}mm, ${pricing.weightText})${ndaText}` : 'Model yüklenmedi';
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

  // Initial setup
  selectMaterial('pla');
  calculatePrice();
});
