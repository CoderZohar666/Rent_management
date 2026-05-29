export const installLocalStorage = () => {
  const store = new Map()

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index) {
      return Array.from(store.keys())[index] || null
    },
    get length() {
      return store.size
    }
  }

  Object.defineProperty(globalThis.localStorage, Symbol.iterator, {
    value: function* iterator() {
      yield* store.keys()
    }
  })
}
