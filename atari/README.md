# Atari Salonu

90'ların efsane atari / salon oyunları, eski piksel grafikleriyle tarayıcıda. Saf HTML/CSS/JavaScript (ES modülleri); derleme adımı ve bağımlılık yok.

```bash
npm run serve                 # depo kökünden → http://localhost:8080/atari/
node atari/tools/smoke.mjs    # tüm oyunları gerçek tarayıcıda açıp rastgele oynar, hata arar
node atari/tools/smoke.mjs --shots ./ekran --seconds 12 yemci   # tek oyun + ekran görüntüleri
```

## Oyunlar

| # | Oyun | Saygı duruşu |
|---|------|--------------|
| 1 | Yemci | Pac-Man |
| 2 | Uzay İstilası | Space Invaders |
| 3 | Dörtlü Blok | Tetris |
| 4 | Yılan | Snake (Nokia) |
| 5 | Tuğla Kıran | Breakout / Arkanoid |
| 6 | Galaksi Savaşı | Galaga |
| 7 | Galaksi Akını | Galaxian |
| 8 | Kurbağa | Frogger |
| 9 | Bombacı | Bomberman |
| 10 | Tank 90 | Tank 1990 / Battle City |
| 11 | Süper Bıyık | Super Mario |
| 12 | Sokak Dövüşçüsü | Street Fighter |
| 13 | Ölümcül Dövüş | Mortal Kombat |
| 14 | Yol Savaşçısı | Road Fighter |
| 15 | Alan Kapan | Volfied / Qix |
| 16 | Kule Kartları | Ant Cards / Arcomage |
| 17 | Komando | Contra |
| 18 | Hava Savaşı 42 | 1942 |
| 19 | Balon Ejder | Bubble Bobble |
| 20 | Altın Avcısı | Lode Runner |

Oyun adları ve tüm grafikler özgündür (marka/telif sorunu olmasın diye); oynanış klasiklere sadıktır.

## Yapı

```
atari/
  index.html, css/atari.css   Site kabuğu
  js/main.js                  Menü (kasetler + canlı önizleme) ve yönlendirme (#/oyun/<id>)
  js/games.js                 Oyun listesi (ad, tarz, yıl, renk, açıklama)
  js/engine/
    host.js     Oyun kabuğu: 60 Hz sabit döngü, ölçekleme, başlık/duraklat/oyun sonu, rekor girişi
    gfx.js      Çizim yardımcıları + makeSprite
    font.js     5x7 piksel font (Ç Ğ İ Ö Ş Ü dahil)
    input.js    Klavye, dokunmatik gamepad, işaretçi
    sfx.js      WebAudio ile 8-bit ses efektleri
    scores.js   Oyun başına ilk 5 rekor (localStorage)
  games/<id>/game.js          Her oyun tek klasörde
  tools/smoke.mjs             Playwright duman testi
```

## Oyun yazma sözleşmesi

Her oyun `games/<id>/game.js` dosyasıdır ve şunları dışa aktarır:

```js
export const meta = {
  id: 'yilan',
  width: 160, height: 144,          // mantıksal piksel çözünürlüğü (ekrana tam sayı katıyla büyütülür)
  buttons: { a: 'ATEŞ', b: 'BOMBA' }, // kullanılan aksiyon tuşları ve etiketleri (c de olabilir)
  help: ['Kısa kural açıklamaları...'],
};

export default class Game {
  constructor(api) { /* yeni bir oyun kur */ }
  update() { /* saniyede tam 60 kez çağrılır; mantık kare sayısına göre */ }
  draw()   { /* her animasyon karesinde; tüm ekranı baştan çiz */ }
}
```

Kabuk her yeni oyun için sınıfın **yeni bir örneğini** oluşturur. Başlık ekranında oyunun ilk karesi arka planda görünür; menüdeki küçük resim için oyun `api.preview === true` iken girişsiz ve sessiz olarak ~90 kare çalıştırılıp çizilir. Önizlemede ilginç bir şey görünsün (ör. basit bir otomatik pilot), ama `update` hiçbir zaman hata fırlatmasın.

### `api`

| Alan | Açıklama |
|------|----------|
| `W`, `H` | Ekran boyutu (meta'dan) |
| `gfx` | Çizim: `cls(c)`, `rect(x,y,w,h,c)`, `rectb`, `pset`, `line`, `circ`, `circb`, `text(str,x,y,c,{align,scale,shadow})`, `textWidth(str,scale)`, `sprite(spr,x,y,{flipX,flipY,scale,alpha})`, ham `ctx` |
| `input` | `held(b)`, `pressed(b)` (bu karede basıldı), `released(b)`, `dx`/`dy` (-1/0/1), `pointer {x,y,down,pressed,released}` (oyun koordinatında). Tuşlar: `up down left right a b c start` |
| `sfx` | `play(ad)`: `select coin jump shoot laser hit explode bigexplode power pickup die blip bounce start gameover levelup punch`; `tone(frekans/nota, süre, {type,vol,slide,delay})`, `noise(süre,{vol,freq,delay})`, `seq([[nota,süre],...],{type,vol})` |
| `score` | Okunur/yazılır; `addScore(n)` |
| `hiScore` | Bu oyunun kayıtlı en yüksek skoru (HUD için) |
| `frame` | Oyun başından beri geçen güncelleme sayısı |
| `gameOver()` | Oyunu bitirir; kabuk ~1 sn sonra skor/rekor ekranını açar (bu sürede `update` çağrılmaya devam eder) |
| `rand(a,b)`, `randInt(a,b)`, `pick(arr)` | Rastgele yardımcıları |
| `preview` | Menü önizlemesi mi |

`start` ve `pause` tuşları kabuğa aittir; oyun kendi duraklatmasını yapmaz.

### Sprite

```js
import { makeSprite } from '../../js/engine/gfx.js';
const PAL = { R: '#e00', W: '#fff', K: '#000' };
const HERO = makeSprite([
  '..RRR...',
  '.RRRRRR.',
  '.KKWWK..',
], PAL);           // palette'te olmayan karakterler şeffaf
gfx.sprite(HERO, x, y, { flipX: true });
```

Sprite'ları modül seviyesinde bir kez üretin (her karede değil).

### Görsel kurallar

- Dönemine uygun sınırlı palet, büyük ve okunur piksel sanatı; yumuşatma yok, yuvarlanmış koordinatlar.
- HUD (skor, can, seviye) oyunun kendi canvas'ında, `gfx.text` ile çizilir. Font 5x7, harf aralığı 6 px.
- Can, seviye ve zorluk artışı olsun; oyun sonsuza kadar sürmesin, ama ilk dakika keyifli olsun.
