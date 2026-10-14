import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const CircularPortal3D = ({ className = 'w-full h-full' }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const portalGroup = new THREE.Group();
    scene.add(portalGroup);

    // Outer Neon Ring
    const outerRingGeo = new THREE.TorusGeometry(1.8, 0.03, 16, 80);
    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xff1e38 });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    portalGroup.add(outerRing);

    // Inner Neon Ring
    const innerRingGeo = new THREE.TorusGeometry(1.5, 0.02, 16, 80);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xff4d63 });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    portalGroup.add(innerRing);

    // Core Portal Disk
    const diskGeo = new THREE.CircleGeometry(1.48, 64);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0x140407,
      transparent: true,
      opacity: 0.85,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    portalGroup.add(disk);

    // Silhouette Figure in Portal
    const figureGroup = new THREE.Group();
    figureGroup.position.set(0, -0.7, 0.05);
    const bodyGeo = new THREE.ConeGeometry(0.18, 0.8, 16);
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
    const body = new THREE.Mesh(bodyGeo, blackMat);
    const headGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const head = new THREE.Mesh(headGeo, blackMat);
    head.position.y = 0.48;
    figureGroup.add(body);
    figureGroup.add(head);
    portalGroup.add(figureGroup);

    // Swirling Particles
    const pCount = 90;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 1.5;
      pPos[i * 3] = Math.cos(angle) * r;
      pPos[i * 3 + 1] = Math.sin(angle) * r;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xff2a4b,
      size: 0.03,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    portalGroup.add(particles);

    // Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      outerRing.rotation.z = t * 0.2;
      innerRing.rotation.z = -t * 0.3;
      particles.rotation.z = t * 0.15;

      const scale = 1 + Math.sin(t * 2) * 0.02;
      outerRing.scale.set(scale, scale, 1);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className={className} />;
};

export default CircularPortal3D;
