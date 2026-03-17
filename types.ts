
export interface ProtocolPerson {
  u: string; // Ünvan
  i: string; // İsim
  tg?: string; // Telegram ID
  koltuk_no?: string;
  katilim_durumu?: 'bekliyor' | 'katiliyor' | 'katilmiyor';
  es_durumu?: boolean;
  id?: number;
  sira?: number;
}

export interface SeatData {
  id: string;
  data: ProtocolPerson | null;
  type: 'empty' | 'dolu' | 'dolu-es' | 'ozel' | 'static' | 'bekliyor';
  number: string;
}

export type HallKey = 'yildiz' | 'turkan' | 'msku' | 'bodrum';

export interface HallRow {
  row: string;
  seats: {
    number: string;
    type: 'seat' | 'gap' | 'static';
    size?: 'small' | 'large';
  }[];
}

export interface HallConfig {
  name: string;
  rows: HallRow[];
}
