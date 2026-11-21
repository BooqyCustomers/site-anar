import MenyCategoryPage from '../components/MenyCategoryPage';

export default function MenyPage() {
  return (
    <MenyCategoryPage
      page="meny"
      domPrefix="meny"
      panelId="meny-panel"
      mainId="meny-innehall"
      mainClassName="meny"
      heroKeys={{ eyebrow: 'meny.eyebrow', title: 'meny.heroTitle', lede: 'meny.lede' }}
      filterAriaKey="meny.filterAria"
      closeSheetAriaKey="meny.closeSheetAria"
    />
  );
}
