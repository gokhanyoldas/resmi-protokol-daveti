
import React, { useRef, useMemo, useState } from 'react';
import { Search, CheckSquare, Square, Heart, Send, CheckCircle2, XCircle, Clock, MessageSquare, Trash2, Upload, X, AlertTriangle, Printer, Tag, RefreshCw, ChevronDown, ChevronUp, MapPin, Database, Layout, Users, Sparkles, Edit2, Check, Plus, Minus, Smartphone, Image as ImageIcon, Grid, Monitor, Coffee, UserCheck, Square as SquareIcon, Circle, Layers, Box, Settings2, Undo2, Redo2, LayoutGrid, Type, Menu, AlignLeft, AlignStartVertical, AlignCenter, AlignJustify, AlignEndVertical, RotateCw, Copy, ArrowUp, ArrowDown, Zap, UserPlus } from 'lucide-react';
import { ProtocolPerson, HallKey, HallConfig, HallElement } from '../types';
import { TURKEY_CITIES, CITY_HALLS, HALL_CONFIGS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  data: ProtocolPerson[];
  selectedIds: Set<number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  toggleAll: (state: boolean) => void;
  onSendInvitations: () => void;
  onSendSeatNumbers: () => void;
  onPrintLabels: () => void;
  onFileChange: (file: File | null) => void;
  invitationFile: File | null;
  onRefresh?: () => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedHall: HallKey;
  setSelectedHall: (hall: HallKey) => void;
  onYerlestir: () => void;
  isSyncing: boolean;
  onOpenImport: () => void;
  onOpenHallAnalysis: () => void;
  onStartFreeDraw: () => void;
  onUpdatePerson: (id: number, updates: Partial<ProtocolPerson>) => Promise<void>;
  botInfo: { username: string, firstName: string } | null;
  activeLayoutTab: 'ai' | 'draw' | 'template' | 'library' | 'layers';
  setActiveLayoutTab: (tab: 'ai' | 'draw' | 'template' | 'library' | 'layers') => void;
  hall: HallConfig;
  onUpdateHall: (newConfig: HallConfig) => void;
  onAddElement?: (elements: HallElement[]) => void;
  onPreviewTemplate?: (elements: HallElement[] | null) => void;
  onSaveHall: () => void;
  onDeleteHall: (hallId: string) => void;
  allCityHalls: Record<string, string[]>;
  allHallConfigs: Record<string, HallConfig>;
  dynamicHalls: Record<string, HallConfig>;
  stats: {
    total: number;
    confirmed: number;
    waiting: number;
    declined: number;
    seated: number;
  };
  onOpenPreview: () => void;
  completedSteps: Record<number, boolean>;
  selectedElementIds: Set<string>;
  setSelectedElementIds: (ids: Set<string>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  getTemplateElements: (tmplId: string, centerX?: number, centerY?: number) => HallElement[];
  blockRows: number;
  setBlockRows: (val: number) => void;
  blockChairs: number;
  setBlockChairs: (val: number) => void;
  tableChairCount: number;
  setTableChairCount: (val: number) => void;
  is3DMode: boolean;
  setIs3DMode: (val: boolean) => void;
  onSmartAutoLayout: () => void;
  onMagicLayout?: (prompt: string) => void;
  isGeneratingLayout?: boolean;
  onGroupElements?: () => void;
  onUngroupElements?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onUpdateElements?: (ids: string[], updater: (el: HallElement) => Partial<HallElement>) => void;
  onRemoveElements?: (ids: string[]) => void;
  onDuplicateElements?: (ids: string[]) => void;
  onReorderElements?: (ids: string[], direction: 'front' | 'back') => void;
  onAlignElements?: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;
  onDistributeElements?: (direction: 'horizontal' | 'vertical') => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  isRightPanelOpen?: boolean;
  setIsRightPanelOpen?: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  data, selectedIds, setSelectedIds, searchTerm, setSearchTerm, toggleAll, 
  onSendInvitations, onSendSeatNumbers, onPrintLabels, onFileChange, 
  invitationFile, onRefresh, selectedCity, setSelectedCity, 
  selectedHall, setSelectedHall, onYerlestir, isSyncing, onOpenImport,
  onOpenHallAnalysis, onStartFreeDraw,
  onUpdatePerson, botInfo, activeLayoutTab, setActiveLayoutTab,
  hall, onUpdateHall, onAddElement, onPreviewTemplate, onSaveHall, onDeleteHall, allCityHalls, allHallConfigs, dynamicHalls, stats, onOpenPreview,
  onUndo, onRedo,
  canUndo, canRedo,
  completedSteps,
  selectedElementIds,
  setSelectedElementIds,
  getTemplateElements,
  blockRows,
  setBlockRows,
  blockChairs,
  setBlockChairs,
  tableChairCount,
  setTableChairCount,
  is3DMode,
  setIs3DMode,
  isCollapsed = false,
  setIsCollapsed,
  onSmartAutoLayout,
  onMagicLayout,
  isGeneratingLayout,
  onGroupElements,
  onUngroupElements,
  onSelectAll,
  onClearSelection,
  onUpdateElements,
  onRemoveElements,
  onDuplicateElements,
  onReorderElements,
  onAlignElements,
  onDistributeElements,
  isRightPanelOpen,
  setIsRightPanelOpen
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [templateSubTab, setTemplateSubTab] = useState<'library' | 'blocks' | 'templates' | 'ai'>('library');
  const [librarySearch, setLibrarySearch] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTg, setEditTg] = useState('');
  const [expandedSubSection, setExpandedSubSection] = useState<'stage' | 'info' | null>('stage');

  const selectedElements = useMemo(() => {
    return (hall.elements || []).filter(el => selectedElementIds.has(el.id));
  }, [hall.elements, selectedElementIds]);

  const handleTemplateClick = (tmplId: string) => {
    if (onAddElement) {
      const elements = getTemplateElements(tmplId, 400, 300);
      onAddElement(elements);
    }
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const previewUrl = useMemo(() => {
    if (!invitationFile) return null;
    return URL.createObjectURL(invitationFile);
  }, [invitationFile]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sidebarContentRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (expandedStep && sidebarContentRef.current) {
      const header = sidebarContentRef.current.querySelector(`button[data-step="${expandedStep}"]`);
      if (header) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [expandedStep, activeLayoutTab]);

  const togglePerson = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const getStatusDisplay = (status?: string) => {
    switch(status) {
      case 'katiliyor': return <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Katılıyor</div>;
      case 'katilmiyor': return <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full"><XCircle className="w-3.5 h-3.5" /> Katılmıyor</div>;
      default: return <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full"><Clock className="w-3.5 h-3.5" /> Yanıt Yok</div>;
    }
  };

  const StepHeader = ({ number, title, active, onClick }: { number: number, title: string, active: boolean, onClick: () => void }) => {
    const isCompleted = !!completedSteps[number];
    
    return (
      <button 
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        data-step={number}
        className={`w-full flex items-center gap-3 p-4 border-b border-slate-100 transition-all duration-300 ${active ? 'bg-blue-50/50' : 'hover:bg-slate-50'} ${isCollapsed ? 'justify-center px-0' : ''}`}
        title={isCollapsed ? title : undefined}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all shrink-0 ${
          isCompleted 
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
            : active 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
              : 'bg-slate-200 text-slate-500'
        }`}>
          {isCompleted ? <Check className="w-3.5 h-3.5" /> : number}
        </div>
        {!isCollapsed && (
          <>
            <span className={`text-[12px] font-black uppercase tracking-wider flex-1 text-left ${
              isCompleted 
                ? 'text-emerald-700' 
                : active 
                  ? 'text-blue-700' 
                  : 'text-slate-500'
            }`}>
              {title}
            </span>
            {active ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
          </>
        )}
      </button>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-full md:w-[360px] lg:w-[420px] xl:w-[480px]'} h-full bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 overflow-hidden transition-all duration-300`}>
      <div className="p-4 border-b border-slate-100 flex items-center justify-center md:justify-start">
        <button 
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
          title={isCollapsed ? "Genişlet" : "Daralt"}
        >
          <Menu className="w-5 h-5" />
        </button>
        {!isCollapsed && (
          <span className="ml-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">Menü</span>
        )}
      </div>
      <div ref={sidebarContentRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col scroll-smooth">
        {/* STEP 1: İL VE SALON SEÇİMİ */}
        <StepHeader number={1} title="İl ve Salon Seçimi & Tasarım" active={expandedStep === 1} onClick={() => setExpandedStep(expandedStep === 1 ? -1 : 1)} />
        <AnimatePresence>
          {expandedStep === 1 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-100"
            >
              <div className="p-4 space-y-5 bg-slate-50/30 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="space-y-3">
                  <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" /> Şehir Seçiniz
                  </label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="flex-1 bg-white border-2 border-slate-200 rounded-xl py-3 px-4 text-sm font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                    >
                      {TURKEY_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    <button 
                      onClick={onRefresh}
                      className="p-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all active:scale-95 shadow-sm"
                      title="Verileri Yenile"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Professional City Planning Mode */}
                <div className="p-4 bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Monitor className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1">PRO ŞEHİR PLANI</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">CAD & CBS Standartları</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[8px] font-black text-slate-400 uppercase">AKTİF</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 group">
                      <Database className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest">CBS Veri</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 group">
                      <Layout className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest">İmar Planı</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[9px] text-slate-500 font-bold italic leading-relaxed">
                      * ArcGIS, Netcad ve AutoCAD uyumlu çalışma alanı aktif. Poligonları "İmar Tipi"ne göre renklendirebilirsiniz.
                    </p>
                  </div>
                </div>

                  <div className="space-y-4 p-5 bg-white rounded-[28px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="space-y-3">
                      <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Layout className="w-4 h-4 text-blue-600" /> Salon Seçimi
                      </label>
                      {allCityHalls[selectedCity] ? (
                        <div className="flex flex-col gap-3">
                          <select 
                            value={selectedHall}
                            onChange={(e) => setSelectedHall(e.target.value as HallKey)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                          >
                            {allCityHalls[selectedCity].map(hallKey => (
                              <option key={hallKey} value={hallKey}>{allHallConfigs[hallKey]?.name || 'İsimsiz Salon'}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setActiveLayoutTab('draw')}
                              className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all active:scale-95 border border-blue-100 flex items-center justify-center gap-2 group/edit shadow-sm"
                              title="Salonu Düzenle"
                            >
                              <Edit2 className="w-4 h-4 group-hover/edit:rotate-12 transition-transform" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Düzenle</span>
                            </button>
                            {dynamicHalls[selectedHall] && (
                              <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all active:scale-95 border border-rose-100 flex items-center justify-center gap-2 group/delete shadow-sm"
                                title="Salonu Sil"
                              >
                                <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sil</span>
                              </button>
                            )}
                          </div>
                          
                          {/* SİLME ONAYI */}
                          <AnimatePresence>
                            {showDeleteConfirm && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-4 bg-rose-600 rounded-2xl text-white space-y-3 shadow-xl shadow-rose-200 border border-rose-500"
                              >
                                <div className="flex items-start gap-3">
                                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-200" />
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest leading-none">Emin misiniz?</p>
                                    <p className="text-[10px] font-bold text-rose-100 leading-tight">Bu salon ve tüm tasarım verileri kalıcı olarak silinecektir.</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button 
                                    onClick={() => {
                                      onDeleteHall(selectedHall);
                                      setShowDeleteConfirm(false);
                                    }}
                                    className="flex-1 py-2 bg-white text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                                  >
                                    Evet, Sil
                                  </button>
                                  <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-800 transition-colors"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl text-amber-700">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-tight leading-relaxed">
                            Bu şehir için henüz kayıtlı salon bulunamadı. Lütfen yeni bir salon tasarımı başlatın.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* SALON DÜZENİ YÖNETİM SEKMELERİ */}
                    <div className="pt-4 border-t border-slate-100">
                      <div 
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        className="flex overflow-x-auto scrollbar-hide flex-nowrap bg-slate-100/80 p-1.5 rounded-xl mb-4 gap-2 cursor-grab active:cursor-grabbing select-none"
                      >
                        {[
                          { id: 'ai', icon: Sparkles, label: 'AI Modu' },
                          { id: 'draw', icon: Edit2, label: 'Çizim' },
                          { id: 'template', icon: Layout, label: 'Tasarım' },
                          { id: 'library', icon: Database, label: 'Kütüphane' },
                          { id: 'layers', icon: Layers, label: 'Katmanlar' }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveLayoutTab(tab.id as any);
                              if (tab.id === 'draw') {
                                setIsRightPanelOpen?.(true);
                              }
                            }}
                            className={`flex-none min-w-[80px] flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                              activeLayoutTab === tab.id 
                                ? 'bg-white text-blue-600 shadow-lg shadow-blue-100' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                            }`}
                          >
                            <tab.icon className="w-4 h-4 mb-0.5" />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {activeLayoutTab === 'ai' && (
                          <div className="space-y-3">
                            <button 
                              onClick={onOpenHallAnalysis}
                              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-300"
                            >
                              <Sparkles className="w-5 h-5 text-blue-400" /> AI Salon Analiz Modu
                            </button>
                            <p className="text-[11px] text-slate-400 font-bold text-center uppercase tracking-tighter">
                              Fotoğraf veya PDF yükleyerek salon planını otomatik oluşturun
                            </p>
                          </div>
                        )}
                        {activeLayoutTab === 'draw' && (
                          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-blue-50/30 rounded-[32px] border-2 border-dashed border-blue-100 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-sm">
                              <Settings2 className="w-8 h-8 text-blue-300" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                              Çizim ayarları ve araçları <br /> sağ panelde açıldı
                            </p>
                          </div>
                        )}
                        {activeLayoutTab === 'template' && (
                          <div className="flex flex-col h-full -mx-4 -mt-4">
                            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sıra Sayısı</label>
                                    <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl p-1">
                                      <button onClick={() => setBlockRows(Math.max(1, blockRows - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all"><Minus className="w-4 h-4 text-slate-400" /></button>
                                      <span className="flex-1 text-center font-black text-slate-700">{blockRows}</span>
                                      <button onClick={() => setBlockRows(blockRows + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all"><Plus className="w-4 h-4 text-slate-400" /></button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Koltuk Sayısı</label>
                                    <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl p-1">
                                      <button onClick={() => setBlockChairs(Math.max(1, blockChairs - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all"><Minus className="w-4 h-4 text-slate-400" /></button>
                                      <span className="flex-1 text-center font-black text-slate-700">{blockChairs}</span>
                                      <button onClick={() => setBlockChairs(blockChairs + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all"><Plus className="w-4 h-4 text-slate-400" /></button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <button 
                                    onClick={() => handleTemplateClick('theatre_free')}
                                    className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group text-center space-y-2"
                                  >
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto group-hover:bg-blue-600 transition-all">
                                      <LayoutGrid className="w-5 h-5 text-blue-600 group-hover:text-white" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Tiyatro Düzeni</p>
                                  </button>
                                  <button 
                                    onClick={() => handleTemplateClick('classroom_free')}
                                    className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all group text-center space-y-2"
                                  >
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto group-hover:bg-emerald-600 transition-all">
                                      <Monitor className="w-5 h-5 text-emerald-600 group-hover:text-white" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Sınıf Düzeni</p>
                                  </button>
                                </div>
                              </div>

                              <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 text-center space-y-2">
                                <Layout className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tasarım Modu Aktif</p>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                  Salon düzenini sağ taraftaki özellikler panelinden yönetebilirsiniz.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {activeLayoutTab === 'library' && (
                          <div className="space-y-3">
                            <button 
                              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
                            >
                              <Database className="w-5 h-5 text-blue-500" /> Ortak Kütüphane
                            </button>
                            <p className="text-[11px] text-slate-400 font-bold text-center uppercase tracking-tighter">
                              Diğer kullanıcıların paylaştığı salon şablonlarını kullanın
                            </p>
                          </div>
                        )}
                        {activeLayoutTab === 'layers' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1 mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Katman Yönetimi</label>
                              <span className="text-[9px] font-bold text-slate-300 uppercase">{hall.elements?.length || 0} Öğe</span>
                            </div>
                            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                              {[...(hall.elements || [])].reverse().map((el, idx) => (
                                <div 
                                  key={el.id}
                                  onClick={() => setSelectedElementIds(new Set([el.id]))}
                                  className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                                    selectedElementIds.has(el.id) 
                                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                      : 'bg-white border-slate-50 hover:border-slate-200'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    el.type.includes('table') ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {el.type === 'chair' ? <Square className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-900 truncate uppercase">
                                      {el.label || el.seatNumber || `${el.type.toUpperCase()} ${idx + 1}`}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                      X: {Math.round(el.x)} Y: {Math.round(el.y)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newElements = hall.elements?.filter(item => item.id !== el.id) || [];
                                        onUpdateHall({ ...hall, elements: newElements });
                                      }}
                                      className="p-1.5 hover:bg-rose-50 text-rose-400 rounded-md"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* STEP 2: DAVETİYE GÖRSELİ */}
        <StepHeader number={2} title="Davetiye Görseli" active={expandedStep === 2} onClick={() => setExpandedStep(expandedStep === 2 ? -1 : 2)} />
        <AnimatePresence>
          {expandedStep === 2 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <div className="p-4 bg-slate-50/30">
                {invitationFile && previewUrl ? (
                    <div className="relative h-28 rounded-2xl border-2 border-emerald-100 bg-white p-4 flex items-center gap-5 shadow-sm">
                        <img src={previewUrl} alt="Önizleme" className="w-20 h-20 rounded-xl object-cover shadow-md" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate text-slate-700">{invitationFile.name}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{(invitationFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => onFileChange(null)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X className="w-6 h-6" /></button>
                    </div>
                ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="h-28 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition-all group">
                        <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-blue-100 transition-all mb-2">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Görsel seçmek için tıklayın</p>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
                    </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 3: PROTOKOL LİSTESİ */}
        <StepHeader number={3} title={`Protokol Listesi (${selectedIds.size}/${data.length})`} active={expandedStep === 3} onClick={() => setExpandedStep(expandedStep === 3 ? -1 : 3)} />
        <AnimatePresence>
          {expandedStep === 3 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              {/* CANLI İSTATİSTİK DASHBOARD */}
              <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50 border-b border-slate-100">
                <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Toplam</p>
                  <p className="text-sm font-black text-slate-700">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[9px] font-black text-emerald-400 uppercase">Onay</p>
                  <p className="text-sm font-black text-emerald-600">{stats.confirmed}</p>
                </div>
                <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 text-center">
                  <p className="text-[9px] font-black text-rose-400 uppercase">Red</p>
                  <p className="text-sm font-black text-rose-600">{stats.declined}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 text-center">
                  <p className="text-[9px] font-black text-blue-400 uppercase">Koltuk</p>
                  <p className="text-sm font-black text-blue-600">{stats.seated}</p>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Kişi veya ünvan ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-11 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => toggleAll(true)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:text-blue-600 transition-colors" title="Tümünü Seç"><CheckSquare className="w-5 h-5" /></button>
                    <button onClick={() => toggleAll(false)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:text-rose-600 transition-colors" title="Seçimi Temizle"><Trash2 className="w-5 h-5" /></button>
                    {onRefresh && (
                      <button onClick={onRefresh} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:text-blue-600 transition-colors" title="Yenile">
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <button onClick={onOpenImport} className="p-3 bg-blue-600 border border-blue-700 rounded-xl text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100" title="AI Liste Ayıkla">
                      <Sparkles className="w-5 h-5" />
                    </button>
                </div>
              </div>

              {/* YENİ KİŞİ EKLEME FORMU */}
              <div className="p-4 bg-blue-50/30 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Hızlı Kişi Ekle</p>
                  <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Ünvan (Örn: Vali)" 
                    id="new-u"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="İsim Soyisim" 
                    id="new-i"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Telegram ID" 
                    id="new-tg"
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <button 
                    onClick={() => {
                      const u = (document.getElementById('new-u') as HTMLInputElement).value;
                      const i = (document.getElementById('new-i') as HTMLInputElement).value;
                      const tg = (document.getElementById('new-tg') as HTMLInputElement).value;
                      if (u && i) {
                        onUpdatePerson(Date.now(), { u, i, tg, isLocal: true });
                        (document.getElementById('new-u') as HTMLInputElement).value = '';
                        (document.getElementById('new-i') as HTMLInputElement).value = '';
                        (document.getElementById('new-tg') as HTMLInputElement).value = '';
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                  >
                    Ekle
                  </button>
                </div>
              </div>
              
              <div className="px-4 py-3 space-y-3 bg-slate-50/30">
                {data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <AlertTriangle className="w-10 h-10 opacity-20" />
                    <p className="text-[13px] font-black uppercase tracking-widest opacity-50">Liste Boş</p>
                  </div>
                ) : (
                  data.map((p) => (
                    <div key={p.id} className={`flex flex-col p-4 rounded-2xl transition-all border ${p.id !== undefined && selectedIds.has(p.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-4">
                        <div onClick={() => p.id !== undefined && togglePerson(p.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${p.id !== undefined && selectedIds.has(p.id) ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 text-slate-300'}`}>
                          {p.id !== undefined && selectedIds.has(p.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => p.id !== undefined && togglePerson(p.id)}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-[11px] font-black uppercase tracking-widest truncate max-w-[180px] ${p.id !== undefined && selectedIds.has(p.id) ? 'text-blue-700' : 'text-slate-400'}`}>{p.u}</p>
                            {getStatusDisplay(p.katilim_durumu)}
                          </div>
                          <p className={`text-sm font-black truncate ${p.i === "İSİM BEKLENİYOR..." ? 'text-slate-300 italic' : 'text-slate-900'}`}>
                            {p.i}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!p.tg && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingId === p.id) {
                                onUpdatePerson(p.id!, { tg: editTg });
                                setEditingId(null);
                              } else {
                                setEditingId(p.id!);
                                setEditTg(p.tg || '');
                              }
                            }}
                            className={`p-2 rounded-xl transition-all ${editingId === p.id ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400'}`}
                          >
                            {editingId === p.id ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {editingId === p.id && (
                        <div className="mt-2 pt-2 border-t border-blue-100 flex items-center gap-2 animate-in slide-in-from-top duration-200">
                          <input 
                            type="text" 
                            value={editTg} 
                            onChange={(e) => setEditTg(e.target.value)}
                            placeholder="Telegram ID (Sayı veya @kullanıcı)"
                            className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdatePerson(p.id!, { tg: editTg });
                                setEditingId(null);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 4: DAVETİYE GÖNDER */}
        <StepHeader number={4} title="Davetiye Gönder" active={expandedStep === 4} onClick={() => setExpandedStep(expandedStep === 4 ? -1 : 4)} />
        <AnimatePresence>
          {expandedStep === 4 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <div className="p-4 bg-slate-50/30 space-y-3">
                <button 
                  onClick={onOpenPreview}
                  className="w-full py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                >
                  <Smartphone className="w-4 h-4" /> Mesajı Simüle Et (Önizleme)
                </button>
                <button 
                  onClick={onSendInvitations} 
                  disabled={selectedIds.size === 0 || !invitationFile} 
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" /> Davetiye Gönder
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 5: KİŞİLERİ YERLEŞTİR */}
        <StepHeader number={5} title="Kişileri Yerleştir" active={expandedStep === 5} onClick={() => setExpandedStep(expandedStep === 5 ? -1 : 5)} />
        <AnimatePresence>
          {expandedStep === 5 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <div className="p-4 bg-slate-50/30">
                <button 
                  onClick={onYerlestir} 
                  disabled={selectedIds.size === 0 || isSyncing} 
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Database className="w-5 h-5" /> Kişileri Yerleştir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 6: KOLTUK NO GÖNDER */}
        <StepHeader number={6} title="Koltuk No Gönder" active={expandedStep === 6} onClick={() => setExpandedStep(expandedStep === 6 ? -1 : 6)} />
        <AnimatePresence>
          {expandedStep === 6 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <div className="p-4 bg-slate-50/30">
                <button 
                  onClick={onSendSeatNumbers} 
                  disabled={selectedIds.size === 0} 
                  className="w-full py-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <MessageSquare className="w-5 h-5" /> Koltuk No Gönder
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 7: ETİKET YAZDIR */}
        <StepHeader number={7} title="Etiket Yazdır" active={expandedStep === 7} onClick={() => setExpandedStep(expandedStep === 7 ? -1 : 7)} />
        <AnimatePresence>
          {expandedStep === 7 && !isCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <div className="p-4 bg-slate-50/30">
                <button 
                  onClick={onPrintLabels} 
                  disabled={selectedIds.size === 0} 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Tag className="w-5 h-5" /> Etiket Yazdır
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROPERTIES INSPECTOR REMOVED - HANDLED BY RIGHTSIDEBAR */}
      </div>
    </aside>
  );
};

export default Sidebar;
