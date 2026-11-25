// Om gästen stängt "Veckans erbjudande" (WeeklyOfferPopup.jsx). Stängd stannar den stängd medan gästen rör sig på
// sajten, och kommer tillbaka efter en omladdning. Inget sparas i webbläsaren, så det finns inget nytt att redovisa
// i kitets cookie- och lagringslista.
let dismissed = false;

export const isWeeklyOfferDismissed = () => dismissed;
export const dismissWeeklyOffer = () => {
  dismissed = true;
};

/** Bara för tester: som en ny besökare. */
export const resetWeeklyOffer = () => {
  dismissed = false;
};
