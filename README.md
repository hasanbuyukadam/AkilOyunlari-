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
2. `games/<id>/index.js` — `{ id, name, icon, description, rules, boosters: [3 adet], mount(container, level, ctx) }`.
   `mount` bir nesne döndürür: `useBooster(id) → { ok, message }` (`ok: false` ise hak harcanmaz) ve `destroy()`.
   Bulmaca çözülünce `ctx.onSolved()` çağrılır.
3. `js/core/registry.js` içindeki `GAMES` listesine ekleyin.
4. `npm run generate <id>` ve `npm run verify`.

## Oyunlar

| Oyun | Boosterlar |
|---|---|
| Sudoku | 🔍 Hücre Aç · ❗ Hata Bul · 💡 Akıllı İpucu (sıradaki mantıklı hamleyi nedeniyle gösterir) |

Sudoku zorlukları: Kolay 42→34 ipucu, Orta 33→27 ipucu (yalnızca tekli tekniklerle çözülür), Zor 29→25 ipucu (çift/işaretleme gibi ileri teknik gerektirir). Hiçbir level tahmin gerektirmez.

## Atari Salonu

`atari/` klasöründe 90'ların 20 efsane atari oyunu var (Pac-Man, Tetris, Mario, Street Fighter tarzı...). Ayrıntılar: [atari/README.md](atari/README.md). `npm run serve` ile açıp http://localhost:8080/atari/ adresine gidin.
