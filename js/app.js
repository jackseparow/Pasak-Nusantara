/**
 * Engine 3D Bengkel Pasak Nusantara (Three.js & Stock Interactivity)
 */

let scene, camera, renderer, controls;
let objekKayu, gridHelper;
let jenisBentukAktif = 'balok';
let alatAktif = 'gergaji';
let faseAktif = 'pahat';

// Variabel Kontrol Uji Gempa
let sedangUjiGempa = false;
let waktuGempa = 0;

function init3D() {
  const container = document.getElementById('viewport');
  if (!container) return;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(30, 25, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe8d6, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Material Tekstur Kayu
  window.woodMaterial = new THREE.MeshStandardMaterial({
    map: buatTeksturKayu(),
    roughness: 0.6,
    metalness: 0.1
  });

  updateBentuk();
  window.addEventListener('resize', onWindowResize);
  animate();
}

// Generasi Tekstur Serat Kayu Alami via Canvas 2D
function buatTeksturKayu() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#a67c52';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = Math.random() * 2 + 1;
    const h = Math.random() * 80 + 20;
    ctx.fillRect(x, y, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Update Render Objek 3D & Pembersihan Memori Geometry
function updateBentuk() {
  if (objekKayu) {
    scene.remove(objekKayu);
    if (objekKayu.geometry) objekKayu.geometry.dispose();
  }
  if (gridHelper) {
    scene.remove(gridHelper);
    gridHelper.dispose();
  }

  let geometry;

  if (jenisBentukAktif === 'balok') {
    const p = parseFloat(document.getElementById('balokP').value) || 10;
    const l = parseFloat(document.getElementById('balokL').value) || 10;
    const t = parseFloat(document.getElementById('balokT').value) || 30;

    geometry = new THREE.BoxGeometry(p, t, l);
    
    gridHelper = new THREE.GridHelper(Math.max(p, l) * 2, 10, 0x4a82e8, 0x333346);
    gridHelper.position.y = -t / 2;
    scene.add(gridHelper);

  } else {
    const p = parseFloat(document.getElementById('silinderP').value) || 25;
    const d = parseFloat(document.getElementById('silinderD').value) || 6;
    const r = d / 2;

    geometry = new THREE.CylinderGeometry(r, r, p, 32);

    gridHelper = new THREE.GridHelper(r * 5, 8, 0x4a82e8, 0x333346);
    gridHelper.position.y = -p / 2;
    scene.add(gridHelper);
  }

  objekKayu = new THREE.Mesh(geometry, window.woodMaterial);
  objekKayu.castShadow = true;
  objekKayu.receiveShadow = true;
  scene.add(objekKayu);
}

// Handler Pemilihan Bahan
function pilihBahan(jenis) {
  jenisBentukAktif = jenis;
  
  const elBalok = document.getElementById('item-balok');
  const elSilinder = document.getElementById('item-silinder');
  if (elBalok) elBalok.classList.toggle('active', jenis === 'balok');
  if (elSilinder) elSilinder.classList.toggle('active', jenis === 'silinder');

  const formBalok = document.getElementById('formBalok');
  const formSilinder = document.getElementById('formSilinder');
  if (formBalok) formBalok.style.display = (jenis === 'balok') ? 'flex' : 'none';
  if (formSilinder) formSilinder.style.display = (jenis === 'silinder') ? 'flex' : 'none';

  updateBentuk();
}

// Handler Pemilihan Alat
function pilihAlat(alat) {
  alatAktif = alat;
  ['gergaji', 'pahat', 'bor'].forEach(a => {
    const el = document.getElementById(`item-${a}`);
    if (el) el.classList.toggle('active', a === alat);
  });
}

// Handler Fase & Simulasi Gempa
function setFase(fase) {
  faseAktif = fase;
  
  const btnPahat = document.getElementById('fasePahat');
  const btnRakit = document.getElementById('faseRakit');
  const btnUji = document.getElementById('faseUji');
  
  if (btnPahat) btnPahat.classList.toggle('active', fase === 'pahat');
  if (btnRakit) btnRakit.classList.toggle('active', fase === 'rakit');
  if (btnUji) btnUji.classList.toggle('active', fase === 'uji');

  if (fase === 'uji') {
    sedangUjiGempa = true;
    waktuGempa = 0;
  } else {
    sedangUjiGempa = false;
    if (objekKayu) objekKayu.rotation.set(0, 0, 0);
  }
}

// Drag & Drop Handlers
function dragStart(event, jenisBahan) {
  event.dataTransfer.setData('jenisBahan', jenisBahan);
}

function allowDrop(event) {
  event.preventDefault();
}

function handleDrop(event) {
  event.preventDefault();
  const jenisBahan = event.dataTransfer.getData('jenisBahan');
  if (jenisBahan) {
    pilihBahan(jenisBahan);
  }
}

function onWindowResize() {
  const container = document.getElementById('viewport');
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Loop Animasi Utama
function animate() {
  requestAnimationFrame(animate);

  // Efek Getaran Gempa Real-Time
  if (sedangUjiGempa && objekKayu) {
    waktuGempa += 0.2;
    objekKayu.rotation.x = Math.sin(waktuGempa * 3) * 0.08;
    objekKayu.rotation.z = Math.cos(waktuGempa * 2.5) * 0.08;
  }

  controls.update();
  renderer.render(scene, camera);
}

// Global Scope Binding (Memastikan HTML dapat memanggil fungsi-fungsi ini tanpa error)
window.pilihBahan = pilihBahan;
window.pilihAlat = pilihAlat;
window.setFase = setFase;
window.updateBentuk = updateBentuk;
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.handleDrop = handleDrop;

// Jalankan Inisialisasi
window.addEventListener('DOMContentLoaded', init3D);
