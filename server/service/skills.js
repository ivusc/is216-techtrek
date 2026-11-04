const MAX_SKILLS = 12;

// one spelling per common skill, so "vue", "VueJS" and "Vue.js" all count as the same skill.
// keys are the skill in lower case with spaces, dots, dashes and underscores removed.
// keep in sync with client/src/utils/skills.js
const SKILL_ALIASES = {
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
  projectmanagement: 'Project Management',
};

function skillKey(skill) {
  return String(skill).toLowerCase().replace(/[\s._-]/g, '');
}

// "nodejs" -> "Node.js"; skills we don't know keep what the user typed
function canonicalSkill(skill) {
  const text = String(skill).trim().replace(/\s+/g, ' ');
  return SKILL_ALIASES[skillKey(text)] ?? text;
}

function sameSkill(a, b) {
  return skillKey(canonicalSkill(a)) === skillKey(canonicalSkill(b));
}

function cleanSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const cleaned = [];
  for (const skill of skills) {
    const text = canonicalSkill(skill).slice(0, 40);
    const alreadyThere = cleaned.some((item) => sameSkill(item, text));
    if (text !== '' && !alreadyThere) cleaned.push(text);
  }
  return cleaned.slice(0, MAX_SKILLS);
}

module.exports = { MAX_SKILLS, cleanSkills, canonicalSkill, sameSkill };
