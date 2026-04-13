
import React, { useMemo, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  useTexture,
  useGLTF,
  Grid,
  GizmoHelper,
  GizmoViewport,
  TransformControls,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { HallConfig, ReferenceImage, HallElement } from '../types';
import { Monitor, Move, Box, Sparkles, Loader2, Camera, Sun, BoxSelect, RotateCw, Maximize2 } from 'lucide-react';
import { analyzeSceneWithAI } from '../src/services/geminiService';
import { getSketchfabDownloadUrl } from '../src/services/sketchfabService';

interface DrawingCanvasProps {
  hall: HallConfig;
  referenceImages?: ReferenceImage[];
  selectedElementIds: Set<string>;
  onUpdateElements?: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void;
  onSelectElements?: (ids: Set<string>) => void;
  onAddElements?: (elements: HallElement[]) => void;
  onRemoveElements?: (ids: string[]) => void;
  pendingModel?: any;
  onModelPlaced?: (x: number, y: number) => void;
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
  transformMode = 'translate',
  workspaceWidth = 1200,
  workspaceHeight = 800,
  realWidth = 40,
  realHeight = 25,
  dronePhotoUrl
}: { 
  el: HallElement, 
  selectedElementIds: Set<string>,
  onUpdateElements?: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void,
  onSelectElements?: (ids: Set<string>) => void,
  onDraggingChange?: (dragging: boolean) => void,
  transformMode?: 'translate' | 'rotate' | 'scale',
  workspaceWidth?: number,
  workspaceHeight?: number,
  realWidth?: number,
  realHeight?: number,
  dronePhotoUrl?: string
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
  let color = el.color || '#f8f8f7'; // Off-white default
  let label = el.label || '';

  // Type specific heights and colors
  if (el.type === 'polygon' || el.type === 'building') actualHeight = el.h || 6;
  else if (el.type === 'led-screen') actualHeight = 4;
  else if (el.type === 'stage') actualHeight = 1.2;
  else if (el.type === 'truss-stage') { actualHeight = 5; color = '#f1f5f9'; }
  else if (el.type === 'truck-stage') { actualHeight = 4.5; color = '#f8fafc'; }
  else if (el.type === 'generator-truck') { actualHeight = 3; color = '#f1f5f9'; }
  else if (el.type === 'catering-truck') { actualHeight = 3.5; color = '#f8fafc'; }
  else if (el.type === 'bistro-table') { actualHeight = 1.1; color = '#f1f5f9'; }
  else if (el.type === 'tree') actualHeight = 6;
  else if (el.type === 'car' || el.type === 'ambulance') actualHeight = 2;
  else if (el.type === 'person') actualHeight = 1.8;

  const width = (el.width || 40) / scaleX;
  const depth = (el.height || 40) / scaleY;

  const handleDragEnd = (e: any) => {
    onDraggingChange?.(false);
    if (!transformRef.current) return;
    const { position, rotation } = transformRef.current.object;
    
    // Convert back to 2D coordinates
    const newX = position.x * scaleX + workspaceWidth / 2;
    const newY = position.z * scaleY + workspaceHeight / 2;
    
    // Sync with main state
    onUpdateElements?.([el.id], () => ({ 
      x: newX, 
      y: newY,
      rotation: -rotation.y * (180 / Math.PI) // Convert back to degrees
    }));
  };

  const handleDragStart = () => {
    onDraggingChange?.(true);
  };

  const renderGeometry = () => {
    if (el.modelUrl) {
      return (
        <React.Suspense fallback={<mesh><boxGeometry args={[width, actualHeight, depth]} /><meshStandardMaterial color="#ccc" wireframe /></mesh>}>
          <GLTFModel url={el.modelUrl} height={actualHeight} width={width} depth={depth} />
        </React.Suspense>
      );
    }

    if ((el.type === 'polygon' || el.type === 'building') && el.points && el.points.length > 0) {
      return (
        <ExtrudedBuilding 
          points={el.points}
          height={actualHeight}
          color={color}
          workspaceWidth={workspaceWidth}
          workspaceHeight={workspaceHeight}
          realWidth={realWidth}
          realHeight={realHeight}
          isProxy // Flag to indicate it's part of an element proxy
          isRelative={true} // Traced buildings use relative points from the anchor (el.x, el.y)
          textureUrl={dronePhotoUrl}
        />
      );
    }

    return (
      <group>
        <mesh 
          castShadow 
          receiveShadow 
          onClick={(e) => {
            e.stopPropagation();
            onSelectElements?.(new Set([el.id]));
          }}
        >
          <boxGeometry args={[width, actualHeight, depth]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.2} 
            metalness={0.1} 
            envMapIntensity={1}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(width, actualHeight, depth)]} />
          <lineBasicMaterial color="#475569" linewidth={1} transparent opacity={0.6} />
        </lineSegments>
      </group>
    );
  };

  return (
    <group>
      {isSelected ? (
        <TransformControls 
          ref={transformRef}
          position={[x3d, 0, y3d]} 
          rotation={[0, -(el.rotation * Math.PI) / 180, 0]}
          mode={transformMode} 
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          showY={transformMode === 'translate' ? false : true} 
          enabled={true} 
        >
          <group scale={[el.width ? el.width / 40 : 1, 1, el.height ? el.height / 40 : 1]}>
            {renderGeometry()}
          </group>
        </TransformControls>
      ) : (
        <group 
          position={[x3d, 0, y3d]} 
          rotation={[0, -(el.rotation * Math.PI) / 180, 0]}
          scale={[el.width ? el.width / 40 : 1, 1, el.height ? el.height / 40 : 1]}
        >
          {renderGeometry()}
          {label && (
            <Html position={[el.type === 'polygon' ? 0 : 0, actualHeight + 0.5, 0]} center>
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

const VenueGround = ({ imageUrl, realWidth = 40, realHeight = 25, onPointerDown }: { imageUrl: string, realWidth?: number, realHeight?: number, onPointerDown?: (e: any) => void }) => {
  // Use the requested texture name if available, otherwise fallback to provided imageUrl
  const texturePath = imageUrl || 'ula-kadın-konagi.jpg';
  const texture = useTexture(texturePath);
  texture.anisotropy = 16;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow 
      position={[0, -0.01, 0]}
      onPointerDown={onPointerDown}
    >
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
  opacity = 1,
  workspaceWidth = 1200,
  workspaceHeight = 800,
  realWidth = 40,
  realHeight = 25,
  isProxy = false,
  isRelative = false,
  textureUrl
}: { 
  points: { x: number, y: number }[], 
  height?: number, 
  color?: string, 
  opacity?: number,
  workspaceWidth?: number,
  workspaceHeight?: number,
  realWidth?: number,
  realHeight?: number,
  isProxy?: boolean,
  isRelative?: boolean,
  textureUrl?: string
}) => {
  const texture = textureUrl ? useTexture(textureUrl) : null;
  if (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  }

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (points.length === 0) return s;

    const scaleX = workspaceWidth / realWidth;
    const scaleY = workspaceHeight / realHeight;

    if (isRelative) {
      s.moveTo(points[0].x / scaleX, points[0].y / scaleY);
      for (let i = 1; i < points.length; i++) {
        s.lineTo(points[i].x / scaleX, points[i].y / scaleY);
      }
    } else {
      const firstPoint = points[0];
      s.moveTo((firstPoint.x - workspaceWidth / 2) / scaleX, (firstPoint.y - workspaceHeight / 2) / scaleY);
      for (let i = 1; i < points.length; i++) {
        s.lineTo((points[i].x - workspaceWidth / 2) / scaleX, (points[i].y - workspaceHeight / 2) / scaleY);
      }
    }
    s.closePath();
    return s;
  }, [points, workspaceWidth, workspaceHeight, realWidth, realHeight, isRelative]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: height,
    bevelEnabled: false,
  }), [height]);

  // Texture Projection Logic
  const material = useMemo(() => {
    if (!texture) return new THREE.MeshStandardMaterial({ color: "#f8f8f7", roughness: 0.2, metalness: 0.1 });
    
    // Custom material with texture projection
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
  }, [texture]);

  // Update UVs for texture projection (Planar mapping from top)
  const onUpdateGeometry = useCallback((geometry: THREE.ExtrudeGeometry) => {
    const pos = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      
      // Map world XZ to UV 0-1 based on real dimensions
      uvs.setXY(i, (x / realWidth) + 0.5, (z / realHeight) + 0.5);
    }
    uvs.needsUpdate = true;
  }, [realWidth, realHeight]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} onUpdate={onUpdateGeometry} />
        <primitive object={material} attach="material" />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.ExtrudeGeometry(shape, extrudeSettings)]} />
        <lineBasicMaterial color="#475569" linewidth={1} transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
};

/**
 * GLTFModel: Loads and auto-scales an external 3D asset (e.g., from TRELLIS)
 */
const GLTFModel = ({ url, height, width, depth, useMockupMaterial = false }: { url: string, height: number, width: number, depth: number, useMockupMaterial?: boolean }) => {
  const { scene } = useGLTF(url);
  
  const scaledScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Scale to fit the target dimensions
    // X -> width, Y -> height (h), Z -> depth (height in 2D)
    const scaleX = width / (size.x || 1);
    const scaleY = height / (size.y || 1);
    const scaleZ = depth / (size.z || 1);
    
    clone.scale.set(scaleX, scaleY, scaleZ);
    
    // Center horizontally and pin bottom to y=0
    clone.position.set(-center.x * scaleX, -box.min.y * scaleY, -center.z * scaleZ);
    
    const mockupMaterial = new THREE.MeshStandardMaterial({
      color: '#f8f8f7',
      roughness: 0.2,
      metalness: 0.1,
      envMapIntensity: 1
    });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (useMockupMaterial) {
          (child as THREE.Mesh).material = mockupMaterial;
        } else if ((child as THREE.Mesh).material) {
          ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).envMapIntensity = 1.5;
        }
      }
    });
    
    return clone;
  }, [scene, height, width, depth, useMockupMaterial]);

  return <primitive object={scaledScene} />;
};

/**
 * SurroundingEnvironment: Generates the buildings using the new ExtrudeGeometry logic
 */
const SurroundingEnvironment = ({ workspaceWidth, workspaceHeight, realWidth, realHeight, dronePhotoUrl }: { workspaceWidth: number, workspaceHeight: number, realWidth: number, realHeight: number, dronePhotoUrl?: string }) => {
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
          textureUrl={dronePhotoUrl}
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
  onSelectElements,
  onAddElements,
  onRemoveElements,
  pendingModel,
  onModelPlaced
}) => {
  const dronePhotoUrl = hall.backgroundImage;
  const [isDragging, setIsDragging] = React.useState(false);
  const [sunTime, setSunTime] = React.useState(14); // Default to 14:00
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  
  // Tracing State
  const [isTracingMode, setIsTracingMode] = React.useState(false);
  const [tracingPoints, setTracingPoints] = React.useState<THREE.Vector3[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isGenerating3D, setIsGenerating3D] = React.useState(false);
  const [isSketchfabLoading, setIsSketchfabLoading] = React.useState(false);
  const [sketchfabError, setSketchfabError] = React.useState<string | null>(null);
  const [transformMode, setTransformMode] = React.useState<'translate' | 'rotate' | 'scale'>('translate');

  useEffect(() => {
    const handleAdd3DObject = async (e: any) => {
      const { uid, name, creator, license } = e.detail;
      if (!uid) return;

      setIsSketchfabLoading(true);
      setSketchfabError(null);
      try {
        // Robust token retrieval (same as ObjectLibrary)
        const token = import.meta.env.VITE_SKETCHFAB_API_TOKEN || 
                      (window as any).process?.env?.VITE_SKETCHFAB_API_TOKEN || 
                      '';
        
        const downloadUrl = await getSketchfabDownloadUrl(uid, token.trim());
        
        if (downloadUrl && onAddElements) {
          // Find if there's a 'SAHNE' placeholder to replace
          const sahnePlaceholder = (hall.elements || []).find(el => el.label === 'SAHNE');
          
          const newElement: HallElement = {
            id: `sketchfab-${uid}-${Date.now()}`,
            type: 'building',
            x: sahnePlaceholder?.x || 600, // Use placeholder x or center
            y: sahnePlaceholder?.y || 400, // Use placeholder y or center
            width: sahnePlaceholder?.width || 200,
            height: sahnePlaceholder?.height || 200,
            rotation: sahnePlaceholder?.rotation || 0,
            h: sahnePlaceholder?.h || 2,
            modelUrl: downloadUrl,
            label: name || 'Sketchfab Model',
            color: '#ffffff',
            metadata: {
              source: 'Sketchfab',
              creator: creator,
              license: license
            }
          };

          // If placeholder found, remove it
          if (sahnePlaceholder && onRemoveElements) {
            onRemoveElements([sahnePlaceholder.id]);
          }

          onAddElements([newElement]);
          onSelectElements?.(new Set([newElement.id]));
        }
      } catch (error: any) {
        console.error('Error adding Sketchfab object:', error);
        // Special handling for 403 (Forbidden/Paid models)
        if (error.message?.includes('403') || error.message?.includes('ücretli')) {
          setSketchfabError('Bu model ücretli olabilir veya indirme izni bulunmuyor.');
        } else {
          setSketchfabError(error.message || 'Model yüklenirken bir hata oluştu.');
        }
        setTimeout(() => setSketchfabError(null), 5000);
      } finally {
        setIsSketchfabLoading(false);
      }
    };

    window.addEventListener('add-3d-object', handleAdd3DObject);
    return () => window.removeEventListener('add-3d-object', handleAdd3DObject);
  }, [onAddElements, onSelectElements, onRemoveElements, hall.elements]);

  // Calibration and Dimensions
  const realWidth = hall.scaleCalibration?.realDistance || 40;
  const realHeight = (realWidth * (hall.height || 800)) / (hall.width || 1200);
  const workspaceWidth = hall.width || 1200;
  const workspaceHeight = hall.height || 800;

  const scaleX = workspaceWidth / realWidth;
  const scaleY = workspaceHeight / realHeight;

  // Sync local selectedId with prop selectedElementIds
  React.useEffect(() => {
    if (selectedElementIds.size > 0) {
      setSelectedId(Array.from(selectedElementIds)[0]);
    } else {
      setSelectedId(null);
    }
  }, [selectedElementIds]);

  const handleGroundClick = (e: any) => {
    if (pendingModel && e.point) {
      e.stopPropagation();
      // Convert 3D point back to 2D workspace coordinates
      // 3D point is in meters, workspace is in pixels
      const x2d = e.point.x * scaleX + workspaceWidth / 2;
      const y2d = e.point.z * scaleY + workspaceHeight / 2;
      
      onModelPlaced?.(x2d, y2d);
      return;
    }

    if (!isTracingMode) return;
    e.stopPropagation();
    
    // If clicking near the first point, close the polygon
    if (tracingPoints.length > 2) {
      const firstPoint = tracingPoints[0];
      const dist = firstPoint.distanceTo(e.point);
      if (dist < 1) {
        finalizeTracing();
        return;
      }
    }
    
    setTracingPoints(prev => [...prev, e.point.clone()]);
  };

  const finalizeTracing = () => {
    if (tracingPoints.length < 3) {
      setIsTracingMode(false);
      setTracingPoints([]);
      return;
    }

    // Use the first point as the anchor (el.x, el.y)
    const firstP = tracingPoints[0];
    const anchorX = firstP.x * scaleX + workspaceWidth / 2;
    const anchorY = firstP.z * scaleY + workspaceHeight / 2;

    // Convert other points to be relative to the anchor
    const relativePoints = tracingPoints.map(p => ({
      x: (p.x * scaleX + workspaceWidth / 2) - anchorX,
      y: (p.z * scaleY + workspaceHeight / 2) - anchorY
    }));

    const newBuilding: HallElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'building',
      x: anchorX,
      y: anchorY,
      points: relativePoints,
      h: 6, // Default height 6m
      rotation: 0,
      label: `Bina ${hall.elements?.filter(el => el.type === 'building').length || 0 + 1}`,
      color: '#f8f8f7'
    };

    onAddElements?.([newBuilding]);
    setIsTracingMode(false);
    setTracingPoints([]);
  };

  const handleAIAnalysis = async () => {
    if (!dronePhotoUrl) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeSceneWithAI(dronePhotoUrl);
      if (result.elements && result.elements.length > 0) {
        const newElements = result.elements.map(el => ({
          ...el,
          id: Math.random().toString(36).substr(2, 9),
          x: el.x || 0,
          y: el.y || 0,
          rotation: 0,
          color: '#f8f8f7'
        })) as HallElement[];
        onAddElements?.(newElements);
      }
      if (result.sunAngle !== undefined) {
        // Map 0-360 to 6-20 hours roughly
        const time = 6 + (result.sunAngle / 360) * 14;
        setSunTime(time);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("AI Analizi sırasında bir hata oluştu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate3D = async () => {
    if (!dronePhotoUrl) return;
    setIsGenerating3D(true);
    try {
      // Simulated API call to TRELLIS (Image-to-3D)
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Simulated result: A high-fidelity GLB model
      // Using a sample building model from Khronos
      const modelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb';
      
      const newBuilding: HallElement = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'building',
        x: workspaceWidth / 2,
        y: workspaceHeight / 2,
        modelUrl: modelUrl,
        h: 8, // 8 meters tall
        rotation: 0,
        label: 'TRELLIS AI Building',
        color: '#ffffff'
      };
      
      onAddElements?.([newBuilding]);
    } catch (error) {
      console.error("3D Generation failed:", error);
      alert("3D Model üretimi sırasında bir hata oluştu.");
    } finally {
      setIsGenerating3D(false);
    }
  };

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

          {/* Tracing Controls */}
          <div className="mt-6 pt-6 border-t border-white/5 space-y-3 pointer-events-auto">
            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing || isGenerating3D || !dronePhotoUrl}
              className={`w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isAnalyzing 
                  ? 'bg-slate-800 text-slate-500' 
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAnalyzing ? 'Analiz Ediliyor...' : 'AI Sahne Analizi'}
            </button>

            <button 
              onClick={handleGenerate3D}
              disabled={isAnalyzing || isGenerating3D || !dronePhotoUrl}
              className={`w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isGenerating3D 
                  ? 'bg-slate-800 text-slate-500' 
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500'
              }`}
            >
              {isGenerating3D ? <Loader2 className="w-4 h-4 animate-spin" /> : <BoxSelect className="w-4 h-4" />}
              {isGenerating3D ? 'Üretiliyor...' : 'TRELLIS 3D Üret (AI)'}
            </button>

            <button 
              onClick={() => {
                if (isTracingMode) finalizeTracing();
                else setIsTracingMode(true);
              }}
              className={`w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isTracingMode 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Box className="w-4 h-4" />
              {isTracingMode ? 'Çizimi Bitir' : 'Bina Çiz (CAD)'}
            </button>
            {isTracingMode && (
              <button 
                onClick={() => {
                  setIsTracingMode(false);
                  setTracingPoints([]);
                }}
                className="w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              >
                İptal Et
              </button>
            )}
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

        {/* Transform Mode Switcher */}
        {selectedElementIds.size > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl flex gap-1 pointer-events-auto">
            <button 
              onClick={() => setTransformMode('translate')}
              className={`p-2 rounded-xl transition-all ${transformMode === 'translate' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
              title="Taşı (T)"
            >
              <Move className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTransformMode('rotate')}
              className={`p-2 rounded-xl transition-all ${transformMode === 'rotate' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
              title="Döndür (R)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTransformMode('scale')}
              className={`p-2 rounded-xl transition-all ${transformMode === 'scale' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
              title="Ölçeklendir (S)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sketchfab Status Feedback */}
        {(isSketchfabLoading || sketchfabError) && (
          <div className={`bg-slate-900/90 backdrop-blur-2xl px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-top pointer-events-auto ${sketchfabError ? 'border-red-500/50 text-red-400' : 'border-blue-500/50 text-blue-400'}`}>
            {isSketchfabLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSketchfabLoading ? 'Sketchfab Modeli İndiriliyor...' : sketchfabError}
            </span>
          </div>
        )}
      </div>

      <Canvas 
        shadows 
        gl={{ 
          antialias: true, 
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }} 
        onPointerMissed={() => onSelectElements?.(new Set())}
      >
        <PerspectiveCamera makeDefault position={[30, 30, 30]} fov={40} />
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1} 
          enableDamping 
          enabled={!isDragging} 
        />
        
        <Environment preset="city" />
        <ambientLight intensity={0.4} />
        
        {/* Real-time Sun Light */}
        <SunSimulation time={sunTime} />

        {dronePhotoUrl ? (
          <VenueGround 
            imageUrl={dronePhotoUrl} 
            realWidth={realWidth} 
            realHeight={realHeight} 
            onPointerDown={handleGroundClick}
          />
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={handleGroundClick}>
            <planeGeometry args={[realWidth, realHeight]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        )}

        {/* Tracing Visualization */}
        {isTracingMode && tracingPoints.length > 0 && (
          <group>
            {tracingPoints.map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color="#10b981" />
              </mesh>
            ))}
            <line>
              <bufferGeometry attach="geometry" onUpdate={self => self.setFromPoints([...tracingPoints, tracingPoints[0]])} />
              <lineBasicMaterial attach="material" color="#10b981" linewidth={2} />
            </line>
          </group>
        )}

        {/* Surrounding Buildings (Procedural Environment) */}
        <SurroundingEnvironment 
          workspaceWidth={workspaceWidth} 
          workspaceHeight={workspaceHeight} 
          realWidth={realWidth} 
          realHeight={realHeight} 
          dronePhotoUrl={dronePhotoUrl}
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
              transformMode={transformMode}
              workspaceWidth={workspaceWidth}
              workspaceHeight={workspaceHeight}
              realWidth={realWidth}
              realHeight={realHeight}
              dronePhotoUrl={dronePhotoUrl}
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
