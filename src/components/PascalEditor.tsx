
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Html,
  Float,
  Text
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
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
  Move,
  DoorOpen,
  ChevronRight,
  ChevronLeft,
  Settings,
  Layers,
  Download,
  Eye,
  Undo,
  Redo,
  Search,
  X,
  Loader2,
  Copy,
  Square as WindowIcon
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { HallElement } from '../../types';

// --- Types ---

interface PascalNode extends HallElement {
  height?: number;
  depth?: number;
}

// --- Components ---

const WallObject = ({ element, onSelect, isSelected }: { element: PascalNode, onSelect: () => void, isSelected: boolean }) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  const width = element.width || 100;
  const height = element.height || 300;
  const x = element.x || 0;
  const y = element.y || 0;
  const rotation = (element.rotation || 0) * (Math.PI / 180);

  return (
    <mesh 
      position={[x / 100, height / 200, y / 100]}
      rotation={[0, rotation, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[width / 100, height / 100, 0.2]} />
      <meshStandardMaterial color={isSelected ? "#3b82f6" : "#e2e8f0"} />
    </mesh>
  );
};

const FurnitureObject = ({ element, onSelect, isSelected }: { element: PascalNode, onSelect: () => void, isSelected: boolean }) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;
  const rotation = (element.rotation || 0) * (Math.PI / 180);

  const getGeometry = () => {
    switch (element.type) {
      case 'table-round': 
        return (
          <group>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[width / 200, width / 200, 0.05, 32]} />
              <meshStandardMaterial color={isSelected ? "#3b82f6" : (element.color || "#94a3b8")} />
            </mesh>
            <mesh position={[0, 0.175, 0]}>
              <cylinderGeometry args={[0.05, 0.1, 0.35, 16]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          </group>
        );
      case 'table-rect': 
        return (
          <group>
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[width / 100, 0.05, height / 100]} />
              <meshStandardMaterial color={isSelected ? "#3b82f6" : (element.color || "#94a3b8")} />
            </mesh>
            <mesh position={[0, 0.175, 0]}>
              <boxGeometry args={[0.1, 0.35, 0.1]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          </group>
        );
      case 'chair': 
        return (
          <group>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.4, 0.05, 0.4]} />
              <meshStandardMaterial color={isSelected ? "#3b82f6" : (element.color || "#3b82f6")} />
            </mesh>
            <mesh position={[0, 0.4, -0.175]}>
              <boxGeometry args={[0.4, 0.4, 0.05]} />
              <meshStandardMaterial color={isSelected ? "#3b82f6" : (element.color || "#3b82f6")} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        );
      default: 
        return (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={isSelected ? "#3b82f6" : "#cbd5e1"} />
          </mesh>
        );
    }
  };

  return (
    <group 
      position={[x / 100, 0, y / 100]} 
      rotation={[0, rotation, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {getGeometry()}
      {element.label && (
        <Html distanceFactor={10} position={[0, 0.8, 0]} center>
          <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-xl whitespace-nowrap border border-slate-700 pointer-events-none">
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
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      
      <Grid 
        infiniteGrid 
        fadeDistance={100} 
        sectionSize={5} 
        cellSize={1} 
        sectionColor="#94a3b8" 
        cellColor="#e2e8f0" 
        sectionThickness={1.5}
        cellThickness={0.5}
      />
      
      {elements && elements.map((el: PascalNode) => {
        if (!el) return null;
        if (el.type === 'wall') {
          return <WallObject key={el.id} element={el} isSelected={selectedId === el.id} onSelect={() => onSelect(el.id)} />;
        }
        return <FurnitureObject key={el.id} element={el} isSelected={selectedId === el.id} onSelect={() => onSelect(el.id)} />;
      })}

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={40} blur={2} far={10} />
      <Environment preset="apartment" />
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
    </>
  );
};

// --- Main Editor ---

const PascalEditor: React.FC = () => {
  const { elements, addElement, removeElement, updateElement, syncToProtocol } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'wall' | 'furniture'>('select');

  useEffect(() => {
    if (syncToProtocol) syncToProtocol();
  }, [elements, syncToProtocol]);

  const handleAddObject = (type: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newElement: HallElement = {
      id,
      type: type as any,
      x: 0,
      y: 0,
      width: type === 'wall' ? 400 : (type.includes('table') ? 120 : 50),
      height: type === 'wall' ? 300 : (type.includes('table') ? 80 : 50),
      rotation: 0,
      color: type === 'chair' ? '#3b82f6' : (type === 'wall' ? '#e2e8f0' : '#94a3b8'),
      label: type.toUpperCase()
    };
    if (addElement) addElement(newElement);
    setSelectedId(id);
  };

  const handleGeminiSuggest = () => {
    console.log("AI ÖNERİ AL tıklandı. Mevcut düzen:", elements);
    alert("AI Öneri Al özelliği şu anda geliştirme aşamasındadır. Konsol çıktısını kontrol edebilirsiniz.");
  };

  const selectedElement = useMemo(() => elements.find(el => el.id === selectedId), [elements, selectedId]);

  return (
    <div className="relative w-full h-full bg-[#f8fafc] overflow-hidden flex">
      {/* Left Toolbar */}
      <div className="absolute top-1/2 -translate-y-1/2 left-6 z-50 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-2xl p-2 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white flex flex-col gap-1">
          <ToolButton 
            active={activeTool === 'select'} 
            onClick={() => setActiveTool('select')} 
            icon={<MousePointer2 className="w-5 h-5" />} 
            label="Seç" 
          />
          <div className="h-px bg-slate-100 mx-2 my-1" />
          <ToolButton 
            active={activeTool === 'wall'} 
            onClick={() => { setActiveTool('wall'); handleAddObject('wall'); }} 
            icon={<Wall className="w-5 h-5" />} 
            label="Duvar" 
          />
          <ToolButton 
            active={false} 
            onClick={() => handleAddObject('door')} 
            icon={<DoorOpen className="w-5 h-5" />} 
            label="Kapı" 
          />
          <ToolButton 
            active={false} 
            onClick={() => handleAddObject('window')} 
            icon={<WindowIcon className="w-5 h-5" />} 
            label="Pencere" 
          />
          <div className="h-px bg-slate-100 mx-2 my-1" />
          <ToolButton 
            active={false} 
            onClick={() => handleAddObject('table-rect')} 
            icon={<TableIcon className="w-5 h-5" />} 
            label="Dikdörtgen Masa" 
          />
          <ToolButton 
            active={false} 
            onClick={() => handleAddObject('table-round')} 
            icon={<Layout className="w-5 h-5" />} 
            label="Yuvarlak Masa" 
          />
          <ToolButton 
            active={false} 
            onClick={() => handleAddObject('chair')} 
            icon={<Armchair className="w-5 h-5" />} 
            label="Koltuk" 
          />
        </div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
        <div className="bg-slate-900/90 backdrop-blur-xl px-6 py-3 rounded-[24px] shadow-2xl border border-slate-800 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none">Pascal Editor</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">V3.0 Professional</p>
            </div>
          </div>
          
          <div className="h-6 w-px bg-slate-700" />
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"><Undo className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"><Redo className="w-4 h-4" /></button>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          <button 
            onClick={handleGeminiSuggest}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Öneri Al
          </button>
        </div>
      </div>

      {/* Right Properties Panel */}
      <AnimatePresence>
        {selectedId && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-6 right-6 bottom-6 w-80 z-50 bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">Özellikler</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">ID: {selectedId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etiket / İsim</label>
                  <input 
                    type="text" 
                    value={selectedElement?.label || ''}
                    onChange={(e) => updateElement(selectedId, { label: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">X Pozisyonu</label>
                    <input 
                      type="number" 
                      value={selectedElement?.x || 0}
                      onChange={(e) => updateElement(selectedId, { x: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Y Pozisyonu</label>
                    <input 
                      type="number" 
                      value={selectedElement?.y || 0}
                      onChange={(e) => updateElement(selectedId, { y: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genişlik (cm)</label>
                    <input 
                      type="number" 
                      value={selectedElement?.width || 0}
                      onChange={(e) => updateElement(selectedId, { width: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Derinlik (cm)</label>
                    <input 
                      type="number" 
                      value={selectedElement?.height || 0}
                      onChange={(e) => updateElement(selectedId, { height: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rotasyon (Derece)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="360"
                      value={selectedElement?.rotation || 0}
                      onChange={(e) => updateElement(selectedId, { rotation: parseInt(e.target.value) })}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-xs font-black text-slate-700 w-8">{selectedElement?.rotation || 0}°</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Actions */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (selectedElement) {
                      const id = Math.random().toString(36).substr(2, 9);
                      addElement({ ...selectedElement, id });
                      setSelectedId(id);
                    }
                  }}
                  className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Kopyala
                </button>
                <button 
                  onClick={() => { removeElement(selectedId!); setSelectedId(null); }}
                  className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Öğeyi Sil
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setSelectedId(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Kaydet ve Kapat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <div className="flex-1 h-full relative">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={45} />
          <Scene 
            elements={elements} 
            selectedId={selectedId} 
            onSelect={setSelectedId} 
          />
        </Canvas>

        {/* Bottom Stats */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-xl px-8 py-4 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white flex items-center gap-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Sistem Aktif</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nesne Sayısı</span>
                <span className="text-xs font-black text-slate-800">{elements?.length || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Koltuk Kapasitesi</span>
                <span className="text-xs font-black text-slate-800">{elements?.filter(el => el.type === 'chair').length || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`p-4 rounded-2xl transition-all group relative flex items-center justify-center ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
    }`}
  >
    {icon}
    <span className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap pointer-events-none shadow-xl">
      {label}
    </span>
  </button>
);

export default PascalEditor;
