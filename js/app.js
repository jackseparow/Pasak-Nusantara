// Variable Utama Three.js
let scene, camera, renderer, controls;
let currentMesh = null;
let activeBahan = 'balok';
let activeAlat = 'gergaji';
let activeFase = 'pahat';

// Inisialisasi Canvas 3D saat dokumen dimuat
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

  // Pencahayaan (Lighting)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Grid & Helper Sumbu (X=Red, Y=Green, Z=Blue)
  const gridHelper = new THREE.GridHelper(60, 60, 0x444455, 0x222233);
  scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(15);
  scene.add(axesHelper);

  // Resizing Event Listener
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

// Fungsi Mengganti Bahan
function pilihBahan(jenis) {
  activeBahan = jenis;

  document.getElementById('item-balok').classList.toggle('active', jenis === 'balok');
  document.getElementById('item-silinder').classList.toggle('active', jenis === 'silinder');

  document.getElementById('formBalok').style.display = (jenis === 'balok') ? 'flex' : 'none';
  document.getElementById('formSilinder').style.display = (jenis === 'silinder') ? 'flex' : 'none';

  updateBentuk();
}

// Fungsi Mengganti Alat
function pilihAlat(alat) {
  activeAlat = alat;

  document.getElementById('item-gergaji').classList.toggle('active', alat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', alat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', alat === 'bor');

  console.log(`Alat aktif dikonfigurasi ke: ${activeAlat}`);
}

// Fungsi Mengganti Fase Simulasi
function setFase(fase) {
  activeFase = fase;

  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');

  console.log(`Fase aktif dikonfigurasi ke: ${activeFase}`);
}

// Memperbarui Geometri Objek Kayu di Viewport
function updateBentuk() {
  if (currentMesh) scene.remove(currentMesh);

  let geometry;
  // Material serat kayu sederhana
  const material = new THREE.MeshStandardMaterial({
    color: 0xc28e0e,
    roughness: 0.6,
    metalness: 0.1
  });

  if (activeBahan === 'balok') {
    const p = parseFloat(document.getElementById('balokP').value) || 10;
    const l = parseFloat(document.getElementById('balokL').value) || 10;
    const t = parseFloat(document.getElementById('balokT').value) || 30;

    // Parameters: Width (X), Height (Y), Depth (Z)
    geometry = new THREE.BoxGeometry(p, t, l);
    currentMesh = new THREE.Mesh(geometry, material);
    currentMesh.position.set(0, t / 2, 0);

  } else if (activeBahan === 'silinder') {
    const p = parseFloat(document.getElementById('silinderP').value) || 25;
    const d = parseFloat(document.getElementById('silinderD').value) || 4;
    const radius = d / 2;

    // Parameters: RadiusTop, RadiusBottom, Height (Y), RadialSegments
    geometry = new THREE.CylinderGeometry(radius, radius, p, 32);
    currentMesh = new THREE.Mesh(geometry, material);
    currentMesh.position.set(0, p / 2, 0);
  }

  if (currentMesh) {
    currentMesh.castShadow = true;
    currentMesh.receiveShadow = true;
    scene.add(currentMesh);
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
