import imageCompression from 'browser-image-compression'
import { MAX_IMAGE_DIMENSION, MAX_PHOTOS } from './constants'

export function canAddPhoto(currentCount: number): boolean {
  return currentCount < MAX_PHOTOS
}

export async function compressPhoto(source: Blob): Promise<Blob> {
  const file = new File([source], 'coopro-photo.jpg', { type: 'image/jpeg' })
  return imageCompression(file, {
    fileType: 'image/jpeg',
    initialQuality: 0.78,
    maxWidthOrHeight: MAX_IMAGE_DIMENSION,
    useWebWorker: true,
  })
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
