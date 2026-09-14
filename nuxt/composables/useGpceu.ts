/**
 * useGpceu — typisierter Client für die GPC.EU Customer API.
 *
 * Hinter den Kulissen geht jeder Call über den Nitro-Proxy auf /api/gpc-eu/*
 * (siehe nuxt/server/api/gpc-eu/[...path].ts). Auth-Injection (X-API-Key
 * oder Bearer JWT) passiert dort serverseitig — die Nuxt-App sieht nie
 * einen Token.
 *
 * Der Proxy hängt den Pfad-Prefix `api/GPCDataQuery/` automatisch vor jeden
 * Sub-Path (steuerbar über GPCEU_PATH_PREFIX). Deshalb übergeben wir hier nur
 * den kurzen Namen — `findunits` statt `api/GPCDataQuery/findunits`.
 *
 * SSR-Verhalten: Beim Server-Render wird `runtimeConfig.apiBase` genutzt
 * (interner Loopback), beim Client-Render `runtimeConfig.public.apiBase`
 * (= /api, läuft über den Nitro-Server auf gleicher Origin).
 *
 * Types: Konkrete Schemas aus `~/types/gpceu` (via openapi-typescript
 * generiert aus `rag/gpceu_swagger.json`). `unknown` bleibt nur für
 * Endpoints, deren Response-Schema die API nicht explizit definiert
 * (z. B. unitfeatures liefert ein untypisiertes Array).
 *
 * Sprache: Der Default für `languageID` wird reactive aus useGpcLanguage()
 * gezogen (i18n-Locale → 1/2/3). Aufrufer können explizit überschreiben.
 */

import type { components } from '~/types/gpceu';

// Schema-Helper — kürzt components["schemas"]["X"] auf Schema<'X'>.
type Schema<K extends keyof components['schemas']> = components['schemas'][K];

// ---------- Top-Level Schema-Aliase ----------
// Damit Konsumenten `import type { UnitInputData } from '~/composables/useGpceu'`
// schreiben können statt `components["schemas"]["UnitInputData"]`.
export type UnitInputData                                = Schema<'UnitInputData'>;
export type UnitInputDataResultWithValidationInfo        = Schema<'UnitInputDataResultWithValidationInfo'>;
export type CoilInputData                                = Schema<'CoilInputData'>;
export type FindUnitsResult                              = Schema<'FindUnitsResult'>;
export type FindUnitsResultOutputData                    = Schema<'FindUnitsResultOutputData'>;
export type FindUnitsResultOutputDataAccessory           = Schema<'FindUnitsResultOutputDataAccessory'>;
export type FindUnitsResultOutputDataFootNote            = Schema<'FindUnitsResultOutputDataFootNote'>;
export type FindCoilsResult                              = Schema<'FindCoilsResult'>;
export type PartLoadCalcInputData                        = Schema<'PartLoadCalcInputData'>;
export type PartLoadCalcResult                           = Schema<'PartLoadCalcResult'>;
export type PartLoadCalcOutputData                       = Schema<'PartLoadCalcOutputData'>;
export type UnitGroupOption                              = Schema<'UnitGroupOption'>;
export type UnitGroupOptionValue                         = Schema<'UnitGroupOptionValue'>;
export type UnitGroupOptionListResultWithValidationInfo  = Schema<'UnitGroupOptionListResultWithValidationInfo'>;
export type AvailableFluid                               = Schema<'AvailableFluid'>;
export type AvailableFluidListResultWithValidationInfo   = Schema<'AvailableFluidListResultWithValidationInfo'>;
export type AvailableFluidInputMode                      = Schema<'AvailableFluidInputMode'>;
export type AvailableFluidInputModeListResultWithValidationInfo = Schema<'AvailableFluidInputModeListResultWithValidationInfo'>;
export type ThermodynamicProperties1Ph                   = Schema<'ThermodynamicProperties1Ph'>;
export type GPCVersionInfo                               = Schema<'GPCVersionInfo'>;
export type GpcProductCategory                           = Schema<'GpcProductCategory'>;
export type GeneralTuple                                 = Schema<'GeneralTuple'>;
export type OrigGPCFileContent                           = Schema<'OrigGPCFileContent'>;
export type MFCInputAndOutputBinary                      = Schema<'MFCInputAndOutputBinary'>;
export type RecalculationData                            = Schema<'RecalculationData'>;
export type ClimateLocation                              = Schema<'ClimateLocation'>;
export type ClimateLocationAndDistance                   = Schema<'ClimateLocationAndDistance'>;
export type ClimateDataPointHour                         = Schema<'ClimateDataPointHour'>;

export interface GpceuError {
  ok: false;
  error: string;
  code?: string;
  hint?: string;
  durationMs?: number;
  eventId?: string;
  occurredAt?: string;
}

function isGpceuError(x: unknown): x is GpceuError {
  return !!x && typeof x === 'object' && (x as any).ok === false && typeof (x as any).error === 'string';
}

/**
 * Formatiert einen `$fetch`-Fehler (Nuxt FetchError) für einen Toast im
 * Referenz-Look (Message + EventId + Date). Fällt zurück auf generierten
 * EventId/aktuelles Datum, wenn die Upstream-API keine liefert — so ist die
 * UI konsistent zur myGuentner-Live-Referenz.
 *
 * Zusätzlich versucht die Funktion aus dem Fehlertext das betroffene Feld
 * zu identifizieren (z. B. "CAPACITY MUST BE …" → apiParam=thermalCapacity,
 * label=Capacity). Damit kann der Aufrufer das Feld in der UI markieren.
 */
export interface GpceuFormattedError {
  /** Kernaussage der Fehlermeldung — bereits um EventID/Date/Fluff bereinigt. */
  message: string
  /** Aktionsorientierte Handlungsempfehlung (z. B. "Please change …"). */
  hint?: string
  eventId: string
  date: string
  fieldApiParam?: string
  fieldLabel?: string
}

export function formatGpceuError(err: unknown): GpceuFormattedError {
  const e = err as { data?: unknown; message?: string; status?: number; statusCode?: number }
  const body: any = e?.data

  // Rohtext-Auswahl: Envelope-Message > Envelope-Error > String-Body > FetchError.message > Fallback
  let raw = ''
  if (body && typeof body === 'object') {
    if (typeof body.error === 'string' && body.error.trim()) raw = body.error
    else if (typeof body.message === 'string' && body.message.trim()) raw = body.message
  }
  if (!raw && typeof body === 'string' && body.trim()) raw = body.trim()
  if (!raw && typeof e?.message === 'string' && e.message) raw = e.message
  if (!raw) raw = 'Unknown error'

  // API stopft EventID/Date/Hint inline in message. Rausparsen, damit der
  // Toast eine saubere Zeilen-Struktur hat und wir Duplikate vermeiden.
  const parsed = parseInlineMetadata(raw)

  // EventId: Priorität Envelope > Inline > Header (indirekt über Envelope) > Generated
  const envelopeEventId =
    body && typeof body === 'object' ? (body.eventId || body.EventId) : undefined
  const eventId: string =
    (typeof envelopeEventId === 'string' && envelopeEventId) ||
    parsed.eventId ||
    generateEventId()

  // Date: Priorität Envelope > Inline > Today
  const envelopeDate =
    body && typeof body === 'object' ? (body.occurredAt || body.date || body.Date) : undefined
  const date = parsed.date || formatDate(typeof envelopeDate === 'string' ? envelopeDate : undefined)

  const field = detectFieldFromMessage(parsed.message)
  const hint = enrichHint(parsed.message, parsed.hint)

  return {
    message: parsed.message,
    hint,
    eventId,
    date,
    ...field
  }
}

/**
 * Nimmt einen Roh-Message-String vom GPC.EU-Backend und trennt EventID/Date/
 * Handlungshinweis aus dem Body heraus. Die API stopft die Metadaten am Ende
 * des message-Feldes ab — wir liefern getrennt.
 */
function parseInlineMetadata(raw: string): { message: string; hint?: string; eventId?: string; date?: string } {
  let msg = raw

  // EventID: (guid), Date:YYYY/M/D  — beide Varianten "EventID" und "EventId"
  const evIdRe = /\s*EventID?:\s*\(?([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})\)?/i
  const dateRe = /\s*,?\s*Date:\s*(\d{4}\/\d{1,2}\/\d{1,2})/i

  let eventId: string | undefined
  let date: string | undefined

  const evMatch = msg.match(evIdRe)
  if (evMatch) {
    eventId = evMatch[1].toUpperCase()
    msg = msg.replace(evIdRe, '')
  }
  const dateMatch = msg.match(dateRe)
  if (dateMatch) {
    date = dateMatch[1]
    msg = msg.replace(dateRe, '')
  }

  // "Please change the parameters!" ist reine Handlungsaufforderung — als
  // eigener `hint` behandeln, aus der Message ziehen.
  let hint: string | undefined
  const hintRe = /\s*Please change the parameters!?/i
  if (hintRe.test(msg)) {
    hint = 'Please change the parameters!'
    msg = msg.replace(hintRe, '')
  }

  // Whitespace normalisieren — die API schickt oft "\n\n\n" als Trenner.
  msg = msg.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()

  return { message: msg, hint, eventId, date }
}

/**
 * Regex-basierter Mapper: nimmt einen Fehler-Text (z. B. "CAPACITY MUST BE
 * BETWEEN 0.1 KW AND 10000 KW!") und leitet daraus das API-Feld + Label ab.
 * `apiParam` matched den `data-api-param` in den Wizard-Templates, damit die
 * UI das betroffene Feld selektieren kann.
 *
 * Reihenfolge = Priorität: spezifischere Patterns (enum-Konstanten wie
 * `INPUT_MODE_*`, `FLUID_ID_*`) müssen VOR generischen Keyword-Patterns
 * stehen, sonst matched "CAPACITY" fälschlich, wenn die API den Enum-Namen
 * `INPUT_MODE_CAPACITY_FIXED_*` liefert (das echte Feld ist der Calc-Mode).
 */
const FIELD_HINTS: ReadonlyArray<{ pattern: RegExp; apiParam: string; label: string }> = [
  // ── High priority: enum-Konstanten ────────────────────────────────────
  { pattern: /INPUT_?MODE_/i,                 apiParam: 'calculationMode',      label: 'Calculation mode' },
  { pattern: /PARAMETER_?MODE_/i,             apiParam: 'parameterMode',        label: 'Parameter mode' },
  { pattern: /DEW_?POINT_?MODE/i,             apiParam: 'dewPointMode',         label: 'Dew point mode' },
  { pattern: /HUMIDITY_?MODE/i,               apiParam: 'humidityMode',         label: 'Humidity mode' },
  { pattern: /PRESSURE_?MODE/i,               apiParam: 'pressureMode',         label: 'Pressure mode' },
  { pattern: /FLUID_?ID/i,                    apiParam: 'fluidID',              label: 'Refrigerant / Medium' },
  { pattern: /PRODUCT_?CATEGORY/i,            apiParam: 'productCategory',      label: 'Product category' },
  // ── Toleranz-Felder — MÜSSEN vor der generischen /capacity/-Regel stehen,
  //    da die API-Meldung ("Upper tolerance in capacity …") sonst fälschlich
  //    auf Capacity mappt. Upper == Max. surface reserve, Lower == Min.
  { pattern: /upper.*toleran/i,               apiParam: 'maxSurfaceReserve',    label: 'Max. surface reserve' },
  { pattern: /lower.*toleran/i,               apiParam: 'minSurfaceReserve',    label: 'Min. surface reserve' },
  { pattern: /surface.*reserve/i,             apiParam: 'maxSurfaceReserve',    label: 'Surface reserve' },
  // ── Physikalische Felder ──────────────────────────────────────────────
  { pattern: /capacity/i,                     apiParam: 'thermalCapacity',      label: 'Capacity' },
  { pattern: /evapor.*temp|t0\b/i,            apiParam: 'fluidTempInlet',       label: 'Evaporation temp.' },
  { pattern: /cond.*temp|tc\b/i,              apiParam: 'fluidTempOutlet',      label: 'Cond. temp.' },
  { pattern: /superheat/i,                    apiParam: 'superheatingK',        label: 'Superheating' },
  { pattern: /subcool/i,                      apiParam: 'subcoolingK',          label: 'Subcooling' },
  { pattern: /altitud/i,                      apiParam: 'altitudeM',            label: 'Altitude' },
  { pattern: /air.*press|barometric/i,        apiParam: 'airPressureMbar',      label: 'Air pressure' },
  { pattern: /rel.*humid|humidity/i,          apiParam: 'airRelHumidity',       label: 'Rel. humidity' },
  { pattern: /wet.?bulb/i,                    apiParam: 'airTemperatureWetBulb', label: 'Wet bulb temp.' },
  { pattern: /(air.*inlet|inlet.*air|air.*temperature)/i, apiParam: 'airTemperature', label: 'Air inlet temp.' },
  { pattern: /concentr/i,                     apiParam: 'concentrationVolPct',  label: 'Concentration' },
  { pattern: /frost/i,                        apiParam: 'frostThicknessMm',     label: 'Frost thickness' },
  { pattern: /(pressure.*drop|dp.*coil)/i,    apiParam: 'maxPressureDrop',      label: 'Max. pressure drop' },
  { pattern: /feed.*rate/i,                   apiParam: 'pumpFeedRate',         label: 'Feed rate' },
  { pattern: /fluid.*inlet|inlet.*temp/i,     apiParam: 'fluidTempInlet',       label: 'Inlet temp.' },
  { pattern: /fluid.*outlet|outlet.*temp/i,   apiParam: 'fluidTempOutlet',      label: 'Outlet temp.' },
  { pattern: /refrigerant/i,                  apiParam: 'fluidID',              label: 'Refrigerant' },
]

// Alte einzelne surface-reserve-Regel entfernen — wird jetzt durch die
// beiden Toleranz-Patterns oben abgedeckt.

function detectFieldFromMessage(message: string): { fieldApiParam?: string; fieldLabel?: string } {
  for (const h of FIELD_HINTS) {
    if (h.pattern.test(message)) {
      return { fieldApiParam: h.apiParam, fieldLabel: h.label }
    }
  }
  return {}
}

/**
 * Aktionsorientierte Handlungshinweise für bekannte Fehlerfamilien.
 * Wird als `hint` in den Toast eingespeist, wenn die API nichts eigenes
 * liefert. Reihenfolge = Priorität.
 */
const HINT_RULES: ReadonlyArray<{ pattern: RegExp; hint: string }> = [
  {
    pattern: /INPUT_?MODE_CAPACITY_FIXED_DIRECT_+ADJUST_?COND_?TEMP.*condensers?/i,
    hint: 'Switch to a Condenser category (Cat 3, 4 or 10) or pick a different Calculation mode.'
  },
  {
    pattern: /INPUT_?MODE_.*only allowed for/i,
    hint: 'Change the Calculation mode to one that fits the current product category.'
  },
  {
    pattern: /capacity must be between.*(\d+\.?\d*)\s*kw.*and\s*(\d+\.?\d*)/i,
    hint: 'Enter a positive capacity within the allowed range.'
  },
  {
    pattern: /surface.*reserve.*negative|negative.*surface/i,
    hint: 'Surface reserve percentages must be positive.'
  },
  {
    pattern: /upper.*toleran.*greater than zero|upper.*toleran.*positive/i,
    hint: 'Max. surface reserve must be a positive percentage (e.g. 30 %).'
  },
  {
    pattern: /lower.*toleran.*(less|smaller).*than zero|lower.*toleran.*negative/i,
    hint: 'Min. surface reserve must be a negative percentage (e.g. −10 %) or 0.'
  },
  {
    pattern: /lower.*toleran.*greater than zero|lower.*toleran.*positive/i,
    hint: 'Min. surface reserve must not exceed the Max. — enter a smaller value (or 0).'
  },
  {
    pattern: /altitude.*(negative|below|above)/i,
    hint: 'Enter an altitude between 0 m and 5000 m.'
  },
  {
    pattern: /humidity.*(above 100|>100|invalid)/i,
    hint: 'Relative humidity must be between 0 % and 100 %.'
  }
]

/**
 * Wählt den besten Handlungshinweis: unsere lokalen `HINT_RULES` (spezifisch,
 * aktionsorientiert) haben Priorität vor dem generischen API-Hint
 * ("Please change the parameters!"), weil sie dem User tatsächlich verraten,
 * WAS zu ändern ist. Fallback: der Roh-Hint aus der API.
 */
export function enrichHint(message: string, existing?: string): string | undefined {
  for (const r of HINT_RULES) {
    if (r.pattern.test(message)) return r.hint
  }
  return existing
}

function generateEventId(): string {
  // Referenz-Format: Groß-GUID mit Bindestrichen wie D1DCD35D-186C-4EB7-8A75-0E7BEB97DAB3
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().toUpperCase()
    }
  } catch { /* older env */ }
  // Fallback: einfacher Random-GUID-ähnlicher String
  const rand = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1).toUpperCase()
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`
}

function formatDate(raw?: string): string {
  const d = raw ? new Date(raw) : new Date()
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\./g, '/')
  // Format 2026/8/26 — an Referenz-Screenshot angelehnt
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function useGpceu() {
  const cfg = useRuntimeConfig();
  // Server: interner Loopback. Client: relative URL (gleiche Origin via Nitro).
  const base = import.meta.server ? cfg.apiBase : cfg.public.apiBase;
  const root = `${base}/gpc-eu`;

  // Reactive Default-Sprache aus i18n; Aufrufer können explizit überschreiben.
  const gpcLang = useGpcLanguage();

  const get = <T>(path: string, query?: Record<string, unknown>) =>
    $fetch<T>(`${root}/${path}`, { query });
  const post = <T>(path: string, body: unknown, query?: Record<string, unknown>) =>
    $fetch<T>(`${root}/${path}`, { method: 'POST', body, query });

  return {
    // ------- Health / Setup -------
    // /health ist ein Nitro-Endpoint des Proxys, nicht der GPC-API.
    health:                () => get<{ ok: boolean; gpcVersion?: unknown; baseUrl?: string }>('health'),
    version:               () => get<GPCVersionInfo>('gpcversion'),
    // Diskrepanz zur fluids-API: productcategories nimmt `language`, fluids nimmt `languageID`.
    productCategories:     (language: number = gpcLang.value) =>
                              get<GpcProductCategory[]>('productcategories', { language }),
    inputCapacityModes:    () => get<GeneralTuple[]>('inputcapacitymodes'),
    /**
     * Liefert das Default-UnitInputData-Template pro productCategory.
     * Aufruf: `defaultInputData(0)` gibt Defaults für DX-Evaporator zurück.
     */
    defaultInputData:      (productcategory: number) =>
                              post<UnitInputDataResultWithValidationInfo>(
                                'defaultinputdata', undefined, { productcategory }
                              ),
    defaultCoilInputData:  (productcategory: number) =>
                              post<CoilInputData>('defaultcoilinputdata', undefined, { productcategory }),
    getInputData:          (productcategory: number) =>
                              post<UnitInputData>('GetInputData', undefined, { productcategory }),
    getInputDataCoil:      (productcategory: number) =>
                              post<CoilInputData>('GetInputDataCoil', undefined, { productcategory }),
    getInputString:        (body: UnitInputData) => post<string>('GetInputString', body),
    properties1ph:         (query: { FluidID: number; conc?: number; temp: number; pressure?: number }) =>
                              get<ThermodynamicProperties1Ph>('properties1ph', query),
    getAirConfiguration:   (body: UnitInputData) => post<UnitInputData>('getairconfiguration', body),
    getDefaultPartLoadConfig: (body: UnitInputData) =>
                              post<PartLoadCalcInputData>('getdefaultpartloadconfig', body),

    // ------- Fluids / Refrigerants -------
    // Liefert Wrapper-Objekt { success, message, content } — `content` enthält die Liste.
    fluids:                (languageID: number = gpcLang.value) =>
                              get<AvailableFluidListResultWithValidationInfo>('fluids', { languageID }),
    fluidInputMode:        (languageID: number = gpcLang.value) =>
                              get<AvailableFluidInputModeListResultWithValidationInfo>('fluidinputmode', { languageID }),
    fluidsConfiguration:   (body: UnitInputData) => post<UnitInputDataResultWithValidationInfo>('fluidsconfiguration', body),

    // ------- Search / Models -------
    findUnits:             (body: UnitInputData,
                            options?: { withFootnote?: boolean; unitSystem?: number; languageID?: number }) =>
                              post<FindUnitsResult>('findunits', body, {
                                languageID: options?.languageID ?? gpcLang.value,
                                // API-Inkonsistenz: `findunits` erwartet `withFootnote`
                                // (KLEINES n) mit type=integer (0/1). Der andere
                                // Endpoint `validateunitconfiguration` nimmt dagegen
                                // `withFootNote` (großes N) mit type=boolean. Siehe
                                // rag/gpceu_swagger.json Zeile 273 vs. 2778.
                                withFootnote: (options?.withFootnote ?? true) ? 1 : 0,
                                unitSystem: options?.unitSystem ?? 0
                              }),
    findCoils:             (body: CoilInputData,
                            options?: { languageID?: number; unitSystem?: number }) =>
                              post<FindCoilsResult>('findcoils', body, {
                                languageID: options?.languageID ?? gpcLang.value,
                                unitSystem: options?.unitSystem ?? 0
                              }),
    unitGroup:             (languageID: number = gpcLang.value) =>
                              get<UnitGroupOptionListResultWithValidationInfo>('unitgroup', { languageID }),
    unitModels:            (languageID: number = gpcLang.value) =>
                              get<UnitGroupOptionListResultWithValidationInfo>('unitmodels', { languageID }),
    singleUnitModels:      (languageID: number = gpcLang.value) =>
                              get<UnitGroupOptionListResultWithValidationInfo>('singleunitmodels', { languageID }),
    coilGeometry:          (body: CoilInputData,
                            options?: { languageID?: number; unitSystem?: number }) =>
                              post<UnitGroupOptionListResultWithValidationInfo>('coilgeometry', body, {
                                languageID: options?.languageID ?? gpcLang.value,
                                unitSystem: options?.unitSystem ?? 0
                              }),
    getInsertionForTubes:  (languageID: number = gpcLang.value) =>
                              get<GeneralTuple[]>('getinsertionfortubes', { languageID }),

    // ------- Recalc / Validate -------
    // RecalculateUnit erwartet RecalculationData, NICHT UnitInputData.
    recalculateUnit:        (body: RecalculationData,
                             options?: { withFootnote?: boolean; languageID?: number; unitSystem?: number }) =>
                              post<FindUnitsResult>('RecalculateUnit', body, {
                                // Swagger sagt: `withFootnote` (kleines n) mit
                                // type=boolean für RecalculateUnit.
                                withFootnote: options?.withFootnote ?? true,
                                languageID: options?.languageID ?? gpcLang.value,
                                unitSystem: options?.unitSystem ?? 0
                              }),
    recalculationInputData: (body: RecalculationData) =>
                              post<UnitInputDataResultWithValidationInfo>('RecalculationInputData', body),
    // validateunitconfiguration + unitbidtext nehmen beide MFCInputAndOutputBinary
    // (Kombination aus UnitInputData + Output-Referenzen der zuvor gewählten Unit).
    validateUnitConfig:     (body: MFCInputAndOutputBinary,
                             options?: { languageID?: number; withFootNote?: boolean; unitSystem?: number }) =>
                              post<unknown>('validateunitconfiguration', body, {
                                languageID: options?.languageID ?? gpcLang.value,
                                withFootNote: options?.withFootNote ?? true,
                                unitSystem: options?.unitSystem ?? 0
                              }),

    // ------- Output / Datasheet -------
    // unitfeatures Response ist ein untypisiertes Array in der Swagger-Doku.
    unitFeatures:           (body: UnitInputData,
                             options?: { languageID?: number; unitSystem?: number }) =>
                              post<unknown[]>('unitfeatures', body, {
                                languageID: options?.languageID ?? gpcLang.value,
                                unitSystem: options?.unitSystem ?? 0
                              }),
    unitBidText:            (body: MFCInputAndOutputBinary,
                             options?: { languageID?: number; unitSystem?: number }) =>
                              post<string>('unitbidtext', body, {
                                languageID: options?.languageID ?? gpcLang.value,
                                unitSystem: options?.unitSystem ?? 0
                              }),

    // ------- Annual Analysis -------
    partLoadCalculation:    (body: PartLoadCalcInputData) =>
                              post<PartLoadCalcResult>('partloadcalculation', body),
    impactRating:           (body: UnitInputData) => post<unknown>('impactrating', body),
    countryEmissionData:    (countryCode: string) =>
                              get<GeneralTuple[]>('GetCountryEmissionData', { countryCode }),

    // ------- File-Handling -------
    getFileContent:         (fileId: string) => get<Blob>('getgpcfilecontent', { fileId }),
    getNativeContents:      (body: RecalculationData) => post<OrigGPCFileContent>('GetNativeContents', body),
    uploadFile:             (form: FormData) =>
                              $fetch<OrigGPCFileContent>(`${root}/uploadfile`, { method: 'POST', body: form })
  };
}

/**
 * Map Proxy-Error-Codes auf i18n-Keys (siehe locales/en.json → errors).
 * Aufruf-Beispiel:
 *   const { data, error } = await useAsyncData('cats', () => useGpceu().productCategories())
 *   if (error.value) const i18nKey = gpceuErrorI18nKey(error.value)
 */
export function gpceuErrorI18nKey(err: unknown): string {
  // Nuxt $fetch wirft FetchError mit .data = response body, .status = http status
  const e = err as { data?: unknown; status?: number };
  const body = e?.data as { code?: string } | undefined;
  switch (body?.code) {
    case 'PROXY_CONFIG_MISSING':      return 'errors.proxyConfigMissing';
    case 'PROXY_AUTH_MISSING':        return 'errors.proxyAuthMissing';
    case 'PROXY_AUTH_FAILED':         return 'errors.proxyAuthFailed';
    case 'PROXY_AUTH_REFRESH_FAILED': return 'errors.proxyAuthRefreshFailed';
    case 'PROXY_TIMEOUT':             return 'errors.proxyTimeout';
    case 'PROXY_UPSTREAM_FAIL':       return 'errors.proxyUpstreamFail';
    default:                          return 'errors.unknown';
  }
}

export { isGpceuError };
