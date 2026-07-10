/**
 * pinia-plugin-persistedstate als Client-only-Plugin.
 *
 * Lädt erst nach Hydration — vorher gibt es kein localStorage. Der Store
 * synchronisiert sich danach automatisch (die persist-Option in stores/configuration.ts
 * greift erst, wenn dieses Plugin registriert ist).
 */

import { defineNuxtPlugin } from '#app';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

export default defineNuxtPlugin(nuxtApp => {
  const pinia = nuxtApp.$pinia as ReturnType<typeof import('pinia').createPinia>;
  pinia.use(piniaPluginPersistedstate);
});
