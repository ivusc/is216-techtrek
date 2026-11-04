import request from 'supertest';

export async function loginAs(app, { userName, password = 'Password1!' }) {
  const agent = request.agent(app);
  await agent.post('/register').send({ userName, password }).expect(201);
  return agent;
}

export function sessionCookie(response) {
  return response.headers['set-cookie']?.find((cookie) => cookie.startsWith('connect.sid='));
}
