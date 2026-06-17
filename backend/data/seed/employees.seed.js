// Sample Employee Data
// This is your dummy database - in real projects, you'd use MongoDB/SQL

const employees = [
  {
    id: 'EMP001',
    name: 'Raj Kumar',
    email: 'raj.kumar@company.com',
    department: 'IT',
    designation: 'Senior Developer',
    joinDate: '2020-01-15',
    salary: 750000,
    certificates: [
      { name: 'AWS Certified Solutions Architect', issueDate: '2023-06-01' },
      { name: 'JavaScript Expert', issueDate: '2023-01-15' }
    ],
    form16: {
      year: 2024,
      baseSalary: 750000,
      deductions: 50000,
      tax: 100000,
      downloadUrl: '/documents/form16/EMP001-2024.pdf'
    }
  },
  {
    id: 'EMP002',
    name: 'Priya Singh',
    email: 'priya.singh@company.com',
    department: 'HR',
    designation: 'HR Manager',
    joinDate: '2019-03-20',
    salary: 600000,
    certificates: [
      { name: 'Human Resource Management', issueDate: '2022-11-10' }
    ],
    form16: {
      year: 2024,
      baseSalary: 600000,
      deductions: 40000,
      tax: 80000,
      downloadUrl: '/documents/form16/EMP002-2024.pdf'
    }
  },
  {
    id: 'EMP003',
    name: 'Amit Patel',
    email: 'amit.patel@company.com',
    department: 'Finance',
    designation: 'Finance Analyst',
    joinDate: '2021-06-10',
    salary: 550000,
    certificates: [
      { name: 'CPA Certification', issueDate: '2023-05-01' }
    ],
    form16: {
      year: 2024,
      baseSalary: 550000,
      deductions: 35000,
      tax: 70000,
      downloadUrl: '/documents/form16/EMP003-2024.pdf'
    }
  }
  ,
  {
    id: 'EMP004',
    name: 'Neha Verma',
    email: 'neha.verma@company.com',
    department: 'HR',
    designation: 'HR Executive',
    joinDate: '2022-02-10',
    salary: 420000,
    certificates: [],
    form16: {
      year: 2024,
      baseSalary: 420000,
      deductions: 20000,
      tax: 35000,
      downloadUrl: '/documents/form16/EMP004-2024.pdf'
    }
  },
  {
    id: 'EMP005',
    name: 'Karan Joshi',
    email: 'karan.joshi@company.com',
    department: 'HR',
    designation: 'Recruiter',
    joinDate: '2023-08-01',
    salary: 400000,
    certificates: [],
    form16: {
      year: 2024,
      baseSalary: 400000,
      deductions: 15000,
      tax: 30000,
      downloadUrl: '/documents/form16/EMP005-2024.pdf'
    }
  },
  {
    id: 'EMP006',
    name: 'Lisa Rao',
    email: 'lisa.rao@company.com',
    department: 'HR',
    designation: 'HR Coordinator',
    joinDate: '2021-11-05',
    salary: 450000,
    certificates: [],
    form16: {
      year: 2024,
      baseSalary: 450000,
      deductions: 25000,
      tax: 38000,
      downloadUrl: '/documents/form16/EMP006-2024.pdf'
    }
  },
  {
    id: 'EMP007',
    name: 'Vikram Shah',
    email: 'vikram.shah@company.com',
    department: 'Operations',
    designation: 'Project Manager',
    joinDate: '2018-09-12',
    salary: 1200000,
    certificates: [
      { name: 'PMP Certification', issueDate: '2020-04-20' }
    ],
    form16: {
      year: 2024,
      baseSalary: 1200000,
      deductions: 80000,
      tax: 220000,
      downloadUrl: '/documents/form16/EMP007-2024.pdf'
    }
  },
  {
    id: 'EMP008',
    name: 'Meera Nair',
    email: 'meera.nair@company.com',
    department: 'Management',
    designation: 'Managing Director',
    joinDate: '2015-04-01',
    salary: 3000000,
    certificates: [],
    form16: {
      year: 2024,
      baseSalary: 3000000,
      deductions: 150000,
      tax: 600000,
      downloadUrl: '/documents/form16/EMP008-2024.pdf'
    }
  }
  ,
  {
    id: 'HR001',
    name: 'Sonal Mehta',
    email: 'sonal.mehta@company.com',
    department: 'HR',
    designation: 'Head of HR',
    joinDate: '2017-07-01',
    salary: 850000,
    certificates: [ { name: 'Strategic HR Management', issueDate: '2019-03-10' } ],
    form16: {
      year: 2024,
      baseSalary: 850000,
      deductions: 60000,
      tax: 140000,
      downloadUrl: '/documents/form16/HR001-2024.pdf'
    }
  },
  {
    id: 'ADMIN001',
    name: 'Super Admin',
    email: 'superadmin@company.com',
    department: 'Administration',
    designation: 'System Administrator',
    joinDate: '2016-01-10',
    salary: 1500000,
    certificates: [],
    form16: {
      year: 2024,
      baseSalary: 1500000,
      deductions: 90000,
      tax: 300000,
      downloadUrl: '/documents/form16/ADMIN001-2024.pdf'
    }
  },
  {
    id: 'EMP009',
    name: 'Rohit Mehra',
    email: 'rohit.mehra@company.com',
    department: 'Development',
    designation: 'Frontend Developer',
    joinDate: '2022-05-20',
    salary: 700000,
    certificates: [ { name: 'React Professional', issueDate: '2023-02-01' } ],
    form16: { year: 2024, baseSalary: 700000, deductions: 30000, tax: 90000, downloadUrl: '/documents/form16/EMP009-2024.pdf' }
  },
  {
    id: 'EMP010',
    name: 'Sanya Gupta',
    email: 'sanya.gupta@company.com',
    department: 'Development',
    designation: 'Backend Developer',
    joinDate: '2021-10-11',
    salary: 800000,
    certificates: [ { name: 'Node.js Expert', issueDate: '2022-08-15' } ],
    form16: { year: 2024, baseSalary: 800000, deductions: 40000, tax: 110000, downloadUrl: '/documents/form16/EMP010-2024.pdf' }
  },
  {
    id: 'EMP011',
    name: 'Devansh Iyer',
    email: 'devansh.iyer@company.com',
    department: 'Development',
    designation: 'Fullstack Developer',
    joinDate: '2020-12-01',
    salary: 850000,
    certificates: [ { name: 'Fullstack Web Dev', issueDate: '2021-09-10' } ],
    form16: { year: 2024, baseSalary: 850000, deductions: 45000, tax: 120000, downloadUrl: '/documents/form16/EMP011-2024.pdf' }
  },
  {
    id: 'EMP012',
    name: 'Anika Bose',
    email: 'anika.bose@company.com',
    department: 'Quality',
    designation: 'QA Engineer',
    joinDate: '2023-03-15',
    salary: 500000,
    certificates: [],
    form16: { year: 2024, baseSalary: 500000, deductions: 20000, tax: 45000, downloadUrl: '/documents/form16/EMP012-2024.pdf' }
  },
  {
    id: 'EMP013',
    name: 'Prateek Singh',
    email: 'prateek.singh@company.com',
    department: 'Quality',
    designation: 'Test Automation Engineer',
    joinDate: '2022-09-01',
    salary: 520000,
    certificates: [ { name: 'Selenium Certified', issueDate: '2022-12-05' } ],
    form16: { year: 2024, baseSalary: 520000, deductions: 18000, tax: 48000, downloadUrl: '/documents/form16/EMP013-2024.pdf' }
  },
  {
    id: 'EMP014',
    name: 'Arjun Kapoor',
    email: 'arjun.kapoor@company.com',
    department: 'DevOps',
    designation: 'DevOps Engineer (AWS)',
    joinDate: '2019-04-22',
    salary: 950000,
    certificates: [ { name: 'AWS Solutions Architect', issueDate: '2020-06-15' } ],
    form16: { year: 2024, baseSalary: 950000, deductions: 60000, tax: 180000, downloadUrl: '/documents/form16/EMP014-2024.pdf' }
  },
  {
    id: 'EMP015',
    name: 'Tamanna Roy',
    email: 'tamanna.roy@company.com',
    department: 'Design',
    designation: 'UI/UX Designer',
    joinDate: '2020-07-30',
    salary: 480000,
    certificates: [],
    form16: { year: 2024, baseSalary: 480000, deductions: 20000, tax: 42000, downloadUrl: '/documents/form16/EMP015-2024.pdf' }
  },
  {
    id: 'EMP016',
    name: 'Sameer Khan',
    email: 'sameer.khan@company.com',
    department: 'Database',
    designation: 'Database Administrator',
    joinDate: '2018-02-14',
    salary: 780000,
    certificates: [ { name: 'Oracle DBA', issueDate: '2019-11-20' } ],
    form16: { year: 2024, baseSalary: 780000, deductions: 40000, tax: 130000, downloadUrl: '/documents/form16/EMP016-2024.pdf' }
  },
  {
    id: 'EMP017',
    name: 'Priyanka Das',
    email: 'priyanka.das@company.com',
    department: 'Data',
    designation: 'Data Scientist',
    joinDate: '2021-01-05',
    salary: 1100000,
    certificates: [ { name: 'ML Specialist', issueDate: '2022-03-01' } ],
    form16: { year: 2024, baseSalary: 1100000, deductions: 70000, tax: 260000, downloadUrl: '/documents/form16/EMP017-2024.pdf' }
  },
  {
    id: 'EMP018',
    name: 'Nikhil Sharma',
    email: 'nikhil.sharma@company.com',
    department: 'Mobile',
    designation: 'Mobile Developer',
    joinDate: '2022-06-18',
    salary: 730000,
    certificates: [],
    form16: { year: 2024, baseSalary: 730000, deductions: 35000, tax: 95000, downloadUrl: '/documents/form16/EMP018-2024.pdf' }
  },
  {
    id: 'EMP019',
    name: 'Sunita Rao',
    email: 'sunita.rao@company.com',
    department: 'Product',
    designation: 'Product Manager',
    joinDate: '2019-05-09',
    salary: 1300000,
    certificates: [],
    form16: { year: 2024, baseSalary: 1300000, deductions: 80000, tax: 280000, downloadUrl: '/documents/form16/EMP019-2024.pdf' }
  },
  {
    id: 'EMP020',
    name: 'Omar Ali',
    email: 'omar.ali@company.com',
    department: 'Support',
    designation: 'Support Engineer',
    joinDate: '2023-01-10',
    salary: 420000,
    certificates: [],
    form16: { year: 2024, baseSalary: 420000, deductions: 15000, tax: 30000, downloadUrl: '/documents/form16/EMP020-2024.pdf' }
  }
];

export { employees };
