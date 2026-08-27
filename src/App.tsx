import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReportPhoto, SessionState, Step } from './types'
import { MAX_PDF_BYTES, MAX_PHOTOS } from './lib/constants'
import { clearStoredCodes, loadStoredCodes, parseAccessCodes, saveStoredCodes } from './lib/codes'
import { canAddPhoto, compressPhoto, blobToDataUrl, stopMediaStream } from './lib/photos'
import { formatBytes, generateReportPdf, isPdfUnderLimit } from './lib/pdf'
import { sendReport } from './lib/reportApi'
import { clearSession, createEmptySession, revokeSessionUrls } from './lib/session'
import { compactCc, validateReportFields, validateReportForm } from './lib/validation'

type VisualVariant = '1' | '2' | '3'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
      {label}
      {children}
      {error ? <span className="text-sm normal-case tracking-normal text-red-700">{error}</span> : null}
    </label>
  )
}

function settingsMailto(form: SessionState['form']): string {
  const body = [
    'Réglages COOPRO',
    '',
    `Adresse / immeuble : ${form.address || '-'}`,
    `Zone : ${form.zone || '-'}`,
    `Destinataire Principal : ${form.to || '-'}`,
    `Copie (CC) : ${[form.cc1, form.cc2].filter(Boolean).join(', ') || '-'}`,
    `Copie Cachée (CCI) : ${form.bcc || '-'}`,
  ].join('\n')

  return `mailto:${encodeURIComponent(form.bcc)}?subject=${encodeURIComponent('Réglages COOPRO')}&body=${encodeURIComponent(body)}`
}

function VariantSwitch({
  variant,
  onChange,
}: {
  variant: VisualVariant
  onChange: (variant: VisualVariant) => void
}) {
  return (
    <div className="variant-switch" aria-label="Variantes visuelles">
      {(['1', '2', '3'] as VisualVariant[]).map((value) => (
        <button
          className={variant === value ? 'active' : ''}
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={variant === value}
        >
          {value}
        </button>
      ))}
    </div>
  )
}

function StepRail({ step }: { step: Step }) {
  const steps: Array<{ value: Step; label: string }> = [
    { value: 'form', label: 'Infos' },
    { value: 'camera', label: 'Photos' },
    { value: 'preview', label: 'PDF' },
    { value: 'sent', label: 'Envoi' },
  ]

  return (
    <nav className="steprail" aria-label="Étapes">
      {steps.map((item, index) => (
        <span className={item.value === step ? 'current' : ''} key={item.value}>
          {index + 1}. {item.label}
        </span>
      ))}
    </nav>
  )
}

function CameraScreen({
  photos,
  onCapture,
  onRemove,
  onCaption,
  onDone,
  variant,
  onVariantChange,
}: {
  photos: ReportPhoto[]
  onCapture: (photo: ReportPhoto) => void
  onRemove: (id: string) => void
  onCaption: (id: string, caption: string) => void
  onDone: () => void
  variant: VisualVariant
  onVariantChange: (variant: VisualVariant) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function openCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stopMediaStream(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setCameraError('Caméra refusée ou indisponible.')
      }
    }

    openCamera()
    return () => {
      cancelled = true
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  async function capture() {
    const video = videoRef.current
    if (!video || !canAddPhoto(photos.length)) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      const ratio = video.videoWidth / video.videoHeight || 1
      canvas.width = Math.min(video.videoWidth || 1280, 1600)
      canvas.height = Math.round(canvas.width / ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas indisponible')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Capture impossible'))), 'image/jpeg', 0.82)
      })
      const compressed = await compressPhoto(blob)
      onCapture({
        id: crypto.randomUUID(),
        blob: compressed,
        dataUrl: await blobToDataUrl(compressed),
        caption: '',
        size: compressed.size,
      })
    } catch {
      setCameraError('Capture impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen" data-theme={variant}>
      <header className="topbar">
        <div>
          <p className="kicker">Caméra live</p>
          <h1>Photos</h1>
        </div>
        <div className="top-actions">
          <VariantSwitch variant={variant} onChange={onVariantChange} />
          <span className="counter">{photos.length}/{MAX_PHOTOS}</span>
        </div>
      </header>
      <StepRail step="camera" />

      <section className="panel overflow-hidden p-0">
        {cameraError ? (
          <div className="grid min-h-[320px] place-items-center p-6 text-center font-semibold text-red-800">
            {cameraError}
          </div>
        ) : (
          <video ref={videoRef} className="aspect-[3/4] w-full bg-zinc-950 object-cover" autoPlay playsInline muted />
        )}
      </section>

      <button className="primary h-20 text-lg" type="button" onClick={capture} disabled={busy || !canAddPhoto(photos.length)}>
        {busy ? 'Compression...' : 'PRENDRE UNE PHOTO'}
      </button>

      <div className="grid gap-3">
        {photos.map((photo, index) => (
          <article className="panel grid grid-cols-[96px_1fr] gap-3 p-3" key={photo.id}>
            <img className="h-28 w-24 object-cover" src={photo.dataUrl} alt={`Photo ${index + 1}`} />
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <strong>Photo {index + 1}</strong>
                <button className="ghost compact" type="button" onClick={() => onRemove(photo.id)}>
                  Supprimer
                </button>
              </div>
              <input
                className="input"
                value={photo.caption}
                onChange={(event) => onCaption(photo.id, event.target.value)}
                placeholder="Légende courte facultative"
              />
              <span className="text-xs font-semibold text-zinc-500">{formatBytes(photo.size)}</span>
            </div>
          </article>
        ))}
      </div>

      <button className="secondary" type="button" onClick={onDone} disabled={photos.length < 1}>
        Vérifier le rapport
      </button>
    </main>
  )
}

function App() {
  const [step, setStep] = useState<Step>('start')
  const [session, setSession] = useState<SessionState>(() => createEmptySession())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [codes, setCodes] = useState<string[]>([])
  const [codeInput, setCodeInput] = useState('')
  const [rememberCodes, setRememberCodes] = useState(false)
  const [selectedCode, setSelectedCode] = useState('')
  const [variant, setVariant] = useState<VisualVariant>('1')
  const sessionRef = useRef(session)

  const validation = useMemo(
    () => validateReportForm(session.form, session.photos),
    [session.form, session.photos],
  )
  const pdfTooLarge = session.pdf ? !isPdfUnderLimit(session.pdf.size) : false
  const transmitBlockers = [
    !session.pdfPreviewed ? 'Ouvrir le PDF' : '',
    !session.confirmed ? 'Cocher la confirmation' : '',
    !selectedCode ? 'Choisir un code d’accès' : '',
    pdfTooLarge ? 'Réduire le PDF sous 3,5 Mo' : '',
  ].filter(Boolean)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    return () => revokeSessionUrls(sessionRef.current)
  }, [])

  useEffect(() => {
    if (rememberCodes) saveStoredCodes(codes)
  }, [codes, rememberCodes])

  function updateForm(key: keyof SessionState['form'], value: string) {
    setSession((current) => ({
      ...current,
      pdf: null,
      pdfPreviewed: false,
      confirmed: false,
      form: { ...current.form, [key]: value },
    }))
  }

  function addCodes() {
    const next = Array.from(new Set([...codes, ...parseAccessCodes(codeInput)]))
    setCodes(next)
    setCodeInput('')
    if (!selectedCode && next[0]) setSelectedCode(next[0])
  }

  async function createPdf() {
    const result = validateReportForm(session.form, session.photos)
    setErrors(result.errors)
    if (!result.valid) return
    if (session.pdf?.url) URL.revokeObjectURL(session.pdf.url)
    const pdf = await generateReportPdf(session.form, session.photos)
    setSession((current) => ({ ...current, pdf, pdfPreviewed: false, confirmed: false }))
    setStep('preview')
  }

  function openCameraAfterValidation() {
    const result = validateReportFields(session.form)
    setErrors(result.errors)
    if (!result.valid) return
    setStep('camera')
  }

  function resetAll() {
    setSession((current) => clearSession(current))
    setErrors({})
    setCodeInput('')
    setSelectedCode('')
    setStep('start')
  }

  async function transmit() {
    if (!session.pdf || pdfTooLarge || !session.pdfPreviewed || !session.confirmed || !selectedCode) return
    setSession((current) => ({ ...current, sendStatus: 'sending' }))
    const result = await sendReport({
      reportPdf: session.pdf.blob,
      accessCode: selectedCode,
      to: session.form.to.trim(),
      cc: compactCc(session.form),
      bcc: session.form.bcc.trim(),
    })

    if (result.ok) {
      setCodes((current) => current.filter((code) => code !== selectedCode))
      setSession((current) => ({ ...clearSession(current), sendStatus: 'success' }))
      setStep('sent')
      return
    }

    setSession((current) => ({
      ...current,
      sendStatus: result.reason === 'used' ? 'used' : result.reason === 'invalid' ? 'invalid' : 'error',
    }))
  }

  if (step === 'camera') {
    return (
      <CameraScreen
        photos={session.photos}
        onCapture={(photo) => setSession((current) => ({ ...current, photos: [...current.photos, photo], pdf: null }))}
        onRemove={(id) => setSession((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== id), pdf: null }))}
        onCaption={(id, caption) =>
          setSession((current) => ({
            ...current,
            photos: current.photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo)),
            pdf: null,
          }))
        }
        onDone={createPdf}
        variant={variant}
        onVariantChange={setVariant}
      />
    )
  }

  return (
    <main className="screen" data-theme={variant}>
      <header className="topbar">
        <div>
          <p className="kicker">COOPRO — FIELD REPORT</p>
          <h1>Capturer & Signaler</h1>
        </div>
        <div className="top-actions">
          <VariantSwitch variant={variant} onChange={setVariant} />
          {step !== 'start' ? (
            <button className="ghost compact" type="button" onClick={resetAll}>
              Effacer cette session
            </button>
          ) : null}
        </div>
      </header>
      {step !== 'start' ? <StepRail step={step} /> : null}

      {step === 'start' ? (
        <section className="panel grid gap-5">
          <div className="statusline">
            <span>Aucun compte</span>
            <span>PDF local</span>
            <span>Caméra live</span>
          </div>
          <button className="primary h-20 text-lg" type="button" onClick={() => setStep('form')}>
            Nouveau signalement
          </button>
        </section>
      ) : null}

      {step === 'form' ? (
        <section className="grid gap-4">
          <Field label="Email Personnel" error={errors.bcc}>
            <input className="input" inputMode="email" value={session.form.bcc} onChange={(event) => updateForm('bcc', event.target.value)} />
          </Field>
          <Field label="Adresse / immeuble" error={errors.address}>
            <input className="input" value={session.form.address} onChange={(event) => updateForm('address', event.target.value)} />
          </Field>
          <Field label="Zone" error={errors.zone}>
            <input className="input" value={session.form.zone} onChange={(event) => updateForm('zone', event.target.value)} placeholder="Bâtiment, étage, lot, pièce, partie commune" />
          </Field>
          <Field label="Urgence">
            <div className="segmented">
              {[
                ['normal', 'Normal'],
                ['a-traiter', 'À traiter'],
                ['urgent', 'Urgent'],
              ].map(([value, label]) => (
                <button
                  className={session.form.urgency === value ? 'active' : ''}
                  key={value}
                  type="button"
                  onClick={() => updateForm('urgency', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description factuelle" error={errors.description}>
            <textarea className="input min-h-28 resize-none" value={session.form.description} onChange={(event) => updateForm('description', event.target.value)} />
          </Field>
          <Field label="Destinataire Principal" error={errors.to}>
            <input className="input" inputMode="email" value={session.form.to} onChange={(event) => updateForm('to', event.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Copie (CC) 1" error={errors.cc1}>
              <input className="input" inputMode="email" value={session.form.cc1} onChange={(event) => updateForm('cc1', event.target.value)} />
            </Field>
            <Field label="Copie (CC) 2" error={errors.cc2}>
              <input className="input" inputMode="email" value={session.form.cc2} onChange={(event) => updateForm('cc2', event.target.value)} />
            </Field>
          </div>
          {errors.photos ? <p className="notice error">{errors.photos}</p> : null}
          <div className="action-row">
            <button className="primary" type="button" onClick={openCameraAfterValidation}>
              Valider et ouvrir la caméra live
            </button>
            <a className="ghost text-center" href={settingsMailto(session.form)}>
              S’envoyer les réglages par mail
            </a>
          </div>
        </section>
      ) : null}

      {step === 'preview' ? (
        <section className="grid gap-4">
          <div className="panel grid gap-3">
            <p className="kicker">Prévisualisation obligatoire</p>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold">
              <span>PDF</span>
              <span className={pdfTooLarge ? 'text-red-800' : 'text-right'}>{session.pdf ? formatBytes(session.pdf.size) : '-'}</span>
              <span>Limite</span>
              <span className="text-right">{formatBytes(MAX_PDF_BYTES)}</span>
              <span>Destinataire Principal</span>
              <span className="text-right">{session.form.to}</span>
              <span>Copie (CC)</span>
              <span className="text-right">{compactCc(session.form).join(', ') || 'Aucune'}</span>
              <span>Copie Cachée (CCI)</span>
              <span className="text-right">{session.form.bcc}</span>
            </div>
            {pdfTooLarge ? <p className="notice error">Transmission bloquée : PDF supérieur à 3,5 Mo.</p> : null}
            {session.pdf ? (
              <div className="action-row">
                <a
                  className="secondary text-center"
                  href={session.pdf.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setSession((current) => ({ ...current, pdfPreviewed: true }))}
                >
                  Ouvrir le PDF
                </a>
                <a className="ghost text-center" href={session.pdf.url} download={`${session.pdf.reportRef}.pdf`}>
                  Télécharger le PDF
                </a>
              </div>
            ) : null}
          </div>

          <div className="panel grid gap-3">
            <Field label="Codes disponibles">
              <textarea className="input min-h-24 resize-none" value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Coller un ou plusieurs codes d’accès" />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={rememberCodes}
                onChange={(event) => {
                  setRememberCodes(event.target.checked)
                  if (event.target.checked) setCodes((current) => Array.from(new Set([...loadStoredCodes(), ...current])))
                }}
              />
              Mémoriser mes codes sur cet appareil
            </label>
            <div className="action-row">
              <button className="secondary" type="button" onClick={addCodes}>
                Ajouter les codes
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  clearStoredCodes()
                  setCodes([])
                  setSelectedCode('')
                }}
              >
                Effacer mes codes de cet appareil
              </button>
            </div>
            <select className="input" value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)}>
              <option value="">Code d’accès</option>
              {codes.map((code) => (
                <option value={code} key={code}>
                  {code}
                </option>
              ))}
            </select>
            {session.sendStatus === 'used' ? <p className="notice error">Code déjà consommé</p> : null}
            {session.sendStatus === 'invalid' ? <p className="notice error">Code invalide</p> : null}
            {session.sendStatus === 'error' ? <p className="notice error">Erreur de transmission</p> : null}
          </div>

          <label className="checkbox panel">
            <input
              type="checkbox"
              checked={session.confirmed}
              onChange={(event) => setSession((current) => ({ ...current, confirmed: event.target.checked }))}
            />
            Je confirme avoir vérifié le rapport et les destinataires.
          </label>
          {transmitBlockers.length > 0 ? (
            <div className="panel grid gap-2">
              <p className="kicker">À valider</p>
              {transmitBlockers.map((blocker) => (
                <p className="text-sm font-black text-zinc-700" key={blocker}>
                  {blocker}
                </p>
              ))}
            </div>
          ) : null}
          <div className="action-row">
            <button
              className="primary"
              type="button"
              onClick={transmit}
              disabled={!session.pdfPreviewed || !session.confirmed || !selectedCode || pdfTooLarge || session.sendStatus === 'sending'}
            >
              {session.sendStatus === 'sending' ? 'Transmission...' : 'TRANSMETTRE LE RAPPORT — UTILISER 1 CODE'}
            </button>
            <button className="ghost" type="button" onClick={createPdf} disabled={!validation.valid}>
              Régénérer le PDF
            </button>
          </div>
        </section>
      ) : null}

      {step === 'sent' ? (
        <section className="panel grid gap-4">
          <p className="notice success">Demande de transmission confiée au prestataire e-mail.</p>
          <p className="text-sm font-black uppercase tracking-wide text-zinc-700">Code utilisé</p>
          <p className="text-sm font-semibold text-zinc-600">Le service ne garantit pas réception, lecture ou traitement du rapport.</p>
          <button className="primary" type="button" onClick={resetAll}>
            Nouveau signalement
          </button>
        </section>
      ) : null}
    </main>
  )
}

export default App
