import { nn } from 'non-null'
import { ExtensiblePathComponent } from 'xerpath'
import { ROOT_MARKER } from './symbols'
import any = require('starry.any')

export interface NodeBase<TValue> {
  stringChildren: StringNode<TValue>[]
  customChildren: Map<ExtensiblePathComponent, CustomNode<TValue>>
  value?: TValue
}

export interface RootNode<TValue> extends NodeBase<TValue> {
  type: 'root'
  key: typeof ROOT_MARKER
}

export interface StringNode<TValue> extends NodeBase<TValue> {
  type: 'string'
  key: string
}

export interface CustomNode<TValue> extends NodeBase<TValue> {
  type: 'custom'
  key: ExtensiblePathComponent
}

function createNode<TValue>(
  key: typeof ROOT_MARKER,
  value?: TValue
): RootNode<TValue>
function createNode<TValue>(key: string, value?: TValue): StringNode<TValue>
function createNode<TValue>(
  key: ExtensiblePathComponent,
  value?: TValue
): CustomNode<TValue>
function createNode<TValue>(key: NodeKey, value?: TValue)
function createNode<TValue>(key: NodeKey, value?: TValue) {
  nn(key)
  const base = { key, value, stringChildren: [], customChildren: new Map() }
  if (key === ROOT_MARKER) {
    return { type: 'root', ...base } as RootNode<TValue>
  } else if (typeof key === 'string') {
    return { type: 'string', ...base } as StringNode<TValue>
  } else {
    return { type: 'custom', ...base } as CustomNode<TValue>
  }
}
export { createNode }

export function clone<TValue, TNode extends Node<TValue>>(node: TNode): TNode {
  const ret: TNode = createNode<TValue>(node.key, node.value)
  ret.stringChildren = [...node.stringChildren]
  ret.customChildren = new Map(node.customChildren)
  return ret
}

export function hasChildren<TValue>(node: NodeBase<TValue>) {
  return any(getChildren(node))
}

export function* getChildren<TValue>(node: NodeBase<TValue>) {
  yield* node.stringChildren
  yield* node.customChildren.values()
}

export type Node<TValue> =
  | RootNode<TValue>
  | StringNode<TValue>
  | CustomNode<TValue>

export type NodeKey = typeof ROOT_MARKER | string | ExtensiblePathComponent
