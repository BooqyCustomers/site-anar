import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import OpeningHoursContent from './OpeningHoursContent';
import { useLanguage } from '../i18n/LanguageContext';

export default function OpeningHoursModal({ open, onClose, desktopTriggerContainerRef }) {
  const { t } = useLanguage();
  const titleId = useId();
  const modalRootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (modalRootRef.current?.contains(e.target)) return;
      if (desktopTriggerContainerRef?.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, desktopTriggerContainerRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="opening-hours-modal-root" ref={modalRootRef}>
      <button
        type="button"
        className="opening-hours-modal-backdrop"
        aria-label={t('a11y.closeOpeningHours')}
        onClick={onClose}
      />
      <div
        className="opening-hours-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="opening-hours-modal-header">
          <h2 id={titleId} className="opening-hours-modal-heading">
            {t('hours.title')}
          </h2>
          <button
            type="button"
            className="opening-hours-modal-close"
            onClick={onClose}
            aria-label={t('a11y.closeOpeningHours')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <OpeningHoursContent
          className="opening-hours--header-modal"
          sectionIds={['restaurant', 'avhamtning', 'lunch', 'middag']}
          staticSections
        />
      </div>
    </div>,
    document.body
  );
}
