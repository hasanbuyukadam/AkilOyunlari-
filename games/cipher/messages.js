// Şifre Çözme oyununun elle yazılmış mesaj kütüphanesi (saf veri, DOM yok).
// Her havuz ayrı bir level türü için kullanılır; havuzlar birbirinden farklıdır,
// böylece hiçbir mesaj iki levelde tekrar etmez.

// Kolay 1–10: sembol (emoji) şifresi — kısa, neşeli sözler
export const EASY_SYMBOL = [
  'Merhaba',
  'Sevgi',
  'Aferin',
  'Gülümse',
  'Bol şans',
  'Çok yaşa',
  'İyi günler',
  'Başardın',
  'Harikasın',
  'Kitap oku',
  'Oyun zamanı',
  'Güneşli gün',
  'Neşeli ol',
  'Kuşlar öter',
  'Kar yağıyor',
  'Çiçek açtı',
  'Yaz geldi',
  'Deniz mavidir',
  'Arılar bal yapar',
  'Kedi miyavlar',
  'Hadi oynayalım',
  'Sen çok akıllısın',
  'Elma kırmızıdır',
  'Bugün çok güzel',
];

// Kolay 11–20: sayı şifresi (A=1, B=2 …)
export const EASY_NUMBER = [
  'Su hayattır',
  'Ay gece parlar',
  'Spor sağlıktır',
  'Ağaçları koru',
  'Ellerini yıka',
  'Güneş sıcaktır',
  'Balıklar suda yaşar',
  'Sen bir yıldızsın',
  'Her gün kitap oku',
  'Bilgi güçtür',
  'Kuşlar gökyüzünde uçar',
  'Paylaşmak güzeldir',
  'Dişlerini fırçala',
  'Meyve sağlıklıdır',
  'Okul çok eğlenceli',
  'Arkadaşlık çok değerlidir',
  'Doğayı sev ve koru',
  'Gülmek insana iyi gelir',
  'Yardımlaşmak güzeldir',
  'Her sabah kahvaltı yap',
  'Erken yat erken kalk',
  'Kitaplar bize yeni dünyalar açar',
];

// Orta 1–10: Sezar şifresi — atasözleri ve güzel sözler
export const CAESAR = [
  'Damlaya damlaya göl olur',
  'Bilmemek ayıp değil, öğrenmemek ayıptır',
  'İyilik eden iyilik bulur',
  'Ağaç yaşken eğilir',
  'Birlikten kuvvet doğar',
  'Az olsun öz olsun',
  'Emek olmadan yemek olmaz',
  'Bugünün işini yarına bırakma',
  'İşleyen demir ışıldar',
  'Dost kara günde belli olur',
  'Ne ekersen onu biçersin',
  'Yuvarlanan taş yosun tutmaz',
  'Tatlı dil yılanı deliğinden çıkarır',
  'Bir elin nesi var, iki elin sesi var',
  'Sakla samanı gelir zamanı',
  'Her işte bir hayır vardır',
  'Ayağını yorganına göre uzat',
  'Komşu komşunun külüne muhtaçtır',
  'Akıl akıldan üstündür',
  'Gülü seven dikenine katlanır',
  'Öğrenmenin yaşı yoktur',
  'Sabreden derviş muradına ermiş',
];

// Orta 11–20: eksik anahtar + örnek kelimeler — ilginç bilgiler
export const PARTIAL = [
  'Ahtapotun üç kalbi vardır',
  'Güneş bir yıldızdır',
  "Ay Dünya'nın etrafında döner",
  'Örümceklerin sekiz bacağı vardır',
  'Kutup ayısının derisi siyahtır',
  'Yunuslar bir gözü açık uyur',
  'Bal hiç bozulmaz',
  'Kelebekler ayaklarıyla tat alır',
  'Penguenler uçamaz ama çok iyi yüzer',
  'Fil en büyük kara hayvanıdır',
  'Mavi balina en büyük hayvandır',
  'Böceklerin altı bacağı vardır',
  'Gökkuşağında yedi renk vardır',
  'Bitkiler güneş ışığıyla besin yapar',
  'Ağaçlar bize oksijen verir',
  'Deniz yıldızının beyni yoktur',
  'Bukalemun rengini değiştirir',
  'Jüpiter en büyük gezegendir',
  'Mars kızıl gezegen olarak bilinir',
  'Işık sesten daha hızlıdır',
  'Yarasalar ayaklarından asılı uyur',
  'Çitalar en hızlı kara hayvanıdır',
];

// Zor 1–10: sembol denklemleri — çözülen sayılar tablodan bir kelimeyi verir.
// (farklı harf sayısı 3–6)
export const EQUATION_WORDS = [
  'Anne', 'Umut', 'Neşe', 'Lale', 'Ayva', 'Üzüm', 'Bebek',
  'Elma', 'Kedi', 'Okul', 'Çiçek', 'Bulut', 'Masal', 'Şeker', 'Hayal', 'Kelebek', 'Papatya', 'Simit', 'Tatil', 'Pasta',
  'Deniz', 'Güneş', 'Merak', 'Barış', 'Orman', 'Kalem', 'Cesur', 'Yıldız', 'Bayram', 'Arkadaş', 'Zürafa', 'Tavşan', 'Balık', 'Müzik',
  'Kardeş', 'Sevinç', 'Uçurtma', 'Karınca',
];

// Zor 11–20: eksik anahtar + kelime kutusu — sözler ve bilgiler
export const WORDBOX = [
  'Hata yapmak öğrenmenin bir parçasıdır',
  'Her gün yeni bir şey öğren',
  'Denemekten asla vazgeçme',
  'Merak etmek bilimin ilk adımıdır',
  'Birlikte daha güçlüyüz',
  'Hayallerinin peşinden koş',
  'Teşekkür etmek kalbi ısıtır',
  'Doğayı ve hayvanları koru',
  'Kitap en iyi arkadaştır',
  'Bir gülümseme her kapıyı açar',
  'Venüs en sıcak gezegendir',
  'Kalbimiz her gün binlerce kez atar',
  'Koalalar günde yirmi saat uyur',
  'Baykuşlar başlarını çok çevirebilir',
  'Kurbağalar derileriyle su içer',
  'Ahtapotun kanı mavi renktedir',
  'Zürafanın dili koyu mor renklidir',
  'Arılar dans ederek haberleşir',
  'Kediler günün çoğunu uyuyarak geçirir',
  'İnsan vücudunda iki yüz altı kemik vardır',
  'Ayçiçeği güneşe doğru döner',
  'Küçük adımlar büyük işler başarır',
  'Okumak zihni güçlendirir',
];

// Örnek kelimeler ve kelime kutusu şaşırtmacaları için ek kelimeler
// (Türk alfabesinin 29 harfinin hepsini içerir).
export const VOCAB = [
  'Kedi', 'Köpek', 'Elma', 'Armut', 'Kalem', 'Okul', 'Deniz', 'Güneş', 'Bulut', 'Yağmur',
  'Çiçek', 'Ağaç', 'Kitap', 'Masa', 'Kapı', 'Balık', 'Kuş', 'Tavşan', 'Zürafa', 'Ördek',
  'Horoz', 'İnek', 'Fil', 'Peynir', 'Üzüm', 'Şeker', 'Çorap', 'Jaguar', 'Dağ', 'Doğa',
  'Fare', 'Fındık', 'Havuç', 'Vazo', 'Zebra', 'Zil', 'Pasta', 'Ceviz', 'Çay', 'Göl',
  'Gül', 'Işık', 'Şapka', 'Top', 'Limon', 'Muz', 'Süt', 'Ev', 'Oyun', 'Müzik',
  'Tren', 'Uçak', 'Gemi', 'Sabun', 'Yoğurt', 'Köfte', 'Çilek', 'Kiraz', 'Kavun', 'Karpuz',
  'Havlu', 'Jeton', 'Gözlük', 'Bahçe', 'Orman', 'Yıldız', 'Bebek', 'Bisküvi', 'Defter', 'Silgi',
  'Kutu', 'Bardak', 'Tabak', 'Kaşık', 'Çanta', 'Şemsiye', 'Ayakkabı', 'Pencere', 'Bisiklet', 'Salıncak',
];
