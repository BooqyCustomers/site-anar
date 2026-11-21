import MenyCategoryPage from '../components/MenyCategoryPage';

export default function DrinkMenyPage() {
  return (
    <MenyCategoryPage
      page="drink"
      domPrefix="drink"
      panelId="drink-meny-panel"
      mainId="drinkmeny-innehall"
      mainClassName="meny meny--drink"
      heroKeys={{ eyebrow: 'drink.eyebrow', title: 'drink.heroTitle', lede: 'drink.lede' }}
      filterAriaKey="drink.filterAria"
      closeSheetAriaKey="drink.closeSheetAria"
    />
  );
}
