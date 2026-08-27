import { describe, expect, it } from 'vitest'
import { MAX_PDF_BYTES } from './constants'
import { formatBytes, isPdfUnderLimit } from './pdf'

describe('pdf', () => {
  it('calcule la limite de poids PDF', () => {
    expect(isPdfUnderLimit(MAX_PDF_BYTES)).toBe(true)
    expect(isPdfUnderLimit(MAX_PDF_BYTES + 1)).toBe(false)
  })

  it('formate le poids PDF en Mo', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 Mo')
  })
})
