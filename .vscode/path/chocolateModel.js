import * as THREE from 'three';
 
// Builds a procedural luxury chocolate bar + wrapper group.
// Returns { group, wrapperParts, barMesh, updateUnwrap(t) } where t is 0 (wrapped) -> 1 (fully unwrapped)
 
const COLOR_THEMES = {
  dark: { wrapper: 0x1c1008, foil: 0xb98a3f, choc: 0x2a160c, chocSheen: 0x6b3a1e },
  gold: { wrapper: 0x3a2412, foil: 0xe6c07a, choc: 0x4a2c17, chocSheen: 0x9c6a3a },
  ruby: { wrapper: 0x3a1420, foil: 0xd98fa0, choc: 0x5a2030, chocSheen: 0xb85a72 }
};
 
function makeChocolateBarGeometry(width, height, depth, squares = 4) {
  // A rounded rectangular bar with grid grooves suggested via subtle bevel segments
  const geo = new THREE.BoxGeometry(width, height, depth, squares * 4, 2, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Slight rounding on top face edges for realism
    if (v.y > 0) {
      const edgeFactor = Math.min(1, (Math.abs(v.x) / (width / 2)) * 1.0);
      v.y += edgeFactor * 0.0;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
 
function makeGrooveLines(width, height, depth, squares, group, material) {
  // Thin inset lines across the top to suggest chocolate squares
  const lineMat = material || new THREE.MeshStandardMaterial({ color: 0x0a0603, roughness: 0.6 });
  const segW = width / squares;
  for (let i = 1; i < squares; i++) {
    const x = -width / 2 + segW * i;
    const grooveGeo = new THREE.BoxGeometry(0.006, 0.004, depth * 0.94);
    const groove = new THREE.Mesh(grooveGeo, lineMat);
    groove.position.set(x, height / 2 + 0.001, 0);
    group.add(groove);
  }
  const rows = 2;
  const segD = depth / rows;
  for (let i = 1; i < rows; i++) {
    const z = -depth / 2 + segD * i;
    const grooveGeo = new THREE.BoxGeometry(width * 0.96, 0.004, 0.006);
    const groove = new THREE.Mesh(grooveGeo, lineMat);
    groove.position.set(0, height / 2 + 0.001, z);
    group.add(groove);
  }
}
 
export function createChocolateProduct(theme = 'dark') {
  const colors = COLOR_THEMES[theme] || COLOR_THEMES.dark;
  const group = new THREE.Group();
 
  const barW = 1.55, barH = 0.26, barD = 0.95;
 
  // ===== Chocolate bar =====
  const chocMat = new THREE.MeshPhysicalMaterial({
    color: colors.choc,
    roughness: 0.32,
    metalness: 0.0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
    sheen: 1.0,
    sheenColor: new THREE.Color(colors.chocSheen),
    sheenRoughness: 0.6,
    reflectivity: 0.4
  });
  const barGeo = makeChocolateBarGeometry(barW, barH, barD, 4);
  const barMesh = new THREE.Mesh(barGeo, chocMat);
  barMesh.castShadow = true;
  barMesh.receiveShadow = true;
  barMesh.position.y = 0;
  group.add(barMesh);
  makeGrooveLines(barW, barH, barD, 4, group, new THREE.MeshStandardMaterial({ color: 0x0a0603, roughness: 0.7 }));
 
  // ===== Wrapper: modeled as 4 foldable "flap" panels around the bar + inner foil layer =====
  const wrapperGroup = new THREE.Group();
  group.add(wrapperGroup);
 
  const wrapMat = new THREE.MeshPhysicalMaterial({
    color: colors.wrapper,
    roughness: 0.38,
    metalness: 0.08,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide
  });
 
  const foilMat = new THREE.MeshPhysicalMaterial({
    color: colors.foil,
    roughness: 0.22,
    metalness: 0.85,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide
  });
 
  const pad = 0.06;
  const wrapW = barW + pad * 2;
  const wrapH = barH + pad * 1.4;
  const wrapD = barD + pad * 2;
 
  // Inner foil sleeve (slightly larger than bar, wraps fully, thin)
  const foilGeo = new THREE.BoxGeometry(wrapW * 0.98, wrapH * 0.9, wrapD * 0.98);
  const foilMesh = new THREE.Mesh(foilGeo, foilMat);
  foilMesh.castShadow = true;
  wrapperGroup.add(foilMesh);
 
  // Outer paper wrapper split into 4 flaps that fold open (top, bottom, left, right)
  const flapThickness = 0.012;
  const flaps = [];
 
  function makeFlap(w, h, d, pivotOffset, axis) {
    const geo = new THREE.BoxGeometry(w, h, d);
    // shift geometry so pivot edge is at local origin
    geo.translate(pivotOffset.x, pivotOffset.y, pivotOffset.z);
    const mesh = new THREE.Mesh(geo, wrapMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const pivot = new THREE.Group();
    pivot.add(mesh);
    pivot.userData.axis = axis;
    return pivot;
  }
 
  // Top flap folds open upward (hinge at back edge along Z)
  const topFlap = makeFlap(wrapW * 1.02, flapThickness, wrapD * 0.55, new THREE.Vector3(0, 0, wrapD * 0.55 / 2), 'x');
  topFlap.position.set(0, wrapH / 2, -wrapD * 0.2);
  wrapperGroup.add(topFlap);
  flaps.push({ pivot: topFlap, openAngle: -Math.PI * 0.95, delay: 0.0 });
 
  // Bottom flap folds open downward
  const bottomFlap = makeFlap(wrapW * 1.02, flapThickness, wrapD * 0.55, new THREE.Vector3(0, 0, wrapD * 0.55 / 2), 'x');
  bottomFlap.position.set(0, -wrapH / 2, -wrapD * 0.2);
  wrapperGroup.add(bottomFlap);
  flaps.push({ pivot: bottomFlap, openAngle: Math.PI * 0.95, delay: 0.08 });
 
  // Left end flap folds open to the side
  const leftFlap = makeFlap(flapThickness, wrapH * 1.05, wrapD * 1.05, new THREE.Vector3(0, 0, 0), 'z');
  leftFlap.position.set(-wrapW / 2, 0, 0);
  wrapperGroup.add(leftFlap);
  flaps.push({ pivot: leftFlap, openAngle: -Math.PI * 0.85, delay: 0.16 });
 
  // Right end flap folds open to the side
  const rightFlap = makeFlap(flapThickness, wrapH * 1.05, wrapD * 1.05, new THREE.Vector3(0, 0, 0), 'z');
  rightFlap.position.set(wrapW / 2, 0, 0);
  wrapperGroup.add(rightFlap);
  flaps.push({ pivot: rightFlap, openAngle: Math.PI * 0.85, delay: 0.24 });
 
  // Gold foil seal / ribbon band across the middle
  const bandGeo = new THREE.BoxGeometry(wrapW * 1.03, wrapH * 1.08, 0.14);
  const bandMesh = new THREE.Mesh(bandGeo, foilMat);
  bandMesh.position.set(0, 0, 0);
  wrapperGroup.add(bandMesh);
  flaps.push({ pivot: null, mesh: bandMesh, isBand: true });
 
  // Brand emblem (small disc) on band
  const emblemGeo = new THREE.CircleGeometry(0.09, 32);
  const emblemMat = new THREE.MeshPhysicalMaterial({ color: 0x1c1006, roughness: 0.3, metalness: 0.6 });
  const emblem = new THREE.Mesh(emblemGeo, emblemMat);
  emblem.position.set(0, 0, wrapD / 2 + 0.075);
  wrapperGroup.add(emblem);
  flaps.push({ pivot: null, mesh: emblem, isBand: true });
 
  group.userData.barW = barW;
  group.userData.barH = barH;
  group.userData.barD = barD;
 
  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
 
  function updateUnwrap(t) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    // foil + band fade/shrink out as t approaches 1
    const foilFade = THREE.MathUtils.clamp((t - 0.55) / 0.35, 0, 1);
    const foilScale = 1 - easeInOutCubic(foilFade);
    foilMesh.scale.setScalar(Math.max(0.001, foilScale));
    foilMesh.visible = foilScale > 0.02;
    foilMat.opacity = foilScale;
    foilMat.transparent = true;
 
    flaps.forEach((f) => {
      if (f.isBand) {
        const bandFade = THREE.MathUtils.clamp((t - 0.05) / 0.3, 0, 1);
        const s = 1 - easeInOutCubic(bandFade);
        f.mesh.scale.set(s, 1, s);
        f.mesh.visible = s > 0.02;
        return;
      }
      const local = THREE.MathUtils.clamp((t - f.delay) / 0.5, 0, 1);
      const eased = easeInOutCubic(local);
      if (f.pivot.userData.axis === 'x') {
        f.pivot.rotation.x = eased * f.openAngle;
      } else {
        f.pivot.rotation.z = eased * f.openAngle;
      }
      // slight outward drift for realism
      const drift = eased * 0.15;
      f.pivot.position.x += 0; // keep base position stable; visual driven by rotation
      f.pivot.visible = true;
    });
 
    // fade whole wrapper group out near the very end so only chocolate remains
    const groupFade = THREE.MathUtils.clamp((t - 0.85) / 0.15, 0, 1);
    wrapperGroup.visible = groupFade < 0.999;
    wrapperGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.material.transparent = true;
        obj.material.opacity = 1 - easeInOutCubic(groupFade);
      }
    });
  }
 
  updateUnwrap(0);
 
  return { group, barMesh, wrapperGroup, updateUnwrap };
}