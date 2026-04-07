
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  useTexture,
  Grid,
  GizmoHelper,
  GizmoViewport,
  TransformControls,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { HallConfig, ReferenceImage, HallElement } from '../types';
import { Monitor, Move } from 'lucide-react';

interface DrawingCanvasProps {
  hall: HallConfig;
  referenceImages?: ReferenceImage[];
  selectedElementIds: Set<string>;
  onUpdateElements?: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void;
  onSelectElements?: (ids: Set<string>) => void;
}

/**
 * SunSimulation: Calculates sun position based on time and renders a directional light with shadows
 */
const SunSimulation = ({ time = 14 }: { time?: number }) => {
  const sunRef = React.useRef<THREE.DirectionalLight>(null);

  // Calculate sun position
  // Reference: 14:00 is roughly South-West (based on the drone photo arrow)
  // We'll map 06:00 (Sunrise) to 20:00 (Sunset)
  const sunPosition = useMemo(() => {
    const angle = ((time - 6) / 14) * Math.PI; // 0 to PI
    const elevation = Math.sin(angle) * 40;
    const azimuth = Math.cos(angle) * 40;
    
    // Adjusting based on the 14:00 reference (South-West)
    // In our 3D space: X is East-West, Z is North-South
    return [azimuth, elevation, -azimuth * 0.5 + 10] as [number, number, number];
  }, [time]);

  return (
    <>
      <directionalLight
        ref={sunRef}
        position={sunPosition}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
      />
      {/* Visual representation of the sun (optional, for debugging) */}
      <mesh position={sunPosition}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#fcd34d" />
      </mesh>
    </>
  );
};

// Re-using the 3D logic but optimized for the 40x25m Digital Twin
const Element3DProxy = ({ 
  el, 
  selectedElementIds, 
  onUpdateElements,
  onSelectElements,
  onDraggingChange,
  workspaceWidth = 1200,
  workspaceHeight = 800,
  realWidth = 40,
  realHeight = 25
}: { 
  el: HallElement, 
  selectedElementIds: Set<string>,
  onUpdateElements?: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void,
  onSelectElements?: (ids: Set<string>) => void,
  onDraggingChange?: (dragging: boolean) => void,
  workspaceWidth?: number,
  workspaceHeight?: number,
  realWidth?: number,
  realHeight?: number
}) => {
  const isSelected = selectedElementIds.has(el.id);
  const transformRef = React.useRef<any>(null);
  
  // Dynamic Scale factor: pixels per meter
  const scaleX = workspaceWidth / realWidth;
  const scaleY = workspaceHeight / realHeight;
  
  // Map 2D coordinates to 3D (centered)
  const x3d = (el.x - workspaceWidth / 2) / scaleX; 
  const y3d = (el.y - workspaceHeight / 2) / scaleY;

  let actualHeight = (el.h || 0) * 0.5 + 0.1;
  let color = el.color || '#f8fafc';
  let label = el.label || '';

  // Type specific heights and colors
  if (el.type === 'led-screen') actualHeight = 4;
  else if (el.type === 'stage') actualHeight = 1.2;
  else if (el.type === 'truss-stage') { actualHeight = 5; color = '#94a3b8'; }
  else if (el.type === 'truck-stage') { actualHeight = 4.5; color = '#475569'; }
  else if (el.type === 'generator-truck') { actualHeight = 3; color = '#d97706'; }
  else if (el.type === 'catering-truck') { actualHeight = 3.5; color = '#059669'; }
  else if (el.type === 'bistro-table') { actualHeight = 1.1; color = '#334155'; }
  else if (el.type === 'tree') actualHeight = 6;
  else if (el.type === 'car' || el.type === 'ambulance') actualHeight = 2;
  else if (el.type === 'person') actualHeight = 1.8;

  const width = (el.width || 40) / scaleX;
  const depth = (el.height || 40) / scaleY;

  const handleDragEnd = (e: any) => {
    onDraggingChange?.(false);
    if (!transformRef.current) return;
    const { position } = transformRef.current.object;
    
    // Convert back to 2D coordinates
    const newX = position.x * scaleX + workspaceWidth / 2;
    const newY = position.z * scaleY + workspaceHeight / 2;
    
    onUpdateElements?.([el.id], () => ({ x: newX, y: newY }));
  };

  const handleDragStart = () => {
    onDraggingChange?.(true);
  };

  return (
    <group>
      {isSelected && (
        <TransformControls 
          ref={transformRef}
          position={[x3d, actualHeight / 2, y3d]} 
          mode="translate" 
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          showY={false} // Only move on XZ plane
        >
          <mesh 
            castShadow 
            receiveShadow 
            onClick={(e) => {
              e.stopPropagation();
              onSelectElements?.(new Set([el.id]));
            }}
          >
            <boxGeometry args={[width, actualHeight, depth]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        </TransformControls>
      )}

      {!isSelected && (
        <group position={[x3d, actualHeight / 2, y3d]} rotation={[0, -(el.rotation * Math.PI) / 180, 0]}>
          <mesh 
            castShadow 
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelectElements?.(new Set([el.id]));
            }}
          >
            <boxGeometry args={[width, actualHeight, depth]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          {label && (
            <Html position={[0, actualHeight / 2 + 0.5, 0]} center>
              <div className="bg-slate-900/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded border border-white/20 whitespace-nowrap pointer-events-none uppercase tracking-tighter">
                {label}
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
};

const VenueGround = ({ imageUrl, realWidth = 40, realHeight = 25 }: { imageUrl: string, realWidth?: number, realHeight?: number }) => {
  const texture = useTexture(imageUrl);
  texture.anisotropy = 16;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
      <planeGeometry args={[realWidth, realHeight]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
};

/**
 * ExtrudedBuilding: Renders a building based on its 2D contour using ExtrudeGeometry
 */
const ExtrudedBuilding = ({ 
  points, 
  height = 6, 
  color = "#ffffff", 
  opacity = 0.6,
  workspaceWidth = 1200,
  workspaceHeight = 800,
  realWidth = 40,
  realHeight = 25
}: { 
  points: { x: number, y: number }[], 
  height?: number, 
  color?: string, 
  opacity?: number,
  workspaceWidth?: number,
  workspaceHeight?: number,
  realWidth?: number,
  realHeight?: number
}) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (points.length === 0) return s;

    const scaleX = workspaceWidth / realWidth;
    const scaleY = workspaceHeight / realHeight;

    // Convert points to 3D space (centered)
    const firstPoint = points[0];
    s.moveTo((firstPoint.x - workspaceWidth / 2) / scaleX, (firstPoint.y - workspaceHeight / 2) / scaleY);
    
    for (let i = 1; i < points.length; i++) {
      s.lineTo((points[i].x - workspaceWidth / 2) / scaleX, (points[i].y - workspaceHeight / 2) / scaleY);
    }
    s.closePath();
    return s;
  }, [points, workspaceWidth, workspaceHeight, realWidth, realHeight]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelOffset: 0,
    bevelSegments: 1
  }), [height]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial 
        color={color} 
        transparent={opacity < 1} 
        opacity={opacity} 
        roughness={0.2} 
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * SurroundingEnvironment: Generates the buildings using the new ExtrudeGeometry logic
 */
const SurroundingEnvironment = ({ workspaceWidth, workspaceHeight, realWidth, realHeight }: { workspaceWidth: number, workspaceHeight: number, realWidth: number, realHeight: number }) => {
  // Simulated Object Detection Data for Ula Kadın Konağı
  const detectedBuildings = useMemo(() => [
    {
      id: 'ula-kadin-konagi',
      name: 'Ula Kadın Konağı',
      height: 8.5,
      color: '#ffffff',
      points: [
        { x: 950, y: 300 }, { x: 1150, y: 300 }, { x: 1150, y: 550 }, { x: 950, y: 550 }
      ]
    },
    {
      id: 'north-building-1',
      height: 6.2,
      color: '#f1f5f9',
      points: [
        { x: 100, y: 50 }, { x: 350, y: 50 }, { x: 350, y: 200 }, { x: 100, y: 200 }
      ]
    },
    {
      id: 'north-building-2',
      height: 7.0,
      color: '#ffffff',
      points: [
        { x: 600, y: 30 }, { x: 850, y: 30 }, { x: 850, y: 150 }, { x: 600, y: 150 }
      ]
    },
    {
      id: 'south-building',
      height: 7.5,
      color: '#ffffff',
      points: [
        { x: 400, y: 650 }, { x: 850, y: 650 }, { x: 850, y: 780 }, { x: 400, y: 780 }
      ]
    },
    {
      id: 'west-building',
      height: 5.8,
      color: '#f8fafc',
      points: [
        { x: 20, y: 300 }, { x: 150, y: 300 }, { x: 150, y: 550 }, { x: 20, y: 550 }
      ]
    }
  ], []);

  return (
    <group>
      {detectedBuildings.map(building => (
        <ExtrudedBuilding 
          key={building.id}
          points={building.points}
          height={building.height}
          color={building.color}
          workspaceWidth={workspaceWidth}
          workspaceHeight={workspaceHeight}
          realWidth={realWidth}
          realHeight={realHeight}
        />
      ))}
    </group>
  );
};

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  hall, 
  referenceImages = [], 
  selectedElementIds,
  onUpdateElements,
  onSelectElements
}) => {
  const dronePhotoUrl = hall.backgroundImage;
  const [isDragging, setIsDragging] = React.useState(false);
  const [sunTime, setSunTime] = React.useState(14); // Default to 14:00

  // Calibration and Dimensions
  const realWidth = hall.scaleCalibration?.realDistance || 40;
  const realHeight = (realWidth * (hall.height || 800)) / (hall.width || 1200);
  const workspaceWidth = hall.width || 1200;
  const workspaceHeight = hall.height || 800;

  return (
    <div className="w-full h-full bg-slate-900 rounded-[40px] overflow-hidden relative border-4 border-slate-800 shadow-inner">
      {/* Reality Capture Workstation Overlays */}
      <div className="absolute top-8 left-8 flex flex-col gap-4 pointer-events-none z-50">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-2xl min-w-[280px]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-white uppercase tracking-widest leading-none mb-1">ULA KADIN KONAĞI</h4>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em]">{realWidth}m x {realHeight.toFixed(1)}m DIGITAL TWIN</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
              <span>Status</span>
              <span className="text-emerald-500">Calibrated</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
              <span>Resolution</span>
              <span className="text-blue-400">1:1 Metric</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
              <span>Interaction</span>
              <span className={`${isDragging ? 'text-amber-500 animate-pulse' : 'text-amber-400'} flex items-center gap-1`}><Move className="w-2.5 h-2.5" /> {isDragging ? 'Transforming...' : 'Drag Enabled'}</span>
            </div>
          </div>
        </div>

        {/* Sun Simulation Controls */}
        <div className="bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-2xl min-w-[280px] pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-amber-500" /> Güneş Simülasyonu
            </h4>
            <span className="text-[14px] font-black text-amber-500 font-mono">{Math.floor(sunTime)}:{(sunTime % 1 * 60).toString().padStart(2, '0')}</span>
          </div>
          
          <input 
            type="range" 
            min="6" 
            max="20" 
            step="0.1" 
            value={sunTime} 
            onChange={(e) => setSunTime(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          
          <div className="flex justify-between mt-2">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Gündoğumu</span>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Günbatımı</span>
          </div>
        </div>
      </div>

      <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[30, 30, 30]} fov={40} />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} enableDamping enabled={!isDragging} />
        
        <Environment preset="city" />
        <ambientLight intensity={0.4} />
        
        {/* Real-time Sun Light */}
        <SunSimulation time={sunTime} />

        {dronePhotoUrl ? (
          <VenueGround imageUrl={dronePhotoUrl} realWidth={realWidth} realHeight={realHeight} />
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[realWidth, realHeight]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        )}

        {/* Surrounding Buildings (Procedural Environment) */}
        <SurroundingEnvironment 
          workspaceWidth={workspaceWidth} 
          workspaceHeight={workspaceHeight} 
          realWidth={realWidth} 
          realHeight={realHeight} 
        />

        <group>
          {hall.elements?.map(el => (
            <Element3DProxy 
              key={el.id} 
              el={el} 
              selectedElementIds={selectedElementIds} 
              onUpdateElements={onUpdateElements}
              onSelectElements={onSelectElements}
              onDraggingChange={setIsDragging}
              workspaceWidth={workspaceWidth}
              workspaceHeight={workspaceHeight}
              realWidth={realWidth}
              realHeight={realHeight}
            />
          ))}
        </group>

        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={50} blur={2} far={10} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#f87171', '#4ade80', '#60a5fa']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
};

export default DrawingCanvas;
