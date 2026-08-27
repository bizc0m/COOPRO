import { describe, expect, it, vi } from 'vitest'
import { canAddPhoto, stopMediaStream } from './photos'

describe('photos', () => {
  it('autorise au maximum 5 photos', () => {
    expect(canAddPhoto(0)).toBe(true)
    expect(canAddPhoto(4)).toBe(true)
    expect(canAddPhoto(5)).toBe(false)
  })

  it('arrête toutes les tracks caméra', () => {
    const stopA = vi.fn()
    const stopB = vi.fn()
    const stream = {
      getTracks: () => [{ stop: stopA }, { stop: stopB }],
    } as unknown as MediaStream
    stopMediaStream(stream)
    expect(stopA).toHaveBeenCalledOnce()
    expect(stopB).toHaveBeenCalledOnce()
  })
})
