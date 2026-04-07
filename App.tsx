
import { GoogleGenAI } from "@google/genai";
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Users, Printer, ZoomIn, ZoomOut, Database, RefreshCw, MessageSquare, AlertCircle, Loader2, CheckCircle2, XCircle, Clock, Send, ChevronDown, MapPin, Tag, Layout, Sparkles, Edit2, AlertTriangle, Search, Upload, Plus, Trash2, Undo2, RotateCw, Copy, ArrowUp, ArrowDown, Group, Ungroup, AlignLeft, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenter, AlignJustify, Minus, LayoutGrid, Ruler, Maximize2, Redo2, Settings2, Type, RotateCcw, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PROTOCOL_DATA, HALL_CONFIGS, TURKEY_CITIES, CITY_HALLS } from './constants';
import { motion } from 'motion/react';
import { ProtocolPerson, HallKey, SeatData, HallConfig, HallElement, ReferenceImage } from './types';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import SeatingPlan from './components/SeatingPlan';
import GuestModal from './components/GuestModal';
import DataImportPanel from './components/DataImportPanel';
import TelegramPreview from './components/TelegramPreview';
import HallAnalysisPanel from './components/HallAnalysisPanel';
import { AnimatePresence } from 'motion/react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qorygwdwirbtqewhubze.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcnlnd2R3aXJidHFld2h1YnplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyOTU1OCwiZXhwIjoyMDgwMjA1NTU4fQ.oeReAMn8O533IcPcDSg1QfzYTden72SyK677etV9ZaM';
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8559688926:AAH832uoO8JfSMIt6YdUhxc19NBFh090I7M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APP_VERSION = '1.4.0';
const BUILD_DATE = '18.03.2026 13:45';

const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Muğla');
  const [selectedHall, setSelectedHall] = useState<HallKey>('yildiz');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<number>>(new Set());
  const [protocolList, setProtocolList] = useState<ProtocolPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(0.8);
  const [seating, setSeating] = useState<Record<string, SeatData>>({});
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [activeLayoutTab, setActiveLayoutTab] = useState<'ai' | 'draw' | 'template' | 'library' | 'layers'>('ai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [designProgress, setDesignProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [dynamicHalls, setDynamicHalls] = useState<Record<string, HallConfig>>({});
  const [dynamicCityHalls, setDynamicCityHalls] = useState<Record<string, string[]>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHallAnalysisOpen, setIsHallAnalysisOpen] = useState(false);
  const [history, setHistory] = useState<HallConfig[]>([]);
  const [redoStack, setRedoStack] = useState<HallConfig[]>([]);
  const [previewElements, setPreviewElements] = useState<HallElement[] | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [blockRows, setBlockRows] = useState(5);
  const [blockChairs, setBlockChairs] = useState(10);
  const [tableChairCount, setTableChairCount] = useState(8);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isDrawingDimension, setIsDrawingDimension] = useState(false);
  const [isTapeMeasuring, setIsTapeMeasuring] = useState(false);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [isDrawingSunAngle, setIsDrawingSunAngle] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<{x: number, y: number}[]>([]);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [lastPixelDist, setLastPixelDist] = useState(0);
  const [realDistInput, setRealDistInput] = useState('10');

  const handleAddReferenceImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      
      if (type === 'image') {
        const img = new Image();
        img.onload = () => {
          const newImg: ReferenceImage = {
            id: Math.random().toString(36).substr(2, 9),
            url,
            type: 'image',
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 0.5,
            visible: true,
            isLocked: false,
            name: file.name,
            aspectRatio: img.width / img.height
          };
          setReferenceImages(prev => [...prev, newImg]);
        };
        img.src = url;
      } else {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          const newImg: ReferenceImage = {
            id: Math.random().toString(36).substr(2, 9),
            url,
            type: 'video',
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 0.5,
            visible: true,
            isLocked: false,
            name: file.name,
            aspectRatio: video.videoWidth / video.videoHeight
          };
          setReferenceImages(prev => [...prev, newImg]);
        };
        video.src = url;
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveReferenceImage = useCallback((id: string) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const handleUpdateReferenceImage = useCallback((id: string, updates: Partial<ReferenceImage>) => {
    setReferenceImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  }, []);

  const getTemplateElements = useCallback((tmplId: string, centerX = 0, centerY = 0): HallElement[] => {
    let newElements: HallElement[] = [];
    const groupId = `group_${Math.random().toString(36).substr(2, 9)}`;

    if (tmplId === 'theatre_free') {
      const chairSpacingX = 50;
      const chairSpacingY = 60;
      const totalWidth = (blockChairs - 1) * chairSpacingX;
      const totalHeight = (blockRows - 1) * chairSpacingY;
      
      for (let r = 0; r < blockRows; r++) {
        for (let c = 0; c < blockChairs; c++) {
          newElements.push({
            id: `th-${r}-${c}-${groupId}`,
            type: 'chair',
            x: centerX - totalWidth / 2 + (c * chairSpacingX) - 20, // -20 to center the 40px chair
            y: centerY - totalHeight / 2 + (r * chairSpacingY) - 20,
            rotation: 0,
            seatNumber: `${String.fromCharCode(65 + r)}${c + 1}`,
            groupId,
            z: 0,
            h: 0
          });
        }
      }
    } else if (tmplId === 'classroom_free') {
      const tablesPerRow = Math.ceil(blockChairs / 2);
      const tableSpacingX = 200;
      const tableSpacingY = 120;
      const totalWidth = (tablesPerRow - 1) * tableSpacingX + 120;
      const totalHeight = (blockRows - 1) * tableSpacingY + 100;

      for (let r = 0; r < blockRows; r++) {
        for (let c = 0; c < tablesPerRow; c++) {
          const tx = centerX - totalWidth / 2 + (c * tableSpacingX);
          const ty = centerY - totalHeight / 2 + (r * tableSpacingY);
          newElements.push({ 
            id: `t-classroom-${r}-${c}-${groupId}`, 
            type: 'table-rect', 
            x: tx, 
            y: ty, 
            rotation: 0, 
            width: 120, 
            height: 60, 
            groupId, 
            label: `Masa ${r * tablesPerRow + c + 1}`, 
            z: 0.75, 
            h: 0.05 
          });
          newElements.push({ id: `c-classroom-${r}-${c}-1-${groupId}`, type: 'chair', x: tx + 10, y: ty + 70, rotation: 0, seatNumber: `${r + 1}-${c * 2 + 1}`, groupId, z: 0, h: 0 });
          newElements.push({ id: `c-classroom-${r}-${c}-2-${groupId}`, type: 'chair', x: tx + 70, y: ty + 70, rotation: 0, seatNumber: `${r + 1}-${c * 2 + 2}`, groupId, z: 0, h: 0 });
        }
      }
    } else if (tmplId === 'ushape_free' || tmplId === 'u-shape') {
      const sideChairs = Math.max(4, Math.floor(blockChairs / 2));
      const topChairs = Math.max(4, blockChairs - (sideChairs * 2));
      
      const tableWidth = topChairs * 50 + 100;
      const tableHeight = 60;
      const sideTableLength = sideChairs * 50;

      // Top Table
      newElements.push({ id: `t-u-top-${groupId}`, type: 'table-rect', x: centerX - tableWidth/2, y: centerY - sideTableLength/2 - tableHeight, rotation: 0, width: tableWidth, height: tableHeight, groupId, label: 'Protokol', z: 0.75, h: 0.05 });
      for (let i = 0; i < topChairs; i++) {
        newElements.push({ id: `c-u-top-${i}-${groupId}`, type: 'chair', x: centerX - (topChairs * 25) + (i * 50) + 25 - 20, y: centerY - sideTableLength/2 - tableHeight - 40, rotation: 0, seatNumber: `P${i + 1}`, groupId, z: 0, h: 0 });
      }

      // Left Table & Chairs
      newElements.push({ id: `t-u-left-${groupId}`, type: 'table-rect', x: centerX - tableWidth/2, y: centerY - sideTableLength/2, rotation: 90, width: sideTableLength, height: tableHeight, groupId, z: 0.75, h: 0.05 });
      for (let i = 0; i < sideChairs; i++) {
        newElements.push({ id: `c-u-left-${i}-${groupId}`, type: 'chair', x: centerX - tableWidth/2 - 40, y: centerY - sideTableLength/2 + (i * 50) + 25 - 20, rotation: 270, seatNumber: `L${i + 1}`, groupId, z: 0, h: 0 });
      }

      // Right Table & Chairs
      newElements.push({ id: `t-u-right-${groupId}`, type: 'table-rect', x: centerX + tableWidth/2 - tableHeight, y: centerY - sideTableLength/2, rotation: 90, width: sideTableLength, height: tableHeight, groupId, z: 0.75, h: 0.05 });
      for (let i = 0; i < sideChairs; i++) {
        newElements.push({ id: `c-u-right-${i}-${groupId}`, type: 'chair', x: centerX + tableWidth/2 + 10, y: centerY - sideTableLength/2 + (i * 50) + 25 - 20, rotation: 90, seatNumber: `R${i + 1}`, groupId, z: 0, h: 0 });
      }
    } else if (tmplId === 'banquet_free' || tmplId === 'round_free') {
      const rows = Math.ceil(Math.sqrt(blockRows)); 
      const cols = Math.ceil(blockRows / rows);
      const spacingX = 250;
      const spacingY = 250;
      const totalWidth = (cols - 1) * spacingX + 120;
      const totalHeight = (rows - 1) * spacingY + 120;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r * cols + c >= blockRows) break;
          const tx = centerX - totalWidth / 2 + (c * spacingX);
          const ty = centerY - totalHeight / 2 + (r * spacingY);
          newElements.push({
            id: `tr-${r}-${c}-${groupId}`,
            type: 'table-round',
            x: tx,
            y: ty,
            rotation: 0,
            width: 120,
            height: 120,
            chairCount: tableChairCount,
            groupId,
            label: `Masa ${r * cols + c + 1}`,
            z: 0.75,
            h: 0.05
          });
        }
      }
    } else if (tmplId === 'square_free') {
      const size = 120;
      newElements.push({ 
        id: `sq-table-${groupId}`, 
        type: 'table-square', 
        x: centerX - size/2, 
        y: centerY - size/2, 
        rotation: 0, 
        width: size, 
        height: size, 
        chairCount: tableChairCount,
        groupId, 
        label: 'Kare Masa',
        z: 0.75, 
        h: 0.05 
      });
    } else if (tmplId === 'protocol_free') {
      const mainTableWidth = Math.max(400, blockChairs * 60);
      newElements.push({ id: `p-main-${groupId}`, type: 'table-rect', x: centerX - mainTableWidth/2, y: centerY - 50, rotation: 0, width: mainTableWidth, height: 100, groupId, label: 'PROTOKOL', z: 0.75, h: 0.05 });
      for (let i = 0; i < blockChairs; i++) {
        newElements.push({ id: `p-c-${i}-${groupId}`, type: 'chair', x: centerX - mainTableWidth/2 + 30 + (i * (mainTableWidth - 60) / (blockChairs - 1 || 1)) - 20, y: centerY + 60, rotation: 0, seatNumber: `P${i + 1}`, groupId, z: 0, h: 0 });
      }
    } else if (tmplId === 'square_free') {
      const size = Math.max(200, blockChairs * 40);
      const chairsPerSide = Math.ceil(blockChairs / 4);
      
      // Tables
      newElements.push({ id: `sq-1-${groupId}`, type: 'table-rect', x: centerX - size/2, y: centerY - size/2, rotation: 0, width: size, height: 60, groupId, z: 0.75, h: 0.05 });
      newElements.push({ id: `sq-2-${groupId}`, type: 'table-rect', x: centerX - size/2, y: centerY + size/2 - 60, rotation: 0, width: size, height: 60, groupId, z: 0.75, h: 0.05 });
      newElements.push({ id: `sq-3-${groupId}`, type: 'table-rect', x: centerX - size/2, y: centerY - size/2 + 60, rotation: 90, width: size - 120, height: 60, groupId, z: 0.75, h: 0.05 });
      newElements.push({ id: `sq-4-${groupId}`, type: 'table-rect', x: centerX + size/2 - 60, y: centerY - size/2 + 60, rotation: 90, width: size - 120, height: 60, groupId, z: 0.75, h: 0.05 });

      // Chairs around
      for (let i = 0; i < chairsPerSide; i++) {
        const offset = (i * (size - 40) / (chairsPerSide - 1 || 1));
        newElements.push({ id: `sq-c1-${i}-${groupId}`, type: 'chair', x: centerX - size/2 + offset, y: centerY - size/2 - 50, rotation: 180, seatNumber: `N${i+1}`, groupId, z: 0, h: 0 });
        newElements.push({ id: `sq-c2-${i}-${groupId}`, type: 'chair', x: centerX - size/2 + offset, y: centerY + size/2 + 10, rotation: 0, seatNumber: `S${i+1}`, groupId, z: 0, h: 0 });
        newElements.push({ id: `sq-c3-${i}-${groupId}`, type: 'chair', x: centerX - size/2 - 50, y: centerY - size/2 + offset, rotation: 90, seatNumber: `W${i+1}`, groupId, z: 0, h: 0 });
        newElements.push({ id: `sq-c4-${i}-${groupId}`, type: 'chair', x: centerX + size/2 + 10, y: centerY - size/2 + offset, rotation: 270, seatNumber: `E${i+1}`, groupId, z: 0, h: 0 });
      }
    } else if (tmplId === 'amphi_free') {
      const radius = 300;
      const startAngle = -120;
      const endAngle = -60;
      const rows = blockRows;
      const chairsPerRow = blockChairs;
      
      for (let r = 0; r < rows; r++) {
        const currentRadius = radius + (r * 60);
        for (let c = 0; c < chairsPerRow; c++) {
          const angle = startAngle + (c * (endAngle - startAngle) / (chairsPerRow - 1));
          const rad = angle * Math.PI / 180;
          const x = centerX + currentRadius * Math.cos(rad);
          const y = centerY + currentRadius * Math.sin(rad);
          newElements.push({
            id: `am-${r}-${c}-${groupId}`,
            type: 'chair',
            x: x - 20,
            y: y - 20,
            rotation: angle + 90,
            seatNumber: `${String.fromCharCode(65 + r)}${c + 1}`,
            groupId,
            z: 0,
            h: 0
          });
        }
      }
    }
    return newElements;
  }, [blockRows, blockChairs, tableChairCount]);

  const allHallConfigs = useMemo(() => {
    const combined: Record<string, HallConfig> = {};
    Object.keys(HALL_CONFIGS).forEach(key => {
      combined[key] = { 
        ...HALL_CONFIGS[key], 
        elements: (HALL_CONFIGS[key] as any).elements || [],
        referenceImages: (HALL_CONFIGS[key] as any).referenceImages || [],
        viewMode: (HALL_CONFIGS[key] as any).viewMode || '2d'
      };
    });
    Object.keys(dynamicHalls).forEach(key => {
      combined[key] = { 
        ...dynamicHalls[key], 
        elements: dynamicHalls[key].elements || [],
        referenceImages: dynamicHalls[key].referenceImages || referenceImages,
        viewMode: dynamicHalls[key].viewMode || viewMode
      };
    });
    return combined;
  }, [dynamicHalls, referenceImages, viewMode]);

  const pushToHistory = useCallback((config: HallConfig) => {
    setHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(config))];
      if (newHistory.length > 50) return newHistory.slice(1);
      return newHistory;
    });
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const handleSmartAutoLayout = useCallback(() => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall) return;
    
    pushToHistory(currentHall);
    
    const elements: HallElement[] = [];
    const hallWidth = currentHall.width || 1200;
    const hallHeight = currentHall.height || 800;
    
    // Simple grid layout for tables
    const cols = Math.floor((hallWidth - 200) / 250);
    const rows = Math.floor((hallHeight - 200) / 250);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        elements.push({
          id: `auto-${r}-${c}-${Date.now()}`,
          type: 'table-round',
          x: 150 + c * 250,
          y: 150 + r * 250,
          rotation: 0,
          width: 120,
          height: 120,
          chairCount: tableChairCount,
          label: `Masa ${r * cols + c + 1}`
        });
      }
    }
    
    setDynamicHalls(prev => ({
      ...prev,
      [selectedHall]: {
        ...currentHall,
        elements: [...(currentHall.elements || []), ...elements]
      }
    }));
  }, [selectedHall, allHallConfigs, tableChairCount, pushToHistory]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    
    const currentConfig = allHallConfigs[selectedHall];
    const prevConfig = history[history.length - 1];
    
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(currentConfig))]);
    setHistory(prev => prev.slice(0, -1));
    
    setDynamicHalls(prev => ({
      ...prev,
      [selectedHall]: prevConfig
    }));
  }, [history, selectedHall, allHallConfigs]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const currentConfig = allHallConfigs[selectedHall];
    const nextConfig = redoStack[redoStack.length - 1];
    
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(currentConfig))]);
    setRedoStack(prev => prev.slice(0, -1));
    
    setDynamicHalls(prev => ({
      ...prev,
      [selectedHall]: nextConfig
    }));
  }, [redoStack, selectedHall, allHallConfigs]);

  const fetchHalls = async () => {
    try {
      const { data, error } = await supabase
        .from('halls')
        .select('*');
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "halls" does not exist')) {
          console.log('Halls table not found, using local storage/memory');
          return;
        }
        throw error;
      }

      if (data) {
        const configs: Record<string, HallConfig> = {};
        const cityHalls: Record<string, string[]> = {};

        data.forEach((h: any) => {
          const hallKey = h.id;
          configs[hallKey] = h.config;
          if (!cityHalls[h.city]) cityHalls[h.city] = [];
          cityHalls[h.city].push(hallKey);
        });

        setDynamicHalls(configs);
        setDynamicCityHalls(cityHalls);
      }
    } catch (err) {
      console.error('Error fetching halls:', err);
    }
  };

  const handleDeleteHall = async (hallId: string) => {
    setIsSyncing(true);
    setStatusMessage({ text: "Salon siliniyor...", type: 'info' });
    
    try {
      console.log(`[DELETE] Salon siliniyor: ${hallId}`);
      
      const { error, count } = await supabase
        .from('halls')
        .delete({ count: 'exact' })
        .eq('id', hallId);

      if (error) throw error;
      console.log(`[DELETE] Silinen satır sayısı: ${count}`);

      // Yerel state'leri güncelle
      setDynamicHalls(prev => {
        const next = { ...prev };
        delete next[hallId];
        return next;
      });
      
      setDynamicCityHalls(prev => {
        const next = { ...prev };
        let found = false;
        Object.keys(next).forEach(city => {
          const originalCount = next[city].length;
          const filtered = next[city].filter(id => id !== hallId);
          if (filtered.length !== originalCount) {
            found = true;
            if (filtered.length === 0) {
              delete next[city];
            } else {
              next[city] = filtered;
            }
          }
        });
        console.log(`[DELETE] Şehir listesinde bulundu mu: ${found}`);
        return next;
      });

      // Eğer silinen salon seçiliyse varsayılana dön
      if (selectedHall === hallId) {
        console.log(`[DELETE] Seçili salon silindi, 'yildiz' salonuna dönülüyor.`);
        setSelectedHall('yildiz');
      }
      
      setStatusMessage({ text: "Salon başarıyla silindi.", type: 'success' });
      
      // Veritabanından tekrar çekerek senkronizasyonu garanti et
      setTimeout(() => fetchHalls(), 500);
    } catch (err: any) {
      console.error('[DELETE] Hata:', err);
      setStatusMessage({ text: `Silme hatası: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleSaveHall = async () => {
    const hallConfig = allHallConfigs[selectedHall];
    if (!hallConfig) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('halls')
        .upsert({
          id: selectedHall,
          city: selectedCity,
          name: hallConfig.name,
          address: hallConfig.address || '',
          config: hallConfig,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatusMessage({ text: "Salon başarıyla sisteme kaydedildi.", type: 'success' });
      fetchHalls();
    } catch (err: any) {
      console.error('Error saving hall:', err);
      setStatusMessage({ 
        text: `Kayıt hatası: ${err.message}. Lütfen veritabanı tablosunun (halls) mevcut olduğundan emin olun.`, 
        type: 'error' 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  const handleUpdateHall = useCallback((newConfig: HallConfig) => {
    const currentHall = allHallConfigs[selectedHall];
    if (currentHall) {
      pushToHistory(currentHall);
    }
    setDynamicHalls(prev => ({
      ...prev,
      [selectedHall]: newConfig
    }));
  }, [selectedHall, allHallConfigs, pushToHistory]);

  const handleAddElement = useCallback((elements: HallElement[]) => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall) return;
    
    pushToHistory(currentHall);
    
    // Assign unique IDs if not present
    const elementsWithIds = elements.map(el => ({
      ...el,
      id: el.id || Math.random().toString(36).substr(2, 9)
    }));

    setDynamicHalls(prev => ({
      ...prev,
      [selectedHall]: {
        ...currentHall,
        elements: [...(currentHall.elements || []), ...elementsWithIds]
      }
    }));
  }, [selectedHall, allHallConfigs, pushToHistory]);

  const handlePreviewTemplate = useCallback((elements: HallElement[] | null) => {
    setPreviewElements(elements);
  }, []);

  const stats = useMemo(() => {
    return {
      total: protocolList.length,
      confirmed: protocolList.filter(p => p.katilim_durumu === 'katiliyor').length,
      waiting: protocolList.filter(p => !p.katilim_durumu || p.katilim_durumu === 'bekliyor').length,
      declined: protocolList.filter(p => p.katilim_durumu === 'katilmiyor').length,
      seated: Object.values(seating).filter(s => (s as SeatData).data !== null).length
    };
  }, [protocolList, seating]);

  const allCityHalls = useMemo(() => {
    const combined: Record<string, string[]> = { ...CITY_HALLS };
    Object.keys(dynamicCityHalls).forEach((city) => {
      const halls = dynamicCityHalls[city];
      combined[city] = [...(combined[city] || []), ...halls];
    });
    return combined;
  }, [dynamicCityHalls]);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('lastSyncTime'));
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [invitationFile, setInvitationFile] = useState<File | null>(null);
  const [botInfo, setBotInfo] = useState<{ username: string, firstName: string } | null>(null);

  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;

  const completedSteps = useMemo(() => {
    return {
      1: !!selectedHall,
      2: !!invitationFile,
      3: protocolList.length > 0,
      4: stats.confirmed > 0,
      5: stats.seated > 0,
      6: stats.seated > 0,
      7: stats.seated > 0
    };
  }, [selectedHall, invitationFile, protocolList.length, stats.confirmed, stats.seated]);

  const lastUpdateId = useRef<number>(0);

  const formatChatId = (tgId: any) => {
    if (tgId === null || tgId === undefined) return null;
    // Tüm görünmez karakterleri ve boşlukları temizle
    let clean = String(tgId).replace(/[\u200B-\u200D\uFEFF\s]/g, '').trim();
    if (!clean || clean === 'null' || clean === 'undefined' || clean === '@') return null;
    
    // Sayısal ID kontrolü
    if (/^-?\d+$/.test(clean)) return clean;
    
    // Kullanıcı adı kontrolü
    return clean.startsWith('@') ? clean : `@${clean}`;
  };

  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSyncRef = useRef<number>(0);

  const fetchStatuses = useCallback(async () => {
    if (!supabase || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsSyncing(true);
    try {
      // Şehir ismini normalize et (tırnak işaretlerini kaldır)
      const normalizedCity = selectedCity.replace(/['"]/g, '').trim();
      
      const { data, error } = await supabase
        .from('protokol_listesi')
        .select('*')
        .or(`sehir.eq.${normalizedCity},sehir.eq."${normalizedCity}",sehir.eq.'${normalizedCity}'`)
        .order('sira', { ascending: true });
        
      if (error) throw error;

      if (data && data.length > 0) {
        // OTOMATİK STANDARTLAŞTIRMA KONTROLÜ
        const needsUpdate = data.filter((item: any) => {
          const city = item.sehir || "";
          const cleanCity = city.replace(/['"]/g, '').trim();
          const cleanStatus = (item.durum === 'katiliyor' || item.durum === 'katılıyor') ? 'katiliyor' : 
                              (item.durum === 'katilmiyor' || item.durum === 'katılmıyor') ? 'katilmiyor' : 'bekliyor';
          
          // Telefon numarası kontrolü (Özellikle 5442717284 ve genel format)
          const tg = String(item.telegram_id || '').replace(/\s/g, '');
          const tel = String(item.telefon || '').replace(/\s/g, '');
          const isPhone = /^(05|5)\d{9}$/.test(tg) || tg === '5442717284' || tel === '5442717284';
          
          return city !== cleanCity || item.durum !== cleanStatus || isPhone;
        });

        if (needsUpdate.length > 0) {
          const now = Date.now();
          if (now - lastAutoSyncRef.current > 5000) {
            lastAutoSyncRef.current = now;
            console.log(`[AUTO-SYNC] ${needsUpdate.length} kayıt toplu olarak standardize ediliyor...`);
            const updates = needsUpdate.map((item: any) => {
              const tg = String(item.telegram_id || '').replace(/\s/g, '');
              const tel = String(item.telefon || '').replace(/\s/g, '');
              const isPhoneTg = /^(05|5)\d{9}$/.test(tg) || tg === '5442717284';
              const isPhoneTel = tel === '5442717284';
              
              const updateObj: any = {
                id: item.id,
                sehir: (item.sehir || "").replace(/['"]/g, '').trim(),
                durum: (item.durum === 'katiliyor' || item.durum === 'katılıyor') ? 'katiliyor' : 
                       (item.durum === 'katilmiyor' || item.durum === 'katılmıyor') ? 'katilmiyor' : 'bekliyor',
                telegram_id: isPhoneTg ? null : item.telegram_id
              };

              // Eğer telefon sütunu varsa onu da temizle
              if ('telefon' in item) {
                updateObj.telefon = isPhoneTel ? null : item.telefon;
              }

              return updateObj;
            });
            
            const { error: upsertError } = await supabase.from('protokol_listesi').upsert(updates);
            if (upsertError) console.error("[AUTO-SYNC] Hata:", upsertError);
            return;
          }
        }

        // Boş veya NULL isimli satırları filtrele (Supabase'deki hatalı girişleri engelle)
        const validData = data.filter((d: any) => d.ad_soyad && d.ad_soyad.trim() !== "");
        
        const mappedList: ProtocolPerson[] = validData.map((d: any) => ({
          u: d.unvan || "Ünvan Belirtilmedi",
          i: d.ad_soyad || d.isim || "İsim Belirtilmedi",
          tg: d.telegram_id,
          katilim_durumu: (d.durum === 'katiliyor' || d.durum === 'katılıyor') ? 'katiliyor' : 
                          (d.durum === 'katilmiyor' || d.durum === 'katılmıyor') ? 'katilmiyor' : 'bekliyor',
          es_durumu: d.es_durumu === true,
          koltuk_no: d.koltuk_no,
          id: d.id,
          sira: d.sira || d.id,
          sehir: d.sehir,
          isLocal: false
        }));

        setProtocolList(mappedList);
        
        const protocolSeating: Record<string, SeatData> = {};
        mappedList.forEach(p => {
            if (p.koltuk_no && (p.katilim_durumu === 'katiliyor' || p.katilim_durumu === 'bekliyor')) {
                const seatIds = p.koltuk_no.split('-');
                seatIds.forEach((sid, index) => {
                  protocolSeating[sid] = { 
                    id: sid, 
                    data: index === 0 ? p : { ...p, i: `${p.i} (Eşi)` }, 
                    type: p.katilim_durumu === 'katiliyor' ? 'dolu' : 'bekliyor', 
                    number: sid.replace(/[A-Z]/g, '') 
                  };
                });
            }
        });

        setSeating(prev => {
          const newSeating = { ...protocolSeating };
          // Manuel (Özel Kayıt) yerleşimleri koru
          Object.keys(prev).forEach(sid => {
            if (prev[sid].type === 'ozel') {
              newSeating[sid] = prev[sid];
            }
          });
          return newSeating;
        });
      } else {
        // Veritabanı boşsa: Muğla ise varsayılanı göster
        if (selectedCity === 'Muğla') {
          setProtocolList(PROTOCOL_DATA.map(p => ({ ...p, isLocal: true })));
        } else {
          // Başka il ise unvanları göster ama isimleri gizle (İSİM BEKLENİYOR... yaz)
          // Sadece ilk 50 unvanı gösterelim ki liste çok kalabalık ve anlamsız durmasın
          const placeholderList = PROTOCOL_DATA.slice(0, 50).map(p => ({
            ...p,
            i: "İSİM BEKLENİYOR...",
            katilim_durumu: 'bekliyor' as const,
            id: p.id + 10000,
            isLocal: true
          }));
          setProtocolList(placeholderList);
        }
        
        // Seating'i temizle (Özel kayıtlar hariç)
        setSeating(prev => {
          const newSeating: Record<string, SeatData> = {};
          Object.keys(prev).forEach(sid => {
            if (prev[sid].type === 'ozel') {
              newSeating[sid] = prev[sid];
            }
          });
          return newSeating;
        });
      }
    } catch (err: any) {
      console.error("Fetch Error Details:", err);
      setStatusMessage({ text: `Bağlantı Hatası: ${err.message || 'Sunucuya erişilemiyor'}`, type: 'error' });
      // Hata durumunda eğer liste boşsa varsayılanı veya yer tutucuyu yükle
      if (selectedCity === 'Muğla') {
        setProtocolList(prev => prev.length === 0 ? PROTOCOL_DATA : prev);
      } else {
        setProtocolList(prev => prev.length === 0 ? PROTOCOL_DATA.slice(0, 50).map(p => ({ 
          ...p, 
          i: "İSİM BEKLENİYOR...", 
          id: p.id + 10000 
        })) : prev);
      }
    } finally {
      isFetchingRef.current = false;
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [selectedCity]);

  // Realtime Subscription for automatic updates when DB changes
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'protokol_listesi'
        },
        (payload) => {
          console.log('Veritabanı değişikliği algılandı:', payload.eventType);
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            fetchStatuses();
          }, 1500); // 1.5 saniye debounce (toplu değişiklikler için)
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchStatuses]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    setStatusMessage({ text: "Veriler Sıfırlanıyor ve Güncelleniyor...", type: 'info' });
    try {
      if (supabase) {
        // 1. Veritabanındaki tüm koltuk atamalarını temizle
        const { error: updateError } = await supabase
          .from('protokol_listesi')
          .update({ koltuk_no: null })
          .neq('id', 0); // WHERE clause ekleyerek güvenlik kontrolünü geçiyoruz
        
        if (updateError) throw updateError;
      }
      
      // 2. Güncel durumları çek (Telegram polling zaten arka planda çalışıyor)
      await fetchStatuses();
      
      // 3. Yerel koltuk hafızasını temizle (Manuel kayıtlar hariç)
      setSeating(prev => {
        const preserved: Record<string, SeatData> = {};
        Object.keys(prev).forEach(sid => {
          if (prev[sid].type === 'ozel') preserved[sid] = prev[sid];
        });
        return preserved;
      });
      
      setStatusMessage({ text: "Koltuklar Sıfırlandı ve Güncel Veriler Alındı.", type: 'success' });
    } catch (err: any) {
      console.error("Yenileme Hatası:", err);
      setStatusMessage({ text: "Hata: " + (err.message || "Bağlantı sorunu"), type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  useEffect(() => {
    let isPolling = true;
    const pollTelegram = async () => {
      if (!isPolling) return;
      try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId.current + 1}&timeout=10`);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
          let hasChange = false;
          for (const update of data.result) {
            lastUpdateId.current = Math.max(lastUpdateId.current, update.update_id);
            
            // Handle /start or other messages
            if (update.message && update.message.text) {
              const msg = update.message;
              const text = msg.text.toLowerCase();
              if (text === '/start' || text === 'başlat' || text === 'merhaba') {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    chat_id: msg.chat.id, 
                    text: `Merhaba *${msg.from.first_name || 'Misafir'}*!\n\nProtokol Davet Sistemi Botuna hoş geldiniz. Davetiyeleriniz ve koltuk bilgileriniz buradan iletilecektir.\n\nID'niz: \`${msg.chat.id}\``,
                    parse_mode: 'Markdown'
                  })
                });
              }
            }

            if (update.callback_query && supabase) {
              const callback = update.callback_query;
              const parts = callback.data.split('_'); 
              if (parts[0] === 'rsvp') {
                const type = parts[1];
                const personId = parts[2]; // Artık ID kullanıyoruz
                
                if (personId) {
                  let newDurum = type === 'n' ? 'katilmiyor' : 'katiliyor';
                  let newEsDurumu = type === 'e';
                  
                  // ID ile güncelleme daha güvenli
                  await supabase.from('protokol_listesi').update({ 
                    durum: newDurum, 
                    es_durumu: newEsDurumu 
                  }).eq('id', personId);
                  
                  hasChange = true;
                }
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ callback_query_id: callback.id, text: "Yanıtınız kaydedildi." })
                });
              }
            }
          }
          if (hasChange) fetchStatuses();
        }
      } catch (e) {
        console.error("Polling Error:", e);
      } finally {
        if (isPolling) setTimeout(pollTelegram, 3000);
      }
    };
    
    pollTelegram();
    return () => { isPolling = false; };
  }, [fetchStatuses]);

  // Bot kimliğini kontrol et (Konsola yazdır)
  useEffect(() => {
    const checkBot = async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const data = await res.json();
        if (data.ok) {
          console.log("Telegram Bot Aktif:", data.result.username);
          setBotInfo({ username: data.result.username, firstName: data.result.first_name });
        } else {
          console.error("Telegram Bot Hatası (Token Geçersiz olabilir):", data);
          setBotInfo(null);
        }
      } catch (e) {
        console.error("Bot Check Error:", e);
        setBotInfo(null);
      }
    };
    checkBot();
  }, []);

  useEffect(() => { 
    fetchStatuses(); 
    setSeating({}); // Şehir değişince koltukları temizle
    setSelectedAttendeeIds(new Set());
  }, [selectedCity, selectedHall, fetchStatuses]);

  // Şehir değişince salon seçimini sıfırla
  useEffect(() => {
    const halls = allCityHalls[selectedCity];
    if (halls && halls.length > 0) {
      if (!selectedHall || !halls.includes(selectedHall)) {
        setSelectedHall(halls[0] as HallKey);
      }
    } else {
      setSelectedHall('' as HallKey);
    }
  }, [selectedCity, allCityHalls]);

  const handleSendRSVP = async () => {
    const selectedPeople = protocolList.filter(p => p.id && selectedAttendeeIds.has(p.id));
    if (selectedPeople.length === 0 || !invitationFile) {
      setStatusMessage({ text: "Lütfen kişi ve davetiye görseli seçiniz.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsSyncing(true);
    setStatusMessage({ text: "Gönderiliyor...", type: 'info' });
    console.log(`[RSVP] İşlem başlatıldı. Seçilen kişi sayısı: ${selectedPeople.length}`);
    console.log(`[RSVP] Kullanılan Bot Token (İlk 10 hane): ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
    
    let successCount = 0;
    let failCount = 0;
    let missingIdCount = 0;
    let chatNotFoundCount = 0;
    
    for (const p of selectedPeople) {
      const chatId = formatChatId(p.tg);
      console.log(`[RSVP] Hazırlanıyor: ${p.i} | TG: ${p.tg} | ChatID: ${chatId}`);
      
      if (!chatId) {
        console.warn(`[RSVP] Telegram ID eksik: ${p.i}`);
        missingIdCount++;
        continue;
      }
      try {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', invitationFile);
        formData.append('caption', `SAYIN *${p.u.toUpperCase()} ${p.i.toUpperCase()}*,\n\nDAVETİYENİZ EKTE SUNULMUŞTUR.\n\nLÜTFEN KATILIM DURUMUNUZU BİLDİRİNİZ.`);
        formData.append('parse_mode', 'Markdown');
        formData.append('reply_markup', JSON.stringify({
          inline_keyboard: [
            [{ text: "✅ KATILIYORUM", callback_data: `rsvp_y_${p.id}` }, { text: "❌ KATILMIYORUM", callback_data: `rsvp_n_${p.id}` }],
            [{ text: "👫 EŞLİ", callback_data: `rsvp_e_${p.id}` }, { text: "👤 TEK", callback_data: `rsvp_s_${p.id}` }]
          ]
        }));
        
        console.log(`[RSVP] Telegram'a gönderiliyor: ${chatId}`);
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
        const resData = await res.json();
        
        if (res.ok) {
          console.log(`[RSVP] Başarılı: ${p.i}`);
          successCount++;
        } else {
          console.error(`[RSVP] Telegram Hatası (${p.i}):`, resData);
          if (resData.description && resData.description.includes("chat not found")) {
            console.warn(`[RSVP] Kullanıcı botu başlatmamış veya ID hatalı: ${p.i} (${chatId})`);
            console.info(`[RSVP] İPUCU: Telegram kullanıcı adı (@...) yerine sayısal ID (ör: 979276786) kullanmayı deneyin.`);
            chatNotFoundCount++;
          } else {
            failCount++;
          }
        }
      } catch (e) {
        console.error(`[RSVP] İstek Hatası (${p.i}):`, e);
        failCount++;
      }
    }
    setIsSyncing(false);
    
    let resultText = `${successCount} Davetiye Gönderildi.`;
    if (chatNotFoundCount > 0) resultText += ` ${chatNotFoundCount} Kişi Botu Başlatmamış.`;
    if (failCount > 0) resultText += ` ${failCount} Hata Oluştu.`;
    if (missingIdCount > 0) resultText += ` ${missingIdCount} Kişinin Telegram ID'si Eksik.`;
    
    setStatusMessage({ 
      text: resultText, 
      type: successCount > 0 ? 'success' : 'error' 
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSendSeatNumbers = async () => {
    const selectedPeople = protocolList.filter(p => p.id && selectedAttendeeIds.has(p.id) && p.koltuk_no);
    if (selectedPeople.length === 0) {
      setStatusMessage({ text: "Koltuk numarası atanmış seçili kişi bulunamadı.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsSyncing(true);
    setStatusMessage({ text: "Koltuk Bilgileri Gönderiliyor...", type: 'info' });
    console.log(`[Koltuk] İşlem başlatıldı. Seçilen kişi sayısı: ${selectedPeople.length}`);
    
    let successCount = 0;
    let failCount = 0;
    let missingIdCount = 0;
    let chatNotFoundCount = 0;
    
    for (const p of selectedPeople) {
      const chatId = formatChatId(p.tg);
      console.log(`[Koltuk] Hazırlanıyor: ${p.i} | TG: ${p.tg} | ChatID: ${chatId}`);
      
      if (!chatId) {
        missingIdCount++;
        continue;
      }
      try {
        const hallConfig = allHallConfigs[selectedHall];
        const salonInfo = hallConfig ? `\n\n📍 SALON: *${hallConfig.name.toUpperCase()}*${hallConfig.address ? `\n📍 ADRES: *${hallConfig.address.toUpperCase()}*` : ''}` : '';
        const message = `SAYIN *${p.u.toUpperCase()} ${p.i.toUpperCase()}*,\n\nETKİNLİK KOLTUK NUMARANIZ: *${p.koltuk_no}*${salonInfo}\n\nİyi seyirler dileriz.`;
        
        console.log(`[Koltuk] Telegram'a gönderiliyor: ${chatId}`);
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
        });
        const resData = await res.json();
        
        if (res.ok) {
          console.log(`[Koltuk] Başarılı: ${p.i}`);
          successCount++;
        } else {
          console.error(`[Koltuk] Telegram Hatası (${p.i}):`, resData);
          if (resData.description && resData.description.includes("chat not found")) {
            chatNotFoundCount++;
          } else {
            failCount++;
          }
        }
      } catch (e) {
        console.error(`[Koltuk] İstek Hatası (${p.i}):`, e);
        failCount++;
      }
    }
    setIsSyncing(false);
    
    let resultText = `${successCount} Kişiye Koltuk Bilgisi Gönderildi.`;
    if (chatNotFoundCount > 0) resultText += ` ${chatNotFoundCount} Kişi Botu Başlatmamış.`;
    if (failCount > 0) resultText += ` ${failCount} Hata Oluştu.`;
    if (missingIdCount > 0) resultText += ` ${missingIdCount} Kişinin Telegram ID'si Eksik.`;
    
    setStatusMessage({ 
      text: resultText, 
      type: successCount > 0 ? 'success' : 'error' 
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handlePrintLabels = () => {
    const labels: { name: string, title: string }[] = [];

    // 1. Protokol listesinden seçilen ve koltuk atanmış kişiler
    const selectedPeople = protocolList.filter(p => p.id && selectedAttendeeIds.has(p.id) && p.koltuk_no);
    selectedPeople.forEach(p => {
      labels.push({ name: p.i, title: p.u });
      if (p.es_durumu) {
        labels.push({ name: `${p.i} (Eşi)`, title: p.u });
      }
    });

    // 2. Salona manuel eklenen özel misafirler (Özel Kayıtlar)
    (Object.values(seating) as SeatData[]).forEach(seat => {
      if (seat.type === 'ozel' && seat.data) {
        labels.push({ name: seat.data.i, title: seat.data.u });
      }
    });

    if (labels.length === 0) {
      setStatusMessage({ text: "Yazdırılacak kişi (seçili protokol veya manuel kayıt) bulunamadı.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setStatusMessage({ text: "Pop-up engelleyici yazdırılacak sayfayı engelledi. Lütfen tarayıcı ayarlarından izin verin.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }

    const html = `
      <html>
        <head>
          <title>Etiket Yazdır - BK-2014</title>
          <style>
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .page {
              width: 210mm;
              height: 297mm;
              padding-top: 15.15mm;
              padding-left: 5.9mm;
              display: flex;
              flex-wrap: wrap;
              align-content: flex-start;
              page-break-after: always;
              box-sizing: border-box;
            }
            .label {
              width: 99.1mm;
              height: 38.1mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              box-sizing: border-box;
              padding: 5mm;
              overflow: hidden;
            }
            .name {
              font-size: 14pt;
              font-weight: 900;
              color: #000;
              text-transform: uppercase;
              margin-bottom: 4px;
              line-height: 1.1;
            }
            .title {
              font-size: 10pt;
              font-weight: 600;
              color: #444;
              text-transform: uppercase;
              line-height: 1.1;
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${labels.map((l, index) => `
              <div class="label">
                <div class="name">${l.name}</div>
                <div class="title">${l.title}</div>
              </div>
              ${(index + 1) % 14 === 0 && index + 1 !== labels.length ? '</div><div class="page">' : ''}
            `).join('')}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleYerlestir = useCallback(async () => {
    setIsSyncing(true);
    setStatusMessage({ text: "Koltuklar Planlanıyor...", type: 'info' });
    
    // 1. Sadece SEÇİLİ ve (KATILAN veya BEKLEYEN) konukları al, protokol sırasına (sira/id) göre diz
    // ÖNEMLİ: Re-kalkülasyon için mevcut koltuk numaralarını temizliyoruz (manuel kayıtlar hariç)
    const attendees = protocolList
      .filter(p => p.id && selectedAttendeeIds.has(p.id) && p.katilim_durumu !== 'katilmiyor')
      .sort((a, b) => (a.sira || a.id || 0) - (b.sira || b.id || 0))
      .map(p => ({ ...p, koltuk_no: undefined }));

    if (attendees.length === 0) {
      setStatusMessage({ text: "Lütfen katılımı onaylanmış ve listeden seçilmiş kişileri yerleştirin.", type: 'error' });
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const newSeating: Record<string, SeatData> = {};
    const takenSeats = new Set<string>();

    // 1. Mevcut manuel (Özel Kayıt) yerleşimleri koru ve rezerve et
    Object.keys(seating).forEach(sid => {
      if (seating[sid].type === 'ozel') {
        newSeating[sid] = seating[sid];
        takenSeats.add(sid);
      }
    });

    let attendeeIdx = 0;
    const hall = HALL_CONFIGS[selectedHall];

    for (const rowConfig of hall.rows) {
      const rowSeats = rowConfig.seats;
      const seatIndices = rowSeats
        .map((s, i) => s.type === 'seat' ? i : -1)
        .filter(i => i !== -1);
      
      if (seatIndices.length === 0) continue;

      // Sıranın ortasını bul
      let centerIdxOfIndices = Math.floor(seatIndices.length / 2);
      
      // Merkezden dışa doğru spiral yerleşim
      for (let offset = 0; offset < seatIndices.length * 2; offset++) {
        if (attendeeIdx >= attendees.length) break;

        let spiral = offset === 0 ? 0 : (offset % 2 === 1 ? Math.ceil(offset / 2) : -Math.ceil(offset / 2));
        let targetIdxOfIndices = centerIdxOfIndices + spiral;
        
        if (targetIdxOfIndices < 0 || targetIdxOfIndices >= seatIndices.length) continue;
        
        const seatIdx = seatIndices[targetIdxOfIndices];
        const seat = rowSeats[seatIdx];
        const seatId = `${rowConfig.row}${seat.number}`;

        if (takenSeats.has(seatId)) continue;

        const person = attendees[attendeeIdx];

        if (person.es_durumu) {
          // EŞLİ KURALI: Yan yana iki koltuk bul
          let neighborIdx = -1;
          // Önce sağa, sonra sola bak
          if (seatIdx + 1 < rowSeats.length && rowSeats[seatIdx + 1].type === 'seat') {
            const nId = `${rowConfig.row}${rowSeats[seatIdx + 1].number}`;
            if (!takenSeats.has(nId)) neighborIdx = seatIdx + 1;
          }
          if (neighborIdx === -1 && seatIdx - 1 >= 0 && rowSeats[seatIdx - 1].type === 'seat') {
            const nId = `${rowConfig.row}${rowSeats[seatIdx - 1].number}`;
            if (!takenSeats.has(nId)) neighborIdx = seatIdx - 1;
          }

          if (neighborIdx !== -1) {
            const nSeat = rowSeats[neighborIdx];
            const nId = `${rowConfig.row}${nSeat.number}`;
            
            newSeating[seatId] = { id: seatId, data: person, type: 'dolu', number: seat.number };
            newSeating[nId] = { id: nId, data: { ...person, i: `${person.i} (Eşi)` }, type: 'dolu', number: nSeat.number };
            
            takenSeats.add(seatId);
            takenSeats.add(nId);
            
            // Veritabanı için koltuk bilgisini güncelle (A1-A2 formatı)
            person.koltuk_no = `${seatId}-${nId}`;
            attendeeIdx++;
          } else {
            // Yan yana koltuk yoksa bu spiral adımını atla, bir sonrakini dene
            continue;
          }
        } else {
          newSeating[seatId] = { id: seatId, data: person, type: 'dolu', number: seat.number };
          person.koltuk_no = seatId;
          takenSeats.add(seatId);
          attendeeIdx++;
        }
      }
    }

    try {
      if (supabase) {
        // Şehir ismini normalize et (tırnak işaretlerini kaldır)
        const normalizedCity = selectedCity.replace(/['"]/g, '').trim();
        
        // 1. Sadece BU ŞEHİR için koltukları temizle (Baştan yapma isteği için)
        await supabase.from('protokol_listesi').update({ koltuk_no: null }).eq('sehir', normalizedCity);

        // 2. Yeni koltukları toplu olarak güncelle
        // Sadece veritabanından gelen (gerçek) ID'leri güncelle
        const updates = attendees
          .filter(p => p.id && !p.isLocal && p.koltuk_no)
          .map(p => ({
            id: p.id,
            koltuk_no: p.koltuk_no
          }));

        if (updates.length > 0) {
          const { error } = await supabase.from('protokol_listesi').upsert(updates, { onConflict: 'id' });
          if (error) throw error;
        } else {
          // Eğer hiç gerçek ID yoksa, kullanıcıyı uyar
          if (attendees.length > 0) {
            console.warn("Yerleştirme yapıldı ancak veritabanı ID'leri eşleşmediği için Supabase güncellenmedi.");
            setStatusMessage({ 
              text: "Yerel yerleşim yapıldı ancak veritabanı senkronizasyonu için lütfen önce verileri içe aktarın.", 
              type: 'info' 
            });
          }
        }
      }
      
      // ÖNEMLİ: Yerel state'i hemen güncelle ki kullanıcı sonucu görsün
      setSeating(prev => {
        const preserved: Record<string, SeatData> = {};
        Object.keys(prev).forEach(sid => {
          if (prev[sid].type === 'ozel') preserved[sid] = prev[sid];
        });
        return { ...preserved, ...newSeating };
      });

      await fetchStatuses();
      setStatusMessage({ text: "Yerleşim Kurallara Göre Tamamlandı.", type: 'success' });
    } catch (e: any) {
      console.error("Yerleştirme Hatası:", e);
      setStatusMessage({ text: "Hata: " + (e.message || "Bilinmeyen hata"), type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [protocolList, selectedHall, fetchStatuses, selectedAttendeeIds, seating]);
  
  const handleUpdatePerson = async (id: number, updates: Partial<ProtocolPerson>) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('protokol_listesi')
        .update({
          telegram_id: updates.tg,
          ad_soyad: updates.i,
          unvan: updates.u
        })
        .eq('id', id);

      if (error) throw error;
      
      // Yerel durumu güncelle
      setProtocolList(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      setStatusMessage({ text: "Kişi bilgileri güncellendi.", type: 'success' });
    } catch (err: any) {
      console.error("Update Error:", err);
      setStatusMessage({ text: "Güncelleme hatası: " + err.message, type: 'error' });
    } finally {
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const filteredProtocolList = useMemo(() => {
    return protocolList.filter(p => (p.u + " " + p.i).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [protocolList, searchTerm]);

  const updateHall = (newConfig: HallConfig) => {
    let hallKey = selectedHall;
    if (!hallKey) {
      // Yeni bir salon oluştur
      hallKey = `hall_${Date.now()}`;
      setDynamicCityHalls(prev => ({
        ...prev,
        [selectedCity]: [...(prev[selectedCity] || []), hallKey]
      }));
      setSelectedHall(hallKey);
    }

    // Push current state to history before updating
    const currentConfig = allHallConfigs[hallKey];
    if (currentConfig) {
      pushToHistory(JSON.parse(JSON.stringify(currentConfig)));
    }

    setDynamicHalls(prev => ({
      ...prev,
      [hallKey]: newConfig
    }));
  };

  // Selection Bounding Box Calculation for Toolbar
  const selectionBoundingBox = useMemo(() => {
    if (selectedElementIds.size === 0) return null;
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements) return null;
    
    const selected = currentHall.elements.filter(el => selectedElementIds.has(el.id));
    if (selected.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach(el => {
      const w = el.width || 40;
      const h = el.height || 40;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + w);
      maxY = Math.max(maxY, el.y + h);
    });

    return {
      minX, minY, maxX, maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }, [selectedElementIds, allHallConfigs, selectedHall]);

  const handleUpdateElements = useCallback((ids: string[], updater: (el: HallElement) => Partial<HallElement>) => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements) return;
    const newElements = currentHall.elements.map(el => {
      if (ids.includes(el.id)) {
        return { ...el, ...updater(el) };
      }
      return el;
    });
    updateHall({ ...currentHall, elements: newElements });
  }, [allHallConfigs, selectedHall, updateHall]);

  const handleRemoveElements = useCallback((ids: string[]) => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements) return;
    const newElements = currentHall.elements.filter(el => !ids.includes(el.id));
    updateHall({ ...currentHall, elements: newElements });
    setSelectedElementIds(new Set());
  }, [allHallConfigs, selectedHall, updateHall]);

  const handleDuplicateElements = useCallback((ids: string[]) => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements) return;
    const elementsToDuplicate = currentHall.elements.filter(el => ids.includes(el.id));
    const newElements = elementsToDuplicate.map(el => ({
      ...JSON.parse(JSON.stringify(el)),
      id: Math.random().toString(36).substr(2, 9),
      x: el.x + 30,
      y: el.y + 30
    }));
    updateHall({ ...currentHall, elements: [...currentHall.elements, ...newElements] });
    setSelectedElementIds(new Set(newElements.map(el => el.id)));
  }, [allHallConfigs, selectedHall, updateHall]);

  const handleReorderElements = useCallback((ids: string[], direction: 'front' | 'back') => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements) return;
    const selected = currentHall.elements.filter(el => ids.includes(el.id));
    const others = currentHall.elements.filter(el => !ids.includes(el.id));
    const newElements = direction === 'front' ? [...others, ...selected] : [...selected, ...others];
    updateHall({ ...currentHall, elements: newElements });
  }, [allHallConfigs, selectedHall, updateHall]);

  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);

  const handleSelectAll = useCallback(() => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements) return;
    setSelectedElementIds(new Set(currentHall.elements.map(el => el.id)));
  }, [allHallConfigs, selectedHall]);

  const handleClearSelection = useCallback(() => {
    setSelectedElementIds(new Set());
  }, []);

  const handleMagicLayout = useCallback(async (prompt: string) => {
    if (!prompt || isGeneratingLayout) return;
    setIsGeneratingLayout(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a seating plan layout based on this request: "${prompt}".
        The layout should be for a hall of size ${allHallConfigs[selectedHall]?.width || 1200}x${allHallConfigs[selectedHall]?.height || 800}.
        Return ONLY a JSON array of HallElement objects. 
        HallElement type: { id: string, type: 'chair'|'table-round'|'table-rect'|'table-square'|'stage', x: number, y: number, rotation: number, width?: number, height?: number, label?: string, seatNumber?: string, chairCount?: number, groupId?: string }.
        Use centerX=${(allHallConfigs[selectedHall]?.width || 1200) / 2}, centerY=${(allHallConfigs[selectedHall]?.height || 800) / 2} as the focal point.
        Ensure elements don't overlap too much. For tables, include chairCount.
        Example: [{"id":"1","type":"chair","x":100,"y":100,"rotation":0}]`,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      const elements = JSON.parse(text) as HallElement[];
      
      // Ensure unique IDs
      const newElements = elements.map(el => ({
        ...el,
        id: `ai_${Math.random().toString(36).substr(2, 9)}_${el.id}`
      }));

      handleUpdateHall({
        ...allHallConfigs[selectedHall],
        elements: [...(allHallConfigs[selectedHall].elements || []), ...newElements]
      });
      setStatusMessage({ text: "Yapay zeka yerleşimi başarıyla oluşturuldu.", type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('Magic Layout Error:', error);
      setStatusMessage({ text: "Yapay zeka yerleşimi oluşturulurken bir hata oluştu.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsGeneratingLayout(false);
    }
  }, [allHallConfigs, selectedHall, isGeneratingLayout, handleUpdateHall]);

  const handleAlignElements = useCallback((direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => {
    if (!selectionBoundingBox || selectedElementIds.size < 2) return;
    const { minX, minY, maxX, maxY, centerX, centerY } = selectionBoundingBox;
    handleUpdateElements(Array.from(selectedElementIds), (el) => {
      const w = el.width || 40;
      const h = el.height || 40;
      switch (direction) {
        case 'left': return { x: minX };
        case 'right': return { x: maxX - w };
        case 'top': return { y: minY };
        case 'bottom': return { y: maxY - h };
        case 'center-h': return { x: centerX - w / 2 };
        case 'center-v': return { y: centerY - h / 2 };
        default: return {};
      }
    });
  }, [selectionBoundingBox, selectedElementIds, handleUpdateElements]);

  const handleDistributeElements = useCallback((direction: 'horizontal' | 'vertical') => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements || selectedElementIds.size < 3) return;
    
    const selected = currentHall.elements
      .filter(el => selectedElementIds.has(el.id))
      .sort((a, b) => direction === 'horizontal' ? a.x - b.x : a.y - b.y);
    
    const first = selected[0];
    const last = selected[selected.length - 1];
    
    if (direction === 'horizontal') {
      const totalWidth = last.x - first.x;
      const step = totalWidth / (selected.length - 1);
      handleUpdateElements(selected.map(el => el.id), (el) => {
        const index = selected.findIndex(s => s.id === el.id);
        return { x: first.x + index * step };
      });
    } else {
      const totalHeight = last.y - first.y;
      const step = totalHeight / (selected.length - 1);
      handleUpdateElements(selected.map(el => el.id), (el) => {
        const index = selected.findIndex(s => s.id === el.id);
        return { y: first.y + index * step };
      });
    }
  }, [allHallConfigs, selectedHall, selectedElementIds, handleUpdateElements]);

  const handleGroupElements = useCallback(() => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements || selectedElementIds.size < 2) return;
    const groupId = `group_${Date.now()}`;
    const newElements = currentHall.elements.map(el => {
      if (selectedElementIds.has(el.id)) {
        return { ...el, groupId };
      }
      return el;
    });
    updateHall({ ...currentHall, elements: newElements });
  }, [allHallConfigs, selectedHall, selectedElementIds, updateHall]);

  const handleUngroupElements = useCallback(() => {
    const currentHall = allHallConfigs[selectedHall];
    if (!currentHall || !currentHall.elements || selectedElementIds.size === 0) return;
    const newElements = currentHall.elements.map(el => {
      if (selectedElementIds.has(el.id)) {
        const { groupId, ...rest } = el;
        return rest as HallElement;
      }
      return el;
    });
    updateHall({ ...currentHall, elements: newElements });
  }, [allHallConfigs, selectedHall, selectedElementIds, updateHall]);

  const handleStartFreeDraw = () => {
    const newConfig: HallConfig = {
      name: `${selectedCity} YENİ SALON`,
      rows: [
        { row: 'A', seats: Array.from({ length: 10 }, (_, i) => ({ number: `${i + 1}`, type: 'seat' })) }
      ],
      stage: { label: 'SAHNE', position: 'top', size: 'medium' }
    };
    updateHall(newConfig);
    setActiveLayoutTab('draw');
  };

  const handleLayoutTabChange = useCallback((tab: 'ai' | 'draw' | 'template' | 'library') => {
    setActiveLayoutTab(tab);
    if (tab === 'template' || tab === 'draw') {
      setIsSidebarCollapsed(true);
      setIsRightPanelOpen(true);
    } else {
      setIsSidebarCollapsed(false);
      setIsRightPanelOpen(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-[100]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg"><Users className="text-white w-5 h-5" /></div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Resmi Protokol Daveti</h1>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
              {selectedCity} {selectedCity === 'Muğla' ? `/ ${HALL_CONFIGS[selectedHall].name}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Sistem Versiyonu</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{APP_VERSION}</span>
              <span className="text-[9px] font-medium text-slate-400">{BUILD_DATE}</span>
            </div>
          </div>

          {lastSyncTime && (
            <span className="text-[9px] font-bold text-slate-400 mr-2 uppercase tracking-tighter">
              SON GÜNCELLEME: {lastSyncTime}
            </span>
          )}
          <button onClick={handleRefresh} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95" title="Koltukları Sıfırla"><RefreshCw className={`w-5 h-5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      {statusMessage && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
           {statusMessage.type === 'info' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
           <span className="text-sm font-bold">{statusMessage.text}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          data={filteredProtocolList} 
          selectedIds={selectedAttendeeIds} setSelectedIds={setSelectedAttendeeIds} 
          searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
          onSendInvitations={handleSendRSVP} 
          onSendSeatNumbers={handleSendSeatNumbers}
          onPrintLabels={handlePrintLabels}
          onFileChange={setInvitationFile} 
          invitationFile={invitationFile} 
          toggleAll={(s) => setSelectedAttendeeIds(s ? new Set(protocolList.map(p => p.id).filter((id): id is number => id !== undefined)) : new Set())}
          onRefresh={fetchStatuses}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          selectedHall={selectedHall}
          setSelectedHall={setSelectedHall}
          onYerlestir={handleYerlestir}
          isSyncing={isSyncing}
          onOpenImport={() => setIsImportPanelOpen(true)}
          onOpenHallAnalysis={() => setIsHallAnalysisOpen(true)}
          onStartFreeDraw={handleStartFreeDraw}
          onUpdatePerson={handleUpdatePerson}
          selectedElementIds={selectedElementIds}
          setSelectedElementIds={setSelectedElementIds}
          onUpdateElements={handleUpdateElements}
          onRemoveElements={handleRemoveElements}
          onDuplicateElements={handleDuplicateElements}
          onReorderElements={handleReorderElements}
          onAlignElements={handleAlignElements}
          onDistributeElements={handleDistributeElements}
          onGroupElements={handleGroupElements}
          onUngroupElements={handleUngroupElements}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          botInfo={botInfo}
          activeLayoutTab={activeLayoutTab}
          setActiveLayoutTab={handleLayoutTabChange}
          hall={allHallConfigs[selectedHall] || { name: 'YENİ TASARIM', rows: [], stage: { label: 'SAHNE', position: 'top', size: 'medium' } }}
          onUpdateHall={updateHall}
          onAddElement={handleAddElement}
          onPreviewTemplate={setPreviewElements}
          onSaveHall={handleSaveHall}
          onDeleteHall={handleDeleteHall}
          allCityHalls={allCityHalls}
          allHallConfigs={allHallConfigs}
          dynamicHalls={dynamicHalls}
          stats={stats}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          completedSteps={completedSteps}
          getTemplateElements={getTemplateElements}
          blockRows={blockRows}
          setBlockRows={setBlockRows}
          blockChairs={blockChairs}
          setBlockChairs={setBlockChairs}
          tableChairCount={tableChairCount}
          setTableChairCount={setTableChairCount}
          is3DMode={is3DMode}
          setIs3DMode={setIs3DMode}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onSmartAutoLayout={handleSmartAutoLayout}
          onMagicLayout={handleMagicLayout}
          isGeneratingLayout={isGeneratingLayout}
          isRightPanelOpen={isRightPanelOpen}
          setIsRightPanelOpen={setIsRightPanelOpen}
        />
        <main className="flex-1 overflow-hidden relative flex bg-slate-100">
          <div className="flex-1 overflow-hidden relative flex flex-col items-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
          {/* Floating Workspace Controls */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center group">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-slate-900/40 hover:bg-slate-900/95 backdrop-blur-sm hover:backdrop-blur-xl border border-slate-700/30 hover:border-slate-700/50 rounded-2xl p-1 hover:p-2 shadow-lg hover:shadow-2xl flex items-center gap-1 hover:gap-2 transition-all duration-500 ease-in-out group-hover:scale-105"
            >
              <div className="flex items-center gap-0.5 hover:gap-1 bg-slate-800/30 group-hover:bg-slate-800/50 rounded-xl p-0.5 hover:p-1 transition-all">
                <button 
                  onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                  title="Uzaklaştır"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <div className="px-1 group-hover:px-3 min-w-[40px] group-hover:min-w-[60px] text-center transition-all">
                  <span className="text-[9px] group-hover:text-[10px] font-black text-blue-400 font-mono">%{Math.round(zoom * 100)}</span>
                </div>
                <button 
                  onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                  title="Yakınlaştır"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-4 group-hover:h-6 bg-slate-700/30 group-hover:bg-slate-700/50 mx-0.5 group-hover:mx-1 transition-all" />

              <div className="flex items-center gap-0.5 group-hover:gap-1">
                <button 
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1.5 group-hover:p-2.5 rounded-lg group-hover:rounded-xl transition-all flex items-center gap-2 ${showGrid ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  title="Izgarayı Göster/Gizle"
                >
                  <LayoutGrid className="w-3.5 h-3.5 group-hover:w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Izgara</span>
                </button>
                <button 
                  onClick={() => setShowDimensions(!showDimensions)}
                  className={`p-1.5 group-hover:p-2.5 rounded-lg group-hover:rounded-xl transition-all flex items-center gap-2 ${showDimensions ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  title="Ölçüleri Göster/Gizle"
                >
                  <Ruler className="w-3.5 h-3.5 group-hover:w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Ölçüler</span>
                </button>
                <button 
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={`p-1.5 group-hover:p-2.5 rounded-lg group-hover:rounded-xl transition-all flex items-center gap-2 ${snapToGrid ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  title="Mıknatıs (Snap) Aç/Kapat"
                >
                  <Sparkles className="w-3.5 h-3.5 group-hover:w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Yapış</span>
                </button>
              </div>

              <div className="w-px h-4 group-hover:h-6 bg-slate-700/30 group-hover:bg-slate-700/50 mx-0.5 group-hover:mx-1 transition-all" />

              <button 
                onClick={() => setZoom(0.8)}
                className="p-1.5 group-hover:p-2.5 hover:bg-slate-800 rounded-lg group-hover:rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-2"
                title="Ekrana Sığdır"
              >
                <Maximize2 className="w-3.5 h-3.5 group-hover:w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Sığdır</span>
              </button>

              <div className="w-px h-4 group-hover:h-6 bg-slate-700/30 group-hover:bg-slate-700/50 mx-0.5 group-hover:mx-1 transition-all" />

              <div className="flex items-center gap-0.5 group-hover:gap-1">
                <button 
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`p-1.5 group-hover:p-2.5 rounded-lg group-hover:rounded-xl transition-all ${canUndo ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                  title="Geri Al (CTRL+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 group-hover:w-4 h-4" />
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`p-1.5 group-hover:p-2.5 rounded-lg group-hover:rounded-xl transition-all ${canRedo ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                  title="İleri Al (CTRL+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5 group-hover:w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>

            <div className="flex-1 w-full overflow-auto flex justify-center items-start pt-20 scrollbar-hide">
                {(selectedHall && allHallConfigs[selectedHall]) || activeLayoutTab === 'draw' || activeLayoutTab === 'template' || activeLayoutTab === 'library' ? (
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="transition-transform duration-300 ease-out p-12">
                      <SeatingPlan 
                        hall={allHallConfigs[selectedHall] || { 
                          name: 'YENİ TASARIM', 
                          rows: [], 
                          elements: [
                            { id: 'default-stage', type: 'stage', x: 200, y: 0, rotation: 0, width: 400, height: 100, label: 'SAHNE' }
                          ], 
                          stage: undefined 
                        }} 
                        seating={seating} 
                        onSeatClick={(id) => { setActiveSeatId(id); setGuestModalOpen(true); }}
                        isEditable={activeLayoutTab === 'draw' || activeLayoutTab === 'template' || activeLayoutTab === 'library'}
                        isCalibrating={isCalibrating}
                        isDrawingDimension={isDrawingDimension}
                        isTapeMeasuring={isTapeMeasuring}
                        isDrawingPolygon={isDrawingPolygon}
                        isDrawingSunAngle={isDrawingSunAngle}
                        onCalibrationComplete={(pixelDist) => {
                          setIsCalibrating(false);
                          setLastPixelDist(pixelDist);
                          setCalibrationModalOpen(true);
                        }}
                        onCancelCalibration={() => setIsCalibrating(false)}
                        onToggleDrawingDimension={() => setIsDrawingDimension(!isDrawingDimension)}
                        onToggleTapeMeasuring={() => setIsTapeMeasuring(!isTapeMeasuring)}
                        onToggleDrawingPolygon={() => {
                          setIsDrawingPolygon(!isDrawingPolygon);
                          setIsCalibrating(false);
                          setIsDrawingDimension(false);
                          setIsTapeMeasuring(false);
                          setIsDrawingSunAngle(false);
                          setPreviewElements(null);
                        }}
                        onToggleDrawingSunAngle={() => {
                          setIsDrawingSunAngle(!isDrawingSunAngle);
                          setIsCalibrating(false);
                          setIsDrawingDimension(false);
                          setIsTapeMeasuring(false);
                          setIsDrawingPolygon(false);
                          setPreviewElements(null);
                        }}
                        onUpdateHall={updateHall}
                        zoom={zoom}
                        previewElements={previewElements}
                        selectedElementIds={selectedElementIds}
                        setSelectedElementIds={setSelectedElementIds}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        getTemplateElements={getTemplateElements}
                        blockRows={blockRows}
                        blockChairs={blockChairs}
                        handleRemoveElements={handleRemoveElements}
                        handleDuplicateElements={handleDuplicateElements}
                        handleReorderElements={handleReorderElements}
                        handleAlignElements={handleAlignElements}
                        handleDistributeElements={handleDistributeElements}
                        handleGroupElements={handleGroupElements}
                        handleUngroupElements={handleUngroupElements}
                        handleUpdateElements={handleUpdateElements}
                        selectionBoundingBox={selectionBoundingBox}
                        snapToGrid={snapToGrid}
                        showGrid={showGrid}
                        showDimensions={showDimensions}
                        is3DMode={is3DMode}
                        onToggle3DMode={setIs3DMode}
                        onFileChange={setInvitationFile}
                        referenceImages={referenceImages}
                        onUpdateReferenceImage={handleUpdateReferenceImage}
                      />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full gap-12 p-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center space-y-4 max-w-xl">
                      <div className="w-24 h-24 bg-blue-600 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-200 mb-8">
                        <Plus className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Yeni Salon Tasarımı Başlat</h3>
                      <p className="text-lg font-bold text-slate-400 leading-relaxed">
                        <b>{selectedCity}</b> şehri için henüz bir salon tasarımı bulunamadı. <br />
                        Aşağıdaki araçları kullanarak ilk salonunuzu tasarlamaya başlayın.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                      <div className="p-8 bg-white rounded-[32px] border-2 border-slate-100 shadow-xl hover:border-blue-500 transition-all group cursor-pointer" onClick={() => setIsHallAnalysisOpen(true)}>
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-all">
                          <Sparkles className="w-7 h-7 text-blue-600 group-hover:text-white transition-all" />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">AI Analiz Modu</h4>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed">
                          Mevcut bir salon planının fotoğrafını veya PDF'ini yükleyin, AI sizin için otomatik olarak koltuk düzenini oluştursun.
                        </p>
                      </div>

                      <div className="p-8 bg-white rounded-[32px] border-2 border-slate-100 shadow-xl hover:border-blue-500 transition-all group cursor-pointer" onClick={handleStartFreeDraw}>
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-all">
                          <Edit2 className="w-7 h-7 text-emerald-600 group-hover:text-white transition-all" />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Serbest Çizim</h4>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed">
                          Kendi salon düzeninizi sıfırdan oluşturun. Sahne konumu, koltuk sıraları ve protokol alanlarını özgürce belirleyin.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Right Inspector Sidebar */}
          <RightSidebar 
            isOpen={isRightPanelOpen || selectedElementIds.size > 0}
            onClose={() => {
              setIsRightPanelOpen(false);
              setSelectedElementIds(new Set());
            }}
            selectedElementIds={selectedElementIds}
            hall={allHallConfigs[selectedHall] || { name: 'YENİ TASARIM', rows: [], elements: [] }}
            onAlign={handleAlignElements}
            onDistribute={handleDistributeElements}
            onGroup={handleGroupElements}
            onUngroup={handleUngroupElements}
            onDuplicate={() => handleDuplicateElements(Array.from(selectedElementIds))}
            onReorder={(dir) => handleReorderElements(Array.from(selectedElementIds), dir)}
            onUpdateElements={handleUpdateElements}
            onRemove={handleRemoveElements}
            onAddElement={handleAddElement}
            onSaveHall={handleSaveHall}
            onUpdateHall={handleUpdateHall}
            selectedCity={selectedCity}
            activeLayoutTab={activeLayoutTab}
            isCalibrating={isCalibrating}
            isDrawingDimension={isDrawingDimension}
            isTapeMeasuring={isTapeMeasuring}
            isDrawingPolygon={isDrawingPolygon}
            isDrawingSunAngle={isDrawingSunAngle}
            is3DMode={is3DMode}
            onToggle3DMode={() => setIs3DMode(!is3DMode)}
            onAddReferenceImage={handleAddReferenceImage}
            onRemoveReferenceImage={handleRemoveReferenceImage}
            onUpdateReferenceImage={handleUpdateReferenceImage}
            referenceImages={referenceImages}
            onStartCalibration={(pixelDist) => {
              if (typeof pixelDist === 'number') {
                setLastPixelDist(pixelDist);
                setCalibrationModalOpen(true);
              } else {
                setIsCalibrating(true);
              }
            }}
            onCancelCalibration={() => setIsCalibrating(false)}
            onToggleDrawingDimension={() => setIsDrawingDimension(!isDrawingDimension)}
            onToggleTapeMeasuring={() => setIsTapeMeasuring(!isTapeMeasuring)}
            onToggleDrawingPolygon={() => {
              setIsDrawingPolygon(!isDrawingPolygon);
              setIsCalibrating(false);
              setIsDrawingDimension(false);
              setIsTapeMeasuring(false);
              setIsDrawingSunAngle(false);
              setPreviewElements(null);
            }}
            onToggleDrawingSunAngle={() => {
              setIsDrawingSunAngle(!isDrawingSunAngle);
              setIsCalibrating(false);
              setIsDrawingDimension(false);
              setIsTapeMeasuring(false);
              setIsDrawingPolygon(false);
              setPreviewElements(null);
            }}
            onStartFreeDraw={handleStartFreeDraw}
            getTemplateElements={getTemplateElements}
          />
        </main>
      </div>
      <GuestModal 
        isOpen={guestModalOpen} 
        onClose={() => setGuestModalOpen(false)} 
        onSave={(name, title) => {
          setSeating(prev => ({ ...prev, [activeSeatId!]: { id: activeSeatId!, data: { u: title, i: name }, type: 'ozel', number: activeSeatId!.replace(/[A-Z]/g, '') }}));
          setGuestModalOpen(false);
        }} 
        onDelete={() => {
          setSeating(prev => {
            const next = { ...prev };
            delete next[activeSeatId!];
            return next;
          });
          setGuestModalOpen(false);
        }}
      />
      <AnimatePresence>
        {calibrationModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Ruler className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ölçek Tanımla</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gerçek Dünya Ölçüsü</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seçilen Mesafe</span>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{Math.round(lastPixelDist)} PX</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Gerçek Mesafe (Metre)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.1"
                        value={realDistInput}
                        onChange={(e) => setRealDistInput(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-lg font-black text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                        autoFocus
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">METRE</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setCalibrationModalOpen(false)}
                    className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={() => {
                      const realDist = parseFloat(realDistInput);
                      if (!isNaN(realDist) && realDist > 0) {
                        handleUpdateHall({
                          ...allHallConfigs[selectedHall],
                          scaleCalibration: {
                            pixelDistance: lastPixelDist,
                            realDistance: realDist,
                            unit: 'm'
                          }
                        });
                        setCalibrationModalOpen(false);
                      }
                    }}
                    className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-95"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DataImportPanel 
        isOpen={isImportPanelOpen}
        onClose={() => setIsImportPanelOpen(false)}
        selectedCity={selectedCity}
        onImportSuccess={() => {
          fetchStatuses();
          setStatusMessage({ text: `${selectedCity} Protokol Listesi Başarıyla Güncellendi.`, type: 'success' });
          setTimeout(() => setStatusMessage(null), 5000);
        }}
        supabase={supabase}
      />
      <HallAnalysisPanel 
        isOpen={isHallAnalysisOpen}
        onClose={() => setIsHallAnalysisOpen(false)}
        selectedCity={selectedCity}
        onAnalysisSuccess={(config) => {
          updateHall(config);
          setActiveLayoutTab('draw');
          setIsHallAnalysisOpen(false);
          setStatusMessage({ text: "Salon analizi başarıyla tamamlandı ve plan oluşturuldu. Lütfen salon adı ve adresini kontrol edip kaydedin.", type: 'success' });
          setTimeout(() => setStatusMessage(null), 5000);
        }}
      />
      <TelegramPreview 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invitationImage={invitationFile ? URL.createObjectURL(invitationFile) : null}
        personName="Gökhan Yoldaş"
        personTitle="Protokol Müdürü"
      />
    </div>
  );
};

export default App;
