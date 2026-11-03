// Bootstrap colour classes for the type badge on each card
export const typeBadge = {
  job: 'bg-primary-subtle text-primary-emphasis',
  internship: 'bg-body-secondary text-body-secondary',
  hackathon: 'bg-tt-peach text-body',
  competition: 'bg-info-subtle text-body'
}

// the 5 tracker columns, in board order
export const trackerStages = [
  { status: 'saved', label: 'Saved' },
  { status: 'applied', label: 'Applied' },
  { status: 'interview', label: 'Interview' },
  { status: 'offer', label: 'Offer' },
  { status: 'rejected', label: 'Rejected' }
]

// SMU schools for onboarding; the code is what gets saved (the server checks it is one of these)
export const faculties = [
  { code: 'SCIS', name: 'School of Computing and Information Systems' },
  { code: 'LKCSB', name: 'Lee Kong Chian School of Business' },
  { code: 'SOA', name: 'School of Accountancy' },
  { code: 'SOE', name: 'School of Economics' },
  { code: 'YPHSL', name: 'Yong Pung How School of Law' },
  { code: 'SOSS', name: 'School of Social Sciences' },
  { code: 'CIS', name: 'College of Integrative Studies' }
]

// one-click skills on the onboarding page, so people match teams that ask for the same words
export const popularSkills = [
  'Vue.js', 'React', 'JavaScript', 'Python', 'Java', 'Node.js', 'SQL', 'UI/UX',
  'Figma', 'Data Analysis', 'Machine Learning', 'Cloud', 'Mobile', 'Cybersecurity', 'Pitching', 'Project Management'
]

// profile page choices (the server checks levels, opportunity types and work types)
export const skillLevelOptions = ['Beginner', 'Intermediate', 'Advanced']

export const careerRoles = [
  'Software Engineering', 'Frontend', 'Backend', 'Full Stack', 'Product Design',
  'Data Analytics', 'AI / Machine Learning', 'Product Management', 'Cybersecurity'
]

export const opportunityTypeOptions = [
  { value: 'internship', label: 'Internships' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'competition', label: 'Competitions' }
]

export const workTypeOptions = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' }
]
