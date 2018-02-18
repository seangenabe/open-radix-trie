import { ExtensiblePathComponent } from 'xerpath'
import any = require('starry.any')
import nn from '@seangenabe/nn'

export default class Node<TValue = any> {
  public value: TValue | undefined
  public stringChildren: Node<TValue>[]
  public customChildren: Map<ExtensiblePathComponent, Node<TValue>>
  public key: string | symbol | ExtensiblePathComponent

  constructor(key: string | symbol | ExtensiblePathComponent, value?: TValue) {
    nn(key)
    this.key = key
    this.stringChildren = []
    this.customChildren = new Map()
    this.value = value
  }

  clone(): Node<TValue> {
    const ret = new Node<TValue>(this.key, this.value)
    ret.stringChildren = [...this.stringChildren]
    ret.customChildren = new Map(this.customChildren)
    return ret
  }

  hasChildren(): boolean {
    return any(this.getChildren())
  }

  *getChildren() {
    yield* this.stringChildren
    yield* this.customChildren.values()
  }
}
