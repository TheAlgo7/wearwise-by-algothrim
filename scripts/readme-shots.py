"""README screenshots and hero banner, from the live app.

  python scripts/readme-shots.py            # against production
  BASE=http://localhost:3000 python scripts/readme-shots.py

Needs Python with Playwright and Chrome. The owner PIN comes from APP_PIN in the
environment or .env.local. Writes docs/readme/{today,wardrobe,colour,item,looks,look,hero}.png.

Screens are captured at 412x844, the Galaxy S26 Ultra's viewport, so the hero can
set them under a drawn status bar at their real size. Private things are hidden
before every capture: the Care line on Today (grooming and skincare stay private)
and the partner's picks.
"""
import base64, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'https://wearwise-by-algothrim.vercel.app')
OUT = Path('docs/readme')
OUT.mkdir(parents=True, exist_ok=True)
PIN = os.environ.get('APP_PIN') or re.search(r'^APP_PIN=(.*)$', Path('.env.local').read_text(), re.M).group(1).strip().strip('"')
UA = 'Mozilla/5.0 (Linux; Android 16; SM-S948B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'
ITEM = '9b14e190-3933-4595-a95d-97e1158088e1'  # the maroon shirt: one piece, lit by its own colour
HIDE_PRIVATE = """() => {
  document.querySelectorAll('a[href="/care"]').forEach(a => { if (!a.closest('nav')) a.style.display = 'none'; });
  document.querySelectorAll('section[aria-label*="Ishita"]').forEach(s => s.style.display = 'none');
}"""

# The app asks for SamsungOne, the Galaxy's system font. Chrome on Windows cannot match the
# installed copy by name, so serve the files ourselves and the screens look like the phone.
FONT_DIRS = [os.environ.get('SAMSUNG_FONTS', ''), os.path.expandvars('%LOCALAPPDATA%/Microsoft/Windows/Fonts'), 'C:/Windows/Fonts']
FONTS = next((Path(d) for d in FONT_DIRS if d and (Path(d) / 'SamsungOne-400.ttf').exists()), Path('.'))
FACES = {w: FONTS / f'SamsungOne-{w}.ttf' for w in (400, 700)}
HAVE_FONT = all(f.exists() for f in FACES.values())
print('SamsungOne:', HAVE_FONT and FONTS)
FONT_CSS = ''.join(f"@font-face{{font-family:SamsungOne;src:url('/__readme/SamsungOne-{w}.ttf');font-weight:{w}}}" for w in FACES)
INJECT = "document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = %r; document.head.append(s); });" % FONT_CSS

# The display face is whatever the app itself ships (Archivo through next/font), read off the page.
DISPLAY_FONT_SRC = """() => {
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = r.style.getPropertyValue('font-family');
      const range = r.style.getPropertyValue('unicode-range') || 'U+0-FF';
      if (/archivo/i.test(fam) && !/fallback/i.test(fam) && /U\\+0+(-|,|$)|U\\+0-/i.test(range.replace(/\\s/g, ''))) {
        const m = r.style.getPropertyValue('src').match(/url\\("?([^")]+)"?\\)/);
        if (m) return new URL(m[1], sheet.href || location.href).href;
      }
    }
  }
  return null;
}"""


def settle(page, ms=2500):
    page.wait_for_timeout(ms)
    page.evaluate(HIDE_PRIVATE)
    page.wait_for_timeout(300)


with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    ctx = b.new_context(viewport={'width': 412, 'height': 844}, device_scale_factor=2, user_agent=UA, is_mobile=True,
                        has_touch=True, service_workers='block', color_scheme='dark')
    if HAVE_FONT:
        ctx.route('**/__readme/*.ttf', lambda r: r.fulfill(body=FACES[int(r.request.url.split('-')[-1][:3])].read_bytes(), content_type='font/ttf'))
        ctx.add_init_script(INJECT)
    page = ctx.new_page()
    page.goto(BASE + '/unlock')
    assert page.request.post(BASE + '/api/unlock', data={'pin': PIN}).ok, 'unlock failed'

    # Today generates on open; wait for the outfit, then hide what is private.
    page.goto(BASE + '/')
    page.get_by_role('button', name='Wear this').wait_for(timeout=90000)
    # The stylist's note should be about the clothes. Its first sentence is usually colour,
    # so keep that when it is clean; after two tries, hide the note rather than show a bad one.
    BODY = re.compile(r'(torso|frame|height|build|body|shoulders?|legs|tall|lean|proportions?|gaurav)', re.I)
    note = page.locator('span.text-pretty').first
    first = lambda: re.split(r'(?<=\.)\s', note.inner_text().strip())[0]
    for _ in range(2):
        if not BODY.search(first()):
            break
        print('note skipped:', first())
        page.get_by_role('button', name=re.compile('^(Another option|Generate a fresh option)')).click()
        page.get_by_role('button', name='Wear this').wait_for(timeout=90000)
        page.wait_for_timeout(1500)
    if BODY.search(first()):
        note.evaluate("n => n.closest('button').style.visibility = 'hidden'")
    else:
        note.evaluate('(n, t) => n.textContent = t', first())
    settle(page, 1500)
    page.screenshot(path=str(OUT / 'today.png'))
    # The outfit's own light, for the hero's glow.
    story = page.evaluate("() => { const l = document.querySelector('.look-light'); return l ? getComputedStyle(l).getPropertyValue('--story').trim() : ''; }") or 'rgb(226 51 93)'
    font_src = page.evaluate(DISPLAY_FONT_SRC)
    display_font = page.request.get(font_src if font_src.startswith('http') else BASE + font_src).body() if font_src else b''
    print('story light:', story, '| display font bytes:', len(display_font))

    page.goto(BASE + '/wardrobe')
    settle(page, 3500)
    page.screenshot(path=str(OUT / 'wardrobe.png'))

    # Browse by colour: a colour with a few pieces in it, not black or white.
    chips = page.locator("div[role=group][aria-label='Browse by colour'] button")
    names = [chips.nth(i).inner_text().split('\n')[0].strip() for i in range(chips.count())]
    pick = next((n for n in ('Blue', 'Burgundy', 'Grey', 'Navy') if n in names), names[1] if len(names) > 1 else names[0])
    chips.nth(names.index(pick)).click()
    settle(page, 2500)
    page.screenshot(path=str(OUT / 'colour.png'))

    page.goto(f'{BASE}/wardrobe/{ITEM}')
    settle(page, 3500)
    page.screenshot(path=str(OUT / 'item.png'))

    page.goto(BASE + '/looks')
    settle(page, 3500)
    page.screenshot(path=str(OUT / 'looks.png'))
    page.get_by_role('button').filter(has_text='Teal and Black').first.click()
    settle(page, 1800)
    page.screenshot(path=str(OUT / 'look.png'))
    ctx.close()

    # Hero: the mark, the promise, and three real screens on Galaxy S26 Ultras.
    # Device numbers are the ones in Promo Videos (src/shared/Galaxy.tsx), scaled by --w.
    data = lambda path, mime: f'data:{mime};base64,' + base64.b64encode(Path(path).read_bytes()).decode()
    img = lambda n: data(OUT / n, 'image/png')
    icon = data('public/icon-192.png', 'image/png')
    face = lambda w: data(FACES[w], 'font/ttf') if HAVE_FONT else ''
    archivo = ('data:font/woff2;base64,' + base64.b64encode(display_font).decode()) if display_font else ''
    status = '''<div class="g-status"><div class="time">8:12</div><div class="icons">
<svg viewBox="0 0 20 16"><path d="M10 15.2 0.9 5.6a12.8 12.8 0 0 1 18.2 0z"/></svg>
<svg viewBox="0 0 18 16"><path d="M1 15h2.6v-3.6H1zM5.4 15H8V9H5.4zM9.8 15h2.6V5.6H9.8zM14.2 15h2.6V1.6h-2.6z"/></svg><span>84%</span>
<svg viewBox="0 0 12 20" style="height:calc(var(--w) * 0.035)"><rect x="1" y="2.2" width="10" height="16.8" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="4" y="0.4" width="4" height="1.8" rx=".6"/><rect x="2.6" y="5.6" width="6.8" height="11.8" rx="1"/></svg></div></div>'''
    galaxy = lambda shot, style, glow='': (
        f'<div class="galaxy" style="{style}">' + (f'<div class="g-glow" style="background:{glow}"></div>' if glow else '') +
        '<div class="g-key vol"></div><div class="g-key pwr"></div><div class="g-body"></div><div class="g-glass"></div>'
        f'<div class="g-screen">{status}<img class="g-page" src="{img(shot)}"></div><div class="g-hole"></div><div class="g-glare"></div></div>')
    hero = f'''<html><head><style>
@font-face {{ font-family: SamsungOne; src: url('{face(400)}'); font-weight: 400; }}
@font-face {{ font-family: SamsungOne; src: url('{face(700)}'); font-weight: 700; }}
@font-face {{ font-family: Display; src: url('{archivo}') format('woff2'); font-weight: 100 900; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1600px; height: 820px; background: #000; font-family: SamsungOne, system-ui, sans-serif; color: #F4EEEF; overflow: hidden; position: relative; }}
.copy {{ position: absolute; left: 104px; top: 190px; width: 580px; }}
.wm {{ display: flex; align-items: center; gap: 16px; font: 620 38px/1 Display, SamsungOne, sans-serif; font-variation-settings: 'wdth' 112; letter-spacing: -0.02em; }}
.wm img {{ width: 58px; height: 58px; }}
h1 {{ margin-top: 54px; font: 620 62px/1.04 Display, SamsungOne, sans-serif; font-variation-settings: 'wdth' 112; letter-spacing: -0.03em; }}
h1 em {{ font-style: normal; color: #E2335D; }}
p {{ margin-top: 26px; font-size: 24px; line-height: 1.45; color: #B3A9AB; max-width: 28ch; }}
.galaxy {{ position: absolute; width: var(--w); height: calc(var(--w) * 2.0947); }}
.g-glow {{ position: absolute; inset: calc(var(--w) * -0.10); border-radius: calc(var(--w) * 0.22); filter: blur(calc(var(--w) * 0.16)); opacity: .42; }}
.g-key {{ position: absolute; left: calc(var(--w) * 0.996); width: calc(var(--w) * 0.011); border-radius: calc(var(--w) * 0.006);
  background: linear-gradient(90deg, #2a2b30 0%, #5d6067 55%, #24252a 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }}
.g-key.vol {{ top: 18.9%; height: 10.2%; }}
.g-key.pwr {{ top: 36.8%; height: 8.2%; }}
.g-body {{ position: absolute; inset: 0; border-radius: calc(var(--w) * 0.088);
  background: linear-gradient(140deg, #8d9097 0%, #3b3d43 14%, #1f2024 46%, #2f3136 78%, #74777e 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.22), 0 calc(var(--w) * 0.07) calc(var(--w) * 0.15) rgba(0,0,0,.55); }}
.g-glass {{ position: absolute; inset: calc(var(--w) * 0.0085); border-radius: calc(var(--w) * 0.0795);
  background: linear-gradient(160deg, #0d0d10 0%, #030304 40%, #050506 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }}
.g-screen {{ position: absolute; left: calc(var(--w) * 0.024); top: calc(var(--w) * 0.026); width: calc(var(--w) * 0.952); height: calc(var(--w) * 2.0427);
  border-radius: calc(var(--w) * 0.064); overflow: hidden; background: #000; }}
.g-status {{ position: absolute; left: 0; top: 0; width: 100%; height: calc(var(--w) * 0.092); color: #F4F2F6; background: #000; }}
.g-status .time {{ position: absolute; left: 7.5%; top: calc(var(--w) * 0.035); font: 700 calc(var(--w) * 0.033) / 1.25 SamsungOne, sans-serif; }}
.g-status .icons {{ position: absolute; right: 7%; top: calc(var(--w) * 0.04); display: flex; align-items: center; gap: calc(var(--w) * 0.0105);
  font: 700 calc(var(--w) * 0.0284) / 1 SamsungOne, sans-serif; }}
.g-status svg {{ height: calc(var(--w) * 0.03); display: block; fill: currentColor; }}
.g-page {{ position: absolute; left: 0; top: calc(var(--w) * 0.092); width: 100%; height: auto; display: block; }}
.g-hole {{ position: absolute; left: calc(var(--w) * 0.475); top: calc(var(--w) * 0.056); width: calc(var(--w) * 0.05); height: calc(var(--w) * 0.05); border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #34405a 0, #10141d 16%, #020203 46%, #000 70%);
  box-shadow: 0 0 0 calc(var(--w) * 0.0035) rgba(0,0,0,.95), inset 0 0 calc(var(--w) * 0.004) rgba(255,255,255,.08); }}
.g-hole::after {{ content: ""; position: absolute; left: 30%; top: 26%; width: 14%; height: 14%; border-radius: 50%; background: rgba(170,190,255,.55); }}
.g-glare {{ position: absolute; inset: calc(var(--w) * 0.0085); border-radius: calc(var(--w) * 0.0795); pointer-events: none; mix-blend-mode: screen;
  background: linear-gradient(118deg, rgba(255,255,255,.11) 0%, rgba(255,255,255,.035) 22%, rgba(255,255,255,0) 38%); }}
</style></head><body>
<div class="copy"><div class="wm"><img src="{icon}">WearWise</div>
<h1>Dress like you already know <em>what you're doing.</em></h1>
<p>An AI stylist that only picks from the clothes you own.</p></div>
{galaxy('looks.png', '--w:286px;left:737px;top:150px;transform:rotate(-4deg)')}
{galaxy('wardrobe.png', '--w:286px;left:1257px;top:150px;transform:rotate(4deg)')}
{galaxy('today.png', '--w:318px;left:981px;top:72px;z-index:2', story)}
</body></html>'''
    pg = b.new_page(viewport={'width': 1600, 'height': 820})
    pg.set_content(hero)
    pg.evaluate('document.fonts.ready')
    pg.wait_for_timeout(800)
    # Every device whole, with room on all four sides.
    boxes = pg.evaluate("() => [...document.querySelectorAll('.galaxy')].map(g => { const r = g.querySelector('.g-body').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); })")
    for l, t, r, bt in boxes:
        assert l >= 16 and t >= 16 and r <= 1600 - 16 and bt <= 820 - 16, f'device cropped: {(l, t, r, bt)}'
    print('devices:', boxes)
    pg.screenshot(path=str(OUT / 'hero.png'))
    b.close()
print('written:', sorted(x.name for x in OUT.iterdir()))
