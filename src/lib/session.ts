import type { ReportForm, SessionState } from '../types'

export const emptyForm: ReportForm = {
  address: '',
  zone: '',
  problemType: '',
  urgency: 'normal',
  description: '',
  to: '',
  cc1: '',
  cc2: '',
  bcc: '',
}

export function createEmptySession(): SessionState {
  return {
    form: { ...emptyForm },
    photos: [],
    pdf: null,
    pdfPreviewed: false,
    confirmed: false,
    sendStatus: 'idle',
  }
}

export function revokeSessionUrls(session: SessionState): void {
  if (session.pdf?.url) URL.revokeObjectURL(session.pdf.url)
}

export function clearSession(session: SessionState): SessionState {
  revokeSessionUrls(session)
  return createEmptySession()
}
