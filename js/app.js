let scene, camera, renderer, controls;
let transformControl; // Satu kontrol utama terpadu
let activeGizmoMode = 'translate'; // 'translate', 'rotate', atau 'off'

let bendaKerjaList = [];
let selectedObjIndex = -1;
let jenisBahanBaru = 'balok';
let activeAlat = null; 
let activeFase = 'pahat';

let toolGroup = null;
let cutterGeometryMesh = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

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

  // Inisialisasi TransformControls
  transformControl = new THREE.TransformControls(camera, renderer.domElement);
  transformControl.size = 0.85;
  scene.add(transformControl);

  transformControl.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
  });

  transformControl.addEventListener('change', syncRotationToUI);

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

  container.addEventListener('click', onViewportClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

/* --- MANAJEMEN MODE GIZMO AKTIF --- */
function setGizmoActiveMode(mode) {
  activeGizmoMode = mode;

  document.getElementById('btnToggleTranslate').classList.toggle('active', mode === 'translate');
  document.getElementById('btnToggleRotate').classList.toggle('active', mode === 'rotate');
  document.getElementById('btnToggleOff').classList.toggle('active', mode === 'off');

  if (mode === 'off') {
    transformControl.detach();
    transformControl.visible = false;
  } else {
    transformControl.setMode(mode);
    refreshGizmoTarget();
  }
}

function refreshGizmoTarget() {
  if (activeGizmoMode === 'off') {
    transformControl.detach();
    transformControl.visible = false;
    return;
  }

  if (activeAlat && toolGroup) {
    transformControl.attach(toolGroup);
    transformControl.visible = true;
  } else if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    transformControl.attach(bendaKerjaList[selectedObjIndex].group);
    transformControl.visible = true;
  } else {
    transformControl.detach();
    transformControl.visible = false;
  }
}

/* --- SINKRONISASI ROTASI KE UI --- */
function syncRotationToUI() {
  let targetObj = null;
  if (activeAlat && toolGroup) {
    targetObj = toolGroup;
  } else if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    targetObj = bendaKerjaList[selectedObjIndex].group;
  }

  if (targetObj && selectedObjIndex >= 0 && !activeAlat) {
    const rotX = Math.round(THREE.MathUtils.radToDeg(targetObj.rotation.x));
    const rotY = Math.round(THREE.MathUtils.radToDeg(targetObj.rotation.y));
    const rotZ = Math.round(THREE.MathUtils.radToDeg(targetObj.rotation.z));

    document.getElementById('objRotX').value = rotX;
    document.getElementById('objRotY').value = rotY;
    document.getElementById('objRotZ').value = rotZ;
  }
}

function updateObjekRotasiManual() {
  if (selectedObjIndex < 0) return;
  const targetGroup = bendaKerjaList[selectedObjIndex].group;

  const rx = THREE.MathUtils.degToRad(parseFloat(document.getElementById('objRotX').value) || 0);
  const ry = THREE.MathUtils.degToRad(parseFloat(document.getElementById('objRotY').value) || 0);
  const rz = THREE.MathUtils.degToRad(parseFloat(document.getElementById('objRotZ').value) || 0);

  targetGroup.rotation.set(rx, ry, rz);
}

/* --- SELECT / DESELECT ALAT --- */
function toggleAlat(alat) {
  if (activeAlat === alat) {
    activeAlat = null;
  } else {
    activeAlat = alat;
  }

  document.getElementById('item-gergaji').classList.toggle('active', activeAlat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', activeAlat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', activeAlat === 'bor');

  const toolPanel = document.getElementById('toolOverlayPanel');
  if (activeAlat && activeFase === 'pahat') {
    const names = { gergaji: 'Gergaji', pahat: 'Pahat', bor: 'Bor' };
    const icons = { gergaji: '🪚', pahat: '🪛', bor: '🔘' };
    document.getElementById('toolOverlayIcon').innerText = icons[activeAlat];
    document.getElementById('toolOverlayName').innerText = `Kontrol ${names[activeAlat]}`;
    toolPanel.style.display = 'block';

    create3DTool();
    refreshGizmoTarget();
  } else {
    toolPanel.style.display = 'none';
    if (toolGroup) { scene.remove(toolGroup); toolGroup = null; }
    refreshGizmoTarget();
  }
}

function create3DTool() {
  if (toolGroup) scene.remove(toolGroup);
  if (!activeAlat) return;

  toolGroup = new THREE.Group();

  let bladeGeo;
  if (activeAlat === 'gergaji') {
    bladeGeo = new THREE.BoxGeometry(0.2, 6, 12);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    cutterGeometryMesh = new THREE.Mesh(bladeGeo, bladeMat);

    const handleGeo = new THREE.BoxGeometry(0.6, 2.5, 3);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd9534f });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 3, -6);

    toolGroup.add(cutterGeometryMesh);
    toolGroup.add(handle);

  } else if (activeAlat === 'pahat') {
    bladeGeo = new THREE.BoxGeometry(1.2, 8, 1.2);
    const chiselMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9, roughness: 0.1 });
    cutterGeometryMesh = new THREE.Mesh(bladeGeo, chiselMat);

    const handleGeo = new THREE.CylinderGeometry(0.6, 0.5, 4, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 5, 0);

    toolGroup.add(cutterGeometryMesh);
    toolGroup.add(handle);

  } else if (activeAlat === 'bor') {
    bladeGeo = new THREE.CylinderGeometry(1, 1, 10, 16);
    const drillMat = new THREE.MeshStandardMaterial({ color: 0x4a82e8, metalness: 0.8, roughness: 0.3 });
    cutterGeometryMesh = new THREE.Mesh(bladeGeo, drillMat);

    const headGeo = new THREE.BoxGeometry(2, 3, 2);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 6, 0);

    toolGroup.add(cutterGeometryMesh);
    toolGroup.add(head);
  }

  if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    toolGroup.position.copy(bendaKerjaList[selectedObjIndex].group.position);
    toolGroup.position.y += 8;
  } else {
    toolGroup.position.set(0, 15, 0);
  }

  scene.add(toolGroup);
  updateAlatTransform();
}

function updateAlatTransform() {
  if (!toolGroup) return;
  const depth = parseFloat(document.getElementById('toolDepth').value) || 4;
  toolGroup.scale.set(1, depth / 4, 1);
}

/* --- INTERAKSI KLIK SELEKSI --- */
function onViewportClick(event) {
  if (event.target.tagName !== 'CANVAS' || transformControl.dragging) return;

  const container = document.getElementById('viewport');
  const rect = container.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targetMeshes = [];
  bendaKerjaList.forEach(b => { if (b.mainMesh) targetMeshes.push(b.mainMesh); });

  const intersects = raycaster.intersectObjects(targetMeshes);

  if (intersects.length > 0) {
    const parentGroup = intersects[0].object.parent;
    const foundIndex = bendaKerjaList.findIndex(b => b.group === parentGroup);
    
    if (foundIndex !== -1) {
      if (selectedObjIndex === foundIndex && !activeAlat) {
        pilihBendaKerja(-1);
      } else {
        pilihBendaKerja(foundIndex);
      }
    }
  } else if (!activeAlat) {
    pilihBendaKerja(-1);
  }
}

/* --- OPERASI PEMOTONGAN CSG NYATA & PEMISAHAN BENDA KERJA --- */
function eksekusiPemotongan() {
  if (selectedObjIndex < 0 || !activeAlat) {
    alert("Pilih benda kerja dan alat terlebih dahulu!");
    return;
  }

  const targetObj = bendaKerjaList[selectedObjIndex];
  if (!targetObj.mainMesh || !cutterGeometryMesh) return;

  try {
    targetObj.mainMesh.updateMatrixWorld();
    cutterGeometryMesh.updateMatrixWorld();

    const cutterMeshWorld = cutterGeometryMesh.clone();
    cutterMeshWorld.position.copy(toolGroup.position);
    cutterMeshWorld.rotation.copy(toolGroup.rotation);
    cutterMeshWorld.scale.copy(toolGroup.scale);
    cutterMeshWorld.position.sub(targetObj.group.position);
    cutterMeshWorld.updateMatrix();

    const csgTarget = THREE.CSG.fromMesh(targetObj.mainMesh);
    const csgCutter = THREE.CSG.fromMesh(cutterMeshWorld);

    // Operasi Potong
    const csgResult = csgTarget.subtract(csgCutter);
    const newMeshResult = THREE.CSG.toMesh(csgResult, targetObj.mainMesh.matrix);

    newMeshResult.material = targetObj.mainMesh.material;
    newMeshResult.castShadow = true;
    newMeshResult.receiveShadow = true;

    // Cek apakah hasil pemotongan menghasilkan geometri terpisah (2 bagian)
    const separatedGeometries = splitDisconnectedGeometries(newMeshResult.geometry);

    if (separatedGeometries.length > 1) {
      // 1. TERJADI PEMISAHAN MENJADI 2 BAGIAN BENDA KERJA
      scene.remove(targetObj.group);
      const parentName = targetObj.nama;
      const parentGroupPos = targetObj.group.position.clone();
      const parentGroupRot = targetObj.group.rotation.clone();

      // Hapus item lama dari array
      bendaKerjaList.splice(selectedObjIndex, 1);

      separatedGeometries.forEach((subGeo, idx) => {
        const subMesh = new THREE.Mesh(subGeo, targetObj.mainMesh.material);
        subMesh.castShadow = true;
        subMesh.receiveShadow = true;

        const newGroup = new THREE.Group();
        newGroup.position.copy(parentGroupPos);
        newGroup.rotation.copy(parentGroupRot);
        newGroup.add(subMesh);

        const suffix = String.fromCharCode(65 + idx); // Bagian A, B, dst.
        const newObjData = {
          id: Date.now() + idx,
          nama: `${parentName} (${suffix})`,
          jenis: targetObj.jenis,
          p: targetObj.p,
          l: targetObj.l,
          t: targetObj.t,
          opacity: targetObj.opacity,
          group: newGroup,
          mainMesh: subMesh,
          hasBeenCut: true
        };

        rebuildOverlays(newObjData);
        scene.add(newGroup);
        bendaKerjaList.push(newObjData);
      });

      alert(`Sukses! ${parentName} terbelah menjadi ${separatedGeometries.length} bagian benda kerja terpisah.`);
      pilihBendaKerja(bendaKerjaList.length - 2);

    } else {
      // 2. PEMOTONGAN BIASA (LUBANG / TAKIKAN)
      targetObj.group.remove(targetObj.mainMesh);
      targetObj.mainMesh = newMeshResult;
      targetObj.group.add(targetObj.mainMesh);
      targetObj.hasBeenCut = true;

      rebuildOverlays(targetObj);
      alert(`Pemotongan CSG Berhasil pada ${targetObj.nama}!`);
    }

  } catch (err) {
    console.error("CSG Error:", err);
    alert("Proses pemotongan gagal. Pastikan posisi alat menempel tepat pada benda kerja.");
  }
}

/* --- PEMISAHAN GEOMETRI CSG TERPUTUS (SPLIT SUB-MESHES) --- */
function splitDisconnectedGeometries(geometry) {
  const nonIndexedGeo = geometry.toNonIndexed();
  const posAttr = nonIndexedGeo.attributes.position;
  const triangleCount = posAttr.count / 3;

  const triangles = [];
  for (let i = 0; i < triangleCount; i++) {
    triangles.push([
      new THREE.Vector3().fromBufferAttribute(posAttr, i * 3),
      new THREE.Vector3().fromBufferAttribute(posAttr, i * 3 + 1),
      new THREE.Vector3().fromBufferAttribute(posAttr, i * 3 + 2)
    ]);
  }

  const visited = new Array(triangleCount).fill(false);
  const groups = [];

  for (let i = 0; i < triangleCount; i++) {
    if (visited[i]) continue;

    const currentGroup = [];
    const queue = [i];
    visited[i] = true;

    while (queue.length > 0) {
      const currIdx = queue.pop();
      currentGroup.push(triangles[currIdx]);

      const t1 = triangles[currIdx];

      for (let j = 0; j < triangleCount; j++) {
        if (visited[j]) continue;
        const t2 = triangles[j];

        if (trianglesShareVertex(t1, t2)) {
          visited[j] = true;
          queue.push(j);
        }
      }
    }

    groups.push(currentGroup);
  }

  if (groups.length <= 1) return [geometry];

  return groups.map(groupTriangles => {
    const positions = [];
    groupTriangles.forEach(tri => {
      positions.push(tri[0].x, tri[0].y, tri[0].z);
      positions.push(tri[1].x, tri[1].y, tri[1].z);
      positions.push(tri[2].x, tri[2].y, tri[2].z);
    });

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    newGeo.computeVertexNormals();
    return newGeo;
  });
}

function trianglesShareVertex(t1, t2, threshold = 0.0001) {
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      if (t1[a].distanceTo(t2[b]) < threshold) return true;
    }
  }
  return false;
}

/* --- REBUILD OVERLAYS DENGAN GARIS TEBAL/ORANYE BEKAS ALAT --- */
function rebuildOverlays(item) {
  const toRemove = [];
  item.group.children.forEach(child => {
    if (child !== item.mainMesh && !(child instanceof THREE.AxesHelper)) {
      toRemove.push(child);
    }
  });
  toRemove.forEach(c => item.group.remove(c));

  // Edges standar biru muda
  const edgesGeometry = new THREE.EdgesGeometry(item.mainMesh.geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x61afef, linewidth: 2 });
  item.group.add(new THREE.LineSegments(edgesGeometry, lineMat));

  // Visual Bekas Potongan (Warna Oranye Terang / Highlighting)
  if (item.hasBeenCut) {
    const cutEdgesMat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 3 });
    const cutHighlight = new THREE.LineSegments(edgesGeometry, cutEdgesMat);
    cutHighlight.scale.set(1.002, 1.002, 1.002); // Sedikit membesar agar terlihat timbul
    item.group.add(cutHighlight);
  }
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
    group: new THREE.Group(),
    mainMesh: null,
    hasBeenCut: false
  };

  const offsetX = (bendaKerjaList.length) * 12;
  objData.group.position.set(offsetX, 0, 0);

  scene.add(objData.group);
  bendaKerjaList.push(objData);

  pilihBendaKerja(bendaKerjaList.length - 1);
}

function hapusBendaKerja(index, event) {
  if (event) event.stopPropagation();
  scene.remove(bendaKerjaList[index].group);
  bendaKerjaList.splice(index, 1);

  if (selectedObjIndex === index) {
    pilihBendaKerja(-1);
  } else if (selectedObjIndex > index) {
    pilihBendaKerja(selectedObjIndex - 1);
  } else {
    renderObjectListUI();
  }
}

function pilihBendaKerja(index) {
  selectedObjIndex = index;
  const controlsDiv = document.getElementById('selectedObjectControls');

  if (selectedObjIndex >= 0 && selectedObjIndex < bendaKerjaList.length) {
    const item = bendaKerjaList[selectedObjIndex];
    document.getElementById('objP').value = item.p;
    document.getElementById('objL').value = item.l;
    document.getElementById('objT').value = item.t;
    document.getElementById('objOpacity').value = item.opacity;
    document.getElementById('opacityVal').innerText = `${Math.round(item.opacity * 100)}%`;

    syncRotationToUI();
    controlsDiv.style.display = 'block';

    if (!item.mainMesh) updateObjekMesh(item);
    refreshGizmoTarget();
  } else {
    controlsDiv.style.display = 'none';
    refreshGizmoTarget();
  }

  renderObjectListUI();
}

function renderObjectListUI() {
  const container = document.getElementById('objectList');
  container.innerHTML = '';

  bendaKerjaList.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `object-card ${idx === selectedObjIndex ? 'active' : ''}`;
    card.onclick = () => {
      if (selectedObjIndex === idx) pilihBendaKerja(-1);
      else pilihBendaKerja(idx);
    };

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

  item.mainMesh = new THREE.Mesh(geometry, material);
  item.mainMesh.castShadow = true;
  item.mainMesh.receiveShadow = true;
  group.add(item.mainMesh);

  // Wireframe Strimin
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x4a82e8,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  group.add(new THREE.Mesh(geometry, wireframeMat));

  rebuildOverlays(item);

  const objectAxes = new THREE.AxesHelper(Math.max(height * 0.3, 6));
  group.add(objectAxes);

  group.position.y = height / 2;
}

function setFase(fase) {
  activeFase = fase;
  document.getElementById('fasePahat').classList.toggle('active', fase === 'pahat');
  document.getElementById('faseRakit').classList.toggle('active', fase === 'rakit');
  document.getElementById('faseUji').classList.toggle('active', fase === 'uji');

  const toolPanel = document.getElementById('toolOverlayPanel');
  if (toolPanel) toolPanel.style.display = (activeAlat && fase === 'pahat') ? 'block' : 'none';
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
