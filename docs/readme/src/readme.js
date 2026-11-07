// WearWise's README pictures, drawn by the README Kit (Work\Playbooks\README Kit\render.py).
// Every wide picture has a "-mobile" twin that the README swaps in on screens up to 600 px.
// The phone screens come from scripts/readme-shots.py: the live app at the Galaxy S26 Ultra's
// 412x844 viewport and 2x, with the private screens (Care, Profile) never captured.
// Headlines are set in Archivo, the face the app itself ships (SIL Open Font License).
const PINK = '#E2335D', INK = '#F4EEEF';
const LIGHTS = (at, glow = '#2a1d16') => `radial-gradient(760px 620px at ${at}, ${glow} 0%, rgba(0,0,0,0) 70%), #000`;
const P = (src, x, y, w, rot = 0, z = 20, glow = null) => ({ type: 'phone', src, x, y, w, rot, z, glow, bar: true, barBg: '#000', barColor: '#F4F2F6' });
const panel = (head, sub, items, at = '76% 54%', glow) => ({
  w: 1600, h: 760, bg: LIGHTS(at, glow), color: INK, accent: PINK,
  head: { x: 80, y: 200, size: 104, max: 560, lines: head }, sub: { x: 82, width: 500, size: 27, text: sub }, items,
});
const tall = (head, sub, items, h = 1360, glow) => ({
  w: 1080, h, bg: LIGHTS('56% 74%', glow), color: INK, accent: PINK,
  head: { x: 66, y: 86, size: 120, max: 950, lines: head }, sub: { x: 70, width: 930, size: 36, text: sub }, items,
});

window.README = {
  name: 'WearWise', icon: 'icon.png',
  fonts: { head: { family: 'Archivo', src: 'assets/fonts/archivo.woff2', weight: 620, upper: false, lh: 1.04, tracking: '-0.03em', variation: "'wdth' 112" } },
  layouts: {
    hero: {
      w: 1600, h: 820, bg: LIGHTS('70% 52%', '#2b241c'), color: INK, accent: PINK,
      brand: { x: 84, y: 120, size: 30 },
      head: { x: 80, y: 250, size: 76, max: 620, lines: ['Dress like you', 'already know', "what you're doing."] },
      sub: { x: 84, width: 480, size: 27, gap: 34, text: 'An AI stylist that only picks from the clothes you own.' },
      items: [P('looks.png', 760, 150, 250, -6), P('today.png', 1010, 80, 290, 0, 24), P('wardrobe.png', 1300, 150, 250, 6, 22)],
    },
    'hero-mobile': {
      w: 1080, h: 1380, bg: LIGHTS('56% 76%', '#2b241c'), color: INK, accent: PINK,
      brand: { x: 70, y: 70, size: 38 },
      head: { x: 66, y: 190, size: 104, max: 950, lines: ['Dress like you', 'already know', "what you're doing."] },
      sub: { x: 70, width: 930, size: 38, text: 'An AI stylist that only picks from the clothes you own.' },
      items: [P('looks.png', 64, 730, 280, -6), P('today.png', 400, 700, 290, 0, 24), P('wardrobe.png', 736, 730, 280, 6, 22)],
    },

    today: panel(['A look', 'for today'], "Today's outfit comes from your own wardrobe, chosen for today's weather and today's plans, with the reason it works.", [
      P('today.png', 900, 80, 290, -4, 24), P('look.png', 1220, 110, 280, 5, 22),
    ], '74% 50%', '#2b241c'),
    'today-mobile': tall(['A look', 'for today'], "Today's outfit, from your own wardrobe, for today's weather and plans.", [
      P('today.png', 90, 590, 330, -4, 24), P('look.png', 590, 620, 330, 5, 22),
    ], 1360, '#2b241c'),

    wardrobe: panel(['Only what', 'you own'], 'Photograph each piece once. Every suggestion comes from those shelves, never from a shop.', [
      P('wardrobe.png', 900, 80, 290, -4, 24), P('item.png', 1220, 110, 280, 5, 22),
    ], '74% 50%', '#2a1218'),
    'wardrobe-mobile': tall(['Only what', 'you own'], 'Photograph each piece once. Every suggestion comes from those shelves.', [
      P('wardrobe.png', 90, 590, 330, -4, 24), P('item.png', 590, 620, 330, 5, 22),
    ], 1360, '#2a1218'),

    looks: panel(['Saved looks,', 'by colour'], 'Keep the looks that worked, by season, and browse the wardrobe one colour at a time.', [
      P('looks.png', 900, 80, 290, -4, 24), P('colour.png', 1220, 110, 280, 5, 22),
    ], '74% 50%', '#0f2224'),
    'looks-mobile': tall(['Saved looks,', 'by colour'], 'Keep the looks that worked, and browse the wardrobe one colour at a time.', [
      P('looks.png', 90, 590, 330, -4, 24), P('colour.png', 590, 620, 330, 5, 22),
    ], 1360, '#0f2224'),
  },
};
