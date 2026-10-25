// Simetri resim kütüphanesi — elle çizilmiş, gerçekten simetrik piksel resimler.
// '.' = boş, harfler = renk (logic.js içindeki COLORS tablosu).
// Kolay: dikey eksen, 6×6 → 8×8, 1–2 renk.
// Orta: 10×10 tahtaya yerleştirilir; 'v' dikey eksen, 'h' yatay eksen. Tahtadan dar/kısa
//       resimler kenara kaydırılarak eksen tahtanın ortasından çıkarılabilir.
// Zor resimler logic.js içinde desen olarak üretilir.

const P = (title, rows, axis = 'v') => ({ title, axis, rows: rows.trim().split(/\s+/) });

export const EASY = [
  // ---- 6×6, tek renk ----
  P('Kalp', `
    .R..R.
    RRRRRR
    RRRRRR
    RRRRRR
    .RRRR.
    ..RR..`),
  P('Ok', `
    ..BB..
    .BBBB.
    BBBBBB
    ..BB..
    ..BB..
    ..BB..`),
  P('Kupa', `
    YYYYYY
    YYYYYY
    .YYYY.
    ..YY..
    ..YY..
    .YYYY.`),
  P('Kum Saati', `
    OOOOOO
    .OOOO.
    ..OO..
    ..OO..
    .OOOO.
    OOOOOO`),
  P('Yıldız', `
    ..YY..
    ..YY..
    YYYYYY
    .YYYY.
    .Y..Y.
    Y....Y`),
  P('Çam Ağacı', `
    ..GG..
    .GGGG.
    ..GG..
    .GGGG.
    GGGGGG
    ..NN..`),
  // ---- 7×7 ----
  P('Kelebek', `
    .K...K.
    ..K.K..
    PP.K.PP
    PPPKPPP
    .PPKPP.
    PPPKPPP
    PP.K.PP`),
  P('Ev', `
    ...R...
    ..RRR..
    .RRRRR.
    RRRRRRR
    .NNNNN.
    .NN.NN.
    .NN.NN.`),
  P('Lale', `
    .M.M.M.
    .MMMMM.
    .MMMMM.
    ..MMM..
    ...G...
    GG.G.GG
    .GGGGG.`),
  P('Robot', `
    ...R...
    ...A...
    .AAAAA.
    .ARARA.
    .AAAAA.
    .ARRRA.
    .A...A.`),
  P('Mantar', `
    ..RRR..
    .RRRRR.
    RR.R.RR
    RRRRRRR
    ..NNN..
    ..NNN..
    .NNNNN.`),
  P('Kedi', `
    O.....O
    OO...OO
    OOOOOOO
    OKOOOKO
    OOOOOOO
    OOOKOOO
    .OOOOO.`),
  P('Taç', `
    .......
    Y..Y..Y
    YY.Y.YY
    YYYYYYY
    YRYRYRY
    YYYYYYY
    .......`),
  // ---- 8×8 ----
  P('Uzaylı', `
    ...GG...
    ..GGGG..
    .GGGGGG.
    GG.GG.GG
    GGGGGGGG
    ..G..G..
    .G.GG.G.
    G.G..G.G`),
  P('Dondurma', `
    ..MMMM..
    .MMMMMM.
    MMMMMMMM
    MMMMMMMM
    NNNNNNNN
    .NNNNNN.
    ..NNNN..
    ...NN...`),
  P('Ağaç', `
    ..GGGG..
    .GGGGGG.
    GGGGGGGG
    GGGGGGGG
    .GGGGGG.
    ...NN...
    ...NN...
    ..NNNN..`),
  P('Baykuş', `
    N......N
    NN....NN
    NNNNNNNN
    NYYNNYYN
    NYYNNYYN
    NNNYYNNN
    .NNNNNN.
    ..Y..Y..`),
  P('Roket', `
    ...RR...
    ..RAAR..
    ..AAAA..
    ..A..A..
    ..AAAA..
    .RAAAAR.
    RRAAAARR
    R..RR..R`),
  P('Penguen', `
    ..KKKK..
    .KKKKKK.
    .K.KK.K.
    .KKYYKK.
    KK....KK
    KK....KK
    .K....K.
    ..Y..Y..`),
  P('Yengeç', `
    R.R..R.R
    RRR..RRR
    .R....R.
    .RK..KR.
    RRRRRRRR
    .RRRRRR.
    R.R..R.R
    .R....R.`),
];

export const MEDIUM = [
  P('Kaplumbağa', `
    ....GG....
    ....GG....
    G.NNNNNN.G
    GNNGNNGNNG
    .NGNNNNGN.
    .NNNGGNNN.
    .NGNNNNGN.
    GNNGNNGNNG
    G.NNNNNN.G
    ....GG....`),
  P('Fiyonk', `
    R........R
    RRR....RRR
    RRRRMMRRRR
    RRRRMMRRRR
    RRR....RRR
    R........R`, 'h'),
  P('Kale', `
    A.A.RR.A.A
    AAA.AA.AAA
    AAAAAAAAAA
    AA.AAAA.AA
    AA.AAAA.AA
    AAAAAAAAAA
    AAAANNAAAA
    AAANNNNAAA
    AAANNNNAAA
    AAANNNNAAA`),
  P('Yaprak', `
    ....GGG...
    ..GGGGGGG.
    .GGNGGNGGG
    NNNNNNNNNN
    .GGNGGNGGG
    ..GGGGGGG.
    ....GGG...`, 'h'),
  P('Uğur Böceği', `
    ..K....K..
    ...K..K...
    ...KKKK...
    .RRRKKRRR.
    RRKRKKRKRR
    RRRRKKRRRR
    RKKRKKRKKR
    RRRRKKRRRR
    .RKRKKRKR.
    ..RRKKRR..`),
  P('Şeker', `
    R...MM...R
    RR.MMMM.RR
    RRRMYMYMRR
    RRRMYMYMRR
    RR.MMMM.RR
    R...MM...R`, 'h'),
  P('Cami', `
    B...YY...B
    A..BBBB..A
    A.BBBBBB.A
    A.BBBBBB.A
    AAAAAAAAAA
    AA.AAAA.AA
    AA.AAAA.AA
    AAAA..AAAA
    AAAA..AAAA
    AAAAAAAAAA`),
  P('Balık', `
    ....OO...O
    ..OOOOO.OO
    .OOBOOOOOO
    OKOBOOOOO.
    OKOBOOOOO.
    .OOBOOOOOO
    ..OOOOO.OO
    ....OO...O`, 'h'),
  P('Kedi', `
    O......O
    OO....OO
    OOOOOOOO
    OKKOOKKO
    OOOOOOOO
    OOOMMOOO
    KOOOOOOK
    .OOOOOO.
    ..OOOO..`),
  P('Ok', `
    ......R...
    M.....RR..
    MM....RRR.
    MMNNNNRRRR
    MM....RRR.
    M.....RR..
    ......R...`, 'h'),
  P('Gökkuşağı', `
    ..RRRRRR..
    .RYYYYYYR.
    RYBBBBBBYR
    RYB....BYR
    RYB....BYR
    RYB....BYR
    CCCC..CCCC
    .CC....CC.`),
  P('Yusufçuk', `
    .CCC.CCC..
    ..CCCCCC..
    ...CCCC...
    GGGGGGGGKK
    GGGGGGGGKK
    ...CCCC...
    ..CCCCCC..
    .CCC.CCC..`, 'h'),
  P('Saksıda Çiçek', `
    ..M.M.M..
    .MMMMMMM.
    ..MMYMM..
    .MMMMMMM.
    ..M.G.M..
    GG..G..GG
    .GG.G.GG.
    ..GGGGG..
    .NNNNNNN.
    ..NNNNN..`),
  P('Kalem', `
    MMYYYYYN..
    MMYYYYYNN.
    MMYYYYYNNK
    MMYYYYYNNK
    MMYYYYYNN.
    MMYYYYYN..`, 'h'),
  P('Ayı', `
    NN......NN
    NNN....NNN
    .NNNNNNNN.
    NNNNNNNNNN
    NNKNNNNKNN
    NNNNNNNNNN
    NNNOOOONNN
    NNNOKKONNN
    .NNOOOONN.
    ..NNNNNN..`),
  P('Arı', `
    ..CC......
    .CCCC.....
    ..CCCC....
    ..YKYKYKK.
    KYYKYKYKKK
    KYYKYKYKKK
    ..YKYKYKK.
    ..CCCC....
    .CCCC.....
    ..CC......`, 'h'),
  P('Kardan Adam', `
    ...KKK...
    ...KKK...
    ..KKKKK..
    ...CCC...
    ..CKCKC..
    ..CCOCC..
    ..RRRRR..
    .CCCCCCC.
    CCCCCCCCC
    .CCCCCCC.`),
  P('Uçak', `
    .....RR...
    .....BB...
    .....BBB..
    RB....BB..
    .BBBBBBBCC
    .BBBBBBBCC
    RB....BB..
    .....BBB..
    .....BB...
    .....RR...`, 'h'),
  P('Büyük Kelebek', `
    .K......K.
    ..K....K..
    PPP.KK.PPP
    PYPPKKPPYP
    PPPPKKPPPP
    .PPPKKPPP.
    ..PPKKPP..
    .PPPKKPPP.
    PYPPKKPPYP
    PPP.KK.PPP`),
  P('Roket', `
    ..........
    RR........
    RRR.......
    .AAAAAAAR.
    OAAABBAAAR
    OAAABBAAAR
    .AAAAAAAR.
    RRR.......
    RR........
    ..........`, 'h'),
];
