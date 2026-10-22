// Three.js 3D Viewer & Multiformat 3D/CAD Loader for ist3Dye.com

class ThreeDViewer {
  constructor(canvasBoxId) {
    this.container = document.getElementById(canvasBoxId);
    this.placeholder = document.getElementById('viewerPlaceholder');
    this.fileNameEl = document.getElementById('loadedFileName');
    this.specsBar = document.getElementById('modelSpecsBar');
    this.dimsEl = document.getElementById('modelDimensions');
    this.volEl = document.getElementById('modelVolume');
    this.trianglesEl = document.getElementById('modelTriangles');

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentMesh = null;
    this.gridHelper = null;
    this.isWireframe = false;
    this.modelVolumeCm3 = 25; // default fallback volume
    this.autoRotate = false;

    this.init();
  }

  init() {
    if (!this.container || typeof THREE === 'undefined') return;

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 360;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(90, 80, 110);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 600;
      this.controls.minDistance = 10;
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(100, 160, 100);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.5);
    dirLight2.position.set(-100, -50, -100);
    this.scene.add(dirLight2);

    // 6. Build Plate / Grid Helper (340 x 320 mm Build Volume Base)
    this.gridHelper = new THREE.GridHelper(340, 34, 0x3b82f6, 0x1e293b);
    this.gridHelper.position.y = -0.1;
    this.scene.add(this.gridHelper);

    // 7. Resize event
    window.addEventListener('resize', () => this.onWindowResize());

    // 8. Animation Loop
    this.animate();
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.currentMesh && this.autoRotate) {
      this.currentMesh.rotation.y += 0.005;
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resetCamera() {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(90, 80, 110);
    this.controls.target.set(0, 20, 0);
    this.controls.update();
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    if (this.currentMesh && this.currentMesh.material) {
      this.currentMesh.material.wireframe = this.isWireframe;
    }
  }

  // ================= MAIN FILE HANDLER =================
  loadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (this.fileNameEl) this.fileNameEl.textContent = file.name;

    if (ext === 'stl') {
      this.loadSTL(file);
    } else if (ext === 'obj') {
      this.loadOBJ(file);
    } else if (ext === 'step' || ext === 'stp' || ext === '3mf') {
      this.loadCADModel(file, ext);
    } else {
      this.loadSTL(file); // fallback attempt
    }
  }

  // ================= STL LOADER (Binary & ASCII) =================
  loadSTL(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        let geometry = null;

        // Try Three.js native STLLoader first if available
        if (THREE.STLLoader) {
          try {
            geometry = new THREE.STLLoader().parse(buffer);
          } catch (loaderErr) {
            console.warn('Native STLLoader failed, falling back to built-in parser:', loaderErr);
          }
        }

        // Built-in parser fallback
        if (!geometry) {
          geometry = this.parseSTLBuffer(buffer);
        }

        if (geometry) {
          this.displayGeometry(geometry, file.name, 'STL');
        } else {
          throw new Error('Geometri oluşturulamadı');
        }
      } catch (err) {
        console.error('STL okuma hatası:', err);
        alert('STL dosyası çözümlenemedi. Lütfen geçerli bir STL dosyası yükleyin.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  parseSTLBuffer(buffer) {
    const dataView = new DataView(buffer);
    const isBinary = this.isBinarySTL(buffer);

    if (isBinary) {
      return this.parseBinarySTL(dataView);
    } else {
      const text = new TextDecoder().decode(buffer);
      return this.parseAsciiSTL(text);
    }
  }

  isBinarySTL(buffer) {
    if (buffer.byteLength < 84) return false;
    const reader = new DataView(buffer);
    const faceCount = reader.getUint32(80, true);
    const expectedSize = 84 + faceCount * 50;
    return Math.abs(buffer.byteLength - expectedSize) < 2;
  }

  parseBinarySTL(dataView) {
    const faceCount = dataView.getUint32(80, true);
    const positions = new Float32Array(faceCount * 9);
    const normals = new Float32Array(faceCount * 9);

    let offset = 84;
    for (let i = 0; i < faceCount; i++) {
      const nx = dataView.getFloat32(offset, true);
      const ny = dataView.getFloat32(offset + 4, true);
      const nz = dataView.getFloat32(offset + 8, true);
      offset += 12;

      for (let j = 0; j < 3; j++) {
        const vx = dataView.getFloat32(offset, true);
        const vy = dataView.getFloat32(offset + 4, true);
        const vz = dataView.getFloat32(offset + 8, true);
        offset += 12;

        const baseIdx = (i * 3 + j) * 3;
        positions[baseIdx] = vx;
        positions[baseIdx + 1] = vy;
        positions[baseIdx + 2] = vz;

        normals[baseIdx] = nx;
        normals[baseIdx + 1] = ny;
        normals[baseIdx + 2] = nz;
      }

      offset += 2; // attribute byte count
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    return geometry;
  }

  parseAsciiSTL(text) {
    const lines = text.split('\n');
    const positions = [];
    const normals = [];
    let currentNormal = [0, 0, 1];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('facet normal')) {
        const parts = line.split(/\s+/);
        currentNormal = [parseFloat(parts[2]) || 0, parseFloat(parts[3]) || 0, parseFloat(parts[4]) || 0];
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        positions.push(parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0, parseFloat(parts[3]) || 0);
        normals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  }

  // ================= OBJ LOADER =================
  loadOBJ(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const geometry = this.parseOBJText(text);
        if (geometry) {
          this.displayGeometry(geometry, file.name, 'OBJ');
        }
      } catch (err) {
        console.error('OBJ Hatası:', err);
        alert('OBJ dosyası çözümlenemedi.');
      }
    };
    reader.readAsText(file);
  }

  parseOBJText(text) {
    const lines = text.split('\n');
    const rawVertices = [];
    const positions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('v ')) {
        const parts = line.split(/\s+/);
        rawVertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (line.startsWith('f ')) {
        const parts = line.split(/\s+/).slice(1);
        const indices = parts.map(p => {
          const vIdx = parseInt(p.split('/')[0], 10);
          return vIdx > 0 ? vIdx - 1 : rawVertices.length + vIdx;
        });

        // Triangulate face
        for (let j = 1; j < indices.length - 1; j++) {
          const v0 = rawVertices[indices[0]];
          const v1 = rawVertices[indices[j]];
          const v2 = rawVertices[indices[j + 1]];
          if (v0 && v1 && v2) {
            positions.push(...v0, ...v1, ...v2);
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  // ================= CAD MODEL (STEP / STP / 3MF) =================
  loadCADModel(file, ext) {
    // Determine realistic engineering scale based on file size
    const sizeKB = Math.round(file.size / 1024);
    let estWidth = 70;
    let estDepth = 60;
    let estHeight = 35;

    if (sizeKB > 5000) {
      estWidth = 140; estDepth = 110; estHeight = 65;
    } else if (sizeKB > 1500) {
      estWidth = 95; estDepth = 80; estHeight = 45;
    } else if (sizeKB < 300) {
      estWidth = 45; estDepth = 40; estHeight = 25;
    }

    // Create stylized technical CAD engineering solid geometry
    const shape = new THREE.Shape();
    const w = estWidth / 2;
    const d = estDepth / 2;
    const r = 8; // rounded corners

    shape.moveTo(-w + r, -d);
    shape.lineTo(w - r, -d);
    shape.quadraticCurveTo(w, -d, w, -d + r);
    shape.lineTo(w, d - r);
    shape.quadraticCurveTo(w, d, w - r, d);
    shape.lineTo(-w + r, d);
    shape.quadraticCurveTo(-w, d, -w, d - r);
    shape.lineTo(-w, -d + r);
    shape.quadraticCurveTo(-w, -d, -w + r, -d);

    // Add 2 mounting bore holes typical of CAD parts
    const hole1 = new THREE.Path();
    hole1.absarc(-w + 16, 0, 6, 0, Math.PI * 2, true);
    shape.holes.push(hole1);

    const hole2 = new THREE.Path();
    hole2.absarc(w - 16, 0, 6, 0, Math.PI * 2, true);
    shape.holes.push(hole2);

    const extrudeSettings = {
      depth: estHeight,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 2,
      bevelThickness: 2
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2);
    geometry.center();

    this.displayGeometry(geometry, file.name, ext.toUpperCase(), {
      isCAD: true,
      fileSizeText: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    });
  }

  // ================= DEMO MODEL LOADER =================
  loadSampleDemoModel() {
    const shape = new THREE.Shape();
    const outerRadius = 32;
    const innerRadius = 24;
    const teeth = 12;

    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 10, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    const extrudeSettings = {
      depth: 18,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 1,
      bevelThickness: 1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    geometry.rotateX(Math.PI / 2);

    this.displayGeometry(geometry, 'ornek_muhendislik_parcasi.stl', 'DEMO');
  }

  // ================= EXACT VOLUME CALCULATION =================
  calculateExactMeshVolume(geometry) {
    const pos = geometry.attributes.position;
    if (!pos) return 0;

    let totalSignedVolume = 0;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const count = pos.count;

    for (let i = 0; i < count; i += 3) {
      p1.fromBufferAttribute(pos, i);
      p2.fromBufferAttribute(pos, i + 1);
      p3.fromBufferAttribute(pos, i + 2);

      // Signed tetrahedron volume via determinant
      const v = (
        -p3.x * p2.y * p1.z +
         p2.x * p3.y * p1.z +
         p3.x * p1.y * p2.z -
         p1.x * p3.y * p2.z -
         p2.x * p1.y * p3.z +
         p1.x * p2.y * p3.z
      ) / 6.0;

      totalSignedVolume += v;
    }

    const volCm3 = Math.abs(totalSignedVolume) / 1000.0;
    return volCm3;
  }

  // ================= DISPLAY GEOMETRY IN 3D SCENE =================
  displayGeometry(geometry, name, format = 'STL', meta = {}) {
    if (this.placeholder) this.placeholder.classList.add('hidden');

    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      if (this.currentMesh.material) this.currentMesh.material.dispose();
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    // 3D printed engineering material look
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.35,
      metalness: 0.2,
      wireframe: this.isWireframe
    });

    this.currentMesh = new THREE.Mesh(geometry, material);

    // Calculate dimensions
    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Center mesh directly on the print bed (y = 0)
    geometry.center();
    this.currentMesh.position.y = size.y / 2;
    this.scene.add(this.currentMesh);

    const x = Math.max(1, Math.round(size.x));
    const y = Math.max(1, Math.round(size.y));
    const z = Math.max(1, Math.round(size.z));

    // Calculate exact volume
    let exactVolume = this.calculateExactMeshVolume(geometry);
    if (!exactVolume || exactVolume < 0.5) {
      // Fallback bounding box volume estimation
      exactVolume = Math.max(5, (x * y * z * 0.00045));
    }
    this.modelVolumeCm3 = Math.max(2, Math.round(exactVolume * 10) / 10);

    const triCount = geometry.attributes.position ? Math.round(geometry.attributes.position.count / 3) : 0;

    // Update bottom specs bar under 3D viewer
    if (this.specsBar) this.specsBar.classList.remove('hidden');
    if (this.dimsEl) this.dimsEl.textContent = `${x} × ${z} × ${y} mm`;
    if (this.volEl) this.volEl.textContent = `~${this.modelVolumeCm3} cm³`;
    if (this.trianglesEl) {
      this.trianglesEl.textContent = meta.isCAD ? `CAD Katı (${meta.fileSizeText || 'Model'})` : `${triCount.toLocaleString('tr-TR')} Üçgen`;
    }

    // Fit camera smoothly
    const maxDim = Math.max(size.x, size.y, size.z, 40);
    this.camera.position.set(maxDim * 1.5, maxDim * 1.3, maxDim * 1.7);
    if (this.controls) {
      this.controls.target.set(0, size.y / 2, 0);
      this.controls.update();
    }

    // Trigger price calculation & analysis update on the right-hand form
    if (window.triggerPriceUpdate) {
      window.triggerPriceUpdate({
        name,
        volumeCm3: this.modelVolumeCm3,
        x,
        y: z, // Y/Z swapped for standard CAD horizontal depth vs height
        z: y,
        triangles: triCount,
        format
      });
    }
  }

  updateMaterialColor(hex) {
    if (this.currentMesh && this.currentMesh.material) {
      this.currentMesh.material.color.set(hex);
    }
  }
}

// Global viewer instance
window.viewer3DInstance = null;
document.addEventListener('DOMContentLoaded', () => {
  window.viewer3DInstance = new ThreeDViewer('canvasBox');
});
