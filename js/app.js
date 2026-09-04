let scene, camera, renderer, controls;
let transformControl;
let activeGizmoMode = 'translate';

let bendaKerjaList = [];
let selectedObjIndex = -1;
let jenisBahanBaru = 'balok';
let activeAlat = null; // 'gergaji', 'pahat', 'bor'
let activeFase = 'pahat';

let toolGroup = null;
let cutterGeometryMesh = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Sistem Partikel Percikan Kayu
let particleSystems = [];

// Status Animasi Alat Pemotong
let isCuttingAnimation = false;

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

  transformControl = new THREE.TransformControls(camera, renderer.domElement);
  transformControl.size = 0.85;
  scene.add(transformControl);

  transformControl.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
    const tooltip = document.getElementById('rotationTooltip');
    if (activeGizmoMode === 'rotate' && event.value) {
      tooltip.style.display = 'block';
    } else {
      tooltip.style.display = 'none';
    }
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

/* --- ANIMASI PERCIKAN TAHI KAYU (WOOD SHAVINGS) --- */
function triggerWoodSparks(position) {
  const particleCount = 25;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions.push(position.x, position.y, position.z);
    
    const vx = (Math.random() - 0.5) * 14;
    const vy = Math.random() * 12 + 3;
    const vz = (Math.random() - 0.5) * 14;
    velocities.push(vx, vy, vz);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xdd9933,
    size: 0.7,
    transparent: true,
    opacity: 1.0
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  particleSystems.push({
    mesh: particles,
    velocities: velocities,
    life: 1.0
  });
}

function updateParticles() {
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    const ps = particleSystems[i];
    const posAttr = ps.mesh.geometry.attributes.position;
    
    ps.life -= 0.04;

    for (let j = 0; j < posAttr.count; j++) {
      let x = posAttr.getX(j) + ps.velocities[j * 3] * 0.05;
      let y = posAttr.getY(j) + ps.velocities[j * 3 + 1] * 0.05;
      let z = posAttr.getZ(j) + ps.velocities[j * 3 + 2] * 0.05;

      ps.velocities[j * 3 + 1] -= 0.5; // Efek Gravitasi

      posAttr.setXYZ(j, x, y, z);
    }

    posAttr.needsUpdate = true;
    ps.mesh.material.opacity = Math.max(0, ps.life);

    if (ps.life <= 0) {
      scene.remove(ps.mesh);
      ps.mesh.geometry.dispose();
      ps.mesh.material.dispose();
      particleSystems.splice(i, 1);
    }
  }
}

/* --- BERSIHKAN AREA KERJA --- */
function bersihkanAreaKerja() {
  if (bendaKerjaList.length === 0) return;

  if (confirm("Apakah Anda yakin ingin mengosongkan area kerja? Semua benda kerja akan dihapus.")) {
    bendaKerjaList.forEach(item => scene.remove(item.group));
    bendaKerjaList = [];
    selectedObjIndex = -1;

    if (toolGroup) {
      scene.remove(toolGroup);
      toolGroup = null;
    }
    
    toggleAlat(null);
    pilihBendaKerja(-1);
  }
}

/* --- SAKLAR GIZMO --- */
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

  let targetObj = null;
  if (activeAlat && toolGroup) {
    targetObj = toolGroup;
  } else if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    targetObj = bendaKerjaList[selectedObjIndex].group;
  }

  if (targetObj) {
    transformControl.attach(targetObj);
    transformControl.visible = true;
  } else {
    transformControl.detach();
    transformControl.visible = false;
  }
}

/* --- SINKRONISASI ROTASI SISI UI --- */
function syncRotationToUI() {
  let targetObj = null;
  if (activeAlat && toolGroup) {
    targetObj = toolGroup;
  } else if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    targetObj = bendaKerjaList[selectedObjIndex].group;
  }

  if (targetObj) {
    const rotX = Math.round(THREE.MathUtils.radToDeg(targetObj.rotation.x));
    const rotY = Math.round(THREE.MathUtils.radToDeg(targetObj.rotation.y));
    const rotZ = Math.round(THREE.MathUtils.radToDeg(targetObj.rotation.z));

    if (selectedObjIndex >= 0 && !activeAlat) {
      document.getElementById('objRotX').value = rotX;
      document.getElementById('objRotY').value = rotY;
      document.getElementById('objRotZ').value = rotZ;
    }

    const tooltip = document.getElementById('rotationTooltip');
    tooltip.innerText = `Rotasi: X: ${rotX}° | Y: ${rotY}° | Z: ${rotZ}°`;
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

/* --- MANAJEMEN ALAT KERJA --- */
function toggleAlat(alat) {
  if (activeAlat === alat || alat === null) {
    activeAlat = null;
  } else {
    activeAlat = alat;
  }

  document.getElementById('item-gergaji').classList.toggle('active', activeAlat === 'gergaji');
  document.getElementById('item-pahat').classList.toggle('active', activeAlat === 'pahat');
  document.getElementById('item-bor').classList.toggle('active', activeAlat === 'bor');

  const toolPanel = document.getElementById('toolOverlayPanel');
  const rowDiameter = document.getElementById('rowToolDiameter');
  const lblDiameter = document.getElementById('lblToolDiameter');
  const hintText = document.getElementById('hintBoxText');

  if (activeAlat && activeFase === 'pahat') {
    const names = { gergaji: 'Gergaji', pahat: 'Pahat', bor: 'Bor' };
    const icons = { gergaji: '🪚', pahat: '🪛', bor: '🔘' };
    document.getElementById('toolOverlayIcon').innerText = icons[activeAlat];
    document.getElementById('toolOverlayName').innerText = `Kontrol ${names[activeAlat]}`;
    
    if (activeAlat === 'pahat') {
      rowDiameter.style.display = 'flex';
      lblDiameter.innerText = "Diameter Pahat (d):";
      hintText.innerHTML = "🪛 <strong>Pahat Persegi:</strong> Klik permukaan kayu untuk menempatkan pahat persegi <strong>(2d × 2d)</strong>.";
    } else if (activeAlat === 'bor') {
      rowDiameter.style.display = 'flex';
      lblDiameter.innerText = "Diameter Bor (D):";
      hintText.innerHTML = "🔘 <strong>Bor Lingkaran:</strong> Klik permukaan kayu untuk menempatkan mata bor <strong>(Diameter D)</strong>.";
    } else if (activeAlat === 'gergaji') {
      rowDiameter.style.display = 'none';
      hintText.innerHTML = "🪚 <strong>Gergaji Potong:</strong> Klik permukaan kayu untuk menempatkan gergaji.";
    }

    toolPanel.style.display = 'block';
    create3DTool();
    refreshGizmoTarget();
  } else {
    toolPanel.style.display = 'none';
    hintText.innerHTML = "💡 Pilih benda kerja untuk mengedit ukuran, atau pilih Alat Pemahat di atas.";
    if (toolGroup) { scene.remove(toolGroup); toolGroup = null; }
    refreshGizmoTarget();
  }
}

/* --- MEMBUAT MODEL ALAT 3D --- */
function create3DTool(positionPoint = null, normalVector = null) {
  if (toolGroup) scene.remove(toolGroup);
  if (!activeAlat) return;

  toolGroup = new THREE.Group();
  const valDiameter = parseFloat(document.getElementById('toolDiameter').value) || 1;
  const valDepth = parseFloat(document.getElementById('toolDepth').value) || 4;

  if (activeAlat === 'pahat') {
    const sideSize = valDiameter * 2;
    const chiselGeo = new THREE.BoxGeometry(sideSize, valDepth, sideSize);
    const chiselMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.8, roughness: 0.2 });
    cutterGeometryMesh = new THREE.Mesh(chiselGeo, chiselMat);

    const handleGeo = new THREE.CylinderGeometry(sideSize * 0.4, sideSize * 0.3, 4, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, (valDepth / 2) + 2, 0);

    toolGroup.add(cutterGeometryMesh);
    toolGroup.add(handle);

  } else if (activeAlat === 'gergaji') {
    const bladeGeo = new THREE.BoxGeometry(0.2, valDepth, 40);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    cutterGeometryMesh = new THREE.Mesh(bladeGeo, bladeMat);

    const handleGeo = new THREE.BoxGeometry(0.6, 2.5, 4);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd9534f });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, (valDepth / 2) + 1.25, -15);

    toolGroup.add(cutterGeometryMesh);
    toolGroup.add(handle);

  } else if (activeAlat === 'bor') {
    const radius = valDiameter / 2;
    const drillGeo = new THREE.CylinderGeometry(radius, radius, valDepth, 32);
    const drillMat = new THREE.MeshStandardMaterial({ color: 0x4a82e8, metalness: 0.8, roughness: 0.3 });
    cutterGeometryMesh = new THREE.Mesh(drillGeo, drillMat);

    const headGeo = new THREE.BoxGeometry(Math.max(2, valDiameter + 0.5), 3, Math.max(2, valDiameter + 0.5));
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, (valDepth / 2) + 1.5, 0);

    toolGroup.add(cutterGeometryMesh);
    toolGroup.add(head);
  }

  if (positionPoint && normalVector) {
    toolGroup.position.copy(positionPoint);
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVector);
    toolGroup.quaternion.copy(quaternion);
  } else if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    toolGroup.position.copy(bendaKerjaList[selectedObjIndex].group.position);
    toolGroup.position.y += 8;
  } else {
    toolGroup.position.set(0, 15, 0);
  }

  scene.add(toolGroup);
}

function updateAlatTransform() {
  if (!toolGroup || !activeAlat) return;
  const currentPos = toolGroup.position.clone();
  const currentRot = toolGroup.rotation.clone();

  create3DTool();

  if (toolGroup) {
    toolGroup.position.copy(currentPos);
    toolGroup.rotation.copy(currentRot);
  }
}

/* --- INTERAKSI KLIK SELEKSI --- */
function onViewportClick(event) {
  if (event.target.tagName !== 'CANVAS' || transformControl.dragging || isCuttingAnimation) return;

  const container = document.getElementById('viewport');
  const rect = container.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targetMeshes = [];
  bendaKerjaList.forEach(b => { if (b.mainMesh) targetMeshes.push(b.mainMesh); });

  const intersects = raycaster.intersectObjects(targetMeshes);

  if (intersects.length > 0) {
    const hit = intersects[0];
    const parentGroup = hit.object.parent;
    const foundIndex = bendaKerjaList.findIndex(b => b.group === parentGroup);

    if (foundIndex !== -1) {
      if (selectedObjIndex !== foundIndex) {
        pilihBendaKerja(foundIndex);
      }

      if (activeAlat && hit.point && hit.face) {
        const point = hit.point;
        const normal = hit.face.normal.clone().applyQuaternion(hit.object.quaternion);

        create3DTool(point, normal);
        refreshGizmoTarget();
      }
    }
  } else if (!activeAlat) {
    pilihBendaKerja(-1);
  }
}

/* --- EKSEKUSI PEMOTONGAN DENGAN ANIMASI GERAKAN ALAT & CSG --- */
function eksekusiPemotongan() {
  if (selectedObjIndex < 0 || !activeAlat || isCuttingAnimation) {
    alert("Pilih benda kerja dan alat terlebih dahulu!");
    return;
  }

  const targetObj = bendaKerjaList[selectedObjIndex];
  if (!targetObj.mainMesh || !cutterGeometryMesh || !toolGroup) return;

  isCuttingAnimation = true;
  transformControl.detach(); // Sembunyikan gizmo saat animasi berjalan

  const startPos = toolGroup.position.clone();
  const startRot = toolGroup.rotation.clone();
  let startTime = performance.now();
  const duration = 1200; // Durasi animasi 1.2 detik

  function animateToolAction(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1.0);

    // Trigger Efek Percikan Tahi Kayu Beruntun
    if (Math.random() < 0.4) {
      triggerWoodSparks(toolGroup.position);
    }

    if (activeAlat === 'gergaji') {
      // Animasi Gergaji: Maju Mundur sepanjang Z local
      const stroke = Math.sin(progress * Math.PI * 10) * 3;
      const forwardVec = new THREE.Vector3(0, 0, stroke).applyQuaternion(toolGroup.quaternion);
      toolGroup.position.copy(startPos).add(forwardVec);

    } else if (activeAlat === 'bor') {
      // Animasi Bor: Berputar cepat + penetrasi masuk sedikit
      toolGroup.rotation.y = startRot.y + progress * Math.PI * 20;
      const depthOffset = new THREE.Vector3(0, -Math.sin(progress * Math.PI) * 0.8, 0).applyQuaternion(toolGroup.quaternion);
      toolGroup.position.copy(startPos).add(depthOffset);

    } else if (activeAlat === 'pahat') {
      // Animasi Pahat: Sentakan Memahat (Chipping/Hammering)
      const hammer = Math.abs(Math.sin(progress * Math.PI * 8)) * 1.5;
      const hammerVec = new THREE.Vector3(0, -hammer, 0).applyQuaternion(toolGroup.quaternion);
      toolGroup.position.copy(startPos).add(hammerVec);
    }

    if (progress < 1.0) {
      requestAnimationFrame(animateToolAction);
    } else {
      // Kembalikan Posisi Semula Lalu Eksekusi Pemotongan CSG
      toolGroup.position.copy(startPos);
      toolGroup.rotation.copy(startRot);

      prosesCSGCutting(targetObj);
      isCuttingAnimation = false;
      refreshGizmoTarget();
    }
  }

  requestAnimationFrame(animateToolAction);
}

/* --- PROSES PEMOTONGAN CSG (PEMBUATAN LUBANG FISIK) --- */
function prosesCSGCutting(targetObj) {
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

    const csgResult = csgTarget.subtract(csgCutter);

    // Material Kayu dengan Penampang Rongga Dalam
    const woodOuterMat = new THREE.MeshStandardMaterial({
      color: 0xc28e0e,
      roughness: 0.6,
      metalness: 0.1
    });

    const woodInnerCutMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b, // Warna Kayu Bagian Dalam (Cokelat Guratan)
      roughness: 0.8,
      metalness: 0.05
    });

    const newMeshResult = THREE.CSG.toMesh(csgResult, targetObj.mainMesh.matrix, [woodOuterMat, woodInnerCutMat]);
    newMeshResult.castShadow = true;
    newMeshResult.receiveShadow = true;

    const separatedGeometries = splitDisconnectedGeometries(newMeshResult.geometry);

    if (separatedGeometries.length > 1) {
      scene.remove(targetObj.group);
      const parentName = targetObj.nama;
      const parentGroupPos = targetObj.group.position.clone();
      const parentGroupRot = targetObj.group.rotation.clone();

      bendaKerjaList.splice(selectedObjIndex, 1);

      separatedGeometries.forEach((subGeo, idx) => {
        const subMesh = new THREE.Mesh(subGeo, [woodOuterMat, woodInnerCutMat]);
        subMesh.castShadow = true;
        subMesh.receiveShadow = true;

        const newGroup = new THREE.Group();
        newGroup.position.copy(parentGroupPos);
        newGroup.rotation.copy(parentGroupRot);
        newGroup.add(subMesh);

        const suffix = String.fromCharCode(65 + idx);
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

      pilihBendaKerja(bendaKerjaList.length - 2);

    } else {
      targetObj.group.remove(targetObj.mainMesh);
      targetObj.mainMesh = newMeshResult;
      targetObj.group.add(targetObj.mainMesh);
      targetObj.hasBeenCut = true;

      rebuildOverlays(targetObj);
    }

  } catch (err) {
    console.error("CSG Error:", err);
    alert("Proses pemotongan gagal. Pastikan posisi alat menempel tepat pada benda kerja.");
  }
}

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

/* --- REBUILD OVERLAYS STRIMIN & BEKAS POTONGAN --- */
function rebuildOverlays(item) {
  const toRemove = [];
  item.group.children.forEach(child => {
    if (child !== item.mainMesh && !(child instanceof THREE.AxesHelper)) {
      toRemove.push(child);
    }
  });
  toRemove.forEach(c => item.group.remove(c));

  // 1. Strimin Grid Overlay Wireframe
  const striminMat = new THREE.MeshBasicMaterial({
    color: 0x4a82e8,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const striminMesh = new THREE.Mesh(item.mainMesh.geometry, striminMat);
  item.group.add(striminMesh);

  // 2. Outlines Garis Batas Edges
  const edgesGeometry = new THREE.EdgesGeometry(item.mainMesh.geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x61afef, linewidth: 2 });
  item.group.add(new THREE.LineSegments(edgesGeometry, lineMat));

  // 3. Highlight Penampang Bekas Lubang (Garis Batas Oranye Terang)
  if (item.hasBeenCut) {
    const cutEdgesMat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 3 });
    const cutHighlight = new THREE.LineSegments(edgesGeometry, cutEdgesMat);
    cutHighlight.scale.set(1.002, 1.002, 1.002);
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
    t: isBalok ? 30 : 6,
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

  const groupBalok = document.getElementById('groupBalokDim');
  const groupSilinder = document.getElementById('groupSilinderDim');

  if (selectedObjIndex >= 0 && selectedObjIndex < bendaKerjaList.length) {
    const item = bendaKerjaList[selectedObjIndex];

    if (item.jenis === 'balok') {
      groupBalok.style.display = 'flex';
      groupSilinder.style.display = 'none';

      document.getElementById('objP').value = item.p;
      document.getElementById('objL').value = item.l;
      document.getElementById('objT').value = item.t;
    } else {
      groupBalok.style.display = 'none';
      groupSilinder.style.display = 'flex';

      document.getElementById('objDiameter').value = item.t;
      document.getElementById('objTinggiSilinder').value = item.p;
    }

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

  if (item.jenis === 'balok') {
    item.p = Math.max(1, Math.round(parseFloat(document.getElementById('objP').value) || 10));
    item.l = Math.max(1, Math.round(parseFloat(document.getElementById('objL').value) || 10));
    item.t = Math.max(1, Math.round(parseFloat(document.getElementById('objT').value) || 30));
  } else {
    item.t = Math.max(1, Math.round(parseFloat(document.getElementById('objDiameter').value) || 6));
    item.p = Math.max(1, Math.round(parseFloat(document.getElementById('objTinggiSilinder').value) || 25));
  }

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
    geometry = new THREE.CylinderGeometry(radius, radius, item.p, 24, item.p);
  }

  item.mainMesh = new THREE.Mesh(geometry, material);
  item.mainMesh.castShadow = true;
  item.mainMesh.receiveShadow = true;
  group.add(item.mainMesh);

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
  updateParticles(); // Animasi partikel percikan kayu
  renderer.render(scene, camera);
}
