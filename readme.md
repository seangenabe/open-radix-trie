# open-radix-trie

Radix trie implementation with partial lookups and extensible paths.

## Usage

```typescript
import { OpenRadixTrie } from 'open-radix-trie'
```

## API

### OpenRadixTrie 

```typescript
class OpenRadixTrie<
  TValue, 
  TContext extends Record<keyof TContext, ExtensiblePathComponentMaker> = any
>
```

A [radix trie](https://en.wikipedia.org/wiki/Radix_tree) that matches the largest prefix of a string that matches its nodes.

[xerpath](https://www.npmjs.com/package/xerpath) is used for routing.

#### set

```typescript
(path: ExtensiblePath<TContext> | string, value: TValue | undefined): void
```

Inserts, updates, or deletes the value of the data structure
at the specified path.

Note that no two custom matchers are considered equal and will always
result in an insertion.

Parameters:
* path - The path to update.
* value - The value. If `undefined`, the value is removed from the data structure.

#### get

```typescript
(path: string): { value: TValue | undefined; args: any[]; remainingPath: string }
```

Gets the value of the data structure at the specified path.

Parameters:
* path

#### buildPath

```typescript
(path: ExtensiblePath<TContext> | string): (string | ExtensiblePathComponent)[]
```

#### delete

```typescript
(path: ExtensiblePath<TContext> | string): boolean
```

#### entries, Symbol.iterator

```typescript
(): IterableIterator<[(string | ExtensiblePathComponent)[], TValue]>
```

#### keys

```typescript
(): IterableIterator<(string | ExtensiblePathComponent)[]>
```

#### values

```typescript
(): IterableIterator<TValue>
```

#### clear

```typescript
(): void
```

#### forEach

```typescript
(callbackFn: (value: TValue, key: (string | ExtensiblePathComponent)[], trie: this) => void, thisArg?: any)
```

#### has

```typescript
(path: string): boolean
```
