let scene, camera, renderer, controls;
let transformControl;
let activeGizmoMode = 'translate';

let bendaKerjaList = [];
let selectedObjIndex = -1;
let jenisBahanBaru = 'balok';
let activeAlat = null; // 'gergaji', 'pahat', 'bor'
let activeFase = 'pahat';

let toolGroup = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let currentHitPoint = new THREE.Vector3();
let currentHitNormal = new THREE.Vector3(0, 1, 0);

// Marker Visual Titik Sorot (Dot Neon)
let hoverMarker = null;

// Partikel Tahi Kayu
let particleSystems = [];
let isCuttingAnimation = false;

// KONSTANTA SKALA CAD VOXEL: 1 Unit Visual/Koordinat = 100 Voxel Mikro
const CAD_SCALE = 100;           // Jumlah mikro-voxel per 1 unit visual
const VOXEL_SIZE = 1 / CAD_SCALE; // Ukuran fisik 1 voxel = 0.01 unit

window.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  tambahBendaKerja();
});

function initThreeJS() {
  const container = document.getElementById('viewport');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(2.5, 2.5, 3.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0.5, 0.5, 0.5);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  transformControl = new THREE.TransformControls(camera, renderer.domElement);
  transformControl.size = 0.75;
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
  dirLight.position.set(5, 8, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // DINDING GRID CAD SKALA 1 SATUAN VISUAL (= 100 ELEMEN MIKRO)
  setupCadGridWalls();

  // Marker Titik Sorot Neon
  const dotGeo = new THREE.SphereGeometry(0.015, 16, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
  hoverMarker = new THREE.Mesh(dotGeo, dotMat);
  hoverMarker.visible = false;
  scene.add(hoverMarker);

  container.addEventListener('mousemove', onViewportHover);
  container.addEventListener('click', onViewportClick);
  window.addEventListener('resize', onWindowResize);

  onWindowResize();
  animate();
}

/* --- DINDING GRID CAD 1 SATUAN SKALA (1 SATUAN = 100 VOXEL) --- */
function setupCadGridWalls() {
  const totalUnits = 5; // Area Kerja 5x5x5 Unit Visual (Setara 500x500 Voxel)
  const divisions = totalUnits; // 1 Kotak Grid Utama = Tepat 1 Unit Visual

  const gridXZ = new THREE.GridHelper(totalUnits, divisions, 0x00ffcc, 0x333344);
  gridXZ.position.set(totalUnits / 2, 0, totalUnits / 2);
  scene.add(gridXZ);

  const gridXY = new THREE.GridHelper(totalUnits, divisions, 0x00ffcc, 0x222233);
  gridXY.rotation.x = Math.PI / 2;
  gridXY.position.set(totalUnits / 2, totalUnits / 2, 0);
  scene.add(gridXY);

  const gridYZ = new THREE.GridHelper(totalUnits, divisions, 0x00ffcc, 0x222233);
  gridYZ.rotation.z = Math.PI / 2;
  gridYZ.position.set(0, totalUnits / 2, totalUnits / 2);
  scene.add(gridYZ);

  const axesGroup = new THREE.Group();

  const lineXMat = new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 3 });
  const lineXGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(totalUnits,0,0)]);
  axesGroup.add(new THREE.Line(lineXGeo, lineXMat));

  const lineYMat = new THREE.LineBasicMaterial({ color: 0x33ff33, linewidth: 3 });
  const lineYGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,totalUnits,0)]);
  axesGroup.add(new THREE.Line(lineYGeo, lineYMat));

  const lineZMat = new THREE.LineBasicMaterial({ color: 0x3388ff, linewidth: 4 });
  const lineZGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,totalUnits * 1.2)]);
  axesGroup.add(new THREE.Line(lineZGeo, lineZMat));

  // Penanda Sub-Skala setiap 0.5 Unit Visual
  const tickMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  for (let z = 0.5; z <= totalUnits * 1.2; z += 0.5) {
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, z),
      new THREE.Vector3(0.05, 0, z)
    ]);
    axesGroup.add(new THREE.Line(tickGeo, tickMat));
  }

  scene.add(axesGroup);
}

/* --- DETEKSI HOVER TOOLTIP KOORDINAT VISUAL (SINKRON DENGAN SKALA SATUAN) --- */
function onViewportHover(event) {
  if (transformControl.dragging || isCuttingAnimation) return;

  const container = document.getElementById('viewport');
  const rect = container.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targetMeshes = [];
  bendaKerjaList.forEach(b => {
    if (b.voxelsGroup) {
      b.voxelsGroup.children.forEach(v => targetMeshes.push(v));
    }
  });

  const intersects = raycaster.intersectObjects(targetMeshes);
  const coordTooltip = document.getElementById('coordTooltip');
  const coordText = document.getElementById('coordText');

  if (intersects.length > 0) {
    const hit = intersects[0];
    let parentGroup = hit.object.parent;
    while (parentGroup && !parentGroup.isBendaGroup) {
      parentGroup = parentGroup.parent;
    }

    if (parentGroup) {
      const localPos = parentGroup.worldToLocal(hit.point.clone());

      // Tampilkan Angka Koordinat dalam Satuan Visual Presisi 2 Desimal
      const locX = localPos.x.toFixed(2);
      const locY = localPos.y.toFixed(2);
      const locZ = localPos.z.toFixed(2);

      hoverMarker.position.copy(hit.point);
      hoverMarker.visible = true;

      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      coordTooltip.style.left = `${screenX}px`;
      coordTooltip.style.top = `${screenY}px`;
      coordTooltip.style.display = 'block';

      coordText.innerHTML = `📍 Koordinat Kayu<br>X: <strong>${locX}</strong> | Y: <strong>${locY}</strong> | Z: <strong>${locZ}</strong>`;
    }
  } else {
    hoverMarker.visible = false;
    coordTooltip.style.display = 'none';
  }
}

/* --- ANIMASI PERCIKAN TAHI KAYU --- */
function triggerWoodSparks(position) {
  const particleCount = 25;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions.push(position.x, position.y, position.z);
    const vx = (Math.random() - 0.5) * 0.8;
    const vy = Math.random() * 0.6 + 0.2;
    const vz = (Math.random() - 0.5) * 0.8;
    velocities.push(vx, vy, vz);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xdd9933,
    size: 0.02,
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
    ps.life -= 0.05;

    for (let j = 0; j < posAttr.count; j++) {
      let x = posAttr.getX(j) + ps.velocities[j * 3] * 0.05;
      let y = posAttr.getY(j) + ps.velocities[j * 3 + 1] * 0.05;
      let z = posAttr.getZ(j) + ps.velocities[j * 3 + 2] * 0.05;

      ps.velocities[j * 3 + 1] -= 0.02;
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

/* --- CONTROL GIZMO --- */
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
      lblDiameter.innerText = "Lebar Pahat (d):";
      hintText.innerHTML = "🪛 <strong>Pahat Pipih:</strong> Penampang potong persegi <strong>(d × d)</strong> presisi.";
    } else if (activeAlat === 'bor') {
      rowDiameter.style.display = 'flex';
      lblDiameter.innerText = "Diameter Bor (D):";
      hintText.innerHTML = "🔘 <strong>Bor Silinder:</strong> Penampang potong melingkar murni (Diameter D).";
    } else if (activeAlat === 'gergaji') {
      rowDiameter.style.display = 'none';
      hintText.innerHTML = "🪚 <strong>Gergaji Potong:</strong> Klik permukaan kayu untuk menempatkan bilah gergaji.";
    }

    toolPanel.style.display = 'block';
    create3DTool();
    refreshGizmoTarget();
  } else {
    toolPanel.style.display = 'none';
    hintText.innerHTML = "💡 Pilih benda kerja untuk mengedit ukuran dan warna, atau pilih Alat Pemahat di atas.";
    if (toolGroup) { scene.remove(toolGroup); toolGroup = null; }
    refreshGizmoTarget();
  }
}

/* --- MODEL ALAT 3D SKALA PRESISI --- */
function create3DTool(positionPoint = null, normalVector = null) {
  if (toolGroup) scene.remove(toolGroup);
  if (!activeAlat) return;

  toolGroup = new THREE.Group();
  const valDiameter = parseFloat(document.getElementById('toolDiameter').value) || 0.2;
  const valDepth = parseFloat(document.getElementById('toolDepth').value) || 0.5;

  if (activeAlat === 'bor') {
    const radius = valDiameter / 2;
    const tipHeight = 0.15;

    const drillMat = new THREE.MeshStandardMaterial({ color: 0x4a82e8, metalness: 0.8, roughness: 0.3 });

    const tipGeo = new THREE.ConeGeometry(radius, tipHeight, 32);
    tipGeo.rotateX(Math.PI);
    tipGeo.translate(0, tipHeight / 2, 0);
    const tipMesh = new THREE.Mesh(tipGeo, drillMat);

    const drillGeo = new THREE.CylinderGeometry(radius, radius, valDepth, 32);
    drillGeo.translate(0, tipHeight + (valDepth / 2), 0);
    const mainDrill = new THREE.Mesh(drillGeo, drillMat);

    const headGeo = new THREE.BoxGeometry(Math.max(0.3, valDiameter + 0.1), 0.2, Math.max(0.3, valDiameter + 0.1));
    headGeo.translate(0, tipHeight + valDepth + 0.1, 0);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);

    toolGroup.add(tipMesh);
    toolGroup.add(mainDrill);
    toolGroup.add(head);

  } else if (activeAlat === 'pahat') {
    const sideSize = valDiameter;
    
    const chiselGeo = new THREE.BoxGeometry(sideSize, valDepth, sideSize);
    chiselGeo.translate(0, valDepth / 2, 0);

    const chiselMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.8, roughness: 0.2 });
    const mainChisel = new THREE.Mesh(chiselGeo, chiselMat);

    const handleGeo = new THREE.CylinderGeometry(sideSize * 0.4, sideSize * 0.3, 0.4, 12);
    handleGeo.translate(0, valDepth + 0.2, 0);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);

    toolGroup.add(mainChisel);
    toolGroup.add(handle);

  } else if (activeAlat === 'gergaji') {
    let targetSpan = 1.5;
    if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
      const b = bendaKerjaList[selectedObjIndex];
      targetSpan = Math.max(b.p, b.l, b.t) * 1.2;
    }

    const bladeGeo = new THREE.BoxGeometry(0.02, valDepth, targetSpan);
    bladeGeo.translate(0, valDepth / 2, 0);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const mainBlade = new THREE.Mesh(bladeGeo, bladeMat);

    const handleGeo = new THREE.BoxGeometry(0.08, 0.25, 0.4);
    handleGeo.translate(0, valDepth + 0.12, -targetSpan / 2);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd9534f });
    const handle = new THREE.Mesh(handleGeo, handleMat);

    toolGroup.add(mainBlade);
    toolGroup.add(handle);
  }

  if (positionPoint && normalVector) {
    toolGroup.position.copy(positionPoint);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVector);
    toolGroup.quaternion.copy(quaternion);

  } else if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
    toolGroup.position.copy(bendaKerjaList[selectedObjIndex].group.position);
    toolGroup.position.y += bendaKerjaList[selectedObjIndex].t;
  } else {
    toolGroup.position.set(0.5, 1, 0.5);
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

/* --- TANGKAP KLIK SELEKSI & PENEMPATAN ALAT --- */
function onViewportClick(event) {
  if (event.target.tagName !== 'CANVAS' || transformControl.dragging || isCuttingAnimation) return;

  const container = document.getElementById('viewport');
  const rect = container.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targetMeshes = [];
  bendaKerjaList.forEach(b => { 
    if (b.voxelsGroup) {
      b.voxelsGroup.children.forEach(v => targetMeshes.push(v));
    }
  });

  const intersects = raycaster.intersectObjects(targetMeshes);

  if (intersects.length > 0) {
    const hit = intersects[0];
    let parentGroup = hit.object.parent;
    while(parentGroup && !parentGroup.isBendaGroup) {
      parentGroup = parentGroup.parent;
    }

    const foundIndex = bendaKerjaList.findIndex(b => b.group === parentGroup);

    if (foundIndex !== -1) {
      if (selectedObjIndex !== foundIndex) {
        pilihBendaKerja(foundIndex);
      }

      if (activeAlat && hit.point && hit.face) {
        currentHitPoint.copy(hit.point);
        currentHitNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();

        create3DTool(currentHitPoint, currentHitNormal);
        refreshGizmoTarget();
      }
    }
  } else if (!activeAlat) {
    pilihBendaKerja(-1);
  }
}

/* --- ANIMASI PEMOTONGAN ALAT --- */
function eksekusiPemotongan() {
  if (selectedObjIndex < 0 || !activeAlat || isCuttingAnimation) {
    alert("Pilih benda kerja dan tempatkan alat pada kayu terlebih dahulu!");
    return;
  }

  const targetObj = bendaKerjaList[selectedObjIndex];
  if (!targetObj.voxelsGroup || !toolGroup) return;

  isCuttingAnimation = true;
  transformControl.detach();

  const startPos = toolGroup.position.clone();
  const startRot = toolGroup.quaternion.clone();
  let startTime = performance.now();
  const duration = 1200;

  function animateToolAction(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1.0);

    if (Math.random() < 0.45) {
      triggerWoodSparks(toolGroup.position);
    }

    if (activeAlat === 'bor') {
      toolGroup.quaternion.copy(startRot);
      toolGroup.rotateY(progress * Math.PI * 20);

      const depthOffset = new THREE.Vector3(0, -Math.sin(progress * Math.PI) * 0.1, 0).applyQuaternion(startRot);
      toolGroup.position.copy(startPos).add(depthOffset);

    } else if (activeAlat === 'gergaji') {
      const stroke = Math.sin(progress * Math.PI * 10) * 0.2;
      const forwardVec = new THREE.Vector3(0, 0, stroke).applyQuaternion(startRot);
      toolGroup.position.copy(startPos).add(forwardVec);

    } else if (activeAlat === 'pahat') {
      const hammer = Math.abs(Math.sin(progress * Math.PI * 8)) * 0.1;
      const hammerVec = new THREE.Vector3(0, -hammer, 0).applyQuaternion(startRot);
      toolGroup.position.copy(startPos).add(hammerVec);
    }

    if (progress < 1.0) {
      requestAnimationFrame(animateToolAction);
    } else {
      toolGroup.position.copy(startPos);
      toolGroup.quaternion.copy(startRot);

      prosesPemotonganVoxelFisik(targetObj);
      isCuttingAnimation = false;
      refreshGizmoTarget();
    }
  }

  requestAnimationFrame(animateToolAction);
}

/* --- PEMOTONGAN MIKRO-VOXEL SKALA PRESISI --- */
function prosesPemotonganVoxelFisik(targetObj) {
  const valDiameter = parseFloat(document.getElementById('toolDiameter').value) || 0.2;
  const valDepthInput = parseFloat(document.getElementById('toolDepth').value) || 0.5;

  toolGroup.updateMatrixWorld();
  const inverseToolMatrix = new THREE.Matrix4().copy(toolGroup.matrixWorld).invert();

  const radiusBor = valDiameter / 2;
  const setengahPahat = valDiameter / 2;

  const toRemove = [];

  targetObj.voxelsGroup.children.forEach(voxel => {
    const voxelWorldPos = new THREE.Vector3();
    voxel.getWorldPosition(voxelWorldPos);

    const voxelInToolSpace = voxelWorldPos.clone().applyMatrix4(inverseToolMatrix);
    const depthIn = -voxelInToolSpace.y;

    if (depthIn >= -0.02 && depthIn <= valDepthInput) {
      
      if (activeAlat === 'bor') {
        const distRadial = Math.sqrt(voxelInToolSpace.x * voxelInToolSpace.x + voxelInToolSpace.z * voxelInToolSpace.z);
        if (distRadial <= radiusBor) {
          toRemove.push(voxel);
        }

      } else if (activeAlat === 'pahat') {
        if (Math.abs(voxelInToolSpace.x) <= setengahPahat && Math.abs(voxelInToolSpace.z) <= setengahPahat) {
          toRemove.push(voxel);
        }

      } else { // Gergaji
        let targetSpan = 1.5;
        if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex]) {
          const b = bendaKerjaList[selectedObjIndex];
          targetSpan = Math.max(b.p, b.l, b.t) * 1.2;
        }
        if (Math.abs(voxelInToolSpace.x) <= 0.02 && Math.abs(voxelInToolSpace.z) <= targetSpan / 2) {
          toRemove.push(voxel);
        }
      }
    }
  });

  toRemove.forEach(v => {
    targetObj.voxelsGroup.remove(v);
    v.geometry.dispose();
    v.material.dispose();
  });

  targetObj.hasBeenCut = true;
  rebuildOverlays(targetObj);
}

/* --- REBUILD OVERLAY BOUNDING RULER --- */
function rebuildOverlays(item) {
  if (!item) return;
  const toRemove = [];
  item.group.children.forEach(child => {
    if (child instanceof THREE.AxesHelper || child.isRulerOverlay) {
      toRemove.push(child);
    }
  });
  toRemove.forEach(c => item.group.remove(c));

  if (selectedObjIndex >= 0 && bendaKerjaList[selectedObjIndex] === item) {
    let sizeX = item.jenis === 'balok' ? item.p : item.t;
    let sizeY = item.jenis === 'balok' ? item.t : item.p;
    let sizeZ = item.jenis === 'balok' ? item.l : item.t;

    const boxGeo = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLineMat = new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 2 });
    const boundingBoxLine = new THREE.LineSegments(boxEdges, boxLineMat);
    
    boundingBoxLine.position.set(sizeX / 2, sizeY / 2, sizeZ / 2);
    boundingBoxLine.isRulerOverlay = true;
    item.group.add(boundingBoxLine);
  }
}

/* --- MANAJEMEN BENDA KERJA --- */
function setJenisBahanBaru(jenis) {
  jenisBahanBaru = jenis;
  document.getElementById('type-balok').classList.toggle('active', jenis === 'balok');
  document.getElementById('type-silinder').classList.toggle('active', jenis === 'silinder');
}

function setWarnaPreset(colorHex) {
  document.getElementById('objColor').value = colorHex;
  updateObjekTerpilih();
}

function updateColorAndOpacityDirectly(item) {
  if (!item || !item.voxelsGroup) return;

  const isTransparent = item.opacity < 1.0;
  const threeColor = new THREE.Color(item.color);

  item.voxelsGroup.children.forEach(vMesh => {
    vMesh.material.color.copy(threeColor);
    vMesh.material.opacity = item.opacity;
    vMesh.material.transparent = isTransparent;
    vMesh.material.needsUpdate = true;
  });
}

function tambahBendaKerja() {
  const index = bendaKerjaList.length + 1;
  const isBalok = jenisBahanBaru === 'balok';
  
  const defaultColor = isBalok ? '#c28e0e' : '#4a2f13';

  // Nilai Default Input UI (Dalam Satuan Visual Standard)
  const objData = {
    id: Date.now(),
    nama: isBalok ? `Kayu Balok #${index}` : `Pasak Silinder #${index}`,
    jenis: jenisBahanBaru,
    p: isBalok ? 1.0 : 1.5,
    l: 1.0,
    t: isBalok ? 1.5 : 1.0, // Diameter = 1.0 Unit Visual
    color: defaultColor,
    opacity: 1.0,
    group: new THREE.Group(),
    voxelsGroup: null,
    hasBeenCut: false
  };

  objData.group.isBendaGroup = true;
  objData.group.position.set(0, 0, 0);

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

  bendaKerjaList.forEach(b => rebuildOverlays(b));

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

    document.getElementById('objColor').value = item.color;
    document.getElementById('objOpacity').value = item.opacity;
    document.getElementById('opacityVal').innerText = `${Math.round(item.opacity * 100)}%`;

    syncRotationToUI();
    controlsDiv.style.display = 'block';

    if (!item.voxelsGroup) updateObjekMesh(item);
    rebuildOverlays(item);
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
      <span><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${item.color}; margin-right:6px; border:1px solid #fff;"></span>${item.jenis === 'balok' ? '🪵' : '🥢'} ${item.nama}</span>
      <button class="btn-del" onclick="hapusBendaKerja(${idx}, event)">✕</button>
    `;
    container.appendChild(card);
  });
}

function updateObjekTerpilih() {
  if (selectedObjIndex < 0) return;
  const item = bendaKerjaList[selectedObjIndex];

  const pLama = item.p;
  const lLama = item.l;
  const tLama = item.t;

  if (item.jenis === 'balok') {
    item.p = Math.max(0.1, parseFloat(document.getElementById('objP').value) || 1.0);
    item.l = Math.max(0.1, parseFloat(document.getElementById('objL').value) || 1.0);
    item.t = Math.max(0.1, parseFloat(document.getElementById('objT').value) || 1.5);
  } else {
    item.t = Math.max(0.1, parseFloat(document.getElementById('objDiameter').value) || 1.0);
    item.p = Math.max(0.1, parseFloat(document.getElementById('objTinggiSilinder').value) || 1.5);
  }

  item.color = document.getElementById('objColor').value;
  item.opacity = parseFloat(document.getElementById('objOpacity').value);
  document.getElementById('opacityVal').innerText = `${Math.round(item.opacity * 100)}%`;

  const dimensiBerubah = (pLama !== item.p || lLama !== item.l || tLama !== item.t);

  if (dimensiBerubah || !item.voxelsGroup || item.hasBeenCut) {
    updateObjekMesh(item);
  } else {
    updateColorAndOpacityDirectly(item);
  }

  renderObjectListUI();
}

/* --- GENERATOR SILINDER MIKRO-VOXEL (1 SATUAN = 100 ELEMEN -> BULAT MULUS PERFECT) --- */
function updateObjekMesh(item) {
  const group = item.group;
  while(group.children.length > 0){ 
    group.remove(group.children[0]); 
  }

  item.voxelsGroup = new THREE.Group();
  group.add(item.voxelsGroup);

  const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
  
  const woodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(item.color),
    roughness: 0.6,
    metalness: 0.1,
    transparent: item.opacity < 1.0,
    opacity: item.opacity
  });

  if (item.jenis === 'balok') {
    for (let x = 0; x < item.p; x += VOXEL_SIZE) {
      for (let y = 0; y < item.t; y += VOXEL_SIZE) {
        for (let z = 0; z < item.l; z += VOXEL_SIZE) {
          const vMesh = new THREE.Mesh(boxGeo, woodMat);
          vMesh.position.set(x + VOXEL_SIZE/2, y + VOXEL_SIZE/2, z + VOXEL_SIZE/2);
          item.voxelsGroup.add(vMesh);
        }
      }
    }
  } else { 
    // SILINDER DENGAN DENSITAS 100 MIKRO-VOXEL PER 1 UNIT VISUAL
    const radius = item.t / 2;
    const centerX = radius;
    const centerZ = radius;

    for (let x = 0; x < item.t; x += VOXEL_SIZE) {
      for (let z = 0; z < item.t; z += VOXEL_SIZE) {
        
        const distX = (x + VOXEL_SIZE / 2) - centerX;
        const distZ = (z + VOXEL_SIZE / 2) - centerZ;
        const distRadial = Math.sqrt(distX * distX + distZ * distZ);

        // Hanya membentuk voxel di dalam jejari lingkar $r$
        if (distRadial <= radius) {
          for (let y = 0; y < item.p; y += VOXEL_SIZE) {
            const vMesh = new THREE.Mesh(boxGeo, woodMat);
            vMesh.position.set(x + VOXEL_SIZE / 2, y + VOXEL_SIZE / 2, z + VOXEL_SIZE / 2);
            item.voxelsGroup.add(vMesh);
          }
        }
      }
    }
  }

  rebuildOverlays(item);
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
  if (!container || !renderer || !camera) return;
  
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateParticles();
  renderer.render(scene, camera);
}
