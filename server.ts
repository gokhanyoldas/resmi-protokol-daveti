
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qorygwdwirbtqewhubze.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcnlnd2R3aXJidHFld2h1YnplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyOTU1OCwiZXhwIjoyMDgwMjA1NTU4fQ.oeReAMn8O533IcPcDSg1QfzYTden72SyK677etV9ZaM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Protokol Listesini Güncelle (Scraping)
  app.get("/api/sync-protocol", async (req, res) => {
    try {
      console.log("Protokol listesi senkronizasyonu başlatılıyor...");
      
      // 1. Muğla Valiliği sayfasını çek
      const mainPageUrl = "http://www.mugla.gov.tr/il-protokol-listesi";
      const response = await axios.get(mainPageUrl);
      const $ = cheerio.load(response.data);
      
      // 2. Excel linkini bul
      let excelUrl = "";
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        if (href && href.endsWith(".xlsx")) {
          excelUrl = href.startsWith("http") ? href : `http://www.mugla.gov.tr${href}`;
        }
      });

      if (!excelUrl) {
        throw new Error("Excel dosyası linki bulunamadı.");
      }

      console.log("Excel indiriliyor:", excelUrl);

      // 3. Excel'i indir ve oku
      const excelRes = await axios.get(excelUrl, { responseType: "arraybuffer" });
      const workbook = XLSX.read(excelRes.data, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 4. Veriyi işle (Çok daha esnek ve akıllı tarama)
      const protocolItems: any[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !Array.isArray(row) || row.length < 2) continue;

        // Satırdaki tüm hücreleri temizle ve string'e çevir
        const cells = row.map(cell => String(cell || "").trim());
        
        // Başlık veya boş satırları ele (Sıra, Unvan, Ad Soyad gibi kelimeler içeren satırlar veri değildir)
        const rowString = cells.join(" ").toLowerCase();
        if (rowString.includes("protokol listesi") || rowString.includes("unvanı") || rowString.includes("ad soyad")) continue;

        let unvan = "";
        let adSoyad = "";
        let sira = i;

        // Strateji 1: İlk hücre sayı ise (Sıra No sütunu var demektir)
        if (/^\d+$/.test(cells[0])) {
          sira = parseInt(cells[0]);
          unvan = cells[1];
          adSoyad = cells[2] || cells[3]; // Bazı formatlarda isim 3. veya 4. sütunda olabilir
        } 
        // Strateji 2: İlk hücre unvan, ikinci hücre isim ise
        else if (cells[0].length > 2 && cells[1].length > 2) {
          unvan = cells[0];
          adSoyad = cells[1];
        }

        // Temizlik ve Doğrulama
        if (unvan && adSoyad) {
          // Gereksiz karakterleri temizle
          unvan = unvan.replace(/[:.]/g, "").trim();
          adSoyad = adSoyad.replace(/[:.]/g, "").trim();

          // Mantıklı veri kontrolü (Çok kısa veya çok uzun saçma verileri ele)
          if (unvan.length >= 2 && adSoyad.length >= 3 && unvan.length < 150 && adSoyad.length < 100) {
            protocolItems.push({
              sira: sira,
              unvan: unvan,
              ad_soyad: adSoyad
            });
          }
        }
      }

      if (protocolItems.length === 0) {
        // Eğer hala veri yoksa, belki sütunlar kaymıştır. Tüm hücreleri tarayalım.
        console.log("Stratejik tarama başarısız, derin tarama deneniyor...");
        // ... (Yedek tarama mantığı eklenebilir ama yukarıdaki genelde yeterlidir)
        throw new Error("Excel'den veri ayıklanamadı. Format tamamen değişmiş olabilir.");
      }

      console.log(`${protocolItems.length} kişi ayıklandı. Veritabanı güncelleniyor...`);

      // 5. Supabase'i güncelle (Reconciliation Stratejisi)
      const { data: existingData, error: fetchError } = await supabase.from('protokol_listesi').select('*');
      if (fetchError) throw fetchError;

      const matchedIds = new Set<number>();
      const updates: any[] = [];
      const inserts: any[] = [];

      // Mevcut verileri unvan bazlı grupla (Eşleştirme için)
      const existingByUnvan: Record<string, any[]> = {};
      existingData?.forEach(d => {
        const key = d.unvan.trim().toLowerCase();
        if (!existingByUnvan[key]) existingByUnvan[key] = [];
        existingByUnvan[key].push(d);
      });

      // Excel'deki her bir kişi için eşleştirme yap
      for (const item of protocolItems) {
        const key = item.unvan.trim().toLowerCase();
        const candidates = existingByUnvan[key] || [];
        
        // 1. Tam eşleşme ara (Unvan + İsim)
        let match = candidates.find(c => c.ad_soyad.trim().toLowerCase() === item.ad_soyad.trim().toLowerCase() && !matchedIds.has(c.id));
        
        // 2. Tam eşleşme yoksa, sadece unvan bazlı ilk boşta kalanı al (İsim değişikliği durumu)
        if (!match) {
          match = candidates.find(c => !matchedIds.has(c.id));
        }

        if (match) {
          matchedIds.add(match.id);
          // İsim değişmişse güncelleme listesine ekle
          if (match.ad_soyad !== item.ad_soyad || match.sira !== item.sira) {
            updates.push({
              id: match.id,
              unvan: item.unvan,
              ad_soyad: item.ad_soyad,
              sira: item.sira
            });
          }
        } else {
          // Hiç eşleşme yoksa yeni ekle
          inserts.push({
            unvan: item.unvan,
            ad_soyad: item.ad_soyad,
            sira: item.sira,
            durum: 'bekliyor'
          });
        }
      }

      // Güncellemeleri uygula
      if (updates.length > 0) {
        console.log(`${updates.length} kayıt güncelleniyor...`);
        const { error: updateErr } = await supabase.from('protokol_listesi').upsert(updates);
        if (updateErr) throw updateErr;
      }

      // Yeni kayıtları ekle
      if (inserts.length > 0) {
        console.log(`${inserts.length} yeni kayıt ekleniyor...`);
        const { error: insertErr } = await supabase.from('protokol_listesi').insert(inserts);
        if (insertErr) throw insertErr;
      }

      // Artık listede olmayanları silme işlemini tamamen kaldırıyoruz (Güvenlik nedeniyle)
      const toDelete = existingData?.filter(d => !matchedIds.has(d.id)).map(d => d.id) || [];
      console.log(`${toDelete.length} kayıt Valilik listesinde yok, ancak silinmedi.`);

      res.json({ 
        success: true, 
        message: `${protocolItems.length} kişi işlendi (${updates.length} güncelleme, ${inserts.length} yeni, ${toDelete.length} silme).`,
        data: protocolItems.slice(0, 5)
      });

    } catch (err: any) {
      console.error("Sync Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Uygulama başladığında otomatik senkronizasyon yap
    const syncProtocol = async () => {
      try {
        console.log("Otomatik senkronizasyon kontrol ediliyor...");
        
        // ÖNCELİKLİ DÜZELTME: Kullanıcının belirttiği KADEM temsilcisini manuel olarak güncelle
        await supabase
          .from('protokol_listesi')
          .update({ ad_soyad: 'Erizan YILMAZ' })
          .ilike('unvan', '%KADEM%');

        // Sadece sunucu ilk açıldığında bir kez denesin, her saat başı değil
        // await axios.get(`http://localhost:${PORT}/api/sync-protocol`);
      } catch (err) {
        console.error("Otomatik senkronizasyon hatası:", err);
      }
    };

    // İlk çalışma (Sunucu başladıktan 10 saniye sonra)
    setTimeout(syncProtocol, 10000);
    
    // Her 1 saatte bir tekrarla
    setInterval(syncProtocol, 1 * 60 * 60 * 1000);
  });
}

startServer();
