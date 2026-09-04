let scene, camera, renderer, controls;
let bendaKerjaList = [];
let selectedObjIndex = -1;
let jenisBahanBaru = 'balok';
let activeAlat = 'gergaji';
let activeFase = 'pahat';

// Visualisasi Alat 3D & Raycasting
let toolGroup = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let targetGridPoint = new THREE.Vector3();
let isTargetLocked = false;

window.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  tambahBendaKerja();
});

function initThreeJS() {
  const container = document.getElementById('viewport');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(35, 35, 45);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(30, 50, 30);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(60, 60, 0x444455, 0x222233);
  scene.add(gridHelper);

  const globalAxes = new THREE.AxesHelper(15);
  scene.add(globalAxes);

  // Buat Alat 3D
  create3DTool();

  // Event Listener Interaksi Kursor di Viewport
  container.addEventListener('mousemove', onViewportMouseMove);
  container.addEventListener('click', onViewportClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

/* --- PEMBUATAN BENTUK ALAT 3D --- */
function create3DTool() {
  if (toolGroup) scene.remove(toolGroup);

  toolGroup = new THREE.Group();

  if (activeAlat === 'gergaji') {
    // Bilah Gergaji Tipis
    const bladeGeo = new THREE.BoxGeometry(0.2, 6, 12);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);

    // Pegangan Gergaji
    const handleGeo = new THREE.BoxGeometry(0.6, 2.5, 3);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd9534f });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 3, -6);

    toolGroup.add(blade);
    toolGroup.add(handle);

  } else if (activeAlat === 'pahat') {
    // Batang Pahat
    const chiselGeo = new THREE.BoxGeometry(0.8, 8, 0.3);
    const chiselMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9, roughness: 0.1 });
    const chisel = new THREE.Mesh(chiselGeo, chiselMat);

    // Gagang Kayu
    const handleGeo = new THREE.CylinderGeometry(0.6, 0.5, 4, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 5, 0);

    toolGroup.add(chisel);
    toolGroup.add(handle);

  } else if (activeAlat === 'bor') {
    // Mata Bor Silinder
    const drillGeo = new THREE.CylinderGeometry(0.6, 0.1, 8, 16);
    const drillMat = new THREE.MeshStandardMaterial({ color: 0x4a82e8, metalness: 0.8, roughness: 0.3 });
    const drill = new THREE.Mesh(drillGeo, drillMat);

    // Mesin Bor / Head
    const headGeo = new THREE.BoxGeometry(2, 3, 2);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 5, 0);

    toolGroup.add(drill);
    toolGroup.add(head);
  }

  scene.add(toolGroup);
  updateAlatTransform();
}

function pilihAlat(alat) {
  activeAlat = alat;
  
  document.getElementById('item-gergaji').classList.toggle('active', alat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', alat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', alat === 'bor');

  const names = { gergaji: 'Gergaji', pahat: 'Pahat', bor: 'Bor' };
  const icons = { gergaji: '🪚', pahat: '🪛', bor: '🔘' };

  document.getElementById('toolOverlayIcon').innerText = icons[alat];
  document.getElementById('toolOverlayName').innerText = `Kontrol ${names[alat]}`;

  create3DTool();
}

function updateAlatTransform() {
  if (!toolGroup) return;

  const rotX = (parseFloat(document.getElementById('toolRotX').value) || 0) * (Math.PI / 180);
  const rotY = (parseFloat(document.getElementById('toolRotY').value) || 0) * (Math.PI / 180);
  const depth = parseFloat(document.getElementById('toolDepth').value) || 4;

  toolGroup.rotation.set(rotX, rotY, 0);
  toolGroup.scale.set(1, depth / 4, 1);
}

/* --- RAYCASTING & SNAP TO STRIMIN MESH --- */
function onViewportMouseMove(event) {
  if (isTargetLocked || activeFase !== 'pahat') return;

  const container = document.getElementById('viewport');
  const rect = container.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Cari persimpangan dengan objek kayu yang aktif
  const activeMeshes = [];
  bendaKerjaList.forEach(b => {
    if (b.group.children[0]) activeMeshes.push(b.group.children[0]);
  });

  const intersects = raycaster.intersectObjects(activeMeshes);

  if (intersects.length > 0) {
    const hitPoint = intersects[0].point;

    // Snap koordinat ke satuan unit bulat terdekat (Strimin Snap)
    targetGridPoint.set(
      Math.round(hitPoint.x),
      Math.round(hitPoint.y),
      Math.round(hitPoint.z)
    );

    toolGroup.position.copy(targetGridPoint);
    document.getElementById('targetCoordLabel').innerText = 
      `Target Grid: (${targetGridPoint.x}, ${targetGridPoint.y}, ${targetGridPoint.z})`;
  }
}

function onViewportClick() {
  if (activeFase !== 'pahat') return;
  isTargetLocked = !isTargetLocked; // Toggle Kunci Titik
}

function eksekusiPemotongan() {
  if (selectedObjIndex < 0) return;

  alert(`Memotong/Mengebor di titik (${targetGridPoint.x}, ${targetGridPoint.y}, ${targetGridPoint.z}) dengan ${activeAlat}!`);
  // Logika pembentukan boolean geometry/lubang pasak dapat dikembangkan lebih lanjut di sini.
}

/* --- MANAJEMEN BENDA KERJA --- */
function setJenisBahanBaru(jenis) {
  jenisBahanBaru = jenis;
  document.getElementById('type-balok').classList.toggle('active', jenis === 'balok');
  document.getElementById('type-silinder').classList.toggle('active', jenis === 'silinder');
}

function tambahBendaKerja() {
  const index = bendaKerjaList.length + 1;
  const isBalok = jenisBahanBaru === 'balok';
  
  const objData = {
    id: Date.now(),
    nama: isBalok ? `Kayu Balok #${index}` : `Pasak Silinder #${index}`,
    jenis: jenisBahanBaru,
    p: isBalok ? 10 : 25,
    l: 10,
    t: isBalok ? 30 : 4,
    opacity: 1.0,
    group: new THREE.Group()
  };

  const offsetX = (bendaKerjaList.length) * 12;
  objData.group.position.set(offsetX, 0, 0);

  scene.add(objData.group);
  bendaKerjaList.push(objData);

  pilihBendaKerja(bendaKerjaList.length - 1);
  renderObjectListUI();
}

function hapusBendaKerja(index, event) {
  event.stopPropagation();
  if (bendaKerjaList.length <= 1) return;

  scene.remove(bendaKerjaList[index].group);
  bendaKerjaList.splice(index, 1);

  if (selectedObjIndex >= bendaKerjaList.length) {
    selectedObjIndex = bendaKerjaList.length - 1;
  }
  pilihBendaKerja(selectedObjIndex);
  renderObjectListUI();
}

function pilihBendaKerja(index) {
  selectedObjIndex = index;
  const item = bendaKerjaList[index];

  document.getElementById('objP').value = item.p;
  document.getElementById('objL').value = item.l;
  document.getElementById('objT').value = item.t;
  document.getElementById('objOpacity').value = item.opacity;
  document.getElementById('opacityVal').innerText = `${Math.round(item.opacity * 100)}%`;

  renderObjectListUI();
  updateObjekMesh(item);
}

function renderObjectListUI() {
  const container = document.getElementById('objectList');
  container.innerHTML = '';

  bendaKerjaList.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `object-card ${idx === selectedObjIndex ? 'active' : ''}`;
    card.onclick = () => pilihBendaKerja(idx);

    card.innerHTML = `
      <span>${item.jenis === 'balok' ? '🪵' : '🥢'} ${item.nama}</span>
      <button class="btn-del" onclick="hapusBendaKerja(${idx}, event)">✕</button>
    `;
    container.appendChild(card);
  });
}

function updateObjekTerpilih() {
  if (selectedObjIndex < 0) return;
  const item = bendaKerjaList[selectedObjIndex];

  item.p = Math.max(1, Math.round(parseFloat(document.getElementById('objP').value) || 10));
  item.l = Math.max(1, Math.round(parseFloat(document.getElementById('objL').value) || 10));
  item.t = Math.max(1, Math.round(parseFloat(document.getElementById('objT').value) || 30));
  item.opacity = parseFloat(document.getElementById('objOpacity').value);

  document.getElementById('opacityVal').innerText = `${Math.round(item.opacity * 100)}%`;

  updateObjekMesh(item);
}

function updateObjekMesh(item) {
  const group = item.group;
  while(group.children.length > 0){ 
    group.remove(group.children[0]); 
  }

  let geometry;
  const isTransparent = item.opacity < 1.0;

  const material = new THREE.MeshStandardMaterial({
    color: 0xc28e0e,
    roughness: 0.6,
    metalness: 0.1,
    transparent: isTransparent,
    opacity: item.opacity,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });

  let height = item.t;

  if (item.jenis === 'balok') {
    height = item.t;
    geometry = new THREE.BoxGeometry(item.p, item.t, item.l, item.p, item.t, item.l);
  } else {
    height = item.p;
    const radius = item.t / 2;
    geometry = new THREE.CylinderGeometry(radius, radius, item.p, 16, item.p);
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x4a82e8,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  group.add(new THREE.Mesh(geometry, wireframeMat));

  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x61afef, linewidth: 2 });
  group.add(new THREE.LineSegments(edgesGeometry, lineMat));

  const objectAxes = new THREE.AxesHelper(Math.max(height * 0.3, 6));
  group.add(objectAxes);

  group.position.y = height / 2;
}

function setFase(fase) {
  activeFase = fase;
  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');

  if (toolGroup) toolGroup.visible = (fase === 'pahat');
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
