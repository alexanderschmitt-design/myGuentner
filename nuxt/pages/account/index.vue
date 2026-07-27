<script setup lang="ts">
/**
 * /account — Profile & Settings page.
 *
 * Mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node 3559:16744 "Profile page"):
 *   - Header: title "PROFILE & SETTINGS" + description
 *   - Two-column main:
 *       Sidebar: persistent profile menu (avatar + name + menu items)
 *       Content: stacked cards — Personal information, Contact, Password,
 *                Addresses (grid), Settings (locale + toggles), Interests
 *                (multi-select segments), Delete account
 *
 * All labels/placeholders mirror the design's sample values. Wire to real
 * user data once the backend contract lands.
 */

useHead({ title: 'myGüntner — Profile & Settings' })

// ---- Personal information ----
const salutation = ref('Mr.')
const jobTitle   = ref('Facility manager')
const firstName  = ref('Andrew')
const lastName   = ref('Schofield')
const salutationOptions = ['Mr.', 'Ms.', 'Mx.', 'Dr.', 'Prof.']

// ---- Contact ----
const emailField    = ref('andrew.schofield@example.com')
const phoneCountry  = ref('+49')
const phoneNumber   = ref('151 234 5678')
const altEmail      = ref('a.schofield@work.com')
const phoneCountries = [
  { value: '+49', label: '🇩🇪 +49 (DE)' },
  { value: '+43', label: '🇦🇹 +43 (AT)' },
  { value: '+41', label: '🇨🇭 +41 (CH)' },
  { value: '+33', label: '🇫🇷 +33 (FR)' },
  { value: '+39', label: '🇮🇹 +39 (IT)' },
  { value: '+31', label: '🇳🇱 +31 (NL)' },
  { value: '+44', label: '🇬🇧 +44 (GB)' }
]

// ---- Password ----
const currentPassword = ref('')
const newPassword     = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)

// ---- Addresses ----
interface Address {
  id: string
  label: string
  name: string
  line1: string
  line2: string
  isDefault: boolean
}
const addresses = ref<Address[]>([
  { id: 'home',        label: 'Home',           name: 'Andrew Schofield', line1: 'Musterstraße 12',  line2: '10115 Berlin, Germany',   isDefault: true },
  { id: 'work',        label: 'Work',           name: 'Andrew Schofield', line1: 'Alexanderplatz 1', line2: '10178 Berlin, Germany',   isDefault: false },
  { id: 'billing',     label: 'Billing',        name: 'Schofield GmbH',   line1: 'Hafenweg 4',        line2: '20457 Hamburg, Germany',  isDefault: false },
  { id: 'ship-1',      label: 'Shipping',       name: 'Andrew Schofield', line1: 'Marienplatz 7',     line2: '80331 München, Germany',  isDefault: false },
  { id: 'ship-2',      label: 'Warehouse',      name: 'Schofield GmbH',   line1: 'Zeil 22',           line2: '60313 Frankfurt, Germany', isDefault: false }
])
const defaultAddressId = computed(() => addresses.value.find(a => a.isDefault)?.id)
function setDefaultAddress(id: string) {
  addresses.value = addresses.value.map(a => ({ ...a, isDefault: a.id === id }))
}
function addAddress() { /* opens address form modal — wire when backend lands */ }

// ---- Settings ----
const language     = ref('en-GB')
const timezone     = ref('Europe/Berlin')
const unitSystem   = ref<'metric' | 'imperial'>('metric')
const decimalMark  = ref<'.' | ','>(',')
const digitGroup   = ref<' ' | ',' | '.'>('.')
const languageOptions = [
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'es-ES', label: 'Español' },
  { value: 'nl-NL', label: 'Nederlands' }
]
const timezoneOptions = [
  { value: 'Europe/Berlin',    label: '(GMT+1) Berlin, Vienna, Zurich' },
  { value: 'Europe/London',    label: '(GMT+0) London, Dublin' },
  { value: 'Europe/Paris',     label: '(GMT+1) Paris, Amsterdam' },
  { value: 'Europe/Warsaw',    label: '(GMT+1) Warsaw, Prague' },
  { value: 'America/New_York', label: '(GMT-5) New York, Toronto' },
  { value: 'America/Chicago',  label: '(GMT-6) Chicago, Mexico City' }
]

// ---- Interests (multi-select segments) ----
interface Tag { id: string; label: string }
const industries: Tag[] = [
  { id: 'food-retail',  label: 'Food & Retail' },
  { id: 'industrial',   label: 'Industrial process' },
  { id: 'data-center',  label: 'Data center cooling' },
  { id: 'hvac',         label: 'HVAC & Comfort' },
  { id: 'pharma',       label: 'Pharma / Cleanroom' },
  { id: 'logistics',    label: 'Cold-chain logistics' }
]
const roles: Tag[] = [
  { id: 'engineer',     label: 'Refrigeration engineer' },
  { id: 'consultant',   label: 'Planning consultant' },
  { id: 'contractor',   label: 'Contractor / Installer' },
  { id: 'owner',        label: 'Facility owner' },
  { id: 'wholesaler',   label: 'Wholesaler' },
  { id: 'oem',          label: 'OEM / Manufacturer' }
]
const focus: Tag[] = [
  { id: 'new-products', label: 'New product releases' },
  { id: 'sustain',      label: 'Sustainability & natural refrigerants' },
  { id: 'training',     label: 'Training & webinars' },
  { id: 'case',         label: 'Case studies' },
  { id: 'aftersales',   label: 'Aftersales & service' },
  { id: 'events',       label: 'Events & trade shows' }
]
const selectedIndustries = ref<Set<string>>(new Set(['food-retail', 'data-center']))
const selectedRoles      = ref<Set<string>>(new Set(['engineer', 'contractor']))
const selectedFocus      = ref<Set<string>>(new Set(['sustain', 'training']))
function toggleTag(set: Ref<Set<string>>, id: string) {
  const next = new Set(set.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  set.value = next
}
const contactByEmail = ref(true)

// ---- ErP Directive ----
type ErpChoice = 'only-compliant' | 'not-relevant' | 'per-calculation' | 'only-erp-2026'
const erpChoice = ref<ErpChoice>('only-compliant')

// Card "in-edit" state — the Personal/Contact/Settings/Interests cards keep
// their footer hidden until the user edits, matching the Figma variants.
const editing = ref<Set<string>>(new Set())
function startEdit(id: string) { const s = new Set(editing.value); s.add(id); editing.value = s }
function cancelEdit(id: string) { const s = new Set(editing.value); s.delete(id); editing.value = s }
function saveEdit(id: string)   { cancelEdit(id) /* persist -> API */ }

function confirmDeleteAccount() {
  if (confirm('This will permanently delete your account and all associated data. Continue?')) {
    /* fire delete request when API lands */
  }
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="page-head">
      <h1 class="page-title">PROFILE &amp; SETTINGS</h1>
      <p class="page-desc">Manage your contact details, security, regional preferences and how we contact you.</p>
    </header>

    <div class="main">
      <ProfileSidebar active="profile" />

      <!-- Right column — stacked cards -->
      <div class="content">
        <!-- Personal information -->
        <section class="card">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">Personal information</h2></header>
            <div class="form-grid">
              <div class="field">
                <label>Salutation</label>
                <select v-model="salutation" @change="startEdit('personal')">
                  <option v-for="o in salutationOptions" :key="o" :value="o">{{ o }}</option>
                </select>
              </div>
              <div class="field">
                <label>Job Title</label>
                <input v-model="jobTitle" type="text" @input="startEdit('personal')" />
              </div>
              <div class="field">
                <label>First Name</label>
                <input v-model="firstName" type="text" @input="startEdit('personal')" />
              </div>
              <div class="field">
                <label>Last Name</label>
                <input v-model="lastName" type="text" @input="startEdit('personal')" />
              </div>
            </div>
          </div>
          <footer v-if="editing.has('personal')" class="card-footer">
            <button type="button" class="btn btn--ghost" @click="cancelEdit('personal')">Cancel</button>
            <button type="button" class="btn btn--primary" @click="saveEdit('personal')">Save changes</button>
          </footer>
        </section>

        <!-- Contact -->
        <section class="card">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">Contact</h2></header>
            <div class="form-grid">
              <div class="field">
                <label>Email</label>
                <input v-model="emailField" type="email" @input="startEdit('contact')" />
              </div>
              <div class="field">
                <label>Phone country</label>
                <select v-model="phoneCountry" @change="startEdit('contact')">
                  <option v-for="o in phoneCountries" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div class="field">
                <label>Phone number</label>
                <input v-model="phoneNumber" type="tel" @input="startEdit('contact')" />
              </div>
              <div class="field">
                <label>Alternative email</label>
                <input v-model="altEmail" type="email" @input="startEdit('contact')" />
              </div>
            </div>
          </div>
          <footer v-if="editing.has('contact')" class="card-footer">
            <button type="button" class="btn btn--ghost" @click="cancelEdit('contact')">Cancel</button>
            <button type="button" class="btn btn--primary" @click="saveEdit('contact')">Save changes</button>
          </footer>
        </section>

        <!-- Password -->
        <section class="card">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">Password</h2></header>
            <div class="form-grid">
              <div class="field">
                <label>Current password</label>
                <input v-model="currentPassword" type="password" placeholder="••••••••" />
              </div>
              <div class="field">
                <label>New password</label>
                <div class="input-affix">
                  <input v-model="newPassword" :type="showNewPassword ? 'text' : 'password'" placeholder="At least 12 characters" />
                  <button type="button" class="affix-btn" :aria-pressed="showNewPassword" @click="showNewPassword = !showNewPassword">
                    <svg v-if="showNewPassword" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"/><circle cx="10" cy="10" r="2.5"/></svg>
                    <svg v-else viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l14 14M5.5 6.5C3 8 2 10 2 10s3 5 8 5c1.5 0 2.8-.4 3.9-1M8 5.2C8.6 5.1 9.3 5 10 5c5 0 8 5 8 5s-.7 1.3-2.2 2.6"/></svg>
                  </button>
                </div>
              </div>
              <div class="field">
                <label>Confirm new password</label>
                <input v-model="confirmPassword" type="password" placeholder="Repeat new password" />
              </div>
              <div />
            </div>
          </div>
          <footer class="card-footer">
            <button type="button" class="btn btn--ghost">Cancel</button>
            <button type="button" class="btn btn--primary">Update password</button>
          </footer>
        </section>

        <!-- Addresses -->
        <section class="card">
          <div class="card-body">
            <header class="card-header card-header--split">
              <h2 class="card-title">Addresses</h2>
              <button type="button" class="btn btn--outline btn--sm" @click="addAddress">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M3 8h10"/></svg>
                <span>Add address</span>
              </button>
            </header>
            <div class="addr-grid">
              <article
                v-for="addr in addresses"
                :key="addr.id"
                class="addr-card"
                :class="{ 'addr-card--default': addr.isDefault }"
                @click="setDefaultAddress(addr.id)"
              >
                <header class="addr-head">
                  <span class="addr-label">{{ addr.label }}</span>
                  <span v-if="addr.isDefault" class="addr-badge">Default</span>
                </header>
                <p class="addr-body">
                  <strong>{{ addr.name }}</strong><br>
                  {{ addr.line1 }}<br>
                  {{ addr.line2 }}
                </p>
                <div class="addr-actions">
                  <button type="button" class="addr-action" aria-label="Edit address" @click.stop>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3l2 2-7 7H4v-2z"/></svg>
                  </button>
                  <button type="button" class="addr-action addr-action--danger" aria-label="Delete address" @click.stop>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9"/></svg>
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <!-- Settings (locale + formatting) -->
        <section class="card">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">Settings</h2></header>
            <div class="form-grid">
              <div class="field">
                <label>Language</label>
                <select v-model="language" @change="startEdit('settings')">
                  <option v-for="o in languageOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div class="field">
                <label>Timezone</label>
                <select v-model="timezone" @change="startEdit('settings')">
                  <option v-for="o in timezoneOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>

            <div class="toggle-row">
              <div class="toggle-group">
                <span class="toggle-label">System of Units</span>
                <div class="tbg">
                  <button type="button" class="tbg-btn" :class="{ active: unitSystem === 'metric' }"   @click="unitSystem = 'metric'; startEdit('settings')">Metric (SI)</button>
                  <button type="button" class="tbg-btn" :class="{ active: unitSystem === 'imperial' }" @click="unitSystem = 'imperial'; startEdit('settings')">Imperial</button>
                </div>
              </div>
              <div class="toggle-group">
                <span class="toggle-label">Decimal Symbol</span>
                <div class="tbg">
                  <button type="button" class="tbg-btn" :class="{ active: decimalMark === '.' }" @click="decimalMark = '.'; startEdit('settings')">1.5</button>
                  <button type="button" class="tbg-btn" :class="{ active: decimalMark === ',' }" @click="decimalMark = ','; startEdit('settings')">1,5</button>
                </div>
              </div>
              <div class="toggle-group">
                <span class="toggle-label">Digit Grouping</span>
                <div class="tbg">
                  <button type="button" class="tbg-btn" :class="{ active: digitGroup === ' ' }" @click="digitGroup = ' '; startEdit('settings')">1 000</button>
                  <button type="button" class="tbg-btn" :class="{ active: digitGroup === ',' }" @click="digitGroup = ','; startEdit('settings')">1,000</button>
                  <button type="button" class="tbg-btn" :class="{ active: digitGroup === '.' }" @click="digitGroup = '.'; startEdit('settings')">1.000</button>
                </div>
              </div>
            </div>
          </div>
          <footer v-if="editing.has('settings')" class="card-footer">
            <button type="button" class="btn btn--ghost" @click="cancelEdit('settings')">Cancel</button>
            <button type="button" class="btn btn--primary" @click="saveEdit('settings')">Save changes</button>
          </footer>
        </section>

        <!-- ErP Directive -->
        <section class="card">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">ErP Directive</h2></header>

            <p class="erp-intro">
              The ErP Directive applies to the European Economic Area and forms part of the
              Ecodesign Directive. The Directive stipulates minimum efficiency requirements
              for fans that have to be met as of January 1st, 2013.
            </p>

            <p class="erp-prompt">Please select how you want to proceed with regard to the ErP Directive.</p>

            <div class="erp-choices">
              <label class="erp-radio">
                <input type="radio" name="erp-choice" value="only-compliant" v-model="erpChoice" @change="startEdit('erp')" />
                <span>Only units compliant with ErP</span>
              </label>
              <label class="erp-radio">
                <input type="radio" name="erp-choice" value="not-relevant" v-model="erpChoice" @change="startEdit('erp')" />
                <span>The ErP Directive is not relevant to me. The units are to be exclusively installed and operated outside of the European Economic Area.</span>
              </label>
              <label class="erp-radio">
                <input type="radio" name="erp-choice" value="per-calculation" v-model="erpChoice" @change="startEdit('erp')" />
                <span>I prefer to individually select for each calculation if the ErP Directive is relevant or not.</span>
              </label>
              <label class="erp-radio">
                <input type="radio" name="erp-choice" value="only-erp-2026" v-model="erpChoice" @change="startEdit('erp')" />
                <span>Only show units compliant with ErP 2026.</span>
              </label>
            </div>
          </div>
          <footer v-if="editing.has('erp')" class="card-footer">
            <button type="button" class="btn btn--ghost" @click="cancelEdit('erp')">Cancel</button>
            <button type="button" class="btn btn--primary" @click="saveEdit('erp')">Save changes</button>
          </footer>
        </section>

        <!-- Interests -->
        <section class="card">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">Interests</h2></header>

            <div class="tag-group">
              <h3 class="tag-group-title">Which industries do you serve?</h3>
              <p class="tag-group-desc">We tailor case studies, product highlights and events in your newsletter to the sectors you pick.</p>
              <div class="tags">
                <button
                  v-for="t in industries"
                  :key="t.id"
                  type="button"
                  class="tag"
                  :class="{ active: selectedIndustries.has(t.id) }"
                  @click="toggleTag(selectedIndustries, t.id); startEdit('interests')"
                >{{ t.label }}</button>
              </div>
            </div>

            <div class="tag-group">
              <h3 class="tag-group-title">What best describes your role?</h3>
              <p class="tag-group-desc">Different roles get different levels of technical depth in our updates.</p>
              <div class="tags">
                <button
                  v-for="t in roles"
                  :key="t.id"
                  type="button"
                  class="tag"
                  :class="{ active: selectedRoles.has(t.id) }"
                  @click="toggleTag(selectedRoles, t.id); startEdit('interests')"
                >{{ t.label }}</button>
              </div>
            </div>

            <div class="tag-group">
              <h3 class="tag-group-title">What would you like to hear about?</h3>
              <p class="tag-group-desc">Pick as many topics as you're interested in.</p>
              <div class="tags">
                <button
                  v-for="t in focus"
                  :key="t.id"
                  type="button"
                  class="tag"
                  :class="{ active: selectedFocus.has(t.id) }"
                  @click="toggleTag(selectedFocus, t.id); startEdit('interests')"
                >{{ t.label }}</button>
              </div>
            </div>

            <label class="checkbox-row">
              <input type="checkbox" v-model="contactByEmail" @change="startEdit('interests')" />
              <span>
                <strong>Contact preferences</strong>
                <span class="checkbox-desc">Email me periodic updates matching my selected industries, role and topics.</span>
              </span>
            </label>
          </div>
          <footer v-if="editing.has('interests')" class="card-footer">
            <button type="button" class="btn btn--ghost" @click="cancelEdit('interests')">Cancel</button>
            <button type="button" class="btn btn--primary" @click="saveEdit('interests')">Save changes</button>
          </footer>
        </section>

        <!-- Delete account -->
        <section class="card card--danger">
          <div class="card-body">
            <header class="card-header"><h2 class="card-title">Delete account</h2></header>
            <p class="danger-note">Deleting your account will permanently remove your profile, saved configurations, project history and all associated data. This action cannot be undone.</p>
          </div>
          <footer class="card-footer">
            <button type="button" class="btn btn--danger" @click="confirmDeleteAccount">Delete my account</button>
          </footer>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* ---------- Page header ---------- */
.page-head { display: flex; flex-direction: column; gap: var(--space-a8); }
.page-title {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-4xl);
  color: var(--c-text-value);
  line-height: 100%;
}
.page-desc {
  margin: 0;
  max-width: 596px;
  font-family: var(--font-ui);
  font-size: var(--font-sm-base);
  color: var(--c-text-dark2);
  line-height: 24px;
}

/* ---------- Main two-col ---------- */
.main {
  display: grid;
  grid-template-columns: 267px minmax(0, 1fr);
  gap: var(--space-md);
  align-items: start;
}
.main > .card + .card { margin-top: 0; }
@media (max-width: 900px) { .main { grid-template-columns: 1fr; } }

/* ---------- Content column ---------- */
.content { display: flex; flex-direction: column; gap: var(--space-md); }

/* ---------- Cards ---------- */
.card {
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.card-body { padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-md); }
.card-header { padding: 0; }
.card-header--split { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); }
.card-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
  line-height: 18px;
}
.card-footer {
  border-top: 1px solid var(--c-border-card);
  padding: var(--space-xs2);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xs3);
}

.card--danger { border-color: color-mix(in srgb, #B33A3A 30%, var(--c-border-card)); }

/* ---------- Form grid ---------- */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-a8) var(--space-md);
}
.field { display: flex; flex-direction: column; gap: var(--space-xs2); min-width: 0; }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  line-height: 15px;
  letter-spacing: 0.1px;
}
.field select,
.field input {
  padding: var(--space-xs2) var(--space-xs);
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  line-height: 18px;
  outline: none;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.field select:focus,
.field input:focus { border-color: var(--c-brand-blue); }

.input-affix {
  position: relative;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  overflow: hidden;
  transition: border-color 0.15s;
}
.input-affix:focus-within { border-color: var(--c-brand-blue); }
.input-affix input {
  flex: 1;
  padding: var(--space-xs2) var(--space-xs);
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
}
.affix-btn {
  width: 40px;
  border: none;
  background: transparent;
  color: var(--c-text-medium);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.affix-btn:hover { color: var(--c-brand-blue); }

/* ---------- Toggle-button-group + Settings row ---------- */
.toggle-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  align-items: end;
}
.toggle-group { display: flex; flex-direction: column; gap: var(--space-xs2); min-width: 0; }
.toggle-label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
}
.tbg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: white;
  border: 1px solid var(--c-border-dark);
  border-radius: var(--radius-xs);
}
.tbg-btn {
  flex: 1 0 0;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--c-text-light);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  border-radius: var(--radius-xs2);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.tbg-btn:hover { color: var(--c-text); }
.tbg-btn.active { background: var(--c-surface-alt); color: var(--c-text); }

/* ---------- Addresses ---------- */
.addr-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
}
@media (max-width: 1100px) { .addr-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px)  { .addr-grid { grid-template-columns: 1fr; } }

.addr-card {
  position: relative;
  padding: var(--space-xs);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  background: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs3);
  transition: border-color 0.12s, box-shadow 0.12s;
}
.addr-card:hover {
  border-color: var(--c-brand-blue);
  box-shadow: 0 2px 8px rgba(38, 102, 224, 0.06);
}
.addr-card--default {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 4%, white);
}
.addr-head { display: flex; align-items: center; justify-content: space-between; }
.addr-label {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text);
}
.addr-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  font-weight: 500;
  line-height: 14px;
}
.addr-body {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 16px;
}
.addr-actions {
  position: absolute;
  bottom: var(--space-xs3);
  right: var(--space-xs3);
  display: inline-flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.addr-card:hover .addr-actions { opacity: 1; }
.addr-action {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text-medium);
  border-radius: var(--radius-xs);
  cursor: pointer;
}
.addr-action:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }
.addr-action--danger:hover { border-color: #B33A3A; color: #B33A3A; }

/* ---------- Interests tag pills ---------- */
.tag-group { display: flex; flex-direction: column; gap: var(--space-xs2); }
.tag-group + .tag-group { margin-top: var(--space-sm); padding-top: var(--space-sm); border-top: 1px solid var(--c-border-card); }
.tag-group-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.tag-group-desc {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 18px;
  max-width: 490px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs3);
  margin-top: var(--space-xs3);
}
.tag {
  padding: 8px 14px;
  border: 1px solid var(--c-border);
  background: white;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tag:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }
.tag.active {
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-color: var(--c-brand-blue);
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs2);
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--c-border-card);
  cursor: pointer;
}
.checkbox-row input { margin: 3px 0 0; accent-color: var(--c-brand-blue); flex-shrink: 0; width: 16px; height: 16px; }
.checkbox-row > span { display: flex; flex-direction: column; gap: 2px; font-family: var(--font-ui); font-size: var(--font-2xs); color: var(--c-text-value); }
.checkbox-desc {
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  line-height: 15px;
  font-weight: 400;
}

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);
  padding: 7px var(--space-xs);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  line-height: 16px;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s, color 0.12s, border-color 0.12s;
  border: 1px solid transparent;
  background: white;
}
.btn--primary { background: var(--c-brand-blue); color: var(--c-text-inverted); border-color: var(--c-brand-blue); }
.btn--primary:hover { filter: brightness(1.05); }
.btn--outline { color: var(--c-brand-blue); border-color: var(--c-brand-blue); }
.btn--outline:hover { background: color-mix(in srgb, var(--c-brand-blue) 6%, white); }
.btn--ghost { color: var(--c-text-medium); border-color: transparent; }
.btn--ghost:hover { color: var(--c-text); background: var(--c-surface-alt); }
.btn--danger { background: #B33A3A; color: var(--c-text-inverted); border-color: #B33A3A; }
.btn--danger:hover { filter: brightness(1.05); }
.btn--sm { padding: 5px 10px; font-size: var(--font-4xs); }

.danger-note {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium);
  line-height: 20px;
  max-width: 720px;
}

/* ---------- ErP Directive ---------- */
.erp-intro,
.erp-prompt {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  line-height: 20px;
  max-width: 720px;
}
.erp-prompt { color: var(--c-text-value); font-weight: 500; }

.erp-choices { display: flex; flex-direction: column; gap: var(--space-xs); }
.erp-radio {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs2);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  line-height: 20px;
  padding: 4px 0;
}
.erp-radio input[type='radio'] {
  accent-color: var(--c-brand-blue);
  flex-shrink: 0;
  margin: 2px 0 0;
  width: 15px;
  height: 15px;
  cursor: pointer;
}
.erp-radio span { flex: 1 0 0; min-width: 0; }
.erp-radio:hover span { color: var(--c-text-value); }
</style>
