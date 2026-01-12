
import React, { useState, useEffect, useMemo } from 'react';
import { InventorySlot, BlockType } from '../types';
import { HOTBAR_SIZE, INVENTORY_SIZE, BLOCK_NAMES, STACK_LIMIT, RECIPES, CHEST_SIZE } from '../constants';
import { TextureGenerator } from '../utils/TextureGenerator';

interface InventoryUIProps {
  inventory: InventorySlot[];
  setInventory: React.Dispatch<React.SetStateAction<InventorySlot[]>>;
  hotbarIndex: number;
  isOpen: boolean;
  isCraftingTableMode: boolean;
  isChestMode: boolean;
  chestInventory?: InventorySlot[];
  onChestChange?: (inv: InventorySlot[]) => void;
  onClose: () => void;
}

const BlockIcon: React.FC<{ type: BlockType; size?: string }> = ({ type, size = "2rem" }) => {
  if (type === BlockType.AIR) return null;
  const url = TextureGenerator.getDataURL(type);
  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        backgroundImage: `url('${url}')`, 
        backgroundSize: 'contain',
        imageRendering: 'pixelated' 
      }} 
      className="shadow-sm rounded-sm" 
    />
  );
};

export const InventoryUI: React.FC<InventoryUIProps> = ({ 
  inventory, setInventory, hotbarIndex, isOpen, 
  isCraftingTableMode, isChestMode, chestInventory, onChestChange, onClose 
}) => {
  const [showLabel, setShowLabel] = useState(false);
  const [activeName, setActiveName] = useState('');
  const [heldItem, setHeldItem] = useState<InventorySlot | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [playerGrid, setPlayerGrid] = useState<(InventorySlot | null)[]>(new Array(4).fill(null));
  const [tableGrid, setTableGrid] = useState<(InventorySlot | null)[]>(new Array(16).fill(null));

  const currentGrid = isCraftingTableMode ? tableGrid : playerGrid;
  const gridSize = isCraftingTableMode ? 4 : 2;

  useEffect(() => {
    const slot = inventory[hotbarIndex];
    if (slot && slot.type !== BlockType.AIR) {
      setActiveName(BLOCK_NAMES[slot.type]);
      setShowLabel(true);
      const timer = setTimeout(() => setShowLabel(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hotbarIndex]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    if (isOpen) window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen]);

  const outputItem = useMemo(() => {
    if (!isCraftingTableMode && !(!isChestMode && !isCraftingTableMode)) {
      // Logic for tiny 2x2 player crafting
    }
    let minX = gridSize, maxX = -1, minY = gridSize, maxY = -1;
    let hasItems = false;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const item = currentGrid[y * gridSize + x];
        if (item && item.type !== BlockType.AIR) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          hasItems = true;
        }
      }
    }
    if (!hasItems) return null;
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const pattern: (BlockType | null)[][] = Array.from({length: h}, (_, ry) => 
      Array.from({length: w}, (_, rx) => {
        const it = currentGrid[(minY + ry) * gridSize + (minX + rx)];
        return (it && it.type !== BlockType.AIR) ? it.type : null;
      })
    );
    for (const r of RECIPES) {
      if (r.input.length === h && r.input[0].length === w) {
        let match = true;
        for (let ri = 0; ri < h; ri++) {
          for (let ci = 0; ci < w; ci++) {
            if (r.input[ri][ci] !== pattern[ri][ci]) { match = false; break; }
          }
          if (!match) break;
        }
        if (match) return r.output;
      }
    }
    return null;
  }, [currentGrid, gridSize, isChestMode, isCraftingTableMode]);

  const handleSlotClick = (index: number) => {
    const next = [...inventory];
    const slot = { ...next[index] };
    if (!heldItem) {
      if (slot.type !== BlockType.AIR) { setHeldItem({ ...slot }); next[index] = { type: BlockType.AIR, count: 0 }; }
    } else {
      if (slot.type === heldItem.type && slot.count < STACK_LIMIT) {
        const take = Math.min(STACK_LIMIT - slot.count, heldItem.count);
        next[index] = { ...slot, count: slot.count + take };
        if (heldItem.count > take) setHeldItem({ ...heldItem, count: heldItem.count - take });
        else setHeldItem(null);
      } else {
        const temp = { ...slot }; next[index] = { ...heldItem };
        setHeldItem(temp.type === BlockType.AIR ? null : temp);
      }
    }
    setInventory(next);
  };

  const handleChestSlotClick = (idx: number) => {
    if (!chestInventory || !onChestChange) return;
    const next = [...chestInventory];
    const slot = { ...next[idx] };
    if (!heldItem) {
      if (slot.type !== BlockType.AIR) { setHeldItem({ ...slot }); next[idx] = { type: BlockType.AIR, count: 0 }; }
    } else {
      if (slot.type === heldItem.type && slot.count < STACK_LIMIT) {
        const take = Math.min(STACK_LIMIT - slot.count, heldItem.count);
        next[idx] = { ...slot, count: slot.count + take };
        if (heldItem.count > take) setHeldItem({ ...heldItem, count: heldItem.count - take });
        else setHeldItem(null);
      } else {
        const temp = { ...slot }; next[idx] = { ...heldItem };
        setHeldItem(temp.type === BlockType.AIR ? null : temp);
      }
    }
    onChestChange(next);
  };

  const handleCraftSlotClick = (idx: number) => {
    const setGrid = isCraftingTableMode ? setTableGrid : setPlayerGrid;
    setGrid(prev => {
      const next = [...prev];
      const slot = next[idx] ? { ...next[idx]! } : null;
      if (!heldItem) { if (slot) { setHeldItem({ ...slot }); next[idx] = null; } }
      else {
        if (!slot) { next[idx] = { type: heldItem.type, count: 1 }; if (heldItem.count > 1) setHeldItem({ ...heldItem, count: heldItem.count - 1 }); else setHeldItem(null); }
        else if (slot.type === heldItem.type && slot.count < STACK_LIMIT) { next[idx] = { ...slot, count: slot.count + 1 }; if (heldItem.count > 1) setHeldItem({ ...heldItem, count: heldItem.count - 1 }); else setHeldItem(null); }
        else { const temp = { ...slot }; next[idx] = { ...heldItem }; setHeldItem(temp); }
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-end p-8 z-50">
      {!isOpen && showLabel && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-sm font-bold text-sm backdrop-blur-md border border-white/20">
          {activeName}
        </div>
      )}
      {isOpen && heldItem && (
        <div className="fixed w-12 h-12 pointer-events-none z-[100] flex items-center justify-center" style={{ left: mousePos.x - 24, top: mousePos.y - 24 }}>
          <BlockIcon type={heldItem.type} size="3rem" />
          <span className="absolute bottom-0 right-1 text-white text-sm font-black drop-shadow-md select-none">{heldItem.count}</span>
        </div>
      )}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center pointer-events-auto backdrop-blur-sm">
          <div className="bg-[#c6c6c6] p-4 border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] shadow-2xl rounded-sm max-w-xl w-full">
            <div className="flex justify-between mb-4 px-1">
              <h2 className="text-lg font-bold text-gray-800 antialiased">
                {isChestMode ? "Chest" : isCraftingTableMode ? "Crafting" : "Inventory"}
              </h2>
              <button onClick={onClose} className="hover:text-red-700 font-black text-2xl text-gray-600 leading-none">×</button>
            </div>

            {isChestMode && chestInventory && (
              <div className="mb-6">
                <div className="grid grid-cols-8 gap-1 bg-gray-500 p-1 border-2 border-gray-700">
                  {chestInventory.map((slot, i) => (
                    <div key={i} onClick={() => handleChestSlotClick(i)} className="w-12 h-12 bg-gray-400 border-2 border-t-[#555555] border-l-[#555555] border-b-[#ffffff] border-r-[#ffffff] hover:brightness-110 cursor-pointer flex items-center justify-center relative shadow-inner">
                      {slot.type !== BlockType.AIR && <BlockIcon type={slot.type} size="2.2rem" />}
                      {slot.count > 0 && <span className="absolute bottom-0 right-1 text-white text-[10px] font-bold drop-shadow-md">{slot.count}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isChestMode && (
              <div className="flex items-center justify-center gap-8 mb-6 bg-gray-300/50 p-4 rounded-sm border-2 border-gray-400/50 shadow-inner">
                <div className="grid gap-1 bg-gray-500 p-1 border-2 border-gray-700" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                  {currentGrid.map((slot, i) => (
                    <div key={i} onClick={() => handleCraftSlotClick(i)} className="w-10 h-10 bg-gray-400 border-2 border-t-[#555555] border-l-[#555555] border-b-[#ffffff] border-r-[#ffffff] hover:brightness-110 cursor-pointer flex items-center justify-center relative shadow-inner">
                      {slot && <BlockIcon type={slot.type} size="1.5rem" />}
                      {slot && <span className="absolute bottom-0 right-0.5 text-white text-[10px] font-bold drop-shadow-md">{slot.count}</span>}
                    </div>
                  ))}
                </div>
                <div className="text-2xl font-bold text-gray-700 select-none">→</div>
                <div onClick={() => {
                  if (outputItem) {
                    const setGrid = isCraftingTableMode ? setTableGrid : setPlayerGrid;
                    if (!heldItem || (heldItem.type === outputItem.type && heldItem.count + outputItem.count <= STACK_LIMIT)) {
                      setHeldItem(heldItem ? { ...heldItem, count: heldItem.count + outputItem.count } : { ...outputItem });
                      setGrid(prev => prev.map(s => s ? (s.count > 1 ? { ...s, count: s.count - 1 } : null) : null));
                    }
                  }
                }} className="w-14 h-14 bg-gray-400 border-2 border-t-[#555555] border-l-[#555555] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center relative cursor-pointer hover:brightness-110 shadow-md">
                  {outputItem && <BlockIcon type={outputItem.type} size="2.5rem" />}
                  {outputItem && <span className="absolute bottom-0 right-1 text-white text-xs font-bold drop-shadow-md">{outputItem.count}</span>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-9 gap-1 bg-gray-500 p-1 border-2 border-gray-700">
              {inventory.slice(HOTBAR_SIZE, INVENTORY_SIZE + HOTBAR_SIZE).map((slot, i) => (
                <div key={i} onClick={() => handleSlotClick(i + HOTBAR_SIZE)} className="w-12 h-12 bg-gray-400 border-2 border-t-[#555555] border-l-[#555555] border-b-[#ffffff] border-r-[#ffffff] hover:brightness-110 cursor-pointer flex items-center justify-center relative shadow-inner">
                  {slot.type !== BlockType.AIR && <BlockIcon type={slot.type} size="2.2rem" />}
                  {slot.count > 0 && <span className="absolute bottom-0 right-1 text-white text-[10px] font-bold drop-shadow-md">{slot.count}</span>}
                </div>
              ))}
            </div>
            <div className="h-4" />
            <div className="grid grid-cols-9 gap-1 bg-gray-500 p-1 border-2 border-gray-700">
              {inventory.slice(0, HOTBAR_SIZE).map((slot, i) => (
                <div key={i} onClick={() => handleSlotClick(i)} className={`w-12 h-12 bg-gray-400 border-2 hover:brightness-110 cursor-pointer flex items-center justify-center relative shadow-inner ${i === hotbarIndex ? 'ring-2 ring-yellow-400 border-yellow-400' : 'border-t-[#555555] border-l-[#555555] border-b-[#ffffff] border-r-[#ffffff]'}`}>
                  {slot.type !== BlockType.AIR && <BlockIcon type={slot.type} size="2.2rem" />}
                  {slot.count > 0 && <span className="absolute bottom-0 right-1 text-white text-[10px] font-bold drop-shadow-md">{slot.count}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!isOpen && (
        <div className="flex justify-center gap-1.5 pointer-events-auto pb-4">
          {inventory.slice(0, HOTBAR_SIZE).map((slot, i) => (
            <div key={i} className={`w-14 h-14 bg-black/60 border-4 flex items-center justify-center relative transition-all shadow-xl backdrop-blur-sm ${i === hotbarIndex ? 'border-white -translate-y-2 scale-110 ring-2 ring-black/40' : 'border-[#333333]'}`}>
              {slot.type !== BlockType.AIR && (
                <>
                  <BlockIcon type={slot.type} size="2.8rem" />
                  <span className="absolute bottom-0.5 right-1 text-white text-xs font-bold drop-shadow-lg">{slot.count > 1 ? slot.count : ''}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
