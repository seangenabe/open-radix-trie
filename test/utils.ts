import OpenRadixTrie from '../'
import { Node } from '../lib/node'
import archy = require('archy')
import { ROOT_MARKER } from '../lib/symbols'
import { inspect } from 'util'
import map = require('starry.map')
import { getChildren } from '../lib/node'

export function debugTrie<T>(trie: OpenRadixTrie<T>) {
  const rootNode = (trie as any).r as Node<T>
  console.log(archy(debugNode<T>(rootNode)))
}
debugTrie

export function debugNode<T>(n: Node<T>): ArchyNode {
  const { value, key } = n
  const keyString = key === ROOT_MARKER ? 'ROOT' : key.toString()
  let label: string
  if (value === undefined) {
    label = keyString
  } else {
    label = `${keyString}=${inspect(value, { depth: 0 })}`
  }
  return {
    label,
    nodes: [...map(getChildren(n), child => debugNode<T>(child))]
  }
}

export interface ArchyNode {
  label: string
  nodes: ArchyNode[]
}
