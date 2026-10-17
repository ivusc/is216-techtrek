const prompt = (opportunity) => `Generate exactly 5 interview questions for this opportunity.

Organisation: ${opportunity.organisation}
Role: ${opportunity.title}
Description:
${opportunity.description || 'No description provided'}

Question types available:
- Behavioural
- Technical
- System Design
- Case

Difficulty available:
- Easy
- Medium
- Hard

Return ONLY a JSON array that should be formatted like the example below. Change the values according to the question,type and difficulty these are just examples

[
  {
    "question": "Question text",
    "type": "Behavioural",
    "difficulty": "Medium"
  }
]

Generate a realistic mix of question types appropriate for the role.`

module.exports = prompt