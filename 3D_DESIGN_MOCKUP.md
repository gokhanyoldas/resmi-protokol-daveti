# 3D Etkinlik Planlama ve Maket Modu Tasarım Taslağı

Bu belge, mevcut "Resmi Protokol Daveti" projesine eklenecek olan 3D Maket Modu'nun görsel ve fonksiyonel tasarımını detaylandırmaktadır.

## 1. Görsel Konsept
- **Zemin:** Kullanıcı tarafından yüklenen hava fotoğrafı (drone çekimi), 3D sahnede gerçek dünya koordinatlarına oturtulmuş bir "Ground Plane" (Zemin Düzlemi) olarak işlenir.
- **Perspektif:** Kullanıcı alanı sadece üstten değil, 45 derecelik açıyla veya tamamen yatay (göz hizası) görebilir.
- **Modeller:** Sahne, sandalye, araç gibi öğeler "Low-Poly" ama şık, mimari maket tarzında 3D modeller olarak görünür.

## 2. Arayüz Değişiklikleri
- **Sağ Panel (Varlık Kütüphanesi):** Mevcut ikonlar, sürükle-bırak yapılabilen 3D nesne kütüphanesine dönüşür.
- **Nesne Kontrolleri:** Bir nesneye tıklandığında üzerinde "Gizmo" (taşıma, döndürme, ölçekleme okları) belirir.
- **Ölçülendirme:** 3D düzlemde iki nokta arası mesafe dinamik olarak (metre cinsinden) nesnelerin üzerinde asılı duran etiketlerle gösterilir.

## 3. Teknik Altyapı
- **Motor:** Three.js & React Three Fiber.
- **Işıklandırma:** Sahneye eklenen "Directional Light" ile nesnelerin zemin fotoğrafı üzerine gerçekçi gölgeler düşürmesi sağlanır (Derinlik algısı için kritik).
- **Kamera:** OrbitControls ile akıcı döndürme ve yakınlaştırma.

---
*Görselleştirme hazırlanıyor...*
