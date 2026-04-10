
import React from 'react';
import { 
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical, 
  LayoutGrid, Zap, Group, Ungroup, Copy, ArrowUp, ArrowDown, X,
  Maximize2, Move, RotateCw, Type, Layers, Settings2, Ruler, Trash2,
  Circle, Square, Monitor, MapPin, Database, Plus, Minus, Users,
  ChevronDown, Sparkles, RefreshCw, XCircle, Image as ImageIcon, Edit2, CheckCircle2,
  Palette, Hexagon, Sun, Eye, EyeOff, Lock, Unlock, Box, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HallConfig, HallElement, ReferenceImage } from '../types';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElementIds: Set<string>;
  hall: HallConfig;
  onAlign: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onReorder: (direction: 'front' | 'back') => void;
  onUpdateElements: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void;
  onRemove: (ids: string[]) => void;
  onAddElement?: (elements: HallElement[]) => void;
  onSaveHall?: () => void;
  onUpdateHall?: (newConfig: HallConfig) => void;
  selectedCity?: string;
  activeLayoutTab?: 'ai' | 'draw' | 'template' | 'library' | 'layers';
  isCalibrating?: boolean;
  isDrawingDimension?: boolean;
  isTapeMeasuring?: boolean;
  isDrawingPolygon?: boolean;
  isDrawingSunAngle?: boolean;
  onStartCalibration?: (pixelDist?: number) => void;
  onCancelCalibration?: () => void;
  onToggleDrawingDimension?: () => void;
  onToggleTapeMeasuring?: () => void;
  onToggleDrawingPolygon?: () => void;
  onToggleDrawingSunAngle?: () => void;
  onStartFreeDraw?: () => void;
  getTemplateElements?: (tmplId: string, centerX?: number, centerY?: number) => HallElement[];
  is3DMode?: boolean;
  onToggle3DMode?: () => void;
  onAddReferenceImage?: (file: File) => void;
  onRemoveReferenceImage?: (id: string) => void;
  onUpdateReferenceImage?: (id: string, updates: Partial<ReferenceImage>) => void;
  referenceImages?: ReferenceImage[];
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  onClose,
  selectedElementIds,
  hall,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
  onDuplicate,
  onReorder,
  onUpdateElements,
  onRemove,
  onAddElement,
  onSaveHall,
  onUpdateHall,
  selectedCity,
  activeLayoutTab,
  isCalibrating,
  isDrawingDimension,
  isTapeMeasuring,
  isDrawingPolygon,
  isDrawingSunAngle,
  onStartCalibration,
  onCancelCalibration,
  onToggleDrawingDimension,
  onToggleTapeMeasuring,
  onToggleDrawingPolygon,
  onToggleDrawingSunAngle,
  onStartFreeDraw,
  getTemplateElements,
  is3DMode,
  onToggle3DMode,
  onAddReferenceImage,
  onRemoveReferenceImage,
  onUpdateReferenceImage,
  referenceImages = []
}) => {
  const selectedElements = (hall.elements || []).filter(el => selectedElementIds.has(el.id));
  const isSingleSelection = selectedElements.length === 1;
  const hasSelection = selectedElements.length > 0;

  const firstElement = selectedElements[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-6 top-24 bottom-6 w-80 bg-white/90 backdrop-blur-xl border-2 border-slate-100 rounded-[40px] shadow-2xl shadow-slate-200/50 z-40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Özellikler</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {selectedElementIds.size} Öğe Seçildi
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {/* 3D Object Library Section */}
            <section className="space-y-4">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Box className="w-3.5 h-3.5" /> 3D Nesne Kütüphanesi
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'protocol-table', icon: Users, label: 'Protokol Masası', type: 'table-rect', width: 200, height: 80, color: '#1e293b', labelText: 'Table1_Seat1_ProtokolA' },
                  { id: 'bistro', icon: Circle, label: 'Bistro Masa', type: 'bistro-table', width: 60, height: 60, color: '#334155' },
                  { id: 'truss', icon: Square, label: 'Sahne Truss', type: 'truss-stage', width: 400, height: 200, color: '#94a3b8' },
                  { id: 'truck-stage', icon: Box, label: 'Tır Sahne', type: 'truck-stage', width: 600, height: 250, color: '#475569' },
                  { id: 'generator', icon: Zap, label: 'Jeneratör', type: 'generator-truck', width: 150, height: 80, color: '#d97706' },
                  { id: 'catering', icon: Database, label: 'İkram Aracı', type: 'catering-truck', width: 200, height: 100, color: '#059669' },
                ].map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      const centerX = (hall.width || 1200) / 2;
                      const centerY = (hall.height || 800) / 2;
                      onAddElement?.([{
                        id: `${obj.type}_${Date.now()}`,
                        type: obj.type as any,
                        x: centerX - obj.width / 2,
                        y: centerY - obj.height / 2,
                        width: obj.width,
                        height: obj.height,
                        rotation: 0,
                        color: obj.color,
                        label: obj.labelText || obj.label,
                        z: 0,
                        h: 0
                      }]);
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white rounded-2xl transition-all group"
                  >
                    <obj.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-tighter text-center">{obj.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {hasSelection ? (
              <>
                {/* Alignment Tools */}
                <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlignLeft className="w-3.5 h-3.5" /> Hizalama Araçları
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'left', icon: AlignLeft, label: 'SOL' },
                      { id: 'center', icon: AlignCenter, label: 'ORTA H' },
                      { id: 'right', icon: AlignRight, label: 'SAĞ' },
                      { id: 'top', icon: AlignStartVertical, label: 'ÜST' },
                      { id: 'middle', icon: AlignCenter, label: 'ORTA V', rotate: 90 },
                      { id: 'bottom', icon: AlignEndVertical, label: 'ALT' },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => onAlign(tool.id as any)}
                        className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white rounded-2xl transition-all group"
                      >
                        <tool.icon className={`w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors ${tool.rotate ? 'rotate-90' : ''}`} />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-tighter">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Distribution Tools */}
                <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5" /> Dağıtım & Düzen
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onDistribute('horizontal')}
                      className="flex items-center justify-center gap-3 p-4 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white rounded-2xl transition-all group"
                    >
                      <AlignLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600 rotate-90" />
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest">Yatay Dağıt</span>
                    </button>
                    <button
                      onClick={() => onDistribute('vertical')}
                      className="flex items-center justify-center gap-3 p-4 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white rounded-2xl transition-all group"
                    >
                      <AlignLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest">Dikey Dağıt</span>
                    </button>
                  </div>
                </section>

                {/* Grouping Tools */}
                <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Group className="w-3.5 h-3.5" /> Gruplama İşlemleri
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onGroup}
                      className="flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      <Group className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Grupla</span>
                    </button>
                    <button
                      onClick={onUngroup}
                      className="flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"
                    >
                      <Ungroup className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Grubu Çöz</span>
                    </button>
                  </div>
                </section>

                {/* Group Editing (Block Controls) */}
                {(() => {
                  const selectedElements = (hall.elements || []).filter(el => selectedElementIds.has(el.id));
                  const firstGroupId = selectedElements[0]?.groupId;
                  const isSameGroup = firstGroupId && selectedElements.every(el => el.groupId === firstGroupId);
                  const isChairBlock = isSameGroup && selectedElements.every(el => el.type === 'chair');

                  if (isChairBlock) {
                    // Try to infer current rows and chairs from IDs if they follow the pattern th-r-c-groupId
                    const rowIndices = new Set(selectedElements.map(el => el.id.split('-')[1]).filter(v => !isNaN(parseInt(v))));
                    const chairIndices = new Set(selectedElements.map(el => el.id.split('-')[2]).filter(v => !isNaN(parseInt(v))));
                    
                    const currentRows = rowIndices.size || 1;
                    const currentChairs = chairIndices.size || 1;

                    return (
                      <section className="space-y-4 p-4 bg-blue-50/50 rounded-3xl border border-blue-100">
                        <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                          <LayoutGrid className="w-3.5 h-3.5" /> Blok Düzenleme
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sıra Sayısı</label>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                              <button 
                                onClick={() => {
                                  const centerX = selectedElements.reduce((sum, el) => sum + el.x, 0) / selectedElements.length + 20;
                                  const centerY = selectedElements.reduce((sum, el) => sum + el.y, 0) / selectedElements.length + 20;
                                  const newElements = getTemplateElements?.('theatre_free', centerX, centerY);
                                  if (newElements && onUpdateHall) {
                                    // This is a bit tricky because getTemplateElements uses global blockRows/blockChairs
                                    // For now, we'll just use the global ones but we could pass them as arguments
                                    const filtered = (hall.elements || []).filter(el => el.groupId !== firstGroupId);
                                    onUpdateHall({ ...hall, elements: [...filtered, ...newElements] });
                                  }
                                }}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                              >
                                Güncelle
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold italic">
                          * Sol menüdeki Sıra/Koltuk sayılarını kullanarak bloğu yeniden oluşturur. Merkez korunur.
                        </p>
                      </section>
                    );
                  }
                  return null;
                })()}

                {/* Quick Actions */}
                <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Hızlı İşlemler
                  </h4>
                  <button
                    onClick={onDuplicate}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest">Seçileni Çoğalt</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase">CTRL+D</span>
                  </button>
                </section>

                {/* Layer Info */}
                <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    Katman Bilgisi
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onReorder('back')}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => onReorder('front')}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </section>

                {/* Specific Properties for single selection */}
                {isSingleSelection && firstElement && (
                  <section className="space-y-4 pt-4 border-t border-slate-100">
                    {firstElement.type === 'dimension-line' && (
                      <div className="p-5 bg-amber-50 border-2 border-amber-100 rounded-[32px] shadow-sm mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                            <Ruler className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-[0.2em] leading-none mb-1">Ölçüm Çizgisi</h4>
                            <p className="text-[9px] font-bold text-amber-600 opacity-80 uppercase tracking-tighter">Kalibrasyon Aracı</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Gerçek Mesafe (Metre)</label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="0.1"
                                value={hall.scaleCalibration ? Math.round(Math.sqrt(Math.pow((firstElement.x2 || 0) - firstElement.x, 2) + Math.pow((firstElement.y2 || 0) - firstElement.y, 2)) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100 : 10}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    const dx = (firstElement.x2 || 0) - firstElement.x;
                                    const dy = (firstElement.y2 || 0) - firstElement.y;
                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                    onUpdateHall?.({
                                      ...hall,
                                      scaleCalibration: {
                                        pixelDistance: dist,
                                        realDistance: val,
                                        unit: 'm'
                                      }
                                    });
                                  }
                                }}
                                className="w-full bg-white border-2 border-amber-200 rounded-2xl py-3 px-4 text-sm font-black text-amber-700 outline-none focus:border-amber-500 transition-all shadow-sm"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400">METRE</div>
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              const dx = (firstElement.x2 || 0) - firstElement.x;
                              const dy = (firstElement.y2 || 0) - firstElement.y;
                              const dist = Math.sqrt(dx * dx + dy * dy);
                              onStartCalibration?.(dist);
                            }}
                            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200 active:scale-95"
                          >
                            <Sparkles className="w-4 h-4" /> Bu Çizgiyi Ana Ölçek Yap
                          </button>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Çizgi Rengi</label>
                            <div className="flex gap-2">
                              {['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#6366f1', '#000000'].map(color => (
                                <button
                                  key={color}
                                  onClick={() => onUpdateElements([firstElement.id], () => ({ color }))}
                                  className={`w-6 h-6 rounded-full border-2 transition-all ${firstElement.color === color ? 'border-amber-500 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Öğe Özellikleri</h4>
                    
                    <div className="space-y-4">
                      {/* Dimensions (Metric) */}
                      {hall.scaleCalibration && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-1">Genişlik (m)</label>
                            <input 
                              type="number"
                              step="0.1"
                              value={Math.round((firstElement.width || 40) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  const px = (val / hall.scaleCalibration!.realDistance) * hall.scaleCalibration!.pixelDistance;
                                  onUpdateElements([firstElement.id], () => ({ width: px }));
                                }
                              }}
                              className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs font-black text-blue-600 outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-1">Yükseklik (m)</label>
                            <input 
                              type="number"
                              step="0.1"
                              value={Math.round((firstElement.height || 40) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  const px = (val / hall.scaleCalibration!.realDistance) * hall.scaleCalibration!.pixelDistance;
                                  onUpdateElements([firstElement.id], () => ({ height: px }));
                                }
                              }}
                              className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs font-black text-blue-600 outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etiket / İsim</label>
                        <input 
                          type="text"
                          value={firstElement.label || firstElement.seatNumber || ''}
                          onChange={(e) => onUpdateElements([firstElement.id], () => ({ [firstElement.type === 'chair' ? 'seatNumber' : 'label']: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>

                      {/* Table Specific: Chair Count */}
                      {firstElement.type.includes('table') && (
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Koltuk Sayısı</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => onUpdateElements([firstElement.id], (el) => ({ chairCount: Math.max(0, (el.chairCount || 0) - 1) }))}
                              className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shadow-sm"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-blue-600 min-w-[16px] text-center">
                              {firstElement.chairCount || 0}
                            </span>
                            <button 
                              onClick={() => onUpdateElements([firstElement.id], (el) => ({ chairCount: (el.chairCount || 0) + 1 }))}
                              className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Work Area Specific: Area Info & Color */}
                      {firstElement.type === 'work-area' && (
                        <div className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Maximize2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Toplam Alan</span>
                            </div>
                            {hall.scaleCalibration && (
                              <span className="text-sm font-black text-emerald-600">
                                {(( (firstElement.width || 100) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance ) * 
                                  ( (firstElement.height || 100) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance )).toFixed(2)} m²
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Palette className="w-3 h-3 text-emerald-500" />
                              <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Alan Rengi</label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'].map(color => (
                                <button
                                  key={color}
                                  onClick={() => onUpdateElements([firstElement.id], () => ({ color }))}
                                  className={`w-6 h-6 rounded-lg border-2 transition-all ${firstElement.color === color ? 'border-emerald-500 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Opaklık</label>
                            <input 
                              type="range"
                              min="0.1"
                              max="0.8"
                              step="0.1"
                              value={firstElement.opacity || 0.2}
                              onChange={(e) => onUpdateElements([firstElement.id], () => ({ opacity: parseFloat(e.target.value) }))}
                              className="w-full accent-emerald-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Polygon / Building Specific: Zoning & Height */}
                      {(firstElement.type === 'polygon' || firstElement.type === 'building') && (
                        <div className="space-y-4">
                          {firstElement.modelUrl && (
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                              <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">AI Model Kaynağı</span>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-indigo-100 overflow-hidden">
                                <p className="text-[8px] font-mono text-indigo-400 break-all truncate">
                                  {firstElement.modelUrl}
                                </p>
                              </div>
                              <p className="text-[9px] text-indigo-400 font-bold italic">
                                * TRELLIS AI tarafından üretilen yüksek sadakatli 3B model.
                              </p>
                            </div>
                          )}

                          <div className="p-4 bg-violet-50/50 rounded-2xl border border-violet-100 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-violet-500" />
                                <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Maket Özellikleri</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-violet-700 uppercase tracking-widest">İmar Tipi (Zoning)</label>
                              <select 
                                value={firstElement.zoningType || ''}
                                onChange={(e) => {
                                  const type = e.target.value as any;
                                  const colors: Record<string, string> = {
                                    residential: '#fde047',
                                    commercial: '#ef4444',
                                    green: '#22c55e',
                                    education: '#3b82f6',
                                    health: '#a855f7',
                                    industrial: '#64748b',
                                    public: '#f97316'
                                  };
                                  onUpdateElements([firstElement.id], () => ({ 
                                    zoningType: type,
                                    color: colors[type] || firstElement.color 
                                  }));
                                }}
                                className="w-full bg-white border border-violet-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-violet-500 transition-all"
                              >
                                <option value="">Seçiniz...</option>
                                <option value="residential">Konut (Sarı)</option>
                                <option value="commercial">Ticaret (Kırmızı)</option>
                                <option value="green">Yeşil Alan (Yeşil)</option>
                                <option value="education">Eğitim (Mavi)</option>
                                <option value="health">Sağlık (Mor)</option>
                                <option value="industrial">Sanayi (Gri)</option>
                                <option value="public">Resmi Kurum (Turuncu)</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black text-violet-700 uppercase tracking-widest">Bina Yüksekliği (Kat/m)</label>
                                <span className="text-[10px] font-black text-violet-600">{(firstElement.h || 0).toFixed(1)}</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={firstElement.h || 0}
                                onChange={(e) => onUpdateElements([firstElement.id], () => ({ h: parseFloat(e.target.value) }))}
                                className="w-full accent-violet-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genişlik</label>
                            <div className="relative">
                              <input 
                                type="number"
                                value={firstElement.width || 40}
                                onChange={(e) => onUpdateElements([firstElement.id], () => ({ width: parseInt(e.target.value) }))}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                              />
                              {hall.scaleCalibration && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-500">
                                  {Math.round((firstElement.width || 40) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100}{hall.scaleCalibration.unit}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yükseklik</label>
                            <div className="relative">
                              <input 
                                type="number"
                                value={firstElement.height || 40}
                                onChange={(e) => onUpdateElements([firstElement.id], () => ({ height: parseInt(e.target.value) }))}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                              />
                              {hall.scaleCalibration && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-500">
                                  {Math.round((firstElement.height || 40) / hall.scaleCalibration.pixelDistance * hall.scaleCalibration.realDistance * 100) / 100}{hall.scaleCalibration.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rotasyon</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max="360"
                            value={firstElement.rotation || 0}
                            onChange={(e) => onUpdateElements([firstElement.id], () => ({ rotation: parseInt(e.target.value) }))}
                            className="flex-1 accent-blue-600"
                          />
                          <span className="text-[10px] font-black text-slate-600 w-8">{firstElement.rotation || 0}°</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="space-y-8">
                {/* Draw Tab Content (Moved from Sidebar) */}
                {activeLayoutTab === 'draw' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Kayıtlı Salon Bilgisi */}
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-[28px] flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-inner">
                        <Database className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] leading-none mb-1.5">Kayıtlı Salon Düzenleniyor</p>
                        <p className="text-xs font-bold text-emerald-600 truncate">{hall.name}</p>
                      </div>
                    </div>

                    {/* Alan Rekonstrüksiyonu ve Çizim Araçları */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Alan Rekonstrüksiyonu</h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isDrawingDimension ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {isDrawingDimension ? 'ÖLÇÜ ALINIYOR' : 'HAZIR'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={onToggleDrawingDimension}
                          className={`flex flex-col items-center gap-3 p-4 rounded-[24px] border-2 transition-all duration-300 group ${isDrawingDimension ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 hover:border-blue-200 text-slate-600'}`}
                        >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDrawingDimension ? 'bg-blue-500' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                            <Ruler className={`w-5 h-5 ${isDrawingDimension ? 'text-white' : 'text-blue-600'}`} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Ölçü Çiz</span>
                        </button>

                        <button 
                          onClick={onToggleDrawingPolygon}
                          className={`flex flex-col items-center gap-3 p-4 rounded-[24px] border-2 transition-all duration-300 group ${isDrawingPolygon ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-600'}`}
                        >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDrawingPolygon ? 'bg-indigo-500' : 'bg-indigo-50 group-hover:bg-indigo-100'}`}>
                            <Hexagon className={`w-5 h-5 ${isDrawingPolygon ? 'text-white' : 'text-indigo-600'}`} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Çokgen Çiz</span>
                        </button>

                        <button 
                          onClick={onToggleTapeMeasuring}
                          className={`flex flex-col items-center gap-3 p-4 rounded-[24px] border-2 transition-all duration-300 group ${isTapeMeasuring ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white border-slate-100 hover:border-amber-200 text-slate-600'}`}
                        >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isTapeMeasuring ? 'bg-amber-400' : 'bg-amber-50 group-hover:bg-amber-100'}`}>
                            <Move className={`w-5 h-5 ${isTapeMeasuring ? 'text-white' : 'text-amber-600'}`} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Mezura</span>
                        </button>
                      </div>
                    </div>

                    {/* Hızlı Ekleme Paneli */}
                    <section className="space-y-4">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                        <Plus className="w-3.5 h-3.5" /> Hızlı Öğe Ekle
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'stage', name: 'Sahne', icon: Monitor, color: 'text-rose-600', bg: 'bg-rose-50', w: 200, h: 100 },
                          { id: 'led-screen', name: 'LED Ekran', icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-50', w: 160, h: 10 },
                          { id: 'ambulance', name: 'Ambulans', icon: Move, color: 'text-rose-500', bg: 'bg-rose-50', w: 80, h: 40 },
                          { id: 'catering-truck', name: 'İkram Tırı', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', w: 120, h: 50 },
                          { id: 'car', name: 'Protokol Araç', icon: Move, color: 'text-slate-600', bg: 'bg-slate-50', w: 100, h: 50 },
                          { id: 'building', name: 'Bina', icon: Box, color: 'text-slate-700', bg: 'bg-slate-100', w: 200, h: 200 },
                          { id: 'security-post', name: 'Güvenlik', icon: Lock, color: 'text-blue-700', bg: 'bg-blue-50', w: 50, h: 50 },
                          { id: 'tree', name: 'Ağaç', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', w: 40, h: 40 },
                          { id: 'person', name: 'Kişi', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', w: 30, h: 30 },
                          { id: 'chair', name: 'Sandalye', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', w: 40, h: 40 },
                          { id: 'table-round', name: 'Protokol Masa', icon: Circle, color: 'text-emerald-600', bg: 'bg-emerald-50', w: 80, h: 80 },
                          { id: 'text', name: 'Etiket', icon: Type, color: 'text-slate-600', bg: 'bg-slate-50', w: 100, h: 40 },
                        ].map((item) => (
                          <button 
                            key={item.id}
                            onClick={() => onAddElement?.([{
                              id: `el_${Date.now()}`,
                              type: item.id as any,
                              x: 400,
                              y: 300,
                              rotation: 0,
                              width: item.w,
                              height: item.h,
                              label: item.id === 'text' ? 'Yeni Metin' : (item.id === 'led-screen' ? 'LED EKRAN' : '')
                            }])}
                            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-[28px] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all group active:scale-95"
                          >
                            <div className={`w-12 h-12 flex items-center justify-center ${item.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                              <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tight text-slate-900 text-center leading-tight">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Sahne ve Ekran Ayarları */}
                    <section className="space-y-4">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                        <Monitor className="w-3.5 h-3.5" /> Sahne & Ekran Ayarları
                      </h4>
                      <div className="p-5 bg-slate-50 rounded-[32px] border-2 border-slate-100 space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Sahne Metni</label>
                          <input 
                            type="text" 
                            value={hall.stage?.label || ''}
                            onChange={(e) => onUpdateHall?.({
                              ...hall,
                              stage: { ...(hall.stage || { position: 'top', size: 'medium', label: '' }), label: e.target.value }
                            })}
                            placeholder="Örn: ANA SAHNE"
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Konum</label>
                            <select 
                              value={hall.stage?.position || 'top'}
                              onChange={(e) => {
                                const newPos = e.target.value as any;
                                onUpdateHall?.({
                                  ...hall,
                                  rows: [...hall.rows].reverse(),
                                  stage: { ...(hall.stage || { label: 'SAHNE', size: 'medium', position: 'top' }), position: newPos }
                                });
                              }}
                              className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                            >
                              <option value="top">Üst</option>
                              <option value="bottom">Alt</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Boyut</label>
                            <select 
                              value={hall.stage?.size || 'medium'}
                              onChange={(e) => onUpdateHall?.({
                                ...hall,
                                stage: { ...(hall.stage || { label: 'SAHNE', position: 'top', size: 'medium' }), size: e.target.value as any }
                              })}
                              className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                            >
                              <option value="small">Küçük</option>
                              <option value="medium">Orta</option>
                              <option value="large">Büyük</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => onUpdateHall?.({ ...hall, stage: hall.stage ? undefined : { label: 'SAHNE', position: 'top', size: 'medium' } })}
                            className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm ${
                              hall.stage 
                                ? 'bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-100' 
                                : 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 hover:bg-emerald-100'
                            }`}
                          >
                            {hall.stage ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {hall.stage ? 'Sahneyi Kaldır' : 'Sahne Ekle'}
                          </button>

                          <button 
                            onClick={() => onUpdateHall?.({ ...hall, rows: [...hall.rows].reverse() })}
                            className="w-full py-3.5 bg-white text-slate-600 border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <RefreshCw className="w-4 h-4" /> Sıralamayı Ters Çevir (A-Z / Z-A)
                          </button>
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Arka Plan Görseli</label>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (re) => {
                                      onUpdateHall?.({ ...hall, backgroundImage: re.target?.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                              className="flex-1 py-3.5 bg-white text-blue-600 border-2 border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <ImageIcon className="w-4 h-4" /> Görsel Yükle
                            </button>
                            {hall.backgroundImage && (
                              <button 
                                onClick={() => onUpdateHall?.({ ...hall, backgroundImage: undefined })}
                                className="p-3.5 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-2xl hover:bg-rose-100 transition-all shadow-sm"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Ölçeklendirme (Calibration) */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Ruler className="w-3 h-3" /> Alan Ölçeklendirme
                          </label>
                          <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl space-y-3">
                            <p className="text-[9px] font-bold text-slate-400 leading-tight">
                              Görsel üzerindeki bilinen bir mesafeyi (örneğin bir duvar veya sahne genişliği) ölçerek gerçek dünya ölçeğini tanımlayın.
                            </p>
                            
                            {hall.scaleCalibration ? (
                              <div className="space-y-3">
                                <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl flex items-center gap-3 shadow-sm">
                                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none mb-1">Ölçek Tanımlı</p>
                                    <p className="text-xs font-black text-blue-600 leading-none">{hall.scaleCalibration.realDistance} {hall.scaleCalibration.unit} = {Math.round(hall.scaleCalibration.pixelDistance)} PX</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <button 
                                    onClick={() => onStartCalibration?.()}
                                    className="w-full py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                  >
                                    <Ruler className="w-3.5 h-3.5" /> Ölçüm Yap / Yeniden Kalibre Et
                                  </button>
                                  <button 
                                    onClick={() => onUpdateHall?.({ ...hall, scaleCalibration: undefined })}
                                    className="w-full py-3 bg-white border-2 border-rose-100 text-rose-600 rounded-2xl hover:bg-rose-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Ölçeği Kaldır
                                  </button>
                                </div>
                              </div>
                            ) : (
                              isCalibrating ? (
                                <button 
                                  onClick={onCancelCalibration}
                                  className="w-full py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Ölçümü İptal Et
                                </button>
                              ) : (
                                <div className="grid grid-cols-1 gap-2">
                                  <button 
                                    onClick={() => onStartCalibration?.()}
                                    className="w-full py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" /> Ölçek Tanımla
                                  </button>
                                  <button 
                                    onClick={onToggleTapeMeasuring}
                                    className={`w-full py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                                      isTapeMeasuring 
                                        ? 'bg-amber-500 text-white hover:bg-amber-600' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    <Ruler className="w-3.5 h-3.5" /> {isTapeMeasuring ? 'Ölçümü Durdur' : 'Hızlı Ölçüm (Şerit Metre)'}
                                  </button>
                                  <button 
                                    onClick={onToggleDrawingDimension}
                                    className={`w-full py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                                      isDrawingDimension 
                                        ? 'bg-amber-500 text-white hover:bg-amber-600' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    <Ruler className="w-3.5 h-3.5" /> {isDrawingDimension ? 'Çizimi Durdur' : 'Ölçüm Çizgisi Ekle'}
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Salon Bilgileri */}
                    <section className="space-y-4">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                        <MapPin className="w-3.5 h-3.5" /> Salon Bilgileri
                      </h4>
                      <div className="p-5 bg-slate-50 rounded-[32px] border-2 border-slate-100 space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Salon Adı</label>
                          <input 
                            type="text"
                            value={hall.name}
                            onChange={(e) => onUpdateHall?.({ ...hall, name: e.target.value })}
                            placeholder="Örn: Adana Bld. Tiyatro Salonu"
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all shadow-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Salon Adresi</label>
                          <textarea 
                            value={hall.address || ''}
                            onChange={(e) => onUpdateHall?.({ ...hall, address: e.target.value })}
                            placeholder="Örn: Atatürk Cad. No:123, Adana"
                            rows={3}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all resize-none shadow-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={onSaveHall}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 active:scale-95 border-b-4 border-emerald-800"
                          >
                            <Database className="w-5 h-5" /> Salonu Sisteme Kaydet
                          </button>

                          <button 
                            onClick={() => {
                              if(window.confirm('Tüm tasarımı sıfırlamak istediğinize emin misiniz?')) {
                                onUpdateHall?.({ ...hall, elements: [] });
                              }
                            }}
                            className="w-full py-4 bg-white text-rose-600 border-2 border-rose-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
                          >
                            <Trash2 className="w-5 h-5" /> Tasarımı Sıfırla
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Free Draw Button */}
                    <div className="pt-4">
                      <button 
                        onClick={onStartFreeDraw}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-200 border-b-4 border-blue-800"
                      >
                        <Edit2 className="w-5 h-5" /> Serbest Çizim Editörü
                      </button>
                    </div>
                  </div>
                )}

                {activeLayoutTab !== 'draw' && (
                  <>
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-sm">
                        <Move className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Düzenlemek için <br /> bir öğe seçiniz
                      </p>
                    </div>

                    {/* Quick Library Access */}
                    <section className="space-y-4">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Hızlı Öğe Kütüphanesi</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'chair', name: 'Sandalye', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                          { id: 'table-round', name: 'Yuvarlak Masa', icon: Circle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                          { id: 'table-rect', name: 'Dikdörtgen Masa', icon: Square, color: 'text-amber-600', bg: 'bg-amber-50' },
                          { id: 'stage', name: 'Sahne', icon: Monitor, color: 'text-rose-600', bg: 'bg-rose-50' },
                          { id: 'text', name: 'Metin', icon: Type, color: 'text-slate-600', bg: 'bg-slate-50' },
                          { id: 'entrance', name: 'Giriş', icon: MapPin, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                        ].map((item) => (
                          <button 
                            key={item.id}
                            onClick={() => onAddElement?.([{
                              id: `el_${Date.now()}`,
                              type: item.id as any,
                              x: 400,
                              y: 300,
                              rotation: 0,
                              width: item.id === 'stage' ? 200 : (item.id.includes('table') ? 80 : 40),
                              height: item.id === 'stage' ? 100 : (item.id.includes('table') ? 80 : 40),
                              label: item.id === 'text' ? 'Yeni Metin' : ''
                            }])}
                            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-[28px] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all group active:scale-95"
                          >
                            <div className={`w-12 h-12 flex items-center justify-center ${item.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                              <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tight text-slate-900 text-center leading-tight">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Save Section */}
                    <section className="pt-8 border-t border-slate-100 space-y-4">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Tasarımı Kaydet</h5>
                      <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Salon / Sahne İsmi</label>
                          <input 
                            type="text"
                            placeholder="Örn: Yıldız Salonu"
                            value={hall.name}
                            onChange={(e) => onUpdateHall?.({ ...hall, name: e.target.value })}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Kayıt Edilecek Şehir</label>
                          <div className="flex items-center gap-3 bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-400">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <span className="text-slate-700">{selectedCity}</span>
                          </div>
                        </div>
                        <button 
                          onClick={onSaveHall}
                          disabled={!hall.name}
                          className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg ${
                            hall.name 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-200' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Database className="w-5 h-5" /> Tasarımı Kaydet
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}

            {/* Görünüm ve Katmanlar - Daima Görünür */}
            <section className="space-y-6 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Görünüm ve Katmanlar
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {referenceImages.length} KATMAN
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* 3D View Toggle */}
                <button 
                  onClick={onToggle3DMode}
                  className={`w-full flex items-center justify-between p-5 rounded-[32px] border-2 transition-all duration-500 group ${is3DMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-600'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${is3DMode ? 'bg-indigo-500 scale-110 rotate-12' : 'bg-indigo-50 group-hover:bg-indigo-100'}`}>
                      <Box className={`w-6 h-6 ${is3DMode ? 'text-white' : 'text-indigo-600'}`} />
                    </div>
                    <div className="text-left">
                      <span className="block text-[11px] font-black uppercase tracking-widest">3D Çalışma Alanı</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 block ${is3DMode ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {is3DMode ? 'RealityCapture Aktif' : '3D Moduna Geç'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full p-1.5 transition-colors duration-500 ${is3DMode ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-lg transition-transform duration-500 ${is3DMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Reference Images Upload Area */}
                <div className="space-y-4">
                  <label className="group block cursor-pointer">
                    <div className="relative overflow-hidden p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all duration-500 text-center">
                      <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200/50 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                          <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">Resim Yükle</h5>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plan veya Fotoğraf Seçin</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach(file => onAddReferenceImage?.(file));
                          }
                        }}
                      />
                    </div>
                  </label>

                          {/* Layers List */}
                          <div className="space-y-3">
                            {referenceImages.map((img) => (
                              <motion.div 
                                layout
                                key={img.id} 
                                className="flex flex-col gap-3 p-4 bg-white rounded-[24px] border-2 border-slate-100 shadow-sm hover:shadow-md transition-all group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border-2 border-slate-50 shadow-inner">
                                    <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 truncate uppercase tracking-tight mb-2">{img.name || 'İsimsiz Katman'}</p>
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        onClick={() => onUpdateReferenceImage?.(img.id, { visible: !img.visible })}
                                        className={`p-2 rounded-xl transition-all ${img.visible ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                                        title={img.visible ? 'Gizle' : 'Göster'}
                                      >
                                        {img.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                      </button>
                                      <button 
                                        onClick={() => onUpdateReferenceImage?.(img.id, { isLocked: !img.isLocked })}
                                        className={`p-2 rounded-xl transition-all ${img.isLocked ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                                        title={img.isLocked ? 'Kilidi Aç' : 'Kilitle'}
                                      >
                                        {img.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                      </button>
                                      <button 
                                        onClick={() => onRemoveReferenceImage?.(img.id)}
                                        className="p-2 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-all ml-auto"
                                        title="Sil"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Scale and Rotation Sliders */}
                                <div className="space-y-3 pt-3 border-t border-slate-50">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ölçek</label>
                                      <span className="text-[9px] font-black text-slate-600">{(img.scale || 1).toFixed(2)}x</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0.1"
                                      max="5"
                                      step="0.1"
                                      value={img.scale || 1}
                                      onChange={(e) => onUpdateReferenceImage?.(img.id, { scale: parseFloat(e.target.value) })}
                                      className="w-full accent-blue-600 h-1.5 rounded-full bg-slate-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rotasyon</label>
                                      <span className="text-[9px] font-black text-slate-600">{img.rotation || 0}°</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="360"
                                      value={img.rotation || 0}
                                      onChange={(e) => onUpdateReferenceImage?.(img.id, { rotation: parseInt(e.target.value) })}
                                      className="w-full accent-amber-600 h-1.5 rounded-full bg-slate-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opaklık</label>
                                      <span className="text-[9px] font-black text-slate-600">{Math.round((img.opacity || 0.5) * 100)}%</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.05"
                                      value={img.opacity || 0.5}
                                      onChange={(e) => onUpdateReferenceImage?.(img.id, { opacity: parseFloat(e.target.value) })}
                                      className="w-full accent-slate-600 h-1.5 rounded-full bg-slate-100"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          {hasSelection && (
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <button
                onClick={() => onRemove(Array.from(selectedElementIds))}
                className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Seçilenleri Sil
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RightSidebar;
