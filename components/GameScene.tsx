
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WorldManager } from '../engine/World';
import { PhysicsEngine, PLAYER_HEIGHT, PLAYER_RADIUS } from '../engine/Physics';
import { WaterSystem } from '../engine/WaterSystem';
import { TextureGenerator } from '../utils/TextureGenerator';
import { BlockType, InventorySlot, DroppedItem } from '../types';
import { 
  HOTBAR_SIZE, CHUNK_SIZE, WORLD_HEIGHT, 
  BLOCK_HARDNESS, MAX_REACH, 
  RENDER_DISTANCE, JUMP_FORCE, MOVE_SPEED, STACK_LIMIT, CHEST_SIZE 
} from '../constants';

interface GameSceneProps {
  inventory: InventorySlot[]; 
  setInventory: React.Dispatch<React.SetStateAction<InventorySlot[]>>;
  hotbarIndex: number; 
  setHotbarIndex: (idx: number) => void;
  isInventoryOpen: boolean; 
  isNetMenuOpen: boolean;
  onToggleInventory: (open?: boolean, mode?: 'normal' | 'craft' | 'chest') => void;
  onUpdatePosition?: (pos: {x: number, y: number, z: number}) => void;
  chestInventory: InventorySlot[];
  setChestInventory: (inv: InventorySlot[]) => void;
  multiplayer: any; 
  seed: number;
}

enum ViewMode { FIRST_PERSON, THIRD_PERSON }

const GameScene: React.FC<GameSceneProps> = ({ 
  inventory, setInventory, hotbarIndex, setHotbarIndex, 
  isInventoryOpen, isNetMenuOpen, onToggleInventory, onUpdatePosition,
  chestInventory, setChestInventory,
  multiplayer, seed
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<WorldManager>(new WorldManager(seed));
  
  const inventoryRef = useRef(inventory);
  const hotbarIndexRef = useRef(hotbarIndex);
  const isInventoryOpenRef = useRef(isInventoryOpen);
  const activeChestCoord = useRef<{x: number, y: number, z: number} | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.FIRST_PERSON);
  const viewModeRef = useRef(ViewMode.FIRST_PERSON);
  const [isLocked, setIsLocked] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const playerFeetPos = useRef(new THREE.Vector3(8.5, 45, 8.5));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const selectionBoxRef = useRef<THREE.LineSegments | null>(null);
  
  const chunkMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const blockGeometry = useRef(new THREE.BoxGeometry(1, 1, 1));
  const materialsRef = useRef<Record<number, any>>({});

  const droppedItemsRef = useRef<DroppedItem[]>([]);
  const miningProgress = useRef(0);
  const [miningUIProgress, setMiningUIProgress] = useState(0);
  const keys = useRef<Record<string, boolean>>({});
  const mouseButtons = useRef<Record<number, boolean>>({});
  const isGrounded = useRef(false);
  const playerModelRef = useRef<THREE.Group | null>(null);

  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { hotbarIndexRef.current = hotbarIndex; }, [hotbarIndex]);
  useEffect(() => { 
    isInventoryOpenRef.current = isInventoryOpen;
    if ((isInventoryOpen || isNetMenuOpen) && controlsRef.current?.isLocked) {
      controlsRef.current.unlock();
    }
    if (!isInventoryOpen) activeChestCoord.current = null;
  }, [isInventoryOpen, isNetMenuOpen]);

  // Handle chest metadata syncing
  useEffect(() => {
    if (activeChestCoord.current) {
      worldRef.current.setMetadata(activeChestCoord.current.x, activeChestCoord.current.y, activeChestCoord.current.z, chestInventory);
      if (multiplayer) {
        multiplayer.send({
          type: 'BLOCK_METADATA_UPDATE',
          ...activeChestCoord.current,
          metadata: chestInventory
        });
      }
    }
  }, [chestInventory, multiplayer]);

  const updateChunkMesh = useCallback((cx: number, cz: number) => {
    if (!sceneRef.current) return;
    const world = worldRef.current;
    const key = world.getChunkKey(cx, cz);
    
    if (chunkMeshes.current.has(key)) {
      const oldGroup = chunkMeshes.current.get(key)!;
      sceneRef.current.remove(oldGroup);
      chunkMeshes.current.delete(key);
    }

    const chunk = world.getChunk(cx, cz);
    const chunkGroup = new THREE.Group();
    const typePositions: Map<BlockType, {pos: THREE.Vector3, level: number}[]> = new Map();

    for (let i = 0; i < chunk.data.length; i++) {
      const type = chunk.data[i];
      if (type === BlockType.AIR) continue;

      const lx = i % CHUNK_SIZE;
      const lz = Math.floor(i / CHUNK_SIZE) % CHUNK_SIZE;
      const ly = Math.floor(i / (CHUNK_SIZE * CHUNK_SIZE));
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;

      const isSurrounded = 
        world.getBlock(wx + 1, ly, wz) !== BlockType.AIR && world.getBlock(wx - 1, ly, wz) !== BlockType.AIR &&
        world.getBlock(wx, ly + 1, wz) !== BlockType.AIR && world.getBlock(wx, ly - 1, wz) !== BlockType.AIR &&
        world.getBlock(wx, ly, wz + 1) !== BlockType.AIR && world.getBlock(wx, ly, wz - 1) !== BlockType.AIR;

      const isWater = type === BlockType.WATER_SOURCE || type === BlockType.WATER_FLOW;
      if (!isSurrounded || type === BlockType.GLASS || type === BlockType.LEAVES || isWater) {
        if (!typePositions.has(type)) typePositions.set(type, []);
        typePositions.get(type)!.push({
          pos: new THREE.Vector3(wx, ly, wz),
          level: chunk.waterLevels[i]
        });
      }
    }

    typePositions.forEach((instances, type) => {
      const mat = materialsRef.current[type] || materialsRef.current[BlockType.STONE];
      const mesh = new THREE.InstancedMesh(blockGeometry.current, mat, instances.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const dummy = new THREE.Object3D();
      instances.forEach((inst, i) => {
        dummy.position.set(inst.pos.x + 0.5, inst.pos.y + 0.5, inst.pos.z + 0.5);
        if (type === BlockType.WATER_SOURCE || type === BlockType.WATER_FLOW) {
          const height = inst.level / 15;
          dummy.scale.set(1, Math.max(0.1, height), 1);
          dummy.position.y -= (1 - height) * 0.5;
        } else {
          dummy.scale.set(1, 1, 1);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      chunkGroup.add(mesh);
    });

    sceneRef.current.add(chunkGroup);
    chunkMeshes.current.set(key, chunkGroup);
  }, []);

  const updateChunkAndNeighbors = useCallback((x: number, z: number) => {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    updateChunkMesh(cx, cz);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    if (lx === 0) updateChunkMesh(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) updateChunkMesh(cx + 1, cz);
    if (lz === 0) updateChunkMesh(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) updateChunkMesh(cx, cz + 1);
  }, [updateChunkMesh]);

  const updateVisibleChunks = useCallback(() => {
    if (!sceneRef.current) return;
    const pos = playerFeetPos.current;
    const px = Math.floor(pos.x / CHUNK_SIZE);
    const pz = Math.floor(pos.z / CHUNK_SIZE);
    
    for (const [key, group] of chunkMeshes.current.entries()) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - px) > RENDER_DISTANCE || Math.abs(cz - pz) > RENDER_DISTANCE) {
        sceneRef.current.remove(group);
        chunkMeshes.current.delete(key);
      }
    }

    for (let x = px - RENDER_DISTANCE; x <= px + RENDER_DISTANCE; x++) {
      for (let z = pz - RENDER_DISTANCE; z <= pz + RENDER_DISTANCE; z++) {
        const key = worldRef.current.getChunkKey(x, z);
        if (!chunkMeshes.current.has(key)) {
          updateChunkMesh(x, z);
        }
      }
    }
  }, [updateChunkMesh]);

  const spawnDroppedItem = useCallback((type: BlockType, pos: THREE.Vector3) => {
    if (!sceneRef.current || type === BlockType.AIR) return;
    let dropType = type;
    if (type === BlockType.GRASS) dropType = BlockType.DIRT;
    if (type === BlockType.STONE) dropType = BlockType.COBBLESTONE;
    if (type === BlockType.COAL_ORE) dropType = BlockType.COAL;
    if (type === BlockType.DIAMOND_ORE) dropType = BlockType.DIAMOND;

    const baseMat = materialsRef.current[dropType] || materialsRef.current[BlockType.STONE];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      (Array.isArray(baseMat) ? baseMat[0] : baseMat).clone()
    );
    mesh.position.copy(pos).addScalar(0.5);
    sceneRef.current.add(mesh);
    droppedItemsRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type: dropType,
      position: mesh.position.clone(),
      mesh: mesh,
      createdAt: Date.now(),
      velocity: new THREE.Vector3((Math.random()-0.5)*2, 4+Math.random()*2, (Math.random()-0.5)*2)
    });
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const mat = (type: BlockType, opacity = 1) => {
      const tex = TextureGenerator.getThreeTexture(type);
      return new THREE.MeshStandardMaterial({ 
        map: tex, 
        roughness: 0.8, 
        transparent: opacity < 1, 
        opacity 
      });
    };

    materialsRef.current = {
      [BlockType.AIR]: new THREE.MeshStandardMaterial({ visible: false }),
      [BlockType.GRASS]: [mat(BlockType.GRASS), mat(BlockType.GRASS), mat(BlockType.GRASS), mat(BlockType.DIRT), mat(BlockType.GRASS), mat(BlockType.GRASS)],
      [BlockType.DIRT]: mat(BlockType.DIRT),
      [BlockType.STONE]: mat(BlockType.STONE),
      [BlockType.WOOD]: mat(BlockType.WOOD),
      [BlockType.LEAVES]: mat(BlockType.LEAVES, 0.6),
      [BlockType.PLANKS]: mat(BlockType.PLANKS),
      [BlockType.COBBLESTONE]: mat(BlockType.COBBLESTONE),
      [BlockType.COAL_ORE]: mat(BlockType.COAL_ORE),
      [BlockType.IRON_ORE]: mat(BlockType.IRON_ORE),
      [BlockType.DIAMOND_ORE]: mat(BlockType.DIAMOND_ORE),
      [BlockType.WATER_SOURCE]: mat(BlockType.WATER_SOURCE, 0.7),
      [BlockType.WATER_FLOW]: mat(BlockType.WATER_FLOW, 0.7),
      [BlockType.SAND]: mat(BlockType.SAND),
      [BlockType.GLASS]: mat(BlockType.GLASS, 0.4),
      [BlockType.CHEST]: mat(BlockType.CHEST),
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87ceeb);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.castShadow = true;
    scene.add(sun);
    
    const playerGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({color: 0xffdbac})); head.position.y = 1.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshStandardMaterial({color: 0x3b82f6})); body.position.y = 1.05;
    playerGroup.add(head, body);
    scene.add(playerGroup);
    playerModelRef.current = playerGroup;

    const selectionBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    scene.add(selectionBox);
    selectionBoxRef.current = selectionBox;
    
    const controls = new PointerLockControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.addEventListener('lock', () => setIsLocked(true));
    controls.addEventListener('unlock', () => setIsLocked(false));

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyV') {
        const next = viewModeRef.current === ViewMode.FIRST_PERSON ? ViewMode.THIRD_PERSON : ViewMode.FIRST_PERSON;
        setViewMode(next); viewModeRef.current = next;
      }
      if (e.code === 'KeyE') onToggleInventory();
      if (e.code === 'Space' && isGrounded.current) { velocity.current.y = JUMP_FORCE; isGrounded.current = false; }
      if (e.code.startsWith('Digit')) setHotbarIndex(parseInt(e.key) - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keyup', handleKeyUp);
    
    const onMouseDown = (e: MouseEvent) => {
      if (isInventoryOpenRef.current) return;
      if (!controls.isLocked) { controls.lock(); return; }
      mouseButtons.current[e.button] = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      mouseButtons.current[e.button] = false;
      if (e.button === 0) { miningProgress.current = 0; setMiningUIProgress(0); }
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    updateVisibleChunks();

    let lastTime = performance.now();
    let waterTickTime = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = performance.now();
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      waterTickTime += delta;
      if (waterTickTime >= 0.2) {
        waterTickTime = 0;
        WaterSystem.updateArea(worldRef.current, Math.floor(playerFeetPos.current.x), Math.floor(playerFeetPos.current.y), Math.floor(playerFeetPos.current.z), 32, (cx, cz) => {
          updateChunkMesh(cx, cz);
        });
      }

      if (!isInventoryOpenRef.current) {
        PhysicsEngine.updateMovement(playerFeetPos.current, velocity.current, delta, worldRef.current, () => { isGrounded.current = true; });
        if (controls.isLocked) {
          const move = new THREE.Vector3();
          if (keys.current['KeyW']) move.z += 1; if (keys.current['KeyS']) move.z -= 1;
          if (keys.current['KeyA']) move.x -= 1; if (keys.current['KeyD']) move.x += 1;
          move.normalize();
          const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
          camDir.y = 0; camDir.normalize();
          const right = new THREE.Vector3().crossVectors(camera.up, camDir).negate();
          const moveVector = new THREE.Vector3().addScaledVector(camDir, move.z * MOVE_SPEED * delta).addScaledVector(right, move.x * MOVE_SPEED * delta);
          const nextPos = playerFeetPos.current.clone().add(moveVector);
          if (!PhysicsEngine.isColliding(nextPos, worldRef.current)) playerFeetPos.current.add(moveVector);
        }
      }

      droppedItemsRef.current = droppedItemsRef.current.filter(item => {
        item.mesh.rotation.y += delta * 2;
        const dist = item.mesh.position.distanceTo(playerFeetPos.current.clone().add(new THREE.Vector3(0, 1, 0)));
        if (dist < 1.6) {
          scene.remove(item.mesh);
          setInventory(prev => {
            const next = [...prev];
            let added = false;
            for (let i = 0; i < next.length; i++) {
              if (next[i].type === item.type && next[i].count < STACK_LIMIT) { next[i].count++; added = true; break; }
            }
            if (!added) {
              for (let i = 0; i < next.length; i++) { if (next[i].type === BlockType.AIR) { next[i] = { type: item.type, count: 1 }; added = true; break; } }
            }
            return next;
          });
          return false;
        }
        return true;
      });

      playerGroup.position.copy(playerFeetPos.current);
      playerGroup.rotation.y = controls.object.rotation.y;
      playerGroup.visible = (viewModeRef.current === ViewMode.THIRD_PERSON);

      if (viewModeRef.current === ViewMode.FIRST_PERSON) {
        camera.position.set(playerFeetPos.current.x, playerFeetPos.current.y + 1.65, playerFeetPos.current.z);
      } else {
        const camOffset = new THREE.Vector3(0, 2.5, -5).applyQuaternion(camera.quaternion);
        camera.position.copy(playerFeetPos.current).add(camOffset);
      }

      sun.position.set(playerFeetPos.current.x + 30, playerFeetPos.current.y + 60, playerFeetPos.current.z + 15);
      sun.target.position.copy(playerFeetPos.current);

      if (controls.isLocked) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const chunkGroups = Array.from(chunkMeshes.current.values());
        const intersects = raycaster.intersectObjects(chunkGroups, true);
        
        if (intersects.length > 0 && intersects[0].distance <= MAX_REACH) {
          const hit = intersects[0];
          const targetPos = hit.point.clone().add(hit.face!.normal!.clone().multiplyScalar(-0.05)).floor();
          const placePos = hit.point.clone().add(hit.face!.normal!.clone().multiplyScalar(0.05)).floor();
          selectionBox.position.copy(targetPos).addScalar(0.5);
          selectionBox.visible = true;
          
          const type = worldRef.current.getBlock(targetPos.x, targetPos.y, targetPos.z);
          const currentSlot = inventoryRef.current[hotbarIndexRef.current];

          if (mouseButtons.current[0]) {
            if (BLOCK_HARDNESS[type] !== -1) {
              miningProgress.current += delta;
              setMiningUIProgress(Math.min(miningProgress.current / (BLOCK_HARDNESS[type] || 0.1), 1));
              if (miningProgress.current >= (BLOCK_HARDNESS[type] || 0.1)) {
                spawnDroppedItem(type, targetPos);
                worldRef.current.setBlock(targetPos.x, targetPos.y, targetPos.z, BlockType.AIR);
                miningProgress.current = 0; setMiningUIProgress(0);
                updateChunkAndNeighbors(targetPos.x, targetPos.z);
                WaterSystem.updateArea(worldRef.current, targetPos.x, targetPos.y, targetPos.z, 8, updateChunkAndNeighbors);
              }
            }
          }
          if (mouseButtons.current[2]) {
            mouseButtons.current[2] = false;
            
            if (type === BlockType.CHEST) {
              const meta = worldRef.current.getMetadata(targetPos.x, targetPos.y, targetPos.z) || 
                            new Array(CHEST_SIZE).fill(null).map(() => ({ type: BlockType.AIR, count: 0 }));
              activeChestCoord.current = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
              setChestInventory(meta);
              onToggleInventory(true, 'chest');
              return;
            }

            if (currentSlot.type === BlockType.IRON_BUCKET && type === BlockType.WATER_SOURCE) {
              worldRef.current.setBlock(targetPos.x, targetPos.y, targetPos.z, BlockType.AIR);
              setInventory(prev => {
                const next = [...prev];
                next[hotbarIndexRef.current] = { type: BlockType.WATER_BUCKET, count: 1 };
                return next;
              });
              updateChunkAndNeighbors(targetPos.x, targetPos.z);
              WaterSystem.updateArea(worldRef.current, targetPos.x, targetPos.y, targetPos.z, 8, updateChunkAndNeighbors);
            } else if (currentSlot.type === BlockType.WATER_BUCKET) {
              worldRef.current.setBlock(placePos.x, placePos.y, placePos.z, BlockType.WATER_SOURCE);
              setInventory(prev => {
                const next = [...prev];
                next[hotbarIndexRef.current] = { type: BlockType.IRON_BUCKET, count: 1 };
                return next;
              });
              updateChunkAndNeighbors(placePos.x, placePos.z);
              WaterSystem.updateArea(worldRef.current, placePos.x, placePos.y, placePos.z, 16, updateChunkAndNeighbors);
            } else if (currentSlot.type !== BlockType.AIR && currentSlot.count > 0 && currentSlot.type < 31 || currentSlot.type === BlockType.CHEST) {
              const playerBox = new THREE.Box3().setFromCenterAndSize(
                playerFeetPos.current.clone().add(new THREE.Vector3(0, PLAYER_HEIGHT / 2, 0)),
                new THREE.Vector3(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2)
              );
              const blockBox = new THREE.Box3(placePos, placePos.clone().addScalar(1));
              if (!playerBox.intersectsBox(blockBox)) {
                worldRef.current.setBlock(placePos.x, placePos.y, placePos.z, currentSlot.type);
                setInventory(prev => {
                  const next = [...prev];
                  next[hotbarIndexRef.current].count--;
                  if(next[hotbarIndexRef.current].count <= 0) next[hotbarIndexRef.current] = {type: BlockType.AIR, count: 0};
                  return next;
                });
                updateChunkAndNeighbors(placePos.x, placePos.z);
                WaterSystem.updateArea(worldRef.current, placePos.x, placePos.y, placePos.z, 8, updateChunkAndNeighbors);
              }
            }
          }
        } else { selectionBox.visible = false; }
      }

      if (Math.floor(time / 1000) !== Math.floor((time - delta * 1000) / 1000)) {
        updateVisibleChunks();
      }

      if (onUpdatePosition) onUpdatePosition({x: playerFeetPos.current.x, y: playerFeetPos.current.y, z: playerFeetPos.current.z});
      renderer.render(scene, camera);
    };
    animate();
    
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [seed, setInventory, onToggleInventory, setHotbarIndex, updateVisibleChunks, updateChunkMesh, updateChunkAndNeighbors, onUpdatePosition, spawnDroppedItem, setChestInventory]);

  return (
    <>
      <div ref={mountRef} className="w-full h-full bg-[#87ceeb]" />
      {!isLocked && !isInventoryOpen && !isNetMenuOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => controlsRef.current?.lock()}>
          <div className="bg-[#c6c6c6] p-10 border-4 border-white shadow-2xl text-center">
            <h1 className="text-gray-800 text-5xl font-black mb-6 tracking-tighter">VOXELCRAFT</h1>
            <p className="text-blue-700 font-black animate-pulse text-xl uppercase tracking-widest">Click to Start</p>
          </div>
        </div>
      )}
      {miningUIProgress > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 pointer-events-none z-10">
          <div className="w-32 h-2 border border-white bg-black/50 overflow-hidden">
            <div className="h-full bg-yellow-400" style={{ width: `${miningUIProgress * 100}%` }} />
          </div>
        </div>
      )}
      <div id="crosshair" className={isLocked ? "block" : "hidden"} />
    </>
  );
};
export default GameScene;
