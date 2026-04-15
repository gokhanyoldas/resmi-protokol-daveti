
import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  ContactShadows, 
  Environment, 
  Grid, 
  PerspectiveCamera,
  Bounds,
  useCursor,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { 
  Box, 
  Plus, 
  Trash2, 
  RotateCw, 
  Maximize2, 
  Save, 
  Sparkles, 
  Layout, 
  Fence as Wall, 
  Armchair, 
  Table as TableIcon,
  MousePointer2,
  Move
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { HallElement } from '../../types';
import { AnimatePresence } from 'motion/react';

// --- Components ---

const WallObject = ({ position, args, color = "#e2e8f0" }: any) => {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

const FurnitureObject = ({ element, onSelect, isSelected }: { element: HallElement, onSelect: () => void, isSelected: boolean }) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  const getGeometry = () => {
    switch (element.type) {
      case 'table-round': return <cylinderGeometry args={[element.width! / 100, element.width! / 100, 0.75, 32]} />;
      case 'table-rect': return <boxGeometry args={[element.width! / 100, 0.75, element.height! / 100]} />;
      case 'chair': return <boxGeometry args={[0.5, 0.5, 0.5]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <group 
      position={[element.x / 100, 0.375, element.y / 100]} 
      rotation={[0, (element.rotation || 0) * (Math.PI / 180), 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <mesh>
        {getGeometry()}
        <meshStandardMaterial color={isSelected ? "#3b82f6" : (element.color || "#94a3b8")} />
      </mesh>
      {element.label && (
        <Html distanceFactor={10} position={[0, 1, 0]} center>
          <div className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap border border-slate-200">
            {element.label}
          </div>
        </Html>
      )}
    </group>
  );
};

const Scene = ({ elements, selectedId, onSelect }: any) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      
      <Grid infiniteGrid fadeDistance={50} sectionSize={1} cellSize={0.5} sectionColor="#cbd5e1" cellColor="#f1f5f9" />
      
      {/* Walls (Example Layout) */}
      <WallObject position={[0, 1.5, -10]} args={[20, 3, 0.2]} />
      <WallObject position={[0, 1.5, 10]} args={[20, 3, 0.2]} />
      <WallObject position={[-10, 1.5, 0]} args={[0.2, 3, 20]} />
      <WallObject position={[10, 1.5, 0]} args={[0.2, 3, 20]} />

      {elements.map((el: HallElement) => (
        <FurnitureObject 
          key={el.id} 
          element={el} 
          isSelected={selectedId === el.id}
          onSelect={() => onSelect(el.id)}
        />
      ))}

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      <Environment preset="city" />
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
    </>
  );
};

// --- Main Editor ---

const PascalEditor: React.FC = () => {
  const { elements, addElement, removeElement, updateElement, syncToProtocol, getGeminiSuggestion } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    syncToProtocol();
  }, [elements, syncToProtocol]);

  const handleAddObject = (type: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newElement: HallElement = {
      id,
      type: type as any,
      x: 0,
      y: 0,
      width: type.includes('table') ? 120 : 50,
      height: type.includes('table') ? 80 : 50,
      rotation: 0,
      color: type === 'chair' ? '#3b82f6' : '#94a3b8',
      label: type.toUpperCase()
    };
    addElement(newElement);
    setSelectedId(id);
  };

  const handleGeminiSuggest = async () => {
    setIsGenerating(true);
    try {
      const suggestion = await getGeminiSuggestion();
      alert(`Gemini Önerisi:\n\n${suggestion}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        <div className="bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white flex flex-col gap-2">
          <button 
            onClick={() => handleAddObject('table-rect')}
            className="p-3 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all group relative"
            title="Masa Ekle"
          >
            <TableIcon className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Masa Ekle</span>
          </button>
          <button 
            onClick={() => handleAddObject('chair')}
            className="p-3 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all group relative"
            title="Koltuk Ekle"
          >
            <Armchair className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Koltuk Ekle</span>
          </button>
          <div className="h-px bg-slate-100 mx-2" />
          <button 
            className="p-3 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl transition-all group relative"
            title="Duvar Çiz"
          >
            <Wall className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Duvar Çiz</span>
          </button>
        </div>

        <button 
          onClick={handleGeminiSuggest}
          disabled={isGenerating}
          className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-blue-400" />}
          <span className="text-[11px] font-black uppercase tracking-widest pr-1">AI Öneri Al</span>
        </button>
      </div>

      {/* Selection Info */}
      <AnimatePresence>
        {selectedId && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-6 right-6 z-10 w-64 bg-white/80 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-white space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Öğe Ayarları</h3>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etiket</label>
                <input 
                  type="text" 
                  value={elements.find(el => el.id === selectedId)?.label || ''}
                  onChange={(e) => updateElement(selectedId, { label: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">X Pozisyonu</label>
                  <input 
                    type="number" 
                    value={elements.find(el => el.id === selectedId)?.x || 0}
                    onChange={(e) => updateElement(selectedId, { x: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Y Pozisyonu</label>
                  <input 
                    type="number" 
                    value={elements.find(el => el.id === selectedId)?.y || 0}
                    onChange={(e) => updateElement(selectedId, { y: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button 
                onClick={() => removeElement(selectedId)}
                className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Öğeyi Sil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div className="w-full h-full">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={40} />
          <Scene 
            elements={elements} 
            selectedId={selectedId} 
            onSelect={setSelectedId} 
          />
        </Canvas>
      </div>

      {/* Bottom Status */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pascal Editor v3.0</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Öğe Sayısı: {elements.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mod: Tasarım</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default PascalEditor;
