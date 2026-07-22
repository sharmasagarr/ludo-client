import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';

function Dice({ isRolling, finalFace, onRollComplete }) {
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

  // geometry (rounded box)
  const geometry = useMemo(() => new RoundedBoxGeometry(1.5, 1.5, 1.5, 6, 0.2), []);

  // material index mapping (BoxGeometry order: right, left, top, bottom, front, back)
  // We'll keep that mapping and then *observe* final face at animation end (robust).
  const materialIndexForNumber = useMemo(() => ({
    1: 4, // front (+Z)
    2: 2, // top (+Y)
    3: 0, // right (+X)
    4: 1, // left (-X)
    5: 3, // bottom (-Y)
    6: 5, // back (-Z)
  }), []);

  // inverse: materialIndex -> number
  const numberForMaterialIndex = useMemo(() => {
    const inv = {};
    Object.entries(materialIndexForNumber).forEach(([num, idx]) => inv[idx] = Number(num));
    return inv;
  }, [materialIndexForNumber]);

  // materials/textures (one canvas per face)
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
    const diceColor = '#ffffff';
    const dotColor = 'black';

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
      texture.needsUpdate = true; // ensure texture uploads to GPU

      const mat = new THREE.MeshStandardMaterial({ map: texture });
      const slot = materialIndexForNumber[num];
      mats[slot] = mat;
    }

    // defensive fallback
    for (let i = 0; i < 6; i++) if (!mats[i]) mats[i] = new THREE.MeshStandardMaterial({ color: diceColor });

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

  // start animation (initialize anim state)
  const startRoll = useCallback((face) => {
    if (!meshRef.current) return;
    const anim = animationRef.current;
    anim.isAnimating = true;
    anim.start_time = performance.now();
    anim.startPosZ = meshRef.current.position.z;
    anim.popDistance = 1.2 + Math.random() * 0.5;
    anim.duration = 700 + Math.floor(Math.random() * 400);

    anim.spinAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    anim.initialSpinSpeed = 40 + Math.random() * 60;

    anim.finalQuat = getQuaternionForFace(face);
    anim.face = face;

    // add extra rotations so it looks natural (targetQuat includes extra spins)
    const extraRot = 3 + Math.floor(Math.random() * 3);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(anim.spinAxis, extraRot * Math.PI * 2);
    anim.targetQuat = anim.finalQuat.clone().multiply(spinQuat);
  }, [getQuaternionForFace]);

  // when parent toggles isRolling + finalFace, start
  useEffect(() => {
    if (isRolling && finalFace && !animationRef.current.isAnimating) {
      startRoll(finalFace);
    }
  }, [isRolling, finalFace, startRoll]);

  // Immediately snap to finalFace if given and not animating (so parent-provided values display)
  useEffect(() => {
    const anim = animationRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;
    if (finalFace != null && !anim.isAnimating) {
      const q = getQuaternionForFace(finalFace);
      mesh.quaternion.copy(q);
      mesh.position.z = anim.startPosZ ?? 0;
      anim.face = finalFace;
    }
  }, [finalFace, getQuaternionForFace]);

  // easing helper
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  // helper: determine which material index is facing +Z in world space
  const getFacingMaterialIndex = (mesh) => {
    // local normals matching BoxGeometry material order:
    const locals = [
      new THREE.Vector3(1, 0, 0),   // right -> index 0
      new THREE.Vector3(-1, 0, 0),  // left  -> index 1
      new THREE.Vector3(0, 1, 0),   // top   -> index 2
      new THREE.Vector3(0, -1, 0),  // bottom-> index 3
      new THREE.Vector3(0, 0, 1),   // front -> index 4
      new THREE.Vector3(0, 0, -1),  // back  -> index 5
    ];
    const worldQuat = mesh.getWorldQuaternion(new THREE.Quaternion());
    let bestIdx = 0;
    let bestDot = -Infinity;
    for (let i = 0; i < locals.length; i++) {
      const nWorld = locals[i].clone().applyQuaternion(worldQuat);
      const dot = nWorld.z; // camera looking from +Z
      if (dot > bestDot) {
        bestDot = dot;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  useFrame((_state, delta) => {
    const anim = animationRef.current;
    const mesh = meshRef.current;
    if (!anim.isAnimating || !mesh) return;

    const elapsed = performance.now() - anim.start_time;
    const t = Math.min(elapsed / anim.duration, 1);

    // pop
    const pop = Math.sin(t * Math.PI);
    mesh.position.z = anim.startPosZ - pop * anim.popDistance;

    // spin with decay
    const spinT = Math.max(0, 1 - t);
    const currentSpinSpeed = anim.initialSpinSpeed * spinT * spinT;
    const angle = currentSpinSpeed * delta;
    const q = new THREE.Quaternion().setFromAxisAngle(anim.spinAxis, angle);
    mesh.quaternion.multiplyQuaternions(q, mesh.quaternion);

    // blend toward targetQuat (which includes extra spins)
    if (t > 0.15) {
      const blendT = (t - 0.15) / 0.85;
      const eased = easeOutQuart(Math.min(Math.max(blendT, 0), 1));
      mesh.quaternion.slerp(anim.targetQuat, eased * 0.12);
    }

    // finishing: snap to finalQuat, then determine observed face
    if (t >= 1) {
      mesh.quaternion.slerp(anim.finalQuat, 0.45);
      if (mesh.quaternion.angleTo(anim.finalQuat) < 0.01) {
        mesh.quaternion.copy(anim.finalQuat);
        mesh.position.z = anim.startPosZ;
        anim.isAnimating = false;

        // determine observed face from world orientation
        const materialIdx = getFacingMaterialIndex(mesh); // 0..5
        const observedNumber = numberForMaterialIndex[materialIdx] ?? anim.face ?? 1;

        if (typeof onRollComplete === 'function') onRollComplete(observedNumber);
      }
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={materials} castShadow receiveShadow />;
}

// Main wrapper
const DiceComponent = ({ disabled = false, diceValue = null, onRollClick, size = 65 }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [finalFace, setFinalFace] = useState(diceValue ?? null);
  const finalFaceRef = useRef(diceValue ?? null);

  // If parent prop diceValue changes, start animation towards it
  useEffect(() => {
    if (diceValue !== undefined && diceValue !== null) {
      if (!animationRef?.current?.isAnimating && finalFaceRef.current !== diceValue) {
        startRoll(diceValue);
        finalFaceRef.current = diceValue;
        setFinalFace(diceValue);
      }
    } else {
      // backend cleared dice → ready for local roll
      finalFaceRef.current = null;
      setFinalFace(null);
      setIsRolling(false);
    }
  }, [diceValue, startRoll]);

  // Dice rolling is now triggered externally
  const rollDice = () => {};

  const handleRollComplete = (observedFace) => {
    setIsRolling(false);
  };

  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 70 }}
      shadows
      onClick={() => { if (!disabled && onRollClick) onRollClick(); }}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "8px",
        overflow: "visible",
        cursor: disabled ? "default" : "pointer",
        display: "block",
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} castShadow />
      <Dice
        isRolling={isRolling}
        finalFace={finalFace}
        onRollComplete={handleRollComplete}
      />
    </Canvas>
  );
};

export default DiceComponent;
