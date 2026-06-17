# API ENDPOINTS DOCUMENTATION

This guide shows all available API endpoints and how to use them.

## Base URL
```
http://localhost:5000/api
```

## 🏥 Health Check

### GET /health
Check if server is running.

**Request:**
```
GET http://localhost:5000/api/health
```

**Response:**
```json
{
  "status": "Server is running ✓",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## 👥 Employee Endpoints

### GET /employees
Get all employees.

**Request:**
```
GET http://localhost:5000/api/employees
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "EMP001",
      "name": "Raj Kumar",
      "email": "raj.kumar@company.com",
      "department": "IT",
      "designation": "Senior Developer",
      "joinDate": "2020-01-15",
      "salary": 750000,
      "certificates": [...],
      "form16": {...}
    }
  ]
}
```

---

### GET /employees/:id
Get specific employee by ID.

**Request:**
```
GET http://localhost:5000/api/employees/EMP001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "EMP001",
    "name": "Raj Kumar",
    "email": "raj.kumar@company.com",
    "department": "IT",
    "designation": "Senior Developer",
    "joinDate": "2020-01-15",
    "salary": 750000,
    "certificates": [
      {
        "name": "AWS Certified Solutions Architect",
        "issueDate": "2023-06-01"
      }
    ],
    "form16": {
      "year": 2024,
      "baseSalary": 750000,
      "deductions": 50000,
      "tax": 100000,
      "downloadUrl": "/documents/form16/EMP001-2024.pdf"
    }
  }
}
```

---

### GET /employees/:id/certificates
Get employee certificates.

**Request:**
```
GET http://localhost:5000/api/employees/EMP001/certificates
```

**Response:**
```json
{
  "success": true,
  "employeeId": "EMP001",
  "employeeName": "Raj Kumar",
  "certificates": [
    {
      "name": "AWS Certified Solutions Architect",
      "issueDate": "2023-06-01"
    },
    {
      "name": "JavaScript Expert",
      "issueDate": "2023-01-15"
    }
  ]
}
```

---

### GET /employees/:id/form16
Get employee Form16 tax document.

**Request:**
```
GET http://localhost:5000/api/employees/EMP001/form16
```

**Response:**
```json
{
  "success": true,
  "employeeId": "EMP001",
  "employeeName": "Raj Kumar",
  "form16": {
    "year": 2024,
    "baseSalary": 750000,
    "deductions": 50000,
    "tax": 100000,
    "downloadUrl": "/documents/form16/EMP001-2024.pdf"
  }
}
```

---

## 💰 Payroll Endpoints

### GET /payroll
Get payroll information for all employees.

**Request:**
```
GET http://localhost:5000/api/payroll
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "EMP001",
      "name": "Raj Kumar",
      "department": "IT",
      "baseSalary": 750000,
      "deductions": 50000,
      "tax": 100000,
      "netSalary": 600000
    }
  ]
}
```

---

### GET /payroll/:id
Get payroll for specific employee.

**Request:**
```
GET http://localhost:5000/api/payroll/EMP001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP001",
    "employeeName": "Raj Kumar",
    "designation": "Senior Developer",
    "department": "IT",
    "baseSalary": 750000,
    "deductions": 50000,
    "tax": 100000,
    "netSalary": 600000,
    "paymentDate": "2024-01-15T10:30:45.123Z",
    "remarks": "Regular monthly salary"
  }
}
```

---

### GET /payroll/report/summary
Get payroll summary and statistics.

**Request:**
```
GET http://localhost:5000/api/payroll/report/summary
```

**Response:**
```json
{
  "success": true,
  "totalEmployees": 3,
  "totalPayroll": 1900000,
  "averageSalary": 633333.33,
  "highestSalary": 750000,
  "lowestSalary": 550000
}
```

---

## 💬 Chatbot Endpoints

### POST /chatbot/chat
Send a message to the chatbot.

**Request:**
```
POST http://localhost:5000/api/chatbot/chat
Content-Type: application/json

{
  "message": "What is the salary of Raj Kumar?"
}
```

**Response:**
```json
{
  "success": true,
  "userMessage": "What is the salary of Raj Kumar?",
  "botResponse": "Raj Kumar's salary is ₹750,000. The net salary after deductions is ₹600,000.",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

### GET /chatbot/status
Get chatbot service status.

**Request:**
```
GET http://localhost:5000/api/chatbot/status
```

**Response:**
```json
{
  "status": "Chatbot service running",
  "type": "Rule-based (learning mode)",
  "connectedToOpenAI": false,
  "message": "See docs/CHATBOT_SETUP.md to enable OpenAI integration"
}
```

---

## 🧪 Testing with curl

Here are example commands to test the API:

```bash
# Test health
curl http://localhost:5000/api/health

# Get all employees
curl http://localhost:5000/api/employees

# Get specific employee
curl http://localhost:5000/api/employees/EMP001

# Get employee certificates
curl http://localhost:5000/api/employees/EMP001/certificates

# Get payroll summary
curl http://localhost:5000/api/payroll/report/summary

# Chat with bot
curl -X POST http://localhost:5000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the average salary?"}'
```

---

## 🧪 Testing with Postman

1. Install Postman: https://www.postman.com/downloads/
2. Create a new request
3. Set method to GET or POST
4. Enter URL like: `http://localhost:5000/api/employees`
5. For POST, go to Body tab and select "raw" + "JSON"
6. Add JSON body and click Send

---

## ❌ Error Responses

### 404 - Not Found
```json
{
  "success": false,
  "error": "Employee not found"
}
```

### 400 - Bad Request
```json
{
  "success": false,
  "error": "Message is required"
}
```

### 500 - Server Error
```json
{
  "error": "Something went wrong!",
  "message": "Detailed error message here"
}
```

---

## 📝 Creating Custom Endpoints

Want to add a new API endpoint? Here's how:

1. **Create a new route file** in `backend/routes/`
   ```javascript
   import express from 'express';
   const router = express.Router();

   router.get('/', (req, res) => {
     res.json({ success: true, data: [] });
   });

   export default router;
   ```

2. **Register in server.js**
   ```javascript
   import myRoutes from './routes/myroutes.js';
   app.use('/api/myendpoint', myRoutes);
   ```

3. **Test it**
   ```bash
   curl http://localhost:5000/api/myendpoint
   ```

---

**Next**: Check `docs/TRAINING_DATA.md` to learn how to add more data!
