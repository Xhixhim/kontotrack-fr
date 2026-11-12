<script setup lang="ts">
import { nextTick, ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

interface Source { type: string; id: number | null; label: string }
interface Turn { role: 'user' | 'assistant'; content: string; sources?: Source[] }

const props = defineProps<{ businessId: number }>()

const m = useMessages({
  sq: {
    eyebrow: 'Asistenti',
    title: 'Pyet për të dhënat e biznesit',
    note: 'Asistenti lexon të dhënat e këtij biznesi dhe përgjigjet me burimet ku mbështetet. Nuk mund të ndryshojë asgjë në libra. Pyetja dhe të dhënat që i duhen për përgjigje dërgohen te shërbimi i AI-së.',
    examples: ['Cilët klientë kanë borxhe?', 'Cilat fatura janë me vonesë?', 'Pse ndryshuan shpenzimet këtë muaj krahasuar me muajin e kaluar?', 'Cilat dokumente mungojnë?'],
    placeholder: 'Shkruaj pyetjen…',
    ask: 'Pyet',
    thinking: 'Po kërkon në të dhëna…',
    sources: 'Burimet',
    you: 'Ti',
    assistant: 'Asistenti',
    clear: 'Bisedë e re',
    failed: 'Asistenti nuk u përgjigj.',
    types: { invoice: 'Faturë', journal_entry: 'Regjistrim', report: 'Raport', controls: 'Kontrollet', document_request: 'Dokument i kërkuar' } as Record<string, string>,
  },
  en: {
    eyebrow: 'Assistant',
    title: 'Ask about this business',
    note: 'The assistant reads this business\'s records and answers with the sources it relied on. It cannot change anything in the books. Your question and the data needed to answer it are sent to the AI service.',
    examples: ['Which customers owe money?', 'Which invoices are overdue?', 'Why did expenses change this month compared with last month?', 'Which documents are missing?'],
    placeholder: 'Type your question…',
    ask: 'Ask',
    thinking: 'Looking through the records…',
    sources: 'Sources',
    you: 'You',
    assistant: 'Assistant',
    clear: 'New conversation',
    failed: 'The assistant did not answer.',
    types: { invoice: 'Invoice', journal_entry: 'Journal entry', report: 'Report', controls: 'Checks', document_request: 'Requested document' } as Record<string, string>,
  },
})

const turns = ref<Turn[]>([])
const question = ref('')
const asking = ref(false)
const error = ref('')
const log = ref<HTMLElement | null>(null)

async function ask(text: string = question.value): Promise<void> {
  const asked = text.trim()
  if (!asked || asking.value) return
  const history = turns.value.map(({ role, content }) => ({ role, content }))
  turns.value = [...turns.value, { role: 'user', content: asked }]
  question.value = ''
  asking.value = true
  error.value = ''
  await nextTick()
  log.value?.scrollTo({ top: log.value.scrollHeight })
  try {
    const response = await api.post<{ data: { answer: string; sources: Source[] } }>(`/api/v1/businesses/${props.businessId}/assistant`, { question: asked, history: history.slice(-20) })
    turns.value = [...turns.value, { role: 'assistant', content: response.data.data.answer, sources: response.data.data.sources }]
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
    // The unanswered question goes back into the box so it is not lost.
    turns.value = turns.value.slice(0, -1)
    question.value = asked
  } finally {
    asking.value = false
    await nextTick()
    log.value?.scrollTo({ top: log.value.scrollHeight })
  }
}

function clear(): void {
  turns.value = []
  error.value = ''
}
</script>

<template>
  <section class="content-panel assistant">
    <div class="panel-heading">
      <div><p class="eyebrow">{{ m.eyebrow }}</p><h2>{{ m.title }}</h2></div>
      <button v-if="turns.length" class="text-button" type="button" @click="clear">{{ m.clear }}</button>
    </div>
    <p class="form-note">{{ m.note }}</p>

    <div v-if="!turns.length" class="assistant-examples">
      <button v-for="example in m.examples" :key="example" class="example" type="button" :disabled="asking" @click="ask(example)">{{ example }}</button>
    </div>

    <div v-else ref="log" class="assistant-log" aria-live="polite">
      <article v-for="(turn, index) in turns" :key="index" class="turn" :class="turn.role">
        <p class="turn-author">{{ turn.role === 'user' ? m.you : m.assistant }}</p>
        <p class="turn-text">{{ turn.content }}</p>
        <details v-if="turn.sources?.length" class="turn-sources">
          <summary>{{ m.sources }} ({{ turn.sources.length }})</summary>
          <ul><li v-for="source in turn.sources" :key="`${source.type}-${source.id ?? source.label}`"><span class="status-chip">{{ m.types[source.type] ?? source.type }}</span> {{ source.label }}</li></ul>
        </details>
      </article>
      <p v-if="asking" class="form-note">{{ m.thinking }}</p>
    </div>

    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <form class="assistant-form" @submit.prevent="ask()">
      <label class="kt-sr-only" for="assistant-question">{{ m.placeholder }}</label>
      <textarea id="assistant-question" v-model="question" rows="2" maxlength="2000" :placeholder="m.placeholder" :disabled="asking" @keydown.enter.exact.prevent="ask()"></textarea>
      <button class="primary-button" type="submit" :disabled="asking || !question.trim()">{{ asking ? m.thinking : m.ask }}</button>
    </form>
  </section>
</template>

<style scoped>
.assistant-examples { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 6px 0 18px; }
.example { padding: 12px 14px; border: 1px solid #dfe9df; border-radius: 10px; color: #2a4033; background: #f9fbf9; cursor: pointer; font: inherit; font-size: 13px; text-align: left; }
.example:hover { border-color: #245c45; }
.example:disabled { cursor: progress; opacity: .6; }
.assistant-log { display: grid; gap: 12px; max-height: 60vh; margin: 6px 0 16px; padding-right: 4px; overflow-y: auto; }
.turn { max-width: 86%; padding: 12px 14px; border: 1px solid #e4ebe4; border-radius: 12px; background: #fff; }
.turn.user { justify-self: end; border-color: #cfe0d4; background: #f1f7f2; }
.turn-author { margin: 0 0 4px; color: #77837b; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.turn-text { margin: 0; color: #23352b; font-size: 14px; line-height: 1.55; overflow-wrap: anywhere; white-space: pre-wrap; }
.turn-sources { margin-top: 10px; color: #45594c; font-size: 12px; }
.turn-sources summary { cursor: pointer; font-weight: 650; }
.turn-sources ul { display: grid; gap: 6px; margin: 8px 0 0; padding: 0; list-style: none; }
.turn-sources li { overflow-wrap: anywhere; }
.assistant-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 10px; }
.assistant-form textarea { min-height: 44px; padding: 10px 12px; border: 1px solid #d8e1d9; border-radius: 10px; color: #27392f; font: inherit; resize: vertical; }
@media (max-width: 640px) { .assistant-examples { grid-template-columns: 1fr; } .turn { max-width: 100%; } .assistant-form { grid-template-columns: 1fr; } }
</style>
