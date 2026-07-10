/**
 * useUnits — US/SI Umschalter inklusive minimaler Umrechnungs-Helfer.
 *
 * Voller Set kommt aus Planning.md §7 (capacity, temperature, length, currency-rate,
 * energy). Hier nur die häufigsten — weitere bei Bedarf nachziehen.
 */

export type UnitSystem = 'us' | 'si';

const C_TO_F = (c: number) => c * 9 / 5 + 32;
const F_TO_C = (f: number) => (f - 32) * 5 / 9;
const KW_TO_MBH = (kw: number) => kw * 3.41214;
const MBH_TO_KW = (mbh: number) => mbh / 3.41214;
const M_TO_FT = (m: number) => m * 3.28084;
const FT_TO_M = (ft: number) => ft / 3.28084;

export function useUnits() {
  const store = useConfigStore();
  const system = computed<UnitSystem>(() => store.unitSystem);

  function set(s: UnitSystem) { store.setUnitSystem(s); }

  /** Capacity in Anzeige-Einheit formatieren */
  function formatCapacity(kw: number | null): string {
    if (kw == null) return '—';
    return system.value === 'us'
      ? `${KW_TO_MBH(kw).toFixed(1)} MBH`
      : `${kw.toFixed(2)} kW`;
  }

  function formatTemperature(c: number | null): string {
    if (c == null) return '—';
    return system.value === 'us' ? `${C_TO_F(c).toFixed(1)} °F` : `${c.toFixed(1)} °C`;
  }

  function formatLength(m: number | null): string {
    if (m == null) return '—';
    return system.value === 'us' ? `${M_TO_FT(m).toFixed(2)} ft` : `${m.toFixed(2)} m`;
  }

  return {
    system,
    set,
    formatCapacity,
    formatTemperature,
    formatLength,
    convert: { C_TO_F, F_TO_C, KW_TO_MBH, MBH_TO_KW, M_TO_FT, FT_TO_M }
  };
}
