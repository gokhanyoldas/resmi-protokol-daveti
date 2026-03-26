
import React, { useRef, useMemo, useState } from 'react';
import { Search, CheckSquare, Square, Heart, Send, CheckCircle2, XCircle, Clock, MessageSquare, Trash2, Upload, X, AlertTriangle, Printer, Tag, RefreshCw, ChevronDown, ChevronUp, MapPin, Database, Layout, Users, Sparkles, Edit2, Check, Plus, Smartphone, Image as ImageIcon, Grid, Monitor, Coffee, UserCheck, Square as SquareIcon, Circle, Layers, Box, Settings2, Undo2, Redo2 } from 'lucide-react';
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
  activeLayoutTab: 'ai' | 'draw' | 'template' | 'library';
  setActiveLayoutTab: (tab: 'ai' | 'draw' | 'template' | 'library') => void;
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
  onSmartAutoLayout,
  onMagicLayout,
  isGeneratingLayout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTg, setEditTg] = useState('');
  const [expandedSubSection, setExpandedSubSection] = useState<'stage' | 'info' | null>('stage');

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
    const isCompleted = completedSteps[number];
    
    return (
      <button 
        onClick={onClick}
        data-step={number}
        className={`w-full flex items-center gap-3 p-3 border-b border-slate-100 transition-all ${active ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
          isCompleted 
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
            : active 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
              : 'bg-slate-200 text-slate-500'
        }`}>
          {isCompleted ? <Check className="w-3.5 h-3.5" /> : number}
        </div>
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
      </button>
    );
  };

  return (
    <aside className="w-full md:w-[360px] lg:w-[420px] xl:w-[480px] h-full bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 overflow-hidden transition-all duration-300">
      {/* HEADER TOOLS */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Layout className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Protokol AI</h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Editor v1.4.0</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all disabled:opacity-30"
            title="Geri Al (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all disabled:opacity-30"
            title="İleri Al (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div ref={sidebarContentRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col scroll-smooth">
        {/* STEP 1: İL VE SALON SEÇİMİ */}
        <StepHeader number={1} title="İl ve Salon Seçimi & Tasarım" active={expandedStep === 1} onClick={() => setExpandedStep(1)} />
        <AnimatePresence>
          {expandedStep === 1 && (
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
                          { id: 'template', icon: Layout, label: 'Şablon' },
                          { id: 'library', icon: Database, label: 'Kütüphane' },
                          { id: 'layers', icon: Layers, label: 'Katmanlar' }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveLayoutTab(tab.id as any)}
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
                          <div className="space-y-3">
                            {/* Seçili Elemanlar Kontrolü */}
                            {selectedElementIds.size > 0 && (
                              <div className="border-2 border-blue-500 rounded-2xl overflow-hidden bg-blue-50/30 animate-in zoom-in-95 duration-200">
                                <div className="p-4 bg-blue-600 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                                      <Box className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                      {selectedElementIds.size} Eleman Seçili
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => setSelectedElementIds(new Set())}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="p-4 space-y-4">
                                  {/* Rotasyon Kontrolü */}
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                      <RefreshCw className="w-3 h-3" /> Manuel Rotasyon (Derece)
                                    </label>
                                    <div className="flex gap-2">
                                      <input 
                                        type="number"
                                        placeholder="0°"
                                        className="flex-1 bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          if (!isNaN(val)) {
                                            const newElements = hall.elements?.map(el => 
                                              selectedElementIds.has(el.id) ? { ...el, rotation: val } : el
                                            );
                                            onUpdateHall({ ...hall, elements: newElements });
                                          }
                                        }}
                                      />
                                      <div className="flex gap-1">
                                        {[0, 90, 180, 270].map(deg => (
                                          <button 
                                            key={deg}
                                            onClick={() => {
                                              const newElements = hall.elements?.map(el => 
                                                selectedElementIds.has(el.id) ? { ...el, rotation: deg } : el
                                              );
                                              onUpdateHall({ ...hall, elements: newElements });
                                            }}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-blue-50 hover:border-blue-200 transition-all"
                                          >
                                            {deg}°
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Katman ve Gruplama */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <button 
                                      onClick={() => {
                                        const newElements = [...(hall.elements || [])];
                                        const selected = newElements.filter(el => selectedElementIds.has(el.id));
                                        const others = newElements.filter(el => !selectedElementIds.has(el.id));
                                        onUpdateHall({ ...hall, elements: [...others, ...selected] });
                                      }}
                                      className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                      <Layers className="w-3.5 h-3.5" /> Öne Getir
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newElements = [...(hall.elements || [])];
                                        const selected = newElements.filter(el => selectedElementIds.has(el.id));
                                        const others = newElements.filter(el => !selectedElementIds.has(el.id));
                                        onUpdateHall({ ...hall, elements: [...selected, ...others] });
                                      }}
                                      className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                      <Layers className="w-3.5 h-3.5 rotate-180" /> Arkaya Gönder
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button 
                                      onClick={() => {
                                        const groupId = Math.random().toString(36).substr(2, 9);
                                        const newElements = hall.elements?.map(el => 
                                          selectedElementIds.has(el.id) ? { ...el, groupId } : el
                                        );
                                        onUpdateHall({ ...hall, elements: newElements });
                                      }}
                                      className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                      <Grid className="w-3.5 h-3.5" /> Grupla
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newElements = hall.elements?.map(el => 
                                          selectedElementIds.has(el.id) ? { ...el, groupId: undefined } : el
                                        );
                                        onUpdateHall({ ...hall, elements: newElements });
                                      }}
                                      className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Grubu Çöz
                                    </button>
                                  </div>

                                  <button 
                                    onClick={() => {
                                      const newElements = hall.elements?.filter(el => !selectedElementIds.has(el.id));
                                      onUpdateHall({ ...hall, elements: newElements });
                                      setSelectedElementIds(new Set());
                                    }}
                                    className="w-full py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Seçilenleri Sil
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Kayıtlı Salon Bilgisi */}
                            {allHallConfigs[selectedHall] && (
                              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 mb-1 animate-in slide-in-from-top-2 duration-300">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                  <Database className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">Kayıtlı Salon Düzenleniyor</p>
                                  <p className="text-[11px] font-bold text-emerald-600 truncate">{allHallConfigs[selectedHall].name}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Sahne Ayarları */}
                            <div className="border border-blue-100 rounded-2xl overflow-hidden">
                              <button 
                                onClick={() => setExpandedSubSection(expandedSubSection === 'stage' ? null : 'stage')}
                                className="w-full p-4 bg-blue-50 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-blue-600" />
                                  <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">Sahne Ayarları</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${expandedSubSection === 'stage' ? 'rotate-180' : ''}`} />
                              </button>
                              
                              <AnimatePresence>
                                {expandedSubSection === 'stage' && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden bg-white"
                                  >
                                    <div className="p-4 space-y-3 border-t border-blue-50">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sahne Metni</label>
                                        <input 
                                          type="text" 
                                          value={hall.stage?.label || ''}
                                          onChange={(e) => onUpdateHall({
                                            ...hall,
                                            stage: { ...(hall.stage || { position: 'top', size: 'medium', label: '' }), label: e.target.value }
                                          })}
                                          placeholder="Örn: ANA SAHNE"
                                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konum</label>
                                          <select 
                                            value={hall.stage?.position || 'top'}
                                            onChange={(e) => {
                                              const newPos = e.target.value as any;
                                              onUpdateHall({
                                                ...hall,
                                                rows: [...hall.rows].reverse(),
                                                stage: { ...(hall.stage || { label: 'SAHNE', size: 'medium', position: 'top' }), position: newPos }
                                              });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                          >
                                            <option value="top">Üst</option>
                                            <option value="bottom">Alt</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Boyut</label>
                                          <select 
                                            value={hall.stage?.size || 'medium'}
                                            onChange={(e) => onUpdateHall({
                                              ...hall,
                                              stage: { ...(hall.stage || { label: 'SAHNE', position: 'top', size: 'medium' }), size: e.target.value as any }
                                            })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                          >
                                            <option value="small">Küçük</option>
                                            <option value="medium">Orta</option>
                                            <option value="large">Büyük</option>
                                          </select>
                                        </div>
                                      </div>

                                      <button 
                                        onClick={() => onUpdateHall({ ...hall, stage: hall.stage ? undefined : { label: 'SAHNE', position: 'top', size: 'medium' } })}
                                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                          hall.stage 
                                            ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' 
                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                        }`}
                                      >
                                        {hall.stage ? <XCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                        {hall.stage ? 'Sahneyi Kaldır' : 'Sahne Ekle'}
                                      </button>

                                      <button 
                                        onClick={() => onUpdateHall({ ...hall, rows: [...hall.rows].reverse() })}
                                        className="w-full py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" /> Sıralamayı Ters Çevir (A-Z / Z-A)
                                      </button>

                                      <div className="space-y-1.5 pt-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arka Plan Görseli</label>
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
                                                    onUpdateHall({ ...hall, backgroundImage: re.target?.result as string });
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              };
                                              input.click();
                                            }}
                                            className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                          >
                                            <ImageIcon className="w-3.5 h-3.5" /> Görsel Yükle
                                          </button>
                                          {hall.backgroundImage && (
                                            <button 
                                              onClick={() => onUpdateHall({ ...hall, backgroundImage: undefined })}
                                              className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Salon Bilgileri */}
                            <div className="border border-emerald-100 rounded-2xl overflow-hidden">
                              <button 
                                onClick={() => setExpandedSubSection(expandedSubSection === 'info' ? null : 'info')}
                                className="w-full p-4 bg-emerald-50 flex items-center justify-between hover:bg-emerald-100/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-emerald-600" />
                                  <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Salon Bilgileri</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${expandedSubSection === 'info' ? 'rotate-180' : ''}`} />
                              </button>
                              
                              <AnimatePresence>
                                {expandedSubSection === 'info' && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden bg-white"
                                  >
                                    <div className="p-4 space-y-3 border-t border-emerald-50">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salon Adı</label>
                                        <input 
                                          type="text"
                                          value={hall.name}
                                          onChange={(e) => onUpdateHall({ ...hall, name: e.target.value })}
                                          placeholder="Örn: Adana Bld. Tiyatro Salonu"
                                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                                        />
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salon Adresi</label>
                                        <textarea 
                                          value={hall.address || ''}
                                          onChange={(e) => onUpdateHall({ ...hall, address: e.target.value })}
                                          placeholder="Örn: Atatürk Cad. No:123, Adana"
                                          rows={3}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all resize-none"
                                        />
                                      </div>

                                      <button 
                                        onClick={onSaveHall}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95"
                                      >
                                        <Database className="w-4 h-4" /> Salonu Sisteme Kaydet
                                      </button>

                                      <button 
                                        onClick={() => {
                                          if(confirm('Tüm tasarımı sıfırlamak istediğinize emin misiniz?')) {
                                            onUpdateHall({ ...hall, elements: [] });
                                          }
                                        }}
                                        className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                                      >
                                        <Trash2 className="w-4 h-4" /> Tasarımı Sıfırla
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="space-y-3 pt-2">
                              <button 
                                onClick={onStartFreeDraw}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-200"
                              >
                                <Edit2 className="w-5 h-5" /> Serbest Çizim Editörü
                              </button>
                              <p className="text-[11px] text-slate-400 font-bold text-center uppercase tracking-tighter">
                                Tasarımı tamamlamak için koltuk ekleyip çıkarabilirsiniz
                              </p>
                            </div>
                          </div>
                        )}
                        {activeLayoutTab === 'template' && (
                          <div className="space-y-8">
                            {/* Gelişmiş Tasarım Araçları (Advanced Features) */}
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={onSmartAutoLayout}
                                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl text-white shadow-lg hover:shadow-blue-200 transition-all group active:scale-95 border border-white/10"
                              >
                                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-center">Akıllı Yerleşim</span>
                              </button>
                              <button 
                                onClick={() => setIs3DMode(!is3DMode)}
                                className={`flex flex-col items-center gap-2 p-4 border rounded-3xl transition-all group active:scale-95 ${
                                  is3DMode 
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-200' 
                                    : 'bg-white border-slate-100 text-slate-900 shadow-sm hover:border-blue-200'
                                }`}
                              >
                                <div className={`p-2 rounded-xl transition-colors ${is3DMode ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
                                  <Box className={`w-5 h-5 ${is3DMode ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest text-center ${is3DMode ? 'text-white' : 'text-slate-500'}`}>3D Görünüm</span>
                              </button>
                            </div>

                            {/* Şablon Ayarları */}
                            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                              <div className="flex items-center gap-2 px-1">
                                <div className="p-1.5 bg-blue-600 rounded-lg">
                                  <Settings2 className="w-3.5 h-3.5 text-white" />
                                </div>
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.15em]">Şablon Parametreleri</label>
                              </div>

                              <div className="space-y-4">
                                {/* Blok Satır Sayısı */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Blok/Masa Sayısı</span>
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{blockRows}</span>
                                  </div>
                                  <input 
                                    type="range" min="1" max="20" 
                                    value={blockRows} 
                                    onChange={(e) => setBlockRows(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <p className="text-[7px] text-slate-400 font-bold uppercase px-1">Tiyatroda satır, Baloda masa sayısı</p>
                                </div>

                                {/* Blok Koltuk Sayısı */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Sıra/Blok Koltuk Sayısı</span>
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{blockChairs}</span>
                                  </div>
                                  <input 
                                    type="range" min="2" max="30" 
                                    value={blockChairs} 
                                    onChange={(e) => setBlockChairs(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <p className="text-[7px] text-slate-400 font-bold uppercase px-1">Bir sıradaki veya bloktaki toplam koltuk</p>
                                </div>

                                {/* Masa Koltuk Sayısı */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Masa Etrafı Koltuk</span>
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{tableChairCount}</span>
                                  </div>
                                  <input 
                                    type="range" min="2" max="16" 
                                    value={tableChairCount} 
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      setTableChairCount(val);
                                      
                                      // Dinamik Güncelleme: Seçili masaların sandalye sayısını anlık değiştir
                                      if (selectedElementIds.size > 0) {
                                        const newElements = hall.elements?.map(el => {
                                          if (selectedElementIds.has(el.id) && el.type.includes('table')) {
                                            return { ...el, chairCount: val };
                                          }
                                          return el;
                                        }) || [];
                                        onUpdateHall({ ...hall, elements: newElements });
                                      }
                                    }}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <p className="text-[7px] text-slate-400 font-bold uppercase px-1">Ziyafet masalarının etrafındaki sandalye sayısı</p>
                                </div>
                              </div>
                            </div>

                            {/* Hızlı Ekleme Araçları */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Hızlı Ekle</label>
                                <div className="h-[1px] flex-1 bg-slate-100 ml-4"></div>
                              </div>
                                <div className="grid grid-cols-5 gap-2">
                                  {[
                                    { id: 'chair', name: 'Sandalye', icon: Square, type: 'chair' },
                                    { id: 'table-round', name: 'Yuvarlak', icon: Circle, type: 'table-round' },
                                    { id: 'table-rect', name: 'Dikdörtgen', icon: Layout, type: 'table-rect' },
                                    { id: 'table-square', name: 'Kare', icon: SquareIcon, type: 'table-square' },
                                    { id: 'stage', name: 'Sahne', icon: Monitor, type: 'stage' },
                                  ].map((item) => (
                                    <button
                                      key={item.id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('elementType', item.type);
                                      }}
                                      onClick={() => {
                                        if (onAddElement) {
                                          let width = 40;
                                          let height = 40;
                                          if (item.type === 'table-rect') { width = 160; height = 80; }
                                          else if (item.type.includes('table')) { width = 120; height = 120; }
                                          else if (item.type === 'stage') { width = 400; height = 100; }
                                          
                                          onAddElement([{
                                            id: Math.random().toString(36).substr(2, 9),
                                            type: item.type as any,
                                            x: 400 - width / 2,
                                            y: 300 - height / 2,
                                            rotation: 0,
                                            width,
                                            height,
                                            chairCount: item.type.includes('table') ? tableChairCount : undefined,
                                            label: item.type === 'stage' ? 'SAHNE' : undefined
                                          }]);
                                        }
                                      }}
                                      className="flex flex-col items-center gap-2 p-2 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all group active:scale-95"
                                    >
                                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                        <item.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                      </div>
                                      <span className="text-[7px] font-bold uppercase text-slate-500 group-hover:text-slate-900 leading-tight text-center">{item.name}</span>
                                    </button>
                                  ))}
                                </div>
                            </div>

                            {/* Hazır Bloklar */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Hazır Bloklar</label>
                                <div className="h-[1px] flex-1 bg-slate-100 ml-4"></div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('elementType', 'block-row-10');
                                    e.dataTransfer.setData('blockChairs', blockChairs.toString());
                                  }}
                                  onClick={() => {
                                    if (onAddElement) {
                                      const newElements: HallElement[] = Array.from({ length: blockChairs }).map((_, i) => ({
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: 'chair',
                                        x: 400 - (blockChairs * 25) + (i * 50),
                                        y: 300 - 20,
                                        rotation: 0,
                                        width: 40,
                                        height: 40
                                      }));
                                      onAddElement(newElements);
                                    }
                                  }}
                                  className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all group active:scale-95 text-left"
                                >
                                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                    <Grid className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                  </div>
                                  <div>
                                    <span className="block text-[9px] font-black uppercase text-slate-900">{blockChairs}'li Sıra</span>
                                    <span className="block text-[7px] font-bold text-slate-400 uppercase">Sandalye Bloğu</span>
                                  </div>
                                </button>
                                <button
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('elementType', 'block-table-10');
                                    e.dataTransfer.setData('blockChairs', blockChairs.toString());
                                  }}
                                  onClick={() => {
                                    if (onAddElement) {
                                      onAddElement([{
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: 'table-round',
                                        x: 400 - 75,
                                        y: 300 - 75,
                                        rotation: 0,
                                        width: 150,
                                        height: 150,
                                        chairCount: blockChairs,
                                      }]);
                                    }
                                  }}
                                  className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all group active:scale-95 text-left"
                                >
                                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                    <Circle className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                  </div>
                                  <div>
                                    <span className="block text-[9px] font-black uppercase text-slate-900">{blockChairs}'li Masa</span>
                                    <span className="block text-[7px] font-bold text-slate-400 uppercase">Ziyafet Bloğu</span>
                                  </div>
                                </button>
                              </div>
                            </div>

                            {/* Hazır Düzen Şablonları */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Hazır Yerleşimler</label>
                                <div className="h-[1px] flex-1 bg-slate-100 ml-4"></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <button 
                                  onClick={() => {
                                    if (confirm('Tüm yerleşimi temizlemek istediğinize emin misiniz?')) {
                                      onUpdateHall({ ...hall, elements: [] });
                                      setSelectedElementIds(new Set());
                                    }
                                  }}
                                  className="col-span-2 flex items-center justify-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 hover:bg-rose-100 transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Tüm Yerleşimi Temizle
                                </button>

                                {/* Magic AI Layout */}
                                <div className="col-span-2 p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] shadow-xl shadow-blue-200/50 space-y-4 border border-white/20 relative overflow-hidden group mb-2">
                                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-16 h-16 text-white" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                                      <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Sihirli Yerleşim (AI)</h4>
                                  </div>
                                  <p className="text-[10px] font-bold text-blue-100 leading-relaxed">
                                    Nasıl bir düzen istediğinizi yazın, yapay zeka sizin için saniyeler içinde oluştursun.
                                  </p>
                                  <div className="relative">
                                    <textarea 
                                      placeholder="Örn: 50 kişilik tiyatro düzeni ve protokol için 5 kişilik bir U masa..."
                                      value={magicPrompt}
                                      onChange={(e) => setMagicPrompt(e.target.value)}
                                      rows={2}
                                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-[11px] font-bold text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all resize-none"
                                    />
                                    <button 
                                      onClick={() => {
                                        onMagicLayout?.(magicPrompt);
                                        setMagicPrompt('');
                                      }}
                                      disabled={isGeneratingLayout || !magicPrompt}
                                      className={`mt-2 w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        isGeneratingLayout || !magicPrompt 
                                        ? 'bg-white/10 text-white/30 cursor-not-allowed' 
                                        : 'bg-white text-blue-600 hover:bg-blue-50 active:scale-95 shadow-lg'
                                      }`}
                                    >
                                      {isGeneratingLayout ? (
                                        <>
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                          Oluşturuluyor...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-4 h-4" />
                                          Yerleşimi Oluştur
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              {[
                                { id: 'theatre_free', name: 'Tiyatro', sub: 'Serbest Düzen', icon: Monitor },
                                { id: 'classroom_free', name: 'Sınıf', sub: 'Eğitim Düzeni', icon: Grid },
                                { id: 'ushape_free', name: 'U Tipi', sub: 'Toplantı Düzeni', icon: SquareIcon },
                                { id: 'protocol_u_shape', name: 'Protokol U', sub: 'Resmi U Düzeni', icon: UserCheck },
                                { id: 'banquet_free', name: 'Balo', sub: 'Ziyafet Düzeni', icon: Coffee },
                                { id: 'round_free', name: 'Yuvarlak', sub: 'Gala Düzeni', icon: Circle },
                                { id: 'protocol_free', name: 'Protokol', sub: 'Resmi Düzen', icon: UserCheck },
                                { id: 'square_free', name: 'Kare', sub: 'Çalışma Düzeni', icon: SquareIcon },
                                { id: 'amphi_free', name: 'Amfi', sub: 'Kavisli Düzen', icon: Sparkles },
                              ].map((tmpl) => (
                                <button 
                                  key={tmpl.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('templateId', tmpl.id);
                                    e.dataTransfer.setData('templateName', tmpl.name);
                                    e.dataTransfer.setData('blockRows', blockRows.toString());
                                    e.dataTransfer.setData('blockChairs', blockChairs.toString());
                                  }}
                                  onClick={() => handleTemplateClick(tmpl.id)}
                                  onMouseEnter={() => onPreviewTemplate?.(getTemplateElements(tmpl.id))}
                                  onMouseLeave={() => onPreviewTemplate?.(null)}
                                  className="flex flex-col items-start gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-lg transition-all group active:scale-95 text-left relative overflow-hidden"
                                >
                                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <tmpl.icon className="w-12 h-12 text-slate-900" />
                                  </div>
                                  <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-all">
                                    <tmpl.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                  </div>
                                  <div>
                                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-900">{tmpl.name}</span>
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{tmpl.sub}</span>
                                  </div>
                                </button>
                              ))}
                              </div>
                            </div>

                            {/* Seçili Öğe Düzenleme - 3D Hazırlık */}
                            {selectedElementIds.size > 0 && (
                              <div className="mt-6 p-4 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center justify-between px-1">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-600 rounded-lg">
                                      <Edit2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.15em]">Öğe Düzenle ({selectedElementIds.size})</label>
                                  </div>
                                  <button 
                                    onClick={() => setSelectedElementIds(new Set())}
                                    className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4 text-blue-400" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  {/* Z-Axis (Katman) */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                      <div className="flex items-center gap-1.5">
                                        <Layers className="w-3 h-3 text-blue-500" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Z-Ekseni</span>
                                      </div>
                                      <span className="text-[10px] font-black text-blue-600">
                                        {Array.from(selectedElementIds).map(id => hall.elements?.find(el => el.id === id)?.z || 0)[0]}
                                      </span>
                                    </div>
                                    <input 
                                      type="range" min="0" max="10" step="1"
                                      value={Array.from(selectedElementIds).map(id => hall.elements?.find(el => el.id === id)?.z || 0)[0]}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const newElements = hall.elements?.map(el => 
                                          selectedElementIds.has(el.id) ? { ...el, z: val } : el
                                        ) || [];
                                        onUpdateHall({ ...hall, elements: newElements });
                                      }}
                                      className="w-full h-1.5 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                  </div>

                                  {/* Height (Yükseklik) */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                      <div className="flex items-center gap-1.5">
                                        <Box className="w-3 h-3 text-blue-500" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Yükseklik (H)</span>
                                      </div>
                                      <span className="text-[10px] font-black text-blue-600">
                                        {Array.from(selectedElementIds).map(id => hall.elements?.find(el => el.id === id)?.h || 0)[0]}m
                                      </span>
                                    </div>
                                    <input 
                                      type="range" min="0" max="5" step="0.1"
                                      value={Array.from(selectedElementIds).map(id => hall.elements?.find(el => el.id === id)?.h || 0)[0]}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        const newElements = hall.elements?.map(el => 
                                          selectedElementIds.has(el.id) ? { ...el, h: val } : el
                                        ) || [];
                                        onUpdateHall({ ...hall, elements: newElements });
                                      }}
                                      className="w-full h-1.5 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      const newElements = hall.elements?.filter(el => !selectedElementIds.has(el.id)) || [];
                                      onUpdateHall({ ...hall, elements: newElements });
                                      setSelectedElementIds(new Set());
                                    }}
                                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Seçilenleri Sil
                                  </button>
                                </div>
                              </div>
                            )}
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
        <StepHeader number={2} title="Davetiye Görseli" active={expandedStep === 2} onClick={() => setExpandedStep(2)} />
        <AnimatePresence>
          {expandedStep === 2 && (
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
        <StepHeader number={3} title={`Protokol Listesi (${selectedIds.size}/${data.length})`} active={expandedStep === 3} onClick={() => setExpandedStep(3)} />
        <AnimatePresence>
          {expandedStep === 3 && (
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
                          {!p.tg && <AlertTriangle className="w-4 h-4 text-amber-500" title="Telegram ID Eksik" />}
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
        <StepHeader number={4} title="Davetiye Gönder" active={expandedStep === 4} onClick={() => setExpandedStep(4)} />
        <AnimatePresence>
          {expandedStep === 4 && (
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
        <StepHeader number={5} title="Kişileri Yerleştir" active={expandedStep === 5} onClick={() => setExpandedStep(5)} />
        <AnimatePresence>
          {expandedStep === 5 && (
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
        <StepHeader number={6} title="Koltuk No Gönder" active={expandedStep === 6} onClick={() => setExpandedStep(6)} />
        <AnimatePresence>
          {expandedStep === 6 && (
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
        <StepHeader number={7} title="Etiket Yazdır" active={expandedStep === 7} onClick={() => setExpandedStep(7)} />
        <AnimatePresence>
          {expandedStep === 7 && (
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
      </div>

      <div className="mt-auto p-3 bg-white border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">v1.4.0 Stable</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase">Cloud Sync</span>
          </div>
        </div>
        <div className="pt-1.5 flex items-center justify-center gap-2">
          <div className="h-[1px] flex-1 bg-slate-200"></div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            {selectedIds.size} KİŞİ SEÇİLDİ
          </span>
          <div className="h-[1px] flex-1 bg-slate-200"></div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
