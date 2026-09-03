/**
 * Inisialisasi Aplikasi, Handler Real-Time Update, dan Manajemen Fase Game
 */

// Variable Status Fase Aktif
var faseAktif = 'pahat';

// Inisialisasi Workspace Blockly
var workspace = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox'),
  scrollbars: true,
  trashcan: true,
  zoom: {
    controls: true,
    wheel: true,
    startScale: 1.0,
    maxScale: 3,
    minScale: 0.3,
    scaleSpeed: 1.2
  }
});

// Update Output Kode secara Real-time
function updateCode() {
  var code = Blockly.JavaScript.workspaceToCode(workspace);
  var outputElement = document.getElementById('codeOutput');
  
  if (code.trim() === '') {
    outputElement.textContent = '// Susun blok di sebelah kiri untuk merancang Pasak Nusantara...';
  } else {
    outputElement.textContent = renderFaseOutput(code);
  }
}

// Fungsi untuk Mengubah Fase Permainan
function setFase(fase) {
  faseAktif = fase;
  
  // Reset Status Tombol
  document.getElementById('btnPahat').classList.remove('active');
  document.getElementById('btnRakit').classList.remove('active');
  document.getElementById('btnUji').classList.remove('active');
  
  var statusText = document.getElementById('phaseStatus');

  if (fase === 'pahat') {
    document.getElementById('btnPahat').classList.add('active');
    statusText.textContent = "Fase 1: Pahat & Ukur Modul Kayu";
  } else if (fase === 'rakit') {
    document.getElementById('btnRakit').classList.add('active');
    statusText.textContent = "Fase 2: Pasang & Sambung Pasak Kayu";
  } else if (fase === 'uji') {
    document.getElementById('btnUji').classList.add('active');
    statusText.textContent = "Fase 3: Simulasi Ketahanan Gempa";
  }

  updateCode();
}

// Format Tampilan Output Berdasarkan Fase
function renderFaseOutput(code) {
  if (faseAktif === 'pahat') {
    return `// --- FASE 1: PAHAT & UKUR ---\n` + code;
  } else if (faseAktif === 'rakit') {
    return `// --- FASE 2: PASANG & SAMBUNG ---\n// Memeriksa kepresisian kuncian...\n\n` + code;
  } else if (faseAktif === 'uji') {
    return `// --- FASE 3: SIMULASI GEMPA ---\n// [STATUS]: Menguji kekuatan struktur kuncian...\n\n` + code;
  }
  return code;
}

// Event Listener
workspace.addChangeListener(updateCode);
