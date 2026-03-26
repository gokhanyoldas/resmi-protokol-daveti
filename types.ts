
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
  type: 'chair' | 'table-round' | 'table-rect' | 'table-square' | 'stage' | 'ui-button';
  x: number;
  y: number;
  rotation: number;
  label?: string;
  seatNumber?: string;
  width?: number;
  height?: number;
  chairCount?: number;
  groupId?: string; // For grouping elements
  z?: number; // Z-index/Layer for 3D readiness
  h?: number; // Physical height for 3D readiness
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
}
