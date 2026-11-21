import { forwardRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const OpeningHoursDropdown = forwardRef(function OpeningHoursDropdown(
  { open, onOpenChange },
  ref
) {
  const { t } = useLanguage();

  return (
    <div className="site-header-dropdown" ref={ref}>
      <button
        type="button"
        className="site-header-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        id="opening-hours-trigger-desktop"
        onClick={() => onOpenChange(!open)}
      >
        {t('hours.title')}
        <span
          className={`site-header-dropdown-chevron${open ? ' site-header-dropdown-chevron--open' : ''}`}
          aria-hidden
        />
      </button>
    </div>
  );
});

export default OpeningHoursDropdown;
