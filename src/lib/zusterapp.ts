import { Platform } from 'react-native';

/**
 * Woofer, de zusterapp voor het vinden van een fokpartner. Alleen een link naar de winkel; Woober deelt geen code, sleutels of gegevens met Woofer.
 * Vervang de App Store-zoeklink door de directe link zodra Woofer in de App Store staat.
 */
export const WOOFER_URL = Platform.select({
  ios: 'https://apps.apple.com/nl/search?term=Woofer',
  default: 'https://play.google.com/store/apps/details?id=nl.woofer.app',
});
