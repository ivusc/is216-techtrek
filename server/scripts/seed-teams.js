// Adds demo hackathon teams that are open to join, so the Teams page and "Find team" have something to show.
//
//   pnpm --filter @techtrek/server seed:teams
//
// Safe to run again: it removes the teams (and their join requests) led by the demo users and makes them fresh,
// on whichever Devpost hackathons are open right now. Real users and their teams are never touched.
// Demo users have a random password nobody knows, so they can't be logged into.
//
//   pnpm --filter @techtrek/server seed:teams --profiles
//
// only refreshes the demo users' profiles (course, about, skills, picture) and leaves every team alone.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const opportunityService = require('../service/opportunity-service');
const { drawAvatar } = require('./demo-avatars');

const DEMO_EMAIL = (name) => `techtrek.demo.${name}@smu.edu.sg`;
const DEMO_EMAIL_PATTERN = /^techtrek\.demo\..+@smu\.edu\.sg$/;

// course and about: what shows on their profile page and profile card
// look: how their illustrated profile picture is drawn (see demo-avatars.js)
const demoUsers = [
  {
    key: 'alicia', displayName: 'Alicia Tan', year: 2, faculty: 'SCIS', course: 'Information Systems',
    skills: ['Vue.js', 'Figma', 'UI/UX'],
    about: "Year 2 IS student who sketches every app idea in Figma before writing a line of code. I've done two hackathons and loved making the demo look polished. Happy to lead, and I'm trying to get better at backend.",
    look: { background: '#ffe3d3', skin: '#f6d2b8', hair: '#1f1a1c', hairStyle: 'long', shirt: '#7662da' },
  },
  {
    key: 'marcus', displayName: 'Marcus Lee', year: 3, faculty: 'SCIS', course: 'Computer Science',
    skills: ['Python', 'Machine Learning', 'Data Analysis'],
    about: 'CS year 3, AI track. I like turning messy datasets into something you can actually use. Interned at a fintech last summer doing fraud models. Coffee-powered, will happily pair-program at 2am.',
    look: { background: '#dbe8ff', skin: '#efc9a8', hair: '#26211f', hairStyle: 'short', shirt: '#2f4d7a', glasses: '#2b2340' },
  },
  {
    key: 'priya', displayName: 'Priya Nair', year: 2, faculty: 'LKCSB', course: 'Business Management',
    skills: ['Pitching', 'Project Management'],
    about: "Business student who loves tech teams. I keep projects on track, write the pitch deck and do the talking on demo day. Won 2nd at a case competition last term. I can't code (yet) but I learn fast.",
    look: { background: '#ffeccc', skin: '#b98260', hair: '#1a1214', hairStyle: 'ponytail', shirt: '#d1495b' },
  },
  {
    key: 'daniel', displayName: 'Daniel Wong', year: 1, faculty: 'SCIS', course: 'Software Engineering',
    skills: ['React', 'Node.js', 'JavaScript'],
    about: 'Freshie in SE. Been building websites since secondary school, mostly React and Node. Looking for my first proper hackathon team. Beginners welcome, I like explaining things.',
    look: { background: '#e2f7ea', skin: '#f3d0b2', hair: '#2b2222', hairStyle: 'fringe', shirt: '#3d7dd8' },
  },
  {
    key: 'sarah', displayName: 'Sarah Lim', year: 3, faculty: 'SOE', course: 'Economics',
    skills: ['Data Analysis', 'SQL', 'Python'],
    about: 'Economics major with a soft spot for data viz. I do the analysis, find the story in the numbers and make charts that judges understand. Interested in transport and urban planning.',
    look: { background: '#f3e0ff', skin: '#f2cfb3', hair: '#4a2f22', hairStyle: 'bob', shirt: '#e0835b', glasses: '#8a5a44' },
  },
  {
    key: 'junhao', displayName: 'Jun Hao Chua', year: 4, faculty: 'SCIS', course: 'Information Systems',
    skills: ['Cloud', 'Cybersecurity', 'Java'],
    about: 'Final year IS, cybersecurity track. AWS certified and a regular at CTFs. I set up the cloud side and make sure nothing leaks. Looking for teammates who care about building things properly.',
    look: { background: '#dff3f5', skin: '#eac5a5', hair: '#1c1a1d', hairStyle: 'short', shirt: '#26324a' },
  },
  {
    key: 'ethan', displayName: 'Ethan Ng', year: 2, faculty: 'SCIS', course: 'Computer Science',
    skills: ['Java', 'SQL'],
    about: 'Backend person. Java, Spring and databases are my comfort zone. Quiet in meetings, loud in the commit history. Want to try mobile dev next.',
    look: { background: '#e8e4ff', skin: '#f0cdb0', hair: '#1d1a1b', hairStyle: 'fringe', shirt: '#383b4a' },
  },
  {
    key: 'meiling', displayName: 'Mei Ling Goh', year: 1, faculty: 'SOSS', course: 'Psychology',
    skills: ['UI/UX', 'Pitching'],
    about: 'Psychology student interested in why people tap what they tap. I run user interviews and turn them into designs. First hackathon this semester and very excited!',
    look: { background: '#e2f4ff', skin: '#f7d8c0', hair: '#2a2024', hairStyle: 'bun', shirt: '#5aa9a0' },
  },
  {
    key: 'ravi', displayName: 'Ravi Kumar', year: 3, faculty: 'SCIS', course: 'Software Engineering',
    skills: ['Mobile', 'React', 'Cloud'],
    about: 'I build mobile apps with React Native and Flutter, and have two small apps on the Play Store. Into anything that helps students save time. Always up for a weekend build.',
    look: { background: '#fff1c9', skin: '#a8714f', hair: '#17110f', hairStyle: 'curly', shirt: '#3c8c6e' },
  },
  {
    key: 'chloe', displayName: 'Chloe Teo', year: 2, faculty: 'LKCSB', course: 'Business Analytics',
    skills: ['Data Analysis', 'Pitching', 'Figma'],
    about: 'Business Analytics student who sits between the data people and the design people. Tableau, Excel wizardry and clean slides. I like ideas with a real business case behind them.',
    look: { background: '#ffe0ea', skin: '#f5d3bd', hair: '#3a2520', hairStyle: 'long', shirt: '#2f8f9d' },
  },
  {
    key: 'bryan', displayName: 'Bryan Ho', year: 4, faculty: 'SCIS', course: 'Computer Science',
    skills: ['Machine Learning', 'Python', 'SQL'],
    about: 'Year 4 CS doing my FYP on LLMs for education. I can fine-tune models and build the API around them. Looking for frontend and design teammates to make my models usable.',
    look: { background: '#e6ecf5', skin: '#e8c3a2', hair: '#121012', hairStyle: 'short', shirt: '#6b4fa0', glasses: '#1e1e24' },
  },
  {
    key: 'nadia', displayName: 'Nadia Rahman', year: 1, faculty: 'YPHSL', course: 'Law',
    skills: ['Project Management', 'Pitching'],
    about: 'Law freshie curious about legal tech. Debater, so pitching is my thing. I want to work on ideas that make legal help easier to get. Happy to handle research and the presentation.',
    look: { background: '#d9f0e6', skin: '#d9a77f', hair: '#1f1a1c', hairStyle: 'hijab', scarf: '#c9637a', shirt: '#c9637a' },
  },
];

// event: a number = that open Devpost hackathon (0 = closing soonest of those open for at least 12 more hours),
//        so "Find team" on its card shows the team;
//        an object = a campus event that isn't on Devpost, open for that many days
// skills: what the team is looking for
// openRoles: the role each open spot is for (none = anyone can ask)
const demoTeams = [
  {
    name: 'Pixel Pushers',
    event: 0,
    leader: 'alicia',
    members: [{ user: 'ethan', role: 'Backend' }],
    teamSize: 4,
    skills: ['React', 'Node.js', 'Pitching'],
    openRoles: ['Frontend developer', 'Pitch & demo'],
    pitch: 'Designer + backend dev building a study-buddy app. Need a frontend dev and someone to own the demo pitch.',
  },
  {
    name: 'Byte Me',
    event: 1,
    leader: 'daniel',
    members: [],
    teamSize: 4,
    skills: ['UI/UX', 'Figma', 'Python'],
    openRoles: ['UI/UX designer', 'Python API developer', 'Frontend developer'],
    pitch: 'First-timer friendly! I can code the web app, looking for a designer and someone comfortable with Python APIs.',
  },
  {
    name: 'Data Divers',
    event: 2,
    leader: 'marcus',
    members: [{ user: 'sarah', role: 'Data' }],
    teamSize: 5,
    skills: ['Vue.js', 'JavaScript', 'Pitching'],
    openRoles: ['Frontend developer', 'Dashboard developer', 'Pitch & storytelling'],
    pitch: 'We have the ML model and the data. Need people to turn it into a dashboard and tell the story to judges.',
  },
  {
    name: 'Pitch Perfect',
    event: 3,
    leader: 'priya',
    members: [{ user: 'meiling', role: 'Design' }],
    teamSize: 4,
    skills: ['React', 'Node.js', 'SQL'],
    openRoles: ['Frontend developer', 'Backend developer'],
    pitch: 'Business + design duo with a fintech idea for students. Looking for two devs to build the prototype.',
  },
  {
    name: 'Null Pointers',
    event: 4,
    leader: 'junhao',
    members: [],
    teamSize: 4,
    skills: ['Python', 'Machine Learning', 'Cloud'],
    openRoles: ['ML engineer', 'Cloud engineer', 'Security researcher'],
    pitch: 'Security-focused hack: phishing detector for SMU emails. Need ML and cloud deployment help.',
  },
  {
    name: 'Insight Squad',
    event: 5,
    leader: 'sarah',
    members: [],
    teamSize: 3,
    skills: ['Figma', 'UI/UX', 'Project Management'],
    openRoles: ['UI/UX designer', 'Project manager'],
    pitch: 'Data visualisation of public transport crowding. Looking for a designer and someone to keep us on track.',
  },
  {
    name: 'App-solutely',
    event: 0,
    leader: 'ravi',
    members: [{ user: 'nadia', role: 'Product' }],
    teamSize: 4,
    skills: ['UI/UX', 'Node.js', 'JavaScript'],
    openRoles: ['UI/UX designer', 'Backend developer'],
    pitch: 'Building a mobile app that splits group project tasks fairly. Need a designer and a backend dev.',
  },
  {
    name: 'Prompt Engineers',
    event: 2,
    leader: 'bryan',
    members: [],
    teamSize: 3,
    skills: ['React', 'Figma', 'Pitching'],
    openRoles: ['Frontend developer', 'Pitch & business'],
    pitch: 'AI study planner that reads your syllabus. The model works - we need a nice front end and a strong pitch.',
  },
  {
    name: 'Chart Toppers',
    event: 6,
    leader: 'chloe',
    members: [],
    teamSize: 4,
    skills: ['Python', 'SQL', 'Vue.js'],
    openRoles: ['Data analyst', 'Frontend developer', 'Backend developer'],
    pitch: 'Visualising hawker centre prices across Singapore. Looking for people who can wrangle data and build the site.',
  },
  {
    name: 'Cloud Nine',
    event: 7,
    leader: 'ethan',
    members: [{ user: 'meiling', role: 'Design' }],
    teamSize: 4,
    skills: ['Cloud', 'Cybersecurity', 'Machine Learning'],
    openRoles: ['Cloud engineer', 'Security engineer'],
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
    openRoles: ['Full-stack developer', 'User researcher'],
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

// the roles a generated team needs, matching SKILL_SETS one for one
const ROLE_SETS = [
  ['Frontend developer', 'Backend developer', 'UI/UX designer'],
  ['ML engineer', 'Python developer', 'Pitch & business'],
  ['Frontend developer', 'UI/UX designer', 'Full-stack developer'],
  ['Data analyst', 'Python developer', 'Data engineer'],
  ['Mobile developer', 'Backend developer', 'UI/UX designer'],
  ['Cloud engineer', 'Backend developer', 'Security engineer'],
  ['UI/UX designer', 'Pitch & business', 'Project manager'],
  ['Frontend developer', 'Data analyst', 'Full-stack developer'],
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
    openRoles: ROLE_SETS[n % ROLE_SETS.length],
    pitch: PITCHES[n % PITCHES.length](theme),
  };
}

async function upsertDemoUser(person) {
  const userName = DEMO_EMAIL(person.key);
  const profile = {
    displayName: person.displayName,
    year: person.year,
    faculty: person.faculty,
    course: person.course,
    about: person.about,
    skills: person.skills,
    // a freshly drawn picture each run (updatedAt changes, so browsers fetch the new one)
    avatar: { data: drawAvatar(person.look), contentType: 'image/png', updatedAt: new Date() },
  };
  const existing = await User.findOne({ userName });
  if (existing) {
    Object.assign(existing, profile);
    await existing.save();
    return existing;
  }
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
  return User.create({ userName, password, ...profile, onboarded: true, openToTeams: true });
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
  if (process.argv.includes('--profiles')) {
    console.log(`Updated ${demoUsers.length} demo profiles. Teams were left as they are.`);
    return;
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
    const openSpots = team.teamSize - 1 - team.members.length;
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
      openRoles: (team.openRoles ?? []).slice(0, openSpots),
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
