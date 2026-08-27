import { describe, expect, it } from 'vitest'
import { ACCESS_CODES_STORAGE_KEY } from './constants'
import { clearStoredCodes, codeLabel, loadStoredCodes, parseAccessCodes, saveStoredCodes } from './codes'

describe('codes', () => {
  function createStorage(): Storage {
    const values = new Map<string, string>()
    return {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => Array.from(values.keys())[index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    }
  }

  it('parse et déduplique les codes collés', () => {
    expect(parseAccessCodes('OK-1\nOK-2, OK-1;USED-1')).toEqual(['OK-1', 'OK-2', 'USED-1'])
  })

  it('stocke uniquement les codes quand la fonction est appelée explicitement', () => {
    const storage = createStorage()
    clearStoredCodes(storage)
    saveStoredCodes(['OK-1'], storage)
    expect(loadStoredCodes(storage)).toEqual(['OK-1'])
    expect(storage.getItem(ACCESS_CODES_STORAGE_KEY)).toBe(JSON.stringify(['OK-1']))
    clearStoredCodes(storage)
    expect(loadStoredCodes(storage)).toEqual([])
  })

  it('expose les libellés demandés', () => {
    expect(codeLabel('available')).toBe('Codes disponibles')
    expect(codeLabel('used')).toBe('Code utilisé')
    expect(codeLabel('invalid')).toBe('Code invalide')
  })
})
