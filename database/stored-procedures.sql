-- ============================================================
-- HRMS Portal - Stored Procedures
-- Run this script against the hrmsdev database
-- Each SP uses CREATE OR ALTER so it is safe to re-run
-- ============================================================

-- ============================================================
-- AUTH
-- ============================================================

CREATE OR ALTER PROCEDURE usp_GetUserById
  @UserId VARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT user_id, employee_id, email, role, name
  FROM   users
  WHERE  user_id = @UserId;
END
GO

CREATE OR ALTER PROCEDURE usp_LoginUser
  @Email    NVARCHAR(255),
  @Password NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT user_id, employee_id, email, role, name
  FROM   users
  WHERE  LOWER(email) = LOWER(@Email)
    AND  password     = @Password;
END
GO

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE OR ALTER PROCEDURE usp_GetEmployeeById
  @EmployeeId VARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, name, email, department, designation, salary, join_date,
         certificates_json, form16_year, form16_base_salary,
         form16_deductions, form16_tax, form16_download_url
  FROM   employees
  WHERE  id = @EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE usp_GetAllEmployees
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, name, email, department, designation, salary, join_date,
         certificates_json, form16_year, form16_base_salary,
         form16_deductions, form16_tax, form16_download_url
  FROM   employees
  ORDER  BY name;
END
GO

CREATE OR ALTER PROCEDURE usp_GetPayrollSummary
AS
BEGIN
  SET NOCOUNT ON;
  SELECT COUNT(*)                   AS employeeCount,
         COALESCE(SUM(salary),  0)  AS totalPayroll,
         COALESCE(MAX(salary),  0)  AS highestSalary
  FROM   employees;
END
GO

-- ============================================================
-- LEAVE REQUESTS
-- ============================================================

CREATE OR ALTER PROCEDURE usp_GetLeaveRequests
  @EmployeeId VARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  IF @EmployeeId IS NULL
    SELECT * FROM leave_requests ORDER BY created_at DESC;
  ELSE
    SELECT * FROM leave_requests
    WHERE  employee_id = @EmployeeId
    ORDER  BY created_at DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_GetLeaveRequestByCode
  @RequestCode NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM leave_requests
  WHERE  request_code = @RequestCode;
END
GO

CREATE OR ALTER PROCEDURE usp_CreateLeaveRequest
  @RequestCode NVARCHAR(100),
  @EmployeeId  VARCHAR(50),
  @LeaveType   NVARCHAR(20),
  @LeaveDate   DATE,
  @StartDate   DATE,
  @EndDate     DATE,
  @Duration    INT,
  @DayType     NVARCHAR(30),
  @Reason      NVARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO leave_requests
    (request_code, employee_id, leave_type, leave_date, start_date,
     end_date, duration, day_type, reason, status, created_at)
  VALUES
    (@RequestCode, @EmployeeId, @LeaveType, @LeaveDate, @StartDate,
     @EndDate, @Duration, @DayType, @Reason, 'pending', GETUTCDATE());
END
GO

CREATE OR ALTER PROCEDURE usp_ApproveLeaveRequest
  @RequestCode NVARCHAR(100),
  @ApproverId  VARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE leave_requests
  SET    status      = 'approved',
         approved_by = @ApproverId,
         approved_at = GETUTCDATE()
  WHERE  request_code = @RequestCode;
END
GO

CREATE OR ALTER PROCEDURE usp_CancelLeaveRequest
  @RequestCode NVARCHAR(100),
  @EmployeeId  VARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE leave_requests
  SET    status       = 'cancelled',
         cancelled_at = GETUTCDATE()
  WHERE  request_code = @RequestCode
    AND  employee_id  = @EmployeeId;
END
GO

-- Supports both full cancellation and partial (specific dates as JSON array)
CREATE OR ALTER PROCEDURE usp_CancelLeaveRequestByCode
  @RequestCode     NVARCHAR(100),
  @CancelledDates  NVARCHAR(MAX) = NULL   -- JSON array of dates e.g. ["2026-06-28","2026-06-29"]
AS
BEGIN
  SET NOCOUNT ON;

  IF @CancelledDates IS NULL
  BEGIN
    -- Full cancellation
    UPDATE leave_requests
    SET    status          = 'cancelled',
           cancelled_at    = GETUTCDATE(),
           cancelled_dates = NULL
    WHERE  request_code = @RequestCode;
  END
  ELSE
  BEGIN
    -- Partial cancellation: compare cancelled count vs total days
    DECLARE @StartDate DATE, @EndDate DATE;

    SELECT @StartDate = ISNULL(start_date, leave_date),
           @EndDate   = ISNULL(end_date,   leave_date)
    FROM   leave_requests
    WHERE  request_code = @RequestCode;

    DECLARE @TotalDays      INT = DATEDIFF(day, @StartDate, @EndDate) + 1;
    DECLARE @CancelledCount INT = (SELECT COUNT(*) FROM OPENJSON(@CancelledDates));

    IF @CancelledCount >= @TotalDays
      UPDATE leave_requests
      SET    status          = 'cancelled',
             cancelled_at    = GETUTCDATE(),
             cancelled_dates = @CancelledDates
      WHERE  request_code = @RequestCode;
    ELSE
      UPDATE leave_requests
      SET    status          = 'partially_cancelled',
             cancelled_at    = GETUTCDATE(),
             cancelled_dates = @CancelledDates
      WHERE  request_code = @RequestCode;
  END

  -- Return the updated row
  SELECT * FROM leave_requests WHERE request_code = @RequestCode;
END
GO

-- Returns leave balance for the current year per leave type
CREATE OR ALTER PROCEDURE usp_GetLeaveBalance
  @EmployeeId VARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @CurrentYear INT = YEAR(GETUTCDATE());

  -- Quota reference
  DECLARE @Quotas TABLE (LeaveType VARCHAR(10), Quota INT NULL);
  INSERT INTO @Quotas VALUES ('CL', 12), ('SICK', 6), ('EL', 15), ('WFH', 10), ('LOP', NULL);

  SELECT
    q.LeaveType,
    q.Quota,
    ISNULL(SUM(lr.duration), 0) AS Used,
    CASE
      WHEN q.Quota IS NULL THEN NULL
      WHEN q.Quota - ISNULL(SUM(lr.duration), 0) < 0 THEN 0
      ELSE q.Quota - ISNULL(SUM(lr.duration), 0)
    END AS Available
  FROM @Quotas q
  LEFT JOIN leave_requests lr
         ON UPPER(LTRIM(RTRIM(lr.leave_type))) = q.LeaveType
        AND lr.employee_id = @EmployeeId
        AND lr.status      IN ('approved', 'pending')
        AND YEAR(ISNULL(NULLIF(lr.start_date, '1900-01-01'), lr.leave_date)) = @CurrentYear
  GROUP BY q.LeaveType, q.Quota;
END
GO

-- ============================================================
-- COMPANY DATA
-- ============================================================

CREATE OR ALTER PROCEDURE usp_GetHolidays
AS
BEGIN
  SET NOCOUNT ON;
  SELECT date, name FROM holidays ORDER BY date;
END
GO

CREATE OR ALTER PROCEDURE usp_GetAnnouncements
AS
BEGIN
  SET NOCOUNT ON;
  SELECT date, title FROM announcements ORDER BY date DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_GetCompanyLogo
AS
BEGIN
  SET NOCOUNT ON;
  SELECT logo_url FROM company_info;
END
GO

-- ============================================================
-- UTILITY
-- ============================================================

CREATE OR ALTER PROCEDURE usp_Ping
AS
BEGIN
  SET NOCOUNT ON;
  SELECT 1 AS value;
END
GO
