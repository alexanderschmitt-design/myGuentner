<script setup lang="ts">
/**
 * /admin/users — Supabase user list + create / edit / delete.
 *
 * Admin-Flag wird im user_metadata.role = 'admin' geschrieben und in
 * middleware/admin.ts geprüft. Ein Admin kann sich nicht selbst löschen
 * (Guard im Delete-Endpoint).
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
  isAdmin?: boolean
}

const api = useApi()
const toast = useToast()
const sbUser = useSupabaseUser()

const users = ref<UserRow[]>([])
const loading = ref(true)

// Create-Form
const createOpen = ref(false)
const creating = ref(false)
const newEmail = ref('')
const newPassword = ref('')
const newIsAdmin = ref(false)

// Edit-Form
const editOpen = ref(false)
const editing = ref(false)
const editUser = ref<UserRow | null>(null)
const editEmail = ref('')
const editPassword = ref('')   // leer = nicht ändern
const editIsAdmin = ref(false)

// Delete-Confirm
const deleteTarget = ref<UserRow | null>(null)
const deleting = ref(false)

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'isAdmin', label: 'Admin', width: '80px', align: 'center' as const },
  { key: 'confirmed', label: 'Confirmed', width: '100px', align: 'center' as const },
  { key: 'lastSignInAt', label: 'Last sign-in', width: '160px' },
  { key: 'createdAt', label: 'Created', width: '160px' },
  { key: 'actions', label: '', width: '150px', align: 'right' as const }
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

// -------- Create --------
function openCreate() {
  newEmail.value = ''
  newPassword.value = ''
  newIsAdmin.value = false
  createOpen.value = true
}

async function createUser() {
  if (!newEmail.value.trim() || !newPassword.value.trim()) return
  creating.value = true
  try {
    await api.post('/api/admin/users', {
      email: newEmail.value.trim(),
      password: newPassword.value.trim(),
      isAdmin: newIsAdmin.value
    })
    toast.success(`User ${newEmail.value} angelegt${newIsAdmin.value ? ' (Admin)' : ''}`)
    createOpen.value = false
    await load()
  } catch (err: any) {
    toast.error(err.message || 'User anlegen fehlgeschlagen')
  } finally {
    creating.value = false
  }
}

// -------- Edit --------
function openEdit(row: UserRow) {
  editUser.value = row
  editEmail.value = row.email
  editPassword.value = ''
  editIsAdmin.value = !!row.isAdmin
  editOpen.value = true
}

async function saveEdit() {
  const target = editUser.value
  if (!target) return
  editing.value = true
  try {
    const patch: any = {}
    if (editEmail.value.trim() && editEmail.value.trim() !== target.email) {
      patch.email = editEmail.value.trim()
    }
    if (editPassword.value.trim()) {
      patch.password = editPassword.value.trim()
    }
    if (editIsAdmin.value !== !!target.isAdmin) {
      patch.isAdmin = editIsAdmin.value
    }
    if (Object.keys(patch).length === 0) {
      toast.info('Nichts geändert')
      editOpen.value = false
      return
    }
    await api.put(`/api/admin/users/${target.id}`, patch)
    toast.success(`User ${target.email} aktualisiert`)
    editOpen.value = false
    await load()
  } catch (err: any) {
    toast.error(err?.data?.error || err.message || 'Update fehlgeschlagen')
  } finally {
    editing.value = false
  }
}

// -------- Delete --------
function askDelete(row: UserRow) {
  deleteTarget.value = row
}
function cancelDelete() { deleteTarget.value = null }
async function confirmDelete() {
  const t = deleteTarget.value
  if (!t) return
  deleting.value = true
  try {
    await api.del(`/api/admin/users/${t.id}`)
    toast.success(`User ${t.email} gelöscht`)
    deleteTarget.value = null
    await load()
  } catch (err: any) {
    toast.error(err?.data?.error || err.message || 'Löschen fehlgeschlagen')
  } finally {
    deleting.value = false
  }
}

function formatDate(s?: string | null): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}

function isSelf(row: UserRow): boolean {
  return !!sbUser.value && sbUser.value.id === row.id
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="Users"
      description="Supabase-Auth-Benutzer verwalten. Admin-Rolle greift beim nächsten Login."
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreate">Neuer User</button>
      </template>
    </AdminPageHeader>

    <DataTable
      :rows="users"
      :columns="columns"
      :loading="loading"
      empty-message="Keine User gefunden."
    >
      <template #cell-isAdmin="{ row }">
        <span v-if="row.isAdmin" class="badge-admin">★ Admin</span>
        <span v-else class="check-off">·</span>
      </template>
      <template #cell-confirmed="{ row }">
        <span v-if="row.confirmed" class="check-ok">✓</span>
        <span v-else class="check-off">·</span>
      </template>
      <template #cell-lastSignInAt="{ row }">{{ formatDate(row.lastSignInAt) }}</template>
      <template #cell-createdAt="{ row }">{{ formatDate(row.createdAt) }}</template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" @click="openEdit(row)">Edit</button>
          <button
            class="btn btn-outline btn-sm btn-danger"
            :disabled="isSelf(row)"
            :title="isSelf(row) ? 'Cannot delete your own account' : ''"
            @click="askDelete(row)"
          >Delete</button>
        </div>
      </template>
    </DataTable>

    <!-- Create Modal -->
    <ModalDialog v-model:open="createOpen" title="Neuen User anlegen" size="sm">
      <div class="field">
        <label>Email</label>
        <input type="email" v-model="newEmail" placeholder="user@example.com" autocomplete="off" />
      </div>
      <div class="field">
        <label>Passwort</label>
        <input type="text" v-model="newPassword" placeholder="mind. 8 Zeichen" autocomplete="new-password" />
      </div>
      <label class="check-inline">
        <input type="checkbox" v-model="newIsAdmin" />
        <span>Admin-Rechte (Zugriff auf /admin)</span>
      </label>
      <p class="hint">Der User wird sofort als bestätigt angelegt (kein Bestätigungsmail).</p>
      <template #footer>
        <button class="btn btn-outline" @click="createOpen = false">Abbrechen</button>
        <button class="btn btn-primary" :disabled="creating || !newEmail.trim() || !newPassword.trim()" @click="createUser">
          {{ creating ? 'Anlegen…' : 'Anlegen' }}
        </button>
      </template>
    </ModalDialog>

    <!-- Edit Modal -->
    <ModalDialog v-model:open="editOpen" :title="editUser ? `Edit: ${editUser.email}` : 'Edit User'" size="sm">
      <div class="field">
        <label>Email</label>
        <input type="email" v-model="editEmail" autocomplete="off" />
      </div>
      <div class="field">
        <label>Passwort neu setzen <span class="hint-inline">(leer = unverändert)</span></label>
        <input type="text" v-model="editPassword" placeholder="Leer lassen zum Beibehalten" autocomplete="new-password" />
      </div>
      <label class="check-inline">
        <input type="checkbox" v-model="editIsAdmin" :disabled="editUser ? isSelf(editUser) : false" />
        <span>Admin-Rechte (Zugriff auf /admin)</span>
      </label>
      <p v-if="editUser && isSelf(editUser)" class="hint">Du kannst deine eigenen Admin-Rechte nicht ändern.</p>
      <template #footer>
        <button class="btn btn-outline" @click="editOpen = false">Abbrechen</button>
        <button class="btn btn-primary" :disabled="editing" @click="saveEdit">
          {{ editing ? 'Speichern…' : 'Speichern' }}
        </button>
      </template>
    </ModalDialog>

    <!-- Delete Confirm -->
    <ModalDialog
      :open="!!deleteTarget"
      title="User löschen"
      size="sm"
      @update:open="v => { if (!v) cancelDelete() }"
    >
      <p>
        User <strong>{{ deleteTarget?.email }}</strong> unwiderruflich löschen?
      </p>
      <p class="hint">
        Templates, Chats und andere User-Daten werden automatisch mit-entfernt.
      </p>
      <template #footer>
        <button class="btn btn-outline" @click="cancelDelete">Abbrechen</button>
        <button class="btn btn-primary btn-danger-solid" :disabled="deleting" @click="confirmDelete">
          {{ deleting ? 'Lösche…' : 'Löschen' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.check-ok { color: var(--c-success); font-weight: 600; }
.check-off { color: var(--c-text-light2); }
.badge-admin {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  color: var(--c-brand-blue);
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  letter-spacing: 0.03em;
}
.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
}
.btn-sm { padding: 4px 10px; font-size: var(--font-3xs, 12.81px); }
.btn-danger {
  color: var(--c-error, #B33A3A);
  border-color: var(--c-error, #B33A3A);
}
.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c-error, #B33A3A) 6%, white);
}
.btn-danger:disabled { opacity: 0.5; }
.btn-danger-solid {
  background: var(--c-error, #B33A3A);
  color: white;
  border: 1px solid var(--c-error, #B33A3A);
}
.btn-danger-solid:hover:not(:disabled) { filter: brightness(1.08); }
.btn-danger-solid:disabled { opacity: 0.5; }

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
.check-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 4px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  cursor: pointer;
}
.check-inline input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--c-brand-blue);
  cursor: pointer;
}
.check-inline input:disabled { cursor: not-allowed; }
.hint {
  margin: 0;
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
}
.hint-inline {
  font-size: 0.85em;
  color: var(--c-text-medium);
  font-weight: 400;
}
</style>
