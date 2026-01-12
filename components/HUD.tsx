
import React from 'react';

interface HUDProps {
  coords: { x: number; y: number; z: number };
  netStatus?: string;
}

export const HUD: React.FC<HUDProps> = ({ coords, netStatus = 'Offline' }) => {
  return (
    <div className="absolute top-4 left-4 text-white font-mono bg-black/60 p-3 rounded-lg pointer-events-none select-none border border-white/20 backdrop-blur-md shadow-2xl z-40">
      <div className="flex justify-between items-center mb-1">
        <p className="text-yellow-400 font-bold underline">VOXELCRAFT MULTIPLAYER</p>
        <div className={`text-[10px] px-2 rounded border ml-4 ${netStatus === 'Connected!' ? 'text-green-400 bg-green-900/40 border-green-500/30' : 'text-blue-400 bg-blue-900/40 border-blue-500/30'}`}>
          {netStatus.toUpperCase()}
        </div>
      </div>
      
      <div className="bg-white/10 p-2 rounded mb-2 border border-white/5 text-[11px]">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-widest font-bold font-sans">Position</p>
        <div className="grid grid-cols-3 gap-2">
          <p><span className="text-red-400">X:</span> {coords.x}</p>
          <p><span className="text-green-400">Y:</span> {coords.y}</p>
          <p><span className="text-blue-400">Z:</span> {coords.z}</p>
        </div>
      </div>

      <div className="space-y-0.5 text-[11px] opacity-90">
        <p>WASD: Move | SPACE: Jump</p>
        <p>L-Click: Dig / Attack | R-Click: Build</p>
        <p>E: Inventory | Q: Drop Item | <span className="text-yellow-400 font-bold">V: Toggle View</span></p>
        <p className="text-blue-300 font-bold">P: Multiplayer Menu</p>
        <p>1-9: Hotbar selection</p>
      </div>

      <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-300">
        <p className="text-yellow-300 font-bold mb-1">Survival Tips:</p>
        <p>• Right-click to place blocks.</p>
        <p>• Mining progress resets if you let go.</p>
        <p>• V for third-person perspective.</p>
      </div>
    </div>
  );
};
