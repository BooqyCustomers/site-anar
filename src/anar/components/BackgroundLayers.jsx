/**
 * En bakgrundsbild (stilarna ligger i landing.css). Två sätt att ge den:
 *
 * set = { desktop, small, mobile } (data/backgrounds.js): en liggande bild (16:9) för liggande skärmar och en stående
 *   (9:19,5) för stående, så att båda täcker skärmen med så lite beskärning som möjligt och utan att förstoras. En
 *   vanlig liggande skärm får den lättare 1920-versionen, en stor eller Retina-skärm den i 3840.
 *
 * src (en enda bild, med small om det finns en lättare version i 1920 bred): används för bilder som saknar dator- och
 *   mobilversion (startsidans GIF, Kontakt, Vår historia, Beställ hem). Bilden täcker hela skärmen (object-fit: cover).
 */
export default function BackgroundLayers({ set, src, small, position, priority = 'high' }) {
  const style = position ? { objectPosition: position } : undefined;

  if (set) {
    return (
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet={set.mobile} />
        <source srcSet={`${set.small} 1920w, ${set.desktop} 3840w`} sizes="100vw" />
        <img
          className="landing-bg"
          src={set.desktop}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority={priority}
          style={style}
        />
      </picture>
    );
  }

  return (
    <img
      className="landing-bg"
      src={src}
      srcSet={small ? `${small} 1920w, ${src} 3840w` : undefined}
      sizes={small ? '100vw' : undefined}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority={priority}
      style={style}
    />
  );
}
