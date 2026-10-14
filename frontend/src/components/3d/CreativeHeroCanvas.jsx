import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const CreativeHeroCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for mouse parallax rotation
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // 1. Central Creative Wireframe Monogram / Polyhedron
    const coreGeometry = new THREE.IcosahedronGeometry(7, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x9333ea, // Purple
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    masterGroup.add(coreMesh);

    // Inner glowing sphere
    const innerGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const innerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc084fc,
      emissive: 0x581c87,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 1.2,
      transparent: true,
      opacity: 0.7,
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    masterGroup.add(innerMesh);

    // 2. Torus Orbital Rings (representing multidimensional domains)
    const ringGeometry = new THREE.TorusGeometry(11, 0.08, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan
      transparent: true,
      opacity: 0.45,
    });
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 3;
    masterGroup.add(ring1);

    const ring2 = ring1.clone();
    ring2.material = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber
      transparent: true,
      opacity: 0.35,
    });
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    masterGroup.add(ring2);

    // 3. Floating Creative Particle Constellation
    const particleCount = window.innerWidth < 768 ? 120 : 320;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0x38bdf8), // Sky
      new THREE.Color(0xf472b6), // Pink
      new THREE.Color(0xfbbf24), // Gold
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 10 + Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    // Circle texture for smooth glow dots
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    masterGroup.add(particles);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 3, 50);
    purpleLight.position.set(12, 12, 10);
    scene.add(purpleLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3, 50);
    cyanLight.position.set(-14, -10, 8);
    scene.add(cyanLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / container.clientWidth;
      const y = (event.clientY - rect.top) / container.clientHeight;
      mouseX = (x - 0.5) * 2;
      mouseY = (y - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Continuous organic rotation
        coreMesh.rotation.x = elapsedTime * 0.15;
        coreMesh.rotation.y = elapsedTime * 0.2;

        innerMesh.rotation.y = -elapsedTime * 0.25;

        ring1.rotation.z = elapsedTime * 0.1;
        ring2.rotation.z = -elapsedTime * 0.12;

        particles.rotation.y = elapsedTime * 0.04;
        particles.rotation.x = elapsedTime * 0.02;

        // Smooth mouse damping
        targetX += (mouseX * 0.5 - targetX) * 0.05;
        targetY += (mouseY * 0.5 - targetY) * 0.05;

        masterGroup.rotation.y = targetX;
        masterGroup.rotation.x = -targetY;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
};

export default CreativeHeroCanvas;
