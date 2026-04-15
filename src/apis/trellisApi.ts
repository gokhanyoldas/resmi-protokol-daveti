
/**
 * Trellis API Service
 * Handles 3D model generation and validation
 */

export interface TrellisResponse {
  modelUrl: string;
  blob?: Blob;
  size?: number;
}

export const generateTrellisModel = async (file: File): Promise<TrellisResponse> => {
  // 1. Trellis Yükleme Koruması: Dosya boyutu kontrolü
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB limit
  if (file.size > MAX_SIZE) {
    throw new Error("Dosya boyutu çok büyük (Maksimum 50MB).");
  }

  console.log("TRELLIS AI: Model üretimi başlatıldı...", file.name);

  // Simulated API call
  await new Promise(resolve => setTimeout(resolve, 4000));

  // Simulated GLB result
  const modelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb';
  
  try {
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error("Model indirilemedi.");
    
    const blob = await response.blob();
    
    // Check downloaded model size
    if (blob.size === 0) {
      throw new Error("Üretilen model bozuk veya boş.");
    }

    return {
      modelUrl: URL.createObjectURL(blob),
      blob,
      size: blob.size
    };
  } catch (error) {
    console.error("TRELLIS API Error:", error);
    throw error;
  }
};
