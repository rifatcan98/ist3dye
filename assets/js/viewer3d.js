// Three.js 3D Viewer & STL Loader for ist3Dye.com

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
    this.camera.position.set(80, 80, 100);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 600;
      this.controls.minDistance = 10;
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(100, 150, 100);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.4);
    dirLight2.position.set(-100, -50, -100);
    this.scene.add(dirLight2);

    // 6. Build Plate / Grid Helper
    this.gridHelper = new THREE.GridHelper(150, 30, 0x3b82f6, 0x1e293b);
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
    if (this.currentMesh && !this.controls?.state && this.autoRotate) {
      this.currentMesh.rotation.y += 0.005;
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resetCamera() {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(80, 80, 100);
    this.controls.target.set(0, 20, 0);
    this.controls.update();
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    if (this.currentMesh) {
      this.currentMesh.material.wireframe = this.isWireframe;
    }
  }

  // Load STL from File object or ArrayBuffer
  loadSTLFile(file) {
    if (this.placeholder) this.placeholder.classList.add('hidden');
    if (this.fileNameEl) this.fileNameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      this.parseSTL(buffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  parseSTL(buffer, name) {
    try {
      const loader = new THREE.STLLoader();
      const geometry = loader.parse(buffer);
      this.displayGeometry(geometry, name);
    } catch (err) {
      console.error('STL Parse Error:', err);
      alert('Seçilen STL dosyası çözümlenemedi. Lütfen geçerli bir ikili (binary) veya ASCII STL dosyası yükleyin.');
    }
  }

  // Generate a procedural sample gear/mechanical part for testing
  loadSampleDemoModel() {
    if (this.placeholder) this.placeholder.classList.add('hidden');
    if (this.fileNameEl) this.fileNameEl.textContent = 'ornek_muhendislik_parcasi.stl';

    // Procedural cylinder gear shape
    const shape = new THREE.Shape();
    const outerRadius = 30;
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

    // Hole in center
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 10, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    const extrudeSettings = { depth: 15, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 1, bevelThickness: 1 };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    geometry.rotateX(Math.PI / 2);

    this.displayGeometry(geometry, 'ornek_muhendislik_parcasi.stl');
  }

  displayGeometry(geometry, name) {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      this.currentMesh.material.dispose();
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    // Material with metallic / 3D printed look
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

    // Center mesh on build plate (y = 0)
    geometry.center();
    this.currentMesh.position.y = size.y / 2;

    this.scene.add(this.currentMesh);

    // Update specs bar
    const x = Math.round(size.x);
    const y = Math.round(size.y);
    const z = Math.round(size.z);

    // Approximate bounding box volume in cm3
    const approxVolumeCm3 = Math.max(5, Math.round((x * y * z * 0.00045)));
    this.modelVolumeCm3 = approxVolumeCm3;

    if (this.specsBar) this.specsBar.classList.remove('hidden');
    if (this.dimsEl) this.dimsEl.textContent = `${x} x ${z} x ${y} mm`;
    if (this.volEl) this.volEl.textContent = `~${approxVolumeCm3} cm³`;
    
    const triCount = geometry.attributes.position.count / 3;
    if (this.trianglesEl) this.trianglesEl.textContent = `${Math.round(triCount).toLocaleString('tr-TR')} Üçgen`;

    // Adjust camera to fit mesh nicely
    const maxDim = Math.max(size.x, size.y, size.z);
    this.camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.8);
    if (this.controls) {
      this.controls.target.set(0, size.y / 2, 0);
      this.controls.update();
    }

    // Trigger price recalculation in main.js
    if (window.triggerPriceUpdate) {
      window.triggerPriceUpdate(this.modelVolumeCm3, name);
    }
  }

  updateMaterialColor(hex) {
    if (this.currentMesh && this.currentMesh.material) {
      this.currentMesh.material.color.set(hex);
    }
  }
}

// Global reference
window.viewer3DInstance = null;
document.addEventListener('DOMContentLoaded', () => {
  window.viewer3DInstance = new ThreeDViewer('canvasBox');
});
