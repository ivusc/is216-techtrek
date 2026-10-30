const prompt = (opportunity, existingQuestions) => `
Generate exactly 5 interview questions for the following role.

Organisation: ${opportunity.organisation}
Role: ${opportunity.title}
Description: ${opportunity.description || "Not provided"}

Avoid questions similar to these previous questions:${existingQuestions.length > 0? existingQuestions.join("\n"): "None"}

Use a suitable mix of these types:
Behavioural, Technical, System Design, Case.

Choose a difficulty of Easy, Medium, or Hard for each question.
Make the questions relevant to the role and avoid repetition.

Return only a JSON array with this structure:
[
  {
    "question": "Question text",
    "type": "Technical",
    "difficulty": "Medium"
  }
]
`;

module.exports = prompt;
