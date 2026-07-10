<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="logo">myGPC</div>
        <div class="subtitle">Güntner Product Configurator</div>
      </div>

      <form @submit.prevent="onSubmit" class="login-form">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" required autocomplete="username" :disabled="loading" />
        </label>
        <label>
          <span>Passwort</span>
          <input v-model="password" type="password" required autocomplete="current-password" :disabled="loading" />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Anmelden…' : 'Anmelden' }}
        </button>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </form>

      <p class="hint">
        Kein Konto? Wende dich an deinen Administrator.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// If already authenticated, bounce to intended destination or home.
watchEffect(() => {
  if (user.value) {
    const target = (route.query.redirect as string) || '/'
    router.replace(target)
  }
})

async function onSubmit() {
  loading.value = true
  error.value = null
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  loading.value = false
  if (err) {
    error.value = err.message === 'Invalid login credentials'
      ? 'Email oder Passwort ist falsch.'
      : err.message
  }
  // user watcher above handles the redirect on success
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f5f4f0 0%, #e8e6e0 100%);
  padding: 2rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px -20px rgba(0, 56, 101, 0.25);
  padding: 2.5rem;
}

.brand {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  font-family: 'DM Mono', monospace;
  font-size: 2rem;
  font-weight: 700;
  color: #003865;
  letter-spacing: 0.02em;
}

.subtitle {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
  color: #333;
}

input {
  padding: 0.65rem 0.85rem;
  border: 1px solid #d4d2cc;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
  transition: border-color 0.15s;
}

input:focus {
  outline: none;
  border-color: #0078BE;
  box-shadow: 0 0 0 3px rgba(0, 120, 190, 0.15);
}

input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

button {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background: #003865;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

button:hover:not(:disabled) {
  background: #002a4d;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #c0392b;
  font-size: 0.875rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fdf1f0;
  border: 1px solid #f4c4bd;
  border-radius: 4px;
}

.hint {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: #888;
}
</style>
