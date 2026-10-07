/**
 * careerTracks.js – single source of truth for all career track data.
 *
 * Fields used by Apply.jsx:   key, type, title, description, tag, color, lightBg,
 *                               division, location, employment, duration,
 *                               rolePlaceholder, coverPlaceholder, extraFields
 *   extraFields item: { key, label, type: 'text'|'select'|'textarea', placeholder?, options?, required? }
 *   Answers are saved on each application as `extras` and `extraAnswers`.
 * Fields added for Career.jsx: icon, location, employment, duration,
 *                               qualifications, experience, responsibilities,
 *                               eligibility, benefits
 *
 * Keep this file in sync with the TRACK_KEYS array in functions/index.js:
 *   const TRACK_KEYS = ['softwareDev', 'accounts', 'sales', 'secretary', 'customerSupport',
 *                     'agronomist', 'fashionDesigner', 'ecommerce', 'logistics', 'cybersecurity',
 *                     'internTechnology', 'internFashions', 'internAgri', 'internTrade', 'internCorporate'];
 */


/* ════════════════════════════════════════════════════════════════════════
 * LEARNING-BASED INTERNSHIPS
 * One internship per department, together covering every job track above.
 * All share the GENERAL eligibility / roles / compensation below; each
 * department adds its own focus on top via makeInternship().
 * ════════════════════════════════════════════════════════════════════════ */
const INTERNSHIP_GENERAL = {
  type:       'Internship',
  tag:        'Learning-Based Internship',
  location:   'Lira City, Uganda',
  employment: 'Learning-Based Internship (non-salaried)',
  duration:   '10 Weeks',

  // General eligibility – applies to every departmental internship
  eligibility: [
    'Currently enrolled in, or a recent graduate (within the last 2 years) of, a university, college, or vocational institute in a field relevant to the department.',
    'Genuine interest in learning, with a good academic or practical-training record.',
    'Good communication skills, a positive attitude, and willingness to take guidance and feedback.',
    'Available for the full 10-week programme (full-time, or an agreed schedule around studies).',
    'An introduction or placement letter from the institution, where required for academic credit.',
  ],

  // General roles – what every intern does, whatever the department
  responsibilities: [
    'Shadow and support experienced staff in day-to-day departmental work.',
    'Complete assigned learning tasks and small projects under supervision.',
    'Keep a weekly logbook of activities, lessons learned, and progress.',
    'Attend team meetings, training sessions, and knowledge-sharing sessions.',
    'Follow company policies, confidentiality rules, and professional conduct.',
    'Present a short end-of-internship report or presentation on what was learned.',
  ],

  // General compensation – learning-based, not a salaried position
  compensation: [
    'Structured on-the-job training and one-on-one mentorship from experienced professionals.',
    'Hands-on exposure to real company and client work in your chosen department.',
    'Certificate of completion at the end of the programme.',
    'Logbook and assessment sign-off to meet your institution’s internship requirements.',
    'Recommendation letter for interns who perform well.',
    'Priority consideration when full-time vacancies open.',
    'Transport / lunch support or a performance-based allowance may be offered at the company’s discretion.',
  ],
};

function makeInternship(dept) {
  const options = dept.focusAreas;
  return {
    ...INTERNSHIP_GENERAL,
    key:        dept.key,
    title:      `Learning-Based Internship – ${dept.name}`,
    color:      dept.color,
    lightBg:    dept.lightBg,
    icon:       dept.icon,
    division:   dept.division,
    coversTracks: dept.coversTracks,
    description: dept.description,
    eligibility:      [...INTERNSHIP_GENERAL.eligibility, ...(dept.eligibility || [])],
    responsibilities: [...INTERNSHIP_GENERAL.responsibilities, ...dept.responsibilities],
    benefits:         INTERNSHIP_GENERAL.compensation,   // alias used by Career.jsx
    rolePlaceholder:  dept.rolePlaceholder,
    coverPlaceholder: dept.coverPlaceholder,
    extraFields: [
      { key: 'studyStatus', label: 'Current status', type: 'select', options: ['Currently enrolled', 'Recent graduate'], required: true },
      { key: 'institution', label: 'Institution', type: 'text', placeholder: 'e.g. Lira University', required: true },
      { key: 'programme',   label: 'Programme / course of study', type: 'text', placeholder: dept.programmePlaceholder, required: true },
      { key: 'focusArea',   label: 'Area you want to learn in', type: 'select', options, required: true },
      { key: 'portfolioUrl', label: 'Portfolio / project link (optional)', type: 'text', placeholder: 'https://' },
    ],
  };
}

const INTERNSHIPS = [
  {
    key: 'internTechnology', name: 'Technology', division: 'Slirus Technologies',
    color: '#B45309', lightBg: '#FFFBEB', icon: 'fas fa-laptop-code',
    coversTracks: ['softwareDev', 'cybersecurity'],
    focusAreas: ['Software Development', 'Cybersecurity & Cloud'],
    description:
      'Learn by doing in our technology team: build web and mobile applications, work with cloud and security tools, and contribute to real client projects under experienced developers and engineers.',
    eligibility: ['Studying Computer Science, Information Technology, Information Systems, Software Engineering, or Networking.'],
    responsibilities: [
      'Assist in developing, testing, and documenting web applications.',
      'Support cloud setup, system monitoring, and basic security checks.',
      'Learn modern development tools, version control, and best practices.',
    ],
    rolePlaceholder: 'e.g. Volunteer Web Developer',
    coverPlaceholder: 'Tell us what you want to learn in the 10 weeks and any projects you have built…',
    programmePlaceholder: 'e.g. BSc Computer Science',
  },
  {
    key: 'internFashions', name: 'Fashions', division: 'Slirus Fashions',
    color: '#BE123C', lightBg: '#FFF1F2', icon: 'fas fa-cut',
    coversTracks: ['fashionDesigner', 'ecommerce'],
    focusAreas: ['Fashion Design & Production', 'E-commerce & Retail'],
    description:
      'Learn how fashion products go from sketch to customer: design, garment production, merchandising, and online and in-store retail with the Slirus Fashions team.',
    eligibility: ['Studying Fashion Design, Textile Design, Marketing, Business Administration, or a related field.'],
    responsibilities: [
      'Assist with sketching, patterns, sampling, and garment production.',
      'Support quality checks, stock, and merchandising.',
      'Help manage online store listings, orders, and social media content.',
    ],
    rolePlaceholder: 'e.g. Tailoring / Retail Attendant',
    coverPlaceholder: 'Describe your style, designs or retail experience and what you hope to learn…',
    programmePlaceholder: 'e.g. Diploma in Fashion Design',
  },
  {
    key: 'internAgri', name: 'AgriSolutions', division: 'Slirus AgriSolutions',
    color: '#15803D', lightBg: '#F0FDF4', icon: 'fas fa-leaf',
    coversTracks: ['agronomist'],
    focusAreas: ['Agronomy & Farm Advisory', 'Agro-inputs & Machinery', 'Produce Handling & Quality'],
    description:
      'Gain practical field and market experience in agriculture: crop advisory, farm inputs, modern machinery, and produce handling with the Slirus AgriSolutions team.',
    eligibility: ['Studying Agriculture, Agronomy, Agribusiness, Crop Science, or a related field.'],
    responsibilities: [
      'Join farm and field visits and farmer demonstrations.',
      'Support stock-taking and quality checks of seeds, fertilizers, and agro-chemicals.',
      'Help prepare field reports and farmer recommendations.',
    ],
    rolePlaceholder: 'e.g. Farm Assistant',
    coverPlaceholder: 'Tell us about your farming or field experience and what you want to learn…',
    programmePlaceholder: 'e.g. BSc Agriculture',
  },
  {
    key: 'internTrade', name: 'Trade & Commercial', division: 'Trade & Commercial',
    color: '#6D28D9', lightBg: '#F5F3FF', icon: 'fas fa-handshake',
    coversTracks: ['sales', 'logistics'],
    focusAreas: ['Sales & Marketing', 'Logistics & Import/Export'],
    description:
      'Learn how we win clients and move goods: prospecting, proposals, marketing, procurement, import/export documentation, and delivery coordination.',
    eligibility: ['Studying Marketing, Business Administration, Supply Chain, Logistics, Procurement, or a related field.'],
    responsibilities: [
      'Assist with client research, outreach, quotations, and proposals.',
      'Support marketing activities and market intelligence gathering.',
      'Help track shipments, suppliers, stock, and import/export documents.',
    ],
    rolePlaceholder: 'e.g. Sales / Procurement Assistant',
    coverPlaceholder: 'Share what draws you to sales or logistics and any relevant experience…',
    programmePlaceholder: 'e.g. BBA Marketing',
  },
  {
    key: 'internCorporate', name: 'Corporate Services', division: 'Corporate Services',
    color: '#0F766E', lightBg: '#F0FDFA', icon: 'fas fa-building',
    coversTracks: ['accounts', 'secretary', 'customerSupport'],
    focusAreas: ['Accounts & Finance', 'Administration & Secretarial', 'Customer Support'],
    description:
      'Learn how a growing company runs behind the scenes: bookkeeping and tax compliance, office administration and records, and client care across all our businesses.',
    eligibility: ['Studying Accounting, Finance, Business Administration, Secretarial Studies, Communications, or a related field.'],
    responsibilities: [
      'Assist with bookkeeping, reconciliations, and tax filing support.',
      'Support correspondence, scheduling, filing, and records management.',
      'Respond to customer inquiries and log follow-ups under guidance.',
    ],
    rolePlaceholder: 'e.g. Office / Accounts Assistant',
    coverPlaceholder: 'Tell us which area interests you most and what you hope to gain…',
    programmePlaceholder: 'e.g. Diploma in Business Administration',
  },
].map(makeInternship);

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
    division:    'Slirus Technologies',
    rolePlaceholder:  "e.g. Junior Web Developer",
    coverPlaceholder: "Tell us about the apps or systems you have built and the stack you enjoy working with…",
    extraFields: [
      { key: 'primaryStack', label: "Main technologies / frameworks", type: 'text', placeholder: "e.g. React, Node.js, Laravel", required: true },
      { key: 'portfolioUrl', label: "GitHub / portfolio link", type: 'text', placeholder: "https://github.com/yourname" },
    ],
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
    division:    'Corporate Services',
    rolePlaceholder:  "e.g. Accounts Assistant",
    coverPlaceholder: "Describe your accounting experience, tax filing exposure (VAT, PAYE, NSSF) and tools you use…",
    extraFields: [
      { key: 'professionalQual', label: "Professional qualification", type: 'select', options: ["None yet", "CPA (Uganda)", "ACCA", "CIMA", "Other"] },
      { key: 'accountingSoftware', label: "Accounting software used", type: 'text', placeholder: "e.g. QuickBooks, Sage, Tally" },
    ],
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
    division:    'Trade & Commercial',
    rolePlaceholder:  "e.g. Sales Executive",
    coverPlaceholder: "Share your sales achievements, the clients you have won and how you reach targets…",
    extraFields: [
      { key: 'fieldVisits', label: "Comfortable with regular field visits?", type: 'select', options: ["Yes", "No"], required: true },
      { key: 'salesBackground', label: "Sales background / industry", type: 'text', placeholder: "e.g. IT services, FMCG, NGOs" },
    ],
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
    key:         'secretary',
    type:        'Job',
    title:       'Secretary',
    tag:         'Job Opening',
    color:       '#BE185D',
    lightBg:     '#FDF2F8',
    icon:        'fas fa-briefcase',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    division:    'Corporate Services',
    rolePlaceholder:  "e.g. Administrative Assistant",
    coverPlaceholder: "Tell us about your administrative experience and how you keep an office organised…",
    extraFields: [
      { key: 'typingSpeed', label: "Typing speed (words per minute)", type: 'text', placeholder: "e.g. 45 WPM" },
      { key: 'msOffice', label: "Microsoft Office proficiency", type: 'select', options: ["Basic", "Intermediate", "Advanced"], required: true },
    ],
    description:
      'We are looking for an organized and professional Secretary to provide administrative support and ensure the smooth day-to-day running of our office, managing correspondence, records, and front-office duties.',
    qualifications: [
      "Bachelor's Degree or Diploma in Secretarial Studies, Office Administration, Business Administration, or a related field.",
      'Proficiency in Microsoft Office (Word, Excel, Outlook) and general office software.',
      'Certificate in Secretarial Studies or Office Management is an added advantage.',
    ],
    experience: [
      'Minimum of 1 year of experience in a secretarial, administrative, or front-office role.',
      'Fresh graduates with strong organizational skills and relevant internship experience may be considered.',
    ],
    responsibilities: [
      'Manage correspondence, emails, and phone calls on behalf of management.',
      'Schedule and coordinate meetings, appointments, and travel arrangements.',
      'Prepare, format, and file official documents, letters, and reports.',
      'Maintain and organize office records, both physical and digital.',
      'Welcome and direct visitors and clients in a professional manner.',
      'Take minutes during meetings and follow up on action points.',
      'Order and manage office supplies and support day-to-day office operations.',
    ],
  },

  {
    key:         'customerSupport',
    type:        'Job',
    title:       'Customer Support',
    tag:         'Job Opening',
    color:       '#0369A1',
    lightBg:     '#F0F9FF',
    icon:        'fas fa-headset',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    division:    'Corporate Services',
    rolePlaceholder:  "e.g. Customer Care Agent",
    coverPlaceholder: "Describe a time you turned a difficult customer situation into a positive one…",
    extraFields: [
      { key: 'languages', label: "Languages spoken", type: 'text', placeholder: "e.g. English, Luganda, Lango", required: true },
      { key: 'shift', label: "Available for shift work / weekends?", type: 'select', options: ["Yes", "No"], required: true },
    ],
    description:
      'We are seeking a friendly and responsive Customer Support Officer to assist our clients, resolve inquiries, and ensure a positive experience with our products and services.',
    qualifications: [
      "Bachelor's Degree or Diploma in Business Administration, Communications, Information Technology, or a related field.",
      'Excellent verbal and written communication skills in English.',
      'Basic technical knowledge of IT products/services is an added advantage.',
    ],
    experience: [
      'Minimum of 1 year of experience in customer service, support, or a client-facing role.',
      'Fresh graduates with strong communication skills and a customer-first attitude may be considered.',
    ],
    responsibilities: [
      'Respond promptly to customer inquiries via phone, email, and live chat.',
      'Troubleshoot and resolve customer issues or escalate to the appropriate team.',
      'Maintain accurate records of customer interactions and follow-ups.',
      'Guide customers through product features, services, and onboarding processes.',
      'Gather customer feedback to help improve products and service quality.',
      'Collaborate with sales and technical teams to ensure customer satisfaction.',
      'Follow up with clients to ensure issues are fully resolved.',
    ],
  },

  /* ───────────────────────── Slirus AgriSolutions ───────────────────────── */
  {
    key:         'agronomist',
    type:        'Job',
    title:       'Agronomist & Farm Inputs Officer',
    tag:         'Job Opening',
    color:       '#15803D',
    lightBg:     '#F0FDF4',
    icon:        'fas fa-seedling',
    location:    'Lira City, Uganda (with farm and field visits)',
    employment:  'Full-time',
    division:    'Slirus AgriSolutions',
    rolePlaceholder:  "e.g. Extension Officer",
    coverPlaceholder: "Tell us about your field experience, crops or inputs you specialise in and farmers you have supported…",
    extraFields: [
      { key: 'fieldVisits', label: "Willing to do frequent farm / field visits?", type: 'select', options: ["Yes", "No"], required: true },
      { key: 'agriSpecialisation', label: "Area of specialisation", type: 'text', placeholder: "e.g. Cereals, horticulture, agro-chemicals, farm machinery", required: true },
      { key: 'ridingPermit', label: "Valid driving / riding permit?", type: 'select', options: ["Driving permit", "Motorcycle permit", "Both", "None"] },
    ],
    description:
      'Slirus AgriSolutions is seeking a knowledgeable Agronomist to advise farmers and customers on crop production, and to manage the supply of quality seeds, fertilizers, agro-chemicals, and modern farming machinery.',
    qualifications: [
      "Bachelor's Degree in Agriculture, Agronomy, Crop Science, Agribusiness, or a related field.",
      'Diploma in Agriculture with strong practical field experience will be considered.',
      'Knowledge of safe handling and application of agro-chemicals is an added advantage.',
    ],
    experience: [
      'Minimum of 1 year of experience in agronomy, extension services, or agro-input sales.',
      'Fresh graduates with strong field attachment or internship experience may be considered.',
    ],
    responsibilities: [
      'Advise farmers on crop selection, soil health, planting, pest control, and harvesting practices.',
      'Manage stock and quality of seeds, fertilizers, agro-chemicals, and farm inputs.',
      'Demonstrate and promote modern agricultural machinery and techniques.',
      'Conduct field visits, farmer trainings, and on-farm demonstrations.',
      'Source produce and inputs from reliable suppliers and farmer groups.',
      'Prepare field reports, input forecasts, and customer recommendations.',
      'Ensure compliance with agricultural standards and safety regulations.',
    ],
  },

  /* ──────────────────────────── Slirus Fashions ─────────────────────────── */
  {
    key:         'fashionDesigner',
    type:        'Job',
    title:       'Fashion Designer & Production Supervisor',
    tag:         'Job Opening',
    color:       '#C2410C',
    lightBg:     '#FFF7ED',
    icon:        'fas fa-tshirt',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    division:    'Slirus Fashions',
    rolePlaceholder:  "e.g. Tailor / Fashion Designer",
    coverPlaceholder: "Describe your design style, collections you have created and your experience supervising production…",
    extraFields: [
      { key: 'designFocus', label: "Design focus", type: 'select', options: ["Womenswear", "Menswear", "Kidswear", "Traditional / cultural wear", "Textile design", "Other"], required: true },
      { key: 'portfolioUrl', label: "Portfolio link (Instagram, Behance, Drive…)", type: 'text', placeholder: "https://" },
    ],
    description:
      'Slirus Fashions is looking for a creative Fashion Designer to design apparel and lifestyle products and supervise garment and textile production from concept to finished product.',
    qualifications: [
      "Bachelor's Degree or Diploma in Fashion Design, Textile Design, Apparel Production, or a related field.",
      'Proficiency in pattern making, garment construction, and sketching (digital design tools are an added advantage).',
      'A strong portfolio of original designs.',
    ],
    experience: [
      'Minimum of 1 year of experience in fashion design, tailoring, or garment production.',
      'Fresh graduates with an outstanding portfolio may be considered.',
    ],
    responsibilities: [
      'Create original designs, sketches, and collections aligned with market trends.',
      'Develop patterns, samples, and prototypes for production.',
      'Supervise tailors and textile production staff to meet quality and deadlines.',
      'Source fabrics, trims, and materials from reliable suppliers.',
      'Maintain quality control standards for all finished garments.',
      'Collaborate with sales and e-commerce teams on product lines and launches.',
      'Manage production costs and material usage.',
    ],
  },

  {
    key:         'ecommerce',
    type:        'Job',
    title:       'E-commerce & Retail Manager',
    tag:         'Job Opening',
    color:       '#DB2777',
    lightBg:     '#FDF2F8',
    icon:        'fas fa-shopping-bag',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    division:    'Slirus Fashions',
    rolePlaceholder:  "e.g. Retail Supervisor",
    coverPlaceholder: "Share your experience growing online or in-store sales and the channels you have managed…",
    extraFields: [
      { key: 'platforms', label: "Platforms / tools used", type: 'text', placeholder: "e.g. Shopify, WooCommerce, Instagram Shop, WhatsApp Business", required: true },
      { key: 'socialHandle', label: "Business social media link (optional)", type: 'text', placeholder: "https://" },
    ],
    description:
      'We are hiring an E-commerce & Retail Manager to run our online store and retail outlets, driving sales of apparel, lifestyle products, and general merchandise across Uganda and beyond.',
    qualifications: [
      "Bachelor's Degree in Marketing, Business Administration, Supply Chain, or a related field.",
      'Experience with online store platforms, social media selling, and mobile money payments.',
      'Certification in digital marketing or retail management is an added advantage.',
    ],
    experience: [
      'Minimum of 1 year of experience in retail, e-commerce, or merchandising.',
      'Fresh graduates with strong digital marketing skills may be considered.',
    ],
    responsibilities: [
      'Manage the online store, product listings, pricing, and promotions.',
      'Oversee retail and wholesale outlets, stock levels, and merchandising.',
      'Process online orders and coordinate delivery with the logistics team.',
      'Run social media and digital campaigns to grow sales and brand awareness.',
      'Analyse sales data and customer trends to guide stock and pricing decisions.',
      'Supervise sales assistants and ensure excellent customer experience.',
      'Coordinate imports and supplier relationships for general merchandise.',
    ],
  },

  /* ─────────────── General Trade, Import/Export & Logistics ─────────────── */
  {
    key:         'logistics',
    type:        'Job',
    title:       'Logistics & Import/Export Officer',
    tag:         'Job Opening',
    color:       '#475569',
    lightBg:     '#F8FAFC',
    icon:        'fas fa-truck',
    location:    'Lira City, Uganda (with travel to border and port points)',
    employment:  'Full-time',
    division:    'Trade & Commercial',
    rolePlaceholder:  "e.g. Procurement Assistant",
    coverPlaceholder: "Describe your experience with shipments, suppliers, customs or warehouse management…",
    extraFields: [
      { key: 'customsKnowledge', label: "Customs / import-export knowledge", type: 'select', options: ["None", "Basic", "Intermediate", "Advanced"], required: true },
      { key: 'ridingPermit', label: "Valid driving permit?", type: 'select', options: ["Yes", "No"] },
    ],
    description:
      'We are seeking a Logistics & Import/Export Officer to manage the movement of goods across our fashion, agricultural, and general trade operations, ensuring timely, compliant, and cost-effective delivery.',
    qualifications: [
      "Bachelor's Degree or Diploma in Logistics, Supply Chain Management, Procurement, International Trade, or Business Administration.",
      'Knowledge of customs clearance procedures and URA import/export regulations.',
      'Professional certification in logistics or procurement is an added advantage.',
    ],
    experience: [
      'Minimum of 1 year of experience in logistics, procurement, warehousing, or clearing and forwarding.',
      'Fresh graduates with relevant internship experience may be considered.',
    ],
    responsibilities: [
      'Plan and coordinate transport, warehousing, and delivery of goods.',
      'Handle import/export documentation and customs clearance.',
      'Liaise with suppliers, clearing agents, and transporters.',
      'Maintain accurate inventory and stock movement records.',
      'Track shipments and resolve delays or discrepancies.',
      'Negotiate freight and logistics costs to optimise margins.',
      'Ensure compliance with trade, safety, and quality regulations.',
    ],
  },

  /* ─────────────────────────── Slirus Technologies ──────────────────────── */
  {
    key:         'cybersecurity',
    type:        'Job',
    title:       'Cybersecurity & Cloud Engineer',
    tag:         'Job Opening',
    color:       '#1E3A8A',
    lightBg:     '#EFF6FF',
    icon:        'fas fa-shield-alt',
    location:    'Lira City, Uganda',
    employment:  'Full-time',
    division:    'Slirus Technologies',
    rolePlaceholder:  "e.g. Systems Administrator",
    coverPlaceholder: "Tell us about the systems you have secured or deployed and any labs, CTFs or certifications…",
    extraFields: [
      { key: 'certifications', label: "Security / cloud certifications", type: 'text', placeholder: "e.g. Security+, CEH, AWS Cloud Practitioner" },
      { key: 'cloudPlatforms', label: "Cloud platforms used", type: 'text', placeholder: "e.g. AWS, Azure, Google Cloud", required: true },
    ],
    description:
      'We are looking for a Cybersecurity & Cloud Engineer to design, secure, and manage cloud infrastructure and protect our clients\' systems, data, and digital platforms from evolving threats.',
    qualifications: [
      "Bachelor's Degree in Computer Science, Information Security, Networking, or a related field.",
      'Certifications such as CompTIA Security+, CEH, AWS, Azure, or Google Cloud are an added advantage.',
      'Solid understanding of networking, Linux, and cloud platforms.',
    ],
    experience: [
      'Minimum of 1 year of experience in IT security, systems administration, or cloud engineering.',
      'Strong lab, project, or internship experience may be considered.',
    ],
    responsibilities: [
      'Deploy, configure, and maintain cloud infrastructure and hosting environments.',
      'Perform security assessments, vulnerability scans, and penetration tests.',
      'Implement firewalls, access controls, backups, and incident response procedures.',
      'Monitor systems for threats and respond to security incidents.',
      'Support systems integration for client projects.',
      'Train clients and staff on cybersecurity best practices.',
      'Prepare security reports and compliance documentation.',
    ],
  },


  /* ───────────── Learning-Based Internships (one per department) ───────────── */
  ...INTERNSHIPS,
];

/**
 * Business divisions – controls grouping on the Apply page (in this order).
 * A track's `division` must match one of these names.
 */
export const DIVISIONS = [
  { name: 'Slirus Technologies',  blurb: 'Software, cloud, cybersecurity and digital platforms.' },
  { name: 'Slirus Fashions',      blurb: 'Fashion design, textiles, apparel retail and e-commerce.' },
  { name: 'Slirus AgriSolutions', blurb: 'Agricultural produce, farm inputs and modern machinery.' },
  { name: 'Trade & Commercial',   blurb: 'Sales, import/export, logistics and general trade.' },
  { name: 'Corporate Services',   blurb: 'Finance, administration and customer care across the group.' },
];