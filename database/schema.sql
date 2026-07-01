USE hrmsdev;
GO

IF OBJECT_ID('dbo.support_issues', 'U') IS NOT NULL DROP TABLE dbo.support_issues;
IF OBJECT_ID('dbo.support_config', 'U') IS NOT NULL DROP TABLE dbo.support_config;
IF OBJECT_ID('dbo.portal_guide', 'U') IS NOT NULL DROP TABLE dbo.portal_guide;
IF OBJECT_ID('dbo.policies', 'U') IS NOT NULL DROP TABLE dbo.policies;
IF OBJECT_ID('dbo.leave_requests', 'U') IS NOT NULL DROP TABLE dbo.leave_requests;
IF OBJECT_ID('dbo.announcements', 'U') IS NOT NULL DROP TABLE dbo.announcements;
IF OBJECT_ID('dbo.holidays', 'U') IS NOT NULL DROP TABLE dbo.holidays;
IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NOT NULL DROP TABLE dbo.refresh_tokens;
IF OBJECT_ID('dbo.company_info', 'U') IS NOT NULL DROP TABLE dbo.company_info;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
IF OBJECT_ID('dbo.employees', 'U') IS NOT NULL DROP TABLE dbo.employees;
GO

CREATE TABLE dbo.employees (
  id VARCHAR(50) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  email NVARCHAR(255) NOT NULL UNIQUE,
  department NVARCHAR(100) NOT NULL,
  designation NVARCHAR(100) NOT NULL,
  join_date DATE NOT NULL,
  salary INT NOT NULL,
  certificates_json NVARCHAR(MAX) NOT NULL DEFAULT '[]',
  form16_year INT NULL,
  form16_base_salary INT NULL,
  form16_deductions INT NULL,
  form16_tax INT NULL,
  form16_download_url NVARCHAR(1000) NULL
);
GO

CREATE TABLE dbo.users (
  user_id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  role NVARCHAR(50) NOT NULL,
  name NVARCHAR(200) NOT NULL,
  CONSTRAINT FK_users_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id)
);
GO

CREATE TABLE dbo.refresh_tokens (
  token NVARCHAR(500) PRIMARY KEY,
  user_id VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE dbo.holidays (
  date DATE PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  type NVARCHAR(50) NOT NULL
);
GO

CREATE TABLE dbo.announcements (
  id INT PRIMARY KEY,
  date DATE NOT NULL,
  title NVARCHAR(200) NOT NULL,
  message NVARCHAR(MAX) NOT NULL
);
GO

CREATE TABLE dbo.leave_requests (
  id INT IDENTITY PRIMARY KEY,
  request_code NVARCHAR(100) UNIQUE,
  employee_id VARCHAR(50) NOT NULL,
  leave_type NVARCHAR(50) NOT NULL,
  leave_date DATE NOT NULL,
  start_date DATE NOT NULL DEFAULT '1900-01-01',
  end_date DATE NOT NULL DEFAULT '1900-01-01',
  duration INT NOT NULL DEFAULT 1,
  day_type NVARCHAR(50) NOT NULL,
  reason NVARCHAR(MAX) NULL,
  status NVARCHAR(50) NOT NULL CHECK (status IN ('pending','approved','cancelled')) DEFAULT 'pending',
  approved_by VARCHAR(50) NULL,
  approved_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id)
);
GO

CREATE TABLE dbo.policies (
  [key] NVARCHAR(200) PRIMARY KEY,
  value NVARCHAR(MAX) NOT NULL
);
GO

CREATE TABLE dbo.portal_guide (
  section NVARCHAR(200) PRIMARY KEY,
  description NVARCHAR(MAX) NOT NULL
);
GO

CREATE TABLE dbo.support_config (
  [key] NVARCHAR(200) PRIMARY KEY,
  value NVARCHAR(MAX) NOT NULL
);
GO

CREATE TABLE dbo.support_issues (
  id INT IDENTITY PRIMARY KEY,
  issue NVARCHAR(1000) NOT NULL UNIQUE
);
GO

CREATE TABLE dbo.company_info (
  id INT IDENTITY PRIMARY KEY,
  logo_url NVARCHAR(1000) NULL,
  company_name NVARCHAR(255) NULL,
  support_email NVARCHAR(255) NULL
);
GO

INSERT INTO dbo.employees (id, name, email, department, designation, join_date, salary, certificates_json, form16_year, form16_base_salary, form16_deductions, form16_tax, form16_download_url)
VALUES
  ('EMP001', 'Raj Kumar', 'raj.kumar@example.com', 'IT', 'Senior Developer', '2021-05-01', 750000, '["AWS Certified", "PMP"]', 2024, 750000, 50000, 75000, 'https://example.com/form16/EMP001.pdf'),
  ('EMP002', 'Priya Singh', 'priya.singh@example.com', 'HR', 'HR Manager', '2020-09-15', 650000, '["SHRM", "MBA"]', 2024, 650000, 45000, 65000, 'https://example.com/form16/EMP002.pdf'),
  ('EMP003', 'Amit Patel', 'amit.patel@example.com', 'Finance', 'Finance Analyst', '2022-01-10', 550000, '["CFA Level 1"]', 2024, 550000, 35000, 55000, 'https://example.com/form16/EMP003.pdf');
GO

INSERT INTO dbo.users (user_id, employee_id, email, password, role, name)
VALUES
  ('USER001', 'EMP001', 'raj.kumar@example.com', 'password123', 'employee', 'Raj Kumar'),
  ('USER002', 'EMP002', 'priya.singh@example.com', 'password123', 'hr', 'Priya Singh'),
  ('USER003', 'EMP003', 'amit.patel@example.com', 'password123', 'employee', 'Amit Patel');
GO

INSERT INTO dbo.holidays (date, name, type)
VALUES
  ('2025-01-26', 'Republic Day', 'National'),
  ('2025-08-15', 'Independence Day', 'National'),
  ('2025-10-02', 'Gandhi Jayanti', 'National');
GO

INSERT INTO dbo.announcements (id, date, title, message)
VALUES
  (1, '2025-06-01', 'Office Reopening', 'Our Mumbai office reopens on Monday at 9:30 AM.'),
  (2, '2025-06-15', 'New Leave Policy', 'WFH is now allowed 2 days a week with manager approval.');
GO

INSERT INTO dbo.policies ([key], value)
VALUES
  ('leave_policy', 'Casual Leave 12 days/year, Sick Leave 6 days/year, WFH 2 days/week'),
  ('expense_policy', 'Submit expense claims within 15 days of billing.');
GO

INSERT INTO dbo.portal_guide (section, description)
VALUES
  ('chatbot', 'Use the chatbot for HR questions, salary info, and leave guidance.'),
  ('leave', 'Apply for leave from the leave request page and check approval status here.');
GO

INSERT INTO dbo.support_config ([key], value)
VALUES
  ('email', 'it-support@example.com'),
  ('phone', '+91-22-1234-5678');
GO

INSERT INTO dbo.support_issues (issue)
VALUES
  ('Unable to login'),
  ('Payroll data missing for employee');
GO

INSERT INTO dbo.company_info (logo_url, company_name, support_email)
VALUES
  ('https://example.com/logo.png', 'Demo HRMS', 'support@example.com');
GO
