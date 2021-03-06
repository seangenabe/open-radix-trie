import { ok } from 'assert'
import * as getCommonPrefix from 'common-prefix'
import {
  createExtensiblePathRunner,
  ExtensiblePath,
  ExtensiblePathComponent,
  ExtensiblePathComponentMaker,
  ExtensiblePathRunner
} from 'xerpath'
import {
  clone,
  createNode,
  getChildren,
  hasChildren,
  Node,
  NodeKey,
  RootNode
} from './node'
import { ROOT_MARKER } from './symbols'
import { normalizePathComponents } from './normalize-path-components'

export default class OpenRadixTrie<
  TValue,
  TContext extends Record<keyof TContext, ExtensiblePathComponentMaker> = any
> {
  /**
   * The root node.
   */
  private r: RootNode<TValue>
  private x: ExtensiblePathRunner & TContext

  constructor(context?: TContext) {
    const r = createNode<TValue>(ROOT_MARKER)
    this.r = r
    this.x = createExtensiblePathRunner(context)
  }

  /**
   * Inserts, updates, or deletes the value of the data structure
   * at the specified path.
   *
   * Note that no two custom matchers are considered equal and will always
   * result in an insertion.
   * @param path The path to update.
   * @param value The value. If `undefined`, the value is removed from the
   * data structure.
   */
  set(
    path: ExtensiblePath<TContext> | string,
    value: TValue | undefined
  ): void {
    if (value === undefined) {
      this.delete(path)
      return
    }
    const pathComponents = this.buildPath(path)
    this.setOnNode(this.r, pathComponents, value)
  }

  private setOnNode(
    node: Node<TValue>,
    pathComponents: (string | ExtensiblePathComponent)[],
    value: TValue
  ): void {
    let currentComponent: string | ExtensiblePathComponent | undefined
    pathComponents = normalizePathComponents(pathComponents)

    currentComponent = pathComponents.shift()

    // If current path component is undefined (array has been exhausted):
    if (currentComponent === undefined) {
      // Set value here.
      node.value = value
      return
    }

    if (typeof currentComponent === 'string') {
      let parentKey: NodeKey = node.key

      if (parentKey === ROOT_MARKER) {
        parentKey = ''
      } else if (typeof parentKey === 'symbol') {
        ok(false, 'Unrecognized symbol for node key.')
        throw new Error()
      } else {
        parentKey = '' // Match with empty string for custom nodes.
      }

      // Check if any child matches the string.
      let childIndex = 0
      for (let child of node.stringChildren) {
        const childKey = child.key as string
        // If child matches exactly the path component:
        if (childKey === currentComponent) {
          // Traverse this child.
          return this.setOnNode(child, pathComponents, value)
        }
        // Get common prefix.
        const commonString: string = getCommonPrefix([
          childKey,
          currentComponent
        ])
        const commonLength = commonString.length
        if (commonLength === 0) {
          // Did not match child, continue.
          childIndex++
          continue
        } else if (commonLength >= childKey.length) {
          // Traverse on child; cut on common prefix substring.
          if (currentComponent.length > commonLength) {
            pathComponents.unshift(currentComponent.substr(commonLength))
          }
          return this.setOnNode(child, pathComponents, value)
        } else {
          // Split the key on the common prefix substring.
          // Recreate old tree with the old string.
          const trimmedTree = clone(child)
          trimmedTree.key = childKey.substr(commonLength)
          // Create a new node with the prefix.
          const newParentNode = createNode<TValue>(commonString)
          // Replace the old tree.
          node.stringChildren[childIndex] = newParentNode
          // Attach.
          newParentNode.stringChildren.push(trimmedTree)
          if (commonString === currentComponent) {
            // Set value.
            newParentNode.value = value
            return
          } else {
            // Create new node with the remaining part of new string.
            const newTree = createNode<TValue>(
              currentComponent.substr(commonLength)
            )
            newParentNode.stringChildren.push(newTree)
            // Traverse new node.
            return this.setOnNode(newTree, pathComponents, value)
          }
        }
      }
      // Did not match any child.
      // Create new node here.
      const newNode = createNode<TValue>(currentComponent)
      // Attach.
      node.stringChildren.push(newNode)
      // Traverse.
      return this.setOnNode(newNode, pathComponents, value)
    } else {
      ok(
        typeof currentComponent === 'function',
        'Path component must be a function.'
      )
      // If current component is a path component:
      // Traverse for a matching path component
      let matchingNode = node.customChildren.get(currentComponent)
      if (matchingNode == null) {
        matchingNode = createNode<TValue>(currentComponent)
        node.customChildren.set(currentComponent, matchingNode)
      }
      return this.setOnNode(matchingNode, pathComponents, value)
    }
  }

  /**
   * Gets the value of the data structure at the specified path.
   * @param path
   */
  get(
    path: string
  ): { value: TValue | undefined; args: any[]; remainingPath: string } {
    ok(typeof path === 'string', 'Path must be a string.')
    let node: Node<TValue> = this.r
    const args: any[] = []
    let value: TValue | undefined = undefined

    while (true) {
      // If path is the empty string, return this node.
      if (path === '') {
        return { value: node.value || value, remainingPath: path, args }
      }

      // Check if any of the string children match.
      let found: boolean = false
      for (let child of node.stringChildren) {
        const childKey = child.key as string
        if (path.startsWith(childKey)) {
          node = child
          path = path.substr(childKey.length)
          found = true
          value = child.value || value
          break
        }
      }
      if (found) {
        continue
      }

      // Check if any of the custom children match.
      for (let child of node.customChildren.values()) {
        const childKey = child.key as ExtensiblePathComponent
        const result = childKey(path)
        if (result != null) {
          node = child
          path = result.remainingPath
          found = true
          value = child.value || value
          args.push(result.value)
          break
        }
      }
      if (found) {
        continue
      }

      // No children matched, return this node.
      return {
        value: node.value || value,
        remainingPath: path,
        args
      }
    }
  } // get

  buildPath(
    path: ExtensiblePath<TContext> | string
  ): (string | ExtensiblePathComponent)[] {
    let builtPath: Iterable<string | ExtensiblePathComponent>
    if (typeof path === 'string') {
      builtPath = [path]
    } else {
      ok(typeof path === 'function', 'Extensible path must be a function.')
      builtPath = path(this.x)
    }

    return normalizePathComponents(builtPath)
  }

  delete(path: ExtensiblePath<TContext> | string): boolean {
    const pathComponents = this.buildPath(path)
    return this.deleteOnNode(this.r, undefined, 0, pathComponents)
  }

  private deleteOnNode(
    node: Node<TValue>,
    parentNode: Node<TValue> | undefined,
    key: number | ExtensiblePathComponent,
    pathComponents: (string | ExtensiblePathComponent)[]
  ): boolean {
    let currentComponent: string | ExtensiblePathComponent | undefined
    do {
      currentComponent = pathComponents.shift()
    } while (currentComponent === '')

    if (currentComponent === undefined) {
      // Remove value from this node.
      node.value = undefined
      this.cleanUpNode(node, parentNode, key)
      return true
    }

    // Check if any child matches the path.
    if (typeof currentComponent === 'string') {
      let childIndex = 0
      for (let child of node.stringChildren) {
        const childKey = child.key as string
        if (currentComponent.startsWith(childKey)) {
          pathComponents.unshift(currentComponent.substr(childKey.length))
          return this.deleteOnNode(child, node, childIndex, pathComponents)
        }
        childIndex++
      }
    } else {
      const child = node.customChildren.get(currentComponent)
      if (child != null) {
        return this.deleteOnNode(child, node, currentComponent, pathComponents)
      }
    }

    // Path not found on data structure. Nothing to delete.
    return false
  }

  private cleanUpNode(
    node: Node<TValue>,
    parentNode: Node<TValue> | undefined,
    key: number | ExtensiblePathComponent
  ) {
    if (parentNode === undefined) {
      return
    }
    if (!hasChildren(node)) {
      if (typeof key === 'number') {
        parentNode.stringChildren.splice(key, 1)
      } else {
        parentNode.customChildren.delete(key)
      }
    }
    if (
      node.value === undefined &&
      node.type === 'string' &&
      node.customChildren.size === 0 &&
      node.stringChildren.length === 1
    ) {
      // Try to merge if there is only one remaining child (one level below)
      const remainingNode = node.stringChildren[0]
      node.key = `${node.key}${remainingNode.key}`
      node.customChildren = remainingNode.customChildren
      node.stringChildren = remainingNode.stringChildren
      node.value = remainingNode.value
    }
    if (parentNode.type === 'string') {
      // Try to merge if there is only one remaining child.
      if (
        parentNode.customChildren.size === 0 &&
        parentNode.stringChildren.length === 1
      ) {
        const remainingNode = parentNode.stringChildren[0]
        parentNode.customChildren = remainingNode.customChildren
        parentNode.stringChildren = remainingNode.stringChildren
        parentNode.key = `${parentNode.key}${remainingNode.key as string}`
        parentNode.value = remainingNode.value
      }
    }
  }

  entries() {
    return this.entriesOnNode([], this.r)
  }

  *entriesOnNode(
    path: (string | ExtensiblePathComponent)[],
    node: Node<TValue>
  ): IterableIterator<[(string | ExtensiblePathComponent)[], TValue]> {
    const currentPath = [...path]
    if (typeof node.key !== 'symbol') {
      currentPath.push(node.key)
    }
    if (node.value !== undefined) {
      yield [currentPath, node.value]
    }
    for (let child of getChildren(node)) {
      yield* this.entriesOnNode(currentPath, child)
    }
  }

  *keys() {
    for (let entry of this.entries()) {
      yield entry[0]
    }
  }

  *values() {
    for (let entry of this.entries()) {
      yield entry[1]
    }
  }

  [Symbol.iterator]() {
    return this.entries()
  }

  clear() {
    this.r.value = undefined
    this.r.customChildren.clear()
    this.r.stringChildren.splice(0)
  }

  forEach(
    callbackFn: (
      value: TValue,
      key: (string | ExtensiblePathComponent)[],
      trie: this
    ) => void,
    thisArg?: any
  ) {
    for (let [key, value] of this.entries()) {
      callbackFn.call(thisArg, value, key, this)
    }
  }

  has(path: string): boolean {
    const result = this.get(path)
    return result.value !== undefined
  }
} // class

export { OpenRadixTrie }
