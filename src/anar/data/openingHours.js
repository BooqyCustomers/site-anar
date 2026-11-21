/**
 * Lunch- och middagstiderna (fast text från Anar; Booqy har bara platsens
 * öppettider). Restaurangens och avhämtningens tider kommer från Booqy, se
 * OpeningHoursContent.jsx. dayKey översätts i UI.
 */

export const DAY_ORDER = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const MEAL_SECTIONS = [
  {
    id: 'lunch',
    rows: [
      { dayKey: 'saturday', hours: '12-15' },
      { dayKey: 'sunday', closed: true },
      { dayKey: 'monday', closed: true },
      { dayKey: 'tuesday', hours: '11-14:30' },
      { dayKey: 'wednesday', hours: '11-14:30' },
      { dayKey: 'thursday', hours: '11-14:30' },
      { dayKey: 'friday', hours: '11-14:30' },
    ],
  },
  {
    id: 'middag',
    rows: [
      { dayKey: 'saturday', hours: '17-22' },
      { dayKey: 'sunday', closed: true },
      { dayKey: 'monday', closed: true },
      { dayKey: 'tuesday', hours: '17-21' },
      { dayKey: 'wednesday', hours: '17-21' },
      { dayKey: 'thursday', hours: '17-21' },
      { dayKey: 'friday', hours: '17-22' },
    ],
  },
];
