import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trainFromSamples } from '../lib/elevenlabs/training.ts'

test('an empty sample selection is rejected before contacting the provider', async () => {
  await assert.rejects(trainFromSamples([]), /اختر من ملف/)
})
test('oversized recordings are rejected before contacting the provider', async () => {
  await assert.rejects(trainFromSamples([new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.wav')]), /4MB/)
})
test('non-audio file extensions cannot be uploaded as voice samples', async () => {
  await assert.rejects(trainFromSamples([new File(['instructions'], 'sample.txt')]), /اختر من ملف/)
})
