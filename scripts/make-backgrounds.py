"""
Gör sajtens bakgrundsbilder (src/anar/images/bg) av originalen i design-originals/ALLA_32_BILDER_SEPARATA.

Originalen finns som NAMN_dator_3840x2160.webp och NAMN_mobil_1290x2796.webp. De flesta är en liten bild (stående
eller liggande) som lagts mitt på den stora ytan, med en suddig förlängning åt sidorna (eller upp och ned) och en hård
kant där den skarpa delen slutar, och den suddiga delen har en annan ton än bildens kant. Här tas den skarpa delen ut
och sidorna byggs om: bildens kant speglas utåt och suddas kraftigt, så att färgerna fortsätter exakt där den skarpa
bilden slutar, och den skarpa bildens kant tonas ut mjukt mot dem. Ingen ny detalj läggs till. Bilder som fyller hela
ytan (parking på datorn) lämnas som de är. Startsidan (kebab.gif), Kontakt och Vår historia använder inte de här
bilderna utan sina ursprungliga.

Var kanten ligger räknas ut ur originalbildens mått (SIZES): på datorn är den skarpa delen 2160 px hög och
2160*B/H bred, på mobilen 1290 px bred och 1290*H/B hög, mitt på ytan. (En sökning efter skarpa områden provades
först, men den tar fel på mörka bilder.)

Resultat per bild i bg/: NAMN-dator.webp (3840x2160), NAMN-dator-1920.webp (1920x1080), NAMN-mobil.webp (1290x2796).

Kör:  python scripts/make-backgrounds.py        (kräver Pillow, numpy)
Nya bilder: lägg dator- och mobilversionen i design-originals/ALLA_32_BILDER_SEPARATA, lägg in namnet och
originalets mått (bredd, höjd) nedan och kör skriptet. Är en bild redan en hel liggande bild, sätt SIZES[namn] = None.
"""
import glob
import os

import numpy as np
from PIL import Image, ImageFilter

SRC = 'design-originals/ALLA_32_BILDER_SEPARATA'
OUT = 'src/anar/images/bg'
# Originalbildens mått (bredd, höjd) före den lades på den stora ytan.
SIZES = {
    'anar': (736, 1052),
    'shiraz-anar': (720, 1280),
    'shiraz3': (736, 1308),
    'fesenjoon': (768, 1068),
    'koobideh': (1080, 1350),
    'zereshkpolo': (500, 500),
    'saffran': (550, 824),
    'kollgrill': (1122, 1402),
    'parking': (5767, 3210),
}
FEATHER = 0.04  # den skarpa bildens tonas ut in från kanten, som andel av ytans längd i den riktning den ligger
BLUR = 48       # hur kraftigt den speglade förlängningen suddas (px på 3840-ytan)
MARGIN = 3      # de yttersta pixlarna av den skarpa delen kan ha en kantlinje: de tas inte med


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def extend(im, spans):
    """Bygg om den suddiga förlängningen. spans: (axel, start, slut) för den skarpa delen; axel 1 = kolumner, 0 = rader."""
    rgb = im.convert('RGB')
    if not spans:
        return rgb
    arr = np.asarray(rgb).astype(np.float32)
    for axis, a, b in spans:
        length = arr.shape[axis]
        a2, b2 = a + MARGIN, b - MARGIN
        core = arr[:, a2:b2] if axis == 1 else arr[a2:b2]
        pad = [(0, 0), (0, 0), (0, 0)]
        pad[axis] = (a2, length - b2)
        # bildens kant speglas utåt (flera gånger om förlängningen är längre än bilden) och suddas kraftigt
        bg = np.pad(core, pad, mode='symmetric')
        bg = np.asarray(Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(BLUR))).astype(np.float32)
        f = max(24, int(FEATHER * length))
        pos = np.arange(length, dtype=np.float32)
        ramp = smoothstep((pos - a2) / f) * smoothstep((b2 - pos) / f)  # 0 vid kanten, 1 en bit in
        a_ = ramp[None, :, None] if axis == 1 else ramp[:, None, None]
        arr = arr * a_ + bg * (1 - a_)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def desktop_spans(size):
    """Den skarpa delen på datorbilden (3840x2160) mitt på ytan, om den inte fyller hela bredden."""
    if size is None:
        return []
    bw, bh = size
    strip = round(2160 * bw / bh)
    if strip >= 3840 - 40:
        return []
    a = (3840 - strip) // 2
    return [(1, a, a + strip)]


def mobile_spans(size):
    """Den skarpa delen på mobilbilden (1290x2796) mitt på ytan."""
    if size is None:
        return []
    bw, bh = size
    strip = round(1290 * bh / bw)
    if strip >= 2796 - 40:
        return []
    a = (2796 - strip) // 2
    return [(0, a, a + strip)]


os.makedirs(OUT, exist_ok=True)
for n, size in SIZES.items():
    d = glob.glob(f'{SRC}/{n}_dator_*.webp')[0]
    m = glob.glob(f'{SRC}/{n}_mobil_*.webp')[0]
    ds, ms = desktop_spans(size), mobile_spans(size)
    desk = extend(Image.open(d), ds)
    mob = extend(Image.open(m), ms)
    desk.save(f'{OUT}/{n}-dator.webp', 'WEBP', quality=90, method=6)
    desk.resize((1920, 1080), Image.LANCZOS).save(f'{OUT}/{n}-dator-1920.webp', 'WEBP', quality=88, method=6)
    mob.save(f'{OUT}/{n}-mobil.webp', 'WEBP', quality=90, method=6)
    print(f'{n:12s} dator: {"förlängning ombyggd, skarp del " + str(ds[0][1:]) if ds else "orörd":44s} mobil: {"förlängning ombyggd, skarp del " + str(ms[0][1:]) if ms else "orörd"}')
