"""README screenshots and hero banner, from the live app.

  python scripts/readme-shots.py            # against production
  BASE=http://localhost:3000 python scripts/readme-shots.py

Needs Python with Playwright and Chrome. The owner PIN comes from APP_PIN in the
environment or .env.local. Writes docs/readme/{today,wardrobe,looks,look,hero}.png.
The Care card is hidden before capture: grooming and skincare stay private.
"""
import base64, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'https://wearwise-by-algothrim.vercel.app')
OUT = Path('docs/readme')
OUT.mkdir(parents=True, exist_ok=True)
PIN = os.environ.get('APP_PIN') or re.search(r'^APP_PIN=(.*)$', Path('.env.local').read_text(), re.M).group(1).strip().strip('"')
UA = 'Mozilla/5.0 (Linux; Android 16; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36'
HIDE_CARE = "() => document.querySelectorAll('.max-w-xl a[href=\"/care\"]').forEach(a => a.style.display = 'none')"

# The app asks for SamsungOne, the S24's system font. Chrome on Windows cannot match the
# installed copy by name, so serve the files ourselves and the screens look like the phone.
FONTS = Path(os.environ.get('SAMSUNG_FONTS', 'C:/Windows/Fonts'))
FACES = {w: FONTS / f'SamsungOne-{w}.ttf' for w in (400, 700)}
HAVE_FONT = all(f.exists() for f in FACES.values())
FONT_CSS = ''.join(f"@font-face{{font-family:SamsungOne;src:url('/__readme/SamsungOne-{w}.ttf');font-weight:{w}}}" for w in FACES)
INJECT = "document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = %r; document.head.append(s); });" % FONT_CSS

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, user_agent=UA, is_mobile=True, has_touch=True)
    if HAVE_FONT:
        ctx.route('**/__readme/*.ttf', lambda r: r.fulfill(body=FACES[int(r.request.url.split('-')[-1][:3])].read_bytes(), content_type='font/ttf'))
        ctx.add_init_script(INJECT)
    page = ctx.new_page()
    page.goto(BASE + '/unlock')
    assert page.request.post(BASE + '/api/unlock', data={'pin': PIN}).ok, 'unlock failed'

    # Today generates on open; wait for the outfit plate, then drop the Care card.
    page.goto(BASE + '/')
    page.get_by_role('button', name='Wear this').wait_for(timeout=60000)
    # The stylist's note can mention his build; show an option whose note is about the clothes.
    # Its first sentence is usually colour, so keep that when it is clean; else hide the note.
    BODY = re.compile(r'torso|frame|height|build|body|shoulder|legs|tall|lean|proportion|gaurav', re.I)
    note = page.locator('span.text-pretty').first
    first = lambda: re.split(r'(?<=\.)\s', note.inner_text().strip())[0]
    for _ in range(2):
        if not BODY.search(first()):
            break
        page.get_by_role('button', name=re.compile('^Another option')).click()
        page.wait_for_timeout(1200)
    if BODY.search(first()):
        note.evaluate("n => n.closest('button').style.visibility = 'hidden'")
    else:
        note.evaluate('(n, t) => n.textContent = t', first())
    page.evaluate(HIDE_CARE)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / 'today.png'))

    page.goto(BASE + '/wardrobe')
    page.wait_for_timeout(3500)
    page.screenshot(path=str(OUT / 'wardrobe.png'))

    page.goto(BASE + '/looks')
    page.wait_for_timeout(3500)
    page.screenshot(path=str(OUT / 'looks.png'))
    page.locator('main button, .max-w-xl button').filter(has_text='Teal and Black').first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / 'look.png'))
    ctx.close()

    # Hero: the mark, the promise, and three real screens.
    img = lambda n: 'data:image/png;base64,' + base64.b64encode((OUT / n).read_bytes()).decode()
    icon = 'data:image/png;base64,' + base64.b64encode(Path('public/icon-192.png').read_bytes()).decode()
    face = lambda w: 'data:font/ttf;base64,' + base64.b64encode(FACES[w].read_bytes()).decode() if HAVE_FONT else ''
    hero = f'''<html><head><style>
@font-face {{ font-family: SamsungOne; src: url('{face(400)}'); font-weight: 400; }}
@font-face {{ font-family: SamsungOne; src: url('{face(700)}'); font-weight: 700; }}
body {{ margin: 0; width: 1600px; height: 820px; background: #090606; font-family: SamsungOne, 'SF Pro Display', system-ui, sans-serif; color: #F4EEEF; overflow: hidden; position: relative; }}
.glow {{ position: absolute; right: -160px; top: -200px; width: 1000px; height: 1000px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(226,51,93,0.20), rgba(226,51,93,0)); }}
.copy {{ position: absolute; left: 110px; top: 196px; width: 660px; }}
.wm {{ display: flex; align-items: center; gap: 18px; font-size: 42px; font-weight: 700; letter-spacing: -0.02em; }}
.wm img {{ width: 64px; height: 64px; }}
h1 {{ margin: 60px 0 0; font-size: 68px; line-height: 1.04; font-weight: 700; letter-spacing: -0.035em; }}
h1 em {{ font-style: normal; color: #E2335D; }}
p {{ margin: 28px 0 0; font-size: 25px; line-height: 1.45; color: #B9ADAF; max-width: 29ch; }}
.phone {{ position: absolute; width: 300px; border-radius: 38px; overflow: hidden; border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 40px 90px -30px rgba(0,0,0,0.9); background: #000; }}
.phone img {{ display: block; width: 100%; }}
.a {{ left: 800px; top: 120px; transform: rotate(-4deg); }}
.b {{ left: 1040px; top: 70px; z-index: 2; }}
.c {{ left: 1280px; top: 140px; transform: rotate(4deg); }}
</style></head><body><div class="glow"></div>
<div class="copy"><div class="wm"><img src="{icon}">WearWise</div>
<h1>Dress like you already know <em>what you're doing.</em></h1>
<p>An AI stylist that only picks from the clothes you own.</p></div>
<div class="phone a"><img src="{img('looks.png')}"></div>
<div class="phone b"><img src="{img('today.png')}"></div>
<div class="phone c"><img src="{img('wardrobe.png')}"></div>
</body></html>'''
    pg = b.new_page(viewport={'width': 1600, 'height': 820})
    pg.set_content(hero)
    pg.evaluate('document.fonts.ready')
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / 'hero.png'))
    b.close()
print('written:', sorted(x.name for x in OUT.iterdir()))
