// Variable Utama Three.js
let scene, camera, renderer, controls;
let currentMesh = null;
let activeBahan = 'balok';
let activeAlat = 'gergaji';
let activeFase = 'pahat';

// Inisialisasi Canvas 3D saat dokumen selesai dimuat
window.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  updateBentuk();
});

function initThreeJS() {
  const container = document.getElementById('viewport');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  // Camera
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(30, 30, 40);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Controls (Orbit)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Grid Dasar Lantai
  const gridHelper = new THREE.GridHelper(60, 60, 0x444455, 0x222233);
  scene.add(gridHelper);

  // Helper Sumbu Global (Merah = X, Hijau = Y, Biru = Z)
  const globalAxes = new THREE.AxesHelper(15);
  scene.add(globalAxes);

  window.addEventListener('resize', onWindowResize);
  animate();
}

// Fungsi Mengganti Bahan (Balok / Silinder)
function pilihBahan(jenis) {
  activeBahan = jenis;

  document.getElementById('item-balok').classList.toggle('active', jenis === 'balok');
  document.getElementById('item-silinder').classList.toggle('active', jenis === 'silinder');

  document.getElementById('formBalok').style.display = (jenis === 'balok') ? 'flex' : 'none';
  document.getElementById('formSilinder').style.display = (jenis === 'silinder') ? 'flex' : 'none';

  updateBentuk();
}

// Fungsi Mengganti Alat (Gergaji / Pahat / Bor)
function pilihAlat(alat) {
  activeAlat = alat;

  document.getElementById('item-gergaji').classList.toggle('active', alat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', alat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', alat === 'bor');
}

// Fungsi Mengganti Fase Simulasi
function setFase(fase) {
  activeFase = fase;

  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');
}

// Memperbarui Geometri Objek Kayu + Strimin Panduan + Sumbu Lokal X, Y, Z
function updateBentuk() {
  if (currentMesh) scene.remove(currentMesh);

  currentMesh = new THREE.Group();

  let geometry;
  const material = new THREE.MeshStandardMaterial({
    color: 0xc28e0e,
    roughness: 0.6,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });

  let height = 30;

  if (activeBahan === 'balok') {
    const p = parseFloat(document.getElementById('balokP').value) || 10;
    const l = parseFloat(document.getElementById('balokL').value) || 10;
    const t = parseFloat(document.getElementById('balokT').value) || 30;
    height = t;

    geometry = new THREE.BoxGeometry(p, t, l);
  } else if (activeBahan === 'silinder') {
    const p = parseFloat(document.getElementById('silinderP').value) || 25;
    const d = parseFloat(document.getElementById('silinderD').value) || 4;
    const radius = d / 2;
    height = p;

    geometry = new THREE.CylinderGeometry(radius, radius, p, 16);
  }

  // 1. Mesh Utama Kayu
  const woodMesh = new THREE.Mesh(geometry, material);
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  currentMesh.add(woodMesh);

  // 2. Strimin Panduan (Wireframe Overlay Transparan)
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x4a82e8,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const striminOverlay = new THREE.Mesh(geometry, wireframeMat);
  currentMesh.add(striminOverlay);

  // 3. Outlines Rusuk Tegas (Edges)
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x61afef, linewidth: 2 });
  const wireframeEdges = new THREE.LineSegments(edgesGeometry, lineMat);
  currentMesh.add(wireframeEdges);

  // 4. Indicator Sumbu Lokal Kayu (X, Y, Z)
  const objectAxes = new THREE.AxesHelper(Math.max(height * 0.4, 8));
  currentMesh.add(objectAxes);

  // Posisikan di atas permukaan lantai (Grid Y=0)
  currentMesh.position.set(0, height / 2, 0);

  scene.add(currentMesh);
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
