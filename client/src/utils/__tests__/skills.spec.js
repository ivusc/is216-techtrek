import { describe, it, expect } from 'vitest'
import { canonicalSkill, sameSkill } from '../skills'
import { getMatchingSkills } from '../team'

describe('skills', () => {
  it('gives common skills one spelling', () => {
    expect(canonicalSkill(' vuejs ')).toBe('Vue.js')
    expect(canonicalSkill('NODE JS')).toBe('Node.js')
    expect(canonicalSkill('ux/ui')).toBe('UI/UX')
    expect(canonicalSkill('Rust')).toBe('Rust')
  })

  it('treats different spellings as the same skill', () => {
    expect(sameSkill('nodejs', 'Node.js')).toBe(true)
    expect(sameSkill('python', 'Python')).toBe(true)
    expect(sameSkill('Java', 'JavaScript')).toBe(false)
  })

  it('matches profile skills to team skills across spellings', () => {
    expect(getMatchingSkills(['vue', 'ux', 'Go'], ['Vue.js', 'UI/UX', 'SQL'])).toEqual(['vue', 'ux'])
  })
})
