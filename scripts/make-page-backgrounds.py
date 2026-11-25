"""
Gör de lättare versionerna av tre av de bakgrunder som inte har dator- och mobilversion (se make-backgrounds.py för de
andra): Kontakt, Vår historia och Beställ hem. Originalen ligger i design-originals/old-backgrounds (git-ignorerad,
finns på ägarens disk).

Mätt mot originalen (samma bildyta, PSNR): 39 till 43 dB, alltså ingen synlig skillnad.

  contact.png (2,6 MB, 1085x1450)          ->  contact.webp (kvalitet 92, 0,3 MB)
  bakgrund_bild.png (2,3 MB, 1122x1402)    ->  aboutus/bakgrund_bild.webp (kvalitet 92, 0,2 MB)
  delivery_background.jpg (2,4 MB, 4385 px bred) -> delivery/delivery_background-3840.webp (kvalitet 88, 1,6 MB) och
                                              -1920.webp (0,45 MB, en vanlig skärm laddar den lilla)

Startsidans kebab.gif (7,6 MB) är kvar som den är. Den gjordes om till en H.264-video (kebab.mp4, crf 20, 2,9 MB, samma
125 bilder, 41,8 dB mot GIF:en efter en lätt oskärpa), och den spelade fint i Chrome, men den delade testsviten (e2e/)
blev ostadig med den: "language switch" föll nästan varje gång, eftersom testen spelar in sidan (trace) och en
spelande helskärmsvideo i den mjukvaruritade testwebbläsaren tar för mycket. Med GIF:en eller en stillbild går samma test
igenom. Se CLAUDE.md innan videon provas igen.

Kör:  python scripts/make-page-backgrounds.py        (kräver Pillow)
"""
import os

from PIL import Image

SRC = 'design-originals/old-backgrounds'
OUT = 'src/anar/images'


def kb(path):
    return os.path.getsize(path) // 1024


def webp(img, path, quality):
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'{path}: {kb(path)} KB')


def resized(img, width):
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)


def main():
    webp(Image.open(f'{SRC}/contact.png').convert('RGB'), f'{OUT}/contact.webp', 92)
    webp(Image.open(f'{SRC}/bakgrund_bild.png').convert('RGB'), f'{OUT}/aboutus/bakgrund_bild.webp', 92)

    delivery = Image.open(f'{SRC}/delivery_background.jpg').convert('RGB')
    webp(resized(delivery, 3840), f'{OUT}/delivery/delivery_background-3840.webp', 88)
    webp(resized(delivery, 1920), f'{OUT}/delivery/delivery_background-1920.webp', 88)


if __name__ == '__main__':
    main()
