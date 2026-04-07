
export interface ProtocolPerson {
  u: string; // Ünvan
  i: string; // İsim
  tg?: string; // Telegram ID
  koltuk_no?: string;
  katilim_durumu?: 'bekliyor' | 'katiliyor' | 'katilmiyor';
  es_durumu?: boolean;
  id?: number;
  sira?: number;
  sehir?: string; // Şehir bilgisi
  isLocal?: boolean; // Veritabanından gelip gelmediğini anlamak için
}

export interface SeatData {
  id: string;
  data: ProtocolPerson | null;
  type: 'empty' | 'dolu' | 'dolu-es' | 'ozel' | 'static' | 'bekliyor';
  number: string;
}

export type HallKey = string;

export interface HallRow {
  row: string;
  type?: 'row' | 'label';
  seats: {
    number: string;
    type: 'seat' | 'gap' | 'static';
    size?: 'small' | 'large';
  }[];
}

export interface HallElement {
  id: string;
  type: 'chair' | 'table-round' | 'table-rect' | 'table-square' | 'stage' | 'led-screen' | 'ui-button' | 'wall' | 'door' | 'window' | 'decor' | 'plant' | 'bar' | 'text' | 'dimension-line' | 'work-area' | 'polygon' | 'sun-angle' | 'tree' | 'car' | 'building' | 'road' | 'person' | 'ambulance' | 'catering-truck' | 'security-post';
  x: number;
  y: number;
  points?: { x: number; y: number }[]; // For polygons and roads
  x2?: number; // For dimension-line and sun-angle
  y2?: number; // For dimension-line and sun-angle
  rotation: number;
  label?: string;
  seatNumber?: string;
  width?: number;
  height?: number;
  radius?: number; // For round tables
  chairCount?: number;
  chairSpacingAngle?: number; // For round tables
  chairModel?: string; // 'standard' | 'vip' | 'executive'
  groupId?: string; // For grouping elements
  z?: number; // Z-index/Layer
  h?: number; // Physical height
  color?: string;
  opacity?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  ticketZone?: string; // 'VIP' | 'Standard' | etc.
  legStyle?: 'default' | 'modern' | 'classic';
  zoningType?: 'residential' | 'commercial' | 'green' | 'education' | 'health' | 'industrial' | 'public';
}

export interface ScaleCalibration {
  pixelDistance: number;
  realDistance: number;
  unit: 'm' | 'cm' | 'ft' | 'in';
}

export interface ReferenceImage {
  id: string;
  url: string;
  type?: 'image' | 'video';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  isLocked: boolean;
  name?: string;
  z?: number;
  aspectRatio?: number;
}

export interface HallConfig {
  name: string;
  address?: string;
  rows: HallRow[];
  elements?: HallElement[]; // Free-form elements
  stage?: {
    label: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    size: 'small' | 'medium' | 'large';
  };
  width?: number;
  height?: number;
  backgroundImage?: string; // Base64 or URL
  referenceImages?: ReferenceImage[]; // Multiple reference images
  scaleCalibration?: ScaleCalibration;
  viewMode?: '2d' | '3d';
  environment?: {
    skyColor?: string;
    groundColor?: string;
    ambientLight?: number;
    sunIntensity?: number;
  };
}
