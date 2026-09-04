/* --- ENGINE CSG SUBTRACTION MURNI UNTUK THREE.JS --- */
window.CSGEngine = class CSGEngine {
  static subtract(mainMesh, cutterMesh, woodMaterial) {
    try {
      mainMesh.updateMatrixWorld(true);
      cutterMesh.updateMatrixWorld(true);

      // Transformasi matriks cutter ke ruang lokal mainMesh
      const mainMatrixWorld = mainMesh.matrixWorld.clone();
      const mainMatrixWorldInv = mainMatrixWorld.clone().invert();
      const cutterLocalMatrix = mainMatrixWorldInv.multiply(cutterMesh.matrixWorld);

      // Kloning geometri cutter dan posisikan di ruang lokal mainMesh
      const cutterGeom = cutterMesh.geometry.clone();
      cutterGeom.applyMatrix4(cutterLocalMatrix);

      const mainGeom = mainMesh.geometry.clone();

      // Eksekusi Subtraction Poligon (Main - Cutter)
      const newGeom = CSGEngine.performBooleanSubtract(mainGeom, cutterGeom);

      if (!newGeom) return null;

      const resultMesh = new THREE.Mesh(newGeom, woodMaterial);
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      return resultMesh;
    } catch (err) {
      console.error("CSG Error:", err);
      return null;
    }
  }

  static performBooleanSubtract(geomA, geomB) {
    const posA = geomA.attributes.position;
    const posB = geomB.attributes.position;

    const boxB = new THREE.Box3().setFromBufferAttribute(posB);
    const keptVertices = [];

    const getVec = (attr, index) => new THREE.Vector3(attr.getX(index), attr.getY(index), attr.getZ(index));

    // Iterasi segitiga pada kayu asli
    for (let i = 0; i < posA.count; i += 3) {
      const v0 = getVec(posA, i);
      const v1 = getVec(posA, i + 1);
      const v2 = getVec(posA, i + 2);

      const center = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);

      // Pengecekan posisi vertek di dalam area potong
      if (boxB.containsPoint(center)) {
        CSGEngine.addHoleInnerWalls(v0, v1, v2, boxB, keptVertices);
      } else {
        // Simpan permukaan kayu yang utuh
        keptVertices.push(
          v0.x, v0.y, v0.z,
          v1.x, v1.y, v1.z,
          v2.x, v2.y, v2.z
        );
      }
    }

    const resultGeom = new THREE.BufferGeometry();
    resultGeom.setAttribute('position', new THREE.Float32BufferAttribute(keptVertices, 3));
    resultGeom.computeVertexNormals();

    return resultGeom;
  }

  static addHoleInnerWalls(v0, v1, v2, boxB, verticesArray) {
    // Membentuk dinding dalam rongga potongan kayu
    const min = boxB.min;
    const max = boxB.max;

    const wallVerts = [
      min.x, min.y, min.z,  max.x, min.y, min.z,  max.x, min.y, max.z,
      min.x, min.y, min.z,  max.x, min.y, max.z,  min.x, min.y, max.z,

      min.x, max.y, min.z,  max.x, max.y, max.z,  max.x, max.y, min.z,
      min.x, max.y, min.z,  min.x, max.y, max.z,  max.x, max.y, max.z,

      min.x, min.y, min.z,  min.x, max.y, min.z,  max.x, max.y, min.z,
      min.x, min.y, min.z,  max.x, max.y, min.z,  max.x, min.y, min.z,

      min.x, min.y, max.z,  max.x, max.y, max.z,  min.x, max.y, max.z,
      min.x, min.y, max.z,  max.x, min.y, max.z,  max.x, max.y, max.z
    ];

    verticesArray.push(...wallVerts);
  }
};
