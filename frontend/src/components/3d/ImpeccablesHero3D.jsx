import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import installationArtwork from '../../assets/hero-3d-installation.jpg';

export const ImpeccablesHero3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050507, 0);
    container.appendChild(renderer.domElement);

    const artworkPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    artworkPlane.position.z = -3;
    scene.add(artworkPlane);

    let artworkTexture;
    let artworkAspect = 1.5;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(installationArtwork, (texture) => {
      if (!container.isConnected) {
        texture.dispose();
        return;
      }
      artworkTexture = texture;
      artworkTexture.colorSpace = THREE.SRGBColorSpace;
      artworkAspect = texture.image.width / texture.image.height;
      artworkPlane.material.map = texture;
      artworkPlane.material.needsUpdate = true;
      resizeScene();
    });

    // A soft, additive particle layer sits in front of the artwork to create depth.
    const particleCount = window.innerWidth < 768 ? 70 : 140;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 10;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePositions[index * 3 + 2] = 0.8 + Math.random() * 4;
      particleSpeeds[index] = 0.002 + Math.random() * 0.006;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleTextureCanvas = document.createElement('canvas');
    particleTextureCanvas.width = 32;
    particleTextureCanvas.height = 32;
    const context = particleTextureCanvas.getContext('2d');
    const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(255,210,210,1)');
    glow.addColorStop(0.25, 'rgba(255,50,70,0.8)');
    glow.addColorStop(1, 'rgba(255,20,45,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(particleTextureCanvas);
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff334b,
      size: 0.16,
      map: particleTexture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // A few small metallic fragments catch the light at different depths.
    const shardMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1114,
      metalness: 0.88,
      roughness: 0.24,
      emissive: 0x31040a,
      emissiveIntensity: 0.8,
    });
    const shardGeometry = new THREE.IcosahedronGeometry(0.16, 0);
    const shards = Array.from({ length: 9 }, (_, index) => {
      const shard = new THREE.Mesh(shardGeometry, shardMaterial);
      const side = index % 2 === 0 ? -1 : 1;
      shard.position.set(side * (2.2 + Math.random() * 2.2), (Math.random() - 0.5) * 3.6, 1 + Math.random() * 3);
      shard.scale.setScalar(0.35 + Math.random() * 1.1);
      shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      scene.add(shard);
      return { mesh: shard, speed: 0.001 + Math.random() * 0.003, phase: Math.random() * Math.PI * 2 };
    });

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const redRimLight = new THREE.PointLight(0xff1738, 2.8, 18);
    redRimLight.position.set(-3, 1, 4);
    scene.add(redRimLight);
    const whiteLight = new THREE.PointLight(0xffd9dd, 1.5, 16);
    whiteLight.position.set(2, 3, 5);
    scene.add(whiteLight);

    let width = 1;
    let height = 1;
    const resizeScene = () => {
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      const distance = camera.position.z - artworkPlane.position.z;
      const planeHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
      const planeWidth = planeHeight * camera.aspect;
      // Cover the viewport without stretching the artwork, cropping its edges as needed.
      const planeAspect = planeWidth / planeHeight;
      if (artworkAspect > planeAspect) {
        const visibleWidth = planeAspect / artworkAspect;
        artworkTexture?.repeat.set(visibleWidth, 1);
        artworkTexture?.offset.set((1 - visibleWidth) / 2, 0);
        artworkPlane.scale.set(planeWidth, planeHeight, 1);
      } else {
        const visibleHeight = artworkAspect / planeAspect;
        artworkTexture?.repeat.set(1, visibleHeight);
        artworkTexture?.offset.set(0, (1 - visibleHeight) / 2);
        artworkPlane.scale.set(planeWidth, planeHeight, 1);
      }
    };

    const pointer = new THREE.Vector2(0, 0);
    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onPointerLeave = () => pointer.set(0, 0);
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(container);
    resizeScene();

    const animationStartedAt = performance.now();
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = (performance.now() - animationStartedAt) / 1000;
      camera.position.x += (pointer.x * 0.22 - camera.position.x) * 0.025;
      camera.position.y += (-pointer.y * 0.14 - camera.position.y) * 0.025;
      camera.lookAt(0, 0, -1.5);

      const positions = particleGeometry.attributes.position.array;
      for (let index = 0; index < particleCount; index += 1) {
        positions[index * 3 + 1] += particleSpeeds[index];
        if (positions[index * 3 + 1] > 3.5) positions[index * 3 + 1] = -3.5;
      }
      particleGeometry.attributes.position.needsUpdate = true;
      particles.rotation.z = Math.sin(time * 0.12) * 0.025;

      shards.forEach(({ mesh, speed, phase }) => {
        mesh.rotation.x += speed;
        mesh.rotation.y += speed * 1.3;
        mesh.position.y += Math.sin(time * 0.7 + phase) * 0.0008;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      artworkTexture?.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative h-full min-h-[480px] w-full overflow-hidden"
      aria-label="Interactive 3D view of The Impeccables installation"
      role="img"
    />
  );
};

export default ImpeccablesHero3D;
