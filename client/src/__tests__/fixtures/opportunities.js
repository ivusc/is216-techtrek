import { NOW } from './applications';

const DAY = 24 * 60 * 60 * 1000;

function job(index) {
  const number = index + 1;
  const base = {
    source: 'adzuna',
    externalId: String(number),
    type: 'job',
    title: `Software Engineer ${String(number).padStart(2, '0')}`,
    organisation: `Company ${number}`,
    location: index % 4 === 3 ? 'Remote' : 'Singapore',
    description: 'Build and ship product features with a small team.',
    url: `https://adzuna.test/jobs/${number}`,
    minSalary: 48000 + index * 1200,
    maxSalary: 60000 + index * 1200,
    salaryIsPredicted: false,
    contractTime: 'full_time',
    contractType: 'permanent',
    postedAt: new Date(Date.parse(NOW) - index * DAY).toISOString(),
  };
  if (index === 0) {
    return {
      ...base,
      type: 'internship',
      title: 'Frontend Intern',
      organisation: 'Acme',
      minSalary: 24000,
      maxSalary: 30000,
      contractType: 'contract',
    };
  }
  if (index === 1) {
    return { ...base, title: 'Backend Engineer', organisation: 'Shopee', salaryIsPredicted: true };
  }
  return base;
}

export function jobs(count) {
  return Array.from({ length: count }, (_, index) => job(index));
}

export const HACKATHONS = [
  {
    source: 'devpost',
    externalId: '201',
    type: 'hackathon',
    title: 'Build for Good',
    organisation: 'Code for SG',
    location: 'Singapore',
    dates: 'Oct 20 - Nov 05, 2026',
    deadline: '2026-11-05T23:59:59.000Z',
    prize: '$2,000 in prizes',
    themes: [],
    url: 'https://devpost.test/build-for-good',
    thumbnail: 'https://devpost.test/build-for-good.png',
    registrations: 120,
    featured: false,
  },
  {
    source: 'devpost',
    externalId: '202',
    type: 'hackathon',
    title: 'Code for Climate',
    organisation: 'GreenTech',
    location: 'Online',
    dates: 'Oct 01 - Nov 01, 2026',
    deadline: '2026-11-01T23:59:59.000Z',
    prize: '$1,000 in prizes',
    themes: ['Sustainability'],
    url: 'https://devpost.test/code-for-climate',
    thumbnail: 'https://devpost.test/code-for-climate.png',
    registrations: 340,
    featured: false,
  },
  {
    source: 'devpost',
    externalId: '203',
    type: 'hackathon',
    title: 'AI Builders Challenge',
    organisation: 'OpenLab',
    location: 'Online',
    dates: 'Oct 24 - Nov 30, 2026',
    deadline: '2026-11-30T23:59:59.000Z',
    prize: '$10,000 in prizes',
    themes: ['AI', 'Fintech'],
    url: 'https://devpost.test/ai-builders',
    thumbnail: 'https://devpost.test/ai-builders.png',
    registrations: 1250,
    featured: true,
  },
  {
    source: 'devpost',
    externalId: '204',
    type: 'hackathon',
    title: 'Campus Makers',
    organisation: 'SMU',
    location: 'SMU, Singapore',
    dates: 'Nov 10 - Dec 15, 2026',
    deadline: '2026-12-15T23:59:59.000Z',
    prize: '',
    themes: ['Education'],
    url: 'https://devpost.test/campus-makers',
    thumbnail: 'https://devpost.test/campus-makers.png',
    registrations: 45,
    featured: false,
  },
];
