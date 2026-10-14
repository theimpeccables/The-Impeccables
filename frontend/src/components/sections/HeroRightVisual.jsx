import React, { useRef, useEffect } from 'react';
import heroImage from '../../assets/hero-3d-installation.jpg';

export const HeroRightVisual = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Rising particle embers overlay on top of the image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationId;
    const particles = [];
    const numParticles = 55;

    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 600),
        y: Math.random() * (canvas.height || 600),
        size: Math.random() * 2.5 + 0.8,
        speedY: Math.random() * 0.9 + 0.3,
        speedX: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < 0) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 40, 60, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff1e38';
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
    >
      {/* Main Hero Image — full bleed, no border/box */}
      <img
        src={heroImage}
        alt="The Impeccables 3D Circular Installation"
        className="w-full h-full object-cover object-center"
        loading="eager"
      />

      {/* Gradient fade on left edge for text blend */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#060608] via-[#060608]/60 to-transparent" />

      {/* Gradient fade on top edge */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#060608]/80 via-transparent to-[#060608]/40" />

      {/* Floating Firefly Embers Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 w-full h-full"
      />

      {/* Subtle bottom vignette */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060608] to-transparent" />
    </div>
  );
};

export default HeroRightVisual;
