export function manualOpportunity(overrides = {}) {
  return {
    source: 'manual',
    type: 'job',
    title: 'Frontend Intern',
    organisation: 'Acme',
    ...overrides,
  };
}

export async function saveApplication(agent, { opportunity = manualOpportunity(), status } = {}) {
  const response = await agent.post('/application').send({ opportunity, status }).expect(201);
  return response.body;
}
