// Adds demo hackathon teams that are open to join, so the Teams page and "Find team" have something to show.
//
//   pnpm --filter @techtrek/server seed:teams
//
// Safe to run again: it removes the teams (and their join requests) led by the demo users and makes them fresh,
// on whichever Devpost hackathons are open right now. Real users and their teams are never touched.
// Demo users have a random password nobody knows, so they can't be logged into.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const opportunityService = require('../service/opportunity-service');

const DEMO_EMAIL = (name) => `techtrek.demo.${name}@smu.edu.sg`;
const DEMO_EMAIL_PATTERN = /^techtrek\.demo\..+@smu\.edu\.sg$/;

const demoUsers = [
  { key: 'alicia', displayName: 'Alicia Tan', year: 2, faculty: 'SCIS', skills: ['Vue.js', 'Figma', 'UI/UX'] },
  { key: 'marcus', displayName: 'Marcus Lee', year: 3, faculty: 'SCIS', skills: ['Python', 'Machine Learning', 'Data Analysis'] },
  { key: 'priya', displayName: 'Priya Nair', year: 2, faculty: 'LKCSB', skills: ['Pitching', 'Project Management'] },
  { key: 'daniel', displayName: 'Daniel Wong', year: 1, faculty: 'SCIS', skills: ['React', 'Node.js', 'JavaScript'] },
  { key: 'sarah', displayName: 'Sarah Lim', year: 3, faculty: 'SOE', skills: ['Data Analysis', 'SQL', 'Python'] },
  { key: 'junhao', displayName: 'Jun Hao Chua', year: 4, faculty: 'SCIS', skills: ['Cloud', 'Cybersecurity', 'Java'] },
  { key: 'ethan', displayName: 'Ethan Ng', year: 2, faculty: 'SCIS', skills: ['Java', 'SQL'] },
  { key: 'meiling', displayName: 'Mei Ling Goh', year: 1, faculty: 'SOSS', skills: ['UI/UX', 'Pitching'] },
  { key: 'ravi', displayName: 'Ravi Kumar', year: 3, faculty: 'SCIS', skills: ['Mobile', 'React', 'Cloud'] },
  { key: 'chloe', displayName: 'Chloe Teo', year: 2, faculty: 'LKCSB', skills: ['Data Analysis', 'Pitching', 'Figma'] },
  { key: 'bryan', displayName: 'Bryan Ho', year: 4, faculty: 'SCIS', skills: ['Machine Learning', 'Python', 'SQL'] },
  { key: 'nadia', displayName: 'Nadia Rahman', year: 1, faculty: 'YPHSL', skills: ['Project Management', 'Pitching'] },
];

// event: a number = that open Devpost hackathon (0 = closing soonest of those open for at least 12 more hours),
//        so "Find team" on its card shows the team;
//        an object = a campus event that isn't on Devpost, open for that many days
// skills: what the team is looking for
const demoTeams = [
  {
    name: 'Pixel Pushers',
    event: 0,
    leader: 'alicia',
    members: [{ user: 'ethan', role: 'Backend' }],
    teamSize: 4,
    skills: ['React', 'Node.js', 'Pitching'],
    pitch: 'Designer + backend dev building a study-buddy app. Need a frontend dev and someone to own the demo pitch.',
  },
  {
    name: 'Byte Me',
    event: 1,
    leader: 'daniel',
    members: [],
    teamSize: 4,
    skills: ['UI/UX', 'Figma', 'Python'],
    pitch: 'First-timer friendly! I can code the web app, looking for a designer and someone comfortable with Python APIs.',
  },
  {
    name: 'Data Divers',
    event: 2,
    leader: 'marcus',
    members: [{ user: 'sarah', role: 'Data' }],
    teamSize: 5,
    skills: ['Vue.js', 'JavaScript', 'Pitching'],
    pitch: 'We have the ML model and the data. Need people to turn it into a dashboard and tell the story to judges.',
  },
  {
    name: 'Pitch Perfect',
    event: 3,
    leader: 'priya',
    members: [{ user: 'meiling', role: 'Design' }],
    teamSize: 4,
    skills: ['React', 'Node.js', 'SQL'],
    pitch: 'Business + design duo with a fintech idea for students. Looking for two devs to build the prototype.',
  },
  {
    name: 'Null Pointers',
    event: 4,
    leader: 'junhao',
    members: [],
    teamSize: 4,
    skills: ['Python', 'Machine Learning', 'Cloud'],
    pitch: 'Security-focused hack: phishing detector for SMU emails. Need ML and cloud deployment help.',
  },
  {
    name: 'Insight Squad',
    event: 5,
    leader: 'sarah',
    members: [],
    teamSize: 3,
    skills: ['Figma', 'UI/UX', 'Project Management'],
    pitch: 'Data visualisation of public transport crowding. Looking for a designer and someone to keep us on track.',
  },
  {
    name: 'App-solutely',
    event: 0,
    leader: 'ravi',
    members: [{ user: 'nadia', role: 'Product' }],
    teamSize: 4,
    skills: ['UI/UX', 'Node.js', 'JavaScript'],
    pitch: 'Building a mobile app that splits group project tasks fairly. Need a designer and a backend dev.',
  },
  {
    name: 'Prompt Engineers',
    event: 2,
    leader: 'bryan',
    members: [],
    teamSize: 3,
    skills: ['React', 'Figma', 'Pitching'],
    pitch: 'AI study planner that reads your syllabus. The model works - we need a nice front end and a strong pitch.',
  },
  {
    name: 'Chart Toppers',
    event: 6,
    leader: 'chloe',
    members: [],
    teamSize: 4,
    skills: ['Python', 'SQL', 'Vue.js'],
    pitch: 'Visualising hawker centre prices across Singapore. Looking for people who can wrangle data and build the site.',
  },
  {
    name: 'Cloud Nine',
    event: 7,
    leader: 'ethan',
    members: [{ user: 'meiling', role: 'Design' }],
    teamSize: 4,
    skills: ['Cloud', 'Cybersecurity', 'Machine Learning'],
    pitch: 'Secure file sharing for student clubs. Need help with cloud deployment and keeping it safe.',
  },
  {
    name: 'Late Night Coders',
    event: 4,
    leader: 'daniel',
    members: [],
    teamSize: 5,
    skills: ['Java', 'Mobile', 'Data Analysis'],
    pitch: 'Any idea, any stack - we just love hacking at 3am. Beginners very welcome, we will teach you.',
  },
  {
    name: 'The Pitch Deck',
    event: 1,
    leader: 'nadia',
    members: [{ user: 'chloe', role: 'Research' }],
    teamSize: 4,
    skills: ['Python', 'React', 'UI/UX'],
    pitch: 'Law + business students with a legal-aid chatbot idea. Looking for two builders who like talking to users.',
  },
];

// --- generated teams, so (almost) every open hackathon has someone to join ---
const NAME_FIRST = ['Code', 'Byte', 'Pixel', 'Data', 'Logic', 'Stack', 'Cloud', 'Neural', 'Quantum', 'Syntax', 'Kernel', 'Vector'];
const NAME_SECOND = ['Crew', 'Squad', 'Wizards', 'Pilots', 'Builders', 'Rangers', 'Collective', 'Lab', 'Makers', 'Trekkers'];
const PITCHES = [
  (theme) => `First-time hackers keen on ${theme}. We have an idea and lots of energy - looking for people to build it with.`,
  (theme) => `Building a quick prototype around ${theme}. Need a couple more people who like shipping fast.`,
  (theme) => `SMU students teaming up for this one. Interested in ${theme}, open to beginners and experienced hackers.`,
  (theme) => `We want to make something useful for students using ${theme}. Looking for builders and a designer.`,
  (theme) => `Weekend hack crew! Focused on ${theme}. Bring your skills, we will figure out the rest together.`,
];
const SKILL_SETS = [
  ['React', 'Node.js', 'UI/UX'],
  ['Python', 'Machine Learning', 'Pitching'],
  ['Vue.js', 'JavaScript', 'Figma'],
  ['SQL', 'Data Analysis', 'Python'],
  ['Mobile', 'Java', 'UI/UX'],
  ['Cloud', 'Node.js', 'Cybersecurity'],
  ['Figma', 'Pitching', 'Project Management'],
  ['JavaScript', 'React', 'Data Analysis'],
];

// a team for hackathon number `index`; `extra` = 1 for a second team on the same hackathon
function generatedTeam(index, extra, themes) {
  const n = index * 2 + extra;
  const leaders = demoUsers.map((person) => person.key);
  const leader = leaders[n % leaders.length];
  const helper = leaders[(n + 5) % leaders.length];
  const theme = themes.length > 0 ? themes[n % themes.length].toLowerCase() : 'tech for good';
  return {
    name: `${NAME_FIRST[n % NAME_FIRST.length]} ${NAME_SECOND[(n * 7 + 3) % NAME_SECOND.length]}`,
    event: index,
    leader,
    members: n % 3 === 0 && helper !== leader ? [{ user: helper, role: 'Builder' }] : [],
    teamSize: 3 + (n % 3),
    skills: SKILL_SETS[n % SKILL_SETS.length],
    pitch: PITCHES[n % PITCHES.length](theme),
  };
}

async function upsertDemoUser(person) {
  const userName = DEMO_EMAIL(person.key);
  const existing = await User.findOne({ userName });
  if (existing) {
    Object.assign(existing, { displayName: person.displayName, year: person.year, faculty: person.faculty, skills: person.skills });
    await existing.save();
    return existing;
  }
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
  return User.create({
    userName,
    password,
    displayName: person.displayName,
    year: person.year,
    faculty: person.faculty,
    skills: person.skills,
    onboarded: true,
    openToTeams: true,
  });
}

// open Devpost hackathons, closing soonest first, saved as Opportunities so teams can link to them
// (returns { opportunity, themes } so generated pitches can mention what the hackathon is about)
// (only ones open for at least another 12 hours, so the demo teams don't vanish straight away)
async function getOpenHackathons(count) {
  const { hackathons } = await opportunityService.getHackathons();
  const soon = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const open = hackathons
    .filter((h) => h.deadline && new Date(h.deadline) > soon)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, count);
  const saved = await Promise.all(open.map((h) => opportunityService.findOrCreateOpportunity(h)));
  return saved.map((opportunity, i) => ({ opportunity, themes: open[i].themes ?? [] }));
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const users = {};
  for (const person of demoUsers) {
    users[person.key] = await upsertDemoUser(person);
  }

  const hackathons = await getOpenHackathons(60);
  if (hackathons.length === 0) {
    console.log('No open hackathons on Devpost right now - only the campus-event teams will be made.');
  }

  // start fresh: remove the old demo teams and the requests people sent to them
  const demoUserIds = (await User.find({ userName: DEMO_EMAIL_PATTERN }).select('_id')).map((u) => u._id);
  const oldTeamIds = await Team.find({ leaderId: { $in: demoUserIds } }).distinct('_id');
  await TeamRequest.deleteMany({ teamId: { $in: oldTeamIds } });
  await Team.deleteMany({ _id: { $in: oldTeamIds } });

  // the hand-written teams cover hackathons 0-7; every other open hackathon gets 1 generated team,
  // and every third one gets a second team
  const allTeams = [...demoTeams];
  const usedNames = new Set(demoTeams.map((team) => team.name));
  for (let index = 8; index < hackathons.length; index++) {
    for (let extra = 0; extra < (index % 3 === 0 ? 2 : 1); extra++) {
      const team = generatedTeam(index, extra, hackathons[index].themes);
      if (usedNames.has(team.name)) team.name += ' ' + (index + 1);
      usedNames.add(team.name);
      allTeams.push(team);
    }
  }

  let made = 0;
  for (const team of allTeams) {
    let event;
    let closesAt;
    if (typeof team.event === 'number') {
      if (hackathons.length === 0) continue;
      const hackathon = hackathons[team.event % hackathons.length].opportunity;
      event = { opportunityId: hackathon._id, name: hackathon.title, location: hackathon.location };
      closesAt = hackathon.deadline;
    } else {
      event = { name: team.event.name, location: team.event.location };
      closesAt = new Date(Date.now() + team.event.daysOpen * 24 * 60 * 60 * 1000);
    }
    const leader = users[team.leader];
    await Team.create({
      name: team.name,
      leaderId: leader._id,
      event,
      closesAt,
      teamSize: team.teamSize,
      externalMembers: 0,
      members: [
        { userId: leader._id, role: 'Team lead' },
        ...team.members.map((member) => ({ userId: users[member.user]._id, role: member.role })),
      ],
      pitch: team.pitch,
      skills: team.skills,
      autoAccept: false,
      status: 'open',
    });
    made++;
  }

  const covered = new Set(allTeams.filter((team) => typeof team.event === 'number').map((team) => team.event % hackathons.length));
  console.log(`Seeded ${made} open demo teams across ${covered.size} of ${hackathons.length} open hackathons.`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
