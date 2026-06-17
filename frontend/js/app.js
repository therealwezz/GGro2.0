/* ═══════════════════════════════════════════
   PlantDoc — Full App with Camera Support
   University of Buea Tech Day 2025
═══════════════════════════════════════════ */

// ── CONFIG ────────────────────────────────
// When hosted, this points to your backend server.
// For local testing with Live Server, change to 'http://localhost:3000'
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'      // local development
  : 'https://ggro2-0.onrender.com'; // production (Render) // empty = same domain (for Render hosting)

// ── STATE ─────────────────────────────────
const state = {
  activeTab: 'camera',
  imageBase64: null,
  imageMimeType: 'image/jpeg',
  imageFile: null,
  analysisResult: null,
  cameraStream: null,
  facingMode: 'environment', // 'environment' = back camera, 'user' = front
};

// ── DOM ───────────────────────────────────
const tabBtns          = document.querySelectorAll('.tab-btn');
const tabContents      = document.querySelectorAll('.tab-content');
const analyzeBtn       = document.getElementById('analyzeBtn');
const resultsEmpty     = document.getElementById('resultsEmpty');
const resultsLoading   = document.getElementById('resultsLoading');
const resultsContent   = document.getElementById('resultsContent');
const findPharmBtn     = document.getElementById('findPharmacyBtn');
const treatTabs        = document.querySelectorAll('.treat-tab');
const hamburger        = document.getElementById('hamburger');
const toast            = document.getElementById('toast');

// Camera elements
const startCameraBtn   = document.getElementById('startCameraBtn');
const cameraVideo      = document.getElementById('cameraVideo');
const captureBtn       = document.getElementById('captureBtn');
const captureCanvas    = document.getElementById('captureCanvas');
const retakeBtn        = document.getElementById('retakeBtn');
const cancelCameraBtn  = document.getElementById('cancelCameraBtn');
const switchCameraBtn  = document.getElementById('switchCameraBtn');
const cameraStart      = document.getElementById('cameraStart');
const cameraLive       = document.getElementById('cameraLive');
const cameraCaptured   = document.getElementById('cameraCaptured');

// Upload elements
const uploadZone       = document.getElementById('uploadZone');
const fileInput        = document.getElementById('fileInput');
const browseBtn        = document.getElementById('browseBtn');
const previewImg       = document.getElementById('previewImg');
const previewControls  = document.getElementById('previewControls');
const uploadPlaceholder= document.getElementById('uploadPlaceholder');
const removeImgBtn     = document.getElementById('removeImg');

// ── NAVBAR ────────────────────────────────
hamburger.addEventListener('click', () => {
  document.querySelector('.navbar').classList.toggle('menu-open');
});
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.navbar').classList.remove('menu-open');
  });
});
document.addEventListener('click', (e) => {
  const navbar = document.querySelector('.navbar');
  if (navbar.classList.contains('menu-open') && !navbar.contains(e.target)) {
    navbar.classList.remove('menu-open');
  }
});

// ── TAB SWITCHING ─────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    // Stop camera if leaving camera tab
    if (state.activeTab === 'camera' && tab !== 'camera') {
      stopCamera();
    }

    state.activeTab = tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`content-${tab}`).classList.add('active');
  });
});

// ── TREATMENT TABS ────────────────────────
treatTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const type = tab.dataset.treat;
    treatTabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.treat-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`treat-${type}`).classList.remove('hidden');
  });
});

// ══════════════════════════════════════════
//   CAMERA LOGIC
// ══════════════════════════════════════════

startCameraBtn.addEventListener('click', openCamera);
captureBtn.addEventListener('click', capturePhoto);
retakeBtn.addEventListener('click', retakePhoto);
cancelCameraBtn.addEventListener('click', () => { stopCamera(); showCameraStart(); });
switchCameraBtn.addEventListener('click', switchCamera);

async function openCamera() {
  try {
    const constraints = {
      video: {
        facingMode: state.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      }
    };

    state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraVideo.srcObject = state.cameraStream;

    cameraStart.classList.add('hidden');
    cameraCaptured.classList.add('hidden');
    cameraLive.classList.remove('hidden');
  } catch (err) {
    showCameraError(err);
  }
}

function capturePhoto() {
  const video = cameraVideo;
  const canvas = captureCanvas;

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get base64 from canvas
  const dataURL = canvas.toDataURL('image/jpeg', 0.92);
  state.imageBase64   = dataURL.split(',')[1];
  state.imageMimeType = 'image/jpeg';

  stopCamera();
  cameraLive.classList.add('hidden');
  cameraCaptured.classList.remove('hidden');

  showToast('Photo captured! Ready to analyze.', 'success');
}

function retakePhoto() {
  state.imageBase64 = null;
  cameraCaptured.classList.add('hidden');
  showCameraStart();
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  cameraVideo.srcObject = null;
}

async function switchCamera() {
  state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
  stopCamera();
  await openCamera();
}

function showCameraStart() {
  cameraLive.classList.add('hidden');
  cameraCaptured.classList.add('hidden');
  cameraStart.classList.remove('hidden');
}

function showCameraError(err) {
  const zone = document.getElementById('cameraZone');
  let msg = 'Could not access your camera.';
  if (err.name === 'NotAllowedError')  msg = 'Camera permission denied. Please allow camera access in your browser settings.';
  if (err.name === 'NotFoundError')    msg = 'No camera found on this device.';
  if (err.name === 'NotReadableError') msg = 'Camera is being used by another app.';

  zone.innerHTML = `
    <div class="camera-error">
      <i class="fas fa-video-slash"></i>
      <h4>Camera Unavailable</h4>
      <p>${msg}</p>
      <p style="font-size:0.8rem;opacity:0.5">Try the "Upload Photo" tab instead.</p>
    </div>`;
}

// ══════════════════════════════════════════
//   IMAGE UPLOAD LOGIC
// ══════════════════════════════════════════

browseBtn.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('click', (e) => {
  if (e.target === uploadZone || e.target.closest('.upload-placeholder')) fileInput.click();
});
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleImageFile(file);
  else showToast('Please drop an image file.', 'error');
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
});

removeImgBtn.addEventListener('click', resetUpload);

function handleImageFile(file) {
  if (file.size > 10 * 1024 * 1024) { showToast('Image too large — max 10MB.', 'error'); return; }
  state.imageFile = file;
  state.imageMimeType = file.type || 'image/jpeg';

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataURL = e.target.result;
    state.imageBase64 = dataURL.split(',')[1];
    previewImg.src = dataURL;
    uploadPlaceholder.classList.add('hidden');
    previewImg.classList.remove('hidden');
    previewControls.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  state.imageBase64 = null;
  state.imageFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewImg.classList.add('hidden');
  previewControls.classList.add('hidden');
  uploadPlaceholder.classList.remove('hidden');
}

// ══════════════════════════════════════════
//   ANALYZE BUTTON
// ══════════════════════════════════════════

analyzeBtn.addEventListener('click', async () => {
  // Validate inputs
  if ((state.activeTab === 'camera' || state.activeTab === 'image') && !state.imageBase64) {
    const msg = state.activeTab === 'camera'
      ? 'Please take a photo first using the camera.'
      : 'Please upload a plant photo first.';
    showToast(msg, 'error');
    return;
  }

  if (state.activeTab === 'text') {
    const plant    = document.getElementById('plantType').value.trim();
    const symptoms = document.getElementById('symptomsText').value.trim();
    if (!plant || !symptoms) {
      showToast('Please fill in the plant type and symptoms.', 'error');
      return;
    }
  }

  showLoading();
  animateLoadingSteps();

  try {
    const result = await callBackend();
    state.analysisResult = result;
    displayResults(result);
    showFollowupPanel(result);
    showToast('Analysis complete!', 'success');
  } catch (err) {
    console.error('Analysis error:', err);
    showToast(`Error: ${err.message}`, 'error');
    showEmpty();
  }
});

// ── BACKEND API CALL ─────────────────────
async function callBackend() {
  const messages = buildMessages();

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, mode: state.activeTab }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server returned ${response.status}`);
  }

  return response.json();
}

function buildMessages() {
  const isImage = state.activeTab === 'camera' || state.activeTab === 'image';

  if (isImage && state.imageBase64) {
    const notes = state.activeTab === 'camera'
      ? document.getElementById('cameraNotes').value.trim()
      : document.getElementById('imageNotes').value.trim();

    return [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: state.imageMimeType,
            data: state.imageBase64,
          },
        },
        {
          type: 'text',
          text: `Analyze this plant image for diseases and provide a full diagnosis.${notes ? ' Additional notes: ' + notes : ''}`,
        },
      ],
    }];
  }

  // Text mode
  const plant    = document.getElementById('plantType').value.trim();
  const symptoms = document.getElementById('symptomsText').value.trim();
  const duration = document.getElementById('duration').value;
  const severity = document.getElementById('severity').value;

  return [{
    role: 'user',
    content: `Plant type: ${plant}. Symptoms: ${symptoms}. Duration: ${duration || 'unknown'}. Severity: ${severity || 'unknown'}. Diagnose the plant disease and provide treatment recommendations.`,
  }];
}

// ── LOADING ANIMATION ─────────────────────
function animateLoadingSteps() {
  const steps  = ['ls1','ls2','ls3','ls4'];
  const delays = [0, 1200, 2400, 3600];
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
    if (i === 0) el.classList.add('active');
  });
  steps.forEach((id, i) => {
    if (i === 0) return;
    setTimeout(() => {
      document.getElementById(steps[i-1]).classList.remove('active');
      document.getElementById(steps[i-1]).classList.add('done');
      document.getElementById(id).classList.add('active');
    }, delays[i]);
  });
}

// ── DISPLAY RESULTS ───────────────────────
function displayResults(result) {
  document.getElementById('diseaseName').textContent = result.disease?.name || 'Unknown';
  document.getElementById('diseaseDesc').textContent = result.disease?.description || '';

  const badge = document.getElementById('resultBadge');
  badge.textContent = result.disease?.causedBy || 'Plant Disease';

  const conf = result.disease?.confidence || 80;
  document.getElementById('confFill').style.width = conf + '%';
  document.getElementById('confPct').textContent = conf + '%';

  const meta = document.getElementById('diseaseMeta');
  meta.innerHTML = '';
  (result.disease?.affectedParts || []).forEach(part => {
    meta.innerHTML += `<span class="meta-tag"><i class="fas fa-leaf"></i> ${part}</span>`;
  });
  if (result.disease?.severity) {
    meta.innerHTML += `<span class="meta-tag"><i class="fas fa-exclamation"></i> ${result.disease.severity} severity</span>`;
  }

  const symList = document.getElementById('symptomList');
  symList.innerHTML = '';
  (result.symptoms || []).forEach(s => { symList.innerHTML += `<li>${s}</li>`; });

  ['chemical','organic','prevention'].forEach(type => {
    const el = document.getElementById(`treat-${type}`);
    el.innerHTML = '';
    const steps = result.treatment?.[type] || [];
    steps.forEach((step, i) => {
      el.innerHTML += `<div class="treat-step"><div class="treat-step-num">${i+1}</div><div>${step}</div></div>`;
    });
    if (!steps.length) el.innerHTML = '<p style="color:var(--gray-400)">No specific recommendations.</p>';
  });

  const medsGrid = document.getElementById('medsGrid');
  medsGrid.innerHTML = '';
  const typeIcons = { Fungicide:'fa-spray-can', Pesticide:'fa-bug', Fertilizer:'fa-seedling', Bactericide:'fa-bacteria' };
  (result.medications || []).forEach(med => {
    const icon = typeIcons[med.type] || 'fa-pills';
    medsGrid.innerHTML += `
      <div class="med-card">
        <div class="med-icon"><i class="fas ${icon}"></i></div>
        <div class="med-info">
          <h5>${med.name}</h5>
          <p>${med.activeIngredient || ''}</p>
          <p style="margin-top:0.25rem;font-size:0.82rem;color:var(--gray-600)">${med.dosage || ''}</p>
          <div class="med-tags">
            <span class="med-tag">${med.type}</span>
            ${med.frequency ? `<span class="med-tag" style="background:var(--blue-100);color:var(--blue-600)">${med.frequency}</span>` : ''}
          </div>
        </div>
      </div>`;
  });

  const urgency = result.urgency || 'medium';
  const urgencyBar = document.getElementById('urgencyBar');
  urgencyBar.className = `urgency-bar urgency-${urgency}`;
  const icons = { low: '🟢', medium: '🟡', high: '🔴' };
  urgencyBar.innerHTML = `${icons[urgency] || '🟡'} <strong>${urgency.toUpperCase()} URGENCY</strong> — ${result.urgencyMessage || ''}`;

  resultsLoading.classList.add('hidden');
  resultsContent.classList.remove('hidden');
}

// ══════════════════════════════════════════
//   CAMEROON AGRO-STORE DATABASE
// ══════════════════════════════════════════

const CAMEROON_CITIES = [
  { name: 'Yaoundé',    lat: 3.8480,  lng: 11.5021 },
  { name: 'Douala',     lat: 4.0511,  lng: 9.7679  },
  { name: 'Bamenda',    lat: 5.9597,  lng: 10.1460 },
  { name: 'Bafoussam',  lat: 5.4764,  lng: 10.4177 },
  { name: 'Garoua',     lat: 9.3015,  lng: 13.3980 },
  { name: 'Maroua',     lat: 10.5910, lng: 14.3158 },
  { name: 'Ngaoundéré', lat: 7.3254,  lng: 13.5840 },
  { name: 'Bertoua',    lat: 4.5854,  lng: 13.6844 },
  { name: 'Kumba',      lat: 4.6363,  lng: 9.4469  },
  { name: 'Buea',       lat: 4.1527,  lng: 9.2411  },
  { name: 'Limbe',      lat: 4.0229,  lng: 9.1981  },
  { name: 'Ebolowa',    lat: 2.9000,  lng: 11.1500 },
  { name: 'Kribi',      lat: 2.9390,  lng: 9.9065  },
  { name: 'Nkongsamba', lat: 4.9527,  lng: 9.9368  },
  { name: 'Edéa',       lat: 3.8005,  lng: 10.1381 },
];

// Agro-store database keyed by city name
const AGRO_STORES = {
  'Yaoundé': [
    {
      name: 'CAMSUCO Agro-Inputs',
      address: 'Marché Central, Avenue Kennedy, Yaoundé',
      phone: '+237677001234',
      whatsapp: '+237677001234',
      specialty: 'Fungicides, Pesticides, Seeds',
      hours: 'Mon–Sat 7h–18h',
    },
    {
      name: 'AgroVet Cameroun — Centre',
      address: 'Quartier Nlongkak, Rue 1.123, Yaoundé',
      phone: '+237699112233',
      whatsapp: '+237699112233',
      specialty: 'Herbicides, Fertilisers, Veterinary',
      hours: 'Mon–Sat 8h–19h',
    },
    {
      name: 'Pharmacie Agricole du Centre',
      address: 'Avenue de l\'Indépendance, Yaoundé',
      phone: '+237222235678',
      whatsapp: '+237677558899',
      specialty: 'Plant treatment chemicals, Crop protection',
      hours: 'Mon–Fri 7h30–17h30',
    },
    {
      name: 'Tropicam Agro Supplies',
      address: 'Mvog-Mbi, Yaoundé',
      phone: '+237655443322',
      whatsapp: '+237655443322',
      specialty: 'Pesticides, Nematicides, Micro-nutrients',
      hours: 'Mon–Sat 8h–18h',
    },
  ],
  'Douala': [
    {
      name: 'Agro-Chimie Douala',
      address: 'Akwa, Boulevard de la Liberté, Douala',
      phone: '+237699887766',
      whatsapp: '+237699887766',
      specialty: 'Full range crop chemicals, Seeds',
      hours: 'Mon–Sat 7h–19h',
    },
    {
      name: 'SOCAPALM Agro-Inputs',
      address: 'Bonabéri Industrial Zone, Douala',
      phone: '+237233421100',
      whatsapp: '+237677321100',
      specialty: 'Palm oil crop protection, Fungicides',
      hours: 'Mon–Fri 8h–17h',
    },
    {
      name: 'FarmFirst Supplies Douala',
      address: 'New Bell Market, Douala',
      phone: '+237655667788',
      whatsapp: '+237655667788',
      specialty: 'Insecticides, Herbicides, Fertilisers',
      hours: 'Mon–Sat 6h30–18h30',
    },
    {
      name: 'GreenGrow Cameroun',
      address: 'Deido, Rue de Frégate, Douala',
      phone: '+237677444555',
      whatsapp: '+237677444555',
      specialty: 'Organic inputs, Bio-pesticides',
      hours: 'Mon–Sat 8h–18h',
    },
  ],
  'Bamenda': [
    {
      name: 'NW Agro Supplies',
      address: 'Commercial Avenue, Up Station, Bamenda',
      phone: '+237675123456',
      whatsapp: '+237675123456',
      specialty: 'Fungicides, Herbicides, Seeds',
      hours: 'Mon–Sat 7h30–18h',
    },
    {
      name: 'Bamenda Crop Care Centre',
      address: 'Mile 2 Nkwen, Bamenda',
      phone: '+237699234567',
      whatsapp: '+237699234567',
      specialty: 'Pesticides, Fertilisers, Plant treatment',
      hours: 'Mon–Sat 8h–17h30',
    },
    {
      name: 'AgriPharm NW',
      address: 'Old Town Market, Bamenda',
      phone: '+237677345678',
      whatsapp: '+237677345678',
      specialty: 'Crop protection, Soil treatment',
      hours: 'Mon–Fri 8h–17h, Sat 8h–13h',
    },
  ],
  'Bafoussam': [
    {
      name: 'Agro-West Inputs',
      address: 'Marché B, Bafoussam Centre',
      phone: '+237699456789',
      whatsapp: '+237699456789',
      specialty: 'Coffee crop protection, Fungicides',
      hours: 'Mon–Sat 7h–18h',
    },
    {
      name: 'CropShield Bafoussam',
      address: 'Quartier Commercial, Bafoussam',
      phone: '+237655789012',
      whatsapp: '+237655789012',
      specialty: 'Herbicides, Insecticides, Fertilisers',
      hours: 'Mon–Sat 8h–18h',
    },
    {
      name: 'Ouest Agro Services',
      address: 'Tamdja, Route de Mbouda, Bafoussam',
      phone: '+237677890123',
      whatsapp: '+237677890123',
      specialty: 'Seeds, Soil nutrients, Pesticides',
      hours: 'Mon–Fri 7h30–17h30',
    },
  ],
  'Garoua': [
    {
      name: 'Nord Agro Supplies',
      address: 'Grand Marché de Garoua',
      phone: '+237699567891',
      whatsapp: '+237699567891',
      specialty: 'Cotton pesticides, Herbicides, Seeds',
      hours: 'Mon–Sat 7h–18h',
    },
    {
      name: 'SODECOTON Inputs Garoua',
      address: 'Route de Ngong, Garoua',
      phone: '+237222272500',
      whatsapp: '+237675678912',
      specialty: 'Cotton crop chemicals, Fertilisers',
      hours: 'Mon–Fri 7h30–15h30',
    },
    {
      name: 'AgriNord Garoua',
      address: 'Quartier Poumpoumré, Garoua',
      phone: '+237655901234',
      whatsapp: '+237655901234',
      specialty: 'Broad-spectrum pesticides, Soil treatment',
      hours: 'Mon–Sat 8h–17h',
    },
  ],
  'Maroua': [
    {
      name: 'Extrême-Nord Agro Centre',
      address: 'Grand Marché de Maroua',
      phone: '+237699012345',
      whatsapp: '+237699012345',
      specialty: 'Drought-resistant seeds, Pesticides',
      hours: 'Mon–Sat 7h–17h',
    },
    {
      name: 'SEMRY Agro Inputs',
      address: 'Domayo, Maroua',
      phone: '+237655112233',
      whatsapp: '+237655112233',
      specialty: 'Rice crop protection, Fertilisers',
      hours: 'Mon–Fri 8h–16h',
    },
  ],
  'Ngaoundéré': [
    {
      name: 'Adamaoua Agro Supplies',
      address: 'Marché Central, Ngaoundéré',
      phone: '+237677223344',
      whatsapp: '+237677223344',
      specialty: 'Livestock & crop dual-use chemicals',
      hours: 'Mon–Sat 7h30–18h',
    },
    {
      name: 'PlateauFarm Inputs',
      address: 'Baladji I, Ngaoundéré',
      phone: '+237699334455',
      whatsapp: '+237699334455',
      specialty: 'Pasture herbicides, Seed treatment',
      hours: 'Mon–Sat 8h–17h',
    },
  ],
  'Bertoua': [
    {
      name: 'Est Agro Bertoua',
      address: 'Quartier Haoussa, Bertoua',
      phone: '+237655445566',
      whatsapp: '+237655445566',
      specialty: 'Forest-edge crop protection, Fungicides',
      hours: 'Mon–Sat 8h–17h',
    },
    {
      name: 'CropCare Est',
      address: 'Grand Marché de Bertoua',
      phone: '+237677556677',
      whatsapp: '+237677556677',
      specialty: 'Insecticides, Herbicides',
      hours: 'Mon–Sat 7h–18h',
    },
  ],
  'Kumba': [
    {
      name: 'SW Agro Kumba',
      address: 'Fiango Market, Kumba',
      phone: '+237699667788',
      whatsapp: '+237699667788',
      specialty: 'Plantain & cocoa crop protection',
      hours: 'Mon–Sat 7h–18h',
    },
    {
      name: 'CocoCare Supplies Kumba',
      address: 'Kumba Town, Market Street',
      phone: '+237655778899',
      whatsapp: '+237655778899',
      specialty: 'Cocoa fungicides, Fertilisers',
      hours: 'Mon–Sat 8h–17h30',
    },
  ],
  'Buea': [
    {
      name: 'Fako Agro Inputs',
      address: 'Molyko, Great Soppo, Buea',
      phone: '+237677889900',
      whatsapp: '+237677889900',
      specialty: 'Vegetable crop chemicals, Seeds',
      hours: 'Mon–Sat 7h30–18h',
    },
    {
      name: 'UB Agro Supplies',
      address: 'Bonduma, Buea',
      phone: '+237699001122',
      whatsapp: '+237699001122',
      specialty: 'Research-grade fungicides, Bio-inputs',
      hours: 'Mon–Fri 8h–17h',
    },
    {
      name: 'MountainGrow Buea',
      address: 'Mile 17, Buea Road',
      phone: '+237655990011',
      whatsapp: '+237655990011',
      specialty: 'Highland crop protection, Soil amendments',
      hours: 'Mon–Sat 8h–18h',
    },
  ],
  'Limbe': [
    {
      name: 'Atlantic Agro Limbe',
      address: 'Down Beach Area, Limbe',
      phone: '+237677002233',
      whatsapp: '+237677002233',
      specialty: 'Coastal crop protection, Fungicides',
      hours: 'Mon–Sat 7h–18h',
    },
    {
      name: 'LimbeFarm Supplies',
      address: 'Bota, Limbe',
      phone: '+237699113344',
      whatsapp: '+237699113344',
      specialty: 'Rubber & palm crop chemicals',
      hours: 'Mon–Sat 8h–17h',
    },
  ],
  'Ebolowa': [
    {
      name: 'Sud Agro Ebolowa',
      address: 'Marché Central, Ebolowa',
      phone: '+237655224455',
      whatsapp: '+237655224455',
      specialty: 'Cocoa & cassava protection, Herbicides',
      hours: 'Mon–Sat 7h30–17h30',
    },
  ],
  'Kribi': [
    {
      name: 'Kribi Agro Supplies',
      address: 'Centre Commercial, Kribi',
      phone: '+237677335566',
      whatsapp: '+237677335566',
      specialty: 'Coastal farm inputs, Fertilisers',
      hours: 'Mon–Sat 8h–17h',
    },
  ],
  'Nkongsamba': [
    {
      name: 'Mungo Agro Centre',
      address: 'Grand Marché, Nkongsamba',
      phone: '+237699446677',
      whatsapp: '+237699446677',
      specialty: 'Coffee & banana crop protection',
      hours: 'Mon–Sat 7h–18h',
    },
  ],
  'Edéa': [
    {
      name: 'Sanaga Agro Inputs',
      address: 'Marché Edéa Centre',
      phone: '+237655557788',
      whatsapp: '+237655557788',
      specialty: 'Sugarcane & palm chemicals, Herbicides',
      hours: 'Mon–Sat 7h30–17h30',
    },
  ],
};

// Haversine formula: distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Find the nearest Cameroon city to given coordinates
function findNearestCity(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  for (const city of CAMEROON_CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng);
    if (d < minDist) { minDist = d; nearest = city; }
  }
  return { city: nearest, distanceKm: minDist };
}

// Format WhatsApp message with recommended treatment
function buildWhatsAppMessage(storeName, analysisResult) {
  const disease = analysisResult?.disease?.name || 'plant disease';
  const meds = (analysisResult?.medications || []).map(m => m.name).join(', ') || 'treatment chemicals';
  const msg = `Bonjour ${storeName}! J'ai besoin de traitement pour ${disease}. Est-ce que vous avez: ${meds}? Merci!`;
  return encodeURIComponent(msg);
}

// ── PHARMACY / AGRO-STORE FINDER ─────────
findPharmBtn.addEventListener('click', () => {
  findPharmBtn.disabled = true;
  findPharmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting your location...';

  if (!navigator.geolocation) {
    showCitySelector();
    resetPharmBtn();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const { city, distanceKm } = findNearestCity(lat, lng);
      showAgroStoreCards(city.name, distanceKm, lat, lng);
      resetPharmBtn();
    },
    () => {
      // Geolocation denied — show city picker
      showCitySelector();
      resetPharmBtn();
    },
    { timeout: 10000 }
  );
});

function showCitySelector() {
  const list = document.getElementById('pharmacyList');
  const cityOptions = CAMEROON_CITIES.map(c =>
    `<option value="${c.name}">${c.name}</option>`
  ).join('');

  list.innerHTML = `
    <div style="background:var(--blue-50,#eff6ff);border:1px solid var(--blue-200,#bfdbfe);border-radius:10px;padding:1rem;margin-bottom:0.75rem;">
      <p style="font-size:0.85rem;color:var(--gray-600);margin-bottom:0.5rem;">
        <i class="fas fa-map-marker-alt" style="color:#3b82f6"></i>
        Location access denied. Select your city:
      </p>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <select id="citySelect" style="flex:1;padding:0.5rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.9rem;background:#fff;">
          <option value="">— Choose a city —</option>
          ${cityOptions}
        </select>
        <button id="cityGoBtn" style="padding:0.5rem 1rem;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;white-space:nowrap;">
          <i class="fas fa-search"></i> Find
        </button>
      </div>
    </div>`;

  document.getElementById('cityGoBtn').addEventListener('click', () => {
    const sel = document.getElementById('citySelect').value;
    if (!sel) { showToast('Please select a city.', 'error'); return; }
    showAgroStoreCards(sel, null, null, null);
  });
}

function showAgroStoreCards(cityName, distanceKm, userLat, userLng) {
  const list = document.getElementById('pharmacyList');
  const stores = AGRO_STORES[cityName] || [];

  let headerHtml = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
      <div style="background:#dcfce7;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-map-marker-alt" style="color:#16a34a;font-size:0.85rem;"></i>
      </div>
      <div>
        <p style="font-weight:600;font-size:0.9rem;color:var(--gray-800)">Agro-stores in <strong>${cityName}</strong></p>
        ${distanceKm !== null ? `<p style="font-size:0.78rem;color:var(--gray-500)">Nearest city to you · ${distanceKm < 30 ? '📍 You appear to be in ' + cityName : '~' + Math.round(distanceKm) + ' km from city centre'}</p>` : ''}
      </div>
    </div>`;

  if (!stores.length) {
    list.innerHTML = headerHtml + `
      <div style="text-align:center;padding:1.5rem;color:var(--gray-400);">
        <i class="fas fa-store-slash" style="font-size:2rem;"></i>
        <p style="margin-top:0.5rem;">No stores listed yet for ${cityName}. Try searching on Google Maps.</p>
      </div>`;
    return;
  }

  const storeCards = stores.map(store => {
    const waMsg = buildWhatsAppMessage(store.name, state.analysisResult);
    const waLink = `https://wa.me/${store.whatsapp.replace(/\D/g,'')}?text=${waMsg}`;
    const callLink = `tel:${store.phone}`;
    const mapsLink = `https://www.google.com/maps/search/${encodeURIComponent(store.name + ' ' + store.address)}`;

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:0.9rem;margin-bottom:0.6rem;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:flex-start;gap:0.7rem;">
          <div style="background:#f0fdf4;border-radius:8px;width:36px;height:36px;min-width:36px;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-store" style="color:#16a34a;font-size:0.95rem;"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <h5 style="font-size:0.9rem;font-weight:600;color:var(--gray-800);margin:0 0 0.15rem;">${store.name}</h5>
            <p style="font-size:0.78rem;color:var(--gray-500);margin:0 0 0.1rem;"><i class="fas fa-map-pin" style="width:12px;"></i> ${store.address}</p>
            <p style="font-size:0.76rem;color:#059669;margin:0 0 0.1rem;"><i class="fas fa-tag" style="width:12px;"></i> ${store.specialty}</p>
            <p style="font-size:0.75rem;color:var(--gray-400);margin:0;"><i class="fas fa-clock" style="width:12px;"></i> ${store.hours}</p>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
          <a href="${waLink}" target="_blank" rel="noopener"
             style="flex:1;min-width:100px;display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem 0.6rem;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:600;">
            <i class="fab fa-whatsapp"></i> WhatsApp
          </a>
          <a href="${callLink}"
             style="flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem 0.6rem;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:600;">
            <i class="fas fa-phone"></i> Call
          </a>
          <a href="${mapsLink}" target="_blank" rel="noopener"
             style="display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem 0.7rem;background:#f3f4f6;color:#374151;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:600;">
            <i class="fas fa-map"></i> Map
          </a>
        </div>
      </div>`;
  }).join('');

  list.innerHTML = headerHtml + storeCards + `
    <p style="font-size:0.75rem;color:var(--gray-400);text-align:center;margin-top:0.5rem;">
      <i class="fas fa-info-circle"></i> WhatsApp message auto-includes your recommended treatment — just tap Send.
    </p>`;

  showToast(`Found ${stores.length} agro-stores in ${cityName}!`, 'success');
}

function resetPharmBtn() {
  findPharmBtn.disabled = false;
  findPharmBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Find Stores Near Me';
}

// ── UI HELPERS ────────────────────────────
function showLoading() {
  resultsEmpty.classList.add('hidden');
  resultsContent.classList.add('hidden');
  resultsLoading.classList.remove('hidden');
  document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function showEmpty() {
  resultsEmpty.classList.remove('hidden');
  resultsContent.classList.add('hidden');
  resultsLoading.classList.add('hidden');
}

let toastTimeout;
function showToast(message, type = 'success') {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ── SCROLL ANIMATIONS ─────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.step-card, .about-stat-card').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// ── SMOOTH NAV ────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
});

// Stop camera if user leaves the page
window.addEventListener('beforeunload', stopCamera);

// ══════════════════════════════════════════
//   FEATURE 1 — VOICE INPUT
//   Uses Web Speech API (SpeechRecognition)
// ══════════════════════════════════════════

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function createVoiceRecognizer(targetId, btnEl, appendMode = false) {
  if (!SpeechRecognition) {
    btnEl.title = 'Voice input not supported in this browser';
    btnEl.style.opacity = '0.4';
    btnEl.style.cursor = 'not-allowed';
    btnEl.addEventListener('click', () => {
      showToast('Voice not supported. Try Chrome or Edge.', 'error');
    });
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  let listening = false;
  let finalTranscript = '';

  btnEl.addEventListener('click', () => {
    if (listening) {
      rec.stop();
      return;
    }
    finalTranscript = appendMode ? '' : '';
    rec.start();
  });

  rec.onstart = () => {
    listening = true;
    btnEl.classList.add('listening');
    btnEl.innerHTML = '<i class="fas fa-stop"></i>';
    btnEl.title = 'Tap to stop recording';
    showToast('🎙️ Listening… speak now', 'success');
  };

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += t + ' ';
      else interim = t;
    }
    const el = document.getElementById(targetId);
    if (el) {
      const base = appendMode ? (el.value ? el.value.trimEnd() + ' ' : '') : '';
      el.value = base + finalTranscript + interim;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  rec.onerror = (e) => {
    listening = false;
    resetVoiceBtn(btnEl);
    if (e.error === 'not-allowed') showToast('Microphone access denied.', 'error');
    else if (e.error === 'no-speech') showToast('No speech detected. Try again.', 'error');
    else showToast(`Voice error: ${e.error}`, 'error');
  };

  rec.onend = () => {
    listening = false;
    resetVoiceBtn(btnEl);
    const el = document.getElementById(targetId);
    if (el && finalTranscript.trim()) {
      el.value = (appendMode && el.value ? el.value.trimEnd() + ' ' : '') + finalTranscript.trim();
      showToast('✅ Voice captured!', 'success');
    }
  };

  return rec;
}

function resetVoiceBtn(btn) {
  btn.classList.remove('listening');
  btn.innerHTML = '<i class="fas fa-microphone"></i>';
  btn.title = 'Tap to speak';
}

// Wire up voice buttons on the text & camera tabs
const voiceSymptomsBtn = document.getElementById('voiceSymptomsBtn');
const voiceCameraBtn   = document.getElementById('voiceCameraBtn');
if (voiceSymptomsBtn) createVoiceRecognizer('symptomsText', voiceSymptomsBtn, false);
if (voiceCameraBtn)   createVoiceRecognizer('cameraNotes',  voiceCameraBtn,   false);


// ══════════════════════════════════════════
//   FEATURE 2 — FOLLOW-UP CHAT
// ══════════════════════════════════════════

const followupPanel  = document.getElementById('followupPanel');
const chatMessages   = document.getElementById('chatMessages');
const chatInput      = document.getElementById('chatInput');
const chatSendBtn    = document.getElementById('chatSendBtn');
const chatVoiceBtn   = document.getElementById('chatVoiceBtn');

// Conversation history sent to the AI each time (includes context)
let chatHistory = [];

// Show the follow-up panel once a diagnosis is ready
function showFollowupPanel(analysisResult) {
  if (!followupPanel) return;

  // Prime the history with diagnosis context so the AI knows what was found
  const diseaseName = analysisResult?.disease?.name || 'unknown disease';
  const meds = (analysisResult?.medications || []).map(m => m.name).join(', ') || 'none listed';
  const urgency = analysisResult?.urgency || 'unknown';

  chatHistory = [
    {
      role: 'user',
      content: `Context: You are Gro, an AI plant disease assistant. The user just received this diagnosis:
- Disease: ${diseaseName}
- Urgency: ${urgency}
- Recommended medications: ${meds}
- Treatment summary: ${JSON.stringify(analysisResult?.treatment || {})}

Answer the user's follow-up questions helpfully and concisely. Stay focused on plant health, treatment, and agronomy. If asked something unrelated, gently redirect. Respond in the same language the user writes in.`,
    },
    {
      role: 'assistant',
      content: `Understood. I have the diagnosis context for ${diseaseName} and I'm ready to answer follow-up questions.`,
    },
  ];

  // Reset visible messages to a fresh greeting referencing the disease
  chatMessages.innerHTML = `
    <div class="chat-bubble bot">
      <span>I've finished diagnosing your plant. It looks like <strong>${diseaseName}</strong>. Do you have any questions about the treatment, dosage, or what to do next? 🌿</span>
      <span class="chat-meta">Gro AI</span>
    </div>`;

  followupPanel.classList.remove('hidden');
  followupPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Append a message bubble to the chat
function appendChatBubble(role, text) {
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `<span>${text.replace(/\n/g, '<br>')}</span><span class="chat-meta">${role === 'user' ? 'You' : 'Gro AI'} · ${now}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// Show animated typing indicator
function showTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'chat-bubble bot typing';
  div.id = 'typingIndicator';
  div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// Send a chat message to the backend and get a reply
async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatSendBtn.disabled = true;

  // Add user bubble
  appendChatBubble('user', text);

  // Add to history
  chatHistory.push({ role: 'user', content: text });

  // Show typing dots
  showTypingIndicator();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
    });

    removeTypingIndicator();

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || 'Sorry, I could not generate a response.';

    // Add assistant reply to history and UI
    chatHistory.push({ role: 'assistant', content: reply });
    appendChatBubble('bot', reply);

  } catch (err) {
    removeTypingIndicator();
    appendChatBubble('bot', `⚠️ Error: ${err.message}. Please check your connection and try again.`);
  } finally {
    chatSendBtn.disabled = false;
    chatInput.focus();
  }
}

// Send on button click
if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);

// Send on Enter key (Shift+Enter = new line)
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  });
}

// Voice input for chat
if (chatVoiceBtn) createVoiceRecognizer('chatInput', chatVoiceBtn, true);