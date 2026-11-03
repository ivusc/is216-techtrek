const MAX_SKILLS = 12;

function cleanSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const cleaned = [];
  for (const skill of skills) {
    const text = String(skill).trim().slice(0, 40);
    const alreadyThere = cleaned.some((item) => item.toLowerCase() === text.toLowerCase());
    if (text !== '' && !alreadyThere) cleaned.push(text);
  }
  return cleaned.slice(0, MAX_SKILLS);
}

module.exports = { cleanSkills };
