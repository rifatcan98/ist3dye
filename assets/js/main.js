// Main Application Logic for ist3Dye.com

document.addEventListener('DOMContentLoaded', () => {

  // ================= STATE & CONFIG =================
  let currentModel = {
    name: 'Örnek Parça',
    volumeCm3: 25,
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
  const calculatedPriceEl = document.getElementById('calculatedPrice');
  const infillLabel = document.getElementById('infillLabel');
  const infillBtns = document.querySelectorAll('.infill-btn');

  const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
  const openEmailModalBtn = document.getElementById('openEmailModalBtn');

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  // WhatsApp Phone Number (Can be updated easily)
  const WHATSAPP_PHONE = '905000000000';

  // ================= PRICE CALCULATION =================
  function calculatePrice() {
    const baseSetupFee = 35; // Sabit makine hazırlık ve dilimleme bedeli (TL)
    const baseGramPrice = 2.4; // TL per gram (PLA için baz)
    
    // Malzeme katsayısı
    const selectedOption = materialSelect.options[materialSelect.selectedIndex];
    const materialMultiplier = parseFloat(selectedOption?.getAttribute('data-rate') || 1.0);

    // Infill katsayısı
    let infillMultiplier = 1.0;
    if (selectedInfill === 15) infillMultiplier = 0.9;
    else if (selectedInfill === 20) infillMultiplier = 1.0;
    else if (selectedInfill === 40) infillMultiplier = 1.35;
    else if (selectedInfill === 100) infillMultiplier = 2.3;

    // Katman kalitesi katsayısı (Düşük mikron = daha uzun baskı süresi)
    const qualityVal = parseFloat(qualitySelect.value || 0.20);
    let qualityMultiplier = 1.0;
    if (qualityVal === 0.28) qualityMultiplier = 0.85;
    else if (qualityVal === 0.20) qualityMultiplier = 1.0;
    else if (qualityVal === 0.12) qualityMultiplier = 1.45;

    // Adet
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);

    // Tahmini gramaj (Hacim cm3 * doluluk faktörü * plastik yoğunluğu 1.25)
    const estimatedGrams = Math.max(10, currentModel.volumeCm3 * (0.3 + (selectedInfill / 100) * 0.7) * 1.25);
    
    // Birim Fiyat
    let unitPrice = baseSetupFee + (estimatedGrams * baseGramPrice * materialMultiplier * qualityMultiplier * infillMultiplier);
    unitPrice = Math.max(65, Math.round(unitPrice));

    // Toplam Fiyat (Adet indirimi: 5+ adette %10, 10+ adette %15 indirim)
    let discount = 1.0;
    if (qty >= 10) discount = 0.85;
    else if (qty >= 5) discount = 0.90;

    const totalPrice = Math.round(unitPrice * qty * discount);

    calculatedPriceEl.textContent = `${totalPrice.toLocaleString('tr-TR')} ₺`;
    return { unitPrice, totalPrice, estimatedGrams: Math.round(estimatedGrams), qty };
  }

  // Hook for 3D viewer when new model is loaded
  window.triggerPriceUpdate = (volumeCm3, name) => {
    currentModel.volumeCm3 = volumeCm3;
    currentModel.name = name;
    currentModel.hasFile = true;
    calculatePrice();
  };

  // Color selection updates 3D model hue
  const colorMap = {
    'Siyah': 0x1e293b,
    'Beyaz': 0xe2e8f0,
    'Gri': 0x64748b,
    'Kırmızı': 0xef4444,
    'Mavi': 0x3b82f6,
    'Turuncu': 0xf97316,
    'Özel': 0x06b6d4
  };

  colorSelect.addEventListener('change', () => {
    const hex = colorMap[colorSelect.value] || 0x3b82f6;
    if (window.viewer3DInstance) {
      window.viewer3DInstance.updateMaterialColor(hex);
    }
  });

  // ================= FORM EVENTS =================
  materialSelect.addEventListener('change', calculatePrice);
  qualitySelect.addEventListener('change', calculatePrice);

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
      infillLabel.textContent = infillDescriptions[selectedInfill] || `%${selectedInfill}`;
      calculatePrice();
    });
  });

  // Quantity Counter
  decreaseQty.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    if (val > 1) {
      qtyInput.value = val - 1;
      calculatePrice();
    }
  });

  increaseQty.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    qtyInput.value = val + 1;
    calculatePrice();
  });

  qtyInput.addEventListener('input', calculatePrice);

  // ================= FILE UPLOAD & DROPZONE =================
  dropZone.addEventListener('click', (e) => {
    if (e.target !== loadDemoBtn && !loadDemoBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  function handleSelectedFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'stl') {
      if (window.viewer3DInstance) {
        window.viewer3DInstance.loadSTLFile(file);
      }
    } else {
      // For STEP, OBJ, 3MF: Notify user and compute general quote
      currentModel.name = file.name;
      currentModel.hasFile = true;
      document.getElementById('loadedFileName').textContent = file.name;
      document.getElementById('viewerPlaceholder').innerHTML = `
        <i data-lucide="file-check" class="w-10 h-10 stroke-1 text-emerald-400"></i>
        <p class="text-sm font-semibold text-white">${file.name}</p>
        <p class="text-xs text-slate-400">Dosyanız başarıyla alındı. Aşağıdan teklif oluşturabilirsiniz.</p>
      `;
      lucide.createIcons();
      calculatePrice();
    }
  }

  // Load Demo Model Button
  loadDemoBtn.addEventListener('click', (e) => {
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
  sendWhatsAppBtn.addEventListener('click', () => {
    const pricing = calculatePrice();
    const materialName = materialSelect.options[materialSelect.selectedIndex].text.split('(')[0].trim();
    const qualityText = qualitySelect.options[qualitySelect.selectedIndex].text;
    const colorText = colorSelect.value;
    const note = userNote.value.trim() ? userNote.value.trim() : 'Yok';

    const message = 
`*ist3Dye.com - 3D Baskı Fiyat Teklifi Talebi*
---------------------------------------
📂 *Model / Dosya:* ${currentModel.name}
⚙️ *Malzeme:* ${materialName}
🎯 *Doluluk (Infill):* %${selectedInfill}
📏 *Katman Kalitesi:* ${qualityText}
🎨 *Renk:* ${colorText}
🔢 *Adet:* ${pricing.qty} adet
📝 *Özel Not:* ${note}
---------------------------------------
💰 *Tahmini Fiyat:* ${pricing.totalPrice.toLocaleString('tr-TR')} ₺
---------------------------------------
Merhaba, yukarıdaki parametrelerde 3D baskı yaptırmak ve kesin teklif almak istiyorum. Dosyamı göndermek üzere bilgi verir misiniz?`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  });

  // Open Email / Phone scroll
  openEmailModalBtn.addEventListener('click', () => {
    const contactSection = document.getElementById('iletisim');
    contactSection.scrollIntoView({ behavior: 'smooth' });
    
    // Auto populate message field with quote parameters
    const pricing = calculatePrice();
    const contactMsg = document.getElementById('contactMessage');
    contactMsg.value = `Model: ${currentModel.name} | Malzeme: ${materialSelect.value.toUpperCase()} | Doluluk: %${selectedInfill} | Renk: ${colorSelect.value} | Adet: ${pricing.qty} | Tahmini Tutar: ${pricing.totalPrice} TL`;
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

    if (hiddenModel) hiddenModel.value = currentModel.hasFile ? currentModel.name : 'Model yüklenmedi';
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
    const chevron = questionBtn.querySelector('i');

    questionBtn.addEventListener('click', () => {
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
