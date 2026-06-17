// Company general information
// Available to all employees

export const companyData = {
  // Company holidays
  holidays: [
    { date: '2026-01-26', name: 'Republic Day', type: 'national' },
    { date: '2026-03-25', name: 'Holi', type: 'festival' },
    { date: '2026-04-14', name: 'Ambedkar Jayanti', type: 'national' },
    { date: '2026-05-01', name: 'Labour Day', type: 'national' },
    { date: '2026-08-15', name: 'Independence Day', type: 'national' },
    { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'national' },
    { date: '2026-10-29', name: 'Diwali', type: 'festival' },
    { date: '2026-12-25', name: 'Christmas', type: 'festival' }
  ],

  // Office announcements
  announcements: [
    {
      id: 1,
      date: '2026-05-20',
      title: 'Summer Vacation Schedule',
      message: 'Summer vacation will be from June 1-15. Plan your leaves accordingly. Maximum 2 employees per team can take leave at once.'
    },
    {
      id: 2,
      date: '2026-05-18',
      title: 'New Office Policy - Work from Home',
      message: 'WFH is now allowed 2 days per week. Employees can choose Mon-Fri. Approval required from manager.'
    },
    {
      id: 3,
      date: '2026-05-15',
      title: 'Health Insurance Update',
      message: 'New health insurance plan covers family members. Enhanced coverage for dental and vision care. More details in Benefits section.'
    },
    {
      id: 4,
      date: '2026-05-10',
      title: 'Office Renovation Complete',
      message: 'Our new office floor is ready! New cafeteria, gym, and gaming zone now available for all employees.'
    },
    {
      id: 5,
      date: '2026-05-05',
      title: 'Monthly Town Hall Meeting',
      message: 'Join us for the monthly town hall on May 22 at 3 PM. CEO will share quarterly results and future roadmap.'
    }
  ],

  // Company policies
  policies: {
    workingHours: 'Monday-Friday, 9 AM - 6 PM (1 hour lunch break)',
    casualLeave: '12 days per year, can carry forward 5 days',
    sickLeave: '6 days per year, with medical certificate for >2 days',
    maternityLeave: '6 months, fully paid',
    paternaityLeave: '15 days, fully paid',
    workFromHome: 'Up to 2 days per week with manager approval',
    dresscode: 'Business casual - no jeans or shorts',
    probation: '3 months for new employees',
    performanceReview: 'Quarterly reviews in Mar, Jun, Sep, Dec'
  },

  // Portal features guide
  portalGuide: {
    dashboard: 'View your attendance, leave balance, salary info at a glance',
    employees: 'Browse company directory (names, departments, roles - no sensitive data)',
    payroll: 'Check your salary slip, deductions, and tax information',
    leaves: 'Apply for leaves, track leave balance, view approval status',
    documents: 'Download offer letter, Form16, certificates, promotion letter',
    complaints: 'Raise complaints or concerns - tracked and resolved by HR',
    training: 'View available training programs and enroll for skill development'
  },

  // IT Help & Support
  supportTeam: {
    email: 'it-support@company.com',
    phone: '+91-9876543210',
    hours: 'Monday-Friday, 9 AM - 6 PM',
    issues: [
      'Password reset - Reply with new password',
      'VPN access - Contact IT for VPN credentials',
      'Email issues - Restart Outlook or contact IT',
      'System access - Verify permissions with your manager',
      'Hardware issue - Contact IT for laptop/phone replacement'
    ]
  }
};
