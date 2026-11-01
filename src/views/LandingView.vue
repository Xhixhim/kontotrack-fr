<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import DemoRequest from '@/components/landing/DemoRequest.vue'
import LandingNav from '@/components/landing/LandingNav.vue'
import ProductPreview from '@/components/landing/ProductPreview.vue'
import TaglineReveal from '@/components/landing/TaglineReveal.vue'
import KtIcon from '@/components/ui/KtIcon.vue'
import type { IconName } from '@/components/ui/icons'
import { formatAmountKs, formatEuroKs } from '@/lib/format'
import { locale, useMessages } from '@/lib/locale'
import { landingMessages, testimonials } from '@/locales/landing'

const m = useMessages(landingMessages)
const quotes = computed(() => testimonials[locale.value])
const roleIcons: IconName[] = ['book-open', 'pencil-simple', 'storefront', 'eye']

// Example figures shown in the feature tiles; they match the app prototype.
const vat = { output: 8036.75, input: 5105.67, payable: 2931.08 }
const payroll = { gross: 9860, pension: 986 }

watchEffect(() => {
  document.title = m.value.meta.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', m.value.meta.description)
})
</script>

<template>
  <div class="landing">
    <a class="skip" href="#main">{{ m.nav.skip }}</a>
    <LandingNav :m="m" />

    <main id="main">
      <header class="hero wrap">
        <div class="hero-grid">
          <div>
            <h1 class="kt-heading-1 hero-title">
              <template v-for="(line, index) in m.hero.titleLines" :key="line">{{ line }}<br v-if="index < m.hero.titleLines.length - 1" /></template>
            </h1>
            <p class="kt-body-3 hero-sub">{{ m.hero.sub }}</p>
            <div class="hero-cta">
              <a class="kt-btn kt-btn--primary kt-btn--lg" href="#demo">{{ m.hero.cta }}<KtIcon name="arrow-right" :size="16" /></a>
              <span class="kt-caption-2 kt-muted">{{ m.hero.ctaNote }}</span>
            </div>
          </div>
          <div class="proof">
            <KtIcon name="file-xls" />
            <p class="kt-body-6 kt-second"><strong>{{ m.hero.proofStrong }}</strong> {{ m.hero.proofText }}</p>
          </div>
        </div>
        <ProductPreview :m="m" />
      </header>

      <section class="sec wrap" aria-labelledby="problem-title">
        <div class="sec-head"><h2 id="problem-title" class="kt-heading-3">{{ m.problem.title }}</h2></div>
        <div class="problem">
          <div class="problem-card before">
            <h3 class="kt-heading-6">{{ m.problem.beforeTitle }}</h3>
            <ul class="kt-body-3">
              <li v-for="item in m.problem.before" :key="item"><KtIcon name="x-circle" />{{ item }}</li>
            </ul>
          </div>
          <div class="problem-card after">
            <h3 class="kt-heading-6">{{ m.problem.afterTitle }}</h3>
            <ul class="kt-body-3">
              <li v-for="item in m.problem.after" :key="item"><KtIcon name="check-circle" />{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="tagline-sec wrap" :aria-label="m.tagline.join(' ')">
        <TaglineReveal :lines="m.tagline" />
      </section>

      <section id="vecorite" class="sec wrap" aria-labelledby="features-title">
        <div class="sec-head">
          <h2 id="features-title" class="kt-heading-3">{{ m.features.title }}</h2>
          <p class="kt-body-3 kt-second">{{ m.features.sub }}</p>
        </div>
        <div class="bento">
          <article class="tile wide">
            <h3 class="kt-title-2"><KtIcon name="bank" />{{ m.features.bank.title }}</h3>
            <p class="kt-body-6 kt-second">{{ m.features.bank.text }}</p>
            <div class="demo">
              <div v-for="line in m.features.bank.lines" :key="line.text" class="line">
                <span class="grow">{{ line.text }}</span>
                <span class="kt-chip" :class="line.matched ? 'kt-chip--ok' : 'kt-chip--suggested'"><KtIcon :name="line.matched ? 'link-simple' : 'sparkle'" :size="14" />{{ line.chip }}</span>
                <span class="kt-num kt-body-5" :class="{ neg: line.amount < 0 }">{{ formatEuroKs(line.amount) }}</span>
              </div>
            </div>
          </article>
          <article class="tile">
            <h3 class="kt-title-2"><KtIcon name="percent" />{{ m.features.vat.title }}</h3>
            <p class="kt-body-6 kt-second">{{ m.features.vat.text }}</p>
            <div class="demo kt-num">
              <div class="kv"><span class="kt-second">{{ m.features.vat.output }}</span><span class="kt-body-5">{{ formatEuroKs(vat.output) }}</span></div>
              <div class="kv"><span class="kt-second">{{ m.features.vat.input }}</span><span class="kt-body-5">{{ formatEuroKs(vat.input) }}</span></div>
              <div class="kv"><span class="kt-body-4">{{ m.features.vat.payable }}</span><span class="kt-body-4">{{ formatEuroKs(vat.payable) }}</span></div>
            </div>
          </article>
          <article class="tile">
            <h3 class="kt-title-2"><KtIcon name="shield-check" />{{ m.features.checks.title }}</h3>
            <p class="kt-body-6 kt-second">{{ m.features.checks.text }}</p>
            <div class="demo">
              <div v-for="item in m.features.checks.items" :key="item.text" class="line">
                <KtIcon :name="item.severity === 'critical' ? 'warning-octagon' : 'warning'" :class="item.severity" />
                <span class="grow">{{ item.text }}</span>
              </div>
            </div>
          </article>
          <article class="tile">
            <h3 class="kt-title-2"><KtIcon name="identification-card" />{{ m.features.payroll.title }}</h3>
            <p class="kt-body-6 kt-second">{{ m.features.payroll.text }}</p>
            <div class="demo kt-num">
              <div class="kv"><span class="kt-second">{{ m.features.payroll.gross }}</span><span class="kt-body-5">{{ formatEuroKs(payroll.gross) }}</span></div>
              <div class="kv"><span class="kt-second">{{ m.features.payroll.pension }}</span><span class="kt-body-5">{{ formatAmountKs(payroll.pension) }} €</span></div>
            </div>
          </article>
          <article class="tile wide">
            <h3 class="kt-title-2"><KtIcon name="lock-simple" />{{ m.features.close.title }}</h3>
            <p class="kt-body-6 kt-second">{{ m.features.close.text }}</p>
            <div class="demo">
              <div v-for="item in m.features.close.items" :key="item.text" class="line">
                <span class="kt-chip" :class="item.passed ? 'kt-chip--ok' : 'kt-chip--critical'"><KtIcon :name="item.passed ? 'check-circle' : 'warning-octagon'" :size="14" />{{ item.chip }}</span>
                <span class="grow">{{ item.text }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="si-funksionon" class="sec wrap" aria-labelledby="steps-title">
        <div class="sec-head"><h2 id="steps-title" class="kt-heading-3">{{ m.steps.title }}</h2></div>
        <ol class="steps">
          <li v-for="(step, index) in m.steps.items" :key="step.title" class="step">
            <span class="kt-title-4 step-n">{{ m.steps.label }} {{ index + 1 }}</span>
            <h3 class="kt-heading-6">{{ step.title }}</h3>
            <p class="kt-body-6 kt-second">{{ step.text }}</p>
          </li>
        </ol>
      </section>

      <section id="per-kend" class="sec wrap" aria-labelledby="roles-title">
        <div class="roles">
          <div class="sec-head flush">
            <h2 id="roles-title" class="kt-heading-3">{{ m.roles.title }}</h2>
            <p class="kt-body-3 kt-second">{{ m.roles.sub }}</p>
          </div>
          <ul class="role-list">
            <li v-for="(role, index) in m.roles.items" :key="role.title" class="role">
              <span class="role-icon"><KtIcon :name="roleIcons[index]!" /></span>
              <div>
                <h3 class="kt-title-3">{{ role.title }}</h3>
                <p class="kt-body-6 kt-second">{{ role.text }}</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="quotes.length" class="sec wrap" aria-labelledby="quotes-title">
        <div class="sec-head"><h2 id="quotes-title" class="kt-heading-3">{{ m.testimonialsTitle }}</h2></div>
        <div class="quotes">
          <figure v-for="quote in quotes" :key="quote.name" class="quote">
            <blockquote class="kt-title-1">{{ quote.quote }}</blockquote>
            <figcaption class="kt-body-6 kt-muted">{{ quote.name }} · {{ quote.office }}</figcaption>
          </figure>
        </div>
      </section>

      <section id="pyetje" class="sec wrap" aria-labelledby="faq-title">
        <div class="faq">
          <div class="sec-head flush">
            <h2 id="faq-title" class="kt-heading-3">{{ m.faq.title }}</h2>
            <p class="kt-body-3 kt-second">{{ m.faq.sub }}</p>
          </div>
          <div>
            <details v-for="item in m.faq.items" :key="item.q">
              <summary class="kt-title-2"><span>{{ item.q }}</span><KtIcon name="plus" /></summary>
              <p class="answer kt-body-3">{{ item.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <section id="demo" class="sec wrap" aria-labelledby="demo-title">
        <div class="cta">
          <div>
            <h2 id="demo-title" class="kt-heading-3">{{ m.demo.title }}</h2>
            <p class="kt-body-3 cta-text">{{ m.demo.text }}</p>
          </div>
          <DemoRequest :m="m" />
        </div>
      </section>
    </main>

    <footer class="wrap footer kt-body-6">
      <span>© {{ new Date().getFullYear() }} KontoTrack</span>
      <RouterLink :to="{ name: 'login' }">{{ m.footer.signIn }}</RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.landing { min-height: 100vh; color: var(--kt-text); background: var(--kt-canvas); font-family: var(--kt-font); -webkit-font-smoothing: antialiased; }
.landing h1, .landing h2, .landing h3 { margin: 0; color: var(--kt-heading); text-wrap: balance; }
.landing p { margin: 0; text-wrap: pretty; }
.landing ul, .landing ol { margin: 0; padding: 0; list-style: none; }
.wrap { max-width: 1200px; margin: 0 auto; padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-left: max(16px, env(safe-area-inset-left, 0px)); }
.skip { position: absolute; z-index: 100; top: 8px; left: -999px; padding: var(--kt-s-75) var(--kt-s-100); border-radius: var(--kt-r-8); color: var(--kt-on-action); background: var(--kt-action); }
.skip:focus { left: max(16px, env(safe-area-inset-left, 0px)); }
section, header { scroll-margin-top: 96px; }

.hero { padding-block: var(--kt-s-900) var(--kt-s-700); }
.hero-grid { display: grid; grid-template-columns: minmax(0, 680px) minmax(0, 1fr); align-items: end; gap: var(--kt-s-600); }
.hero-title { max-width: 680px; color: transparent; background: linear-gradient(90deg, var(--kt-heading), var(--kt-text-3)); -webkit-background-clip: text; background-clip: text; }
.landing .hero-sub { max-width: 680px; margin-top: var(--kt-s-300); color: var(--kt-text-2); }
.hero-cta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--kt-s-200); margin-top: var(--kt-s-400); }
.proof { display: flex; align-items: flex-start; gap: var(--kt-s-100); padding: var(--kt-s-200); border: 1px solid var(--kt-border); border-radius: var(--kt-r-12); background: var(--kt-surface); }
.proof > svg { margin-top: 2px; color: var(--kt-link); }
.proof strong { color: var(--kt-text); font-weight: 600; }

.sec { padding-block: var(--kt-s-900); }
.sec-head { display: flex; max-width: 680px; flex-direction: column; gap: var(--kt-s-200); margin-bottom: var(--kt-s-600); }
.sec-head.flush { margin-bottom: 0; }

.problem { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--kt-s-300); }
.problem-card { display: flex; flex-direction: column; gap: var(--kt-s-200); padding: var(--kt-s-400); border-radius: var(--kt-r-16); }
.problem-card ul { display: flex; flex-direction: column; gap: var(--kt-s-100); }
.problem-card li { display: flex; align-items: flex-start; gap: var(--kt-s-100); }
.problem-card li svg { margin-top: 2px; }
.before { border: 1px solid var(--kt-border); color: var(--kt-text-2); background: var(--kt-surface); }
.before svg { color: var(--kt-t-error); }
.after { color: var(--kt-on-sidebar); background: var(--kt-sidebar); }
.landing .after h3 { color: var(--kt-on-sidebar-strong); }
.after svg { color: var(--kt-on-sidebar-icon); }

.tagline-sec { padding-block: var(--kt-s-900); }

.bento { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--kt-s-200); }
.tile { display: flex; min-width: 0; flex-direction: column; grid-column: span 2; gap: var(--kt-s-200); padding: var(--kt-s-300); border: 1px solid var(--kt-border); border-radius: var(--kt-r-16); background: var(--kt-surface); }
.tile.wide { grid-column: span 4; }
.tile h3 { display: flex; align-items: center; gap: var(--kt-s-75); }
.tile h3 svg { color: var(--kt-link); }
.demo { display: flex; flex-direction: column; gap: var(--kt-s-75); margin-top: auto; padding: var(--kt-s-100); border: 1px solid var(--kt-divider); border-radius: var(--kt-r-8); background: var(--kt-surface-subtle); font-size: 14px; line-height: 20px; }
.line { display: flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-75); border-radius: var(--kt-r-6); background: var(--kt-surface); }
.grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.neg { color: var(--kt-t-error); }
svg.critical { color: var(--kt-t-error); }
svg.warning { color: var(--kt-t-warning); }
.kv { display: flex; justify-content: space-between; gap: var(--kt-s-200); }

.steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--kt-s-300); }
.step { display: flex; flex-direction: column; gap: var(--kt-s-100); padding-top: var(--kt-s-300); border-top: 2px solid var(--kt-action); }
.step-n { color: var(--kt-link); }

.roles { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: start; gap: var(--kt-s-600); }
.role-list { overflow: hidden; border: 1px solid var(--kt-border); border-radius: var(--kt-r-16); background: var(--kt-surface); }
.role { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: var(--kt-s-200); padding: var(--kt-s-300); }
.role + .role { box-shadow: inset 0 1px 0 var(--kt-divider); }
.role-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: var(--kt-r-full); color: var(--kt-link); background: var(--kt-surface-selected); }

.quotes { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--kt-s-200); }
.quote { display: flex; flex-direction: column; gap: var(--kt-s-200); margin: 0; padding: var(--kt-s-400); border: 1px solid var(--kt-border); border-radius: var(--kt-r-16); background: var(--kt-surface); }
.quote blockquote { margin: 0; color: var(--kt-heading); }

.faq { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: var(--kt-s-600); }
details { border-bottom: 1px solid var(--kt-border); }
summary { display: flex; justify-content: space-between; gap: var(--kt-s-200); padding: var(--kt-s-300) 0; color: var(--kt-heading); cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary:focus-visible { border-radius: var(--kt-r-4); outline: 2px solid var(--kt-focus); outline-offset: 4px; }
summary svg { color: var(--kt-text-3); transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1); }
details[open] summary svg { transform: rotate(45deg); }
.answer { max-width: 65ch; padding-bottom: var(--kt-s-300); color: var(--kt-text-2); }

.cta { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 440px); align-items: start; gap: var(--kt-s-600); padding: var(--kt-s-700); border-radius: var(--kt-r-24); color: var(--kt-on-sidebar); background: var(--kt-sidebar); }
.landing .cta h2 { color: var(--kt-on-sidebar-strong); }
.landing .cta-text { margin-top: var(--kt-s-200); }

.footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--kt-s-300); padding-block: var(--kt-s-300) var(--kt-s-700); border-top: 1px solid var(--kt-border); color: var(--kt-text-3); }
.footer a { text-decoration: none; }
.footer a:hover { color: var(--kt-text); }

a:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }

@media (max-width: 900px) {
  .hero { padding-block: var(--kt-s-700) var(--kt-s-600); }
  .hero-grid, .problem, .roles, .faq, .cta, .steps { grid-template-columns: 1fr; }
  .hero-title { font-size: 36px; line-height: 40px; }
  .sec, .tagline-sec { padding-block: var(--kt-s-700); }
  .sec-head h2 { font-size: 30px; line-height: 36px; }
  .bento { grid-template-columns: 1fr; }
  .tile, .tile.wide { grid-column: auto; }
  .cta { padding: var(--kt-s-400) var(--kt-s-300); }
}
@media (prefers-reduced-motion: reduce) {
  summary svg { transition: none; }
}
</style>
