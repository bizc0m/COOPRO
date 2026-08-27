export type ProblemType =
  | 'eau'
  | 'humidite'
  | 'fissure'
  | 'electricite'
  | 'chauffage'
  | 'acces'
  | 'securite'
  | 'facade'
  | 'autre'

export type Urgency = 'normal' | 'a-traiter' | 'urgent'

export type Step = 'start' | 'form' | 'camera' | 'preview' | 'sent'

export type ReportForm = {
  address: string
  zone: string
  problemType: ProblemType | ''
  urgency: Urgency
  description: string
  to: string
  cc1: string
  cc2: string
  bcc: string
}

export type ReportPhoto = {
  id: string
  blob: Blob
  dataUrl: string
  caption: string
  size: number
}

export type GeneratedPdf = {
  blob: Blob
  url: string
  size: number
  reportRef: string
}

export type SendStatus =
  | 'idle'
  | 'sending'
  | 'success'
  | 'used'
  | 'invalid'
  | 'error'

export type SessionState = {
  form: ReportForm
  photos: ReportPhoto[]
  pdf: GeneratedPdf | null
  pdfPreviewed: boolean
  confirmed: boolean
  sendStatus: SendStatus
}
