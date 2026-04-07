
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, Minus, XCircle, RotateCw, RotateCcw, Trash2, ZoomIn, ZoomOut, Maximize2, Monitor, Copy, ArrowUp, ArrowDown, AlignLeft, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenter, AlignJustify, Group, Ungroup, Ruler, Sparkles, Sun, Navigation, Box, Move } from 'lucide-react';
import { HallConfig, SeatData, HallElement, HallRow, ReferenceImage } from '../types';
import { motion } from 'motion/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, PerspectiveCamera, Environment, ContactShadows, 
  Float, MeshDistortMaterial, MeshWobbleMaterial, Grid, GizmoHelper, GizmoViewport,
  TransformControls, Html
} from '@react-three/drei';
import * as THREE from 'three';

interface SeatingPlanProps {
  hall: HallConfig;
  seating: Record<string, SeatData>;
  onSeatClick: (id: string) => void;
  isEditable?: boolean;
  isCalibrating?: boolean;
  isDrawingDimension?: boolean;
  isTapeMeasuring?: boolean;
  onCalibrationComplete?: (pixelDist: number) => void;
  onCancelCalibration?: () => void;
  onToggleDrawingDimension?: () => void;
  onToggleTapeMeasuring?: () => void;
  onToggleDrawingPolygon?: () => void;
  onToggleDrawingSunAngle?: () => void;
  isDrawingPolygon?: boolean;
  isDrawingSunAngle?: boolean;
  onUpdateHall?: (newConfig: HallConfig) => void;
  zoom?: number;
  previewElements?: HallElement[] | null;
  selectedElementIds: Set<string>;
  setSelectedElementIds: (ids: Set<string>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  getTemplateElements: (tmplId: string, centerX?: number, centerY?: number) => HallElement[];
  blockRows: number;
  blockChairs: number;
  handleRemoveElements: (ids: string[]) => void;
  handleDuplicateElements: (ids: string[]) => void;
  handleReorderElements: (ids: string[], direction: 'front' | 'back') => void;
  handleAlignElements: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;
  handleDistributeElements: (direction: 'horizontal' | 'vertical') => void;
  handleGroupElements: () => void;
  handleUngroupElements: () => void;
  handleUpdateElements: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void;
  selectionBoundingBox: { minX: number, minY: number, maxX: number, maxY: number, centerX: number, centerY: number } | null;
  showGrid?: boolean;
  showDimensions?: boolean;
  snapToGrid?: boolean;
  is3DMode?: boolean;
  onFileChange?: (file: File | null) => void;
  referenceImages?: ReferenceImage[];
  onUpdateReferenceImage?: (id: string, updates: Partial<ReferenceImage>) => void;
}

// 3D Scene Components
const ReferenceImage3D = ({ img }: { img: ReferenceImage }) => {
  const [video] = useState(() => {
    if (img.type === 'video') {
      const v = document.createElement('video');
      v.src = img.url;
      v.crossOrigin = "Anonymous";
      v.loop = true;
      v.muted = true;
      v.play().catch(err => console.error("Video play error:", err));
      return v;
    }
    return null;
  });

  const texture = useMemo(() => {
    if (img.type === 'video' && video) {
      return new THREE.VideoTexture(video);
    }
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    return loader.load(img.url, undefined, undefined, (err) => {
      console.error("Texture load error for:", img.url, err);
    });
  }, [img.url, img.type, video]);

  const aspectRatio = img.aspectRatio || 1;
  const width = 200 * aspectRatio;
  const height = 200;

  return (
    <group position={[img.x / 5, 0.5, img.y / 5]} rotation={[0, -(img.rotation * Math.PI) / 180, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow visible={img.visible}>
        <planeGeometry args={[width * img.scale, height * img.scale]} />
        <meshStandardMaterial 
          map={texture} 
          transparent 
          opacity={img.opacity || 0.9} 
          roughness={1} 
          metalness={0}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
    </group>
  );
};

const Polygon3D = ({ el, selectedElementIds }: { el: HallElement, selectedElementIds: Set<string> }) => {
  const isSelected = selectedElementIds.has(el.id);
  const points = el.points || [];
  if (points.length < 3) return null;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(points[0].x / 5, points[0].y / 5);
    for (let i = 1; i < points.length; i++) {
      s.lineTo(points[i].x / 5, points[i].y / 5);
    }
    s.closePath();
    return s;
  }, [points]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: (el.h || 20) / 2.5, // Yükseklik ölçeği
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelOffset: 0,
    bevelSegments: 2
  }), [el.h]);

  const zoningColors: Record<string, string> = {
    residential: '#fde047',
    commercial: '#ef4444',
    green: '#22c55e',
    education: '#3b82f6',
    health: '#a855f7',
    industrial: '#64748b',
    public: '#f97316'
  };

  const blockColor = el.zoningType ? zoningColors[el.zoningType] : (el.color || '#f1f5f9');

  return (
    <group position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial 
          color={blockColor} 
          roughness={0.4} 
          metalness={0.1}
          transparent={el.opacity !== undefined}
          opacity={el.opacity ?? 1}
        />
      </mesh>
      {/* Zoning Label in 3D */}
      {el.zoningType && (
        <group position={[points[0].x / 5, points[0].y / 5, extrudeSettings.depth + 0.5]}>
           {/* We could add a text sprite here later if needed */}
        </group>
      )}
      {isSelected && (
        <mesh position={[0, 0, 0.05]}>
          <extrudeGeometry args={[shape, { ...extrudeSettings, depth: extrudeSettings.depth + 0.2 }]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}
    </group>
  );
};

const Element3D = ({ el, selectedElementIds }: { el: HallElement, selectedElementIds: Set<string> }) => {
  const isSelected = selectedElementIds.has(el.id);
  
  if (el.type === 'polygon') {
    return <Polygon3D el={el} selectedElementIds={selectedElementIds} />;
  }

  const height = (el.h || 0) * 5 + 1;
  let actualHeight = height;
  let color = el.color || '#f8fafc';

  // Maket Modu için Özel Yükseklikler ve Renkler
  if (el.type === 'led-screen') actualHeight = 35;
  else if (el.type === 'stage') actualHeight = 10;
  else if (el.type === 'tree') actualHeight = 50;
  else if (el.type === 'car' || el.type === 'ambulance' || el.type === 'catering-truck') actualHeight = 15;
  else if (el.type === 'building') actualHeight = 120;
  else if (el.type === 'road') actualHeight = 0.8;
  else if (el.type === 'person') actualHeight = 22;
  else if (el.type === 'security-post') actualHeight = 30;

  if (!el.color) {
    if (el.type === 'chair') color = '#3b82f6';
    else if (el.type.includes('table')) color = '#f1f5f9';
    else if (el.type === 'stage') color = '#1e293b';
    else if (el.type === 'led-screen') color = '#0f172a';
    else if (el.type === 'tree') color = '#10b981';
    else if (el.type === 'car') color = '#64748b';
    else if (el.type === 'ambulance') color = '#ef4444';
    else if (el.type === 'catering-truck') color = '#f59e0b';
    else if (el.type === 'building') color = '#e2e8f0';
    else if (el.type === 'road') color = '#334155';
    else if (el.type === 'person') color = '#f59e0b';
    else if (el.type === 'security-post') color = '#1e293b';
  }

  const width = (el.width || 40) / 5;
  const depth = (el.height || 40) / 5;

  const renderModel = () => {
    switch (el.type) {
      case 'tree':
        return (
          <group>
            <mesh position={[0, -actualHeight/4, 0]} castShadow>
              <cylinderGeometry args={[width/8, width/8, actualHeight/2, 12]} />
              <meshStandardMaterial color="#94a3b8" roughness={1} />
            </mesh>
            <mesh position={[0, actualHeight/4, 0]} castShadow>
              <sphereGeometry args={[width/1.2, 24, 24]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
          </group>
        );
      case 'person':
        return (
          <group>
            <mesh position={[0, -actualHeight/6, 0]} castShadow>
              <cylinderGeometry args={[width/3, width/3, actualHeight/1.5, 12]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            <mesh position={[0, actualHeight/3, 0]} castShadow>
              <sphereGeometry args={[width/2.2, 16, 16]} />
              <meshStandardMaterial color="#fcd34d" roughness={0.5} />
            </mesh>
          </group>
        );
      case 'ambulance':
        return (
          <group>
            <mesh castShadow>
              <boxGeometry args={[width, actualHeight, depth]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, depth/2 + 0.05]}>
              <planeGeometry args={[width, actualHeight/4]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0, actualHeight/2 + 1, 0]} castShadow>
              <boxGeometry args={[width/4, 2, depth/4]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
            </mesh>
          </group>
        );
      case 'catering-truck':
        return (
          <group>
            <mesh castShadow>
              <boxGeometry args={[width, actualHeight, depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[width/2 + 0.05, 0, 0]} rotation={[0, Math.PI/2, 0]}>
              <planeGeometry args={[depth/1.5, actualHeight/2]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </group>
        );
      case 'led-screen':
        return (
          <group>
            <mesh position={[-width/3, -actualHeight/2, 0]} castShadow>
              <boxGeometry args={[0.5, actualHeight, 0.5]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[width/3, -actualHeight/2, 0]} castShadow>
              <boxGeometry args={[0.5, actualHeight, 0.5]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[width, actualHeight/1.5, 1]} />
              <meshStandardMaterial color="#000000" emissive="#3b82f6" emissiveIntensity={1} />
            </mesh>
          </group>
        );
      case 'security-post':
        return (
          <group>
            <mesh castShadow>
              <boxGeometry args={[width, actualHeight, depth]} />
              <meshStandardMaterial color={color} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, actualHeight/2, 0]} castShadow>
              <boxGeometry args={[width + 1, 1, depth + 1]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        );
      default:
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, actualHeight, depth]} />
            <meshStandardMaterial 
              color={color} 
              transparent 
              opacity={el.opacity || 1} 
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
        );
    }
  };

  return (
    <group position={[el.x / 5, actualHeight / 2 + 0.5, el.y / 5]} rotation={[0, -(el.rotation * Math.PI) / 180, 0]}>
      {renderModel()}
      {isSelected && (
        <mesh scale={[1.15, 1.15, 1.15]}>
          <boxGeometry args={[width, actualHeight, depth]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}
      {el.label && (
        <Html position={[0, actualHeight / 2 + 5, 0]} center>
          <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[11px] px-4 py-1.5 rounded-2xl whitespace-nowrap font-black uppercase tracking-widest pointer-events-none border-2 border-slate-100 shadow-2xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {el.label}
          </div>
        </Html>
      )}
    </group>
  );
};

const Scene3D = ({ hall, referenceImages, selectedElementIds }: { hall: HallConfig, referenceImages: ReferenceImage[], selectedElementIds: Set<string> }) => {
  const bgTexture = useMemo(() => {
    if (!hall.backgroundImage) return null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    return loader.load(hall.backgroundImage);
  }, [hall.backgroundImage]);

  // Calculate ground size based on hall or image aspect ratio
  const groundSize = 1000;

  return (
    <>
      <PerspectiveCamera makeDefault position={[400, 400, 400]} fov={30} />
      <OrbitControls 
        makeDefault 
        minPolarAngle={Math.PI / 6} 
        maxPolarAngle={Math.PI / 2.2} 
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={1200}
      />
      
      <Environment preset="studio" />
      <ambientLight intensity={1.2} />
      <spotLight 
        position={[400, 600, 400]} 
        angle={0.2} 
        penumbra={1} 
        intensity={2.5} 
        castShadow 
        shadow-mapSize={[4096, 4096]}
      />
      
      {/* Reality Capture Base Slab */}
      <group position={[0, -5.2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[groundSize + 200, 10, groundSize + 200]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
        </mesh>
        {/* Technical Grid on Base */}
        <Grid 
          position={[0, 5.1, 0]}
          infiniteGrid 
          fadeDistance={1500} 
          fadeStrength={15} 
          cellSize={20} 
          sectionSize={100} 
          sectionThickness={1} 
          sectionColor="#1e293b" 
          cellColor="#334155" 
        />
      </group>

      <group>
        {/* AUTOMATIC DIGITAL TWIN GROUND - The uploaded image becomes the 3D world */}
        {bgTexture && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[groundSize, groundSize]} />
            <meshStandardMaterial 
              map={bgTexture} 
              roughness={1} 
              metalness={0} 
              transparent 
              opacity={1}
            />
          </mesh>
        )}

        {/* Reference Images as additional 3D layers */}
        {referenceImages.map(img => (
          <ReferenceImage3D key={img.id} img={img} />
        ))}

        {/* Event Elements (Stage, Chairs, etc.) */}
        {hall.elements?.map(el => (
          <Element3D key={el.id} el={el} selectedElementIds={selectedElementIds} />
        ))}
      </group>

      <ContactShadows position={[0, 0.1, 0]} opacity={0.7} scale={groundSize} blur={2} far={20} />
      
      <GizmoHelper alignment="bottom-right" margin={[100, 100]}>
        <GizmoViewport axisColors={['#f87171', '#4ade80', '#60a5fa']} labelColor="white" />
      </GizmoHelper>
    </>
  );
};

const SeatingPlan: React.FC<SeatingPlanProps> = ({ 
  hall, seating, onSeatClick, isEditable, isCalibrating, isDrawingDimension, isTapeMeasuring, isDrawingPolygon, isDrawingSunAngle, onCalibrationComplete, onCancelCalibration, onToggleDrawingDimension, onToggleTapeMeasuring, onToggleDrawingPolygon, onToggleDrawingSunAngle, onUpdateHall, zoom = 1, previewElements,
  selectedElementIds, setSelectedElementIds, onUndo, onRedo,
  getTemplateElements, blockRows, blockChairs,
  handleRemoveElements, handleDuplicateElements, handleReorderElements,
  handleAlignElements, handleDistributeElements, handleGroupElements, handleUngroupElements, handleUpdateElements,
  selectionBoundingBox,
  showGrid = true,
  showDimensions = true,
  snapToGrid: shouldSnapToGrid = true,
  is3DMode = false,
  onFileChange,
  referenceImages = [],
  onUpdateReferenceImage
}) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture3D = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    setIsCapturing(true);
    setTimeout(() => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const blob = dataURItoBlob(dataUrl);
        const file = new File([blob], `seating_plan_3d_${Date.now()}.png`, { type: 'image/png' });
        
        if (onFileChange) {
          onFileChange(file);
          alert('3D Ekran görüntüsü başarıyla alındı ve davetiye görseli olarak ayarlandı.');
        } else {
          // Download if no onFileChange
          const link = document.createElement('a');
          link.download = `seating_plan_3d_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        }
      } catch (err) {
        console.error("Capture error:", err);
        alert('Ekran görüntüsü alınırken bir hata oluştu.');
      } finally {
        setIsCapturing(false);
      }
    }, 100);
  }, [onFileChange]);

  function dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  const [selectionBox, setSelectionBox] = React.useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [calibrationPoints, setCalibrationPoints] = React.useState<{x: number, y: number}[]>([]);
  const [dimensionDrawingPoints, setDimensionDrawingPoints] = React.useState<{x: number, y: number}[]>([]);
  const [tapeMeasurePoints, setTapeMeasurePoints] = React.useState<{x: number, y: number}[]>([]);
  const [polygonDrawingPoints, setPolygonDrawingPoints] = React.useState<{x: number, y: number}[]>([]);
  const [sunAnglePoints, setSunAnglePoints] = React.useState<{x: number, y: number}[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [interactionInfo, setInteractionInfo] = useState<{
    type: 'resize' | 'rotate' | null;
    value: string;
    x: number;
    y: number;
  } | null>(null);
  const [snappingGuides, setSnappingGuides] = useState<{ x?: number, y?: number } | null>(null);

  const selectedElementId = selectedElementIds.size === 1 ? Array.from(selectedElementIds)[0] : null;

  const getRealDim = (px: number, isArea: boolean = false) => {
    if (!hall.scaleCalibration) return `${Math.round(px)}${isArea ? 'px²' : 'px'}`;
    if (isArea) {
      const val = (px / Math.pow(hall.scaleCalibration.pixelDistance, 2)) * Math.pow(hall.scaleCalibration.realDistance, 2);
      return `${val.toFixed(2)} ${hall.scaleCalibration.unit}²`;
    }
    const val = (px / hall.scaleCalibration.pixelDistance) * hall.scaleCalibration.realDistance;
    return `${val.toFixed(2)} ${hall.scaleCalibration.unit}`;
  };

  // Keyboard listener for deletion and nudge
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditable) return;
      
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      // Handle drawing point deletion / cancel
      if (e.key === 'Escape') {
        setPolygonDrawingPoints([]);
        setSunAnglePoints([]);
        setTapeMeasurePoints([]);
        setCalibrationPoints([]);
        setDimensionDrawingPoints([]);
        
        if (isCalibrating) onCancelCalibration?.();
        if (isDrawingDimension) onToggleDrawingDimension?.();
        if (isTapeMeasuring) onToggleTapeMeasuring?.();
        if (isDrawingPolygon) onToggleDrawingPolygon?.();
        if (isDrawingSunAngle) onToggleDrawingSunAngle?.();
        return;
      }

      if (e.key === 'Backspace' && selectedElementIds.size === 0) {
        if (isDrawingPolygon && polygonDrawingPoints.length > 0) {
          setPolygonDrawingPoints(prev => prev.slice(0, -1));
          return;
        }
        if (isDrawingSunAngle && sunAnglePoints.length > 0) {
          setSunAnglePoints(prev => prev.slice(0, -1));
          return;
        }
        if (isTapeMeasuring && tapeMeasurePoints.length > 0) {
          setTapeMeasurePoints(prev => prev.slice(0, -1));
          return;
        }
        if (isDrawingDimension && dimensionDrawingPoints.length > 0) {
          setDimensionDrawingPoints(prev => prev.slice(0, -1));
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.size > 0) {
        if (!onUpdateHall || !hall.elements) return;
        const newElements = hall.elements.filter(el => !selectedElementIds.has(el.id));
        onUpdateHall({ ...hall, elements: newElements });
        setSelectedElementIds(new Set());
      }

      // Nudge with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.size > 0) {
        e.preventDefault();
        const step = e.ctrlKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        handleUpdateElements(Array.from(selectedElementIds), (el) => ({
          x: el.x + dx,
          y: el.y + dy
        }));
      }

      // Copy/Paste (Simple implementation)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementIds.size > 0) {
        // Store in local storage or state for simple copy
        localStorage.setItem('seating_plan_clipboard', JSON.stringify(
          hall.elements?.filter(el => selectedElementIds.has(el.id))
        ));
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const clipboard = localStorage.getItem('seating_plan_clipboard');
        if (clipboard && onUpdateHall && hall.elements) {
          const elementsToPaste = JSON.parse(clipboard) as HallElement[];
          const newElements = elementsToPaste.map(el => ({
            ...el,
            id: Math.random().toString(36).substr(2, 9),
            x: el.x + 20,
            y: el.y + 20
          }));
          onUpdateHall({ ...hall, elements: [...hall.elements, ...newElements] });
          setSelectedElementIds(new Set(newElements.map(el => el.id)));
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        onRedo?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, isEditable, hall.elements, onUpdateHall]);

  const workspaceWidth = hall.width || 1200;
  const workspaceHeight = hall.height || 800;

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditable || !onUpdateHall) return;
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const elementType = e.dataTransfer.getData('elementType');
    const templateId = e.dataTransfer.getData('templateId');
    const blockType = e.dataTransfer.getData('blockType');
    const blockChairs = parseInt(e.dataTransfer.getData('blockChairs') || '10');

    if (templateId) {
      const templateElements = getTemplateElements(templateId, x, y);
      onUpdateHall({
        ...hall,
        elements: [...(hall.elements || []), ...templateElements]
      });
      return;
    }

    let newElements: HallElement[] = [];

    if (elementType) {
      const id = Math.random().toString(36).substr(2, 9);
      let width = 40;
      let height = 40;
      let chairCount = undefined;

      if (elementType === 'table-round') { width = 120; height = 120; chairCount = 8; }
      if (elementType === 'table-rect') { width = 200; height = 100; chairCount = 6; }
      if (elementType === 'table-square') { width = 100; height = 100; chairCount = 4; }
      if (elementType === 'stage') { width = 400; height = 150; }

      newElements.push({
        id,
        type: elementType as any,
        x: x - width / 2,
        y: y - height / 2,
        rotation: 0,
        width,
        height,
        chairCount
      });
    } else if (blockType === 'row') {
      newElements = Array.from({ length: blockChairs }).map((_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: 'chair',
        x: x - (blockChairs * 25) + (i * 50),
        y: y - 20,
        rotation: 0,
        width: 40,
        height: 40
      }));
    } else if (blockType === 'table') {
      newElements.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'table-round',
        x: x - 75,
        y: y - 75,
        rotation: 0,
        width: 150,
        height: 150,
        chairCount: blockChairs,
      });
    }

    if (newElements.length > 0) {
      onUpdateHall({
        ...hall,
        elements: [...(hall.elements || []), ...newElements]
      });
      setSelectedElementIds(new Set(newElements.map(el => el.id)));
    }
  };

  const handleAddSeat = (rowIndex: number) => {
    if (!onUpdateHall) return;
    const newRows = [...hall.rows];
    const row = newRows[rowIndex];
    const nextNumber = (row.seats.filter(s => s.type === 'seat').length + 1).toString();
    row.seats.push({ number: nextNumber, type: 'seat' });
    onUpdateHall({ ...hall, rows: newRows });
  };

  const handleRemoveSeat = (rowIndex: number) => {
    if (!onUpdateHall) return;
    const newRows = [...hall.rows];
    const row = newRows[rowIndex];
    if (row.seats.length > 0) {
      row.seats.pop();
      onUpdateHall({ ...hall, rows: newRows });
    }
  };

  const handleAddRow = () => {
    if (!onUpdateHall) return;
    const lastRowChar = hall.rows.length > 0 ? hall.rows[hall.rows.length - 1].row : '@';
    const nextRowChar = String.fromCharCode(lastRowChar.charCodeAt(0) + 1);
    const newRows: HallRow[] = [...hall.rows, { row: nextRowChar, seats: Array.from({ length: 10 }, (_, i) => ({ number: (i + 1).toString(), type: 'seat' as const })) }];
    onUpdateHall({ ...hall, rows: newRows });
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (!onUpdateHall) return;
    const newRows = hall.rows.filter((_, i) => i !== rowIndex);
    onUpdateHall({ ...hall, rows: newRows });
  };

  const handleUpdateElement = (id: string, updates: Partial<HallElement>) => {
    if (!onUpdateHall || !hall.elements) return;
    const newElements = hall.elements.map(el => el.id === id ? { ...el, ...updates } : el);
    onUpdateHall({ ...hall, elements: newElements });
  };

  const selectedElements = useMemo(() => 
    hall.elements?.filter(el => selectedElementIds.has(el.id)) || [], 
  [hall.elements, selectedElementIds]);

  const handleRemoveElement = (id: string) => {
    handleRemoveElements?.([id]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable || e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
    
    if (!e.ctrlKey) {
      setSelectedElementIds(new Set());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setMousePos({ x, y });

    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);

      // Update selection
      if (hall.elements) {
        const xMin = Math.min(selectionBox.x1, x);
        const xMax = Math.max(selectionBox.x1, x);
        const yMin = Math.min(selectionBox.y1, y);
        const yMax = Math.max(selectionBox.y1, y);

        const newSelected = new Set(e.ctrlKey ? selectedElementIds : []);
        hall.elements.forEach(el => {
          const elWidth = el.width || 40;
          const elHeight = el.height || 40;
          if (el.x < xMax && el.x + elWidth > xMin && el.y < yMax && el.y + elHeight > yMin) {
            newSelected.add(el.id);
          }
        });
        setSelectedElementIds(newSelected);
      }
    }
  };

  const handleMouseUp = () => {
    setSelectionBox(null);
  };

  const handleWorkspaceResize = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = workspaceWidth;
    const startHeight = workspaceHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!onUpdateHall) return;
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'right' || direction === 'corner') {
        newWidth = Math.max(800, startWidth + (moveEvent.clientX - startX) / zoom);
      }
      if (direction === 'bottom' || direction === 'corner') {
        newHeight = Math.max(600, startHeight + (moveEvent.clientY - startY) / zoom);
      }
      
      onUpdateHall({ ...hall, width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const [isDragOver, setIsDragOver] = React.useState(false);
  const [groupDragOffset, setGroupDragOffset] = React.useState({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [ghostPos, setGhostPos] = React.useState<{ x: number, y: number } | null>(null);
  const [activeGuides, setActiveGuides] = React.useState<{ x?: number, y?: number } | null>(null);

  const snapSize = useMemo(() => {
    if (!hall.scaleCalibration) return 10;
    const oneMeterPx = hall.scaleCalibration.pixelDistance / hall.scaleCalibration.realDistance;
    if (oneMeterPx >= 100) return oneMeterPx / 10; // 0.1m snap
    if (oneMeterPx >= 20) return oneMeterPx / 2; // 0.5m snap
    return oneMeterPx; // 1m snap
  }, [hall.scaleCalibration]);

  const gridSize = useMemo(() => {
    if (!hall.scaleCalibration) return 24;
    const oneMeterPx = hall.scaleCalibration.pixelDistance / hall.scaleCalibration.realDistance;
    if (oneMeterPx >= 20 && oneMeterPx <= 150) return oneMeterPx;
    if (oneMeterPx < 20) {
      if (oneMeterPx * 5 >= 20) return oneMeterPx * 5;
      return oneMeterPx * 10;
    }
    return oneMeterPx / 2;
  }, [hall.scaleCalibration]);

  const snapToGrid = (val: number) => shouldSnapToGrid ? Math.round(val / snapSize) * snapSize : val;

  const renderRulers = () => {
    if (!isEditable) return null;
    
    const oneMeterPx = hall.scaleCalibration ? hall.scaleCalibration.pixelDistance / hall.scaleCalibration.realDistance : 100;
    const majorStep = hall.scaleCalibration ? (oneMeterPx >= 50 ? 1 : 5) : 100; // 1m or 5m steps
    const minorStep = majorStep / 5;
    
    const topTicks = [];
    for (let x = 0; x <= workspaceWidth; x += minorStep * oneMeterPx) {
      const isMajor = Math.round(x / (majorStep * oneMeterPx) * 100) / 100 % 1 === 0;
      topTicks.push(
        <div 
          key={`top-${x}`} 
          className={`absolute top-0 h-full border-l border-slate-300/50 flex flex-col justify-end pb-1 px-1 ${isMajor ? 'h-4 border-slate-400' : 'h-2'}`}
          style={{ left: x }}
        >
          {isMajor && (
            <span className="text-[7px] font-black text-slate-500 leading-none">
              {hall.scaleCalibration ? `${Math.round(x / oneMeterPx * 10) / 10}m` : `${Math.round(x)}px`}
            </span>
          )}
        </div>
      );
    }

    const leftTicks = [];
    for (let y = 0; y <= workspaceHeight; y += minorStep * oneMeterPx) {
      const isMajor = Math.round(y / (majorStep * oneMeterPx) * 100) / 100 % 1 === 0;
      leftTicks.push(
        <div 
          key={`left-${y}`} 
          className={`absolute left-0 w-full border-t border-slate-300/50 flex items-end justify-end pr-1 py-1 ${isMajor ? 'w-4 border-slate-400' : 'w-2'}`}
          style={{ top: y }}
        >
          {isMajor && (
            <span className="text-[7px] font-black text-slate-500 leading-none origin-bottom-right -rotate-90 translate-y-1">
              {hall.scaleCalibration ? `${Math.round(y / oneMeterPx * 10) / 10}m` : `${Math.round(y)}px`}
            </span>
          )}
        </div>
      );
    }

    return (
      <>
        {/* Top Ruler */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-white border-t border-x border-slate-300 rounded-t-lg overflow-hidden pointer-events-none z-[10] shadow-sm">
          {topTicks}
        </div>
        {/* Left Ruler */}
        <div className="absolute top-0 -left-6 bottom-0 w-6 bg-white border-l border-y border-slate-300 rounded-l-lg overflow-hidden pointer-events-none z-[10] shadow-sm">
          {leftTicks}
        </div>
        {/* Corner Square */}
        <div className="absolute -top-6 -left-6 w-6 h-6 bg-slate-100 border-t border-l border-slate-300 rounded-tl-lg z-[11] flex items-center justify-center">
          <Ruler className="w-3 h-3 text-slate-400" />
        </div>
      </>
    );
  };

  const renderScaleBar = () => {
    if (!hall.scaleCalibration) return null;
    const oneMeterPx = hall.scaleCalibration.pixelDistance / hall.scaleCalibration.realDistance;
    const barLengthM = hall.scaleCalibration.realDistance >= 50 ? 10 : 5;
    const barPx = oneMeterPx * barLengthM;

    return (
      <div className="absolute bottom-6 right-6 z-[3000] pointer-events-none flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{barLengthM} METRE</span>
        </div>
        <div className="flex h-1.5 border-x border-slate-400" style={{ width: barPx }}>
          <div className="flex-1 bg-slate-800" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-slate-800" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-slate-800" />
        </div>
      </div>
    );
  };

  const getMagneticPos = (x: number, y: number, width: number, height: number, excludeIds: Set<string>) => {
    let nx = shouldSnapToGrid ? snapToGrid(x) : x;
    let ny = shouldSnapToGrid ? snapToGrid(y) : y;
    const threshold = 15;
    let guides: { x?: number, y?: number } = {};

    if (!hall.elements) return { x: nx, y: ny, guides };

    // Snap to other elements
    for (const el of hall.elements) {
      if (excludeIds.has(el.id)) continue;

      const elWidth = el.width || 40;
      const elHeight = el.height || 40;

      // Vertical alignment (X axis)
      const xPoints = [
        { val: el.x, snap: el.x }, // Left to Left
        { val: el.x + elWidth, snap: el.x + elWidth }, // Left to Right
        { val: el.x + elWidth / 2, snap: el.x + elWidth / 2 }, // Center to Center
        { val: el.x - width, snap: el.x - width }, // Right to Left
        { val: el.x + elWidth - width, snap: el.x + elWidth - width }, // Right to Right
        { val: el.x + elWidth / 2 - width / 2, snap: el.x + elWidth / 2 - width / 2 } // Center to Center
      ];

      for (const p of xPoints) {
        if (Math.abs(x - p.val) < threshold) {
          nx = p.snap;
          guides.x = p.val + (p.val === p.snap ? 0 : width); // Adjust guide position for right/center snaps
          if (p.val === el.x + elWidth / 2 || p.val === el.x + elWidth / 2 - width / 2) {
             guides.x = el.x + elWidth / 2;
          } else if (p.val === el.x - width || p.val === el.x) {
             guides.x = el.x;
          } else {
             guides.x = el.x + elWidth;
          }
          break;
        }
      }

      // Horizontal alignment (Y axis)
      const yPoints = [
        { val: el.y, snap: el.y }, // Top to Top
        { val: el.y + elHeight, snap: el.y + elHeight }, // Top to Bottom
        { val: el.y + elHeight / 2, snap: el.y + elHeight / 2 }, // Center to Center
        { val: el.y - height, snap: el.y - height }, // Bottom to Top
        { val: el.y + elHeight - height, snap: el.y + elHeight - height }, // Bottom to Bottom
        { val: el.y + elHeight / 2 - height / 2, snap: el.y + elHeight / 2 - height / 2 } // Center to Center
      ];

      for (const p of yPoints) {
        if (Math.abs(y - p.val) < threshold) {
          ny = p.snap;
          if (p.val === el.y + elHeight / 2 || p.val === el.y + elHeight / 2 - height / 2) {
            guides.y = el.y + elHeight / 2;
          } else if (p.val === el.y - height || p.val === el.y) {
            guides.y = el.y;
          } else {
            guides.y = el.y + elHeight;
          }
          break;
        }
      }
    }

    return { x: nx, y: ny, guides };
  };

  const renderElement = (el: HallElement) => {
    if (el.type === 'led-screen') {
      const fontSize = Math.min(el.width || 160, el.height || 10) / 1.2;
      return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-blue-900/95 rounded-sm border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)]"></div>
          <span 
            className="text-blue-100 font-black tracking-[0.2em] uppercase opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center px-2"
            style={{ fontSize: `${Math.max(8, fontSize)}px` }}
          >
            {el.label || 'LED EKRAN'}
          </span>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-blue-300/50"></div>
        </div>
      );
    }

    if (el.type === 'stage') {
      const fontSize = Math.min(el.width || 200, el.height || 100) / 5;
      return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-800/95 rounded-2xl border-2 border-slate-700 shadow-2xl">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
          <span 
            className="text-white font-black tracking-[0.4em] uppercase opacity-95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-center px-6"
            style={{ fontSize: `${fontSize}px` }}
          >
            {el.label || 'SAHNE'}
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-blue-500/40 shadow-[0_-4px_15px_rgba(59,130,246,0.6)]"></div>
          {/* Stage Detail Lines */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/10"></div>
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/10"></div>
        </div>
      );
    }

    if (el.type === 'text') {
      const fontSize = Math.min(el.width || 100, el.height || 40) / 2.5;
      return (
        <div className="w-full h-full flex items-center justify-center p-2 bg-white/50 backdrop-blur-sm rounded-xl border border-dashed border-slate-200 hover:border-blue-500 transition-colors">
          <span 
            className="font-black text-slate-800 text-center break-words leading-tight"
            style={{ fontSize: `${fontSize}px` }}
          >
            {el.label || 'METİN'}
          </span>
        </div>
      );
    }

    if (el.type === 'chair') {
      const chairData = seating[el.id];
      let chairBg = 'bg-slate-100';
      let chairBorder = 'border-slate-200';
      let chairText = 'text-slate-500';

      if (chairData) {
        if (chairData.type === 'ozel') { chairBg = 'bg-amber-400'; chairBorder = 'border-amber-600'; chairText = 'text-black'; }
        else if (chairData.type === 'dolu') { chairBg = 'bg-blue-600'; chairBorder = 'border-blue-800'; chairText = 'text-white'; }
        else if (chairData.type === 'bekliyor') { chairBg = 'bg-slate-400'; chairBorder = 'border-slate-500'; chairText = 'text-white'; }
      }

      return (
        <div className={`w-full h-full ${chairBg} border ${chairBorder} rounded-xl flex flex-col items-center justify-center shadow-sm group-hover:border-blue-400 transition-colors relative overflow-hidden p-1`}>
          <span className={`text-[10px] font-black ${chairText} truncate w-full text-center`}>
            {el.seatNumber || el.label || ''}
          </span>
        </div>
      );
    }

    if (el.type.includes('table')) {
      const isRound = el.type === 'table-round';
      const chairCount = el.chairCount || 8;
      const w = el.width || 120;
      const h = el.height || 120;

      return (
        <>
          <span className="font-black uppercase tracking-tighter select-none text-xs text-slate-400">
            {el.seatNumber || el.label || ''}
          </span>
          {Array.from({ length: chairCount }).map((_, i) => {
            let cx = 0;
            let cy = 0;
            let rotation = 0;

            if (isRound) {
              const angle = (i / chairCount) * Math.PI * 2;
              const radiusX = w / 2 + 25;
              const radiusY = h / 2 + 25;
              cx = Math.cos(angle) * radiusX;
              cy = Math.sin(angle) * radiusY;
              rotation = angle * 180 / Math.PI + 90;
            } else {
              // Improved Rectangular/Square placement logic for better symmetry
              const isSquare = el.type === 'table-square';
              
              // Determine chairs per side
              let chairsPerSide = { top: 0, right: 0, bottom: 0, left: 0 };
              
              if (isSquare) {
                const base = Math.floor(chairCount / 4);
                const extra = chairCount % 4;
                chairsPerSide = {
                  top: base + (extra > 0 ? 1 : 0),
                  right: base + (extra > 1 ? 1 : 0),
                  bottom: base + (extra > 2 ? 1 : 0),
                  left: base
                };
              } else {
                // For rectangular, distribute based on aspect ratio
                const ratio = w / (w + h);
                const horizontalTotal = Math.max(2, Math.round(chairCount * ratio));
                const verticalTotal = chairCount - horizontalTotal;
                
                chairsPerSide.top = Math.ceil(horizontalTotal / 2);
                chairsPerSide.bottom = horizontalTotal - chairsPerSide.top;
                chairsPerSide.right = Math.ceil(verticalTotal / 2);
                chairsPerSide.left = verticalTotal - chairsPerSide.right;
              }

              // Determine which side this chair belongs to
              let sideIndex = i;
              if (sideIndex < chairsPerSide.top) {
                // Top side
                const count = chairsPerSide.top;
                const spacing = w / (count + 1);
                cx = (sideIndex + 1) * spacing - w / 2;
                cy = -h / 2 - 25;
                rotation = 0;
              } else if (sideIndex < chairsPerSide.top + chairsPerSide.right) {
                // Right side
                sideIndex -= chairsPerSide.top;
                const count = chairsPerSide.right;
                const spacing = h / (count + 1);
                cx = w / 2 + 25;
                cy = (sideIndex + 1) * spacing - h / 2;
                rotation = 90;
              } else if (sideIndex < chairsPerSide.top + chairsPerSide.right + chairsPerSide.bottom) {
                // Bottom side
                sideIndex -= (chairsPerSide.top + chairsPerSide.right);
                const count = chairsPerSide.bottom;
                const spacing = w / (count + 1);
                cx = w / 2 - (sideIndex + 1) * spacing;
                cy = h / 2 + 25;
                rotation = 180;
              } else {
                // Left side
                sideIndex -= (chairsPerSide.top + chairsPerSide.right + chairsPerSide.bottom);
                const count = chairsPerSide.left;
                const spacing = h / (count + 1);
                cx = -w / 2 - 25;
                cy = h / 2 - (sideIndex + 1) * spacing;
                rotation = 270;
              }
            }
            
            const chairId = `${el.id}-${i + 1}`;
            const chairData = seating[chairId];
            
            let chairBg = 'bg-slate-100';
            let chairBorder = 'border-slate-200';
            let chairText = 'text-slate-500';
            
            if (chairData) {
              if (chairData.type === 'ozel') { chairBg = 'bg-amber-400'; chairBorder = 'border-amber-600'; chairText = 'text-black'; }
              else if (chairData.type === 'dolu') { chairBg = 'bg-blue-600'; chairBorder = 'border-blue-800'; chairText = 'text-white'; }
              else if (chairData.type === 'bekliyor') { chairBg = 'bg-slate-400'; chairBorder = 'border-slate-500'; chairText = 'text-white'; }
            }

            return (
              <div 
                key={i}
                className={`absolute w-8 h-8 ${chairBg} border ${chairBorder} rounded-lg flex flex-col items-center justify-center text-[9px] font-bold ${chairText} shadow-sm z-10 p-0.5`}
                style={{
                  left: `calc(50% + ${cx}px - 16px)`,
                  top: `calc(50% + ${cy}px - 16px)`,
                  transform: `rotate(${rotation}deg)`
                }}
              >
                <span className="text-[10px] font-black">{i + 1}</span>
              </div>
            );
          })}
        </>
      );
    }

    if (el.type === 'dimension-line') {
      const x1 = el.x;
      const y1 = el.y;
      const x2 = el.x2 || x1 + 100;
      const y2 = el.y2 || y1;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const isSelected = selectedElementIds.has(el.id);
      
      return (
        <div 
          key={el.id}
          className={`absolute pointer-events-auto group/dim cursor-pointer ${isSelected ? 'z-50' : 'z-10'}`}
          style={{
            left: x1,
            top: y1,
            width: dist,
            height: 20, // Hit area
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0 50%',
            marginTop: -10, // Center hit area
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!e.ctrlKey) {
              setSelectedElementIds(new Set([el.id]));
            } else {
              const next = new Set(selectedElementIds);
              if (next.has(el.id)) next.delete(el.id);
              else next.add(el.id);
              setSelectedElementIds(next);
            }
          }}
        >
          {/* The actual line */}
          <div 
            className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 transition-all ${isSelected ? 'ring-4 ring-blue-500/20' : ''}`}
            style={{ backgroundColor: el.color || '#3b82f6' }}
          >
            {/* End Caps */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-4 bg-inherit" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-0.5 h-4 bg-inherit" />
          </div>
          
          {/* Label */}
          <div 
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full pb-2 whitespace-nowrap pointer-events-none"
            style={{ transform: `rotate(${-angle}deg)` }}
          >
            <div className={`bg-white/90 backdrop-blur-sm border px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1.5 transition-all ${isSelected ? 'border-blue-500 scale-110' : 'border-slate-200'}`}>
              <Ruler className={`w-3 h-3 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-black ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{getRealDim(dist)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (el.type === 'work-area') {
      const w = el.width || 100;
      const h = el.height || 100;
      const isSelected = selectedElementIds.has(el.id);
      
      // Calculate area in m2
      let areaM2 = 0;
      if (hall.scaleCalibration) {
        const wM = (w / hall.scaleCalibration.pixelDistance) * hall.scaleCalibration.realDistance;
        const hM = (h / hall.scaleCalibration.pixelDistance) * hall.scaleCalibration.realDistance;
        areaM2 = wM * hM;
      }

      return (
        <div 
          className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-emerald-400/50 bg-emerald-400/10'}`}
          style={{ 
            backgroundColor: isSelected ? undefined : el.color ? `${el.color}${Math.round((el.opacity || 0.2) * 255).toString(16).padStart(2, '0')}` : undefined,
            borderColor: el.color || undefined
          }}
        >
          <div className="flex flex-col items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-xl border border-emerald-100 scale-90">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">{el.label || 'ÇALIŞMA ALANI'}</span>
            {hall.scaleCalibration && (
              <div className="flex items-center gap-1.5 text-slate-900">
                <Maximize2 className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-black">{areaM2.toFixed(2)} m²</span>
              </div>
            )}
          </div>
          
          {/* Corner Labels for dimensions */}
          {isSelected && hall.scaleCalibration && (
            <>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full pb-1 text-[9px] font-black text-emerald-600 whitespace-nowrap">
                {getRealDim(w)}
              </div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 text-[9px] font-black text-emerald-600 whitespace-nowrap rotate-90 origin-right">
                {getRealDim(h)}
              </div>
            </>
          )}
        </div>
      );
    }

    if (el.type === 'ui-button') {
      return (
        <div className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg">
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">{el.label || 'YENİ SIRA EKLE'}</span>
        </div>
      );
    }

    if (el.type === 'polygon') {
      const isSelected = selectedElementIds.has(el.id);
      const points = el.points || [];
      if (points.length < 2) return null;

      // Calculate bounding box for area display
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      const width = maxX - minX;
      const height = maxY - minY;

      // Simple polygon area calculation (Shoelace formula)
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
      }
      area = Math.abs(area) / 2;

      const pointsString = points.map(p => `${p.x - el.x},${p.y - el.y}`).join(' ');

      return (
        <div className="w-full h-full pointer-events-none overflow-visible">
          <svg 
            className="absolute overflow-visible" 
            style={{ left: 0, top: 0 }}
            width={width}
            height={height}
          >
            <polygon
              points={pointsString}
              fill={el.color || '#8b5cf6'}
              fillOpacity={el.opacity || 0.3}
              stroke={el.color || '#8b5cf6'}
              strokeWidth={isSelected ? 4 : 2}
              strokeDasharray={isSelected ? "8 4" : "none"}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm border border-violet-100 flex flex-col items-center">
              <span className="text-[8px] font-black text-violet-600 uppercase tracking-tighter">{el.label || 'ALAN'}</span>
              <span className="text-[10px] font-black text-slate-900">{getRealDim(area, true)}²</span>
            </div>
          </div>
        </div>
      );
    }

    if (el.type === 'sun-angle') {
      const x1 = 0;
      const y1 = 0;
      const x2 = (el.x2 || el.x + 50) - el.x;
      const y2 = (el.y2 || el.y + 50) - el.y;
      const dist = Math.sqrt(x2 * x2 + y2 * y2);
      const angle = Math.atan2(y2, x2) * (180 / Math.PI);
      const isSelected = selectedElementIds.has(el.id);

      return (
        <div className="w-full h-full flex items-center justify-center overflow-visible">
          <div 
            className="absolute origin-left flex items-center"
            style={{ 
              left: '50%', 
              top: '50%', 
              width: dist,
              transform: `rotate(${angle}deg) translate(-50%, -50%)`
            }}
          >
            <div className="h-1 bg-amber-500 w-full rounded-full shadow-lg shadow-amber-200" />
            <div 
              className="absolute right-0 translate-x-1/2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-xl ring-4 ring-amber-100 animate-pulse"
            >
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div className="absolute left-0 -translate-x-1/2 w-3 h-3 bg-amber-600 rounded-full" />
          </div>
          <div className="absolute -top-8 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg border border-amber-100 flex items-center gap-2">
            <Navigation className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{el.label || 'GÜNEŞ AÇISI'}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center gap-1 min-w-max pt-12 pl-12 pb-40 pr-12 relative transition-all duration-300 ${
        isDragOver ? 'bg-blue-50/50 scale-[1.01] ring-4 ring-blue-500/10 rounded-[40px]' : ''
      } ${isEditable ? 'bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] bg-[size:24px_24px]' : ''}`}
      style={{
        width: workspaceWidth,
        height: workspaceHeight,
        border: isEditable ? '2px dashed #cbd5e1' : 'none',
        borderRadius: '40px',
        position: 'relative'
      }}
      onMouseDown={(e) => {
        if (isCalibrating || isDrawingDimension || isTapeMeasuring || isDrawingPolygon || isDrawingSunAngle) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = (e.clientX - rect.left) / zoom;
          const y = (e.clientY - rect.top) / zoom;
          
          if (isCalibrating) {
            const newPoints = [...calibrationPoints, { x, y }];
            setCalibrationPoints(newPoints);
            
            if (newPoints.length === 2) {
              const dx = newPoints[1].x - newPoints[0].x;
              const dy = newPoints[1].y - newPoints[0].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              onCalibrationComplete?.(dist);
              setCalibrationPoints([]);
            }
          } else if (isDrawingDimension) {
            const newPoints = [...dimensionDrawingPoints, { x, y }];
            setDimensionDrawingPoints(newPoints);
            
            if (newPoints.length === 2) {
              const newElement: HallElement = {
                id: `dim_${Date.now()}`,
                type: 'dimension-line',
                x: newPoints[0].x,
                y: newPoints[0].y,
                x2: newPoints[1].x,
                y2: newPoints[1].y,
                rotation: 0,
                color: '#3b82f6',
              };
              onUpdateHall?.({ ...hall, elements: [...(hall.elements || []), newElement] });
              setDimensionDrawingPoints([]);
            }
          } else if (isTapeMeasuring) {
            const newPoints = [...tapeMeasurePoints, { x, y }];
            setTapeMeasurePoints(newPoints);
            if (newPoints.length === 2) {
              setTapeMeasurePoints([]);
            }
          } else if (isDrawingPolygon) {
            const newPoints = [...polygonDrawingPoints, { x, y }];
            setPolygonDrawingPoints(newPoints);
          } else if (isDrawingSunAngle) {
            const newPoints = [...sunAnglePoints, { x, y }];
            setSunAnglePoints(newPoints);
            
            if (newPoints.length === 2) {
              const newElement: HallElement = {
                id: `sun_${Date.now()}`,
                type: 'sun-angle',
                x: newPoints[0].x,
                y: newPoints[0].y,
                x2: newPoints[1].x,
                y2: newPoints[1].y,
                rotation: 0,
                label: 'GÜNEŞ AÇISI'
              };
              onUpdateHall?.({ ...hall, elements: [...(hall.elements || []), newElement] });
              setSunAnglePoints([]);
            }
          }
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const tmplId = e.dataTransfer.getData('templateId');
        const tmplName = e.dataTransfer.getData('templateName');
        const elementType = e.dataTransfer.getData('elementType');
        const blockRowsData = e.dataTransfer.getData('blockRows');
        const blockChairsData = e.dataTransfer.getData('blockChairs');
        
        const currentBlockRows = blockRowsData ? parseInt(blockRowsData) : blockRows;
        const currentBlockChairs = blockChairsData ? parseInt(blockChairsData) : blockChairs;
        
        if (elementType && onUpdateHall) {
          const rect = e.currentTarget.getBoundingClientRect();
          const dropX = (e.clientX - rect.left) / zoom;
          const dropY = (e.clientY - rect.top) / zoom;

          if (elementType === 'block-row-10') {
            const newElements: HallElement[] = Array.from({ length: currentBlockChairs }).map((_, i) => ({
              id: Math.random().toString(36).substr(2, 9),
              type: 'chair',
              x: snapToGrid(dropX - (currentBlockChairs * 25) + (i * 50)),
              y: snapToGrid(dropY - 20),
              rotation: 0,
              width: 40,
              height: 40
            }));
            onUpdateHall({ ...hall, elements: [...(hall.elements || []), ...newElements] });
            return;
          }

          if (elementType === 'block-table-10') {
            const newElement: HallElement = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'table-round',
              x: snapToGrid(dropX - 75),
              y: snapToGrid(dropY - 75),
              rotation: 0,
              width: 150,
              height: 150,
              chairCount: currentBlockChairs,
            };
            onUpdateHall({ ...hall, elements: [...(hall.elements || []), newElement] });
            return;
          }

          let width = 40;
          let height = 40;
          if (elementType.includes('table')) { width = 120; height = 120; }
          else if (elementType === 'stage') { width = 400; height = 100; }
          else if (elementType === 'ui-button') { width = 160; height = 44; }

          const newElement: HallElement = {
            id: Math.random().toString(36).substr(2, 9),
            type: elementType as any,
            x: snapToGrid(dropX - width / 2),
            y: snapToGrid(dropY - height / 2),
            rotation: 0,
            width,
            height,
            chairCount: elementType.includes('table') ? currentBlockChairs : undefined,
            label: elementType === 'stage' ? 'SAHNE' : elementType === 'ui-button' ? 'YENİ SIRA EKLE' : undefined
          };
          onUpdateHall({ ...hall, elements: [...(hall.elements || []), newElement] });
          return;
        }

        if (tmplId && onUpdateHall) {
          const rect = e.currentTarget.getBoundingClientRect();
          const dropX = (e.clientX - rect.left) / zoom;
          const dropY = (e.clientY - rect.top) / zoom;
          
          if (tmplId.endsWith('_free')) {
            const newElements = getTemplateElements(tmplId, dropX, dropY);
            onUpdateHall({ ...hall, elements: [...(hall.elements || []), ...newElements] });
            return;
          } else {
            // Handle legacy row-based templates
            let newRows: any[] = [];
            if (tmplId === 'theatre') {
              newRows = [
                { row: 'A', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'B', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'C', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'classroom') {
              newRows = [
                { row: 'A', seats: [
                  { number: '1', type: 'seat' }, { number: '2', type: 'seat' }, { number: 'G1', type: 'gap' },
                  { number: '3', type: 'seat' }, { number: '4', type: 'seat' }, { number: 'G2', type: 'gap' },
                  { number: '5', type: 'seat' }, { number: '6', type: 'seat' }
                ] },
                { row: 'B', seats: [
                  { number: '1', type: 'seat' }, { number: '2', type: 'seat' }, { number: 'G1', type: 'gap' },
                  { number: '3', type: 'seat' }, { number: '4', type: 'seat' }, { number: 'G2', type: 'gap' },
                  { number: '5', type: 'seat' }, { number: '6', type: 'seat' }
                ] },
              ];
            } else if (tmplId === 'ushape') {
              newRows = [
                { row: 'SOL', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'ARKA', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'SAĞ', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'banquet' || tmplId === 'round') {
              newRows = [
                { row: 'MASA 1', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'MASA 2', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'MASA 3', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'protocol') {
              newRows = [
                { row: 'PROTOKOL', seats: Array(15).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'square') {
              newRows = [
                { row: 'KUZEY', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'DOĞU', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'GÜNEY', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'BATI', seats: Array(6).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            } else if (tmplId === 'amphi') {
              newRows = [
                { row: 'A', seats: Array(8).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'B', seats: Array(10).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'C', seats: Array(12).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
                { row: 'D', seats: Array(14).fill(0).map((_, i) => ({ number: (i+1).toString(), type: 'seat' })) },
              ];
            }
            
            onUpdateHall({
              ...hall,
              name: tmplName || hall.name,
              rows: newRows.length > 0 ? newRows as any : hall.rows,
              stage: tmplId === 'banquet' || tmplId === 'round' ? undefined : { label: 'SAHNE', position: 'top', size: 'medium' }
            });
          }
        }
      }}
    >
      {is3DMode ? (
        <div className="absolute inset-0 z-[100] bg-slate-900 rounded-[40px] overflow-hidden">
          {/* Reality Capture Workstation Overlays */}
      <div className="absolute top-8 left-8 flex flex-col gap-4 pointer-events-none z-50">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-2xl min-w-[280px]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-white uppercase tracking-widest leading-none mb-1">3D ÇALIŞMA ALANI</h4>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em]">REALITYCAPTURE MODU</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'SAĞ TIK İLE DÖNDÜR', icon: RotateCw },
              { label: 'SOL TIK İLE KAYDIR', icon: Move },
              { label: 'TEKERLEK İLE YAKINLAŞ', icon: Maximize2 },
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-400">
                <tip.icon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{tip.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 pointer-events-auto active:scale-95">
              <Monitor className="w-4 h-4" />
              EKRAN GÖRÜNTÜSÜ AL
            </button>
          </div>

          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[9px] text-slate-500 font-bold text-center uppercase tracking-widest leading-relaxed">
              FOTOGRAMETRİ VERİLERİ AKTİF<br/>SİMÜLASYON MODU ÇALIŞIYOR
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-2 pointer-events-none opacity-40 z-50">
        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">REAL-TIME RENDER ENGINE</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">V.2.5.0 - PRO WORKSTATION</span>
      </div>

      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
            <Scene3D hall={hall} referenceImages={referenceImages} selectedElementIds={selectedElementIds} />
          </Canvas>
          
          {/* 3D Overlay Controls */}
          <div className="absolute top-8 left-8 z-[200] flex flex-col gap-6 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/90 backdrop-blur-2xl border-2 border-blue-500/30 p-8 rounded-[40px] shadow-2xl shadow-blue-500/20"
            >
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                  <Box className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">3D ÇALIŞMA ALANI</h3>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-2 block">REALİTYCAPTURE MODU</span>
                </div>
              </div>
              
              <div className="space-y-4 border-t border-white/10 pt-6">
                {[
                  { label: 'SAĞ TIK İLE DÖNDÜR', icon: RotateCw },
                  { label: 'SOL TIK İLE KAYDIR', icon: Move },
                  { label: 'TEKERLEK İLE YAKINLAŞ', icon: ZoomIn },
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-4 text-slate-400">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                      <tip.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{tip.label}</span>
                  </div>
                ))}
                {/* Screenshot Button */}
                <button 
                  onClick={handleCapture3D}
                  disabled={isCapturing}
                  className="w-full mt-4 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-500/20 border-b-4 border-blue-800 pointer-events-auto disabled:opacity-50"
                >
                  {isCapturing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      GÖRÜNTÜ ALINIYOR...
                    </>
                  ) : (
                    <>
                      <Monitor className="w-5 h-5" /> EKRAN GÖRÜNTÜSÜ AL
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <p className="text-[9px] font-bold text-blue-300 leading-relaxed uppercase tracking-widest text-center">
                  FOTOGRAMETRİ VERİLERİ AKTİF<br/>
                  SİMÜLASYON MODU ÇALIŞIYOR
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <>
          {/* Reference Images Layer */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {referenceImages.filter(img => img.visible).map(img => (
              <motion.div 
                key={img.id}
                drag={isEditable && !img.isLocked}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const newX = (info.point.x - rect.left) / zoom;
                  const newY = (info.point.y - rect.top) / zoom;
                  onUpdateReferenceImage?.(img.id, { x: newX, y: newY });
                }}
                className="absolute origin-center pointer-events-auto"
                style={{
                  left: img.x,
                  top: img.y,
                  width: `${1000 * (img.aspectRatio || 1)}px`,
                  height: '1000px',
                  opacity: img.opacity,
                  transform: `scale(${img.scale}) rotate(${img.rotation}deg)`,
                  cursor: img.isLocked ? 'default' : 'move',
                }}
              >
                {img.type === 'video' ? (
                  <video 
                    src={img.url} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${img.url})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
              </motion.div>
            ))}
            {/* Legacy background image support */}
            {hall.backgroundImage && (
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${hall.backgroundImage})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.5
                }}
              />
            )}
          </div>

          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: showGrid ? `radial-gradient(#e2e8f0 1.5px, transparent 1.5px), linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)` : 'none',
              backgroundSize: showGrid ? '40px 40px, 40px 40px, 40px 40px' : 'auto',
              opacity: 0.5
            }}
          />
        </>
      )}
      {/* Design Area Content Wrapper */}
      <div className="relative w-full h-full flex flex-col items-center pointer-events-none z-[1]">
        <div className="pointer-events-auto flex flex-col items-center">
          {/* SAHNE (STAGE) - ÜST KONUM (Movable) */}
          {hall.stage?.position === 'top' && !hall.elements?.some(el => el.type === 'stage') && (
            <motion.div 
              drag={isEditable}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => {
                if (!onUpdateHall) return;
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const newX = (info.point.x - rect.left) / zoom;
                const newY = (info.point.y - rect.top) / zoom;
                
                const newElements: HallElement[] = [...(hall.elements || []), {
                  id: `stage_${Date.now()}`,
                  type: 'stage',
                  x: newX,
                  y: newY,
                  rotation: 0,
                  label: hall.stage?.label || 'SAHNE',
                  width: hall.stage?.size === 'small' ? 256 : hall.stage?.size === 'large' ? 600 : 384,
                  height: hall.stage?.size === 'small' ? 80 : hall.stage?.size === 'large' ? 128 : 96
                } as HallElement];
                
                onUpdateHall({ ...hall, stage: undefined, elements: newElements });
              }}
              className={`
                mb-12 rounded-b-[24px] bg-slate-900 border-x-2 border-b-2 border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden group cursor-move
                ${hall.stage.size === 'small' ? 'w-56 h-14' : hall.stage.size === 'large' ? 'w-[500px] h-24' : 'w-80 h-18'}
              `}
            >
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
              
              {/* Hover Label */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full whitespace-nowrap shadow-2xl border border-slate-700 z-10 flex items-center gap-2 pointer-events-none translate-y-2 group-hover:translate-y-0">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                SAHNE ALANI (TAŞINABİLİR)
              </div>

              <span className="text-white font-black tracking-[0.4em] text-[10px] uppercase opacity-90 relative z-[1]">{hall.stage.label || 'SAHNE'}</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
              
              {isEditable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateHall?.({ ...hall, stage: undefined }); }}
                    className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          <div className={`flex flex-col items-center gap-1 ${hall.stage?.position === 'bottom' ? 'flex-col-reverse' : ''}`}>
            {hall.rows.map((rowConfig, idx) => {
              if (rowConfig.type === 'label') {
                return (
                  <div key={idx} className="w-full py-6 flex items-center justify-center">
                    <div className="bg-rose-500 text-white px-10 py-2.5 rounded-full font-black text-xs tracking-[0.6em] uppercase shadow-2xl animate-in fade-in zoom-in duration-500">
                      {rowConfig.row}
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className={`flex items-center justify-center gap-2 group relative ${hall.stage?.position === 'bottom' ? 'flex-row-reverse' : ''}`}>
                  {isEditable && (
                    <div className={`absolute ${hall.stage?.position === 'bottom' ? '-right-20' : '-left-20'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                        title="Sırayı Sil"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleRemoveSeat(idx)}
                        className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                        title="Koltuk Çıkar"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAddSeat(idx)}
                        className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Koltuk Ekle"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="w-8 h-10 flex items-center justify-end text-[12px] font-black text-blue-500 transition-colors shrink-0 pr-2">
                    {rowConfig.row}
                  </div>
                  
                  <div className={`flex items-center gap-[2px] ${hall.stage?.position === 'bottom' ? 'flex-row-reverse' : ''}`}>
                    {rowConfig.seats.map((seat, sIdx) => {
                      if (seat.type === 'gap') {
                        return (
                          <div key={sIdx} className={`${seat.size === 'large' ? 'w-12' : 'w-4'} h-10 flex items-center justify-center shrink-0`}>
                            <div className="w-[1px] h-4 bg-slate-300 opacity-30" />
                          </div>
                        );
                      }
                      
                      const seatId = `${rowConfig.row}${seat.number}`;
                      const data = seating[seatId];
                      const isStatic = seat.type === 'static';
                      
                      let bgColor = 'bg-slate-100 hover:bg-slate-200';
                      let borderColor = 'border-slate-200';
                      let textColor = 'text-slate-500';
                      
                      if (isStatic) {
                        bgColor = 'bg-slate-400 cursor-default';
                        borderColor = 'border-slate-500';
                        textColor = 'text-white';
                      } else if (data) {
                        if (data.type === 'ozel') { 
                          bgColor = 'bg-amber-400 hover:bg-amber-500'; 
                          borderColor = 'border-amber-600'; 
                          textColor = 'text-black';
                        }
                        else if (data.type === 'dolu') { 
                          bgColor = 'bg-blue-600 hover:bg-blue-700'; 
                          borderColor = 'border-blue-800'; 
                          textColor = 'text-white';
                        }
                        else if (data.type === 'bekliyor') { 
                          bgColor = 'bg-slate-400 hover:bg-slate-500'; 
                          borderColor = 'border-slate-500'; 
                          textColor = 'text-white';
                        }
                      }

                      const seatShape = hall.stage?.position === 'top' ? 'rounded-t-md rounded-b-xl' : 'rounded-b-md rounded-t-xl';

                      return (
                        <div 
                          key={sIdx}
                          onDoubleClick={() => !isStatic && onSeatClick(seatId)}
                          className={`
                            w-[40px] h-11 ${seatShape} border flex flex-col items-center justify-center relative 
                            transition-all duration-150 cursor-pointer hover:scale-125 hover:z-50 group/seat
                            ${bgColor} ${borderColor} ${textColor}
                            ${isStatic ? 'opacity-50' : ''}
                          `}
                        >
                          <span className="absolute top-0.5 right-1 text-[7px] font-bold opacity-60 leading-none">{seat.number}</span>
                          <span className="text-[11px] font-black leading-tight text-center px-0.5 uppercase overflow-hidden truncate w-full">
                            {isStatic ? seat.number : (data ? (() => {
                              const fullName = data.data?.i || '';
                              const cleanName = fullName.replace(/\(Eşi\)/g, '').trim();
                              const parts = cleanName.split(' ');
                              const initials = (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '');
                              return initials;
                            })() : '')}
                          </span>
                          
                          {!isStatic && data && (
                            <div className={`absolute ${hall.stage?.position === 'top' ? 'top-full mt-3' : 'bottom-full mb-3'} left-1/2 -translate-x-1/2 hidden group-hover/seat:block z-[100] w-max max-w-[200px] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150`}>
                              {hall.stage?.position === 'top' && (
                                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-1 border-l border-t border-slate-700" />
                              )}
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl text-[10px] border border-slate-700">
                                <p className="font-bold opacity-60 mb-0.5 tracking-widest uppercase">{data.data?.u}</p>
                                <p className="font-black text-sm">{data.data?.i}</p>
                              </div>
                              {hall.stage?.position !== 'top' && (
                                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="w-8 h-10 flex items-center justify-start text-[12px] font-black text-blue-500 transition-colors shrink-0 pl-2">
                    {rowConfig.row}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* SAHNE (STAGE) - ALT KONUM (Movable) */}
          {hall.stage?.position === 'bottom' && !hall.elements?.some(el => el.type === 'stage') && (
            <motion.div 
              drag={isEditable}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => {
                // When dragged, convert to a regular element to allow full movement
                if (!onUpdateHall) return;
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const newX = (info.point.x - rect.left) / zoom;
                const newY = (info.point.y - rect.top) / zoom;
                
                const newElements: HallElement[] = [...(hall.elements || []), {
                  id: `stage_${Date.now()}`,
                  type: 'stage',
                  x: newX,
                  y: newY,
                  rotation: 0,
                  label: hall.stage?.label || 'SAHNE',
                  width: hall.stage?.size === 'small' ? 256 : hall.stage?.size === 'large' ? 600 : 384,
                  height: hall.stage?.size === 'small' ? 80 : hall.stage?.size === 'large' ? 128 : 96
                } as HallElement];
                
                onUpdateHall({ ...hall, stage: undefined, elements: newElements });
              }}
              className={`
                mt-12 rounded-t-[40px] bg-slate-800 border-x-4 border-t-4 border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden group cursor-move
                ${hall.stage.size === 'small' ? 'w-64 h-20' : hall.stage.size === 'large' ? 'w-[600px] h-32' : 'w-96 h-24'}
              `}
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <span className="text-white font-black tracking-[0.3em] text-sm uppercase opacity-80">{hall.stage.label || 'SAHNE'}</span>
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/30"></div>
              
              {isEditable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateHall?.({ ...hall, stage: undefined }); }}
                    className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Free-form Elements Layer */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        {/* Workspace Resize Handles */}
        {isEditable && (
          <>
            {/* Right Edge */}
            <div 
              className="absolute top-0 -right-1 w-2 h-full cursor-e-resize hover:bg-blue-500/30 transition-colors pointer-events-auto"
              onMouseDown={(e) => handleWorkspaceResize(e, 'right')}
            />
            {/* Bottom Edge */}
            <div 
              className="absolute -bottom-1 left-0 w-full h-2 cursor-s-resize hover:bg-blue-500/30 transition-colors pointer-events-auto"
              onMouseDown={(e) => handleWorkspaceResize(e, 'bottom')}
            />
            {/* Corner Handle */}
            <div 
              className="absolute -bottom-2 -right-2 w-8 h-8 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all pointer-events-auto bg-white border-2 border-slate-200 rounded-full shadow-lg hover:scale-110 active:scale-95"
              onMouseDown={(e) => handleWorkspaceResize(e, 'corner')}
            >
              <Maximize2 className="w-5 h-5" />
            </div>
          </>
        )}

        {/* Calibration Line */}
        {isCalibrating && calibrationPoints.length === 1 && (
          <div 
            className="absolute border-2 border-blue-500 z-[2000] pointer-events-none shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            style={{
              left: calibrationPoints[0].x,
              top: calibrationPoints[0].y,
              width: Math.sqrt(Math.pow(mousePos.x - calibrationPoints[0].x, 2) + Math.pow(mousePos.y - calibrationPoints[0].y, 2)),
              transform: `rotate(${Math.atan2(mousePos.y - calibrationPoints[0].y, mousePos.x - calibrationPoints[0].x)}rad)`,
              transformOrigin: 'left center'
            }}
          >
            {/* End Caps */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500" />
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-2xl shadow-2xl whitespace-nowrap flex flex-col items-center gap-1 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Ruler className="w-3 h-3 text-blue-400" />
                <span className="leading-none tracking-widest">{Math.round(Math.sqrt(Math.pow(mousePos.x - calibrationPoints[0].x, 2) + Math.pow(mousePos.y - calibrationPoints[0].y, 2)))} PX</span>
              </div>
              {hall.scaleCalibration && (
                <div className="text-[9px] text-blue-400 border-t border-white/10 pt-1 mt-1 flex items-center gap-1.5">
                  <span className="opacity-50">≈</span>
                  <span className="font-black tracking-wider uppercase">
                    {getRealDim(Math.sqrt(Math.pow(mousePos.x - calibrationPoints[0].x, 2) + Math.pow(mousePos.y - calibrationPoints[0].y, 2)))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calibration Guide Overlay */}
        {(isCalibrating || isDrawingDimension || isTapeMeasuring || isDrawingPolygon || isDrawingSunAngle) && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[3000] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={`text-white px-6 py-3 rounded-[32px] shadow-2xl flex items-center gap-4 border-2 border-white/20 backdrop-blur-md pointer-events-auto ${
              isTapeMeasuring ? 'bg-amber-600 shadow-amber-200' : 
              isDrawingPolygon ? 'bg-indigo-600 shadow-indigo-200' :
              isDrawingSunAngle ? 'bg-amber-500 shadow-amber-100' :
              'bg-blue-600 shadow-blue-200'
            }`}>
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="pr-4 border-r border-white/20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">
                  {isCalibrating ? 'Kalibrasyon Modu' : 
                   isDrawingDimension ? 'Ölçüm Çizgisi Modu' : 
                   isTapeMeasuring ? 'Şerit Metre (Hızlı Ölçüm)' :
                   isDrawingPolygon ? 'Çokgen Alan Çizimi' :
                   'Güneş Açısı Belirle'}
                </p>
                <p className="text-sm font-black tracking-tight leading-none">
                  {isCalibrating ? (
                    calibrationPoints.length === 0 ? 'İlk noktayı seçin' : 'İkinci noktayı seçerek mesafeyi tamamlayın'
                  ) : isDrawingDimension ? (
                    dimensionDrawingPoints.length === 0 ? 'Çizgi başlangıcını seçin' : 'Bitiş noktasını seçin'
                  ) : isTapeMeasuring ? (
                    tapeMeasurePoints.length === 0 ? 'Ölçüm için ilk noktayı seçin' : 'Bitiş noktasını seçerek mesafeyi görün'
                  ) : isDrawingPolygon ? (
                    polygonDrawingPoints.length === 0 ? 'Başlangıç noktasını seçin' : 'Sıradaki noktayı seçin (Kapatmak için ilk noktaya tıklayın)'
                  ) : (
                    sunAnglePoints.length === 0 ? 'Güneş kaynağını seçin' : 'Işık yönünü seçin'
                  )}
                </p>
              </div>
              
              {/* Point Management Buttons */}
              <div className="flex items-center gap-2 px-2 border-r border-white/20">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDrawingPolygon) setPolygonDrawingPoints(prev => prev.slice(0, -1));
                    if (isDrawingSunAngle) setSunAnglePoints(prev => prev.slice(0, -1));
                    if (isTapeMeasuring) setTapeMeasurePoints(prev => prev.slice(0, -1));
                    if (isDrawingDimension) setDimensionDrawingPoints(prev => prev.slice(0, -1));
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90 flex items-center gap-2"
                  title="Son Noktayı Sil"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Geri Al</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPolygonDrawingPoints([]);
                    setSunAnglePoints([]);
                    setTapeMeasurePoints([]);
                    setCalibrationPoints([]);
                    setDimensionDrawingPoints([]);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90 flex items-center gap-2"
                  title="Tümünü Temizle"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Temizle</span>
                </button>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCalibrating) onCancelCalibration?.();
                  if (isDrawingDimension) onToggleDrawingDimension?.();
                  if (isTapeMeasuring) onToggleTapeMeasuring?.();
                  if (isDrawingPolygon) onToggleDrawingPolygon?.();
                  if (isDrawingSunAngle) onToggleDrawingSunAngle?.();
                }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                title="Durdur"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Dimension Drawing Points */}
        {isDrawingDimension && dimensionDrawingPoints.map((p, i) => (
          <div 
            key={i}
            className="absolute w-4 h-4 bg-blue-600 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 z-[2001] pointer-events-none shadow-lg"
            style={{ left: p.x, top: p.y }}
          />
        ))}

        {/* Dimension Drawing Line */}
        {isDrawingDimension && dimensionDrawingPoints.length === 1 && (
          <div 
            className="absolute h-0.5 bg-blue-600/50 z-[2000] pointer-events-none origin-left"
            style={{
              left: dimensionDrawingPoints[0].x,
              top: dimensionDrawingPoints[0].y,
              width: Math.sqrt(Math.pow(mousePos.x - dimensionDrawingPoints[0].x, 2) + Math.pow(mousePos.y - dimensionDrawingPoints[0].y, 2)),
              transform: `rotate(${Math.atan2(mousePos.y - dimensionDrawingPoints[0].y, mousePos.x - dimensionDrawingPoints[0].x) * (180 / Math.PI)}deg)`
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 shadow-2xl">
              <Ruler className="w-3 h-3 text-blue-400" />
              <span>{getRealDim(Math.sqrt(Math.pow(mousePos.x - dimensionDrawingPoints[0].x, 2) + Math.pow(mousePos.y - dimensionDrawingPoints[0].y, 2)))}</span>
            </div>
          </div>
        )}


        {/* Polygon Drawing Preview */}
        {isDrawingPolygon && polygonDrawingPoints.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-[2000]">
            <svg className="w-full h-full overflow-visible">
              <polyline
                points={polygonDrawingPoints.map(p => `${p.x},${p.y}`).join(' ') + ` ${mousePos.x},${mousePos.y}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {polygonDrawingPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill="#8b5cf6" stroke="white" strokeWidth="2" />
              ))}
              <circle cx={mousePos.x} cy={mousePos.y} r="4" fill="white" stroke="#8b5cf6" strokeWidth="2" />
            </svg>
            
            {/* Segment Length Preview */}
            {polygonDrawingPoints.length > 0 && (
              <div 
                className="absolute bg-slate-900 text-white px-2 py-1 rounded-lg text-[9px] font-black shadow-xl"
                style={{ left: mousePos.x + 10, top: mousePos.y + 10 }}
              >
                {getRealDim(Math.sqrt(Math.pow(mousePos.x - polygonDrawingPoints[polygonDrawingPoints.length-1].x, 2) + Math.pow(mousePos.y - polygonDrawingPoints[polygonDrawingPoints.length-1].y, 2)))}
              </div>
            )}
          </div>
        )}

        {/* Sun Angle Preview */}
        {isDrawingSunAngle && sunAnglePoints.length === 1 && (
          <div className="absolute inset-0 pointer-events-none z-[2000]">
            <svg className="w-full h-full overflow-visible">
              <line
                x1={sunAnglePoints[0].x}
                y1={sunAnglePoints[0].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle cx={sunAnglePoints[0].x} cy={sunAnglePoints[0].y} r="4" fill="#f59e0b" stroke="white" strokeWidth="2" />
            </svg>
            <div 
              className="absolute w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-xl -translate-x-1/2 -translate-y-1/2"
              style={{ left: mousePos.x, top: mousePos.y }}
            >
              <Sun className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        {/* Calibration Points */}
        {isCalibrating && calibrationPoints.map((p, i) => (
          <div 
            key={i}
            className="absolute w-4 h-4 bg-blue-600 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 z-[2001] pointer-events-none shadow-lg"
            style={{ left: p.x, top: p.y }}
          />
        ))}

        {/* Tape Measure Preview Line */}
        {isTapeMeasuring && tapeMeasurePoints.length === 1 && (
          <div 
            className="absolute h-0.5 bg-amber-500/50 z-[2000] pointer-events-none origin-left"
            style={{
              left: tapeMeasurePoints[0].x,
              top: tapeMeasurePoints[0].y,
              width: Math.sqrt(Math.pow(mousePos.x - tapeMeasurePoints[0].x, 2) + Math.pow(mousePos.y - tapeMeasurePoints[0].y, 2)),
              transform: `rotate(${Math.atan2(mousePos.y - tapeMeasurePoints[0].y, mousePos.x - tapeMeasurePoints[0].x) * (180 / Math.PI)}deg)`
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 shadow-2xl">
              <Ruler className="w-3 h-3 text-amber-400" />
              <span>{getRealDim(Math.sqrt(Math.pow(mousePos.x - tapeMeasurePoints[0].x, 2) + Math.pow(mousePos.y - tapeMeasurePoints[0].y, 2)))}</span>
            </div>
          </div>
        )}

        {/* Tape Measure Points */}
        {isTapeMeasuring && tapeMeasurePoints.map((p, i) => (
          <div 
            key={i}
            className="absolute w-4 h-4 bg-amber-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 z-[2001] pointer-events-none shadow-lg"
            style={{ left: p.x, top: p.y }}
          />
        ))}

        {/* Calibration Preview Line */}
        {isCalibrating && calibrationPoints.length === 1 && (
          <div 
            className="absolute h-0.5 bg-blue-600/50 z-[2000] pointer-events-none origin-left"
            style={{
              left: calibrationPoints[0].x,
              top: calibrationPoints[0].y,
              width: Math.sqrt(Math.pow(mousePos.x - calibrationPoints[0].x, 2) + Math.pow(mousePos.y - calibrationPoints[0].y, 2)),
              transform: `rotate(${Math.atan2(mousePos.y - calibrationPoints[0].y, mousePos.x - calibrationPoints[0].x) * (180 / Math.PI)}deg)`
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 shadow-2xl">
              <Ruler className="w-3 h-3 text-blue-400" />
              <span>{Math.round(Math.sqrt(Math.pow(mousePos.x - calibrationPoints[0].x, 2) + Math.pow(mousePos.y - calibrationPoints[0].y, 2)))} PX</span>
              {hall.scaleCalibration && (
                <span className="text-blue-400 border-l border-white/20 pl-2">
                  ~{getRealDim(Math.sqrt(Math.pow(mousePos.x - calibrationPoints[0].x, 2) + Math.pow(mousePos.y - calibrationPoints[0].y, 2)))}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Snapping Guides */}
        {activeGuides && (
          <div className="absolute inset-0 pointer-events-none z-[1500]">
            {activeGuides.x !== undefined && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                style={{ left: activeGuides.x }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500" />
              </div>
            )}
            {activeGuides.y !== undefined && (
              <div 
                className="absolute left-0 right-0 h-px bg-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                style={{ top: activeGuides.y }}
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
              </div>
            )}
          </div>
        )}

        {/* Scale Ruler */}
        {hall.scaleCalibration && (
          <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-xl border border-slate-200/50 p-5 rounded-[32px] shadow-2xl z-[1000] flex flex-col gap-4 pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                <Ruler className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-1.5">Mekan Ölçeği</p>
                <p className="text-base font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                  100 PX <span className="text-slate-300 font-light">≈</span> <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{Math.round((100 / hall.scaleCalibration.pixelDistance) * hall.scaleCalibration.realDistance * 100) / 100}</span> <span className="text-[10px] text-slate-400 uppercase">{hall.scaleCalibration.unit}</span>
                </p>
              </div>
            </div>
            
            {/* Visual Ruler */}
            <div className="relative h-8 flex items-center px-2">
              <div className="absolute inset-x-0 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-blue-600/20 w-full" />
              </div>
              
              {/* Ticks */}
              <div className="absolute inset-x-0 flex justify-between items-end h-full">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className="flex flex-col items-center gap-1">
                    <div className={`w-0.5 rounded-full bg-slate-300 ${tick % 50 === 0 ? 'h-4' : 'h-2'}`} />
                    <span className="text-[8px] font-black text-slate-400">{tick === 100 ? 'MAX' : tick}</span>
                  </div>
                ))}
              </div>

              {/* Active Indicator */}
              <motion.div 
                className="absolute h-1 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                initial={false}
                animate={{ width: `${Math.min(100, (hall.scaleCalibration.pixelDistance / hall.scaleCalibration.realDistance) / 100 * 100)}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
          </div>
        )}

        {/* Workspace Dimensions Badge */}
      {hall.scaleCalibration && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Genişlik</span>
              <span className="text-xs font-black text-white leading-none">{getRealDim(workspaceWidth)}</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Yükseklik</span>
              <span className="text-xs font-black text-white leading-none">{getRealDim(workspaceHeight)}</span>
            </div>
          </div>
        </div>
      )}

      {renderRulers()}
      {renderScaleBar()}

      {/* Interaction Info Overlay (Dimensions/Angle) */}
        {interactionInfo && (
          <div 
            className="absolute bg-slate-900/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black z-[3000] pointer-events-none shadow-2xl border border-white/20 backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              left: interactionInfo.x, 
              top: interactionInfo.y - 40,
              transform: 'translateX(-50%)'
            }}
          >
            <div className={`w-2 h-2 rounded-full ${interactionInfo.type === 'resize' ? 'bg-blue-400' : 'bg-amber-400'} animate-pulse`} />
            {interactionInfo.value}
          </div>
        )}

      {/* Selection Box (Marquee) */}
      {selectionBox && (
        <div 
          className="absolute border-2 border-blue-500 bg-blue-500/10 z-[1000] pointer-events-none rounded-sm"
          style={{
            left: Math.min(selectionBox.x1, selectionBox.x2),
            top: Math.min(selectionBox.y1, selectionBox.y2),
            width: Math.abs(selectionBox.x2 - selectionBox.x1),
            height: Math.abs(selectionBox.y2 - selectionBox.y1),
          }}
        />
      )}

      {/* Snapping Guides */}
      {activeGuides && (
          <>
            {activeGuides.x !== undefined && (
              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-blue-500/50 z-[200] pointer-events-none"
                style={{ left: activeGuides.x }}
              />
            )}
            {activeGuides.y !== undefined && (
              <div 
                className="absolute left-0 right-0 h-[1px] bg-blue-500/50 z-[200] pointer-events-none"
                style={{ top: activeGuides.y }}
              />
            )}
          </>
        )}

        {/* Ghost Preview */}
        {isEditable && ghostPos && activeDragId && (
          <div 
            className="absolute border-2 border-blue-400/50 bg-blue-400/10 rounded-xl pointer-events-none z-[50]"
            style={{
              left: ghostPos.x,
              top: ghostPos.y,
              width: (hall.elements?.find(el => el.id === activeDragId)?.width || 40),
              height: (hall.elements?.find(el => el.id === activeDragId)?.height || 40),
            }}
          />
        )}

        {/* Template Preview Elements (Hover Ghost) */}
        {previewElements && !isCalibrating && !isDrawingDimension && !isTapeMeasuring && !isDrawingPolygon && !isDrawingSunAngle && (
          <div 
            style={{
              position: 'absolute',
              left: mousePos.x,
              top: mousePos.y,
              pointerEvents: 'none',
              zIndex: 200,
              opacity: 0.5
            }}
          >
            {previewElements.map((el) => (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width || 40,
                  height: el.height || 40,
                  rotate: `${el.rotation || 0}deg`,
                  zIndex: 100,
                  pointerEvents: 'none'
                }}
                className="flex items-center justify-center border-2 border-blue-400 border-dashed rounded-lg bg-blue-50/50"
              >
                {renderElement(el)}
              </div>
            ))}
          </div>
        )}

        {/* Selection Bounding Box / Group Container */}
        {selectionBoundingBox && selectedElementIds.size > 1 && (
          <div 
            className="absolute border-2 border-blue-500/40 border-dashed rounded-3xl pointer-events-none z-[150] bg-blue-500/5 animate-[pulse_3s_infinite]"
            style={{
              left: selectionBoundingBox.minX - 20 + groupDragOffset.x,
              top: selectionBoundingBox.minY - 20 + groupDragOffset.y,
              width: (selectionBoundingBox.maxX - selectionBoundingBox.minX) + 40,
              height: (selectionBoundingBox.maxY - selectionBoundingBox.minY) + 40,
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
              GRUP SEÇİLİ ({selectedElementIds.size} Öğe)
            </div>
          </div>
        )}

        {/* Contextual Toolbar removed - now in App.tsx */}

        {hall.elements?.map((el) => {
          const isSelected = selectedElementIds.has(el.id);
          const isBeingDragged = activeDragId === el.id;
          const shouldApplyGroupOffset = isSelected && activeDragId !== null && !isBeingDragged;
          const seatId = el.seatNumber;
          const data = seatId ? seating[seatId] : null;
          
          let bgColor = 'bg-slate-200';
          let borderColor = 'border-slate-300';
          let textColor = 'text-slate-500';

          if (el.type === 'chair' && data) {
            if (data.type === 'ozel') { bgColor = 'bg-amber-400'; borderColor = 'border-amber-600'; textColor = 'text-black'; }
            else if (data.type === 'dolu') { bgColor = 'bg-blue-600'; borderColor = 'border-blue-800'; textColor = 'text-white'; }
            else if (data.type === 'bekliyor') { bgColor = 'bg-slate-400'; borderColor = 'border-slate-500'; textColor = 'text-white'; }
          } else if (el.type.includes('table')) {
            bgColor = 'bg-slate-700';
            borderColor = 'border-slate-600';
            textColor = 'text-white';
          } else if (el.type === 'stage') {
            bgColor = 'bg-slate-800';
            borderColor = 'border-slate-700';
            textColor = 'text-white';
          } else if (el.type === 'ui-button') {
            bgColor = 'bg-blue-600';
            borderColor = 'border-blue-500';
            textColor = 'text-white';
          }

          return (
            <motion.div
              key={el.id}
              drag={isEditable}
              dragMomentum={false}
              dragElastic={0}
              dragTransition={{ power: 0, timeConstant: 0 }}
              onDragStart={() => {
                setActiveDragId(el.id);
              }}
              onDrag={(_, info) => {
                const deltaX = info.offset.x / zoom;
                const deltaY = info.offset.y / zoom;
                
                const width = el.width || 40;
                const height = el.height || 40;
                const { x: snappedX, y: snappedY, guides } = getMagneticPos(el.x + deltaX, el.y + deltaY, width, height, selectedElementIds);
                
                setGhostPos({ x: snappedX, y: snappedY });
                setActiveGuides(guides);

                if (selectedElementIds.has(el.id) && selectedElementIds.size > 1) {
                  const dx = snappedX - el.x;
                  const dy = snappedY - el.y;
                  setGroupDragOffset({ x: dx, y: dy });
                }
              }}
              onDragEnd={(_, info) => {
                const deltaX = info.offset.x / zoom;
                const deltaY = info.offset.y / zoom;
                const width = el.width || 40;
                const height = el.height || 40;
                const { x: snappedX, y: snappedY } = getMagneticPos(el.x + deltaX, el.y + deltaY, width, height, selectedElementIds);
                
                const dx = snappedX - el.x;
                const dy = snappedY - el.y;

                if (selectedElementIds.has(el.id) && selectedElementIds.size > 1) {
                  if (!onUpdateHall || !hall.elements) return;
                  const newElements = hall.elements.map(item => {
                    if (selectedElementIds.has(item.id)) {
                      return {
                        ...item,
                        x: item.x + dx,
                        y: item.y + dy
                      };
                    }
                    return item;
                  });
                  onUpdateHall({ ...hall, elements: newElements });
                } else {
                  handleUpdateElement(el.id, { x: snappedX, y: snappedY });
                }

                setActiveDragId(null);
                setGroupDragOffset({ x: 0, y: 0 });
                setGhostPos(null);
                setActiveGuides(null);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (el.type === 'chair' && el.seatNumber) {
                  onSeatClick(el.seatNumber);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (el.type === 'ui-button') {
                  handleAddRow();
                  return;
                }
                
                const newSelected = new Set(selectedElementIds);
                const isAlreadySelected = newSelected.has(el.id);
                const isMultiSelect = e.ctrlKey || e.metaKey;

                if (isAlreadySelected) {
                  if (isMultiSelect) {
                    // Toggle off
                    if (el.groupId) {
                      hall.elements?.filter(e => e.groupId === el.groupId).forEach(e => newSelected.delete(e.id));
                    } else {
                      newSelected.delete(el.id);
                    }
                  } else if (selectedElementIds.size > 1) {
                    // If multiple selected and we click one of them without Ctrl, select ONLY that one/group
                    newSelected.clear();
                    if (el.groupId) {
                      hall.elements?.filter(e => e.groupId === el.groupId).forEach(e => newSelected.add(e.id));
                    } else {
                      newSelected.add(el.id);
                    }
                  }
                  // If only this one is selected and we click it without Ctrl, keep it selected (standard behavior)
                } else {
                  if (!isMultiSelect) {
                    newSelected.clear();
                  }
                  if (el.groupId) {
                    hall.elements?.filter(e => e.groupId === el.groupId).forEach(e => newSelected.add(e.id));
                  } else {
                    newSelected.add(el.id);
                  }
                }
                setSelectedElementIds(newSelected);
              }}
              className={`
                absolute pointer-events-auto cursor-move flex items-center justify-center
                ${bgColor} ${borderColor} ${textColor} border shadow-sm
                ${isSelected ? 'shadow-2xl shadow-blue-500/40 ring-2 ring-blue-500 ring-offset-2' : ''}
                ${isBeingDragged ? 'opacity-50 scale-105 shadow-2xl' : ''}
                ${el.type === 'chair' ? 'rounded-xl border-2' : el.type === 'table-round' ? 'rounded-full border-4' : el.type === 'stage' ? 'rounded-b-[40px] border-x-4 border-b-4' : el.type === 'work-area' ? 'rounded-3xl border-2' : 'rounded-2xl border-4'}
                transition-shadow duration-200
              `}
              style={{
                left: el.x + (shouldApplyGroupOffset ? groupDragOffset.x : 0),
                top: el.y + (shouldApplyGroupOffset ? groupDragOffset.y : 0),
                width: el.width || (el.type === 'stage' ? 400 : 40),
                height: el.height || (el.type === 'stage' ? 100 : 40),
                rotate: el.rotation,
                zIndex: (el.z || 0) + (isSelected ? 200 : 100),
                scale: 1 + (el.h || 0) * 0.05,
                boxShadow: el.h ? `0 ${el.h * 4}px ${el.h * 8}px rgba(0,0,0,0.2)` : undefined,
                backgroundColor: (el.type !== 'chair' && el.type !== 'stage' && !el.type.includes('table') && el.color) ? el.color : undefined,
                opacity: (el.type !== 'chair' && el.type !== 'stage' && !el.type.includes('table') && el.opacity) ? el.opacity : undefined
              }}
            >
              {/* Selection Ring */}
              {isSelected && (
                <div className="absolute -inset-3 border-4 border-blue-500/30 border-dashed rounded-[inherit] animate-[pulse_2s_infinite]" />
              )}

              {/* Dimensions Overlay */}
              {showDimensions && isSelected && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-md whitespace-nowrap z-[300] opacity-80">
                  {hall.scaleCalibration ? (
                    <>
                      {Math.round((el.width || 40) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100} x {Math.round((el.height || 40) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100} {hall.scaleCalibration.unit}
                    </>
                  ) : (
                    <>
                      {Math.round(el.width || 40)} x {Math.round(el.height || 40)} PX
                    </>
                  )}
                </div>
              )}

              {/* Quick Delete Button - Only for single selection or hover? User wants it to work. */}
              {isSelected && isEditable && selectedElementIds.size === 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveElement(el.id); }}
                  className="absolute -top-3 -right-3 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl z-[301] hover:bg-rose-600 transition-all hover:scale-110 active:scale-90 pointer-events-auto"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Rotation Control - Improved angle-based rotation */}
              {isSelected && isEditable && selectedElementIds.size === 1 && (
                <>
                  {/* Resize Handles */}
                  <div 
                    className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-[302] hover:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startW = el.width || 40;
                      const startH = el.height || 40;
                      const startPosX = el.x;
                      const startPosY = el.y;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const dx = (moveEvent.clientX - startX) / zoom;
                        const dy = (moveEvent.clientY - startY) / zoom;
                        const newW = Math.max(20, startW - dx);
                        const newH = Math.max(20, startH - dy);
                        handleUpdateElement(el.id, { 
                          width: newW, 
                          height: newH,
                          x: startPosX + dx,
                          y: startPosY + dy
                        });
                        setInteractionInfo({
                          type: 'resize',
                          value: `${getRealDim(newW)} x ${getRealDim(newH)}`,
                          x: (el.x + newW / 2) * zoom,
                          y: (el.y) * zoom
                        });
                      };
                      const handleMouseUp = () => {
                        setInteractionInfo(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  <div 
                    className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-[302] hover:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startW = el.width || 40;
                      const startH = el.height || 40;
                      const startPosY = el.y;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const dx = (moveEvent.clientX - startX) / zoom;
                        const dy = (moveEvent.clientY - startY) / zoom;
                        const newW = Math.max(20, startW + dx);
                        const newH = Math.max(20, startH - dy);
                        handleUpdateElement(el.id, { 
                          width: newW, 
                          height: newH,
                          y: startPosY + dy
                        });
                        setInteractionInfo({
                          type: 'resize',
                          value: `${getRealDim(newW)} x ${getRealDim(newH)}`,
                          x: (el.x + newW / 2) * zoom,
                          y: (el.y) * zoom
                        });
                      };
                      const handleMouseUp = () => {
                        setInteractionInfo(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  <div 
                    className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-[302] hover:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startW = el.width || 40;
                      const startH = el.height || 40;
                      const startPosX = el.x;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const dx = (moveEvent.clientX - startX) / zoom;
                        const dy = (moveEvent.clientY - startY) / zoom;
                        const newW = Math.max(20, startW - dx);
                        const newH = Math.max(20, startH + dy);
                        handleUpdateElement(el.id, { 
                          width: newW, 
                          height: newH,
                          x: startPosX + dx
                        });
                        setInteractionInfo({
                          type: 'resize',
                          value: `${getRealDim(newW)} x ${getRealDim(newH)}`,
                          x: (el.x + newW / 2) * zoom,
                          y: (el.y) * zoom
                        });
                      };
                      const handleMouseUp = () => {
                        setInteractionInfo(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  <div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-[302] hover:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startW = el.width || 40;
                      const startH = el.height || 40;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const dx = (moveEvent.clientX - startX) / zoom;
                        const dy = (moveEvent.clientY - startY) / zoom;
                        const newW = Math.max(20, startW + dx);
                        const newH = Math.max(20, startH + dy);
                        handleUpdateElement(el.id, { 
                          width: newW, 
                          height: newH 
                        });
                        setInteractionInfo({
                          type: 'resize',
                          value: `${getRealDim(newW)} x ${getRealDim(newH)}`,
                          x: (el.x + newW / 2) * zoom,
                          y: (el.y) * zoom
                        });
                      };
                      const handleMouseUp = () => {
                        setInteractionInfo(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />

                  <button 
                    onMouseDown={(e) => {
                    e.stopPropagation();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;

                    // Calculate center of the element in screen coordinates
                    const centerX = rect.left + (el.x + (el.width || 40) / 2) * zoom;
                    const centerY = rect.top + (el.y + (el.height || 40) / 2) * zoom;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
                      const degrees = (angle * 180) / Math.PI + 90; // +90 to align handle with top
                      
                      // Snap to 45 degree increments if shift is held or by default for cleaner layout
                      const snapAngle = 45;
                      const finalDegrees = moveEvent.shiftKey 
                        ? Math.round(degrees / snapAngle) * snapAngle 
                        : Math.round(degrees / 5) * 5; // 5 degree steps for precision by default
                      
                      handleUpdateElement(el.id, { rotation: finalDegrees });
                      setInteractionInfo({
                        type: 'rotate',
                        value: `${finalDegrees}°`,
                        x: (el.x + (el.width || 40) / 2) * zoom,
                        y: (el.y) * zoom
                      });
                    };
                    const handleMouseUp = () => {
                      setInteractionInfo(null);
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  className="absolute -bottom-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl z-[301] hover:bg-blue-700 transition-all hover:scale-110 active:scale-90 cursor-alias border-2 border-white"
                  title="Hassas Döndür"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                </>
              )}

              {/* Element Content */}
              {renderElement(el)}

              {/* Remove the individual toolbars from inside the loop */}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SeatingPlan;
