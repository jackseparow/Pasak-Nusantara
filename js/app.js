let scene, camera, renderer, controls;
let bendaKerjaList = [];
let selectedObjIndex = -1;
let jenisBahanBaru = 'balok';
let activeAlat = 'gergaji';
let activeFase = 'pahat';
let toolIndicatorMesh = null;

window.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  tambahBendaKerja(); // Otomatis buat 1 benda kerja awal
});

function initThreeJS() {
  const container = document.getElementById('viewport');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(40, 40, 50);

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

  initToolIndicator();

  window.addEventListener('resize', onWindowResize);
  animate();
}

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
    t: isBalok ? 30 : 4, // diameter jika silinder
    opacity: 1.0,
    group: new THREE.Group()
  };

  // Posisi sedikit digeser jika lebih dari 1 objek
  const offsetX = (bendaKerjaList.length) * 12;
  objData.group.position.set(offsetX, 0, 0);

  scene.add(objData.group);
  bendaKerjaList.push(objData);

  pilihBendaKerja(bendaKerjaList.length - 1);
  renderObjectListUI();
}

function hapusBendaKerja(index, event) {
  event.stopPropagation();
  if (bendaKerjaList.length <= 1) return; // Sisakan minimal 1

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
    // Strimin satuan 1-unit
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

  // Strimin Overlay
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x4a82e8,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  group.add(new THREE.Mesh(geometry, wireframeMat));

  // Edges
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x61afef, linewidth: 2 });
  group.add(new THREE.LineSegments(edgesGeometry, lineMat));

  // Sumbu Lokal
  const objectAxes = new THREE.AxesHelper(Math.max(height * 0.3, 6));
  group.add(objectAxes);

  group.position.y = height / 2;
}

// Inisialisasi Visualisasi Indikator Alat
function initToolIndicator() {
  const toolGeo = new THREE.BoxGeometry(1, 10, 1);
  const toolMat = new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true });
  toolIndicatorMesh = new THREE.Mesh(toolGeo, toolMat);
  toolIndicatorMesh.position.set(0, 15, 0);
  scene.add(toolIndicatorMesh);
  updateAlatPreview();
}

function pilihAlat(alat) {
  activeAlat = alat;
  document.getElementById('item-gergaji').classList.toggle('active', alat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', alat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', alat === 'bor');
  updateAlatPreview();
}

function updateAlatPreview() {
  if (!toolIndicatorMesh) return;

  const rotX = (parseFloat(document.getElementById('toolRotX').value) || 0) * (Math.PI / 180);
  const rotY = (parseFloat(document.getElementById('toolRotY').value) || 0) * (Math.PI / 180);
  const depth = parseFloat(document.getElementById('toolDepth').value) || 5;

  toolIndicatorMesh.rotation.set(rotX, rotY, 0);
  toolIndicatorMesh.scale.set(1, depth / 5, 1);
}

function setFase(fase) {
  activeFase = fase;
  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');
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
