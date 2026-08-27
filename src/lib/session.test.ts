import { describe, expect, it, vi } from 'vitest'
import { clearSession, createEmptySession } from './session'

describe('session', () => {
  it('efface la session et révoque le PDF local', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const cleared = clearSession({
      ...createEmptySession(),
      form: { ...createEmptySession().form, address: 'Adresse' },
      photos: [{ id: '1', blob: new Blob(['jpg']), dataUrl: 'data:image/jpeg;base64,aaa', caption: '', size: 3 }],
      pdf: { blob: new Blob(['pdf']), url: 'blob:test', size: 3, reportRef: 'COOPRO-1' },
      pdfPreviewed: true,
      confirmed: true,
    })

    expect(revoke).toHaveBeenCalledWith('blob:test')
    expect(cleared.form.address).toBe('')
    expect(cleared.photos).toEqual([])
    expect(cleared.pdf).toBeNull()
    expect(cleared.pdfPreviewed).toBe(false)
    expect(cleared.confirmed).toBe(false)
    revoke.mockRestore()
  })
})
