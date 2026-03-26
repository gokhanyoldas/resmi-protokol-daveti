
import React from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle2, XCircle, User, Smartphone, MessageSquare } from 'lucide-react';

interface TelegramPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invitationImage: string | null;
  personName: string;
  personTitle: string;
}

const TelegramPreview: React.FC<TelegramPreviewProps> = ({ isOpen, onClose, invitationImage, personName, personTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#17212b] w-full max-w-[360px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Telegram Header */}
        <div className="bg-[#242f3d] px-6 py-4 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
          <div>
            <h4 className="text-white text-sm font-bold leading-tight">Protokol Botu</h4>
            <p className="text-blue-400 text-[11px]">bot</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="h-[500px] overflow-y-auto p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded51.png')] bg-repeat">
          <div className="flex flex-col gap-2">
            <div className="bg-[#242f3d] self-start max-w-[85%] rounded-2xl rounded-tl-none overflow-hidden shadow-md border border-white/5">
              {invitationImage ? (
                <img src={invitationImage} alt="Davetiye" className="w-full aspect-[4/5] object-cover" />
              ) : (
                <div className="w-full aspect-[4/5] bg-slate-800 flex items-center justify-center text-slate-500 italic text-xs p-8 text-center">
                  Davetiye görseli henüz yüklenmedi
                </div>
              )}
              <div className="p-3 space-y-2">
                <p className="text-white text-[13px] leading-relaxed">
                  SAYIN <span className="font-bold text-blue-300">{personTitle.toUpperCase()} {personName.toUpperCase()}</span>,
                  <br /><br />
                  DAVETİYENİZ EKTE SUNULMUŞTUR.
                  <br /><br />
                  LÜTFEN KATILIM DURUMUNUZU BİLDİRİNİZ.
                </p>
                <div className="text-[#6c7883] text-[10px] text-right">12:45</div>
              </div>
            </div>

            {/* Inline Buttons Simulation */}
            <div className="grid grid-cols-2 gap-1.5 mt-1 w-[85%]">
              <div className="bg-[#242f3d]/90 backdrop-blur py-2 rounded-lg text-blue-400 text-[11px] font-bold text-center border border-white/5">✅ KATILIYORUM</div>
              <div className="bg-[#242f3d]/90 backdrop-blur py-2 rounded-lg text-blue-400 text-[11px] font-bold text-center border border-white/5">❌ KATILMIYORUM</div>
              <div className="bg-[#242f3d]/90 backdrop-blur py-2 rounded-lg text-blue-400 text-[11px] font-bold text-center border border-white/5">👫 EŞLİ</div>
              <div className="bg-[#242f3d]/90 backdrop-blur py-2 rounded-lg text-blue-400 text-[11px] font-bold text-center border border-white/5">👤 TEK</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#242f3d]">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            SİMÜLASYONU KAPAT
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TelegramPreview;
