import type { Locale } from '@/lib/locale'

export type TeamRole = 'owner' | 'accountant' | 'assistant_accountant' | 'auditor'
export type TeamRestriction = 'bookkeeping' | 'documents' | 'audit_trail' | 'payroll'

export interface TeamMessages {
  eyebrow: string
  title: string
  ownerControlled: string
  inviteTitle: string
  inviteNote: string
  email: string
  name: string
  nameHint: string
  role: string
  roles: Record<TeamRole, string>
  roleHelp: Record<Exclude<TeamRole, 'owner'>, string>
  send: string
  sending: string
  status: Record<'active' | 'invited', string>
  restrictionsLabel: string
  restrictions: Record<TeamRestriction, string>
  remove: string
  confirmRemove: (name: string) => string
  empty: string
  loadFailed: string
  inviteFailed: string
  saveFailed: string
}

const sq: TeamMessages = {
  eyebrow: 'Qasja në biznes',
  title: 'Anëtarët e ekipit',
  ownerControlled: 'E menaxhon pronari',
  inviteTitle: 'Fto një person',
  inviteNote: 'Kush ka llogari në KontoTrack e sheh ftesën në panelin e vet dhe duhet ta pranojë. Kush nuk ka llogari, merr një email me lidhje për të vendosur fjalëkalimin.',
  email: 'Email',
  name: 'Emri dhe mbiemri',
  nameHint: 'Nevojitet vetëm nëse personi nuk ka ende llogari.',
  role: 'Roli',
  roles: { owner: 'Pronar', accountant: 'Kontabilist', assistant_accountant: 'Asistent kontabël', auditor: 'Auditor / vetëm lexim' },
  roleHelp: {
    accountant: 'Regjistron dhe ndryshon të gjitha të dhënat kontabël.',
    assistant_accountant: 'Ngarkon dokumente dhe sheh të dhënat; nuk poston regjistrime.',
    auditor: 'Vetëm lexim dhe eksport.',
  },
  send: 'Dërgo ftesën',
  sending: 'Po dërgohet…',
  status: { active: 'Aktiv', invited: 'I ftuar' },
  restrictionsLabel: 'Hiq nga ky anëtar',
  restrictions: { bookkeeping: 'Ndryshimin e të dhënave kontabël', documents: 'Ngarkimin e dokumenteve', audit_trail: 'Historikun e ndryshimeve', payroll: 'Pagat dhe punëtorët' },
  remove: 'Hiqe nga biznesi',
  confirmRemove: (name) => `${name} nuk do të ketë më qasje në këtë biznes. Të hiqet?`,
  empty: 'Nuk u gjet asnjë anëtar.',
  loadFailed: 'Anëtarët nuk u ngarkuan.',
  inviteFailed: 'Ftesa nuk u dërgua.',
  saveFailed: 'Ndryshimi nuk u ruajt.',
}

const en: TeamMessages = {
  eyebrow: 'Business access',
  title: 'Team members',
  ownerControlled: 'Owner controlled',
  inviteTitle: 'Invite a person',
  inviteNote: 'Someone with a KontoTrack account sees the invitation in their workspace and must accept it. Someone without an account receives an email with a link to choose a password.',
  email: 'Email',
  name: 'Full name',
  nameHint: 'Only needed when the person has no account yet.',
  role: 'Role',
  roles: { owner: 'Owner', accountant: 'Bookkeeper', assistant_accountant: 'Assistant bookkeeper', auditor: 'Auditor / view only' },
  roleHelp: {
    accountant: 'Records and changes all bookkeeping data.',
    assistant_accountant: 'Uploads documents and views data; does not post entries.',
    auditor: 'Read and export only.',
  },
  send: 'Send invitation',
  sending: 'Sending…',
  status: { active: 'Active', invited: 'Invited' },
  restrictionsLabel: 'Take away from this member',
  restrictions: { bookkeeping: 'Changing bookkeeping data', documents: 'Uploading documents', audit_trail: 'Change history', payroll: 'Payroll and employees' },
  remove: 'Remove from business',
  confirmRemove: (name) => `${name} will no longer have access to this business. Remove?`,
  empty: 'No team members were found.',
  loadFailed: 'The team could not be loaded.',
  inviteFailed: 'The invitation was not sent.',
  saveFailed: 'The change was not saved.',
}

export const teamMessages: Record<Locale, TeamMessages> = { sq, en }
