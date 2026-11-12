import type { Locale } from '@/lib/locale'

export interface AccountMessages {
  backToSignIn: string
  email: string
  forgotTitle: string
  forgotIntro: string
  forgotSubmit: string
  forgotSent: string
  resetTitle: string
  invitedTitle: string
  resetIntro: (email: string) => string
  newPassword: string
  confirmPassword: string
  passwordHint: string
  resetSubmit: string
  resetDone: string
  signIn: string
  linkBroken: string
  requestNewLink: string
  mismatch: string
  tooWeak: string
  throttled: string
  failed: string
  sending: string
  changeEyebrow: string
  changeTitle: string
  changeNote: string
  currentPassword: string
  changeSubmit: string
  changeDone: string
  changeFailed: string
  cancel: string
  usersEyebrow: string
  usersTitle: string
  usersIntro: string
  usersBack: string
  usersNew: string
  usersNewNote: string
  name: string
  administrator: string
  usersCreate: string
  usersLoadFailed: string
  usersSaveFailed: string
  usersEmpty: string
  usersBusinesses: (count: number) => string
  usersNeverSignedIn: string
  usersTwoFactor: string
  usersActive: string
  usersDeactivated: string
  usersDeactivate: string
  usersReactivate: string
  usersMakeAdmin: string
  usersRemoveAdmin: string
  usersYou: string
  usersConfirmDeactivate: (name: string) => string
}

const sq: AccountMessages = {
  backToSignIn: 'Kthehu te hyrja',
  email: 'Email',
  forgotTitle: 'Ke harruar fjalëkalimin?',
  forgotIntro: 'Shkruaj emailin e llogarisë. Të dërgojmë një lidhje për të vendosur fjalëkalim të ri.',
  forgotSubmit: 'Dërgo lidhjen',
  forgotSent: 'Nëse ky email ka llogari në KontoTrack, lidhja u dërgua. Kontrollo edhe dosjen Spam. Lidhja vlen 60 minuta.',
  resetTitle: 'Vendos fjalëkalim të ri',
  invitedTitle: 'Mirë se erdhe në KontoTrack',
  resetIntro: (email) => `Zgjidh fjalëkalimin për ${email}.`,
  newPassword: 'Fjalëkalimi i ri',
  confirmPassword: 'Përsërit fjalëkalimin',
  passwordHint: 'Së paku 10 shenja, me shkronja dhe numra.',
  resetSubmit: 'Ruaj fjalëkalimin',
  resetDone: 'Fjalëkalimi u ruajt. Tani mund të hysh.',
  signIn: 'Hyr',
  linkBroken: 'Kjo lidhje nuk është e plotë. Hape lidhjen nga emaili ose kërko një të re.',
  requestNewLink: 'Kërko lidhje të re',
  mismatch: 'Dy fjalëkalimet nuk përputhen.',
  tooWeak: 'Fjalëkalimi duhet të ketë së paku 10 shenja, me shkronja dhe numra.',
  throttled: 'Shumë përpjekje. Prit një minutë dhe provo përsëri.',
  failed: 'Nuk u krye. Kontrollo lidhjen me internetin dhe provo përsëri.',
  sending: 'Po dërgohet…',
  changeEyebrow: 'Siguria e llogarisë',
  changeTitle: 'Ndrysho fjalëkalimin',
  changeNote: 'Pas ndryshimit, pajisjet e tjera ku je kyçur dalin nga llogaria.',
  currentPassword: 'Fjalëkalimi aktual',
  changeSubmit: 'Ndrysho fjalëkalimin',
  changeDone: 'Fjalëkalimi u ndryshua.',
  changeFailed: 'Fjalëkalimi nuk u ndryshua.',
  cancel: 'Anulo',
  usersEyebrow: 'Administrimi i sistemit',
  usersTitle: 'Përdoruesit',
  usersIntro: 'Hap llogari, çaktivizo ato që nuk duhen më dhe cakto administratorët e sistemit. Qasja në një biznes jepet nga pronari i atij biznesi.',
  usersBack: '← Paneli',
  usersNew: 'Përdorues i ri',
  usersNewNote: 'Personi merr një email me lidhje për të vendosur fjalëkalimin.',
  name: 'Emri dhe mbiemri',
  administrator: 'Administrator i sistemit',
  usersCreate: 'Hap llogarinë',
  usersLoadFailed: 'Përdoruesit nuk u ngarkuan.',
  usersSaveFailed: 'Ndryshimi nuk u ruajt.',
  usersEmpty: 'Nuk ka përdorues.',
  usersBusinesses: (count) => (count === 1 ? '1 biznes' : `${count} biznese`),
  usersNeverSignedIn: 'Nuk ka vendosur ende fjalëkalim',
  usersTwoFactor: 'Hyrje me dy hapa',
  usersActive: 'Aktiv',
  usersDeactivated: 'I çaktivizuar',
  usersDeactivate: 'Çaktivizo',
  usersReactivate: 'Aktivizo',
  usersMakeAdmin: 'Bëje administrator',
  usersRemoveAdmin: 'Hiqe si administrator',
  usersYou: 'ti',
  usersConfirmDeactivate: (name) => `${name} nuk do të mund të hyjë më dhe del nga të gjitha pajisjet. Të çaktivizohet?`,
}

const en: AccountMessages = {
  backToSignIn: 'Back to sign in',
  email: 'Email',
  forgotTitle: 'Forgot your password?',
  forgotIntro: 'Enter the email of your account. We will send you a link to choose a new password.',
  forgotSubmit: 'Send the link',
  forgotSent: 'If this email has a KontoTrack account, the link has been sent. Check the spam folder too. The link is valid for 60 minutes.',
  resetTitle: 'Choose a new password',
  invitedTitle: 'Welcome to KontoTrack',
  resetIntro: (email) => `Choose the password for ${email}.`,
  newPassword: 'New password',
  confirmPassword: 'Repeat the password',
  passwordHint: 'At least 10 characters, with letters and numbers.',
  resetSubmit: 'Save password',
  resetDone: 'Your password has been saved. You can sign in now.',
  signIn: 'Sign in',
  linkBroken: 'This link is incomplete. Open the link from the email again or ask for a new one.',
  requestNewLink: 'Ask for a new link',
  mismatch: 'The two passwords do not match.',
  tooWeak: 'The password needs at least 10 characters, with letters and numbers.',
  throttled: 'Too many attempts. Wait a minute and try again.',
  failed: 'That did not work. Check your connection and try again.',
  sending: 'Sending…',
  changeEyebrow: 'Account security',
  changeTitle: 'Change password',
  changeNote: 'After the change, other devices where you are signed in are signed out.',
  currentPassword: 'Current password',
  changeSubmit: 'Change password',
  changeDone: 'Your password has been changed.',
  changeFailed: 'The password was not changed.',
  cancel: 'Cancel',
  usersEyebrow: 'System administration',
  usersTitle: 'Users',
  usersIntro: 'Create accounts, deactivate the ones no longer needed and choose the system administrators. Access to a business is given by the owner of that business.',
  usersBack: '← Dashboard',
  usersNew: 'New user',
  usersNewNote: 'The person receives an email with a link to choose a password.',
  name: 'Full name',
  administrator: 'System administrator',
  usersCreate: 'Create account',
  usersLoadFailed: 'The users could not be loaded.',
  usersSaveFailed: 'The change was not saved.',
  usersEmpty: 'There are no users.',
  usersBusinesses: (count) => (count === 1 ? '1 business' : `${count} businesses`),
  usersNeverSignedIn: 'Has not chosen a password yet',
  usersTwoFactor: 'Two-factor sign-in',
  usersActive: 'Active',
  usersDeactivated: 'Deactivated',
  usersDeactivate: 'Deactivate',
  usersReactivate: 'Reactivate',
  usersMakeAdmin: 'Make administrator',
  usersRemoveAdmin: 'Remove administrator',
  usersYou: 'you',
  usersConfirmDeactivate: (name) => `${name} will no longer be able to sign in and is signed out of every device. Deactivate?`,
}

export const accountMessages: Record<Locale, AccountMessages> = { sq, en }
