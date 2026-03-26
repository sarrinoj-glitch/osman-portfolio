import * as THREE from 'three'

export function initGlobe(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return

  // ── Scene setup ───────────────────────────────────────────────────────────
  const W = container.clientWidth
  const H = container.clientHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H)
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
  camera.position.set(0, 0, 5.2)

  const ACCENT = new THREE.Color(0xe8191a)
  const WHITE  = new THREE.Color(0xffffff)

  // ── 1. Wireframe sphere ───────────────────────────────────────────────────
  const sphereGeo = new THREE.SphereGeometry(1.45, 36, 22)
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xe8191a,
    wireframe: true,
    transparent: true,
    opacity: 0.10,
  })
  const wireSphere = new THREE.Mesh(sphereGeo, wireMat)
  scene.add(wireSphere)

  // ── 2. Surface dots ───────────────────────────────────────────────────────
  const DOT_COUNT = 320
  const dotPositions = []
  const dotGeo = new THREE.BufferGeometry()
  const dotPos = new Float32Array(DOT_COUNT * 3)
  const dotColors = new Float32Array(DOT_COUNT * 3)

  for (let i = 0; i < DOT_COUNT; i++) {
    // Fibonacci sphere distribution for even coverage
    const phi   = Math.acos(1 - 2 * (i + 0.5) / DOT_COUNT)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    const R = 1.47
    const x = R * Math.sin(phi) * Math.cos(theta)
    const y = R * Math.cos(phi)
    const z = R * Math.sin(phi) * Math.sin(theta)
    dotPos[i * 3]     = x
    dotPos[i * 3 + 1] = y
    dotPos[i * 3 + 2] = z
    dotPositions.push(new THREE.Vector3(x, y, z))

    // Alternate white / red dots
    const c = i % 7 === 0 ? ACCENT : WHITE
    dotColors[i * 3]     = c.r
    dotColors[i * 3 + 1] = c.g
    dotColors[i * 3 + 2] = c.b
  }

  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
  dotGeo.setAttribute('color',    new THREE.BufferAttribute(dotColors, 3))
  const dotMat = new THREE.PointsMaterial({
    size: 0.028,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  })
  scene.add(new THREE.Points(dotGeo, dotMat))

  // ── 3. Connection arcs ────────────────────────────────────────────────────
  const ARC_COUNT = 28
  const arcGroup = new THREE.Group()
  scene.add(arcGroup)

  function makeArc(p1, p2, color, opacity) {
    const mid = p1.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(1.75)
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2)
    const pts = curve.getPoints(48)
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    return new THREE.Line(geo, mat)
  }

  // Pick random pairs from dots
  const used = new Set()
  let arcsCreated = 0
  while (arcsCreated < ARC_COUNT) {
    const a = Math.floor(Math.random() * DOT_COUNT)
    const b = Math.floor(Math.random() * DOT_COUNT)
    if (a === b) continue
    const key = [Math.min(a, b), Math.max(a, b)].join('-')
    if (used.has(key)) continue
    const dist = dotPositions[a].distanceTo(dotPositions[b])
    if (dist < 0.6 || dist > 2.4) continue
    used.add(key)
    const isRed = arcsCreated % 4 === 0
    arcGroup.add(makeArc(
      dotPositions[a], dotPositions[b],
      isRed ? 0xe8191a : 0xffffff,
      isRed ? 0.55 : 0.18
    ))
    arcsCreated++
  }

  // ── 4. Saturn rings ───────────────────────────────────────────────────────
  const ringGroup = new THREE.Group()
  ringGroup.rotation.x = Math.PI * 0.22
  scene.add(ringGroup)

  const RINGS = [
    { inner: 1.68, outer: 1.76, color: 0xe8191a, opacity: 0.50 },
    { inner: 1.86, outer: 1.90, color: 0xffffff, opacity: 0.13 },
    { inner: 2.00, outer: 2.07, color: 0xe8191a, opacity: 0.20 },
    { inner: 2.16, outer: 2.19, color: 0xffffff, opacity: 0.08 },
  ]

  RINGS.forEach(({ inner, outer, color, opacity }) => {
    const geo = new THREE.RingGeometry(inner, outer, 128)
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
    })
    ringGroup.add(new THREE.Mesh(geo, mat))
  })

  // ── 5. Subtle glow halo ───────────────────────────────────────────────────
  const glowGeo = new THREE.SphereGeometry(1.56, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xe8191a,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
  })
  scene.add(new THREE.Mesh(glowGeo, glowMat))

  // ── Mouse parallax ────────────────────────────────────────────────────────
  let targetRotX = 0, targetRotY = 0
  let currentRotX = 0, currentRotY = 0

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width  - 0.5
    const ny = (e.clientY - rect.top)  / rect.height - 0.5
    targetRotY =  nx * 0.6
    targetRotX = -ny * 0.3
  }
  window.addEventListener('mousemove', onMouseMove, { passive: true })

  // ── Resize ────────────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  ro.observe(container)

  // ── Animation loop ────────────────────────────────────────────────────────
  let frame
  function animate() {
    frame = requestAnimationFrame(animate)

    // Slow auto-rotation
    wireSphere.rotation.y += 0.0012
    arcGroup.rotation.y   += 0.0012
    dotGeo.attributes.position.needsUpdate = false // static dots, no update needed

    // Ring counter-rotation for depth
    ringGroup.rotation.z -= 0.0006

    // Smooth parallax
    currentRotX += (targetRotX - currentRotX) * 0.04
    currentRotY += (targetRotY - currentRotY) * 0.04

    wireSphere.rotation.x = currentRotX
    arcGroup.rotation.x   = currentRotX
    // Rings tilt stays fixed, just z-spin

    // Apply Y parallax to whole scene group
    scene.rotation.y = currentRotY

    renderer.render(scene, camera)
  }
  animate()

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    cancelAnimationFrame(frame)
    ro.disconnect()
    window.removeEventListener('mousemove', onMouseMove)
    renderer.dispose()
  }
}
