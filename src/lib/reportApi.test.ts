import { describe, expect, it } from 'vitest'
import { sendReport } from './reportApi'

const payload = {
  reportPdf: new Blob(['pdf'], { type: 'application/pdf' }),
  to: 'to@example.com',
  cc: [],
  bcc: 'me@example.com',
}

describe('reportApi mock', () => {
  it('simule un code valide', async () => {
    await expect(sendReport({ ...payload, accessCode: 'OK-1' })).resolves.toEqual({
      ok: true,
      message: 'Demande de transmission confiée au prestataire e-mail.',
    })
  })

  it('simule un code déjà consommé', async () => {
    await expect(sendReport({ ...payload, accessCode: 'USED-1' })).resolves.toMatchObject({ ok: false, reason: 'used' })
  })

  it('simule un code invalide', async () => {
    await expect(sendReport({ ...payload, accessCode: 'INVALID-1' })).resolves.toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('simule une erreur de transmission', async () => {
    await expect(sendReport({ ...payload, accessCode: 'ERROR-1' })).resolves.toMatchObject({ ok: false, reason: 'error' })
  })
})
