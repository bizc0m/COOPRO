export type SendReportPayload = {
  reportPdf: Blob
  accessCode: string
  to: string
  cc: string[]
  bcc: string
}

export type SendReportResult =
  | { ok: true; message: 'Demande de transmission confiée au prestataire e-mail.' }
  | { ok: false; reason: 'used' | 'invalid' | 'error'; message: string }

export async function sendReport(payload: SendReportPayload): Promise<SendReportResult> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const code = payload.accessCode.trim().toUpperCase()
  if (!payload.reportPdf.size || !payload.to || !payload.bcc) {
    return { ok: false, reason: 'error', message: 'Erreur de transmission' }
  }
  if (!code || code.startsWith('INVALID') || code.startsWith('BAD')) {
    return { ok: false, reason: 'invalid', message: 'Code invalide' }
  }
  if (code.startsWith('USED') || code.startsWith('CONSOMME')) {
    return { ok: false, reason: 'used', message: 'Code déjà consommé' }
  }
  if (code.startsWith('ERROR') || code.startsWith('FAIL')) {
    return { ok: false, reason: 'error', message: 'Erreur de transmission' }
  }

  return { ok: true, message: 'Demande de transmission confiée au prestataire e-mail.' }
}
