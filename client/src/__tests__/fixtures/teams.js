export const ME = {
  _id: 'me',
  displayName: 'Kellie Jubela',
  year: 2,
  course: 'Information Systems',
  skills: ['Vue.js'],
};

export const LEADER = {
  _id: 'leader',
  displayName: 'Ivus Chua',
  year: 3,
  course: 'Computer Science',
  skills: [],
};

export const REQUESTER = {
  _id: 'requester',
  displayName: 'Ezekiel Ng',
  year: 1,
  course: 'Information Systems',
  skills: ['Figma'],
  githubUrl: 'https://github.com/ezekiel',
  linkedinUrl: 'https://www.linkedin.com/in/ezekiel',
};

export function team(overrides = {}) {
  return {
    _id: 't1',
    name: 'Byte Me',
    event: { name: 'Hack&Roll', location: 'NUS' },
    closesAt: '2026-11-20T23:59:59.000Z',
    teamSize: 4,
    externalMembers: 1,
    slotsOpen: 2,
    pitch: 'We ship a working demo every weekend.',
    skills: ['Vue.js', 'Figma'],
    autoAccept: false,
    status: 'open',
    leader: LEADER,
    members: [{ user: LEADER, role: 'Team lead' }],
    isLeader: false,
    requestStatus: null,
    ...overrides,
  };
}

export function ledTeam(overrides = {}) {
  return team({
    _id: 'm1',
    name: 'Night Owls',
    leader: ME,
    members: [{ user: ME, role: 'Team lead' }],
    isLeader: true,
    ...overrides,
  });
}

export function joinRequest(overrides = {}) {
  return {
    _id: 'r1',
    status: 'pending',
    role: 'Figma',
    message: 'I can design the screens.',
    shareProfile: true,
    createdAt: '2026-11-03T07:00:00.000Z',
    user: REQUESTER,
    team: { _id: 'm1', name: 'Night Owls', event: { name: 'Hack&Roll' } },
    ...overrides,
  };
}
