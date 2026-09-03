/**
 * Engine 3D Bengkel Pasak Nusantara (Three.js & Stock Interactivity)
 */

let scene, camera, renderer, controls;
let objekKayu, gridHelper;
let jenisBentukAktif = 'balok';
let alatAktif = 'gergaji';
let faseAktif = 'pahat';

function init3D() {
  const container = document.getElementById('viewport');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(30, 25, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe8d6, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Buat Material Tekstur Kayu
  window.woodMaterial = new THREE.MeshStandardMaterial({
    map: buatTeksturKayu(),
    roughness: 0.6,
    metalness: 0.1
  });

  updateBentuk();
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

// Update Render Objek 3D
function updateBentuk() {
  if (objekKayu) scene.remove(objekKayu);
  if (gridHelper) scene.remove(gridHelper);

  let geometry;

  if (jenisBentukAktif === 'balok') {
    const p = parseFloat(document.getElementById('balokP').value) || 10;
    const l = parseFloat(document.getElementById('balokL').value) || 10;
    const t = parseFloat(document.getElementById('balokT').value) || 30;

    geometry = new THREE.BoxGeometry(p, t, l);
    
    gridHelper = new THREE.GridHelper(Math.max(p, l) * 1.5, 10, 0x4a82e8, 0x333346);
    gridHelper.position.y = -t / 2;
    scene.add(gridHelper);

  } else {
    const p = parseFloat(document.getElementById('silinderP').value) || 25;
    const d = parseFloat(document.getElementById('silinderD').value) || 6;
    const r = d / 2;

    geometry = new THREE.CylinderGeometry(r, r, p, 32);

    gridHelper = new THREE.GridHelper(r * 4, 8, 0x4a82e8, 0x333346);
    gridHelper.position.y = -p / 2;
    scene.add(gridHelper);
  }

  objekKayu = new THREE.Mesh(geometry, window.woodMaterial);
  objekKayu.castShadow = true;
  objekKayu.receiveShadow = true;
  scene.add(objekKayu);
}

// Handler Pemilihan Bahan (Klik & Drag)
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
  document.getElementById('item-gergaji').classList.toggle('active', alat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', alat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', alat === 'bor');
}

// Logika Drag and Drop ke Canvas
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

// Control Fase
function setFase(fase) {
  faseAktif = fase;
  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');

  if (fase === 'uji') {
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

window.onload = init3D;
