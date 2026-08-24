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
}

function isGpceuError(x: unknown): x is GpceuError {
  return !!x && typeof x === 'object' && (x as any).ok === false && typeof (x as any).error === 'string';
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
