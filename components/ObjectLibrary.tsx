
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, ExternalLink, User, ShieldCheck, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchSketchfabModels } from '../src/services/sketchfabService';

// Fallback: If .env is not working, you can define the token here temporarily.
// const FALLBACK_TOKEN = 'YOUR_TOKEN_HERE';

// Robust token retrieval
const getSketchfabToken = () => {
  const token = import.meta.env.VITE_SKETCHFAB_API_TOKEN || 
                (window as any).process?.env?.VITE_SKETCHFAB_API_TOKEN || 
                '';
  return token.trim();
};

const SKETCHFAB_TOKEN = getSketchfabToken();

interface SketchfabModel {
  uid: string;
  name: string;
  thumbnails: {
    images: {
      url: string;
      width: number;
      height: number;
    }[];
  };
  user: {
    username: string;
    displayName: string;
  };
  license: {
    label: string;
  };
  viewerUrl: string;
}

interface ObjectLibraryProps {
  onAddObject: (model: { uid: string, name: string, creator: string, license: string }) => void;
}

const ObjectLibrary: React.FC<ObjectLibraryProps> = ({ onAddObject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [models, setModels] = useState<SketchfabModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchModels = async (query: string) => {
    if (!query) return;
    
    console.log("Sistemde bulunan Token:", SKETCHFAB_TOKEN ? "Mevcut" : "Eksik");
    
    if (!SKETCHFAB_TOKEN) {
      console.error('Hata: API Token bulunamadı. Lütfen çevre değişkenlerini kontrol edin (VITE_SKETCHFAB_API_TOKEN).');
      setError('Sketchfab API anahtarı eksik. Lütfen ayarlardan ekleyin.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await searchSketchfabModels(query, SKETCHFAB_TOKEN);
      setModels(data.results || []);
    } catch (err: any) {
      console.error('Sketchfab search error:', err);
      setError(err.message || 'Modeller yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) searchModels(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="3B Model Ara (örn: luxury chair)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 outline-none transition-all shadow-inner"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
        {error && (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</p>
          </div>
        )}

        {!searchTerm && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-40">
            <Box className="w-12 h-12 text-slate-300" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Sketchfab kütüphanesinden <br /> milyonlarca modele erişin
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence mode="popLayout">
            {models.map((model) => (
              <motion.div
                key={model.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white border-2 border-slate-100 rounded-[28px] overflow-hidden hover:border-blue-500 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-100/50"
              >
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={model.thumbnails.images[0]?.url}
                    alt={model.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <button
                      onClick={() => {
                        const modelData = {
                          uid: model.uid,
                          name: model.name,
                          creator: model.user.displayName || model.user.username,
                          license: model.license.label
                        };
                        
                        // Call the prop if provided
                        onAddObject(modelData);
                        
                        // Dispatch custom event for DrawingCanvas
                        window.dispatchEvent(new CustomEvent('add-3d-object', { 
                          detail: { 
                            uid: modelData.uid,
                            name: modelData.name,
                            creator: modelData.creator,
                            license: modelData.license
                          } 
                        }));
                      }}
                      className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Sahneye Ekle
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">
                      {model.name}
                    </h5>
                    <a 
                      href={model.viewerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[9px] font-bold text-slate-500 truncate uppercase tracking-tighter">
                        {model.user.displayName || model.user.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">
                        {model.license.label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ObjectLibrary;
