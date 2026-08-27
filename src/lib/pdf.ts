import { degrees, PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { GeneratedPdf, ReportForm, ReportPhoto } from '../types'
import { LEGAL_NOTICE, MAX_PDF_BYTES } from './constants'
import { compactCc } from './validation'

export function isPdfUnderLimit(size: number): boolean {
  return size <= MAX_PDF_BYTES
}

export function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (next.length > max && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  })
  if (line) lines.push(line)
  return lines
}

type PdfPage = ReturnType<PDFDocument['addPage']>
type PdfFont = Awaited<ReturnType<PDFDocument['embedFont']>>
const PDF_WATERMARK = 'COOPRO — FIELD REPORT'

function drawWrapped(
  page: PdfPage,
  text: string,
  x: number,
  y: number,
  size: number,
  max: number,
  font: PdfFont,
): number {
  const lines = wrap(text, max)
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * (size + 5), size, font, color: rgb(0.08, 0.08, 0.08) })
  })
  return y - lines.length * (size + 5)
}

function applyWatermark(doc: PDFDocument, font: PdfFont): void {
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    page.drawText(PDF_WATERMARK, {
      x: width * 0.13,
      y: height * 0.43,
      size: 46,
      font,
      color: rgb(0.56, 0.6, 0.64),
      opacity: 0.16,
      rotate: degrees(34),
    })
  })
}

export async function generateReportPdf(form: ReportForm, photos: ReportPhoto[]): Promise<GeneratedPdf> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reportRef = `COOPRO-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12)}`

  let page = doc.addPage([595, 842])
  let y = 794
  page.drawText('COOPRO — FIELD REPORT', { x: 36, y, size: 18, font: bold })
  y -= 28
  page.drawText(`Référence locale du rapport : ${reportRef}`, { x: 36, y, size: 10, font })
  y -= 16
  page.drawText(`Date et heure : ${new Date().toLocaleString('fr-FR')}`, { x: 36, y, size: 10, font })
  y -= 28

  const lines = [
    `Adresse / immeuble : ${form.address}`,
    `Zone : ${form.zone}`,
    `Type : ${form.problemType}`,
    `Urgence : ${form.urgency}`,
    `Destinataire principal : ${form.to}`,
    `Copies : ${compactCc(form).join(', ') || 'Aucune'}`,
    `E-mail déclarant : ${form.bcc}`,
  ]

  lines.forEach((line) => {
    page.drawText(line, { x: 36, y, size: 10, font })
    y -= 16
  })
  y -= 8
  page.drawText('Description factuelle', { x: 36, y, size: 12, font: bold })
  y = drawWrapped(page, form.description, 36, y - 18, 10, 88, font) - 12
  page.drawText('Mention légale', { x: 36, y, size: 12, font: bold })
  y = drawWrapped(page, LEGAL_NOTICE, 36, y - 18, 9, 96, font) - 18

  for (let index = 0; index < photos.length; index += 1) {
    if (y < 270) {
      page = doc.addPage([595, 842])
      y = 794
    }
    const photo = photos[index]
    page.drawText(`Photo ${index + 1}${photo.caption ? ` — ${photo.caption}` : ''}`, {
      x: 36,
      y,
      size: 11,
      font: bold,
    })
    y -= 14
    const image = await doc.embedJpg(await photo.blob.arrayBuffer())
    const ratio = image.width / image.height
    const width = 250
    const height = Math.min(210, width / ratio)
    page.drawImage(image, { x: 36, y: y - height, width, height })
    y -= height + 24
  }

  applyWatermark(doc, bold)

  const pdfBytes = await doc.save({ useObjectStreams: true })
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength)
  new Uint8Array(pdfBuffer).set(pdfBytes)
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    reportRef,
  }
}
