/**
 * useGpcLanguage — mappt die aktive Nuxt-i18n-Locale auf den numerischen
 * GPC.EU `languageID`, den die Customer-API in Query-Params erwartet.
 *
 * Mapping (aus rag/gpceu_swagger.json → components.schemas.Language):
 *   de → 1
 *   en → 2  (Default)
 *   fr → 3
 *
 * Rückgabe ist ein `Ref<number>`, damit Konsumenten (v.a. useGpceu) den
 * Wert reactive halten und automatisch neu senden, wenn der User die
 * Locale wechselt.
 */

import { computed } from 'vue';

const GPC_LANGUAGE_MAP: Record<string, number> = {
  de: 1,
  en: 2,
  fr: 3
};

export function useGpcLanguage() {
  // Nuxt-i18n stellt `useI18n()` als Auto-Import bereit; falls das Modul
  // noch nicht geladen ist (z.B. während früher SSR-Hydration), fallen
  // wir auf `en` zurück.
  try {
    const { locale } = useI18n();
    return computed<number>(() => GPC_LANGUAGE_MAP[locale.value] ?? 2);
  } catch {
    return computed<number>(() => 2);
  }
}
