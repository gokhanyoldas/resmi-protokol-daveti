
import React, { useRef, useMemo, useState } from 'react';
import { Search, CheckSquare, Square, Heart, Send, CheckCircle2, XCircle, Clock, MessageSquare, Trash2, Upload, X, AlertTriangle, Printer, Tag, RefreshCw, ChevronDown, ChevronUp, MapPin, Database, Layout, Users } from 'lucide-react';
import { ProtocolPerson, HallKey } from '../types';
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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  data, selectedIds, setSelectedIds, searchTerm, setSearchTerm, toggleAll, 
  onSendInvitations, onSendSeatNumbers, onPrintLabels, onFileChange, 
  invitationFile, onRefresh, selectedCity, setSelectedCity, 
  selectedHall, setSelectedHall, onYerlestir, isSyncing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedStep, setExpandedStep] = useState<number>(1);

  const previewUrl = useMemo(() => {
    if (!invitationFile) return null;
    return URL.createObjectURL(invitationFile);
  }, [invitationFile]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const togglePerson = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusDisplay = (status?: string) => {
    switch(status) {
      case 'katiliyor': return <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Katılıyor</div>;
      case 'katilmiyor': return <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Katılmıyor</div>;
      default: return <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Yanıt Yok</div>;
    }
  };

  const StepHeader = ({ number, title, active, onClick }: { number: number, title: string, active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 border-b border-slate-100 transition-all ${active ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>
        {number}
      </div>
      <span className={`text-xs font-black uppercase tracking-widest flex-1 text-left ${active ? 'text-blue-700' : 'text-slate-500'}`}>
        {title}
      </span>
      {active ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
    </button>
  );

  return (
    <aside className="w-[450px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 overflow-hidden">
      {/* STEP 1: İL VE SALON SEÇİMİ */}
      <StepHeader number={1} title="İl ve Salon Seçimi" active={expandedStep === 1} onClick={() => setExpandedStep(1)} />
      <AnimatePresence>
        {expandedStep === 1 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-100"
          >
            <div className="p-4 space-y-4 bg-slate-50/30">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Şehir Seçiniz
                </label>
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  {TURKEY_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-3 h-3" /> Salon Seçiniz
                </label>
                <select 
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value as HallKey)}
                  disabled={!CITY_HALLS[selectedCity]}
                  className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${!CITY_HALLS[selectedCity] ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {CITY_HALLS[selectedCity] ? (
                    CITY_HALLS[selectedCity].map(hallKey => (
                      <option key={hallKey} value={hallKey}>{HALL_CONFIGS[hallKey as HallKey].name}</option>
                    ))
                  ) : (
                    <option value="">Salon Tanımlanmadı</option>
                  )}
                </select>
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
                  <div className="relative h-24 rounded-2xl border-2 border-emerald-100 bg-white p-3 flex items-center gap-4 shadow-sm">
                      <img src={previewUrl} alt="Önizleme" className="w-16 h-16 rounded-xl object-cover shadow-md" />
                      <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate text-slate-700">{invitationFile.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(invitationFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button onClick={() => onFileChange(null)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                  </div>
              ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition-all group">
                      <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-blue-100 transition-all mb-1">
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Görsel seçmek için tıklayın</p>
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
            className="flex-1 flex flex-col min-h-0 overflow-hidden border-b border-slate-100"
          >
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-white">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Kişi veya ünvan ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-9 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="flex gap-1">
                  <button onClick={() => toggleAll(true)} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:text-blue-600 transition-colors" title="Tümünü Seç"><CheckSquare className="w-4 h-4" /></button>
                  <button onClick={() => toggleAll(false)} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:text-rose-600 transition-colors" title="Seçimi Temizle"><Trash2 className="w-4 h-4" /></button>
                  {onRefresh && (
                    <button onClick={onRefresh} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:text-blue-600 transition-colors" title="Yenile">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-slate-50/30 max-h-[70vh] scrollbar-hide">
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <AlertTriangle className="w-8 h-8 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Liste Boş</p>
                </div>
              ) : (
                data.map((p) => (
                  <div key={p.id} onClick={() => p.id !== undefined && togglePerson(p.id)} className={`flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${p.id !== undefined && selectedIds.has(p.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.id !== undefined && selectedIds.has(p.id) ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 text-slate-300'}`}>
                      {p.id !== undefined && selectedIds.has(p.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-[9px] font-black uppercase tracking-widest truncate max-w-[150px] ${p.id !== undefined && selectedIds.has(p.id) ? 'text-blue-700' : 'text-slate-400'}`}>{p.u}</p>
                        {getStatusDisplay(p.katilim_durumu)}
                      </div>
                      <p className="text-xs font-black truncate text-slate-900">{p.i}</p>
                    </div>
                    {!p.tg && <AlertTriangle className="w-3 h-3 text-amber-500" title="Telegram ID Eksik" />}
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
            <div className="p-4 bg-slate-50/30">
              <button 
                onClick={onSendInvitations} 
                disabled={selectedIds.size === 0 || !invitationFile} 
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" /> Davetiye Gönder
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
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Database className="w-4 h-4" /> Kişileri Yerleştir
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
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> Koltuk No Gönder
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
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Tag className="w-4 h-4" /> Etiket Yazdır
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto p-4 bg-white border-t border-slate-100">
        <div className="pt-2 flex items-center justify-center gap-2">
          <div className="h-[1px] flex-1 bg-slate-200"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedIds.size} KİŞİ SEÇİLDİ
          </span>
          <div className="h-[1px] flex-1 bg-slate-200"></div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
