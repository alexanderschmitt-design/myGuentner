/**
 * useGpceu — typisierter Client für die GPC.EU Customer API.
 *
 * Hinter den Kulissen geht jeder Call über den Express-Proxy auf /api/gpc-eu/*
 * (siehe rag/gpceu-proxy.js). Auth-Injection (X-API-Key oder Bearer JWT) passiert
 * dort serverseitig — die Nuxt-App sieht nie einen Token.
 *
 * Der Proxy hängt den Pfad-Prefix `api/GPCDataQuery/` automatisch vor jeden
 * Sub-Path (steuerbar über GPCEU_PATH_PREFIX). Deshalb übergeben wir hier nur
 * den kurzen Namen — `findunits` statt `api/GPCDataQuery/findunits`.
 *
 * SSR-Verhalten: Beim Server-Render wird `runtimeConfig.apiBase` genutzt
 * (interner Loopback http://localhost:3001/api), beim Client-Render
 * `runtimeConfig.public.apiBase` (= /api, läuft über Express auf gleicher Origin).
 *
 * Konvention:
 *   - Read-Endpoints (GET) → typischerweise via useAsyncData/useFetch in einer Page
 *     verwendet, damit SSR sie ins Hydration-Payload schreibt
 *   - Write-Endpoints (POST recalc, validate, …) → imperativ aus Event-Handlern
 *
 * Stand: Endpoint-Liste deckt die 32 Routen unter /api/GPCDataQuery/ aus
 * rag/gpceu_swagger.json ab (Version 2026.9-318). Die Wizard-spezifischen
 * Signaturen für defaultInputData, findUnits, unitFeatures, unitBidText,
 * partLoadCalculation und Fluids-Filter sind noch nicht final — das wird
 * Phase-3-Planning klären, bevor wir die mygps-Pages neu wirebauen.
 */

import type { components } from '~/types/gpceu';
// Schema-Helper — kürzt components["schemas"]["X"] auf Schema<'X'>.
// Die generierte d.ts exportiert die Schemas nicht als Top-Level-Typen, weshalb
// wir hier den indexierten Zugriff bündeln. Schemata, deren Namen offen ist,
// stehen als `unknown` und werden später konkret getypt.
type Schema<K extends keyof components['schemas']> = components['schemas'][K];

type GPCVersionInfo = Schema<'GPCVersionInfo'>;
type GpcProductCategory = Schema<'GpcProductCategory'>;
type AvailableFluidListResult = Schema<'AvailableFluidListResultWithValidationInfo'>;

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
  // Server: interner Loopback. Client: relative URL (gleiche Origin via Express).
  const base = import.meta.server ? cfg.apiBase : cfg.public.apiBase;
  const root = `${base}/gpc-eu`;

  const get = <T>(path: string, query?: Record<string, unknown>) =>
    $fetch<T>(`${root}/${path}`, { query });
  const post = <T>(path: string, body: unknown, query?: Record<string, unknown>) =>
    $fetch<T>(`${root}/${path}`, { method: 'POST', body, query });

  return {
    // ------- Health / Setup -------
    // /health ist ein Endpoint des Express-Proxys selbst, nicht der GPC-API.
    health:                () => get<{ ok: boolean; gpcVersion?: unknown; baseUrl?: string }>('health'),
    version:               () => get<GPCVersionInfo>('gpcversion'),
    // Achtung: Bei productcategories heißt der Param `language`, NICHT `languageID`
    // (Diskrepanz zur fluids-API, bei der `languageID` korrekt ist).
    productCategories:     (language = 2) => get<GpcProductCategory[]>('productcategories', { language }),
    inputCapacityModes:    () => get<unknown[]>('inputcapacitymodes'),
    defaultInputData:      (body: unknown) => post<unknown>('defaultinputdata', body),
    defaultCoilInputData:  (body: unknown) => post<unknown>('defaultcoilinputdata', body),
    getInputData:          (body: unknown) => post<unknown>('GetInputData', body),
    getInputDataCoil:      (body: unknown) => post<unknown>('GetInputDataCoil', body),
    getInputString:        (body: unknown) => post<unknown>('GetInputString', body),
    properties1ph:         () => get<unknown[]>('properties1ph'),
    getAirConfiguration:   () => get<unknown>('getairconfiguration'),
    getDefaultPartLoadConfig: () => get<unknown>('getdefaultpartloadconfig'),

    // ------- Fluids / Refrigerants -------
    // Liefert Wrapper-Objekt { success, message, content } — `content` enthält die Liste.
    fluids:                (languageID = 2) => get<AvailableFluidListResult>('fluids', { languageID }),
    fluidInputMode:        () => get<unknown>('fluidinputmode'),
    fluidsConfiguration:   (body: unknown) => post<unknown>('fluidsconfiguration', body),

    // ------- Search / Models -------
    findUnits:             (body: Schema<'UnitInputData'>) => post<unknown>('findunits', body),
    findCoils:             (body: unknown) => post<unknown[]>('findcoils', body),
    unitGroup:             (body: unknown) => post<unknown>('unitgroup', body),
    unitModels:            (body: unknown) => post<unknown>('unitmodels', body),
    singleUnitModels:      (body: unknown) => post<unknown>('singleunitmodels', body),
    coilGeometry:          (body: unknown) => post<unknown>('coilgeometry', body),
    getInsertionForTubes:  (body: unknown) => post<unknown>('getinsertionfortubes', body),

    // ------- Recalc / Validate -------
    recalculateUnit:        (body: unknown) => post<unknown>('RecalculateUnit', body),
    recalculationInputData: (body: unknown) => post<unknown>('RecalculationInputData', body),
    validateUnitConfig:     (body: unknown) => post<unknown>('validateunitconfiguration', body),

    // ------- Output / Datasheet -------
    unitFeatures:           (body: unknown) => post<unknown>('unitfeatures', body),
    unitBidText:            (body: unknown) => post<unknown>('unitbidtext', body),

    // ------- Annual Analysis -------
    partLoadCalculation:    (body: unknown) => post<unknown>('partloadcalculation', body),
    impactRating:           (body: unknown) => post<unknown>('impactrating', body),
    countryEmissionData:    (countryCode: string) =>
                              get<unknown>('GetCountryEmissionData', { countryCode }),

    // ------- File-Handling -------
    getFileContent:         (fileId: string) => get<Blob>('getgpcfilecontent', { fileId }),
    getNativeContents:      (body: unknown) => post<unknown>('GetNativeContents', body),
    uploadFile:             (form: FormData) =>
                              $fetch<unknown>(`${root}/uploadfile`, { method: 'POST', body: form })
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
