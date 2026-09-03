/**
 * Engine 3D Bengkel Memahat Pasak Nusantara
 * Fitur: Sumbu Koordinat Vertikal (Y) + Perbaikan Visual Silinder/Pasak
 */

let scene, camera, renderer, controls;
let objekKayu, gridHelper, axesHelper;
let raycaster, mouse;

let jenisBentukAktif = 'balok';
let alatAktif = 'gergaji';
let faseAktif = 'pahat';

let bekasPahatan = [];
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

  // 1. TAMBAHKAN SUMBU KOORDINAT 3D (AxesHelper)
  // Hijau = Vertikal (Y), Merah = X, Biru = Z
  axesHelper = new THREE.AxesHelper(20);
  // Menebalkan sumbu agar terlihat jelas
  axesHelper.renderOrder = 1;
  scene.add(axesHelper);

  // Pencahayaan
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe8d6, 0.9);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Tekstur Kayu
  window.woodMaterial = new THREE.MeshStandardMaterial({
    map: buatTeksturKayu(),
    roughness: 0.6,
    metalness: 0.1
  });

  window.cutMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a2e18,
    roughness: 0.8
  });

  updateBentuk();

  renderer.domElement.addEventListener('pointerdown', onCanvasClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

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

// Update Render Objek 3D (Silinder & Balok)
function updateBentuk() {
  // Bersihkan pahatan lama
  bekasPahatan.forEach(mesh => {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
  });
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
  let tinggiObjek = 0;

  if (jenisBentukAktif === 'balok') {
    const p = parseFloat(document.getElementById('balokP').value) || 10;
    const l = parseFloat(document.getElementById('balokL').value) || 10;
    const t = parseFloat(document.getElementById('balokT').value) || 30;

    tinggiObjek = t;
    geometry = new THREE.BoxGeometry(p, t, l);
    gridHelper = new THREE.GridHelper(Math.max(p, l) * 2.5, 10, 0x4a82e8, 0x333346);
  } else {
    // 2. PERBAIKAN SILINDER / PASAK
    const p = parseFloat(document.getElementById('silinderP').value) || 25; // Panjang/Tinggi Vertikal
    const d = parseFloat(document.getElementById('silinderD').value) || 6;  // Diameter
    const r = d / 2;

    tinggiObjek = p;
    // CylinderGeometry(radiusAtas, radiusBawah, tinggi, radialSegments)
    geometry = new THREE.CylinderGeometry(r, r, p, 32);
    gridHelper = new THREE.GridHelper(d * 4, 10, 0x4a82e8, 0x333346);
  }

  gridHelper.position.y = 0; // Grid berada tepat di dasar sumbu (Y = 0)
  scene.add(gridHelper);

  objekKayu = new THREE.Mesh(geometry, window.woodMaterial);
  
  // Posisi Y diatur sebesar (Tinggi / 2) agar bagian alas kayu berada pas di Y = 0 (Grid)
  objekKayu.position.set(0, tinggiObjek / 2, 0);
  
  objekKayu.castShadow = true;
  objekKayu.receiveShadow = true;
  scene.add(objekKayu);
}

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

function pahatKayuDiTitik(titik, normal) {
  let pahatGeo;

  if (alatAktif === 'bor') {
    pahatGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 16);
  } else if (alatAktif === 'pahat') {
    pahatGeo = new THREE.BoxGeometry(2, 2, 2);
  } else if (alatAktif === 'gergaji') {
    pahatGeo = new THREE.BoxGeometry(0.3, 3, 3);
  }

  const bekas = new THREE.Mesh(pahatGeo, window.cutMaterial);
  bekas.position.copy(titik);

  const target = titik.clone().add(normal);
  bekas.lookAt(target);

  scene.add(bekas);
  bekasPahatan.push(bekas);
}

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

function pilihAlat(alat) {
  alatAktif = alat;
  ['gergaji', 'pahat', 'bor'].forEach(a => {
    const el = document.getElementById(`item-${a}`);
    if (el) el.classList.toggle('active', a === alat);
  });
}

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
    if (objekKayu) {
      const t = jenisBentukAktif === 'balok' ? 
        parseFloat(document.getElementById('balokT').value) || 30 : 
        parseFloat(document.getElementById('silinderP').value) || 25;
      objekKayu.position.set(0, t / 2, 0);
      objekKayu.rotation.set(0, 0, 0);
    }
  }
}

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

function animate() {
  requestAnimationFrame(animate);

  if (sedangUjiGempa && objekKayu) {
    waktuGempa += 0.2;
    const getar = Math.sin(waktuGempa * 3) * 0.08;
    objekKayu.rotation.x = getar;
    objekKayu.rotation.z = getar;
  }

  controls.update();
  renderer.render(scene, camera);
}

window.pilihBahan = pilihBahan;
window.pilihAlat = pilihAlat;
window.setFase = setFase;
window.updateBentuk = updateBentuk;
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.handleDrop = handleDrop;

window.addEventListener('DOMContentLoaded', init3D);
