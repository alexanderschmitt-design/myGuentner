<template>
  <div class="confirm">
    <div class="msg">Anmeldung wird bestätigt…</div>
  </div>
</template>

<script setup lang="ts">
// @nuxtjs/supabase auth callback lands here after email-link login flow (if used).
// For password login, this page is a no-op — we still handle the case where a
// session is present and just redirect.
definePageMeta({ layout: false })

const user = useSupabaseUser()
const router = useRouter()

watchEffect(() => {
  if (user.value) router.replace('/')
})
</script>

<style scoped>
.confirm {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #666;
  font-family: system-ui, sans-serif;
}
</style>
