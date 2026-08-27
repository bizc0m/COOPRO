import { ACCESS_CODES_STORAGE_KEY } from './constants'

export type CodeStatus = 'available' | 'used' | 'invalid'

export function parseAccessCodes(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,;]+/)
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  )
}

export function loadStoredCodes(storage: Storage = localStorage): string[] {
  try {
    const raw = storage.getItem(ACCESS_CODES_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((code) => typeof code === 'string') : []
  } catch {
    return []
  }
}

export function saveStoredCodes(codes: string[], storage: Storage = localStorage): void {
  storage.setItem(ACCESS_CODES_STORAGE_KEY, JSON.stringify(codes))
}

export function clearStoredCodes(storage: Storage = localStorage): void {
  storage.removeItem(ACCESS_CODES_STORAGE_KEY)
}

export function codeLabel(status: CodeStatus): string {
  if (status === 'used') return 'Code utilisé'
  if (status === 'invalid') return 'Code invalide'
  return 'Codes disponibles'
}
