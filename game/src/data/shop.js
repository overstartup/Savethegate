import { tr } from '../i18n.js';
// Coin packages for sale. Product IDs must match what you configure in
// Google Play Console / App Store Connect (see app-native/IAP_SETUP.md).
// 10 coins = 1 cent (see CONFIG.economy): $3.99 → 4,000 coins, and bigger
// packs add a bonus (+13%, +25%). `price` is the fallback label — the
// store's own localized price is shown when it's available (systems/iap.js).
// Keep the coin amounts in sync with the backend (Store:CoinPacks).
export const COIN_PACKS = [
  { id: 'coins_small',  coins: 4000,  price: '$3.99',  get label() { return tr('d.pack.pouch'); }, color: '#7fd8ff' },
  { id: 'coins_medium', coins: 9000,  price: '$7.99',  get label() { return tr('d.pack.chest'); }, color: '#58e07f', get tag() { return tr('d.pack.popular'); } },
  { id: 'coins_large',  coins: 20000, price: '$15.99', get label() { return tr('d.pack.vault'); }, color: '#ffd23d', get tag() { return tr('d.pack.best_value'); }, bestValue: true },
];
