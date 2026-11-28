import { LanguagePicker } from '@bookingsystemadvancedorg/site-kit';

/**
 * Språkväljaren i toppbandet längst till höger (på telefon bredvid
 * menyknappen). Kitets väljare (flagga och kod, svenska, engelska, spanska,
 * arabiska, persiska) i Anars svarta glas. Översättningen görs av site-kit
 * (Amazon Translate).
 */
export default function LanguageSwitcher({ ref = undefined } = {}) {
  return (
    <div className="language-switcher" dir="ltr" ref={ref}>
      <LanguagePicker className="language-switcher-picker" />
    </div>
  );
}
