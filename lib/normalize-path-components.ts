import { ExtensiblePathComponent } from 'xerpath'

export function normalizePathComponents(
  pathComponents: Iterable<string | ExtensiblePathComponent>
) {
  const ret: (string | ExtensiblePathComponent)[] = []
  for (let item of pathComponents) {
    if (item === '') {
      continue
    }
    const last = ret[ret.length - 1]
    if (typeof last === 'string' && typeof item === 'string') {
      ret[ret.length - 1] = last + item
    } else {
      ret.push(item)
    }
  }
  return ret
}
