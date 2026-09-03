/**
 * Engine 3D Memahat Kayu Interaktif - Pasak Nusantara
 */

let scene, camera, renderer, controls;
let objekKayu, gridHelper;
let raycaster, mouse;

let jenisBentukAktif = 'balok';
let alatAktif = 'gergaji';
let faseAktif = 'pahat';

// Variabel Memahat & Simulasi
let bekasPahatan = []; // Menyimpan koordinat pemahatan/pengeboran
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

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe8d6, 0.9);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Setup Raycaster untuk Interaksi Klik Memahat
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Material Kayu & Material Bekas Pahatan
  window.woodMaterial = new THREE.MeshStandardMaterial({
    map: buatTeksturKayu(),
    roughness: 0.6,
    metalness: 0.1
  });

  window.cutMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c3a21, // Warna bagian dalam kayu yang terpahat/terpotong
    roughness: 0.8
  });

  updateBentuk();

  // Event Listener Interaksi Memahat pada Canvas
  renderer.domElement.addEventListener('pointerdown', onCanvasClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

// Generasi Tekstur Serat Kayu Alami
function buatTeksturKayu() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#a67c52';
  for (let i = 0; i < 500; i++) {
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

// Reset dan Render Ulang Objek Kayu
function updateBentuk() {
  // Hapus pahatan lama jika bahan diganti
  bekasPahatan.forEach(mesh => scene.remove(mesh));
  bekasPahatan = [];

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
  } else {
    const p = parseFloat(document.getElementById('silinderP').value) || 25;
    const d = parseFloat(document.getElementById('silinderD').value) || 6;
    const r = d / 2;

    geometry = new THREE.CylinderGeometry(r, r, p, 32);
    gridHelper = new THREE.GridHelper(r * 5, 8, 0x4a82e8, 0x333346);
    gridHelper.position.y = -p / 2;
  }

  scene.add(gridHelper);
  objekKayu = new THREE.Mesh(geometry, window.woodMaterial);
  objekKayu.castShadow = true;
  objekKayu.receiveShadow = true;
  scene.add(objekKayu);
}

// Interaksi Memahat Langsung pada Objek Kayu
function onCanvasClick(event) {
  if (faseAktif !== 'pahat' || !objekKayu) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(objekKayu);

  if (intersects.length > 0) {
    const hit = intersects[0];
    pahatKayuDiTitik(hit.point, hit.face.normal);
  }
}

// Efek Pemahatan/Pemotongan Berdasarkan Alat yang Dipilih
function pahatKayuDiTitik(titik, normal) {
  let pahatGeo;

  if (alatAktif === 'bor') {
    // Membuat lubang silinder (Bor)
    pahatGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 16);
  } else if (alatAktif === 'pahat') {
    // Membuat Takik/Coakan Persegi (Pahat)
    pahatGeo = new THREE.BoxGeometry(2, 2, 2);
  } else if (alatAktif === 'gergaji') {
    // Membuat Alur Potongan Tipis (Gergaji)
    pahatGeo = new THREE.BoxGeometry(0.3, 3, 3);
  }

  const bekas = new THREE.Mesh(pahatGeo, window.cutMaterial);
  bekas.position.copy(titik);

  // Sesuaikan orientasi pahatan dengan permukaan kayu
  const target = titik.clone().add(normal);
  bekas.lookAt(target);

  scene.add(bekas);
  bekasPahatan.push(bekas);
}

// Handler Pemilihan Bahan
function pilihBahan(jenis) {
  jenisBentukAktif = jenis;

  document.getElementById('item-balok').classList.toggle('active', jenis === 'balok');
  document.getElementById('item-silinder').classList.toggle('active', jenis === 'silinder');

  document.getElementById('formBalok').style.display = (jenis === 'balok') ? 'flex' : 'none';
  document.getElementById('formSilinder').style.display = (jenis === 'silinder') ? 'flex' : 'none';

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

// Handler Kontrol Fase
function setFase(fase) {
  faseAktif = fase;

  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');

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

  // Efek Getaran Uji Gempa
  if (sedangUjiGempa && objekKayu) {
    waktuGempa += 0.2;
    const getar = Math.sin(waktuGempa * 3) * 0.08;
    objekKayu.rotation.x = getar;
    objekKayu.rotation.z = getar;

    bekasPahatan.forEach(b => {
      b.rotation.x = getar;
      b.rotation.z = getar;
    });
  }

  controls.update();
  renderer.render(scene, camera);
}

// Binding ke Window Scope agar dipanggil sempurna dari index.html
window.pilihBahan = pilihBahan;
window.pilihAlat = pilihAlat;
window.setFase = setFase;
window.updateBentuk = updateBentuk;
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.handleDrop = handleDrop;

window.addEventListener('DOMContentLoaded', init3D);
