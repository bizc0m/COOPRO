import type { ReportForm, ReportPhoto } from '../types'
import { MAX_PHOTOS } from './constants'

export type ValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function compactCc(form: ReportForm): string[] {
  return [form.cc1.trim(), form.cc2.trim()].filter(Boolean)
}

export function validateReportForm(
  form: ReportForm,
  photos: ReportPhoto[],
): ValidationResult {
  const fieldResult = validateReportFields(form)
  const errors = { ...fieldResult.errors }

  if (photos.length < 1) errors.photos = 'Au moins une photo requise'
  if (photos.length > MAX_PHOTOS) errors.photos = 'Maximum 5 photos'

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateReportFields(form: ReportForm): ValidationResult {
  const errors: Record<string, string> = {}

  if (!form.address.trim()) errors.address = 'Adresse requise'
  if (!form.zone.trim()) errors.zone = 'Zone requise'
  if (!form.problemType) errors.problemType = 'Type requis'
  if (!form.description.trim()) errors.description = 'Description requise'
  if (!isValidEmail(form.to)) errors.to = 'E-mail principal invalide'
  if (form.cc1.trim() && !isValidEmail(form.cc1)) errors.cc1 = 'Copie invalide'
  if (form.cc2.trim() && !isValidEmail(form.cc2)) errors.cc2 = 'Copie invalide'
  if (!isValidEmail(form.bcc)) errors.bcc = 'E-mail personnel invalide'

  return { valid: Object.keys(errors).length === 0, errors }
}
