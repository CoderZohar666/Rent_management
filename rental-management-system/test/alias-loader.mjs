export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = specifier.slice(2)
    const path = /\.[cm]?js$/.test(target) || target.endsWith('.vue')
      ? target
      : `${target}.js`
    return nextResolve(new URL(`../src/${path}`, import.meta.url).href, context)
  }

  return nextResolve(specifier, context)
}
