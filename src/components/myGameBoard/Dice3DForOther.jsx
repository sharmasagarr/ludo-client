import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';

function Dice({ isRolling, finalFace, onRollComplete, position }) {
  const meshRef = useRef(null);
  const animationRef = useRef({
    isAnimating: false,
    start_time: 0,
    startPosZ: 0,
    popDistance: 0,
    duration: 700,
    spinAxis: new THREE.Vector3(1, 1, 1).normalize(),
    initialSpinSpeed: 60,
    targetQuat: new THREE.Quaternion(),
    finalQuat: new THREE.Quaternion(),
    face: null,
  });

  const geometry = useMemo(() => new RoundedBoxGeometry(1.5, 1.5, 1.5, 6, 0.25), []);

  const materialIndexForNumber = useMemo(() => ({
    1: 4, // front (+Z)
    2: 2, // top (+Y)
    3: 0, // right (+X)
    4: 1, // left (-X)
    5: 3, // bottom (-Y)
    6: 5, // back (-Z)
  }), []);

  const materials = useMemo(() => {
    const dots = {
      1: [[64, 64]],
      2: [[32, 32], [96, 96]],
      3: [[32, 32], [64, 64], [96, 96]],
      4: [[32, 32], [96, 32], [32, 96], [96, 96]],
      5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
      6: [[32, 32], [96, 32], [32, 64], [96, 64], [32, 96], [96, 96]],
    };

    const mats = new Array(6);

    const diceColors = {
      bottomLeft: {
        diceColor: '#1560bd',
        dotColor: 'white',
      },
      topLeft: {
        diceColor: '#d2232a',
        dotColor: 'white',
      },
      topRight: {
        diceColor: '#28a745',
        dotColor: 'white',
      },
      bottomRight: {
        diceColor: '#ffcc00',
        dotColor: 'black',
      }
    };
    const diceColor = diceColors[position]?.diceColor || 'white';
    const dotColor = diceColors[position]?.dotColor || 'black';

    for (let num = 1; num <= 6; num++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = diceColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = dotColor;
      dots[num].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      });

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshStandardMaterial({ map: texture });
      const slot = materialIndexForNumber[num];
      mats[slot] = mat;
    }

    for (let i = 0; i < 6; i++) {
      if (!mats[i]) mats[i] = new THREE.MeshStandardMaterial({ color: diceColor });
    }

    return mats;
  }, [materialIndexForNumber]);

    // Get quaternion for face facing camera
    const getQuaternionForFace = useCallback((faceNumber) => {
        const e = new THREE.Euler(0, 0, 0, 'XYZ');

        switch (faceNumber) {
            case 1: // front (+Z) - no rotation needed
                e.set(0, 0, 0);
                break;
            case 2: // top (+Y) - rotate down
                e.set(Math.PI / 2, 0, 0);
                break;
            case 3: // right (-X) - rotate left
                e.set(0, -Math.PI / 2, 0);
                break;
            case 4: // left (+X) - rotate right
                e.set(0, Math.PI / 2, 0);
                break;
            case 5: // bottom (-Y) - rotate up
                e.set(-Math.PI / 2, 0, 0);
                break;
            case 6: // back (-Z) - rotate 180
                e.set(0, Math.PI, 0);
                break;
            default:
                e.set(0, 0, 0);
        }

        return new THREE.Quaternion().setFromEuler(e);
    }, []);

  const startRoll = useCallback((face) => {
    if (!meshRef.current) return;
    const anim = animationRef.current;
    anim.isAnimating = true;
    anim.start_time = performance.now();
    anim.startPosZ = meshRef.current.position.z;
    anim.popDistance = 0;
    anim.duration = 700;

    anim.spinAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    anim.initialSpinSpeed = 50 + Math.random() * 30;

    anim.finalQuat = getQuaternionForFace(face);
    anim.face = face;

    const extraRot = 3 + Math.floor(Math.random() * 3);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(
      anim.spinAxis,
      extraRot * Math.PI * 2
    );
    anim.targetQuat = anim.finalQuat.clone().multiply(spinQuat);
  }, [getQuaternionForFace]);

  // Start rolling when isRolling becomes true
  useEffect(() => {
    if (isRolling && finalFace && !animationRef.current.isAnimating) {
      startRoll(finalFace);
    }
  }, [isRolling, finalFace, startRoll]);

  // Snap to finalFace immediately when not animating
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !finalFace || animationRef.current.isAnimating) return;

    const q = getQuaternionForFace(finalFace);
    mesh.quaternion.copy(q);
    mesh.position.z = 0;
  }, [finalFace, getQuaternionForFace]);

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  useFrame((_state, delta) => {
    const anim = animationRef.current;
    const mesh = meshRef.current;
    if (!anim.isAnimating || !mesh) return;

    const elapsed = performance.now() - anim.start_time;
    const t = Math.min(elapsed / anim.duration, 1);

    const pop = Math.sin(t * Math.PI);
    mesh.position.z = anim.startPosZ - pop * anim.popDistance;

    const spinT = Math.max(0, 1 - t);
    const currentSpinSpeed = anim.initialSpinSpeed * spinT * spinT * spinT;
    const angle = currentSpinSpeed * delta;
    const q = new THREE.Quaternion().setFromAxisAngle(anim.spinAxis, angle);
    mesh.quaternion.multiplyQuaternions(q, mesh.quaternion);

    if (t > 0.2) {
      const blendT = (t - 0.2) / 0.8;
      const eased = easeOutQuart(blendT);
      mesh.quaternion.slerp(anim.targetQuat, eased * 0.12);
    }

    if (t >= 1) {
      mesh.quaternion.slerp(anim.finalQuat, 0.3);

      if (mesh.quaternion.angleTo(anim.finalQuat) < 0.01) {
        mesh.quaternion.copy(anim.finalQuat);
        mesh.position.z = anim.startPosZ;
        anim.isAnimating = false;

        if (typeof onRollComplete === 'function') {
          onRollComplete(anim.face);
        }
      }
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={materials} castShadow receiveShadow />;
}

// View-only component that animates on diceValue change
const DiceComponentForOthers = ({ diceValue = null, size = 30, position, isPlayerStartedRolling }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [finalFace, setFinalFace] = useState(diceValue);

  // Trigger animation when diceValue changes
  useEffect(() => { 
    if (diceValue !== null && diceValue !== undefined) {
      setFinalFace(diceValue);
      setIsRolling(true);
    }
  }, [diceValue, isPlayerStartedRolling]);

  const handleRollComplete = () => {
    setIsRolling(false);
  };

  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 70 }}
      shadows
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '8px',
        overflow: 'visible',
        pointerEvents: 'none',
        display: 'block'
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} castShadow />
      <Dice isRolling={isRolling} finalFace={finalFace} onRollComplete={handleRollComplete} position={position} />
    </Canvas>
  );
};

export default DiceComponentForOthers;
