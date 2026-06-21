"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Lazy, self-contained Three.js ambient backdrop: a slowly drifting field of
// brand-green points behind a carousel. Purely decorative — never mounted under
// prefers-reduced-motion, paused offscreen via IntersectionObserver, and fully
// disposed on unmount. Mount via next/dynamic with { ssr: false }.
export default function SectionBackdrop({ tint = "#22c55e" }: { tint?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 60;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const COUNT = 300;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 170;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 110;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(tint),
      size: 0.95,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      points.rotation.y = t * 0.04;
      points.rotation.x = Math.sin(t * 0.1) * 0.05;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 }
    );
    io.observe(mount);

    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      geom.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, [tint]);

  return <div ref={mountRef} aria-hidden className="absolute inset-0" />;
}
