import { useState } from 'react';
import { menuImagePosition, menuImageUrl } from '@bookingsystemadvancedorg/site-kit';

/**
 * Rättens foto från Booqy: API:t ger bara nyckeln (imageKey), och kitet bygger
 * adressen mot bild-CDN:et (menuImageBaseUrl i booqy.json). Fotots fokuspunkt
 * (imageFocus) väljer restaurangen i Booqy Admin och styr vilken del som syns
 * när fotot beskärs.
 *
 * Saknas foto eller bild-CDN, eller går bilden inte att hämta, visas ingenting
 * och rätten ser ut som utan foto. Fotot flyter till höger och texten går runt
 * det (dish-photo.css); bilden är dekorativ, rättens namn står bredvid.
 */
export default function DishPhoto({ item }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const src = menuImageUrl(item.imageKey);
  if (!src || src === failedSrc) return null;
  return (
    <img
      className="dish-photo"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      style={{ '--dish-photo-position': menuImagePosition(item.imageFocus) }}
      onError={() => setFailedSrc(src)}
    />
  );
}
