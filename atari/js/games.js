// Atari salonundaki oyunlar. Her oyunun kodu games/<id>/game.js içindedir.
// Telif / marka sorunlarına girmemek için oyun adları özgün; "style" alanı hangi klasiğe saygı olduğunu söyler.
export const GAMES = [
  { id: 'yemci', title: 'Yemci', style: 'Pac-Man tarzı', year: '1980', color: '#ffd400', desc: 'Labirentteki bütün yemleri topla, dört hayaletten kaç. Güç hapını yiyince avcı sen olursun!' },
  { id: 'uzay-istilasi', title: 'Uzay İstilası', style: 'Space Invaders tarzı', year: '1978', color: '#39ff6a', desc: 'Aşağı inen uzaylı sürüsünü sığınakların arkasından vur, Dünya\'ya ulaşmalarına izin verme.' },
  { id: 'dortlu-blok', title: 'Dörtlü Blok', style: 'Tetris tarzı', year: '1984', color: '#3fd0ff', desc: 'Düşen blokları çevir ve yerleştir; dolan satırlar silinir. Hız gittikçe artar.' },
  { id: 'yilan', title: 'Yılan', style: 'Snake (Nokia) tarzı', year: '1997', color: '#9bbc0f', desc: 'Yemi ye, uza; duvara ve kendi kuyruğuna çarpma.' },
  { id: 'tugla-kiran', title: 'Tuğla Kıran', style: 'Breakout / Arkanoid tarzı', year: '1986', color: '#ff5a5a', desc: 'Raketle topu sektir, bütün tuğlaları kır. Düşen kapsüller güç verir.' },
  { id: 'galaksi-savasi', title: 'Galaksi Savaşı', style: 'Galaga tarzı', year: '1981', color: '#ff3df2', desc: 'Formasyona giren ve dalışa geçen uzaylı filosunu yok et.' },
  { id: 'galaksi-akini', title: 'Galaksi Akını', style: 'Galaxian tarzı', year: '1979', color: '#ffa640', desc: 'Bayrak gemisi ve muhafızları sürüden kopup üstüne dalıyor. Tek atışla onları indir.' },
  { id: 'kurbaga', title: 'Kurbağa', style: 'Frogger tarzı', year: '1981', color: '#4cff4c', desc: 'Kurbağayı trafiğin içinden ve nehirdeki kütüklerin üstünden yuvasına ulaştır.' },
  { id: 'bombaci', title: 'Bombacı', style: 'Bomberman tarzı', year: '1985', color: '#ff7b2e', desc: 'Bomba koy, duvarları yık, düşmanları patlat, kapıyı bul.' },
  { id: 'tank-90', title: 'Tank 90', style: 'Tank 1990 / Battle City tarzı', year: '1990', color: '#c8c8c8', desc: 'Karargâhı (kartalı) koru, düşman tanklarını yok et. Tuğlalar yıkılır, çelik yıkılmaz.' },
  { id: 'super-biyik', title: 'Süper Bıyık', style: 'Super Mario tarzı', year: '1985', color: '#e8382f', desc: 'Yandan kayan dünyada koş, zıpla, düşmanlara üstten bas, altınları topla, bayrağa ulaş.' },
  { id: 'sokak-dovuscusu', title: 'Sokak Dövüşçüsü', style: 'Street Fighter tarzı', year: '1991', color: '#ffb000', desc: 'Bilgisayara karşı birebir dövüş. Yumruk, tekme, blok ve özel ateş topu hareketi.' },
  { id: 'olumcul-dovus', title: 'Ölümcül Dövüş', style: 'Mortal Kombat tarzı', year: '1992', color: '#e8343a', desc: 'Karanlık arenada üç raunt üzerinden dövüş. Özel hareketler ve "BİTİR ONU!" anı.' },
  { id: 'yol-savascisi', title: 'Yol Savaşçısı', style: 'Road Fighter tarzı', year: '1984', color: '#00c0ff', desc: 'Trafikte çarpmadan hızlan, yakıtını topla, bitiş çizgisine yetiş.' },
  { id: 'alan-kapan', title: 'Alan Kapan', style: 'Volfied / Qix tarzı', year: '1989', color: '#a070ff', desc: 'Kenardan çizgi çekerek alanı kapat; canavar çizgine değmeden alanın %80\'ini al.' },
  { id: 'kule-kartlari', title: 'Kule Kartları', style: 'Ant Cards / Arcomage tarzı', year: '1997', color: '#d4a03a', desc: 'Elindeki kartlarla kuleni yükselt, duvar ör, rakibine saldır. Kulesini ilk 50\'ye çıkaran kazanır.' },
  { id: 'komando', title: 'Komando', style: 'Contra tarzı', year: '1987', color: '#4a8a3a', desc: 'Koş, zıpla, sekiz yöne ateş et. Silah kapsüllerini topla, üssün sonundaki boss\'u yık.' },
  { id: 'hava-savasi-42', title: 'Hava Savaşı 42', style: '1942 tarzı', year: '1984', color: '#7fb3ff', desc: 'Dikey kayan gökyüzünde düşman filolarıyla savaş. Takla atarak mermilerden kaç.' },
  { id: 'balon-ejder', title: 'Balon Ejder', style: 'Bubble Bobble tarzı', year: '1986', color: '#46e0b0', desc: 'Düşmanları balona hapset, balonu patlat, meyveleri topla.' },
  { id: 'altin-avcisi', title: 'Altın Avcısı', style: 'Lode Runner tarzı', year: '1983', color: '#ffd76a', desc: 'Bütün altınları topla. Zemini kazarak muhafızları tuzağa düşür, sonra çıkış merdivenine koş.' },
];

export const byId = (id) => GAMES.find((g) => g.id === id);
