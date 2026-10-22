// Three.js 3D Viewer & Multiformat 3D/CAD Loader (STL, 3MF, OBJ, STEP) for ist3Dye.com

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

    // Scaling & Base measurement state
    this.currentScale = 1.0;
    this.unitFactor = 1.0;
    this.baseDimensions = { x: 64, y: 64, z: 18 };
    this.baseVolumeCm3 = 25;
    this.currentModelName = 'Örnek Test Modeli';
    this.currentFormat = 'DEMO';
    this.currentTriangles = 1440;
    this.currentMeta = {};

    // Maximum printer build volume dimensions (340 x 320 x 340 mm)
    this.maxBuildVolume = { x: 340, y: 320, z: 340 };

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
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
    this.camera.position.set(130, 110, 150);

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
      this.controls.maxDistance = 5000;
      this.controls.minDistance = 5;
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(200, 300, 200);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.5);
    dirLight2.position.set(-200, -100, -200);
    this.scene.add(dirLight2);

    // 6. Build Plate / Grid Helper (340 x 320 mm Build Plate Representation)
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
    const maxDim = Math.max(this.baseDimensions.x, this.baseDimensions.y, this.baseDimensions.z, 60);
    this.camera.position.set(maxDim * 1.6, maxDim * 1.3, maxDim * 1.7);
    this.controls.target.set(0, (this.baseDimensions.y * this.currentScale) / 2, 0);
    this.controls.update();
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    if (this.currentMesh && this.currentMesh.material) {
      this.currentMesh.material.wireframe = this.isWireframe;
    }
  }

  // ================= SCALING & UNIT CONVERSIONS =================
  setScale(factor) {
    if (!this.currentMesh || !this.baseDimensions) return;
    this.currentScale = factor;
    const total = factor * this.unitFactor;
    this.currentMesh.scale.set(total, total, total);
    // Keep the part sitting exactly on the build plate after scaling
    this.currentMesh.position.y = (this.baseDimensions.y * factor) / 2;

    const x = Math.max(1, Math.round(this.baseDimensions.x * factor));
    const y = Math.max(1, Math.round(this.baseDimensions.y * factor));
    const z = Math.max(1, Math.round(this.baseDimensions.z * factor));
    const vol = Math.max(1, Math.round(this.baseVolumeCm3 * Math.pow(factor, 3) * 10) / 10);
    this.modelVolumeCm3 = vol;

    const isOversize = (x > this.maxBuildVolume.x || z > this.maxBuildVolume.y || y > this.maxBuildVolume.z);

    if (this.dimsEl) {
      this.dimsEl.textContent = `${x} × ${z} × ${y} mm`;
      if (isOversize) {
        this.dimsEl.innerHTML = `<span class="text-amber-400 font-bold">${x} × ${z} × ${y} mm (Aşıyor)</span>`;
      }
    }
    if (this.volEl) this.volEl.textContent = `~${vol.toLocaleString('tr-TR')} cm³`;

    // Adjust camera target
    if (this.controls) {
      this.controls.target.set(0, y / 2, 0);
      this.controls.update();
    }

    if (window.triggerPriceUpdate) {
      window.triggerPriceUpdate({
        name: this.currentModelName,
        volumeCm3: vol,
        x,
        y: z,
        z: y,
        triangles: this.currentTriangles,
        format: this.currentFormat,
        isOversize,
        scale: factor
      });
    }
  }

  convertUnit(multiplier) {
    if (!this.baseDimensions) return;
    this.baseDimensions.x = Math.round(this.baseDimensions.x * multiplier);
    this.baseDimensions.y = Math.round(this.baseDimensions.y * multiplier);
    this.baseDimensions.z = Math.round(this.baseDimensions.z * multiplier);
    this.baseVolumeCm3 = Math.round(this.baseVolumeCm3 * Math.pow(multiplier, 3) * 10) / 10;
    this.unitFactor *= multiplier;
    this.setScale(this.currentScale);
  }

  // ================= MAIN FILE ROUTER =================
  loadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (this.fileNameEl) this.fileNameEl.textContent = file.name;

    if (ext === '3mf') {
      this.load3MF(file);
    } else if (ext === 'stl') {
      this.loadSTL(file);
    } else if (ext === 'obj') {
      this.loadOBJ(file);
    } else if (ext === 'step' || ext === 'stp') {
      this.loadStepFile(file);
    } else {
      this.loadSTL(file);
    }
  }

  // ================= 3MF LOADER (Real XML Geometry Parser) =================
  load3MF(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        if (typeof JSZip === 'undefined') {
          throw new Error('JSZip kütüphanesi hazır değil.');
        }

        const zip = await JSZip.loadAsync(buffer);
        let modelXmlText = null;

        for (const filename of Object.keys(zip.files)) {
          if (filename.toLowerCase().endsWith('.model') || filename.toLowerCase().includes('3dmodel')) {
            modelXmlText = await zip.files[filename].async('string');
            break;
          }
        }

        if (!modelXmlText) {
          throw new Error('3MF arşivi içinde 3D model verisi bulunamadı.');
        }

        const geometry = this.parse3MFXml(modelXmlText);
        if (geometry) {
          this.displayGeometry(geometry, file.name, '3MF');
        } else {
          throw new Error('3MF geometrisi okunamadı.');
        }
      } catch (err) {
        console.error('3MF Hatası:', err);
        alert('3MF dosyası çözümlenemedi: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  parse3MFXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const getTags = (parent, name) => {
      let nodes = parent.getElementsByTagName(name);
      if (!nodes || nodes.length === 0) nodes = parent.getElementsByTagName('m:' + name);
      if ((!nodes || nodes.length === 0) && parent.getElementsByTagNameNS) {
        nodes = parent.getElementsByTagNameNS('*', name);
      }
      return Array.from(nodes || []);
    };

    const modelTags = getTags(doc, 'model');
    const modelTag = modelTags[0];
    let unitScale = 1.0;
    if (modelTag) {
      const unit = (modelTag.getAttribute('unit') || 'millimeter').toLowerCase();
      if (unit === 'inch') unitScale = 25.4;
      else if (unit === 'centimeter') unitScale = 10.0;
      else if (unit === 'meter') unitScale = 1000.0;
      else if (unit === 'micron') unitScale = 0.001;
    }

    const allPositions = [];
    const meshNodes = getTags(doc, 'mesh');

    for (let m = 0; m < meshNodes.length; m++) {
      const meshNode = meshNodes[m];
      const vertexNodes = getTags(meshNode, 'vertex');
      const vertices = [];

      for (let i = 0; i < vertexNodes.length; i++) {
        const v = vertexNodes[i];
        vertices.push(
          (parseFloat(v.getAttribute('x')) || 0) * unitScale,
          (parseFloat(v.getAttribute('y')) || 0) * unitScale,
          (parseFloat(v.getAttribute('z')) || 0) * unitScale
        );
      }

      const triangleNodes = getTags(meshNode, 'triangle');
      for (let i = 0; i < triangleNodes.length; i++) {
        const t = triangleNodes[i];
        const v1 = parseInt(t.getAttribute('v1'), 10);
        const v2 = parseInt(t.getAttribute('v2'), 10);
        const v3 = parseInt(t.getAttribute('v3'), 10);

        if (vertices[v1 * 3] !== undefined && vertices[v2 * 3] !== undefined && vertices[v3 * 3] !== undefined) {
          allPositions.push(
            vertices[v1 * 3 + 0], vertices[v1 * 3 + 1], vertices[v1 * 3 + 2],
            vertices[v2 * 3 + 0], vertices[v2 * 3 + 1], vertices[v2 * 3 + 2],
            vertices[v3 * 3 + 0], vertices[v3 * 3 + 1], vertices[v3 * 3 + 2]
          );
        }
      }
    }

    if (allPositions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  // ================= STL LOADER =================
  loadSTL(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        let geometry = null;

        if (THREE.STLLoader) {
          try {
            geometry = new THREE.STLLoader().parse(buffer);
          } catch (loaderErr) {
            console.warn('Native STLLoader failed, using built-in parser:', loaderErr);
          }
        }

        if (!geometry) {
          geometry = this.parseSTLBuffer(buffer);
        }

        if (geometry) {
          this.displayGeometry(geometry, file.name, 'STL');
        } else {
          throw new Error('STL geometrisi oluşturulamadı');
        }
      } catch (err) {
        console.error('STL hatası:', err);
        alert('STL dosyası çözümlenemedi. Lütfen geçerli bir STL yükleyin.');
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

      offset += 2;
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

  // ================= STEP / STP CAD LOADER =================
  loadStepFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const pointRegex = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)\s*\)/g;
        let match;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let count = 0;

        while ((match = pointRegex.exec(text)) !== null) {
          const px = parseFloat(match[1]);
          const py = parseFloat(match[2]);
          const pz = parseFloat(match[3]);
          if (!isNaN(px) && !isNaN(py) && !isNaN(pz)) {
            if (px < minX) minX = px; if (px > maxX) maxX = px;
            if (py < minY) minY = py; if (py > maxY) maxY = py;
            if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
            count++;
          }
        }

        let dx = 80, dy = 60, dz = 40;
        if (count >= 2 && isFinite(minX) && isFinite(maxX)) {
          dx = Math.max(5, Math.round(Math.abs(maxX - minX)));
          dy = Math.max(5, Math.round(Math.abs(maxY - minY)));
          dz = Math.max(5, Math.round(Math.abs(maxZ - minZ)));
        }

        const geometry = new THREE.BoxGeometry(dx, dz, dy);
        geometry.center();

        this.displayGeometry(geometry, file.name, 'STEP', {
          isCAD: true,
          pointCount: count
        });
      } catch (err) {
        console.error('STEP Okuma Hatası:', err);
      }
    };
    reader.readAsText(file.slice(0, 5000000));
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

  // ================= EXACT MATHEMATICAL VOLUME (Signed Tetrahedron Sum) =================
  calculateExactMeshVolume(geometry) {
    const pos = geometry.attributes.position;
    if (!pos) return 0;

    let totalSignedVolume = 0;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();

    const index = geometry.index;
    if (index) {
      const count = index.count;
      for (let i = 0; i < count; i += 3) {
        const a = index.getX(i);
        const b = index.getX(i + 1);
        const c = index.getX(i + 2);

        p1.fromBufferAttribute(pos, a);
        p2.fromBufferAttribute(pos, b);
        p3.fromBufferAttribute(pos, c);

        const v = (
          p1.x * (p2.y * p3.z - p2.z * p3.y) +
          p1.y * (p2.z * p3.x - p2.x * p3.z) +
          p1.z * (p2.x * p3.y - p2.y * p3.x)
        ) / 6.0;

        totalSignedVolume += v;
      }
    } else {
      const count = pos.count;
      for (let i = 0; i < count; i += 3) {
        p1.fromBufferAttribute(pos, i);
        p2.fromBufferAttribute(pos, i + 1);
        p3.fromBufferAttribute(pos, i + 2);

        const v = (
          p1.x * (p2.y * p3.z - p2.z * p3.y) +
          p1.y * (p2.z * p3.x - p2.x * p3.z) +
          p1.z * (p2.x * p3.y - p2.y * p3.x)
        ) / 6.0;

        totalSignedVolume += v;
      }
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

    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.35,
      metalness: 0.2,
      wireframe: this.isWireframe
    });

    this.currentMesh = new THREE.Mesh(geometry, material);

    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Center mesh directly on build bed (y = 0)
    geometry.center();
    this.currentMesh.position.y = size.y / 2;
    this.scene.add(this.currentMesh);

    const x = Math.max(1, Math.round(size.x));
    const y = Math.max(1, Math.round(size.y));
    const z = Math.max(1, Math.round(size.z));
    const bboxVolumeCm3 = (x * y * z) / 1000.0;

    let exactVolume = this.calculateExactMeshVolume(geometry);
    // Sanity check: If exact volume is 0 or corrupted (< 0.1 cm³) while bbox is larger,
    // fallback to conservative envelope approximation (~45%).
    // Also, exact solid volume cannot physically exceed its bounding box.
    if (!exactVolume || exactVolume < 0.1) {
      exactVolume = Math.max(1, bboxVolumeCm3 * 0.45);
    } else if (exactVolume > bboxVolumeCm3 * 1.05) {
      exactVolume = bboxVolumeCm3;
    }
    this.modelVolumeCm3 = Math.max(0.5, Math.round(exactVolume * 10) / 10);

    const triCount = geometry.attributes.position ? Math.round(geometry.attributes.position.count / 3) : 0;

    // State caching for scaling
    this.currentModelName = name;
    this.currentFormat = format;
    this.currentTriangles = triCount;
    this.currentMeta = meta;
    this.baseDimensions = { x, y, z };
    this.baseVolumeCm3 = this.modelVolumeCm3;
    this.currentScale = 1.0;
    this.unitFactor = 1.0;

    // Reset scaling buttons in UI to 100%
    document.querySelectorAll('.scale-btn').forEach(btn => {
      if (btn.getAttribute('data-scale') === '1.0') {
        btn.classList.add('bg-brand-600', 'text-white', 'active', 'font-bold');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('bg-brand-600', 'text-white', 'active', 'font-bold');
        btn.classList.add('text-slate-400');
      }
    });

    const isOversize = (x > this.maxBuildVolume.x || z > this.maxBuildVolume.y || y > this.maxBuildVolume.z);

    if (this.specsBar) this.specsBar.classList.remove('hidden');
    if (this.dimsEl) {
      this.dimsEl.textContent = `${x} × ${z} × ${y} mm`;
      if (isOversize) {
        this.dimsEl.innerHTML = `<span class="text-amber-400 font-bold">${x} × ${z} × ${y} mm (Aşıyor)</span>`;
      }
    }
    if (this.volEl) this.volEl.textContent = `~${this.modelVolumeCm3.toLocaleString('tr-TR')} cm³`;
    if (this.trianglesEl) {
      this.trianglesEl.textContent = meta.isCAD ? `CAD Katı Model` : `${triCount.toLocaleString('tr-TR')} Üçgen`;
    }

    const maxDim = Math.max(size.x, size.y, size.z, 50);
    this.camera.position.set(maxDim * 1.6, maxDim * 1.3, maxDim * 1.7);
    this.camera.near = Math.max(0.1, maxDim / 500);
    this.camera.far = Math.max(8000, maxDim * 10);
    this.camera.updateProjectionMatrix();

    if (this.controls) {
      this.controls.target.set(0, size.y / 2, 0);
      this.controls.update();
    }

    if (window.triggerPriceUpdate) {
      window.triggerPriceUpdate({
        name,
        volumeCm3: this.modelVolumeCm3,
        x,
        y: z,
        z: y,
        triangles: triCount,
        format,
        isOversize,
        scale: 1.0
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
