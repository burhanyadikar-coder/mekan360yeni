import React, { useEffect, useRef } from 'react';
import 'pannellum/build/pannellum.css';
import pannellum from 'pannellum/build/pannellum.js';

export default function PanoramaViewer({ src, height = 360 }) {
  const containerRef = useRef(null);
  const idRef = useRef('panorama-' + Math.random().toString(36).slice(2, 9));

  useEffect(() => {
    if (!src || !containerRef.current) return;
    const cfg = {
      type: 'equirectangular',
      panorama: src,
      autoLoad: true,
      showControls: true,
      mouseZoom: true,
      draggable: true
    };
    // destroy existing viewer if present
    try {
      if (window._pannellum && window._pannellum[idRef.current]) {
        window._pannellum[idRef.current].destroy();
        delete window._pannellum[idRef.current];
      }
    } catch (e) { /* ignore */ }

    const viewer = pannellum.viewer(idRef.current, cfg);
    window._pannellum = window._pannellum || {};
    window._pannellum[idRef.current] = viewer;

    return () => {
      try { viewer.destroy(); delete window._pannellum[idRef.current]; } catch (e) {}
    };
  }, [src]);

  return (
    <div id={idRef.current} ref={containerRef} style={{ width: '100%', height: `${height}px` }} />
  );
}
