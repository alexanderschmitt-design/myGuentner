/**
 * GPC.EU Customer API — Local Mock
 * ---------------------------------
 * Liefert Fixture-Daten für die wichtigsten Endpoints der Spec, damit der
 * Nuxt-Wizard end-to-end durchklickbar ist, ohne dass ein Service-Account
 * gegen die echte API verfügbar sein muss.
 *
 * Aktivierung: GPCEU_MOCK=1 in .env. Der Proxy (rag/gpceu-proxy.js) leitet dann
 * sämtliche /api/gpc-eu/*-Requests hierher um — Auto-Login wird übersprungen.
 *
 * Sobald Live-Credentials verfügbar sind: GPCEU_MOCK=0 (oder Zeile entfernen),
 * Server neu starten — der Proxy schaltet zurück auf den echten Upstream.
 *
 * Fixtures sind bewusst kompakt; Felder spiegeln plausible Strukturen aus der
 * Spec (rag/gpceu_custromer.json) wider, sind aber keine exakten Schemata.
 * Sobald ein echter API-Response vorliegt, hier auf die echten Feld-Namen
 * angleichen.
 */

const MOCK_VERSION = '2026.8-317-mock';
const MOCK_BUILD = 'mock-' + new Date().toISOString().slice(0, 10);

const FIXTURES = {
  // GET /gpcversion — Health-Probe-Endpoint
  gpcversion: {
    version: MOCK_VERSION,
    build: MOCK_BUILD,
    mock: true
  },

  // GET /productcategories — 5 Hauptkategorien aus Planning.md
  productcategories: [
    { id: 1, slug: 'evaporative',  name: 'Evaporative Products',  description: 'Evaporative condensers and fluid coolers' },
    { id: 2, slug: 'adiabatic',    name: 'Adiabatic Products',    description: 'Adiabatic condensers, fluid coolers, CO₂ gas coolers' },
    { id: 3, slug: 'high-density', name: 'High-Density Products', description: 'Compact high-capacity adiabatic units' },
    { id: 4, slug: 'dry',          name: 'Dry Products',          description: 'Dry condensers' },
    { id: 5, slug: 'air-cooler',   name: 'Air Cooler Products',   description: 'Data center / air-cooled solutions' }
  ],

  // GET /fluids — Refrigerant-Liste, gemischt aktuelle/veraltete
  fluids: [
    { id: 1,  refrigerantCode: 'R448A',  name: 'R448A',  gwp: 1387, natural: false, phaseOut: false },
    { id: 2,  refrigerantCode: 'R449A',  name: 'R449A',  gwp: 1397, natural: false, phaseOut: false },
    { id: 3,  refrigerantCode: 'R452A',  name: 'R452A',  gwp: 2140, natural: false, phaseOut: false },
    { id: 4,  refrigerantCode: 'R134a',  name: 'R134a',  gwp: 1430, natural: false, phaseOut: true  },
    { id: 5,  refrigerantCode: 'R404A',  name: 'R404A (legacy)', gwp: 3922, natural: false, phaseOut: true },
    { id: 6,  refrigerantCode: 'R744',   name: 'R744 (CO₂)',     gwp: 1,    natural: true,  phaseOut: false },
    { id: 7,  refrigerantCode: 'R717',   name: 'R717 (NH₃)',     gwp: 0,    natural: true,  phaseOut: false },
    { id: 8,  refrigerantCode: 'R290',   name: 'R290 (Propan)',  gwp: 3,    natural: true,  phaseOut: false }
  ],

  // GET /inputcapacitymodes
  inputcapacitymodes: [
    { id: 1, name: 'By cooling capacity (kW)',  unit: 'kW' },
    { id: 2, name: 'By heat rejection (MBH)',   unit: 'MBH' },
    { id: 3, name: 'By airflow (m³/h)',         unit: 'm3h' }
  ],

  // GET /properties1ph
  properties1ph: [
    { voltage: 230, frequency: 50, phases: 1, region: 'EU' },
    { voltage: 115, frequency: 60, phases: 1, region: 'US' }
  ],

  // GET /getairconfiguration
  getairconfiguration: {
    inletTempC: 25, inletHumidity: 0.6, outletTempC: 30, fanCount: 2, fanDiameterMm: 500
  },

  // GET /getdefaultpartloadconfig
  getdefaultpartloadconfig: {
    loadProfile: 'commercial',
    minimumCondensingTemperatureC: 25,
    cyclesOfConcentration: 4
  }
};

// Demo-Units, parametrisiert leichten Variationen je Aufruf
function generateUnits(req) {
  const baseCap = Number(req?.capacity) || 25;
  const refrig = req?.refrigerant || 'R448A';
  const series = ['GFH', 'GHF', 'SGHE', 'VHF'];
  return Array.from({ length: 5 }, (_, i) => {
    const cap = baseCap * (0.9 + i * 0.15);
    const fan = i < 3 ? 500 : 630;
    const fans = i < 2 ? 1 : 2;
    return {
      id: `mock-unit-${i + 1}`,
      typeDesignation: `${series[i % series.length]} ${(31 + i * 10).toString().padStart(3, '0')}B/${fans}-S`,
      series: series[i % series.length],
      capacity: Number(cap.toFixed(2)),
      capacityKw: Number(cap.toFixed(2)),
      airflowM3h: Math.round(cap * 520),
      airflow: Math.round(cap * 520),
      fanDiameter: fan,
      fanCount: fans,
      motorType: 'EC',
      refrigerant: refrig,
      refrigerants: [refrig],
      weightKg: Math.round(140 + cap * 1.4),
      weight: Math.round(140 + cap * 1.4),
      dimensionsLWH: [1200 + i * 400, 800, 1100],
      ipClass: 'IP54',
      noiseLevelLWA: 64 + i * 1.5,
      optionCodes: ['STD', 'EC-FANS', i === 0 ? 'LOW-NOISE' : 'STD-NOISE']
    };
  });
}

function unitFeatures(req) {
  return {
    typeDesignation: req?.typeDesignation || 'GFH 031B/1-S',
    features: [
      { code: 'STD',       label: 'Standard configuration' },
      { code: 'EC-FANS',   label: 'EC fan motors with 0–10V control' },
      { code: 'AL-FINS',   label: 'Aluminium fins (3.0 mm spacing)' },
      { code: 'CU-TUBES',  label: 'Copper tubes, internally grooved' },
      { code: 'PWR-400V',  label: 'Power supply 400V/3/50Hz' }
    ],
    certifications: ['CE', 'EAC', 'UKCA']
  };
}

function unitBidText(req) {
  const td = req?.typeDesignation || 'GFH 031B/1-S';
  return {
    typeDesignation: td,
    bidText:
      `Güntner ${td} air-cooled unit cooler.\n` +
      'EC fan motors with 0–10V control. Aluminium fins, copper tubes. ' +
      'Cabinet in epoxy-coated steel. Standard 400V/3/50Hz power supply. ' +
      'Suitable for refrigerants per data sheet. Defrost: electric (optional hot-gas).\n' +
      'Capacity, airflow and dimensions per the attached technical datasheet.',
    language: 'EN'
  };
}

function partLoadCalculation(req) {
  const cap = Number(req?.capacityKw) || 25;
  const energyPrice = Number(req?.energyPricePerKwh) || 0.18;
  const waterPrice = Number(req?.waterPricePerKgal) || 3.5;
  const annualHours = req?.loadProfile === '24-7' ? 8760 : req?.loadProfile === 'industrial' ? 2080 : 4160;
  const consumptionKwh = Math.round(cap * 0.18 * annualHours);
  const waterKgal = Math.round(cap * 0.6 * annualHours / 1000);
  return {
    annualEnergyKwh: consumptionKwh,
    annualWater1000gal: waterKgal,
    annualEnergyCost: Math.round(consumptionKwh * energyPrice),
    annualWaterCost: Math.round(waterKgal * waterPrice),
    co2EmissionsKg: Math.round(consumptionKwh * 0.32),
    loadProfileUsed: req?.loadProfile || 'commercial',
    note: 'Mock calculation — replace with real /partloadcalculation response when API is live.'
  };
}

function defaultInputData(req) {
  return {
    languageID: req?.languageID || 2,
    capacity: 25,
    evaporatingTemperature: -10,
    condensingTemperature: 35,
    refrigerant: 'R448A',
    airflow: 13000
  };
}

function notMocked(path) {
  return {
    mock: true,
    notMocked: true,
    endpoint: path,
    hint: 'This endpoint has no mock fixture. Set GPCEU_MOCK=0 + configure credentials to call the real API, or add a fixture in rag/gpceu-mock.js.'
  };
}

/**
 * Liefert die Mock-Antwort für einen gegebenen Sub-Pfad (z.B. "gpcversion",
 * "findunits", "GetCountryEmissionData") und Request-Body.
 * Endpoint-Namen sind case-insensitive abgeglichen (die Spec gemischt CamelCase
 * und lowercase).
 */
function handle(subpath, method, body) {
  const key = (subpath || '').replace(/^\/+/, '').toLowerCase().split('?')[0];

  // Static fixtures
  if (key === 'gpcversion')             return { status: 200, body: FIXTURES.gpcversion };
  if (key === 'productcategories')      return { status: 200, body: FIXTURES.productcategories };
  if (key === 'fluids')                 return { status: 200, body: FIXTURES.fluids };
  if (key === 'inputcapacitymodes')     return { status: 200, body: FIXTURES.inputcapacitymodes };
  if (key === 'properties1ph')          return { status: 200, body: FIXTURES.properties1ph };
  if (key === 'getairconfiguration')    return { status: 200, body: FIXTURES.getairconfiguration };
  if (key === 'getdefaultpartloadconfig') return { status: 200, body: FIXTURES.getdefaultpartloadconfig };
  if (key === 'fluidinputmode')         return { status: 200, body: { id: 1, name: 'By refrigerant code' } };

  // Dynamic fixtures (Body-sensitive)
  if (key === 'findunits')              return { status: 200, body: generateUnits(body) };
  if (key === 'findcoils')              return { status: 200, body: generateUnits(body).map(u => ({ ...u, coilGeometry: 'A1' })) };
  if (key === 'unitfeatures')           return { status: 200, body: unitFeatures(body) };
  if (key === 'unitbidtext')            return { status: 200, body: unitBidText(body) };
  if (key === 'partloadcalculation')    return { status: 200, body: partLoadCalculation(body) };
  if (key === 'defaultinputdata')       return { status: 200, body: defaultInputData(body) };
  if (key === 'defaultcoilinputdata')   return { status: 200, body: { ...defaultInputData(body), coilGeometry: 'A1', tubeRows: 4 } };
  if (key === 'recalculateunit')        return { status: 200, body: generateUnits(body)[0] };
  if (key === 'recalculationinputdata') return { status: 200, body: defaultInputData(body) };
  if (key === 'validateunitconfiguration') return { status: 200, body: { valid: true, warnings: [] } };
  if (key === 'unitgroup')              return { status: 200, body: { groupId: 1, label: 'Mock group', units: generateUnits(body).slice(0, 3) } };
  if (key === 'unitmodels')             return { status: 200, body: generateUnits(body).map(u => ({ id: u.id, name: u.typeDesignation })) };
  if (key === 'singleunitmodels')       return { status: 200, body: generateUnits(body).map(u => ({ id: u.id, name: u.typeDesignation })) };
  if (key === 'coilgeometry')           return { status: 200, body: [{ id: 'A1', name: 'A1 standard' }, { id: 'A2', name: 'A2 high-eff' }] };
  if (key === 'getinsertionfortubes')   return { status: 200, body: [{ id: 'STD', name: 'Standard insertion' }] };
  if (key === 'fluidsconfiguration')    return { status: 200, body: { ok: true, refrigerant: body?.refrigerant || 'R448A' } };
  if (key === 'impactrating')           return { status: 200, body: { rating: 'A', gwpEquivalent: 1387, note: 'Mock impact rating' } };
  if (key === 'getcountryemissiondata') return { status: 200, body: { country: body?.countryCode || 'DE', co2gPerKwh: 320, source: 'Mock' } };
  if (key === 'getinputdata')           return { status: 200, body: defaultInputData(body) };
  if (key === 'getinputdatacoil')       return { status: 200, body: { ...defaultInputData(body), coilGeometry: 'A1' } };
  if (key === 'getinputstring')         return { status: 200, body: { input: '25kW @ -10°C, R448A' } };
  if (key === 'getgpcfilecontent')      return { status: 200, body: 'Mock file content — replace with /getgpcfilecontent response when live.' };
  if (key === 'getnativecontents')      return { status: 200, body: { files: [] } };
  if (key === 'uploadfile')             return { status: 200, body: { uploaded: true, fileId: 'mock-' + Date.now() } };

  return { status: 200, body: notMocked(subpath) };
}

function isEnabled() {
  return (process.env.GPCEU_MOCK || '').trim() === '1';
}

module.exports = { handle, isEnabled };
