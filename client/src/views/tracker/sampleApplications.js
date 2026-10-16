// Sample data copied from the Figma board, so the page has something to show before the backend is connected.
// Same shape as GET /application (opportunityId is populated). Delete this file once the real data is loaded.

// dates are relative to today so "due this week" always has something in it
function daysFromNow(days) {
  return new Date(Date.now() + days * 86400000).toISOString()
}

export const sampleApplications = [
  {
    _id: 'sample-1',
    status: 'saved',
    notes: 'Need a team of 3',
    deadline: daysFromNow(3),
    updatedAt: daysFromNow(-2),
    opportunityId: { type: 'competition', title: 'Shopee Code League 2027', organisation: 'Shopee' }
  },
  {
    _id: 'sample-2',
    status: 'saved',
    notes: '',
    deadline: daysFromNow(22),
    updatedAt: daysFromNow(-1),
    opportunityId: { type: 'internship', title: 'Frontend Engineer Intern (Vue)', organisation: 'GovTech' }
  },
  {
    _id: 'sample-3',
    status: 'saved',
    notes: '',
    deadline: daysFromNow(25),
    updatedAt: daysFromNow(-1),
    opportunityId: { type: 'hackathon', title: 'Lifehack 2027', organisation: 'NUS Computing' }
  },
  {
    _id: 'sample-4',
    status: 'saved',
    notes: 'Ask senior for referral',
    deadline: daysFromNow(38),
    updatedAt: daysFromNow(-3),
    opportunityId: { type: 'internship', title: 'ML Engineer Intern', organisation: 'ByteDance' }
  },
  {
    _id: 'sample-5',
    status: 'applied',
    notes: 'Submitted resume v3, follow up with HR next week.',
    deadline: daysFromNow(1),
    updatedAt: daysFromNow(-4),
    opportunityId: { type: 'internship', title: 'Data Analyst Intern', organisation: 'DBS Bank' }
  },
  {
    _id: 'sample-6',
    status: 'applied',
    notes: 'Applied through careers page',
    updatedAt: daysFromNow(-5),
    opportunityId: { type: 'internship', title: 'Backend Engineer Intern (Go)', organisation: 'Shopee' }
  },
  {
    _id: 'sample-7',
    status: 'applied',
    notes: 'Waiting for team reply. Pitch idea drafted.',
    deadline: daysFromNow(16),
    updatedAt: daysFromNow(-2),
    opportunityId: { type: 'hackathon', title: 'Hack&Roll — Team Byte Me', organisation: 'NUS Hackers' }
  },
  {
    _id: 'sample-8',
    status: 'interview',
    notes: 'Revise graphs and system design, prepare STAR stories.',
    interviewAt: daysFromNow(6),
    updatedAt: daysFromNow(-1),
    opportunityId: { type: 'internship', title: 'Software Engineer Intern', organisation: 'Grab' }
  },
  {
    _id: 'sample-9',
    status: 'interview',
    notes: 'Online assessment done, technical round next.',
    interviewAt: daysFromNow(12),
    updatedAt: daysFromNow(-3),
    opportunityId: { type: 'internship', title: 'Software Engineer Intern', organisation: 'Visa' }
  },
  {
    _id: 'sample-10',
    status: 'offer',
    notes: 'Compare with Grab offer',
    deadline: daysFromNow(17),
    updatedAt: daysFromNow(-1),
    opportunityId: { type: 'internship', title: 'Technology Intern (Winter)', organisation: 'OCBC' }
  },
  {
    _id: 'sample-11',
    status: 'rejected',
    notes: '',
    updatedAt: daysFromNow(-7),
    opportunityId: { type: 'internship', title: 'Research Intern', organisation: 'Sea AI Lab' }
  }
]
