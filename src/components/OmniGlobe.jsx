import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

const OmniGlobe = () => {
  const globeRef = useRef();
  const textMeshRef = useRef();
  const animationFrameId = useRef();
  const [font, setFont] = useState(null);

  // Load font once on mount
  useEffect(() => {
    const loader = new FontLoader();
    loader.load("/fonts/helvetiker_bold.typeface.json", (loadedFont) => {
      setFont(loadedFont);
    });
  }, []);

  useEffect(() => {
    if (font && globeRef.current) {
      const scene = globeRef.current.scene();

      // Remove existing text mesh if any (cleanup before adding new)
      if (textMeshRef.current) {
        scene.remove(textMeshRef.current);
        textMeshRef.current.geometry.dispose();
        textMeshRef.current.material.dispose();
        textMeshRef.current = null;
      }

      // Create text geometry and material
      const textGeometry = new TextGeometry("OmniMarket", {
        font: font,
        size: 1,
        height: 0.2,
      });

      const textMaterial = new THREE.MeshBasicMaterial({
        color: "#00ffff",
        transparent: true,
        opacity: 0.8,
      });

      // Create mesh and position it
      const mesh = new THREE.Mesh(textGeometry, textMaterial);
      mesh.position.set(0, -5, 0);

      // Save mesh ref for cleanup & animation
      textMeshRef.current = mesh;

      // Add mesh to scene
      scene.add(mesh);

      // Animation loop function
      const animate = () => {
        if (textMeshRef.current) {
          textMeshRef.current.rotation.y += 0.005;
          animationFrameId.current = requestAnimationFrame(animate);
        }
      };
      animate();

      // Cleanup function to run on unmount or font change
      return () => {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
        if (textMeshRef.current) {
          scene.remove(textMeshRef.current);
          textMeshRef.current.geometry.dispose();
          textMeshRef.current.material.dispose();
          textMeshRef.current = null;
        }
      };
    }
  }, [font]);

  return (
    <div className="w-full h-[500px] md:h-[600px] xl:h-[700px] 2xl:h-[800px]">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundColor="rgba(0,0,0,0)"
        rendererConfig={{ antialias: true }}
        enableZoom={false}
        enablePointerInteraction={false}
        showGlobe
        animateIn
      />
    </div>
  );
};

export default OmniGlobe;
