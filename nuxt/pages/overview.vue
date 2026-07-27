<script setup lang="ts">
/**
 * /overview — myGüntner portal landing page.
 *
 * Layout mirrors Figma file WHGL55cJW0T7FwpmczbwB0, node 3316:9799:
 *   Row 1 — 2-column: hero carousel (left) + two stacked "myService" +
 *           "mySpareParts" promo cards (right)
 *   Row 2 — SUPPORT block: title + subtitle on the left, three action
 *           cards (FAQ / Feedback / Report a Claim) on the right
 */

useHead({ title: 'myGüntner — Overview' })

const router = useRouter()
function goMyGpc() { router.push('/') }
function goSpareParts() { /* target route pending — matches nav item disabled state */ }
function goServices() { /* placeholder for future myServices route */ }
function goFaq()     { /* placeholder */ }
function goFeedback(){ /* placeholder */ }
function goClaim()   { /* placeholder */ }
</script>

<template>
  <div class="overview">
    <!-- ============= Row 1: Hero + Promo cards ============= -->
    <section class="hero-row">
      <!-- Hero carousel — left column, spans full row height -->
      <article class="hero-card">
        <div class="hero-media" aria-hidden="true"></div>
        <div class="hero-overlay" aria-hidden="true"></div>
        <div class="hero-content">
          <div class="hero-text">
            <p class="eyebrow eyebrow--inverted">Manage your business online</p>
            <h1 class="headline headline--hero">WELCOME TO myGüntner</h1>
          </div>
          <p class="hero-desc">Track your orders, configure your products, order spare parts, check out documents and videos.</p>
          <button type="button" class="btn btn-primary" @click="goMyGpc">
            <span>View more</span>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10M11 6l4 4-4 4"/></svg>
          </button>
        </div>

        <div class="hero-pagination">
          <div class="dots">
            <span class="dot dot--active" />
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
          </div>
          <button type="button" class="pager-btn" aria-label="Previous slide">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-5 5 5 5"/></svg>
          </button>
          <button type="button" class="pager-btn" aria-label="Next slide">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l5 5-5 5"/></svg>
          </button>
        </div>
      </article>

      <!-- Right column — two stacked promo cards -->
      <div class="promo-column">
        <article class="promo-card">
          <div class="promo-text">
            <p class="eyebrow">myService</p>
            <h2 class="headline headline--promo">PROJECT MANAGEMENT MADE EASY</h2>
          </div>
          <p class="promo-desc">Track your orders, configure your products, check out documents and videos.</p>
          <button type="button" class="btn btn-primary-bright" @click="goServices">
            <span>Enter Services</span>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10M11 6l4 4-4 4"/></svg>
          </button>
        </article>

        <article class="promo-card">
          <div class="promo-text">
            <p class="eyebrow">mySpareParts</p>
            <h2 class="headline headline--promo">YOUR 24/7 SPARE PARTS ONLINE SHOP</h2>
          </div>
          <p class="promo-desc">Find the right Güntner, Jaeggi, … spare part and order it easily.</p>
          <button type="button" class="btn btn-primary" @click="goSpareParts">
            <span>Find your Spare Part</span>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10M11 6l4 4-4 4"/></svg>
          </button>
        </article>
      </div>
    </section>

    <!-- ============= Row 2: Support ============= -->
    <section class="support-row">
      <div class="support-intro">
        <h2 class="headline headline--section">SUPPORT</h2>
        <p class="support-lead">Contact us with any questions or feedback.</p>
      </div>

      <div class="support-actions">
        <button type="button" class="support-card" @click="goFaq">
          <span class="support-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.35-1.5 1-1.5 2.2"/>
              <circle cx="11.5" cy="17" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
          </span>
          <div class="support-copy">
            <h3 class="headline headline--support">FAQ</h3>
            <p>Answers to our most frequently asked questions.</p>
          </div>
        </button>

        <button type="button" class="support-card" @click="goFeedback">
          <span class="support-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9z"/>
              <path d="M12 8v3.5M12 13.5v.4"/>
            </svg>
          </span>
          <div class="support-copy">
            <h3 class="headline headline--support">Feedback</h3>
            <p>We are happy to hear from you.</p>
          </div>
        </button>

        <button type="button" class="support-card" @click="goClaim">
          <span class="support-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20l6-6"/>
              <path d="M9 15l4-4 3 3-4 4-3-3z"/>
              <path d="M14 10l4-4 2 2-4 4"/>
              <path d="M3 20h8"/>
            </svg>
          </span>
          <div class="support-copy">
            <h3 class="headline headline--support">Report a Claim</h3>
            <p>In case you need to report a claim on your unit.</p>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overview {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);                              /* 19px */
}

/* --------- Row 1 --------- */
.hero-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-sm);
  min-height: 663px;
}

/* Hero card (carousel) */
.hero-card {
  position: relative;
  border-radius: var(--radius-xs);
  overflow: hidden;
  padding: var(--space-lg);                          /* 38px */
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  color: var(--c-text-inverted);
  isolation: isolate;
}
.hero-media {
  position: absolute;
  inset: 0;
  background-image: url('/images/overview-hero.jpg');
  background-size: cover;
  background-position: center;
  z-index: -2;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 60%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3));
  z-index: -1;
}
.hero-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 536px;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hero-desc {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);                         /* 15.69px */
  line-height: 18px;
  letter-spacing: 0.1px;
}

/* Pagination controls anchored bottom-right */
.hero-pagination {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  z-index: 1;
}
.dots {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 6px;
  height: 6px;
  background: #9d9d9c;
  border-radius: 999px;
}
.dot--active {
  width: 36px;
  height: 6px;
  background: #ffffff;
}
.pager-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--c-text-inverted);
  border-radius: var(--radius-xs2);                  /* 2px */
  cursor: pointer;
  transition: background 0.15s;
}
.pager-btn:hover { background: rgba(255, 255, 255, 0.22); }

/* Right column — promo cards */
.promo-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.promo-card {
  position: relative;
  flex: 1 0 0;
  min-height: 322px;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  padding: var(--space-md);                          /* 28px */
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--c-text);
  background: var(--c-surface-alt);                  /* #ececec — matches mySpareParts default */
  overflow: hidden;
  isolation: isolate;
}
.promo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 1) 42%, rgba(255, 255, 255, 0) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.6)),
    linear-gradient(90deg, var(--c-accent-primary) 0%, var(--c-accent-secondary) 50%, var(--c-accent-tertiary) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  z-index: -1;
}
.promo-card:hover::before { opacity: 1; }
.promo-card > * { position: relative; }
.promo-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.promo-desc {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: 18px;
  letter-spacing: 0.1px;
  color: var(--c-text);
  flex: 1 0 auto;
}
.promo-card .btn { align-self: flex-start; margin-top: auto; }

/* --------- Row 2: Support --------- */
.support-row {
  background: var(--c-surface-alt);
  border-radius: 8px;
  padding: var(--space-md);                          /* 28px */
  display: flex;
  gap: var(--space-md);
  align-items: stretch;
}
.support-intro {
  flex: 1 0 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs2);                             /* 9px */
}
.support-lead {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: 18px;
  letter-spacing: 0.1px;
  color: var(--c-text);
}
.support-actions {
  width: 800px;
  max-width: 60%;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.support-card {
  display: flex;
  align-items: center;
  gap: 25px;
  padding: var(--space-sm);                          /* 19px */
  background: var(--c-bg);
  border: 1px solid var(--c-border-dark);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}
.support-card:hover {
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-color: var(--c-brand-blue);
  box-shadow: 0 6px 18px rgba(38, 102, 224, 0.28);
  transform: translateY(-1px);
}
.support-card:hover .headline { color: var(--c-text-inverted); }
.support-card:hover .support-copy p { color: var(--c-text-inverted); }
.support-card:hover .support-icon {
  background: var(--c-text-inverted);
  color: var(--c-brand-blue);
}
.support-card:active {
  transform: translateY(1px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25) inset;
  background: color-mix(in srgb, var(--c-brand-blue) 88%, black);
  color: var(--c-text-inverted);
  border-color: var(--c-brand-blue);
}
.support-card:active .headline,
.support-card:active .support-copy p { color: var(--c-text-inverted); }
.support-card:active .support-icon {
  background: var(--c-text-inverted);
  color: var(--c-brand-blue);
}
.support-card:focus-visible {
  outline: 2px solid var(--c-brand-blue);
  outline-offset: 2px;
}
.support-icon {
  width: 56px;
  height: 40px;
  min-width: 40px;
  padding: var(--space-xs2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-radius: var(--radius-xs2);
  flex-shrink: 0;
}
.support-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs4);                             /* 3px */
  min-width: 0;
}
.support-copy p {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: 18px;
  letter-spacing: 0.1px;
  color: var(--c-text-medium);
}

/* --------- Typography helpers --------- */
.headline {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  color: var(--c-text);
  line-height: 100%;
}
.headline--hero,
.headline--promo,
.headline--section {
  font-size: var(--font-4xl);
}
.headline--support { font-size: var(--font-2xl); }
.headline--hero { color: var(--c-text-inverted); }

.eyebrow {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 16px;
  letter-spacing: 0.1px;
  color: var(--c-text-medium);
}
.eyebrow--inverted { color: var(--c-text-inverted); }

/* --------- Buttons --------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs2);
  min-width: 40px;
  padding: var(--space-xs2);
  border: none;
  border-radius: var(--radius-xs2);
  font-family: var(--font-ui);
  font-weight: 500;
  font-size: var(--font-xs);
  line-height: 18px;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: filter 0.15s, transform 0.06s;
}
.btn:active { transform: translateY(1px); }
.btn-primary {
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
}
.btn-primary:hover { filter: brightness(1.05); }
.btn-primary-bright {
  background: var(--c-accent-tertiary);
  color: var(--c-text-inverted);
}
.btn-primary-bright:hover { filter: brightness(1.05); }

/* --------- Responsive --------- */
@media (max-width: 1100px) {
  .hero-row { grid-template-columns: 1fr; min-height: 0; }
  .hero-card { min-height: 420px; }
  .support-row { flex-direction: column; }
  .support-actions { width: 100%; max-width: 100%; }
}
@media (max-width: 720px) {
  .promo-card { padding: var(--space-sm); }
  .hero-card { padding: var(--space-sm); }
  .support-row { padding: var(--space-sm); }
  .headline--hero,
  .headline--promo,
  .headline--section { font-size: var(--font-xl); }
  .headline--support { font-size: var(--font-lg); }
}
</style>
