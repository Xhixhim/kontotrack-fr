import type { Locale } from '@/lib/locale'

type Health = 'critical' | 'warning' | 'ok'

export interface LandingMessages {
  meta: { title: string; description: string }
  nav: { how: string; features: string; roles: string; faq: string; signIn: string; openApp: string; demo: string; menu: string; skip: string }
  hero: { titleLines: string[]; sub: string; cta: string; ctaNote: string; proofStrong: string; proofText: string }
  preview: {
    label: string; title: string; search: string; month: string; nav: string[]; today: string
    summary: { critical: string; warning: string; ok: string }
    columns: { business: string; nui: string; status: string; deadline: string; open: string }
    rows: { name: string; nui: string; health: Health; status: string; deadline: string; open: number }[]
  }
  problem: { title: string; beforeTitle: string; before: string[]; afterTitle: string; after: string[] }
  tagline: string[]
  features: {
    title: string; sub: string
    bank: { title: string; text: string; lines: { text: string; chip: string; amount: number; matched: boolean }[] }
    vat: { title: string; text: string; output: string; input: string; payable: string }
    checks: { title: string; text: string; items: { text: string; severity: 'critical' | 'warning' }[] }
    payroll: { title: string; text: string; gross: string; pension: string }
    close: { title: string; text: string; items: { text: string; chip: string; passed: boolean }[] }
  }
  steps: { title: string; label: string; items: { title: string; text: string }[] }
  roles: { title: string; sub: string; items: { title: string; text: string }[] }
  testimonialsTitle: string
  faq: { title: string; sub: string; items: { q: string; a: string }[] }
  demo: {
    title: string; text: string; name: string; email: string; count: string; submit: string
    nameRequired: string; emailRequired: string; emailInvalid: string
    opened: (name: string) => string; openedNote: string; notConfigured: string
  }
  footer: { privacy: string; terms: string; signIn: string }
}

const sq: LandingMessages = {
  meta: {
    title: 'KontoTrack · Kontabilitet për zyrat që mbajnë shumë biznese',
    description: 'Programi i kontabilitetit për kontabilistët në Kosovë: TVSH, lista WM, rakordimi i bankës dhe mbyllja e muajit për çdo B.I. dhe SH.P.K.',
  },
  nav: { how: 'Si funksionon', features: 'Veçoritë', roles: 'Për kë', faq: 'Pyetje', signIn: 'Hyr', openApp: 'Hap KontoTrack', demo: 'Kërko demo', menu: 'Menyja', skip: 'Kalo te përmbajtja' },
  hero: {
    titleLines: ['Mbaj librat e 50 bizneseve', 'pa humbur asnjë afat'],
    sub: 'KontoTrack është programi i kontabilitetit për kontabilistët në Kosovë. TVSH, lista WM, rakordimi i bankës dhe mbyllja e muajit për çdo B.I. dhe SH.P.K. që menaxhon, në një vend.',
    cta: 'Kërko një demonstrim 30 minutësh',
    ctaNote: 'E shohim bashkë në një nga bizneset tuaja',
    proofStrong: 'Gati për ATK.',
    proofText: 'Librat e shitjeve dhe blerjeve në modelin zyrtar Excel të ATK, kutitë e deklaratës të llogaritura dhe lista WM për EDI.',
  },
  preview: {
    label: 'Pamje e KontoTrack: lista e bizneseve me gjendjen e secilit',
    title: 'Bizneset e mia', search: 'Kërko me emër ose NUI', month: 'Nëntor 2026',
    nav: ['Bizneset', 'Afatet', 'Njoftimet', 'Kërkesat për dokumente'], today: 'Sot:',
    summary: { critical: '2 kritike', warning: '2 paralajmërime', ok: '2 në rregull' },
    columns: { business: 'Biznesi', nui: 'NUI', status: 'Gjendja', deadline: 'Afati i radhës', open: 'Të hapura' },
    rows: [
      { name: 'Berberi Trading SH.P.K.', nui: '811234567', health: 'critical', status: 'Arka do të shkonte në negativ', deadline: '15.11 · WM', open: 3 },
      { name: 'Libraria Dukagjini B.I.', nui: '812003517', health: 'critical', status: 'Banka ndryshon 1.000,00 €', deadline: '20.11 · TVSH', open: 2 },
      { name: 'Market Arbëri SH.P.K.', nui: '811345672', health: 'warning', status: '3 fatura pa dokument', deadline: '15.11 · WM', open: 1 },
      { name: 'Kafe Rruga B B.I.', nui: '811776203', health: 'warning', status: 'Pagat pa miratuar', deadline: '15.11 · WM', open: 0 },
      { name: 'Dardania Dental B.I.', nui: '812098341', health: 'ok', status: 'Tetori i mbyllur', deadline: '20.11 · TVSH', open: 0 },
      { name: 'Ndërtimi Gashi SH.P.K.', nui: '811450098', health: 'ok', status: 'Të gjitha në rregull', deadline: '20.11 · TVSH', open: 0 },
    ],
  },
  problem: {
    title: 'Tridhjetë klientë nuk duhet të thotë tridhjetë skedarë Excel',
    beforeTitle: 'Sot',
    before: [
      'Afatet e TVSH më 20 dhe të listës WM më 15 mbahen në mend ose në kalendar letre.',
      'Arkën negative e zbulon vetëm kur muaji është mbyllur.',
      'Pasqyrat e bankës përputhen rresht për rresht, me dorë.',
      'Pronarët dërgojnë faturat në WhatsApp dhe askush nuk e di çfarë mungon ende.',
    ],
    afterTitle: 'Me KontoTrack',
    after: [
      'Një listë e të gjitha bizneseve, e renditur sipas asaj që kërkon vëmendjen tënde sot.',
      '13 kontrolle automatike punojnë çdo ditë dhe të çojnë direkt te rregullimi.',
      'Rreshtat e bankës që përputhen me librat rakordohen vetë.',
      'Pronarët ngarkojnë dokumentet në portal dhe shohin çfarë të duhet ende.',
    ],
  },
  tagline: ['Çdo mëngjes e di', 'cili biznes ka nevojë për ty', 'dhe pse.'],
  features: {
    title: 'Puna e muajit, e renditur që në fillim',
    sub: 'E ndërtuar sipas rregullave të Kosovës: TVSH 18% dhe 8%, pensioni 5% plus 5%, plani kontabël i Kosovës në klasat 1 deri 6.',
    bank: {
      title: 'Rakordimi i bankës në minuta',
      text: 'Importo pasqyrën si .xlsx ose .csv. Rreshtat që përputhen me librat rakordohen vetë; të tjerët marrin një kategori të sugjeruar nga rregullat e tua, dhe me një klikim regjistrohen në libër.',
      lines: [
        { text: 'Pagesa nga Market Arbëri FSH-2026-0127', chip: 'Rakorduar', amount: 1250.5, matched: true },
        { text: 'Qiraja qershor, Rr. Agim Ramadani', chip: 'Sugjeruar: qira', amount: -300, matched: false },
        { text: 'Komision bankar ProCredit', chip: 'Sugjeruar: komision', amount: -1.2, matched: false },
      ],
    },
    vat: { title: 'Deklarata e TVSH gati për ATK', text: 'Problemet për t’u rregulluar listohen të parat. Pastaj totalet e kutive dhe librat zyrtarë Excel.', output: 'TVSH e shitjeve [30]', input: 'TVSH e zbritshme [67]', payable: 'Për pagesë deri 20.11' },
    checks: {
      title: 'Kontrolle që kapin gabimet',
      text: 'Arka negative, banka kundrejt librave, faturat pa dokument, kufiri i regjistrimit në TVSH.',
      items: [
        { text: 'Pagesa do ta çonte arkën në −84,20 €', severity: 'critical' },
        { text: '3 fatura furnitori pa dokument', severity: 'warning' },
      ],
    },
    payroll: { title: 'Pagat dhe lista WM', text: 'Bruto, pensioni, tatimi në paga dhe neto për çdo punëtor. Miratimi regjistron në libër dhe eksporton listën WM për EDI.', gross: 'Bruto', pension: 'Pensioni 5% + 5%' },
    close: {
      title: 'Muaji i mbyllur mbetet i mbyllur',
      text: 'Mbyllja e muajit kalon një listë kontrolli për ditarin, dokumentet, bankën, arkën, TVSH, pagat dhe stokun. Rihapja kërkon arsye dhe miratimin e pronarit, dhe çdo hap ruhet në histori.',
      items: [
        { text: 'Ditari: 214 regjistrime të postuara, asnjë draft', chip: 'Kaloi', passed: true },
        { text: 'Banka: 4 rreshta pa kategori', chip: 'Bllokon', passed: false },
      ],
    },
  },
  steps: {
    title: 'Nga klienti i ri te deklarata e dorëzuar',
    label: 'Hapi',
    items: [
      { title: 'Shto biznesin', text: 'Shkruaj NUI, zgjidh B.I. ose SH.P.K. dhe nis nga plani kontabël i Kosovës.' },
      { title: 'Sill muajin brenda', text: 'Importo pasqyrat e bankës, regjistro faturat pranë PDF të tyre dhe kërkoji pronarit çfarë mungon.' },
      { title: 'Kontrollo, mbyll, dorëzo', text: 'Pastro kontrollet, mbyll muajin dhe shkarko librat për ATK dhe listën WM.' },
    ],
  },
  roles: {
    title: 'Një zyrë, qasja e duhur për secilin',
    sub: 'Rolet caktohen për çdo biznes. Hyrja me dy hapa dhe gjurma e kush ndryshoi çfarë janë standarde.',
    items: [
      { title: 'Kontabilisti', text: 'Punon në të gjitha bizneset e caktuara: regjistron, mbyll muajt, dorëzon deklaratat.' },
      { title: 'Asistenti', text: 'Regjistron dokumente dhe rreshta banke. Nuk mbyll periudha dhe nuk regjistron në muaj të mbyllur.' },
      { title: 'Pronari i biznesit', text: 'Sheh vetëm biznesin e vet në gjuhë të thjeshtë, ngarkon dokumente dhe miraton veprimet e ndjeshme si rihapja e muajit.' },
      { title: 'Auditori', text: 'Vetëm lexim dhe eksport.' },
    ],
  },
  testimonialsTitle: 'Çfarë thonë zyrat e kontabilitetit',
  faq: {
    title: 'Pyetje',
    sub: 'Diçka tjetër? Pyet gjatë demonstrimit.',
    items: [
      { q: 'A funksionon për B.I. dhe SH.P.K.?', a: 'Po. Çdo biznes ka llojin, NUI, planin kontabël, statusin e TVSH dhe përdoruesit e vet.' },
      { q: 'Cilat pasqyra banke mund t’i importoj?', a: 'Çdo eksport .xlsx ose .csv. Njihen emrat e kolonave shqip dhe anglisht si Data, Përshkrimi, Debi dhe Kredi. Skedarët e vjetër .xls ruhen fillimisht si .xlsx.' },
      { q: 'Çfarë i dërgoj ATK?', a: 'KontoTrack përgatit librat e shitjeve dhe blerjeve në modelin zyrtar Excel të ATK, totalet e kutive të deklaratës dhe listën WM. Ti i ngarkon në EDI si zakonisht.' },
      { q: 'Kush i mban të përditësuara normat e TVSH dhe rregullat e pagave?', a: 'Rregullat tatimore kanë versione. Administratori i sistemit fut versionin e ri dhe e miraton para se të zbatohet, kështu muajt e kaluar ruajnë rregullat me të cilat u llogaritën.' },
      { q: 'Çfarë sheh pronari i biznesit?', a: 'Vetëm biznesin e vet, në gjuhë të thjeshtë: çfarë ke kërkuar ti, çfarë ka ngarkuar ai dhe kërkesat që presin miratimin e tij.' },
      { q: 'A mund të rihapet një muaj i mbyllur?', a: 'Vetëm muaji i fundit i mbyllur. Kontabilisti kërkon me arsye, pronari miraton ose refuzon me shënim, dhe kërkesa mbetet në histori.' },
      { q: 'Si mbrohen të dhënat e punëtorëve?', a: 'Numrat personalë dhe IBAN ruhen të enkriptuar dhe shfaqen të fshehur si ••••1234. Hyrja bëhet me dy hapa dhe çdo ndryshim regjistrohet.' },
    ],
  },
  demo: {
    title: 'Shiko muajin tënd në KontoTrack',
    text: 'Një takim 30 minutësh me një nga bizneset tuaja: importi i bankës, kontrollet dhe librat për ATK.',
    name: 'Emri yt', email: 'Email i punës', count: 'Për sa biznese mban libra?', submit: 'Kërko demonstrimin',
    nameRequired: 'Shkruaj emrin tënd.', emailRequired: 'Shkruaj emailin e punës.', emailInvalid: 'Ky email duket i paplotë, p.sh. arta@zyra.com.',
    opened: (name) => `Faleminderit, ${name}. U hap emaili me kërkesën tënde.`,
    openedNote: 'Nëse emaili nuk u hap, shkruaj direkt në adresën më poshtë.',
    notConfigured: 'Adresa e kontaktit nuk është vendosur (VITE_CONTACT_EMAIL).',
  },
  footer: { privacy: 'Politika e privatësisë', terms: 'Kushtet e përdorimit', signIn: 'Hyr' },
}

const en: LandingMessages = {
  meta: {
    title: 'KontoTrack · Bookkeeping for offices that keep many businesses',
    description: 'Bookkeeping software for accountants in Kosovo: VAT, the WM list, bank reconciliation and month end close for every B.I. and SH.P.K.',
  },
  nav: { how: 'How it works', features: 'Features', roles: 'Who it’s for', faq: 'FAQ', signIn: 'Sign in', openApp: 'Open KontoTrack', demo: 'Book a demo', menu: 'Menu', skip: 'Skip to content' },
  hero: {
    titleLines: ['Keep the books of 50 businesses', 'without missing a deadline'],
    sub: 'KontoTrack is bookkeeping software for accountants in Kosovo. VAT, the WM list, bank reconciliation and month end close for every B.I. and SH.P.K. you manage, in one place.',
    cta: 'Book a 30 minute demo',
    ctaNote: 'We show it on one of your own businesses',
    proofStrong: 'ATK ready.',
    proofText: 'Sales and purchase books in the official ATK Excel layout, VAT return boxes calculated, and the WM list exported for EDI.',
  },
  preview: {
    label: 'KontoTrack preview: the list of businesses with the health of each',
    title: 'My businesses', search: 'Search by name or NUI', month: 'November 2026',
    nav: ['Businesses', 'Deadlines', 'Notifications', 'Document requests'], today: 'Today:',
    summary: { critical: '2 critical', warning: '2 warnings', ok: '2 OK' },
    columns: { business: 'Business', nui: 'NUI', status: 'Status', deadline: 'Next deadline', open: 'Open items' },
    rows: [
      { name: 'Berberi Trading SH.P.K.', nui: '811234567', health: 'critical', status: 'Cash would go negative', deadline: '15.11 · WM', open: 3 },
      { name: 'Libraria Dukagjini B.I.', nui: '812003517', health: 'critical', status: 'Bank differs 1.000,00 €', deadline: '20.11 · VAT', open: 2 },
      { name: 'Market Arbëri SH.P.K.', nui: '811345672', health: 'warning', status: '3 bills without document', deadline: '15.11 · WM', open: 1 },
      { name: 'Kafe Rruga B B.I.', nui: '811776203', health: 'warning', status: 'Payroll not approved', deadline: '15.11 · WM', open: 0 },
      { name: 'Dardania Dental B.I.', nui: '812098341', health: 'ok', status: 'October closed', deadline: '20.11 · VAT', open: 0 },
      { name: 'Ndërtimi Gashi SH.P.K.', nui: '811450098', health: 'ok', status: 'All checks OK', deadline: '20.11 · VAT', open: 0 },
    ],
  },
  problem: {
    title: 'Thirty clients should not mean thirty spreadsheets',
    beforeTitle: 'Today',
    before: [
      'Deadlines for VAT on the 20th and WM on the 15th live in your head or a paper calendar.',
      'You find a negative cash balance only when the month is already closed.',
      'Bank statements are matched line by line, by hand.',
      'Owners send bills on WhatsApp and nobody knows what is still missing.',
    ],
    afterTitle: 'With KontoTrack',
    after: [
      'One list of every business, sorted by what needs you today.',
      '13 automatic checks run every day and link straight to the fix.',
      'Imported bank lines that match your books reconcile themselves.',
      'Owners upload documents to a portal and see what you still need.',
    ],
  },
  tagline: ['Every morning you know', 'which business needs you', 'and why.'],
  features: {
    title: 'The month’s work, already sorted',
    sub: 'Built around Kosovo rules: VAT at 18% and 8%, pension 5% plus 5%, the Kosovo chart of accounts in classes 1 to 6.',
    bank: {
      title: 'Bank reconciliation in minutes',
      text: 'Import the statement as .xlsx or .csv. Lines that match your books reconcile on their own; the rest get a category suggested by your rules, and one click books them in the ledger.',
      lines: [
        { text: 'Pagesa nga Market Arbëri FSH-2026-0127', chip: 'Reconciled', amount: 1250.5, matched: true },
        { text: 'Qiraja qershor, Rr. Agim Ramadani', chip: 'Suggested: rent', amount: -300, matched: false },
        { text: 'Komision bankar ProCredit', chip: 'Suggested: bank fees', amount: -1.2, matched: false },
      ],
    },
    vat: { title: 'VAT return, ready for ATK', text: 'Problems to fix are listed first. Then the box totals and the official Excel books.', output: 'Output VAT [30]', input: 'Deductible VAT [67]', payable: 'Payable by 20.11' },
    checks: {
      title: 'Checks that catch mistakes',
      text: 'Negative cash, bank versus books, bills without documents, the VAT registration threshold.',
      items: [
        { text: 'A payment would take cash to −84,20 €', severity: 'critical' },
        { text: '3 supplier bills without document', severity: 'warning' },
      ],
    },
    payroll: { title: 'Payroll and the WM list', text: 'Gross, pension, income tax and net per employee. Approval posts to the ledger and exports the WM list for EDI.', gross: 'Gross', pension: 'Pension 5% + 5%' },
    close: {
      title: 'Closed months stay closed',
      text: 'Month end close runs a checklist across journal, documents, bank, cash, VAT, payroll and stock. Reopening needs a reason and the owner’s approval, and every step is kept in the history.',
      items: [
        { text: 'Journal: 214 entries posted, no drafts', chip: 'Passed', passed: true },
        { text: 'Bank: 4 lines not categorised', chip: 'Blocks', passed: false },
      ],
    },
  },
  steps: {
    title: 'From a new client to a filed return',
    label: 'Step',
    items: [
      { title: 'Add the business', text: 'Enter the NUI, choose B.I. or SH.P.K. and start from the Kosovo chart of accounts.' },
      { title: 'Bring in the month', text: 'Import bank statements, enter sales and purchase bills next to their PDF, and ask the owner for anything missing.' },
      { title: 'Check, close, file', text: 'Clear the checks, close the month and download the ATK books and the WM list.' },
    ],
  },
  roles: {
    title: 'One office, the right access for everyone',
    sub: 'Roles are set per business. Two factor sign in and an audit trail of who changed what come as standard.',
    items: [
      { title: 'Accountant', text: 'Works across all assigned businesses: books, closes months, files returns.' },
      { title: 'Assistant accountant', text: 'Enters documents and bank lines. Cannot close periods or post to closed months.' },
      { title: 'Business owner', text: 'Sees only their own business in plain language, uploads documents and approves sensitive actions such as reopening a month.' },
      { title: 'Auditor', text: 'Read only access and exports.' },
    ],
  },
  testimonialsTitle: 'What accounting offices say',
  faq: {
    title: 'Questions',
    sub: 'Anything else? Ask during the demo.',
    items: [
      { q: 'Does it work for both B.I. and SH.P.K.?', a: 'Yes. Each business has its own type, NUI, chart of accounts, VAT status and users.' },
      { q: 'Which bank statements can I import?', a: 'Any .xlsx or .csv export. Albanian and English column names such as Data, Përshkrimi, Debi and Kredi are recognised. Old .xls files need to be saved as .xlsx first.' },
      { q: 'What do I send to ATK?', a: 'KontoTrack prepares the sales and purchase books in the official ATK Excel layout, the VAT return box totals and the WM list. You upload them in EDI as usual.' },
      { q: 'Who keeps VAT rates and payroll rules up to date?', a: 'Tax rules are versioned. A system administrator enters a new version and approves it before it applies, so past months keep the rules they were calculated with.' },
      { q: 'What does a business owner see?', a: 'Only their own business, in plain language: what you have asked for, what they have uploaded, and requests waiting for their approval.' },
      { q: 'Can a closed month be reopened?', a: 'Only the latest closed month. The accountant asks with a reason, the owner approves or rejects with a note, and the request stays in the history.' },
      { q: 'How is employee data protected?', a: 'Personal numbers and IBANs are encrypted at rest and shown masked as ••••1234. Sign in uses two factors, and every change is logged.' },
    ],
  },
  demo: {
    title: 'See your own month in KontoTrack',
    text: 'A 30 minute call with one of your businesses: bank import, checks and the ATK books.',
    name: 'Your name', email: 'Work email', count: 'How many businesses do you keep books for?', submit: 'Book a demo',
    nameRequired: 'Enter your name.', emailRequired: 'Enter your work email.', emailInvalid: 'This email looks incomplete, for example arta@office.com.',
    opened: (name) => `Thanks, ${name}. Your email app opened with the request.`,
    openedNote: 'If it did not open, write to the address below.',
    notConfigured: 'The contact address is not set (VITE_CONTACT_EMAIL).',
  },
  footer: { privacy: 'Privacy policy', terms: 'Terms of use', signIn: 'Sign in' },
}

export const landingMessages: Record<Locale, LandingMessages> = { sq, en }

/** Optional content that only appears once real facts exist. */
export interface Testimonial { quote: string; name: string; office: string }
export const testimonials: Record<Locale, Testimonial[]> = { sq: [], en: [] }
