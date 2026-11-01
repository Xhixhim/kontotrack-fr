import type { Locale } from '@/lib/locale'

export interface AuthMessages {
  title: string
  intro: string
  email: string
  password: string
  showPassword: string
  hidePassword: string
  forgot: string
  forgotHelp: string
  remember: string
  submit: string
  submitting: string
  emailInvalid: string
  passwordRequired: string
  wrongTitle: string
  wrongText: string
  throttledTitle: string
  throttledText: string
  offlineTitle: string
  offlineText: string
  codeTitle: string
  codeIntro: (email: string) => string
  codeLabel: (position: number) => string
  codeGroup: string
  codeInvalid: string
  codeIncomplete: string
  recoveryTitle: string
  recoveryIntro: string
  recoveryLabel: string
  recoveryInvalid: string
  useRecovery: string
  useApp: string
  verify: string
  verifying: string
  back: string
  footnote: string
  sideTitle: string[]
  sideToday: string
  sideExample: string
  sideItems: { business: string; text: string; severity: 'c' | 'w' | 'o' }[]
  backHome: string
}

const sq: AuthMessages = {
  title: 'Hyr në KontoTrack',
  intro: 'Përdor emailin me të cilin të ftoi zyra ose kontabilisti yt.',
  email: 'Email',
  password: 'Fjalëkalimi',
  showPassword: 'Shfaq fjalëkalimin',
  hidePassword: 'Fshih fjalëkalimin',
  forgot: 'Ke harruar fjalëkalimin?',
  forgotHelp: 'Llogaritë krijohen nga zyra e kontabilitetit. Kërkoji administratorit të zyrës të ta rivendosë fjalëkalimin.',
  remember: 'Më mbaj të kyçur në këtë pajisje',
  submit: 'Hyr',
  submitting: 'Po hyn…',
  emailInvalid: 'Shkruaj një email të vlefshëm, p.sh. arben@zyra.com.',
  passwordRequired: 'Shkruaj fjalëkalimin.',
  wrongTitle: 'Email ose fjalëkalim i pasaktë',
  wrongText: 'Kontrolloji të dyja dhe provo sërish. Pas 6 tentativave brenda një minute hyrja ndalet përkohësisht.',
  throttledTitle: 'Shumë tentativa',
  throttledText: 'Prit një minutë dhe provo sërish.',
  offlineTitle: 'Serveri nuk u përgjigj',
  offlineText: 'Kontrollo lidhjen me internetin. Nëse vazhdon, njofto administratorin e zyrës.',
  codeTitle: 'Shkruaj kodin me 6 shifra',
  codeIntro: (email) => `Hap aplikacionin e autentifikimit për KontoTrack (${email}).`,
  codeLabel: (position) => `Shifra ${position} nga 6`,
  codeGroup: 'Kodi me 6 shifra',
  codeInvalid: 'Kodi nuk është i vlefshëm. Kodet ndryshojnë çdo 30 sekonda; provo më të riun.',
  codeIncomplete: 'Shkruaj të 6 shifrat.',
  recoveryTitle: 'Përdor një kod rezervë',
  recoveryIntro: 'Kodet rezervë i more kur aktivizove hyrjen me dy hapa. Secili përdoret vetëm një herë.',
  recoveryLabel: 'Kodi rezervë',
  recoveryInvalid: 'Ky kod rezervë nuk është i vlefshëm ose është përdorur.',
  useRecovery: 'Përdor një kod rezervë',
  useApp: 'Përdor aplikacionin e autentifikimit',
  verify: 'Verifiko dhe vazhdo',
  verifying: 'Po verifikohet…',
  back: 'Kthehu',
  footnote: 'Çdo hyrje regjistrohet në gjurmën e auditimit.',
  sideTitle: ['Mëngjesi yt,', 'i renditur që tani.'],
  sideToday: 'Kërkon vëmendjen tënde sot',
  sideExample: 'Të dhëna shembull',
  sideItems: [
    { business: 'Berberi Trading SH.P.K.', text: 'Pagesa do ta çonte arkën në −84,20 €', severity: 'c' },
    { business: 'Libraria Dukagjini B.I.', text: 'Banka ndryshon nga librat me 1.000,00 €', severity: 'c' },
    { business: 'Market Arbëri SH.P.K.', text: 'Lista WM më 15.11 · pagat pa miratuar', severity: 'w' },
    { business: 'Edhe 21 biznese', text: 'Të gjitha kontrollet në rregull', severity: 'o' },
  ],
  backHome: 'Faqja kryesore',
}

const en: AuthMessages = {
  title: 'Sign in to KontoTrack',
  intro: 'Use the email your office or accountant invited you with.',
  email: 'Email',
  password: 'Password',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  forgot: 'Forgot password?',
  forgotHelp: 'Accounts are created by your accounting office. Ask the office administrator to reset your password.',
  remember: 'Keep me signed in on this device',
  submit: 'Sign in',
  submitting: 'Signing in…',
  emailInvalid: 'Enter a valid email, for example arben@office.com.',
  passwordRequired: 'Enter your password.',
  wrongTitle: 'Wrong email or password',
  wrongText: 'Check both and try again. After 6 attempts within a minute, sign in pauses for a while.',
  throttledTitle: 'Too many attempts',
  throttledText: 'Wait a minute and try again.',
  offlineTitle: 'The server did not respond',
  offlineText: 'Check your internet connection. If it keeps happening, tell your office administrator.',
  codeTitle: 'Enter the 6 digit code',
  codeIntro: (email) => `Open your authenticator app for KontoTrack (${email}).`,
  codeLabel: (position) => `Digit ${position} of 6`,
  codeGroup: '6 digit code',
  codeInvalid: 'That code is not valid. Codes change every 30 seconds; try the newest one.',
  codeIncomplete: 'Enter all 6 digits.',
  recoveryTitle: 'Use a recovery code',
  recoveryIntro: 'You received recovery codes when you turned on two factor sign in. Each works once.',
  recoveryLabel: 'Recovery code',
  recoveryInvalid: 'That recovery code is not valid or was already used.',
  useRecovery: 'Use a recovery code instead',
  useApp: 'Use the authenticator app instead',
  verify: 'Verify and continue',
  verifying: 'Verifying…',
  back: 'Back',
  footnote: 'Every sign in is recorded in the audit trail.',
  sideTitle: ['Your morning,', 'already sorted.'],
  sideToday: 'Needs you today',
  sideExample: 'Example data',
  sideItems: [
    { business: 'Berberi Trading SH.P.K.', text: 'A payment would take cash to −84,20 €', severity: 'c' },
    { business: 'Libraria Dukagjini B.I.', text: 'Bank differs from books by 1.000,00 €', severity: 'c' },
    { business: 'Market Arbëri SH.P.K.', text: 'WM list due 15.11 · payroll not approved', severity: 'w' },
    { business: '21 more businesses', text: 'All checks OK', severity: 'o' },
  ],
  backHome: 'Home page',
}

export const authMessages: Record<Locale, AuthMessages> = { sq, en }
