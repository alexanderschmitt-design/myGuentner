<script setup lang="ts">
/**
 * /admin/users — Supabase user list + create form.
 * Server currently gates on any authenticated user; add a role check
 * before public rollout (TODO in middleware/admin.ts).
 */
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Users' })

interface UserRow {
  id: string
  email: string
  createdAt?: string
  lastSignInAt?: string | null
  confirmed?: boolean
}

const api = useApi()
const toast = useToast()

const users = ref<UserRow[]>([])
const loading = ref(true)
const createOpen = ref(false)
const creating = ref(false)
const newEmail = ref('')
const newPassword = ref('')

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'confirmed', label: 'Confirmed', width: '100px', align: 'center' as const },
  { key: 'lastSignInAt', label: 'Last sign-in', width: '160px' },
  { key: 'createdAt', label: 'Created', width: '160px' }
]

async function load() {
  loading.value = true
  try {
    const res = await api.get<{ users: UserRow[] }>('/api/admin/users')
    users.value = res.users || []
  } catch (err: any) {
    toast.error(err.message || 'Konnte User nicht laden')
  } finally {
    loading.value = false
  }
}

async function createUser() {
  if (!newEmail.value.trim() || !newPassword.value.trim()) return
  creating.value = true
  try {
    await api.post('/api/admin/users', {
      email: newEmail.value.trim(),
      password: newPassword.value.trim()
    })
    toast.success(`User ${newEmail.value} angelegt`)
    newEmail.value = ''
    newPassword.value = ''
    createOpen.value = false
    await load()
  } catch (err: any) {
    toast.error(err.message || 'User anlegen fehlgeschlagen')
  } finally {
    creating.value = false
  }
}

function formatDate(s?: string | null): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="Users"
      description="Supabase Auth Benutzer. Aktuell: jeder eingeloggte User kann anlegen (Rolle-Check folgt)."
    >
      <template #actions>
        <button class="btn btn-primary" @click="createOpen = true">Neuer User</button>
      </template>
    </AdminPageHeader>

    <DataTable
      :rows="users"
      :columns="columns"
      :loading="loading"
      empty-message="Keine User gefunden."
    >
      <template #cell-confirmed="{ row }">
        <span v-if="row.confirmed" class="check-ok">✓</span>
        <span v-else class="check-off">·</span>
      </template>
      <template #cell-lastSignInAt="{ row }">{{ formatDate(row.lastSignInAt) }}</template>
      <template #cell-createdAt="{ row }">{{ formatDate(row.createdAt) }}</template>
    </DataTable>

    <ModalDialog v-model:open="createOpen" title="Neuen User anlegen" size="sm">
      <div class="field">
        <label>Email</label>
        <input type="email" v-model="newEmail" placeholder="user@example.com" autocomplete="off" />
      </div>
      <div class="field">
        <label>Passwort</label>
        <input type="text" v-model="newPassword" placeholder="mind. 8 Zeichen" autocomplete="new-password" />
      </div>
      <p class="hint">Der User wird sofort als bestätigt angelegt (kein Bestätigungsmail).</p>
      <template #footer>
        <button class="btn btn-outline" @click="createOpen = false">Abbrechen</button>
        <button class="btn btn-primary" :disabled="creating || !newEmail.trim() || !newPassword.trim()" @click="createUser">
          {{ creating ? 'Anlegen…' : 'Anlegen' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.check-ok { color: var(--c-success); font-weight: 600; }
.check-off { color: var(--c-text-light2); }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
}
.field input {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  outline: none;
}
.field input:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.hint {
  margin: 0;
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
}
</style>
