const questionPrompt = (opportunity, existingQuestions) => `
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

const feedbackPrompt = (opportunity, question, answer) => `
You are evaluating a candidate's interview answer.

Organisation: ${opportunity.organisation}
Role: ${opportunity.title}
Type: ${opportunity.type}

Description:
${opportunity.description || 'No description provided'}

Interview Question:
${question}

Candidate Answer:
${answer}

Evaluate the candidate's answer based on:

1. Structure
- Is the answer organised and easy to follow?

2. Clarity
- Is the answer clear and understandable?

3. Relevance
- Does the answer address the question?

4. Impact
- Are outcomes, results and achievements demonstrated?

Give each category a score from 0 to 10.

Also provide:
- An overall score from 0 to 10
- A short summary
- A short overall evaluation
- Exactly 2 strengths
- Exactly 2 specific improvements
- A stronger version of the answer

Return JSON in this format:

{
  "score": 0,
  "summary": "",
  "overallFeedback": "",
  "structure": 0,
  "clarity": 0,
  "relevance": 0,
  "impact": 0,
  "strengths": [],
  "improvements": [],
  "sampleAnswer": ""
}
`;

module.exports = { questionPrompt, feedbackPrompt };
