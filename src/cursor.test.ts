// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

// Ägaren 2026-11-27: muspekaren ändras aldrig på webbplatsen, vad den än pekar på.
describe('pointer', () => {
  it('forces the default cursor on every element in the last loaded stylesheet', () => {
    const css = read('./anar/styles/stable.css')
    expect(css).toMatch(/html,\s*html \*,\s*html \*::before,\s*html \*::after \{\s*cursor: default !important;\s*\}\s*$/)

    // index.css is the last CSS import in main.tsx, and stable.css is the last file index.css imports
    const main = read('./main.tsx')
    const imports = main.split('\n').filter((l) => /^import '.*\.css'/.test(l))
    expect(imports.at(-1)).toBe("import './anar/styles/index.css'")
    const index = read('./anar/styles/index.css')
    const parts = index.split('\n').filter((l) => /^@import/.test(l))
    expect(parts.at(-1)).toBe("@import './stable.css';")
  })

  it('has no other cursor rule with !important that could win over it', () => {
    const dir = new URL('./anar/styles/', import.meta.url)
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.css'))) {
      const rules = read(`./anar/styles/${file}`).match(/cursor:[^;]*!important/g) ?? []
      expect(rules.every((r) => /cursor:\s*default\s*!important/.test(r)), file).toBe(true)
    }
  })
})
