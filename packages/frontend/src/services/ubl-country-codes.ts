const COUNTRY_MAP: Record<string, string> = {
  'netherlands': 'NL',
  'nederland': 'NL',
  'belgium': 'BE',
  'belgië': 'BE',
  'belgie': 'BE',
  'germany': 'DE',
  'deutschland': 'DE',
  'duitsland': 'DE',
  'france': 'FR',
  'frankrijk': 'FR',
  'united kingdom': 'GB',
  'verenigd koninkrijk': 'GB',
  'united states': 'US',
  'amerika': 'US',
  'verenigde staten': 'US',
  'spain': 'ES',
  'españa': 'ES',
  'spanje': 'ES',
  'italy': 'IT',
  'italia': 'IT',
  'italië': 'IT',
  'italie': 'IT',
  'austria': 'AT',
  'österreich': 'AT',
  'oostenrijk': 'AT',
  'switzerland': 'CH',
  'schweiz': 'CH',
  'zwitserland': 'CH',
  'luxembourg': 'LU',
  'luxemburg': 'LU',
  'ireland': 'IE',
  'ierland': 'IE',
  'denmark': 'DK',
  'danmark': 'DK',
  'denemarken': 'DK',
  'sweden': 'SE',
  'sverige': 'SE',
  'zweden': 'SE',
  'norway': 'NO',
  'norge': 'NO',
  'noorwegen': 'NO',
  'poland': 'PL',
  'polska': 'PL',
  'polen': 'PL',
  'portugal': 'PT',
};

const TWO_LETTER_CODE = /^[A-Za-z]{2}$/;

export function toIso3166Alpha2(country: string | undefined): string | undefined {
  if (!country) return undefined;

  if (TWO_LETTER_CODE.test(country)) {
    return country.toUpperCase();
  }

  return COUNTRY_MAP[country.toLowerCase()];
}
