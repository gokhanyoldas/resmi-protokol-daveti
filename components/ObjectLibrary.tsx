import React, { useState } from 'react';

interface SketchfabModel {
  uid: string;
  name: string;
  thumbnails: { images: { url: string }[] };
}

interface ObjectLibraryProps {
  onAddObject: (modelUrl: string) => void;
}

const ObjectLibrary: React.FC<ObjectLibraryProps> = ({ onAddObject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [models, setModels] = useState<SketchfabModel[]>([]);
  const [loading, setLoading] = useState(false);

  const searchSketchfab = async () => {
    setLoading(true);
    const token = import.meta.env.VITE_SKETCHFAB_API_TOKEN; // .env dosyasından okur
    
    try {
      const response = await fetch(
        `https://api.sketchfab.com/v3/search?q=${searchTerm}&type=models&downloadable=true`,
        {
          headers: { Authorization: `Token ${token}` }
        }
      );
      const data = await response.json();
      setModels(data.results);
    } catch (error) {
      console.error("Sketchfab Hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900 text-white h-full overflow-y-auto w-64">
      <h3 className="text-lg font-bold mb-4">Nesne Kütüphanesi</h3>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Model ara (örn: chair)"
          className="bg-slate-800 p-2 rounded text-sm w-full"
        />
        <button onClick={searchSketchfab} className="bg-blue-600 px-3 rounded">Ara</button>
      </div>

      {loading ? <p>Yükleniyor...</p> : (
        <div className="grid grid-cols-2 gap-2">
          {models.map(model => (
            <div 
              key={model.uid} 
              onClick={() => onAddObject(model.uid)}
              className="cursor-pointer hover:opacity-80 transition"
            >
              <img 
                src={model.thumbnails.images[0].url} 
                alt={model.name} 
                className="w-full h-20 object-cover rounded" 
              />
              <p className="text-[10px] truncate mt-1">{model.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ObjectLibrary;
