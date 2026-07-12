<script setup lang="ts">
/**
 * Step 3 — Coil Geometry (Bare Coil flow only)
 *
 * Layout ref: layouts/03 Coil-Geometry-all-formelements.png
 * Pre-migration source: frontend/coil-geometry.html (git a682320~1)
 *
 * Structure — 5 rows of cards:
 *   Row 1  full-width  | Max. operating pressure
 *   Row 2  L / R       | Fins                              | Dimensions
 *   Row 3  L / R       | Core tubes                        | Circuiting
 *   Row 4  L / R       | Support tubes                     | Connection + Distribution
 *   Row 5  L / R       | Frame + Coil alignment            | Construction for
 *   Footer             | "Complete unit…" checkbox
 *
 * All fields bind to store.coilGeometry. Reset restores defaults from
 * emptyCoilGeometry(). Next → /mygpc/<catId>/search (Results grid).
 */

const store = useConfigStore()
const router = useRouter()
const { current, catId, thermoUrl, searchUrl } = useCategory()

useHead({ title: `myGPC — Coil Geometry (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''})` })

// Bindings — one-liner two-way computed for each field
function bindField<K extends keyof typeof store.coilGeometry, F extends keyof (typeof store.coilGeometry)[K]>(
  key: K, field: F
) {
  return computed<any>({
    get: () => (store.coilGeometry[key] as any)[field],
    set: (v: any) => store.updateCoilGeometry({ [key]: { ...(store.coilGeometry[key] as any), [field]: v } } as any)
  })
}
function bindRoot<K extends keyof typeof store.coilGeometry>(key: K) {
  return computed<any>({
    get: () => store.coilGeometry[key],
    set: (v: any) => store.updateCoilGeometry({ [key]: v } as any)
  })
}

// Card 1: Max. operating pressure
const maxOperatingPressure = bindRoot('maxOperatingPressure')
const maxOperatingPressureSpecial = bindRoot('maxOperatingPressureSpecial')

// Card 2: Fins
const finType = bindField('fins', 'finType')
const finMaterial = bindField('fins', 'material')
const finWithoutFins = bindField('fins', 'withoutFins')
const finThickness = bindField('fins', 'thickness')
const finSpecialThickness = bindField('fins', 'specialThickness')
const finSpacingMin = bindField('fins', 'finSpacingMinMm')
const finSpacingMax = bindField('fins', 'finSpacingMaxMm')
const finSpecialSpacing = bindField('fins', 'specialFinSpacing')
const finVariableSpacing = bindField('fins', 'variableFinSpacing')

// Card 3: Dimensions
const finnedLength = bindField('dimensions', 'finnedLengthMm')
const finnedHeight = bindField('dimensions', 'finnedHeightMm')
const tubeRowsMin = bindField('dimensions', 'tubeRowsMin')
const tubeRowsMax = bindField('dimensions', 'tubeRowsMax')

// Card 4: Core tubes
const coreMaterial = bindField('coreTubes', 'material')
const coreWallThickness = bindField('coreTubes', 'wallThickness')

// Card 5: Circuiting
const passesMin = bindField('circuiting', 'passesMin')
const passesMax = bindField('circuiting', 'passesMax')
const onlyEvenPasses = bindField('circuiting', 'onlyEvenPasses')
const circuits = bindField('circuiting', 'circuits')

// Card 6: Support tubes
const supportTubesMode = bindField('supportTubes', 'mode')
const supportTubesExactNumber = bindField('supportTubes', 'exactNumber')

// Card 7: Connection + Distribution
const maxOuterDiameter = bindField('connectionSystem', 'maxOuterDiameterMm')
const connectionMaterial = bindField('connectionSystem', 'material')
const matDistributor = bindField('distributionSystem', 'matDistributor')
const matCapillaries = bindField('distributionSystem', 'matCapillaries')
const minLengthCapillaries = bindField('distributionSystem', 'minLengthCapillariesMm')

// Card 8: Frame + Coil alignment
const frameMaterial = bindField('frame', 'material')
const coilAlignment = bindRoot('coilAlignment')
const constructionFor = bindRoot('constructionFor')

// Footer
const completeUnit = bindRoot('completeUnit')

const canProceed = computed(() => true)

function goNext() { if (canProceed.value) router.push(searchUrl()) }
function goBack() { router.push(thermoUrl()) }
function resetConfig() { store.resetCoilGeometry() }

// Dropdown option lists (based on pre-migration coil-geometry.html)
const finTypeOptions = [
  'F 50 mm x 25 mm (staggered) (FT09 old)',
  'F 25 mm x 21.65 mm (staggered) (FT05)',
  'F 34.6 mm x 20 mm (staggered) (FT06)',
  'F 40 mm x 34.64 mm (staggered) (FT08)',
  'F 30 mm x 30 mm (in-line) (FT02)'
]
const finMaterialOptions = ['AUTO', 'Alu', 'Alu epoxy', 'Cu', 'Stainless steel']
const thicknessOptions = ['AUTO', '0.15 mm', '0.20 mm', '0.25 mm', '0.30 mm']
const tubeMaterialOptions = ['AUTO', 'Cu', 'Cu inner grooved', 'Stainless steel', 'Alu']
const frameMaterialOptions = ['AUTO', 'Alu', 'Alu Mg', 'Galvanized steel', 'Stainless steel']
const connectionMaterialOptions = ['AUTO', 'Cu', 'Stainless steel']
</script>

<template>
  <div class="wizard-page coil-geometry-page">
    <!-- Sub-toolbar -->
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-outline" @click="resetConfig">Reset</button>
      <button class="btn btn-outline" type="button">Templates</button>
      <span class="spacer"></span>
      <span class="step-count">5.0</span>
      <LeafScore :score="5" :total="5" />
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">Next →</button>
    </div>

    <div class="rows">
      <!-- ================== Row 1 — Max. operating pressure ================== -->
      <section class="card row-full">
        <h3 class="card-title">Max. operating pressure</h3>
        <div class="row-inline">
          <div class="field field-narrow">
            <select v-model="maxOperatingPressure">
              <option value="AUTO">AUTO</option>
              <option value="16 bar">16 bar</option>
              <option value="25 bar">25 bar</option>
              <option value="45 bar">45 bar</option>
            </select>
          </div>
          <label class="checkbox">
            <input type="checkbox" v-model="maxOperatingPressureSpecial" />
            Special value
          </label>
        </div>
      </section>

      <!-- ================== Row 2 — Fins | Dimensions ================== -->
      <div class="row-2col">
        <section class="card">
          <h3 class="card-title">Fins</h3>
          <div class="field">
            <label>Fin type</label>
            <select v-model="finType">
              <option v-for="o in finTypeOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Material</label>
              <select v-model="finMaterial">
                <option v-for="o in finMaterialOptions" :key="o" :value="o">{{ o }}</option>
              </select>
            </div>
            <label class="checkbox stacked-check">
              <input type="checkbox" v-model="finWithoutFins" />
              Without fins
            </label>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Thickness</label>
              <select v-model="finThickness">
                <option v-for="o in thicknessOptions" :key="o" :value="o">{{ o }}</option>
              </select>
            </div>
            <label class="checkbox stacked-check">
              <input type="checkbox" v-model="finSpecialThickness" />
              Special thickness
            </label>
          </div>
          <div class="field">
            <label>Fin spacing</label>
            <div class="minmax">
              <div class="input-with-suffix">
                <input type="number" step="0.01" v-model.number="finSpacingMin" />
                <span class="suffix">mm min</span>
              </div>
              <div class="input-with-suffix">
                <input type="number" step="0.01" v-model.number="finSpacingMax" />
                <span class="suffix">mm max</span>
              </div>
            </div>
            <label class="checkbox">
              <input type="checkbox" v-model="finSpecialSpacing" />
              Special fin spacing
            </label>
            <label class="checkbox" :class="{ disabled: !finSpecialSpacing }">
              <input type="checkbox" v-model="finVariableSpacing" :disabled="!finSpecialSpacing" />
              Variable fin spacing
            </label>
          </div>
        </section>

        <section class="card">
          <h3 class="card-title">Dimensions</h3>
          <div class="field">
            <label>Finned length</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="finnedLength" />
              <span class="suffix">mm</span>
            </div>
          </div>
          <div class="field">
            <label>Finned height</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="finnedHeight" />
              <span class="suffix">mm</span>
            </div>
          </div>
          <div class="field">
            <label>Tube rows in depth</label>
            <div class="minmax">
              <div class="input-with-suffix">
                <input type="number" v-model.number="tubeRowsMin" />
                <span class="suffix">min</span>
              </div>
              <div class="input-with-suffix">
                <input type="number" v-model.number="tubeRowsMax" />
                <span class="suffix">max</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ================== Row 3 — Core tubes | Circuiting ================== -->
      <div class="row-2col">
        <section class="card">
          <h3 class="card-title">Core tubes</h3>
          <div class="field">
            <label>Material</label>
            <select v-model="coreMaterial">
              <option v-for="o in tubeMaterialOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Wall thickness</label>
            <select v-model="coreWallThickness">
              <option v-for="o in thicknessOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
        </section>

        <section class="card">
          <h3 class="card-title">Circuiting</h3>
          <div class="field">
            <label>Passes</label>
            <div class="minmax">
              <div class="input-with-suffix">
                <input type="number" v-model.number="passesMin" />
                <span class="suffix">min</span>
              </div>
              <div class="input-with-suffix">
                <input type="number" v-model.number="passesMax" />
                <span class="suffix">max</span>
              </div>
            </div>
          </div>
          <label class="checkbox">
            <input type="checkbox" v-model="onlyEvenPasses" />
            Only even number of passes
          </label>
          <div class="field">
            <label>Circuits</label>
            <input type="number" v-model.number="circuits" />
          </div>
        </section>
      </div>

      <!-- ================== Row 4 — Support tubes | Connection + Distribution ================== -->
      <div class="row-2col">
        <section class="card">
          <h3 class="card-title">Support tubes</h3>
          <div class="radio-group">
            <label class="radio">
              <input type="radio" value="auto" v-model="supportTubesMode" />
              Autom. determination
            </label>
            <label class="radio">
              <input type="radio" value="exact" v-model="supportTubesMode" />
              Exact no.:
              <input
                type="number"
                v-model.number="supportTubesExactNumber"
                :disabled="supportTubesMode !== 'exact'"
                class="inline-input"
              />
            </label>
          </div>
        </section>

        <section class="card">
          <h3 class="card-title">Connection system</h3>
          <div class="field">
            <label>Max. outer diameter</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="maxOuterDiameter" />
              <span class="suffix">mm</span>
            </div>
          </div>
          <div class="field">
            <label>Connection material</label>
            <select v-model="connectionMaterial">
              <option v-for="o in connectionMaterialOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>

          <h4 class="sub-title">Distribution system</h4>
          <div class="field">
            <label>Mat. Distributor</label>
            <select v-model="matDistributor">
              <option v-for="o in connectionMaterialOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Mat. Capillaries</label>
            <select v-model="matCapillaries">
              <option v-for="o in connectionMaterialOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Min. length of capillaries</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="minLengthCapillaries" />
              <span class="suffix">mm</span>
            </div>
          </div>
        </section>
      </div>

      <!-- ================== Row 5 — Frame + Alignment | Construction ================== -->
      <div class="row-2col">
        <section class="card">
          <h3 class="card-title">Frame</h3>
          <div class="field">
            <label>Material</label>
            <select v-model="frameMaterial">
              <option v-for="o in frameMaterialOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>

          <h4 class="sub-title">Coil alignment</h4>
          <div class="radio-group horizontal">
            <label class="radio">
              <input type="radio" value="vertical" v-model="coilAlignment" />
              Vertical
            </label>
            <label class="radio">
              <input type="radio" value="horizontal" v-model="coilAlignment" />
              Horizontal
            </label>
          </div>
        </section>

        <section class="card">
          <h3 class="card-title">Construction for</h3>
          <div class="radio-group horizontal">
            <label class="radio">
              <input type="radio" value="casing" v-model="constructionFor" />
              Casing
            </label>
            <label class="radio">
              <input type="radio" value="duct" v-model="constructionFor" />
              Duct
            </label>
          </div>
        </section>
      </div>

      <!-- Footer: Complete unit toggle -->
      <div class="footer-toggle">
        <label class="checkbox">
          <input type="checkbox" v-model="completeUnit" />
          Complete unit…
        </label>
      </div>
    </div>

    <!-- Bottom nav -->
    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">Next →</button>
    </div>
  </div>
</template>

<style scoped>
.coil-geometry-page { max-width: 1200px; margin: 0 auto; }

.rows { display: flex; flex-direction: column; gap: var(--space-5); }
.row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  align-items: start;
}
.row-full { grid-column: 1 / -1; }
@media (max-width: 900px) { .row-2col { grid-template-columns: 1fr; } }

.card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.card-title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium);
  font-weight: 500;
}
.sub-title {
  margin: var(--space-3) 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium);
  font-weight: 500;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 4px; }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
}
.field input,
.field select {
  padding: 10px 12px;
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  outline: none;
}
.field input:focus,
.field select:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.field-narrow { max-width: 220px; }

.field-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: end;
}
.stacked-check { padding: 10px 0; }

.row-inline {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.minmax {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-suffix input { flex: 1; padding-right: 48px; }
.input-with-suffix .suffix {
  position: absolute;
  right: 10px;
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  pointer-events: none;
}

/* Radios + Checkboxes */
.radio-group { display: flex; flex-direction: column; gap: var(--space-2); }
.radio-group.horizontal { flex-direction: row; gap: var(--space-5); }
.radio, .checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  cursor: pointer;
}
.checkbox.disabled { color: var(--c-text-light); cursor: not-allowed; }
.inline-input {
  padding: 4px 8px;
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  width: 80px;
  margin-left: 4px;
}

.footer-toggle { padding: var(--space-3) 0; }

.sub-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 8px 0;
}
.sub-toolbar .spacer { flex: 1; }
.step-count {
  font-family: 'DM Mono', monospace;
  color: var(--c-text-medium);
  font-size: 0.9rem;
}

.bottom-nav {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
