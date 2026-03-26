
import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle, Database, ClipboardPaste } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ProtocolPerson } from '../types';

interface DataImportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onImportSuccess: () => void;
  supabase: any;
}

const DataImportPanel: React.FC<DataImportPanelProps> = ({ isOpen, onClose, selectedCity, onImportSuccess, supabase }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ProtocolPerson[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const analyzeWithAI = async () => {
    if (!inputText.trim()) {
      setError("Lütfen analiz edilecek metni yapıştırın.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        Aşağıdaki metin bir il valiliğinin resmi protokol listesidir. 
        Bu metindeki TÜM KİŞİLERİ (hiçbirini atlamadan) ayıkla.
        
        KESİN KURALLAR:
        1. Her satırı incele. Telefon numaralarını (05xx..., 5xx..., +90...), faks numaralarını, adresleri ve gereksiz sayıları KESİNLİKLE SİL.
        2. Sadece İSİM, ÜNVAN ve varsa TELEGRAM ID (genellikle sayısal bir ID veya @ ile başlayan kullanıcı adı) bilgilerini al.
        3. ÖNEMLİ: Telefon numaralarını (10 veya 11 haneli sayılar) ASLA Telegram ID olarak kaydetme. Telegram ID'leri genellikle 9-10 hanelidir ancak telefon numarası formatında değildir.
        4. İsimleri mutlaka BÜYÜK HARF yap.
        5. Sonucu SADECE şu JSON formatında bir dizi olarak döndür:
           [
             { "u": "ÜNVAN", "i": "İSİM SOYİSİM", "sira": 1, "tg": "TELEGRAM_ID_VARSA" },
             ...
           ]
        6. Liste çok uzun olsa bile (600+ kişi) asla yarıda kesme, tüm listeyi bitir.
        7. Eğer bir satırda isim yoksa sadece ünvan varsa, ismi "BELİRTİLMEDİ" olarak kaydet.
        8. Telegram ID yoksa "tg" alanını boş bırak veya null yap.
        9. Metin içindeki başlıkları, sayfa numaralarını veya boş satırları kesinlikle atla. Sadece protokol üyelerini al.
        
        METİN:
        ${inputText}
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text || "[]");
      // Geçersiz verileri filtrele ve telefon numarası gibi duran Telegram ID'lerini temizle
      const validResult = result.filter((p: any) => p.i && p.i !== "BELİRTİLMEDİ" && p.u).map((p: any) => {
        // Eğer tg bir telefon numarası gibi duruyorsa (05xx veya 5xx ile başlıyorsa ve 10-11 haneliyse) temizle
        // Kullanıcının belirttiği "5442717284" numarasını da özellikle kontrol et
        const tgStr = String(p.tg || '').replace(/\s/g, '');
        const telStr = String(p.telefon || '').replace(/\s/g, '');
        
        const isPhoneTg = /^(05|5)\d{9}$/.test(tgStr) || tgStr === '5442717284';
        const isPhoneTel = telStr === '5442717284';

        const newP = { ...p };
        if (isPhoneTg) newP.tg = null;
        if (isPhoneTel) newP.telefon = null;
        
        return newP;
      });
      setParsedData(validResult);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setError("Yapay zeka analizi sırasında bir hata oluştu: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToSupabase = async () => {
    // Sadece geçerli verileri al
    const cleanData = parsedData.filter(p => p.i && p.u && p.i !== "BELİRTİLMEDİ");
    if (cleanData.length === 0) {
      setError("Kaydedilecek geçerli veri bulunamadı.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Şehir ismini normalize et (tırnak işaretlerini kaldır)
      const normalizedCity = selectedCity.replace(/['"]/g, '').trim();
      
      // 1. Önce bu şehir için mevcut verileri temizle (Tam güncelleme için)
      const { error: deleteError } = await supabase
        .from('protokol_listesi')
        .delete()
        .eq('sehir', normalizedCity);

      if (deleteError) throw deleteError;
      
      // 2. Yeni verileri ekle
      const dataToSave = cleanData.map(p => ({
        unvan: p.u,
        ad_soyad: p.i,
        sira: p.sira,
        sehir: normalizedCity,
        durum: 'bekliyor',
        telegram_id: p.tg || null
      }));

      const { error: saveError } = await supabase
        .from('protokol_listesi')
        .insert(dataToSave);

      if (saveError) throw saveError;

      onImportSuccess();
      onClose();
      setInputText('');
      setParsedData([]);
      console.log(`${dataToSave.length} records saved for ${selectedCity}`);
    } catch (err: any) {
      console.error("Save Error:", err);
      setError("Veritabanına kaydetme hatası: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Akıllı Protokol Yükleyici</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {selectedCity} İli İçin Veri Hazırlama
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-800 animate-in slide-in-from-top duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardPaste className="w-3 h-3" /> Valilik Listesini Buraya Yapıştırın
                </label>
                <button 
                  onClick={() => setInputText('')}
                  className="text-[9px] font-bold text-blue-600 hover:underline uppercase"
                >
                  Temizle
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Örn: 1- Dr. İdris Akbıyık (Vali), 2- Ahmet Aydın..."
                className="w-full h-[300px] p-6 bg-slate-50 border-2 border-slate-100 rounded-[24px] text-sm font-medium focus:outline-none focus:border-blue-500 transition-all resize-none scrollbar-hide"
              />
              <button
                onClick={analyzeWithAI}
                disabled={isAnalyzing || !inputText.trim()}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                  inputText.trim() 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI Analiz Ediyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    AI ile Listeyi Ayıkla
                  </>
                )}
              </button>
            </div>

            {/* Preview Section */}
            <div className="space-y-4 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> Analiz Sonucu (Önizleme)
              </label>
              <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] overflow-hidden flex flex-col">
                {parsedData.length > 0 ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {parsedData.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
                        <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                          {item.sira}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">{item.i}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.u}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                    <Database className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
                      Henüz veri analizi yapılmadı.<br/>Sol tarafa metni yapıştırıp AI butonuna basın.
                    </p>
                  </div>
                )}
              </div>
              
              {parsedData.length > 0 && (
                <button
                  onClick={saveToSupabase}
                  disabled={isSaving}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      {parsedData.length} Kişiyi {selectedCity} İçin Kaydet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            * AI analizi isim ve ünvanları otomatik ayıklar, telefonları siler.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase">Gemini 3.0 Flash Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportPanel;
