'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Cursor() {
  const cursorRef = useRef(null);
  const trailRefs = useRef([]);
  const positions = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  // Google brand colors
  const googleColors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

  useEffect(() => {
    const cursor = cursorRef.current;
    const trails = trailRefs.current;

    if (!cursor || trails.length === 0) return;

    // Hide default cursor
    document.body.style.cursor = 'none';

    // Initialize positions array
    positions.current = Array(8).fill(null).map(() => ({ x: 0, y: 0 }));

    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const getTouchPos = (touchEvent) => {
      if (!touchEvent.touches || touchEvent.touches.length === 0) return null;
      const touch = touchEvent.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    };

    const onTouchStart = (e) => {
      const pos = getTouchPos(e);
      if (pos) mouseRef.current = pos;
    };

    const onTouchMove = (e) => {
      const pos = getTouchPos(e);
      if (pos) mouseRef.current = pos;
    };

    const onTouchEnd = () => {
      // Keep the last touch coordinate so animation continues smoothly.
    };

    const onPointerClick = (e) => {
      // Don't stop propagation - let normal clicks work

      const clickX = e.clientX;
      const clickY = e.clientY;

      // Create Holi color particles
      const particleCount = 8;
      const particles = [];

      for (let i = 0; i < particleCount; i++) {
        // Create particle element
        const particle = document.createElement('div');
        particle.className = 'fixed pointer-events-none z-30 rounded-full';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.left = clickX + 'px';
        particle.style.top = clickY + 'px';
        particle.style.backgroundColor = googleColors[Math.floor(Math.random() * googleColors.length)];
        document.body.appendChild(particle);

        // Random direction and distance (reduced)
        const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const distance = 50 + Math.random() * 80;
        const targetX = clickX + Math.cos(angle) * distance;
        const targetY = clickY + Math.sin(angle) * distance;

        // Animate particle
        gsap.fromTo(particle,
          {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1
          },
          {
            x: targetX - clickX,
            y: targetY - clickY,
            scale: 0.2 + Math.random() * 0.5,
            opacity: 0,
            duration: 0.8 + Math.random() * 0.6,
            ease: 'power2.out',
            delay: Math.random() * 0.15,
            onComplete: () => {
              if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
              }
            }
          }
        );

        particles.push(particle);
      }

      // Also trigger subtle cursor color change
      const cursorColor = googleColors[Math.floor(Math.random() * googleColors.length)];
      setTimeout(() => {
        gsap.to(cursor, {
          backgroundColor: cursorColor,
          duration: 0.2,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          overwrite: 'auto'
        });
      }, 16);

      // Remove trail blast - just subtle color ripple
      trails.forEach((trail, index) => {
        const rippleColor = googleColors[Math.floor(Math.random() * googleColors.length)];
        setTimeout(() => {
          gsap.to(trail, {
            backgroundColor: rippleColor,
            duration: 0.15,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
            overwrite: 'auto'
          });
        }, 16 + index * 20);
      });
    };

    // Venom-like flowing animation
    const animateVenom = () => {
      // Smoothly approach pointer movement (native smooth, not ultra soft)
      const baseSmoothness = 0.26;
      positions.current[0].x += (mouseRef.current.x - positions.current[0].x) * baseSmoothness;
      positions.current[0].y += (mouseRef.current.y - positions.current[0].y) * baseSmoothness;

      for (let i = 1; i < positions.current.length; i++) {
        const prev = positions.current[i - 1];
        const current = positions.current[i];
        const dx = prev.x - current.x;
        const dy = prev.y - current.y;

        // Add organic movement with moderate sine waves
        const time = Date.now() * 0.0017;
        const wave1 = Math.sin(time + i * 0.8) * (1.2 - i * 0.15);
        const wave2 = Math.cos(time * 1.05 + i * 0.5) * (1.0 - i * 0.1);

        current.x += dx * 0.22 + wave1;
        current.y += dy * 0.22 + wave2;
      }

      // Animate cursor elements with morphing effects and Google colors
      const cursorTime = Date.now() * 0.001;
      const cursorColorIndex = Math.floor(cursorTime * 1.2 % googleColors.length);
      const cursorNextColorIndex = (cursorColorIndex + 1) % googleColors.length;
      const cursorColorProgress = (cursorTime * 1.2 % 1);

      const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const cursorEasedProgress = easeInOut(cursorColorProgress);

      const interpolateColor = (color1, color2, factor) => {
        const c1 = color1.match(/\w\w/g).map(x => parseInt(x, 16));
        const c2 = color2.match(/\w\w/g).map(x => parseInt(x, 16));
        const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * factor));
        return `#${result.map(x => x.toString(16).padStart(2, '0')).join('')}`;
      };

      const cursorFlowingColor = interpolateColor(
        googleColors[cursorColorIndex],
        googleColors[cursorNextColorIndex],
        cursorEasedProgress
      );

      // Use gsap.to() with very short duration instead of gsap.set() to avoid conflicts
      gsap.to(cursor, {
        x: positions.current[0].x,
        y: positions.current[0].y,
        rotation: Math.atan2(
          positions.current[1].y - positions.current[0].y,
          positions.current[1].x - positions.current[0].x
        ) * (180 / Math.PI),
        scaleX: 1 + Math.sin(Date.now() * 0.003) * 0.15,
        scaleY: 1 + Math.cos(Date.now() * 0.003 + 1) * 0.15,
        backgroundColor: cursorFlowingColor,
        duration: 0.016, // ~60fps
        ease: 'none',
        overwrite: false // Don't overwrite click animations
      });

      // Animate trail segments with organic morphing and Google colors
      trails.forEach((trail, index) => {
        const pos = positions.current[index + 1];
        if (pos) {
          const time = Date.now() * 0.001;
          const morphScale = 1 - (index * 0.12) + Math.sin(time + index) * 0.2;
          const morphRotation = Math.sin(time * 0.5 + index * 0.3) * 20;

          // Enhanced color flowing effect with smoother transitions
          const colorIndex = Math.floor((time * 1.2 + index * 0.6) % googleColors.length);
          const nextColorIndex = (colorIndex + 1) % googleColors.length;
          const colorProgress = ((time * 1.2 + index * 0.6) % 1);

          // Create smooth color interpolation with easing
          const currentColor = googleColors[colorIndex];
          const nextColor = googleColors[nextColorIndex];

          // Enhanced color interpolation with smooth easing
          const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const easedProgress = easeInOut(colorProgress);

          const interpolateColor = (color1, color2, factor) => {
            const c1 = color1.match(/\w\w/g).map(x => parseInt(x, 16));
            const c2 = color2.match(/\w\w/g).map(x => parseInt(x, 16));
            const result = c1.map((c, i) => Math.round(c + (c2[i] - c) * factor));
            return `#${result.map(x => x.toString(16).padStart(2, '0')).join('')}`;
          };

          const flowingColor = interpolateColor(currentColor, nextColor, easedProgress);

          gsap.to(trail, {
            x: pos.x,
            y: pos.y,
            scale: Math.max(0.1, morphScale),
            rotation: morphRotation,
            opacity: Math.max(0.1, 1 - (index * 0.15) + Math.sin(time + index * 0.5) * 0.1),
            backgroundColor: flowingColor,
            duration: 0.016, // ~60fps
            ease: 'none',
            overwrite: false // Don't overwrite click animations
          });
        }
      });

      animationRef.current = requestAnimationFrame(animateVenom);
    };

    animateVenom();

    const onMouseEnter = () => {
      gsap.to(trails, {
        scale: 1.25,
        duration: 0.3,
        ease: 'power2.out',
        stagger: 0.05
      });
      gsap.to(cursor, {
        scale: 1.4,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const onMouseLeave = () => {
      gsap.to(trails, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
        stagger: 0.05
      });
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const onLinkEnter = () => {
      gsap.to(cursor, {
        scale: 2.2,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(trails, {
        scale: 1.8,
        duration: 0.3,
        ease: 'power2.out',
        stagger: 0.02
      });
    };

    const onLinkLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(trails, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
        stagger: 0.02
      });
    };

    // Add event listeners (mouse + touch for mobile)
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('click', onPointerClick, true); // Use capture phase

    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('button, [role="button"]');
    const linkElements = document.querySelectorAll('a');

    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter);
      el.addEventListener('mouseleave', onMouseLeave);
    });

    linkElements.forEach(el => {
      el.addEventListener('mouseenter', onLinkEnter);
      el.addEventListener('mouseleave', onLinkLeave);
    });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('click', onPointerClick, true); // Use capture phase
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      });
      linkElements.forEach(el => {
        el.removeEventListener('mouseenter', onLinkEnter);
        el.removeEventListener('mouseleave', onLinkLeave);
      });
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <>
      {/* Main cursor (Venom head - now with Google colors) */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-4 h-4 rounded-full pointer-events-none z-50"
        style={{ transform: 'translate(-50%, -50%)' }}
      />

      {/* Venom trail segments with Google colors */}
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          ref={(el) => (trailRefs.current[i] = el)}
          className="fixed top-0 left-0 w-3 h-3 rounded-full pointer-events-none z-40"
          style={{
            transform: 'translate(-50%, -50%)',
            opacity: 0.8 - (i * 0.1),
            backgroundColor: googleColors[i % googleColors.length]
          }}
        />
      ))}
    </>
  );
}