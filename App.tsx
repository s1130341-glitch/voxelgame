
import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameScene from './components/GameScene';
import { InventoryUI } from './components/InventoryUI';
import { HUD } from './components/HUD';
import { InventorySlot, BlockType } from './types';
import { INVENTORY_SIZE, HOTBAR_SIZE, CHEST_SIZE } from './constants';
import { MultiplayerManager } from './engine/Multiplayer';

const App: React.FC = () => {
  const [inventory, setInventory] = useState<InventorySlot[]>(() => {
    const initial = new Array(INVENTORY_SIZE + HOTBAR_SIZE).fill(null).map(() => ({ type: BlockType.AIR, count: 0 }));
    initial[0] = { type: BlockType.WOOD, count: 64 };
    initial[1] = { type: BlockType.COBBLESTONE, count: 64 };
    initial[2] = { type: BlockType.CHEST, count: 64 };
    initial[3] = { type: BlockType.IRON_BUCKET, count: 1 };
    initial[4] = { type: BlockType.WATER_BUCKET, count: 1 };
    return initial;
  });

  const [hotbarIndex, setHotbarIndex] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [invMode, setInvMode] = useState<'normal' | 'craft' | 'chest'>('normal');
  const [activeChestInventory, setActiveChestInventory] = useState<InventorySlot[]>(new Array(CHEST_SIZE).fill(null).map(() => ({ type: BlockType.AIR, count: 0 })));
  
  const [isNetMenuOpen, setIsNetMenuOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [seed, setSeed] = useState(12345);
  const [netStatus, setNetStatus] = useState('Offline');
  const [sdpInput, setSdpInput] = useState('');
  const [sdpOutput, setSdpOutput] = useState('');
  const multiplayerRef = useRef<MultiplayerManager | null>(null);

  useEffect(() => {
    multiplayerRef.current = new MultiplayerManager(
      (msg) => { if (msg.type === 'SYNC_SEED') setSeed(msg.seed); },
      (status) => setNetStatus(status)
    );

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        setIsNetMenuOpen(prev => !prev);
        setIsInventoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleToggleInventory = useCallback((open?: boolean, mode?: 'normal' | 'craft' | 'chest') => {
    setIsInventoryOpen(prev => {
      const newState = open !== undefined ? open : !prev;
      if (newState) {
        setIsNetMenuOpen(false);
        setInvMode(mode || 'normal');
      }
      return newState;
    });
  }, []);

  const handleUpdatePosition = useCallback((pos: {x: number, y: number, z: number}) => {
    setCoords({ x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) });
  }, []);

  const startHosting = async () => {
    const sdp = await multiplayerRef.current?.createOffer();
    setSdpOutput(sdp || '');
  };

  const joinGame = async () => {
    const answer = await multiplayerRef.current?.handleOffer(sdpInput);
    setSdpOutput(answer || '');
    multiplayerRef.current?.send({ type: 'SYNC_SEED', seed: seed });
  };

  const completeConnection = async () => {
    await multiplayerRef.current?.handleAnswer(sdpInput);
    multiplayerRef.current?.send({ type: 'SYNC_SEED', seed: seed });
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <GameScene 
        inventory={inventory} setInventory={setInventory}
        hotbarIndex={hotbarIndex} setHotbarIndex={setHotbarIndex}
        isInventoryOpen={isInventoryOpen}
        isNetMenuOpen={isNetMenuOpen}
        onToggleInventory={handleToggleInventory}
        onUpdatePosition={handleUpdatePosition}
        chestInventory={activeChestInventory}
        setChestInventory={setActiveChestInventory}
        multiplayer={multiplayerRef.current}
        seed={seed}
      />

      <HUD coords={coords} netStatus={netStatus} />

      {isNetMenuOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-md">
          <div className="bg-[#c6c6c6] p-6 border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] shadow-2xl rounded-sm w-[400px]">
            <div className="flex justify-between mb-4 border-b-2 border-gray-400 pb-2">
              <h2 className="text-xl font-bold text-gray-800">Connection Hub</h2>
              <button onClick={() => setIsNetMenuOpen(false)} className="text-gray-600 hover:text-red-600 font-bold">ESC/P</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="bg-gray-300 p-2 rounded border border-gray-400">
                <p className="text-gray-700 font-bold">Status: <span className={netStatus === 'Connected!' ? 'text-green-600' : 'text-blue-600'}>{netStatus}</span></p>
                <p className="text-[10px] text-gray-500">Seed: {seed}</p>
              </div>
              <button onClick={startHosting} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded shadow-md font-bold transition">Create World (Host)</button>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600 uppercase">Input Token:</label>
                <textarea value={sdpInput} onChange={(e) => setSdpInput(e.target.value)} className="w-full h-20 bg-white text-[10px] p-2 font-mono rounded border-2 border-gray-400 focus:border-blue-500 outline-none" placeholder="Paste friend's token here..."/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={joinGame} className="bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-bold">Accept Offer</button>
                <button onClick={completeConnection} className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded text-xs font-bold">Finish Link</button>
              </div>
              {sdpOutput && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Your Token:</label>
                  <textarea readOnly value={sdpOutput} className="w-full h-20 bg-gray-200 text-[10px] p-2 font-mono rounded border-2 border-gray-400" onClick={(e) => (e.target as HTMLTextAreaElement).select()}/>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InventoryUI 
        inventory={inventory} setInventory={setInventory}
        hotbarIndex={hotbarIndex} isOpen={isInventoryOpen}
        isCraftingTableMode={invMode === 'craft'}
        isChestMode={invMode === 'chest'}
        chestInventory={activeChestInventory}
        onChestChange={setActiveChestInventory}
        onClose={() => setIsInventoryOpen(false)}
      />
    </div>
  );
};

export default App;
