import OpenRadixTrie from '../lib/open-radix-trie'
import { Node, getChildren } from '../lib/node'
import test, { TestContext } from 'ava'
import archy = require('archy')
import { ROOT_MARKER } from '../lib/symbols'
import map = require('starry.map')
import { inspect } from 'util'

test('add new node', t => {
  const trie = new OpenRadixTrie<number>()
  const rootNode = (trie as any).r as Node<number>
  trie.set('toast', 1)
  checkTree(t, rootNode, {
    subtree: {
      toast: { value: 1 }
    }
  })
})

test('remove new node', t => {
  const trie = new OpenRadixTrie<number>()
  const rootNode = (trie as any).r as Node<number>
  trie.set('toast', 1)
  trie.set('water', 2)
  trie.delete('toast')
  checkTree(t, rootNode, { subtree: { water: { value: 2 } } })
})

test('attach to existing node', t => {
  const trie = new OpenRadixTrie<number>()
  const rootNode = (trie as any).r as Node<number>
  trie.set('toast', 1)
  trie.set('toaster', 2)
  checkTree(t, rootNode, {
    subtree: {
      toast: {
        value: 1,
        subtree: {
          er: {
            value: 2
          }
        }
      }
    }
  })
})

test('detach leaf node', t => {
  const trie = new OpenRadixTrie<number>()
  const rootNode = (trie as any).r as Node<number>
  trie.set('toast', 1)
  trie.set('toaster', 2)
  trie.delete('toaster')
  checkTree(t, rootNode, {
    subtree: {
      toast: {
        value: 1
      }
    }
  })
})

test('prefix an existing node', t => {
  const trie = new OpenRadixTrie<number>()
  const rootNode = (trie as any).r as Node<number>
  trie.set('toaster', 2)
  trie.set('toast', 1)
  checkTree(t, rootNode, {
    subtree: {
      toast: {
        value: 1,
        subtree: {
          er: {
            value: 2
          }
        }
      }
    }
  })
})

test('recreate de-prefixed node', t => {
  const trie = new OpenRadixTrie<number>()
  const rootNode = (trie as any).r as Node<number>
  trie.set('toaster', 2)
  trie.set('toast', 1)
  trie.delete('toast')
  checkTree(t, rootNode, {
    subtree: {
      toaster: {
        value: 2
      }
    }
  })
})

test('split existing node', t => {
  const trie = new OpenRadixTrie<number>()
  trie.set('toast', 1)
  trie.set('test', 2)
  const rootNode = (trie as any).r as Node<number>
  checkTree(t, rootNode, {
    subtree: {
      t: {
        subtree: {
          oast: { value: 1 },
          est: { value: 2 }
        }
      }
    }
  })
})

test('merge split nodes 1', t => {
  const trie = new OpenRadixTrie<number>()
  trie.set('toast', 1)
  trie.set('test', 2)
  trie.delete('toast')
  const rootNode = (trie as any).r as Node<number>
  checkTree(t, rootNode, {
    subtree: {
      test: { value: 2 }
    }
  })
})

test('merge split nodes 2', t => {
  const trie = new OpenRadixTrie<number>()
  trie.set('toast', 1)
  trie.set('test', 2)
  trie.delete('test')
  const rootNode = (trie as any).r as Node<number>
  checkTree(t, rootNode, {
    subtree: {
      toast: { value: 1 }
    }
  })
})

test('get exact', t => {
  const trie = new OpenRadixTrie<number>()
  trie.set('toast', 1)
  trie.set('test', 2)
  const result = trie.get('toast')
  t.deepEqual(result.args, [])
  t.is(result.remainingPath, '')
  t.is(result.value, 1)
})

test('get with remaining', t => {
  const trie = new OpenRadixTrie<number>()
  trie.set('toast', 1)
  trie.set('test', 2)
  const result = trie.get('toasted')
  t.deepEqual(result.args, [])
  t.is(result.remainingPath, 'ed')
  t.is(result.value, 1)
})

test('get no match', t => {
  const trie = new OpenRadixTrie<number>()
  trie.set('toast', 1)
  trie.set('test', 2)
  const result = trie.get('treetop')
  t.deepEqual(result.args, [])
  t.is(result.value, undefined)
})

test('get with custom path component', t => {
  const context = {
    word() {
      return s => {
        const res = /[^\s]+/.exec(s)
        if (res == null) return null
        return { value: res[0], remainingPath: s.substr(res[0].length) }
      }
    }
  }
  const trie = new OpenRadixTrie<number, typeof context>(context)
  trie.set(r => r`sky ${r.word()} orange`, 7)
  const result = trie.get('sky apple orange')
  t.is(result.value, 7)
  t.deepEqual(result.args, ['apple'])
})

test('get with custom path component (negate)', t => {
  const context = {
    word() {
      return s => {
        const res = /[^\s]+/.exec(s)
        if (res == null) return null
        return { value: res[0], remainingPath: s.substr(res[0].length) }
      }
    }
  }
  const trie = new OpenRadixTrie<number, typeof context>(context)
  trie.set(r => r`sky ${r.word()} orange`, 7)
  const result = trie.get('sky ')
  t.is(result.value, undefined)
  t.deepEqual(result.args, [])
})

interface TreeDef<T> {
  value?: T
  subtree?: { [key: string]: TreeDef<T> }
}

function checkTree<T>(
  t: TestContext,
  node: Node<T>,
  obj: TreeDef<T>,
  path: string[] = []
) {
  const newPath = [
    ...path,
    node.key === ROOT_MARKER ? 'ROOT' : String(node.key)
  ]
  t.is(
    node.value,
    obj.value,
    `Values must be the same on path ${pathToString(newPath)}`
  )
  if (obj.subtree) {
    for (let [key, value] of Object.entries(obj.subtree)) {
      if (typeof key === 'string') {
        const child = node.stringChildren.find(n => n.key === key)
        t.true(
          child != null,
          `key not found on path: ${pathToString([...newPath, key])}`
        )
        if (child != null) {
          checkTree<T>(t, child, value, newPath)
        }
      }
    }
  }
}

function pathToString(path: string[]) {
  return path.join('->')
}

function debugTrie<T>(trie: OpenRadixTrie<T>) {
  const rootNode = (trie as any).r as Node<T>
  console.log(archy(debugNode<T>(rootNode)))
}
debugTrie

function debugNode<T>(n: Node<T>): ArchyNode {
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

interface ArchyNode {
  label: string
  nodes: ArchyNode[]
}
