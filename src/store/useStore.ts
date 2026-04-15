
import { create } from 'zustand';
import { HallElement, ProtocolPerson } from '../../types';
import { GoogleGenAI } from "@google/genai";

interface DesignState {
  elements: HallElement[];
  protocolList: ProtocolPerson[];
  setElements: (elements: HallElement[]) => void;
  addElement: (element: HallElement) => void;
  updateElement: (id: string, updates: Partial<HallElement>) => void;
  removeElement: (id: string) => void;
  setProtocolList: (list: ProtocolPerson[]) => void;
  getGeminiSuggestion: () => Promise<string>;
  syncToProtocol: () => void;
}

export const useStore = create<DesignState>((set, get) => ({
  elements: [],
  protocolList: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) => set((state) => ({ elements: [...state.elements, element] })),
  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map((el) => el.id === id ? { ...el, ...updates } : el)
  })),
  removeElement: (id) => set((state) => ({
    elements: state.elements.filter((el) => el.id !== id)
  })),
  setProtocolList: (list) => set({ protocolList: list }),
  getGeminiSuggestion: async () => {
    const { elements } = get();
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Aşağıdaki 3D salon düzeni verilerini analiz et ve resmi protokol kurallarına göre en uygun oturma düzeni ve hiyerarşi önerilerini sun. 
        Veriler: ${JSON.stringify(elements)}
        Lütfen profesyonel, net ve uygulanabilir öneriler ver.`
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Suggestion Error:", error);
      return "Öneri alınırken bir hata oluştu.";
    }
  },
  syncToProtocol: () => {
    const { elements, protocolList } = get();
    // 3D verisindeki koltukları protokol listesiyle eşleştirme mantığı
    const seatedCount = elements.filter(el => el.type === 'chair').length;
    console.log(`Syncing ${seatedCount} seats to protocol list...`);
    // Burada daha derin bir eşleştirme mantığı kurulabilir
  }
}));
