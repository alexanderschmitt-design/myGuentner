/**
 * myGPC — LLM Tool Definitions (shared between Bella & future MCP)
 * -----------------------------------------------------------------
 * Liefert die Anthropic-Tool-Use-Schemas + Handler-Contracts, die
 *  - in `rag/llm-bella.js` als `tools: [...]` an `messages.stream()` übergeben werden
 *  - in einem späteren `rag/mcp-server.js` 1:1 wiederverwendet werden
 *
 * Design-Prinzipien:
 *  1. Schemas sind PURE DATA — keine Handler-Logik in dieser Datei.
 *  2. Tool-Namen sind snake_case (Anthropic-Konvention).
 *  3. `input_schema` ist JSON-Schema-2020-12.
 *  4. Jeder Tool-Eintrag hat eine `_returns`-Annotation (zur Doku / future TypeScript-Gen).
 *  5. Handler werden separat injiziert (siehe `createToolExecutor`-Pattern unten).
 *
 * Stand: 2026-05-24 (Phase 1.4 nach `nach-der-api-agile-bachman.md`)
 */

'use strict';

// ============================================================
// Tool-Schemas — Anthropic-Format (input_schema = JSON-Schema)
// ============================================================

/** Liefert den aktuellen UnitInputData-State, den Bella kennt (aus dem Chat-Request-Body). */
const TOOL_GET_CURRENT_CONFIGURATION = Object.freeze({
  name: 'get_current_configuration',
  description:
    'Returns the current Güntner Product Configurator (myGPC) configuration as a UnitInputData JSON object. ' +
    'Use this to inspect what parameters are currently set, before suggesting changes or running unit search. ' +
    'The configuration is the same data the user sees in the wizard form.',
  input_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  _returns:
    '{ ok: true, configuration: UnitInputData, productCategory: number, architectureClass: ClassId|null } ' +
    'or { ok: false, reason: string }',
});

/** Listet die kuratierten Parameter-Presets (Use-Cases). */
const TOOL_LIST_PARAMETER_PRESETS = Object.freeze({
  name: 'list_parameter_presets',
  description:
    'Returns the curated parameter preset library (cooling-purpose templates like "deep freeze -25°C", ' +
    '"data center cooling", "CO₂ gas cooler transcritical"). Optionally filter by product category or purpose. ' +
    'Each preset is a partial UnitInputData object that gets applied on top of the API defaults.',
  input_schema: {
    type: 'object',
    properties: {
      productCategory: {
        type: 'integer',
        enum: [0, 1, 2, 3, 4, 5, 6, 10],
        description:
          'Filter presets to those applicable for this productCategory. ' +
          '0=Evap DX, 1=Evap Pump, 2=Air cooler coolant, 3=Condenser, 4=Dry cooler, ' +
          '5=Subcooler, 6=Oil cooler, 10=CO₂ gas cooler.',
      },
      purpose: {
        type: 'string',
        enum: [
          'cold-storage', 'deep-freeze', 'process-cooling', 'air-conditioning',
          'data-center', 'pharma-lab', 'condensing', 'special',
        ],
        description: 'Filter by primary cooling purpose.',
      },
    },
    additionalProperties: false,
  },
  _returns: '{ ok: true, presets: Array<{id, label, description, applicableCategories, purpose, tags?}> }',
});

/** Wendet ein Preset an (oder simuliert es im Dry-Run-Modus). */
const TOOL_APPLY_PARAMETER_PRESET = Object.freeze({
  name: 'apply_parameter_preset',
  description:
    'Applies a parameter preset to the current configuration. By default emits a tool_use event that the ' +
    'frontend renders as a "Patch Card" — the user explicitly confirms (Apply / Reject). Set dryRun=true ' +
    'to return the patch contents without staging them in the UI.',
  input_schema: {
    type: 'object',
    properties: {
      presetId: {
        type: 'string',
        description: 'The preset.id from list_parameter_presets, e.g. "deep-freeze-storage".',
      },
      dryRun: {
        type: 'boolean',
        default: false,
        description:
          'If true, returns the patch without staging it in the UI. Useful for explaining changes before committing.',
      },
    },
    required: ['presetId'],
    additionalProperties: false,
  },
  _returns:
    '{ ok: true, presetId, patch: Partial<UnitInputData>, applicableCategories: number[], conflictsWithCurrentCategory?: boolean }',
});

/** Setzt eine einzelne Property (mit Validierung gegen gpc-parameters.json). */
const TOOL_SET_PARAMETER = Object.freeze({
  name: 'set_parameter',
  description:
    'Sets a single UnitInputData property. The value is validated against the parameter\'s datatype and enum ' +
    'options (from the official PDF documentation). Use snake/camel-case property names as in the GPC.EU API ' +
    'schema, e.g. "fluidID", "motorTechnology", "soundPressureMax", "defrosting".',
  input_schema: {
    type: 'object',
    properties: {
      parameterId: {
        type: 'string',
        description: 'The UnitInputData property name (case-sensitive, e.g. "fluidID").',
      },
      value: {
        // Anthropic-Schema unterstützt `oneOf` für Union-Types
        oneOf: [
          { type: 'number' },
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
        ],
        description:
          'The new value. Type depends on the parameter (Int32/Double/Boolean/String). ' +
          'For enum parameters, use the integer ID (e.g. defrosting=80 for "Air defrost").',
      },
    },
    required: ['parameterId', 'value'],
    additionalProperties: false,
  },
  _returns:
    '{ ok: true, parameterId, oldValue, newValue, accepted: boolean, reason?: string }',
});

/** Validiert die aktuelle Konfiguration (Cross-Perspective). */
const TOOL_VALIDATE_CONFIGURATION = Object.freeze({
  name: 'validate_configuration',
  description:
    'Runs the cross-perspective consistency validator on the current configuration (CLAUDE.md §12). ' +
    'Returns warnings about inconsistent choices like "t₀=-35°C with cooling purpose fruit/vegetables" ' +
    'or "noise limit 45 dB(A) not achievable with standard fans".',
  input_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  _returns:
    '{ ok: true, valid: boolean, warnings: Array<{ id, severity: "info"|"warning"|"error", message, affects: Perspective[], suggestion?: string }> }',
});

/** Ruft /api/gpc-eu/findunits mit dem aktuellen State auf — gibt die Top-N matched Units zurück. */
const TOOL_FIND_UNITS = Object.freeze({
  name: 'find_units',
  description:
    'Submits the current configuration to the GPC.EU API findunits endpoint and returns the top matching units ' +
    '(unitKey, capacity, surface reserve, dimensions, price, delivery time). Use this AFTER the user has set the ' +
    'configuration sufficiently — the API may return 0 matches if the inputs are incomplete or contradictory.',
  input_schema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 5,
        description: 'Maximum number of units to return (server may return fewer if not enough matches).',
      },
      languageID: {
        type: 'integer',
        default: 2,
        description: 'Language ID for unit descriptions: 1=DE, 2=EN, 3=FR.',
      },
    },
    additionalProperties: false,
  },
  _returns:
    '{ ok: true, count: number, units: Array<{ unitKey, thermalCapacity, surfaceReserve, airVolumeFlow, ' +
    'soundPressure, unitLength, unitWidth, unitHeight, unitWeight, deliveryTime, unitPrice }> } ' +
    'or { ok: false, reason: string }',
});

/** Liefert die offizielle PDF-Beschreibung für eine Property (zum Erklären). */
const TOOL_GET_PARAMETER_DOCS = Object.freeze({
  name: 'get_parameter_docs',
  description:
    'Returns the official PDF documentation for a UnitInputData property: description, datatype, unit, ' +
    'group, enum values. Use this when the user asks about what a parameter means or which values are valid. ' +
    'The data is sourced from "UnitInputData_Documentation_2026.1.pdf" (Version GPC.EU Customer 2026.1-310).',
  input_schema: {
    type: 'object',
    properties: {
      parameterId: {
        type: 'string',
        description: 'The UnitInputData property name (case-sensitive, e.g. "motorTechnology").',
      },
    },
    required: ['parameterId'],
    additionalProperties: false,
  },
  _returns:
    '{ ok: true, parameterId, datatype, unit, group, description, enums: Array<{ value, label }>, ' +
    'productCategoriesMentioned: number[]|null } or { ok: false, reason: string }',
});

// ============================================================
// Public Export — TOOLS Array
// ============================================================

/**
 * Vollständige Tool-Liste in der Reihenfolge, in der Bella sie sieht.
 * Wird unverändert an `messages.stream({ tools: TOOLS, ... })` übergeben.
 *
 * Tool-Choice-Strategie: `tool_choice: { type: 'auto' }` lässt Bella selbst entscheiden,
 * ob ein Tool gerufen wird oder eine Text-Antwort gegeben wird. Für aggressives
 * Tool-Use kann der Aufrufer `tool_choice: { type: 'any' }` setzen.
 */
const TOOLS = Object.freeze([
  TOOL_GET_CURRENT_CONFIGURATION,
  TOOL_LIST_PARAMETER_PRESETS,
  TOOL_APPLY_PARAMETER_PRESET,
  TOOL_SET_PARAMETER,
  TOOL_VALIDATE_CONFIGURATION,
  TOOL_FIND_UNITS,
  TOOL_GET_PARAMETER_DOCS,
]);

/** Quick-Lookup nach Tool-Name (für Tool-Use-Dispatch). */
const TOOL_BY_NAME = Object.freeze(
  TOOLS.reduce((acc, t) => {
    acc[t.name] = t;
    return acc;
  }, /** @type {Record<string, any>} */ ({})),
);

// ============================================================
// Tool-Executor-Contract (für Handler-Implementation in Phase 2)
// ============================================================

/**
 * Handler-Signaturen — werden in Phase 2 in `rag/llm-bella.js` implementiert
 * und über `createToolExecutor` injiziert. Diese Datei definiert NUR den Vertrag.
 *
 * Jeder Handler:
 *  - bekommt `(input, context)` — input ist der `tool_use_block.input`,
 *    context enthält den aktuellen Chat-State (currentConfiguration, productCategory, requestId).
 *  - gibt ein Object zurück, das als `tool_result` content gesendet wird (entweder
 *    direkt als String oder als JSON-stringified Object).
 *  - darf async sein.
 *  - bei Fehler: wirft eine Exception ODER gibt `{ ok: false, reason }` zurück.
 *    Der Bella-Stream-Handler stringifiziert das Ergebnis als Tool-Result.
 *
 * @typedef {Object} ToolContext
 * @property {Object} [currentConfiguration] - Aktueller UnitInputData-Blob (vom Chat-Request)
 * @property {number} [productCategory] - Aktuelle Kategorie (0-10)
 * @property {string} [architectureClass] - A/B/C/D1/D2/E1/E2/F oder null
 * @property {string} [requestId] - Für Logging-Korrelation
 *
 * @typedef {Object} ToolExecutor
 * @property {(input: any, ctx: ToolContext) => Promise<any>} get_current_configuration
 * @property {(input: any, ctx: ToolContext) => Promise<any>} list_parameter_presets
 * @property {(input: any, ctx: ToolContext) => Promise<any>} apply_parameter_preset
 * @property {(input: any, ctx: ToolContext) => Promise<any>} set_parameter
 * @property {(input: any, ctx: ToolContext) => Promise<any>} validate_configuration
 * @property {(input: any, ctx: ToolContext) => Promise<any>} find_units
 * @property {(input: any, ctx: ToolContext) => Promise<any>} get_parameter_docs
 */

/**
 * Erstellt einen Tool-Dispatcher aus einem Executor-Object. Validiert, dass alle
 * Tools einen Handler haben, und liefert eine generic `execute(name, input, ctx)`-Funktion.
 *
 * Beispiel:
 *   const dispatcher = createToolDispatcher({
 *     get_current_configuration: async (input, ctx) => ({ ok: true, configuration: ctx.currentConfiguration }),
 *     // ... weitere Handler
 *   });
 *   const result = await dispatcher.execute('get_current_configuration', toolInput, ctx);
 */
function createToolDispatcher(executor) {
  if (!executor || typeof executor !== 'object') {
    throw new Error('createToolDispatcher: executor object is required');
  }
  const missing = TOOLS.filter((t) => typeof executor[t.name] !== 'function').map((t) => t.name);
  if (missing.length > 0) {
    throw new Error('createToolDispatcher: missing handlers for: ' + missing.join(', '));
  }

  return {
    /**
     * Dispatches a tool_use call. Catches handler exceptions and wraps them into
     * a standard `{ ok: false, reason }` shape so the Bella stream stays clean.
     */
    async execute(name, input, ctx) {
      const handler = executor[name];
      if (!handler) return { ok: false, reason: 'Unknown tool: ' + name };
      try {
        const result = await handler(input || {}, ctx || {});
        return result == null ? { ok: true } : result;
      } catch (err) {
        return {
          ok: false,
          reason: (err && err.message) ? err.message : String(err),
          _error: true,
        };
      }
    },

    /** Returns the list of registered tool names. */
    listTools() {
      return TOOLS.map((t) => t.name);
    },
  };
}

// ============================================================
// Anthropic-API-Helper: Tool-Cache-Control (Prompt-Caching)
// ============================================================

/**
 * Liefert die TOOLS-Array mit `cache_control: ephemeral` auf dem LETZTEN Tool —
 * das aktiviert Anthropic-Prompt-Caching für den gesamten Tools-Block, was bei
 * jedem Chat-Request ~5–10 % Token spart (System-Prompt + Tools = Long-Cache).
 *
 * Verwenden in messages.stream({ tools: getCachedTools(), ... }).
 */
function getCachedTools() {
  const arr = TOOLS.slice();
  if (arr.length > 0) {
    const last = Object.assign({}, arr[arr.length - 1]);
    last.cache_control = { type: 'ephemeral' };
    arr[arr.length - 1] = last;
  }
  return arr;
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  TOOLS,
  TOOL_BY_NAME,
  TOOL_GET_CURRENT_CONFIGURATION,
  TOOL_LIST_PARAMETER_PRESETS,
  TOOL_APPLY_PARAMETER_PRESET,
  TOOL_SET_PARAMETER,
  TOOL_VALIDATE_CONFIGURATION,
  TOOL_FIND_UNITS,
  TOOL_GET_PARAMETER_DOCS,
  createToolDispatcher,
  getCachedTools,
};
