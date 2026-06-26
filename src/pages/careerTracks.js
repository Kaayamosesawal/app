/**
 * careerTracks.js – single source of truth for all career track data.
 *
 * Fields used by Apply.jsx:   key, type, title, description, tag, color, lightBg
 * Fields added for Career.jsx: icon, location, employment, duration,
 *                               qualifications, experience, responsibilities,
 *                               eligibility, benefits
 *
 * Keep this file in sync with the TRACK_KEYS array in functions/index.js:
 *   const TRACK_KEYS = ['softwareDev', 'accounts', 'sales', 'internship'];
 */

export const CAREER_TRACKS = [
  {
    key:         'softwareDev',
    type:        'Job',
    title:       'Software Developer',
    tag:         'Job Opening',
    color:       '#2E6DA4',
    lightBg:     '#EBF4FF',
    icon:        'fas fa-code',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    description:
      'We are looking for a talented and motivated Software Developer to build high-quality, scalable web and mobile applications — developing innovative digital solutions for our clients across Uganda and the region.',
    qualifications: [
      "Bachelor's Degree in Computer Science, Information Technology, or Software Engineering.",
      'Diploma in Computer Science or IT with strong practical skills will be considered.',
      'Relevant certifications in web development or JavaScript frameworks are an advantage.',
    ],
    experience: [
      'Minimum of 1 year of hands-on experience in software development.',
      'Strong internship or project experience in relevant technologies may be considered.',
    ],
    responsibilities: [
      'Design, develop, test, and maintain web applications using HTML, CSS, JavaScript, React, Node.js, PHP, or Laravel.',
      'Develop and integrate RESTful APIs and backend services.',
      'Collaborate with designers and project managers to translate requirements into functional solutions.',
      'Write clean, efficient, and well-documented code.',
      'Perform debugging, troubleshooting, and performance optimization.',
      'Ensure applications are responsive, secure, and scalable.',
      'Participate in code reviews and contribute to team knowledge sharing.',
    ],
  },

  {
    key:         'accounts',
    type:        'Job',
    title:       'Accounts & Finance',
    tag:         'Job Opening',
    color:       '#0F766E',
    lightBg:     '#F0FDFA',
    icon:        'fas fa-calculator',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    description:
      'We are seeking a detail-oriented and reliable Accounts Officer to manage the financial operations of our growing technology company, ensuring accurate financial reporting and compliance with Ugandan tax regulations.',
    qualifications: [
      "Bachelor's Degree in Accounting, Finance, or Business Administration.",
      'Professional qualifications such as CPA or ACCA are an added advantage.',
      'Diploma in Accounting with relevant experience may be considered.',
    ],
    experience: [
      'Minimum of 1 year of relevant working experience in accounting or finance.',
      'Fresh graduates with strong internship records in reputable firms may be considered.',
    ],
    responsibilities: [
      'Manage daily financial transactions including accounts payable and receivable.',
      'Prepare monthly, quarterly, and annual financial reports and statements.',
      'Ensure timely filing of tax returns (VAT, PAYE, NSSF) in compliance with URA regulations.',
      'Reconcile bank statements and maintain accurate financial records.',
      'Support budgeting, forecasting, and cash flow management.',
      'Handle payroll processing and statutory deductions.',
      'Assist with internal and external audits.',
    ],
  },

  {
    key:         'sales',
    type:        'Job',
    title:       'Sales & Marketing',
    tag:         'Job Opening',
    color:       '#7C3AED',
    lightBg:     '#F5F3FF',
    icon:        'fas fa-chart-line',
    location:    'Lira City, Uganda (with field visits)',
    employment:  'Full-time · Performance Incentives',
    description:
      'We are hiring a proactive and results-driven Sales Officer to promote our IT services and acquire new clients — driving revenue growth by identifying business opportunities and building strong client relationships.',
    qualifications: [
      "Bachelor's Degree in Marketing, Business Administration, or Information Technology.",
      'Diploma in Sales or Marketing with proven sales experience will be considered.',
    ],
    experience: [
      'Minimum of 1 year of sales experience, preferably in IT, software, or technology services.',
    ],
    responsibilities: [
      'Identify and prospect potential clients including businesses, NGOs, and government institutions.',
      'Present and demonstrate company solutions through meetings and proposals.',
      'Prepare and negotiate quotations, contracts, and service level agreements.',
      'Build and maintain long-term relationships with existing and new clients.',
      'Achieve monthly and quarterly sales targets.',
      'Market services through networking, digital channels, and direct outreach.',
      'Gather market intelligence to inform business strategy.',
    ],
  },

  {
    key:         'internship',
    type:        'Internship',
    title:       'IT Intern – Software Development Track',
    tag:         'Internship',
    color:       '#B45309',
    lightBg:     '#FFFBEB',
    icon:        'fas fa-user-graduate',
    location:    'Lira City, Uganda',
    employment:  'Paid Internship',
    duration:    '10 Weeks',
    description:
      'A structured and paid internship program providing hands-on experience to talented students and recent graduates in computer-related programs. Interns work on real client projects under the guidance of experienced developers.',
    eligibility: [
      'Currently enrolled or recently graduated students in Computer Science, Information Technology, Information Systems, or Software Engineering.',
      'Strong academic record with demonstrated interest in web development or programming.',
    ],
    responsibilities: [
      'Assist in developing and maintaining web applications and digital projects.',
      'Participate in coding, testing, and documentation tasks.',
      'Learn modern development tools and best practices.',
      'Support the team in client project delivery.',
      'Attend team meetings and knowledge-sharing sessions.',
    ],
    benefits: [
      'Competitive monthly stipend (paid internship).',
      'Hands-on experience with real client projects.',
      'Mentorship from experienced professionals.',
      'Opportunity for full-time employment upon successful completion.',
      'Certificate of completion.',
    ],
  },
];