"""README screenshots, from the live app.

  python scripts/readme-shots.py            # against production
  BASE=http://localhost:3000 python scripts/readme-shots.py

Needs Python with Playwright and Chrome. The owner PIN comes from APP_PIN in the
environment or .env.local. Writes docs/readme/src/assets/*.png; the README Kit
(Work/Playbooks/README Kit/render.py) draws docs/readme/*.webp from them.

Screens are captured at 412x844, the Galaxy S26 Ultra's viewport, so the hero can
set them under a drawn status bar at their real size. Private things are hidden
before every capture: the Care line on Today (grooming and skincare stay private)
and the partner's picks.
"""
import base64, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'https://wearwise-by-algothrim.vercel.app')
OUT = Path('docs/readme/src/assets')
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

    b.close()
print('written:', sorted(x.name for x in OUT.iterdir()))
