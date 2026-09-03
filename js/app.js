/**
 * Engine 3D Bengkel Pasak Nusantara (Three.js)
 */

let scene, camera, renderer, controls;
let objekKayu, gridHelper;
let jenisBentukAktif = 'balok';
let faseAktif = 'pahat';

// Inisialisasi Canvas Three.js
function init3D() {
  const container = document.getElementById('viewport');
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121218);

  // Camera
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(30, 25, 40);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Orbit Controls (Rotasi Kamera 3D)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Pencahayaan / Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe8d6, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Buat Tekstur Kayu Prosedural (Kanvas)
  const woodTexture = buatTeksturKayu();

  // Material Tekstur Kayu
  window.woodMaterial = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.6,
    metalness: 0.1
  });

  // Tampilkan Objek Pertama Kali
  updateBentuk();

  // Responsive Canvas Resize
  window.addEventListener('resize', onWindowResize);

  // Loop Animasi
  animate();
}

// Fungsi Membuat Tekstur Serat Kayu Otomatis (Prosedural)
function buatTeksturKayu() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Warna Dasar Kayu Warm Brown
  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(0, 0, 512, 512);

  // Garis-garis Serat Kayu
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

// Update Bentuk (Balok / Silinder) Berdasarkan Variable Input
function updateBentuk() {
  if (objekKayu) scene.remove(objekKayu);
  if (gridHelper) scene.remove(gridHelper);

  let geometry;

  if (jenisBentukAktif === 'balok') {
    const p = parseFloat(document.getElementById('balokP').value) || 10;
    const l = parseFloat(document.getElementById('balokL').value) || 10;
    const t = parseFloat(document.getElementById('balokT').value) || 30;

    geometry = new THREE.BoxGeometry(p, t, l);
    
    // Grid Strimin Panduan Balok
    gridHelper = new THREE.GridHelper(Math.max(p, l) * 1.5, 10, 0x4a82e8, 0x444455);
    gridHelper.position.y = -t / 2;
    scene.add(gridHelper);

  } else {
    const p = parseFloat(document.getElementById('silinderP').value) || 25;
    const d = parseFloat(document.getElementById('silinderD').value) || 6;
    const r = d / 2;

    geometry = new THREE.CylinderGeometry(r, r, p, 32);

    // Grid Strimin Panduan Silinder
    gridHelper = new THREE.GridHelper(r * 4, 8, 0x4a82e8, 0x444455);
    gridHelper.position.y = -p / 2;
    scene.add(gridHelper);
  }

  objekKayu = new THREE.Mesh(geometry, window.woodMaterial);
  objekKayu.castShadow = true;
  objekKayu.receiveShadow = true;
  scene.add(objekKayu);
}

// Beralih Antara Balok & Silinder
function pilihBentuk(jenis) {
  jenisBentukAktif = jenis;
  document.getElementById('btnBalok').classList.toggle('active', jenis === 'balok');
  document.getElementById('btnSilinder').classList.toggle('active', jenis === 'silinder');

  document.getElementById('formBalok').style.display = (jenis === 'balok') ? 'flex' : 'none';
  document.getElementById('formSilinder').style.display = (jenis === 'silinder') ? 'flex' : 'none';

  updateBentuk();
}

// Pengaturan Alat Pahat
function pilihAlat(namaAlat) {
  const buttons = document.querySelectorAll('.btn-tool');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

// Pengaturan Fase Permainan
function setFase(fase) {
  faseAktif = fase;
  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');

  if (fase === 'uji') {
    // Animasi Simulasi Goyangan Gempa Sederhana
    let count = 0;
    const interval = setInterval(() => {
      if (objekKayu) {
        objekKayu.rotation.x = Math.sin(count * 0.5) * 0.1;
        objekKayu.rotation.z = Math.cos(count * 0.5) * 0.1;
      }
      count++;
      if (count > 20) {
        clearInterval(interval);
        objekKayu.rotation.set(0, 0, 0);
      }
    }, 50);
  }
}

function onWindowResize() {
  const container = document.getElementById('viewport');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Jalankan Engine saat Halaman Selesai Dimuat
window.onload = init3D;
