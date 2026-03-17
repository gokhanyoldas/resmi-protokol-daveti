
import React, { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, title: string) => void;
  onDelete?: () => void;
}

const GuestModal: React.FC<GuestModalProps> = ({ isOpen, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTitle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Özel Konuk Tanımla</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">İsim Soyisim</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet YILMAZ"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Ünvan / Not</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Önceki Dönem Milletvekili"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold"
            />
          </div>
        </div>

        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div>
            {onDelete && (
              <button 
                onClick={onDelete}
                className="px-4 py-2.5 rounded-xl font-bold text-rose-600 hover:bg-rose-50 transition-all text-xs uppercase tracking-widest"
              >
                Koltuk Boşalt
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
            >
              İptal
            </button>
            <button 
              onClick={() => onSave(name, title || 'Özel Misafir')}
              disabled={!name.trim()}
              className="px-6 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestModal;
