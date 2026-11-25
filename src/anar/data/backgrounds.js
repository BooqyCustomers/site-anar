/**
 * Bakgrundsbilderna (src/anar/images/bg). Varje bild finns i tre versioner, så att varje skärm får en som passar:
 *   NAMN-dator.webp       3840x2160 (16:9): liggande skärmar, och stora och Retina-skärmar
 *   NAMN-dator-1920.webp  1920x1080: samma bild för vanliga liggande skärmar (lättare fil)
 *   NAMN-mobil.webp       1290x2796 (9:19,5): stående skärmar (telefon, surfplatta stående)
 * Lägg en ny bild i mappen med dessa tre namn, så kan bgSet('namn') använda den.
 */
const FILES = import.meta.glob('../images/bg/*.webp', { eager: true, query: '?url', import: 'default' });

const url = (name, kind) => FILES[`../images/bg/${name}-${kind}.webp`];

/** { desktop, small, mobile } för en bild, till BackgroundLayers. */
export function bgSet(name) {
  return { desktop: url(name, 'dator'), small: url(name, 'dator-1920'), mobile: url(name, 'mobil') };
}
