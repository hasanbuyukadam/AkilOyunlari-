# Akıl Oyunları

Web sitesinde yayınlanacak, levelli akıl oyunları. Saf HTML/CSS/JavaScript — derleme adımı ve bağımlılık yok; herhangi bir statik hostingde (GitHub Pages, Netlify, kendi sunucunuz) çalışır.

## Kurallar (tüm oyunlar için)

- **3 zorluk seviyesi:** Kolay, Orta, Zor — her birinde **20 level** (oyun başına 60 level).
- Level 1 açık başlar; her level bir öncekini çözünce açılır.
- **Her oyunda 3 booster** vardır; boosterlar ipucu verir. Level başına hak sayıları oyunda tanımlanır.
- Yıldız: booster kullanmadan 3★, 1–2 booster ile 2★, daha fazlasıyla 1★.
- **Her bulmaca tek çözümlüdür.** Bu iki aşamada garanti edilir:
  1. Üretici (`tools/generate.mjs`) her bulmacayı, çözüm sayısını 2'ye kadar sayan tam arama çözücüsüyle kontrol eder; çözüm sayısı tam 1 değilse bulmacayı atar.
  2. Doğrulayıcı (`tools/verify.mjs`) kayıtlı tüm levelleri baştan kontrol eder. GitHub Actions her push'ta çalıştırır; tek bir level bile hatalıysa build kırmızı olur.

## Çalıştırma

```bash
npm run serve            # http://localhost:8080
npm run generate sudoku  # levelleri yeniden üret (deterministik tohumla)
npm run verify           # tüm oyunların levellerini doğrula
```

> Sayfa `fetch` ve ES modülleri kullandığı için dosyayı çift tıklayarak (`file://`) değil, bir web sunucusu üzerinden açın.

## Yapı

```
index.html, css/, js/app.js     Site: oyun listesi, seviye/level seçimi, oyun ekranı, booster çubuğu
js/core/                        Ortak: ayarlar, ilerleme kaydı, tohumlu RNG, oyun kaydı
games/<oyun>/logic.js           Saf mantık: üretici + çözücü + doğrulayıcı (tarayıcı ve Node ortak)
games/<oyun>/index.js           Oyun arayüzü ve 3 booster
games/<oyun>/levels.json        Üretilmiş 3×20 level
tools/                          Level üretici ve doğrulayıcı
```

## Yeni oyun eklemek

1. `games/<id>/logic.js` — şu fonksiyonları dışa aktarır:
   - `generateLevel(rng, difficulty, index, total)` → `{ puzzle, solution, ... }`
   - `verifyLevel(level)` → hata metni ya da `null` (tek çözüm kontrolü burada yapılır)
2. `games/<id>/index.js` — `{ id, name, icon, description, rules, howTo: [çocuk diliyle adımlar], boosters: [3 adet], mount(container, level, ctx) }`.
   `howTo` oyun ilk açıldığında "Nasıl Oynanır?" penceresinde gösterilir.
   `mount` bir nesne döndürür: `useBooster(id) → { ok, message }` (`ok: false` ise hak harcanmaz) ve `destroy()`.
   Bulmaca çözülünce `ctx.onSolved()` çağrılır.
3. `js/core/registry.js` içindeki `GAMES` listesine ekleyin.
4. `npm run generate <id>` ve `npm run verify`.

## Oyunlar

21 oyun, her biri 3 zorluk × 20 level = 60 level (toplam 1260 level). Soru tipi oyunlarda (örüntü, katlama, küp, alan) bir level 3–5 sorudan oluşur ve her sorunun tek doğru cevabı bağımsız bir modelle doğrulanır. Her oyunun ilk açılışında çocuklar için "Nasıl Oynanır?" anlatımı gösterilir. Tüm levellerin tek çözümlü olduğu ve tahmin yapmadan, mantıkla çözülebildiği doğrulanır.

| Kategori | Oyun | Kolay | Orta | Zor | Boosterlar |
|---|---|---|---|---|---|
| Sayısal | Sudoku | 4×4, 6×6 | 6×6, 9×9 | 9×9 (ileri teknik) | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Sayısal | Büyük-Küçük (Futoshiki) | 4×4 | 5×5 | 6×6, 7×7 | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Görsel | Kare Karalamaca (Nonogram) | 5×5 → 8×8 | 10×10 | 12×12 → 15×15 | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Konumsal | Apartmanlar (Skyscrapers) | 4×4 | 5×5 | 6×6, 7×7 | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Konumsal | Çadırlar ve Ağaçlar | 6×6 | 8×8 | 10×10 → 12×12 | ⛺ Çadır Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Konumsal | Amiral Battı | 6×6 | 8×8 | 10×10 | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Yol/Bağlantı | Köprü Kurma (Hashi) | 7×7 | 9×9 | 11×11 → 13×13 | 🌉 Köprü Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Yol/Bağlantı | Çit Çizme (Slitherlink) | 5×5 | 7×7 | 9×9, 10×10 | 🖍️ Çizgi Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Sözel | Mantık Tablosu | 3 kişi × 2 özellik | 4 × 3 | 5 × 3–4 | 🔍 Eşleşme Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Sayısal | Kakuro | 4×4–5×5 | 6×6–7×7 | 8×8–9×9 | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu (toplam kombinasyonları) |
| Sayısal | Hesap Kafesi (KenKen) | 3×3–4×4, sadece + | 4×4–5×5, + − × | 5×5–6×6, dört işlem | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Sayısal | Sihirli Kare | 3×3 (farklı sayı dizileri) | 4×4 | 4×4, 5×5 | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Görsel | Şekil Örüntüleri | tekrar eden diziler | artan/dönen özellikler | 3×3 tablolar | ✂️ Yarı Yarıya · 💡 İpucu · 🔎 Kuralı Göster |
| Görsel | Simetri | dikey eksen, resimler | yatay eksen, kayık eksen | çift/çapraz eksen, dönme | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Görsel | Kâğıt Katlama | 1 katlama | 2 katlama, çentik | çapraz katlama, ters sorular | ✂️ Yarı Yarıya · 💡 İpucu · 👣 Adım Adım |
| Yol/Bağlantı | Sayı Bağla (Numberlink) | 5×5–6×6 | 7×7–8×8 | 9×9–10×10 | 🔗 Yol Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Yol/Bağlantı | Labirent | 6×6–9×9 | 11×11–15×15 | 17×17–21×21, anahtar-kapı | 👣 Yol Göster · 🚧 Çıkmaz Sokaklar · 💡 Akıllı İpucu |
| Sözel | Şifre Çözme | emoji ve sayı kodu | Sezar, yarım anahtar | meyve denklemleri, kelime kutusu | 🔍 Harf Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Geometrik | Dikdörtgen Böl (Shikaku) | 5×5–6×6 | 7×7–9×9 | 10×10–12×12 | 🟦 Dikdörtgen Aç · ❗ Hata Bul · 💡 Akıllı İpucu |
| Geometrik | Alan Problemleri | kare sayma, en × boy | L/T/U şekiller, çevre | üçgen, paralelkenar, kesilmiş şekiller | ✂️ Yarı Yarıya · 💡 İpucu · ✏️ Böl ve Say |
| Geometrik | Küp Açılımları | hangisi küp olur, karşı yüz | sembollü küpler | yönlü semboller, iki görünüş | ✂️ Yarı Yarıya · 💡 İpucu · 📦 Katla |

"Akıllı İpucu" her oyunda sıradaki mantıklı adımı bulur, ilgili hücreleri işaretler ve nedenini Türkçe açıklar. Hiçbir işe yaramayacağı durumda (ör. hata yokken "Hata Bul") booster hakkı harcanmaz.

## Her oyunu ayrı yayınlamak

```bash
node tools/package-games.mjs            # 21 oyunun hepsi
node tools/package-games.mjs sudoku     # yalnızca bir oyun
```

`dist/oyunlar/<oyun>.zip` üretilir: kökte o oyuna özel `index.html` (`<html data-game="...">` ile tek oyun modu, diğer oyunlara geçiş yok), oyunun dosyaları, `thumbnail-1280x720.png`, `thumbnail-512x512.png` ve oyun adı, kategori, etiketler ve açıklamayı içeren `bilgi.txt`. Hepsi birden `dist/akil-oyunlari-ayri-oyunlar.zip` içinde, `OYUNLAR.txt` listesiyle birlikte. Kategori ve etiketler `tools/store-meta.json` dosyasındadır. Kapaklar için Playwright, zip için sistemde `zip` komutu gerekir.
