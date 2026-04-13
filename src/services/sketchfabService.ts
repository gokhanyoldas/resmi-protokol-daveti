
/**
 * Sketchfab API Service
 * Handles searching and fetching download URLs for 3D models.
 */

const SKETCHFAB_API_BASE = 'https://api.sketchfab.com/v3';

export const searchSketchfabModels = async (query: string, token?: string) => {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Token ${token.trim()}`;
  }

  const response = await fetch(
    `${SKETCHFAB_API_BASE}/search?type=models&q=${encodeURIComponent(
      query
    )}&downloadable=true&restricted=0&sort_by=-relevance`,
    { headers }
  );
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sketchfab API anahtarı geçersiz');
    throw new Error('Sketchfab arama başarısız oldu');
  }
  return response.json();
};

export const getSketchfabDownloadUrl = async (uid: string, token?: string) => {
  if (!token) {
    console.warn('Sketchfab API token is missing. Cannot fetch download URL.');
    throw new Error('Sketchfab API anahtarı eksik. Lütfen ayarlardan ekleyin.');
  }

  try {
    const response = await fetch(`${SKETCHFAB_API_BASE}/models/${uid}/download`, {
      headers: {
        Authorization: `Token ${token.trim()}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Sketchfab API tokeni geçersiz');
        throw new Error('Sketchfab API anahtarı geçersiz. Lütfen kontrol edin.');
      }
      if (response.status === 403) {
        throw new Error('Bu model ücretli olabilir veya indirme izni bulunmuyor.');
      }
      throw new Error(`İndirme bağlantısı alınamadı (Hata: ${response.status})`);
    }

    const data = await response.json();
    
    // Format Priority: GLB/gltf first, then others
    // Sketchfab API typically provides 'gltf' which is often a GLB file
    let downloadUrl = null;
    
    if (data.glb) downloadUrl = data.glb.url;
    else if (data.gltf) downloadUrl = data.gltf.url;
    else if (data.source) downloadUrl = data.source.url;
    else {
      // Fallback: take the first available format
      const firstFormat = Object.values(data)[0] as any;
      if (firstFormat && firstFormat.url) downloadUrl = firstFormat.url;
    }

    if (!downloadUrl) {
      throw new Error('Model için uygun bir indirme formatı bulunamadı.');
    }

    return downloadUrl;
  } catch (error) {
    console.error('Error fetching Sketchfab download URL:', error);
    throw error;
  }
};
