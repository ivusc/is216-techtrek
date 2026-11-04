// one spelling per common skill, so "vue", "VueJS" and "Vue.js" all count as the same skill.
// keys are the skill in lower case with spaces, dots, dashes and underscores removed.
// keep in sync with server/service/skills.js
export const SKILL_ALIASES = {
  vue: 'Vue.js', vuejs: 'Vue.js', vue3: 'Vue.js',
  react: 'React', reactjs: 'React',
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  node: 'Node.js', nodejs: 'Node.js',
  py: 'Python', python: 'Python',
  java: 'Java',
  sql: 'SQL', mysql: 'SQL', postgres: 'SQL', postgresql: 'SQL',
  'ui/ux': 'UI/UX', 'ux/ui': 'UI/UX', uiux: 'UI/UX', uxui: 'UI/UX', ui: 'UI/UX', ux: 'UI/UX',
  'ui/uxdesign': 'UI/UX', uiuxdesign: 'UI/UX', uidesign: 'UI/UX', uxdesign: 'UI/UX',
  figma: 'Figma',
  dataanalysis: 'Data Analysis', dataanalytics: 'Data Analysis', analytics: 'Data Analysis',
  ml: 'Machine Learning', machinelearning: 'Machine Learning',
  cloud: 'Cloud', cloudcomputing: 'Cloud',
  mobile: 'Mobile', mobiledev: 'Mobile', mobiledevelopment: 'Mobile', mobileapps: 'Mobile',
  cybersecurity: 'Cybersecurity', security: 'Cybersecurity',
  pitching: 'Pitching', pitch: 'Pitching',
  projectmanagement: 'Project Management'
}

function skillKey(skill) {
  return String(skill).toLowerCase().replace(/[\s._-]/g, '')
}

// "nodejs" -> "Node.js"; skills we don't know keep what the user typed
export function canonicalSkill(skill) {
  const text = String(skill).trim().replace(/\s+/g, ' ')
  return SKILL_ALIASES[skillKey(text)] ?? text
}

export function sameSkill(a, b) {
  return skillKey(canonicalSkill(a)) === skillKey(canonicalSkill(b))
}

// whole-word search for a skill and its other spellings ("Vue.js" also finds "vue", "vuejs")
function mentions(text, skill) {
  const canonical = canonicalSkill(skill)
  const spellings = [canonical, ...Object.keys(SKILL_ALIASES).filter((key) => SKILL_ALIASES[key] === canonical)]
  return spellings.some((spelling) => {
    const escaped = spelling.toLowerCase().replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    return new RegExp('(^|[^a-z0-9])' + escaped + '($|[^a-z0-9])').test(text)
  })
}

// the known skills a listing mentions, split into the ones in mySkills and the rest.
// listings have no skills field, so we look in the title, description and themes.
// ponytail: plain text matching, swap for a real skills field if the API ever sends one
export function listingSkillMatch(item, mySkills, knownSkills) {
  const text = [item.title, item.description, ...(item.themes ?? [])].join(' ').toLowerCase()
  const have = mySkills.filter((skill) => mentions(text, skill))
  const missing = knownSkills.filter((skill) => !have.some((mine) => sameSkill(mine, skill)) && mentions(text, skill))
  return { have, missing }
}
