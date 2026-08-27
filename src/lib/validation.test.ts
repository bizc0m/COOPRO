import { describe, expect, it } from 'vitest'
import type { ReportForm, ReportPhoto } from '../types'
import { isValidEmail, validateReportFields, validateReportForm } from './validation'

const validForm: ReportForm = {
  address: '12 rue Test',
  zone: 'Bâtiment A',
  problemType: 'eau',
  urgency: 'normal',
  description: 'Fuite visible sous plafond.',
  to: 'syndic@example.com',
  cc1: 'copie@example.com',
  cc2: '',
  bcc: 'declarant@example.com',
}

const photo = { id: '1', blob: new Blob(['jpg'], { type: 'image/jpeg' }), dataUrl: 'data:image/jpeg;base64,aaa', caption: '', size: 3 } satisfies ReportPhoto

describe('validation', () => {
  it('valide les e-mails simples et refuse les valeurs invalides', () => {
    expect(isValidEmail('a@b.fr')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('not-an-email')).toBe(false)
  })

  it('valide un formulaire complet avec une photo', () => {
    expect(validateReportForm(validForm, [photo]).valid).toBe(true)
  })

  it('valide les champs avant caméra sans exiger de photo', () => {
    expect(validateReportFields(validForm).valid).toBe(true)
  })

  it('signale les champs requis et impose au moins une photo', () => {
    const result = validateReportForm({ ...validForm, address: '', to: 'bad' }, [])
    expect(result.valid).toBe(false)
    expect(result.errors.address).toBe('Adresse requise')
    expect(result.errors.to).toBe('E-mail principal invalide')
    expect(result.errors.photos).toBe('Au moins une photo requise')
  })

  it('refuse plus de 5 photos', () => {
    const result = validateReportForm(validForm, Array.from({ length: 6 }, (_, index) => ({ ...photo, id: String(index) })))
    expect(result.errors.photos).toBe('Maximum 5 photos')
  })
})
