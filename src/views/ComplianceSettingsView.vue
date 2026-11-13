<script setup lang="ts">
import { tr, trf, trValue } from '@/lib/tr'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/lib/api'

interface ComplianceRule {
  id: number
  rule_key: string
  configuration: Record<string, unknown>
  description: string | null
}

interface ComplianceRuleSet {
  id: number
  jurisdiction: string
  domain: string
  version: string
  valid_from: string
  valid_to: string | null
  source_title: string
  source_url: string
  approval_status: 'draft' | 'approved'
  approved_at: string | null
  rules: ComplianceRule[]
}

interface RuleDraft {
  rule_key: string
  configuration_json: string
  description: string
}

const ruleSets = ref<ComplianceRuleSet[]>([])
const loading = ref(true)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const editingId = ref<number | null>(null)
const form = ref({
  jurisdiction: 'XK',
  domain: '',
  version: '',
  valid_from: '',
  valid_to: '',
  source_title: '',
  source_url: '',
})
const ruleDrafts = ref<RuleDraft[]>([{ rule_key: '', configuration_json: '{}', description: '' }])

onMounted(loadRuleSets)

async function loadRuleSets(): Promise<void> {
  loading.value = true
  pageError.value = ''

  try {
    const response = await api.get<{ data: ComplianceRuleSet[] }>('/api/v1/compliance/rule-sets')
    ruleSets.value = response.data.data
  } catch {
    pageError.value = tr('We could not load the compliance rule sets.')
  } finally {
    loading.value = false
  }
}

function addRule(): void {
  ruleDrafts.value.push({ rule_key: '', configuration_json: '{}', description: '' })
}

function resetForm(): void {
  editingId.value = null
  formError.value = ''
  form.value = { jurisdiction: 'XK', domain: '', version: '', valid_from: '', valid_to: '', source_title: '', source_url: '' }
  ruleDrafts.value = [{ rule_key: '', configuration_json: '{}', description: '' }]
}

function startEdit(ruleSet: ComplianceRuleSet): void {
  editingId.value = ruleSet.id
  formError.value = ''
  form.value = {
    jurisdiction: ruleSet.jurisdiction,
    domain: ruleSet.domain,
    version: ruleSet.version,
    valid_from: ruleSet.valid_from,
    valid_to: ruleSet.valid_to || '',
    source_title: ruleSet.source_title,
    source_url: ruleSet.source_url,
  }
  ruleDrafts.value = ruleSet.rules.map((rule) => ({
    rule_key: rule.rule_key,
    configuration_json: JSON.stringify(rule.configuration, null, 2),
    description: rule.description || '',
  }))
}

async function saveDraft(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const rules = ruleDrafts.value.map((rule) => ({
      rule_key: rule.rule_key.trim(),
      configuration: JSON.parse(rule.configuration_json) as Record<string, unknown>,
      description: rule.description.trim() || null,
    }))
    const payload = { ...form.value, valid_to: form.value.valid_to || null, rules }
    const response = editingId.value
      ? await api.put<{ data: ComplianceRuleSet }>(`/api/v1/compliance/rule-sets/${editingId.value}`, payload)
      : await api.post<{ data: ComplianceRuleSet }>('/api/v1/compliance/rule-sets', payload)

    ruleSets.value = [response.data.data, ...ruleSets.value.filter((item) => item.id !== response.data.data.id)]
    resetForm()
  } catch (error: unknown) {
    formError.value = getApiError(error, tr('Check that each rule configuration contains valid JSON.'))
  } finally {
    saving.value = false
  }
}

async function approve(ruleSet: ComplianceRuleSet): Promise<void> {
  if (!window.confirm(trf('Approve {0} rules version {1}? Approved rules are immutable.', [ruleSet.domain, ruleSet.version]))) return

  saving.value = true
  pageError.value = ''

  try {
    const response = await api.post<{ data: ComplianceRuleSet }>(`/api/v1/compliance/rule-sets/${ruleSet.id}/approve`)
    ruleSets.value = ruleSets.value.map((item) => item.id === ruleSet.id ? response.data.data : item)
  } catch (error: unknown) {
    pageError.value = getApiError(error, tr('This rule set could not be approved.'))
  } finally {
    saving.value = false
  }
}

function getApiError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response as { data?: { message?: string; errors?: Record<string, string[]> } }
    return Object.values(response.data?.errors ?? {})[0]?.[0] ?? response.data?.message ?? fallback
  }

  return fallback
}
</script>

<template>
  <main class="compliance-shell">
    <header class="topbar">
      <RouterLink class="back-link" :to="{ name: 'dashboard' }">{{ tr('← Dashboard') }}</RouterLink>
      <span class="product-label">{{ tr('KontoTrack') }}</span>
    </header>

    <section class="page-heading">
      <p class="eyebrow">{{ tr('System administration') }}</p>
      <h1>{{ tr('Compliance rules') }}</h1>
      <p>{{ tr('Store sourced, versioned rules with effective dates. A rule set must be approved before normal users can use it.') }}</p>
    </section>

    <p v-if="pageError" class="feedback error" role="alert">{{ pageError }}</p>

    <section class="content-panel">
      <div class="panel-heading"><div><p class="eyebrow">{{ tr('New version') }}</p><h2>{{ editingId ? tr('Edit draft') : tr('Create draft') }}</h2></div><button v-if="editingId" class="text-button" type="button" @click="resetForm">{{ tr('Cancel edit') }}</button></div>
      <p class="form-note">{{ tr('Use a primary or official source. Configurations are saved as supplied; the application does not invent rates or legal interpretations.') }}</p>
      <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
      <form class="entry-form" @submit.prevent="saveDraft">
        <div class="fields-grid">
          <label>{{ tr('Jurisdiction') }}<input v-model.trim="form.jurisdiction" required minlength="2" maxlength="8" /></label>
          <label>{{ tr('Domain') }}<input v-model.trim="form.domain" required maxlength="40" :placeholder="tr('vat, invoicing, payroll…')" /></label>
          <label>{{ tr('Version') }}<input v-model.trim="form.version" required maxlength="40" /></label>
          <label>{{ tr('Valid from') }}<input v-model="form.valid_from" type="date" required /></label>
          <label>{{ tr('Valid to') }} <span>{{ tr('(optional)') }}</span><input v-model="form.valid_to" type="date" /></label>
          <label>{{ tr('Source title') }}<input v-model.trim="form.source_title" required maxlength="255" /></label>
          <label class="wide-field">{{ tr('Official source URL') }}<input v-model.trim="form.source_url" type="url" required maxlength="2048" /></label>
        </div>

        <div class="lines-heading"><h3>{{ tr('Rules and configuration') }}</h3><button class="text-button" type="button" @click="addRule">{{ tr('＋ Add rule') }}</button></div>
        <p v-if="form.jurisdiction === 'XK' && form.domain === 'vat'" class="form-note">{{ tr('For invoice tax selection, add a') }} <code>vat_codes</code> {{ tr('rule with a') }} <code>codes</code> {{ tr('array. Each code needs') }} <code>code</code>, <code>label</code>, <code>rate_percent</code>{{ tr(', and') }} <code>treatment</code> (<code>taxable</code>, <code>exempt</code>, <code>zero_rated</code>{{ tr(', or') }} <code>non_vat</code>{{ tr('). Rates are reviewed configuration, not built-in defaults.') }}</p>
        <article v-for="(rule, index) in ruleDrafts" :key="index" class="rule-draft">
          <div class="rule-heading"><strong>{{ tr('Rule') }} {{ index + 1 }}</strong><button v-if="ruleDrafts.length > 1" class="remove-line" type="button" :aria-label="trf('Remove rule {0}', [index + 1])" @click="ruleDrafts.splice(index, 1)">×</button></div>
          <div class="fields-grid">
            <label>{{ tr('Rule key') }}<input v-model.trim="rule.rule_key" required maxlength="100" :placeholder="tr('e.g. vat_rates')" /></label>
            <label>{{ tr('Description') }} <span>{{ tr('(optional)') }}</span><input v-model.trim="rule.description" maxlength="2000" /></label>
            <label class="wide-field">{{ tr('Configuration JSON') }}<textarea v-model="rule.configuration_json" rows="6" required spellcheck="false" /></label>
          </div>
        </article>
        <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Saving…') : editingId ? tr('Save draft changes') : tr('Save draft') }}</button></div>
      </form>
    </section>

    <section class="content-panel rules-panel">
      <div class="panel-heading"><div><p class="eyebrow">{{ tr('Version history') }}</p><h2>{{ tr('Rule sets') }}</h2></div></div>
      <p v-if="loading" class="feedback">{{ tr('Loading rule sets…') }}</p>
      <div v-else-if="ruleSets.length" class="rule-set-list">
        <article v-for="ruleSet in ruleSets" :key="ruleSet.id" class="rule-set-card">
          <div class="rule-set-header"><div><strong>{{ ruleSet.jurisdiction }} · {{ ruleSet.domain }} · {{ ruleSet.version }}</strong><span>{{ ruleSet.source_title }}</span></div><span class="status-chip" :class="{ posted: ruleSet.approval_status === 'approved' }">{{ trValue(ruleSet.approval_status) }}</span></div>
          <p class="effective-dates">{{ tr('Effective') }} {{ ruleSet.valid_from }}{{ ruleSet.valid_to ? ` to ${ruleSet.valid_to}` : tr(' onward') }} · {{ ruleSet.rules.length }} {{ tr('rules') }}</p>
          <a class="source-link" :href="ruleSet.source_url" target="_blank" rel="noreferrer">{{ tr('Open source ↗') }}</a>
          <div v-if="ruleSet.approval_status === 'draft'" class="rule-set-actions"><button class="text-button" type="button" :disabled="saving" @click="startEdit(ruleSet)">{{ tr('Edit draft') }}</button><button class="primary-button" type="button" :disabled="saving" @click="approve(ruleSet)">{{ tr('Approve version') }}</button></div>
          <p v-else class="approved-by">{{ tr('Approved') }} {{ ruleSet.approved_at ? new Date(ruleSet.approved_at).toLocaleString() : '' }}</p>
        </article>
      </div>
      <p v-else class="empty-message">{{ tr('No rule sets yet. Add a sourced version above.') }}</p>
    </section>
  </main>
</template>

<style scoped>
.compliance-shell { width: min(100% - 32px, 980px); margin: 0 auto; padding-bottom: 60px; color: #23352b; }
.topbar { display: flex; height: 68px; align-items: center; justify-content: space-between; border-bottom: 1px solid #e1e8e1; }
.back-link { color: #42644f; font-size: 13px; font-weight: 650; text-decoration: none; }
.product-label { color: #20382b; font-size: 14px; font-weight: 750; }
.page-heading { padding: 34px 0 24px; }
.eyebrow { margin: 0 0 7px; color: #527360; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0; color: #18231e; font-size: clamp(25px, 4vw, 34px); }
.page-heading > p:last-child, .form-note { color: #6e7c72; font-size: 13px; line-height: 1.55; }
.content-panel { margin-top: 18px; padding: 22px; border: 1px solid #e0e8df; border-radius: 15px; background: #fff; }
.panel-heading, .rule-set-header, .rule-set-actions, .rule-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.panel-heading h2 { margin: 0; color: #20382b; font-size: 21px; }
.entry-form { margin-top: 12px; padding: 18px; border: 1px solid #dfe9df; border-radius: 12px; background: #f9fbf9; }
.fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
label { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
label input, label textarea { width: 100%; min-width: 0; min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-weight: 400; }
.wide-field { grid-column: 1 / -1; }
.lines-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 10px; }
.lines-heading h3 { margin: 0; font-size: 14px; }
.rule-draft { margin-top: 10px; padding: 14px; border: 1px solid #e2eae2; border-radius: 10px; }
.rule-heading { margin-bottom: 12px; color: #344b3b; font-size: 12px; }
.text-button { padding: 6px; border: 0; color: #245c45; background: transparent; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; }
.remove-line { border: 0; color: #8c443a; background: transparent; cursor: pointer; font-size: 20px; }
.form-footer { display: flex; justify-content: flex-end; margin-top: 16px; }
.primary-button { min-height: 40px; padding: 0 15px; border: 0; border-radius: 9px; color: #fff; background: #245c45; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; }
.primary-button:disabled { cursor: not-allowed; opacity: .55; }
.error-text, .feedback.error { color: #9b352b; font-size: 12px; }
.rule-set-list { display: grid; gap: 12px; margin-top: 18px; }
.rule-set-card { padding: 15px; border: 1px solid #e4ebe4; border-radius: 12px; }
.rule-set-header > div { display: grid; min-width: 0; gap: 5px; }
.rule-set-header strong { color: #2a4033; font-size: 13px; }
.rule-set-header > div span, .effective-dates, .approved-by { color: #77837b; font-size: 11px; }
.status-chip { padding: 5px 8px; border-radius: 999px; color: #81552b; background: #fbf2e4; font-size: 10px; font-weight: 700; text-transform: capitalize; }
.status-chip.posted { color: #334b73; background: #edf1f8; }
.source-link { color: #245c45; font-size: 12px; text-decoration: none; }
.rule-set-actions { justify-content: flex-end; margin-top: 12px; }
.empty-message { color: #77837b; font-size: 13px; }
@media (max-width: 560px) { .content-panel { padding: 16px; } .fields-grid { grid-template-columns: 1fr; } .wide-field { grid-column: auto; } .rule-set-header { align-items: flex-start; } }
</style>
