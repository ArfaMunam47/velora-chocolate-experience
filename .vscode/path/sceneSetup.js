import * as THREE from 'three';
 
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}
 
export function createLighting(scene) {
  const ambient = new THREE.AmbientLight(0x6b5138, 0.55);
  scene.add(ambient);
 
  const key = new THREE.DirectionalLight(0xffe6bf, 2.2);
  key.position.set(2.5, 4, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.002;
  scene.add(key);
 
  const rim = new THREE.DirectionalLight(0xc9a15a, 1.4);
  rim.position.set(-3, 2, -2.5);
  scene.add(rim);
 
  const fill = new THREE.PointLight(0xffd9a0, 0.6, 10);
  fill.position.set(-1.5, -1, 2);
  scene.add(fill);
 
  const bounce = new THREE.PointLight(0x3a2412, 0.5, 8);
  bounce.position.set(0, -1.5, -1);
  scene.add(bounce);
 
  return { ambient, key, rim, fill, bounce };
}
 
export function createGroundShadow(scene) {
  const geo = new THREE.CircleGeometry(2.2, 48);
  const mat = new THREE.ShadowMaterial({ opacity: 0.28 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.7;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
 
export function fitCamera(camera, width, height) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}