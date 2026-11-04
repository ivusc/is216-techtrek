// Everything the landing page says, in one place. It follows the project proposal:
// Project Overview (the problem) -> Objectives / Functionality (the features).

// the words the hero headline cycles through: "Every tech ___ at SMU, in one place."
export const heroWords = ['opportunity', 'internship', 'hackathon', 'competition']

// Project Overview: the four problems SMU students run into, and how TechTrek answers each one.
// feature: which tab in "Features" this problem belongs to
export const problems = [
  {
    id: 'scattered',
    feature: 'discover',
    icon: 'bi-window-stack',
    problem: 'Opportunities are scattered',
    problemText: 'Internships on one site, hackathons on another, competitions somewhere else. You check five tabs and still miss things.',
    solution: 'Everything in one feed',
    solutionText: 'Adzuna jobs and open Devpost hackathons side by side, filtered by type, sector and role.',
    solutionIcon: 'bi-compass',
  },
  {
    id: 'deadlines',
    feature: 'track',
    icon: 'bi-calendar-x',
    problem: 'Deadlines slip through',
    problemText: 'Application dates, interview times and notes live in your head, a spreadsheet and a group chat.',
    solution: 'A board and calendar for all of it',
    solutionText: 'Drag each application through Saved, Applied, Interview and Offer, with checklists, notes and a calendar you can export.',
    solutionIcon: 'bi-clipboard-data',
  },
  {
    id: 'interviews',
    feature: 'practise',
    icon: 'bi-question-octagon',
    problem: 'Interviews feel like guesswork',
    problemText: "You don't know what they'll ask, and nobody tells you whether your answer was any good.",
    solution: 'Practice with instant feedback',
    solutionText: 'Questions by role and type, answers scored by Gemini, plus tips from seniors who got the offer.',
    solutionIcon: 'bi-chat-left-text',
  },
  {
    id: 'teams',
    feature: 'team',
    icon: 'bi-person-x',
    problem: 'No team, no hackathon',
    problemText: 'Most hackathons need a team. Without groupmates who have the right skills, you just sit it out.',
    solution: 'Teammates with the skills you need',
    solutionText: 'Post your open roles, get matched by skills, and send or accept requests in a tap.',
    solutionIcon: 'bi-people',
  },
]

// Objectives / Functionality: the four features, each with the problem it solves, what it really does
// in the app, and which mini preview to draw
export const features = [
  {
    id: 'discover',
    label: 'Discover',
    icon: 'bi-compass',
    title: 'Find every tech opportunity in one place',
    solves: 'Opportunities are scattered across sites',
    points: [
      'Adzuna jobs and open Devpost hackathons in one feed',
      'Filter by type, sector, role and closing date',
      '"Based on your skills" picks from your profile',
      'Save anything to your tracker in one tap',
    ],
    to: '/opportunities',
  },
  {
    id: 'track',
    label: 'Track',
    icon: 'bi-clipboard-data',
    title: 'Keep every application moving',
    solves: 'Deadlines and notes slip through the cracks',
    points: [
      'A drag-and-drop board from Saved to Offer',
      'A calendar of every deadline, exportable to your own',
      'Prep checklists and notes on each application',
      'Confetti when you land the offer',
    ],
    to: '/tracker',
  },
  {
    id: 'team',
    label: 'Team up',
    icon: 'bi-people',
    title: 'Find teammates with the skills you need',
    solves: 'No groupmates means no hackathon',
    points: [
      'Post your team with the roles you still need',
      'See who matches your skills, and who is already in',
      'Send, accept and invite for a specific role',
      'Get notified the moment someone joins',
    ],
    to: '/teams',
  },
  {
    id: 'practise',
    label: 'Practise',
    icon: 'bi-chat-left-text',
    title: 'Walk into interviews prepared',
    solves: "You don't know what they'll ask",
    points: [
      'A question bank for the roles you are tracking',
      'Answers scored out of 10 with feedback from Gemini',
      'See your average and best scores improve',
      'Interview tips from seniors who got the offer',
    ],
    to: '/interview',
  },
]

// how it works: one opportunity from start to finish
export const steps = [
  { icon: 'bi-search', title: 'Discover', text: 'Spot a hackathon or internship that fits your skills.' },
  { icon: 'bi-bookmark-plus', title: 'Track it', text: 'Save it to your board. The deadline lands on your calendar.' },
  { icon: 'bi-people', title: 'Team up and prepare', text: 'Find teammates for the role you need, and practise for the interview.' },
  { icon: 'bi-trophy', title: 'Land it', text: 'Move the card to Offer, then share tips for the next student.' },
]

// the smaller things that make it pleasant to use
export const extras = [
  { icon: 'bi-bell', title: 'Notifications', text: 'Requests, invites and new teammates, the moment they happen.' },
  { icon: 'bi-stars', title: 'Skill matching', text: 'Teams and listings that need what you already know.' },
  { icon: 'bi-calendar-check', title: 'Calendar export', text: 'Every deadline and interview in your own calendar app.' },
  { icon: 'bi-chat-quote', title: 'Senior tips', text: 'Anonymous advice from students who got the offer.' },
  { icon: 'bi-moon-stars', title: 'Dark mode', text: 'Easy on the eyes for late-night applications.' },
  { icon: 'bi-person-badge', title: 'Your profile', text: 'Skills, GitHub and LinkedIn, shared when you ask to join.' },
]

