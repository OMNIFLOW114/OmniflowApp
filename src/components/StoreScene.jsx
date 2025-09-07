// components/StoreScene.jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

const StoreScene = ({ modelUrl }) => {
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <OrbitControls />
      <Environment preset="sunset" />

      {/* Placeholder for your 3D model */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="gold" />
      </mesh>
    </Canvas>
  );
};

export default StoreScene;
