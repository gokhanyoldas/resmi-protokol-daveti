
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Users, Printer, ZoomIn, ZoomOut, Database, RefreshCw, MessageSquare, AlertCircle, Loader2, CheckCircle2, XCircle, Clock, Send, ChevronDown, MapPin, Tag, Layout } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PROTOCOL_DATA, HALL_CONFIGS, TURKEY_CITIES, CITY_HALLS } from './constants';
import { ProtocolPerson, HallKey, SeatData } from './types';
import Sidebar from './components/Sidebar';
import SeatingPlan from './components/SeatingPlan';
import GuestModal from './components/GuestModal';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qorygwdwirbtqewhubze.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcnlnd2R3aXJidHFld2h1YnplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyOTU1OCwiZXhwIjoyMDgwMjA1NTU4fQ.oeReAMn8O533IcPcDSg1QfzYTden72SyK677etV9ZaM';
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8559688926:AAH832uoO8JfSMIt6YdUhxc19NBFh090I7M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APP_VERSION = '1.2.5';
const BUILD_DATE = '17.03.2026 11:45';

const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Muğla');
  const [selectedHall, setSelectedHall] = useState<HallKey>('yildiz');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<number>>(new Set());
  const [protocolList, setProtocolList] = useState<ProtocolPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(0.8);
  const [seating, setSeating] = useState<Record<string, SeatData>>({});
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfficialSyncing, setIsOfficialSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('lastSyncTime'));
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [invitationFile, setInvitationFile] = useState<File | null>(null);
  const lastUpdateId = useRef<number>(0);

  const formatChatId = (tgId: string) => {
    const clean = String(tgId || "").trim();
    if (!clean || clean === 'null' || clean === 'undefined') return null;
    if (/^-?\d+$/.test(clean)) return clean;
    return clean.startsWith('@') ? clean : `@${clean}`;
  };

  const fetchStatuses = useCallback(async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('protokol_listesi')
        .select('*')
        .order('sira', { ascending: true });
        
      if (error) throw error;

      if (data && data.length > 0) {
        const mappedList: ProtocolPerson[] = data.map((d: any) => ({
          u: d.unvan || "Ünvan Belirtilmedi",
          i: d.ad_soyad || d.isim || "İsim Belirtilmedi",
          tg: d.telegram_id,
          katilim_durumu: (d.durum === 'katiliyor' || d.durum === 'katılıyor') ? 'katiliyor' : 
                          (d.durum === 'katilmiyor' || d.durum === 'katılmıyor') ? 'katilmiyor' : 'bekliyor',
          es_durumu: d.es_durumu === true,
          koltuk_no: d.koltuk_no,
          id: d.id,
          sira: d.sira || d.id
        }));

        setProtocolList(mappedList);
        
        const protocolSeating: Record<string, SeatData> = {};
        mappedList.forEach(p => {
            if (p.koltuk_no && (p.katilim_durumu === 'katiliyor' || p.katilim_durumu === 'bekliyor')) {
                const seatIds = p.koltuk_no.split('-');
                seatIds.forEach((sid, index) => {
                  protocolSeating[sid] = { 
                    id: sid, 
                    data: index === 0 ? p : { ...p, i: `${p.i} (Eşi)` }, 
                    type: p.katilim_durumu === 'katiliyor' ? 'dolu' : 'bekliyor', 
                    number: sid.replace(/[A-Z]/g, '') 
                  };
                });
            }
        });

        setSeating(prev => {
          const newSeating = { ...protocolSeating };
          // Manuel (Özel Kayıt) yerleşimleri koru
          Object.keys(prev).forEach(sid => {
            if (prev[sid].type === 'ozel') {
              newSeating[sid] = prev[sid];
            }
          });
          return newSeating;
        });
      } else {
        // Veritabanı boşsa veya veri gelmediyse varsayılan listeyi kullan
        setProtocolList(PROTOCOL_DATA);
      }
    } catch (err: any) {
      console.error("Fetch Error Details:", err);
      setStatusMessage({ text: `Bağlantı Hatası: ${err.message || 'Sunucuya erişilemiyor'}`, type: 'error' });
      // Hata durumunda eğer liste boşsa varsayılanı yükle
      setProtocolList(prev => prev.length === 0 ? PROTOCOL_DATA : prev);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, []);

  // Realtime Subscription for automatic updates when DB changes
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'protokol_listesi'
        },
        (payload) => {
          console.log('Veritabanı değişikliği algılandı:', payload);
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatuses]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    setStatusMessage({ text: "Veriler Sıfırlanıyor ve Güncelleniyor...", type: 'info' });
    try {
      if (supabase) {
        // 1. Veritabanındaki tüm koltuk atamalarını temizle
        const { error: updateError } = await supabase
          .from('protokol_listesi')
          .update({ koltuk_no: null })
          .neq('id', 0); // WHERE clause ekleyerek güvenlik kontrolünü geçiyoruz
        
        if (updateError) throw updateError;
      }
      
      // 2. Güncel durumları çek (Telegram polling zaten arka planda çalışıyor)
      await fetchStatuses();
      
      // 3. Yerel koltuk hafızasını temizle (Manuel kayıtlar hariç)
      setSeating(prev => {
        const preserved: Record<string, SeatData> = {};
        Object.keys(prev).forEach(sid => {
          if (prev[sid].type === 'ozel') preserved[sid] = prev[sid];
        });
        return preserved;
      });
      
      setStatusMessage({ text: "Koltuklar Sıfırlandı ve Güncel Veriler Alındı.", type: 'success' });
    } catch (err: any) {
      console.error("Yenileme Hatası:", err);
      setStatusMessage({ text: "Hata: " + (err.message || "Bağlantı sorunu"), type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  useEffect(() => {
    let isPolling = true;
    const pollTelegram = async () => {
      if (!isPolling) return;
      try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId.current + 1}&timeout=10`);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
          let hasChange = false;
          for (const update of data.result) {
            lastUpdateId.current = Math.max(lastUpdateId.current, update.update_id);
            if (update.callback_query && supabase) {
              const callback = update.callback_query;
              const parts = callback.data.split('_'); 
              if (parts[0] === 'rsvp') {
                const type = parts[1];
                const fullName = parts.slice(2).join(' '); // Underscore yerine boşluk kullanıyoruz
                if (fullName) {
                  let newDurum = type === 'n' ? 'katilmiyor' : 'katiliyor';
                  let newEsDurumu = type === 'e';
                  // Veritabanında ismi tam eşleşme veya benzerlik ile bul
                  await supabase.from('protokol_listesi').update({ durum: newDurum, es_durumu: newEsDurumu }).ilike('ad_soyad', fullName);
                  hasChange = true;
                }
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ callback_query_id: callback.id, text: "Yanıt Alındı." })
                });
              }
            }
          }
          if (hasChange) fetchStatuses();
        }
      } catch (e) {
        console.error("Polling Error:", e);
      } finally {
        if (isPolling) setTimeout(pollTelegram, 3000);
      }
    };
    
    pollTelegram();
    return () => { isPolling = false; };
  }, [fetchStatuses]);

  useEffect(() => { 
    fetchStatuses(); 
  }, [selectedHall, fetchStatuses]);

  const handleSendRSVP = async () => {
    const selectedPeople = protocolList.filter(p => p.id && selectedAttendeeIds.has(p.id));
    if (selectedPeople.length === 0 || !invitationFile) {
      setStatusMessage({ text: "Lütfen kişi ve davetiye görseli seçiniz.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsSyncing(true);
    setStatusMessage({ text: "Gönderiliyor...", type: 'info' });
    let successCount = 0;
    
    for (const p of selectedPeople) {
      const chatId = formatChatId(p.tg || "");
      if (!chatId) continue;
      try {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', invitationFile);
        formData.append('caption', `SAYIN *${p.u.toUpperCase()} ${p.i.toUpperCase()}*,\n\nDAVETİYENİZ EKTE SUNULMUŞTUR.\n\nLÜTFEN KATILIM DURUMUNUZU BİLDİRİNİZ.`);
        formData.append('parse_mode', 'Markdown');
        formData.append('reply_markup', JSON.stringify({
          inline_keyboard: [
            [{ text: "✅ KATILIYORUM", callback_data: `rsvp_y_${p.i}` }, { text: "❌ KATILMIYORUM", callback_data: `rsvp_n_${p.i}` }],
            [{ text: "👫 EŞLİ", callback_data: `rsvp_e_${p.i}` }, { text: "👤 TEK", callback_data: `rsvp_s_${p.i}` }]
          ]
        }));
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
        if (res.ok) successCount++;
      } catch (e) {}
    }
    setIsSyncing(false);
    setStatusMessage({ text: `${successCount} Davetiye Gönderildi.`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSendSeatNumbers = async () => {
    const selectedPeople = protocolList.filter(p => p.id && selectedAttendeeIds.has(p.id) && p.koltuk_no);
    if (selectedPeople.length === 0) {
      setStatusMessage({ text: "Koltuk numarası atanmış seçili kişi bulunamadı.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsSyncing(true);
    setStatusMessage({ text: "Koltuk Bilgileri Gönderiliyor...", type: 'info' });
    let successCount = 0;
    
    for (const p of selectedPeople) {
      const chatId = formatChatId(p.tg || "");
      if (!chatId) continue;
      try {
        const message = `SAYIN *${p.u.toUpperCase()} ${p.i.toUpperCase()}*,\n\nETKİNLİK KOLTUK NUMARANIZ: *${p.koltuk_no}*\n\nİyi seyirler dileriz.`;
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
        });
        if (res.ok) successCount++;
      } catch (e) {}
    }
    setIsSyncing(false);
    setStatusMessage({ text: `${successCount} Kişiye Koltuk Bilgisi Gönderildi.`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handlePrintLabels = () => {
    const labels: { name: string, title: string }[] = [];

    // 1. Protokol listesinden seçilen ve koltuk atanmış kişiler
    const selectedPeople = protocolList.filter(p => p.id && selectedAttendeeIds.has(p.id) && p.koltuk_no);
    selectedPeople.forEach(p => {
      labels.push({ name: p.i, title: p.u });
      if (p.es_durumu) {
        labels.push({ name: `${p.i} (Eşi)`, title: p.u });
      }
    });

    // 2. Salona manuel eklenen özel misafirler (Özel Kayıtlar)
    (Object.values(seating) as SeatData[]).forEach(seat => {
      if (seat.type === 'ozel' && seat.data) {
        labels.push({ name: seat.data.i, title: seat.data.u });
      }
    });

    if (labels.length === 0) {
      setStatusMessage({ text: "Yazdırılacak kişi (seçili protokol veya manuel kayıt) bulunamadı.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setStatusMessage({ text: "Pop-up engelleyici yazdırılacak sayfayı engelledi. Lütfen tarayıcı ayarlarından izin verin.", type: 'error' });
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }

    const html = `
      <html>
        <head>
          <title>Etiket Yazdır - BK-2014</title>
          <style>
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .page {
              width: 210mm;
              height: 297mm;
              padding-top: 15.15mm;
              padding-left: 5.9mm;
              display: flex;
              flex-wrap: wrap;
              align-content: flex-start;
              page-break-after: always;
              box-sizing: border-box;
            }
            .label {
              width: 99.1mm;
              height: 38.1mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              box-sizing: border-box;
              padding: 5mm;
              overflow: hidden;
            }
            .name {
              font-size: 14pt;
              font-weight: 900;
              color: #000;
              text-transform: uppercase;
              margin-bottom: 4px;
              line-height: 1.1;
            }
            .title {
              font-size: 10pt;
              font-weight: 600;
              color: #444;
              text-transform: uppercase;
              line-height: 1.1;
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${labels.map((l, index) => `
              <div class="label">
                <div class="name">${l.name}</div>
                <div class="title">${l.title}</div>
              </div>
              ${(index + 1) % 14 === 0 && index + 1 !== labels.length ? '</div><div class="page">' : ''}
            `).join('')}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleYerlestir = useCallback(async () => {
    setIsSyncing(true);
    setStatusMessage({ text: "Koltuklar Planlanıyor...", type: 'info' });
    
    // 1. Sadece SEÇİLİ ve (KATILAN veya BEKLEYEN) konukları al, protokol sırasına (sira/id) göre diz
    // ÖNEMLİ: Re-kalkülasyon için mevcut koltuk numaralarını temizliyoruz (manuel kayıtlar hariç)
    const attendees = protocolList
      .filter(p => p.id && selectedAttendeeIds.has(p.id) && p.katilim_durumu !== 'katilmiyor')
      .sort((a, b) => (a.sira || a.id || 0) - (b.sira || b.id || 0))
      .map(p => ({ ...p, koltuk_no: undefined }));

    if (attendees.length === 0) {
      setStatusMessage({ text: "Lütfen katılımı onaylanmış ve listeden seçilmiş kişileri yerleştirin.", type: 'error' });
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const newSeating: Record<string, SeatData> = {};
    const takenSeats = new Set<string>();

    // 1. Mevcut manuel (Özel Kayıt) yerleşimleri koru ve rezerve et
    Object.keys(seating).forEach(sid => {
      if (seating[sid].type === 'ozel') {
        newSeating[sid] = seating[sid];
        takenSeats.add(sid);
      }
    });

    let attendeeIdx = 0;
    const hall = HALL_CONFIGS[selectedHall];

    for (const rowConfig of hall.rows) {
      const rowSeats = rowConfig.seats;
      const seatIndices = rowSeats
        .map((s, i) => s.type === 'seat' ? i : -1)
        .filter(i => i !== -1);
      
      if (seatIndices.length === 0) continue;

      // Sıranın ortasını bul
      let centerIdxOfIndices = Math.floor(seatIndices.length / 2);
      
      // Merkezden dışa doğru spiral yerleşim
      for (let offset = 0; offset < seatIndices.length * 2; offset++) {
        if (attendeeIdx >= attendees.length) break;

        let spiral = offset === 0 ? 0 : (offset % 2 === 1 ? Math.ceil(offset / 2) : -Math.ceil(offset / 2));
        let targetIdxOfIndices = centerIdxOfIndices + spiral;
        
        if (targetIdxOfIndices < 0 || targetIdxOfIndices >= seatIndices.length) continue;
        
        const seatIdx = seatIndices[targetIdxOfIndices];
        const seat = rowSeats[seatIdx];
        const seatId = `${rowConfig.row}${seat.number}`;

        if (takenSeats.has(seatId)) continue;

        const person = attendees[attendeeIdx];

        if (person.es_durumu) {
          // EŞLİ KURALI: Yan yana iki koltuk bul
          let neighborIdx = -1;
          // Önce sağa, sonra sola bak
          if (seatIdx + 1 < rowSeats.length && rowSeats[seatIdx + 1].type === 'seat') {
            const nId = `${rowConfig.row}${rowSeats[seatIdx + 1].number}`;
            if (!takenSeats.has(nId)) neighborIdx = seatIdx + 1;
          }
          if (neighborIdx === -1 && seatIdx - 1 >= 0 && rowSeats[seatIdx - 1].type === 'seat') {
            const nId = `${rowConfig.row}${rowSeats[seatIdx - 1].number}`;
            if (!takenSeats.has(nId)) neighborIdx = seatIdx - 1;
          }

          if (neighborIdx !== -1) {
            const nSeat = rowSeats[neighborIdx];
            const nId = `${rowConfig.row}${nSeat.number}`;
            
            newSeating[seatId] = { id: seatId, data: person, type: 'dolu', number: seat.number };
            newSeating[nId] = { id: nId, data: { ...person, i: `${person.i} (Eşi)` }, type: 'dolu', number: nSeat.number };
            
            takenSeats.add(seatId);
            takenSeats.add(nId);
            
            // Veritabanı için koltuk bilgisini güncelle (A1-A2 formatı)
            person.koltuk_no = `${seatId}-${nId}`;
            attendeeIdx++;
          } else {
            // Yan yana koltuk yoksa bu spiral adımını atla, bir sonrakini dene
            continue;
          }
        } else {
          newSeating[seatId] = { id: seatId, data: person, type: 'dolu', number: seat.number };
          person.koltuk_no = seatId;
          takenSeats.add(seatId);
          attendeeIdx++;
        }
      }
    }

    try {
      if (supabase) {
        // 1. Önce TÜM koltukları temizle (Baştan yapma isteği için)
        await supabase.from('protokol_listesi').update({ koltuk_no: null }).neq('id', 0);

        // 2. Yeni koltukları toplu olarak güncelle
        const updates = attendees
          .filter(p => p.id && p.koltuk_no)
          .map(p => ({
            id: p.id,
            koltuk_no: p.koltuk_no
          }));

        if (updates.length > 0) {
          const { error } = await supabase.from('protokol_listesi').upsert(updates);
          if (error) throw error;
        }
      }
      await fetchStatuses();
      setStatusMessage({ text: "Yerleşim Kurallara Göre Tamamlandı.", type: 'success' });
    } catch (e: any) {
      console.error("Yerleştirme Hatası:", e);
      setStatusMessage({ text: "Hata: " + (e.message || "Bilinmeyen hata"), type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [protocolList, selectedHall, fetchStatuses, selectedAttendeeIds]);

  const filteredProtocolList = useMemo(() => {
    if (selectedCity !== 'Muğla') return [];
    return protocolList.filter(p => (p.u + " " + p.i).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [protocolList, selectedCity, searchTerm]);

  return (
    <div className="flex flex-col h-screen select-none bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg"><Users className="text-white w-5 h-5" /></div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Resmi Protokol Daveti</h1>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
              {selectedCity} {selectedCity === 'Muğla' ? `/ ${HALL_CONFIGS[selectedHall].name}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Sistem Versiyonu</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{APP_VERSION}</span>
              <span className="text-[9px] font-medium text-slate-400">{BUILD_DATE}</span>
            </div>
          </div>

          {lastSyncTime && (
            <span className="text-[9px] font-bold text-slate-400 mr-2 uppercase tracking-tighter">
              SON GÜNCELLEME: {lastSyncTime}
            </span>
          )}
          <button onClick={handleRefresh} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95" title="Koltukları Sıfırla"><RefreshCw className={`w-5 h-5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      {statusMessage && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
           {statusMessage.type === 'info' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
           <span className="text-sm font-bold">{statusMessage.text}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          data={filteredProtocolList} 
          selectedIds={selectedAttendeeIds} setSelectedIds={setSelectedAttendeeIds} 
          searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
          onSendInvitations={handleSendRSVP} 
          onSendSeatNumbers={handleSendSeatNumbers}
          onPrintLabels={handlePrintLabels}
          onFileChange={setInvitationFile} 
          invitationFile={invitationFile} 
          toggleAll={(s) => setSelectedAttendeeIds(s ? new Set(protocolList.map(p => p.id).filter((id): id is number => id !== undefined)) : new Set())}
          onRefresh={fetchStatuses}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          selectedHall={selectedHall}
          setSelectedHall={setSelectedHall}
          onYerlestir={handleYerlestir}
          isSyncing={isSyncing}
        />
        <main className="flex-1 overflow-hidden relative flex flex-col items-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
          <div className="absolute top-6 right-8 z-20 flex flex-col gap-2">
            <div className="bg-white p-1 rounded-2xl shadow-xl border border-slate-200 flex flex-col">
              <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="p-3 hover:bg-blue-50 rounded-xl transition-all text-slate-400 hover:text-blue-600"><ZoomIn className="w-5 h-5" /></button>
              <button onClick={() => setZoom(0.8)} className="p-2 text-[10px] font-black text-slate-300 hover:text-blue-600 uppercase text-center">RST</button>
              <button onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))} className="p-3 hover:bg-blue-50 rounded-xl transition-all text-slate-400 hover:text-blue-600"><ZoomOut className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="flex-1 w-full overflow-auto flex justify-center items-start pt-16 scrollbar-hide">
             {selectedCity === 'Muğla' ? (
               <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="transition-transform duration-300 ease-out p-12">
                  <div className="w-full h-16 bg-slate-900 rounded-b-[60px] mb-24 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-x-4 border-b-4 border-slate-700">
                    <span className="text-white text-xs font-black tracking-[2em] opacity-80 uppercase ml-[2em]">SAHNE PLANI</span>
                  </div>
                  <SeatingPlan hall={HALL_CONFIGS[selectedHall]} seating={seating} onSeatClick={(id) => { setActiveSeatId(id); setGuestModalOpen(true); }} />
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-8 p-12 animate-in fade-in zoom-in duration-700">
                 <div className="w-[500px] h-[300px] bg-white rounded-[40px] border-2 border-slate-200 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03]"></div>
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                      <Layout className="w-12 h-12 text-slate-200" />
                    </div>
                    <div className="text-center px-8">
                       <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600 mb-2">TEMSİLİ SALON GÖRÜNÜMÜ</p>
                       <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full opacity-20"></div>
                    </div>
                    <div className="absolute top-4 left-4 flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-100"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-100"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-100"></div>
                    </div>
                 </div>
                 <div className="text-center space-y-3">
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedCity} Protokol Sistemi</h3>
                   <div className="flex items-center justify-center gap-2 text-amber-500 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100 mx-auto w-fit">
                     <AlertCircle className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Veri Bekleniyor</span>
                   </div>
                   <p className="text-sm font-bold text-slate-400 max-w-md mx-auto leading-relaxed">
                     Bu il için salon verileri ve protokol listesi henüz sisteme tanımlanmamıştır. 
                     Veri girişleri tamamlandığında oturma düzeni ve kişi listesi otomatik olarak aktifleşecektir.
                   </p>
                 </div>
               </div>
             )}
          </div>
        </main>
      </div>
      <GuestModal 
        isOpen={guestModalOpen} 
        onClose={() => setGuestModalOpen(false)} 
        onSave={(name, title) => {
          setSeating(prev => ({ ...prev, [activeSeatId!]: { id: activeSeatId!, data: { u: title, i: name }, type: 'ozel', number: activeSeatId!.replace(/[A-Z]/g, '') }}));
          setGuestModalOpen(false);
        }} 
        onDelete={() => {
          setSeating(prev => {
            const next = { ...prev };
            delete next[activeSeatId!];
            return next;
          });
          setGuestModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
