
import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle, Layout, Upload, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { HallConfig } from '../types';

interface HallAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onAnalysisSuccess: (config: HallConfig) => void;
}

const HallAnalysisPanel: React.FC<HallAnalysisPanelProps> = ({ isOpen, onClose, selectedCity, onAnalysisSuccess }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const analyzeHallWithAI = async () => {
    if (!selectedFile) {
      setError("Lütfen analiz edilecek salon planı görselini seçin.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";

      // Dosyayı base64'e çevir
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(selectedFile);
      const base64Data = await base64Promise;

      const prompt = `
        Bu görsel bir tiyatro, opera veya konferans salonunun detaylı oturma planıdır (Örn: Adana Büyükşehir Belediyesi Tiyatro Salonu). 
        Lütfen bu planı çok hassas bir şekilde analiz et ve dijital bir yerleşim planı (JSON) oluştur.
        
        ANALİZ TALİMATLARI:
        1. SAHNE KONUMU: Görselin en altında "SAHNE" yazıyorsa position: "bottom" yap. En üstteyse "top".
        2. SIRA SIRALAMASI: Sıraları EN ÜSTTEN EN ALTA doğru (görseldeki perspektife göre) tespit et. 
           - Eğer sahne alttaysa, en üstteki sıralar (Örn: BE, BD, BC...) listenin başında olmalı, en alttaki (Sahneye en yakın, Örn: A) listenin sonunda olmalı.
        3. BALKON VE BÖLÜMLER: "BALKON" gibi metinleri veya farklı bölümleri fark et. Bunları da row etiketi olarak yansıt.
        4. KOLTUKLAR VE KORİDORLAR: 
           - Her sıradaki koltuk sayısını ve numaralarını (1, 2, 3...) tam olarak tespit et.
           - Koltuklar arasındaki boşlukları (koridorları) type: "gap" olarak işaretle. 
           - Örn: Bir sırada 1-12 arası koltuklar var, sonra boşluk, sonra 13-28 arası varsa; 12. koltuktan sonra bir "gap" ekle.
        5. HASSASİYET: Adana örneğindeki gibi BA, BB, BC, BD, BE gibi özel isimlendirmeleri koru.
        
        ÇIKTI FORMATI (SADECE JSON):
        {
          "name": "SALONUN TAM ADI",
          "rows": [
            {
              "row": "SIRA ETİKETİ (Örn: BE)",
              "seats": [
                { "number": "1", "type": "seat" },
                { "number": "2", "type": "seat" },
                { "number": "", "type": "gap" },
                { "number": "3", "type": "seat" }
              ]
            }
          ],
          "stage": {
            "label": "SAHNE",
            "position": "top | bottom",
            "size": "large"
          }
        }
        
        Görseldeki her bir koltuğu ve boşluğu dijital plana sadık kalarak aktar.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: selectedFile.type,
                data: base64Data
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error("Salon yapısı tespit edilemedi.");
      }

      onAnalysisSuccess(result as HallConfig);
      onClose();
    } catch (err: any) {
      console.error("AI Hall Analysis Error:", err);
      setError("Salon analizi sırasında bir hata oluştu: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">AI Salon Analiz Modu</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {selectedCity} İçin Salon Planı Oluşturma
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[32px] p-12 bg-slate-50/50 hover:bg-slate-50 transition-all group relative overflow-hidden">
            {previewUrl ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg">
                <img src={previewUrl} alt="Salon Planı" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <label className="cursor-pointer bg-white text-slate-800 px-6 py-3 rounded-xl font-black uppercase text-xs shadow-xl">
                    Görseli Değiştir
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center group-hover:scale-110 transition-all">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Salon Planı Yükleyin</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PNG, JPG veya PDF (Görsel)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <Layout className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                <span className="text-blue-600 font-black">NASIL ÇALIŞIR?</span><br/>
                Yüklediğiniz salon planı görseli AI tarafından taranır. Sahne konumu, protokol sıraları ve genel oturma düzeni otomatik olarak tespit edilerek dijital plana dönüştürülür.
              </p>
            </div>
          </div>

          <button
            onClick={analyzeHallWithAI}
            disabled={isAnalyzing || !selectedFile}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
              selectedFile && !isAnalyzing
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                AI Salonu Analiz Ediyor...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Analizi Başlat ve Salonu Oluştur
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gemini 3.0 Vision Engine Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HallAnalysisPanel;
