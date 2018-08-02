import test from 'ava'
import { normalizePathComponents } from '../lib/normalize-path-components'

const n = () => null

test('filter empty strings', t => {
  const comps = ['abc', '', n, 'def']
  const result = normalizePathComponents(comps)
  t.deepEqual(result, ['abc', n, 'def'])
})

test('concat consecutive strings', t => {
  const comps = ['abc', 'def', n, '123', '456']
  const result = normalizePathComponents(comps)
  t.deepEqual(result, ['abcdef', n, '123456'])
})
