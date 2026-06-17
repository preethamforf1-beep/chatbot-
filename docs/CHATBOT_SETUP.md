# CHATBOT SETUP & LEARNING GUIDE

## Overview
This guide teaches you how to set up, configure, and train an OpenAI-powered chatbot for your HRMS portal.

## Step 1: Get OpenAI API Key

### 1.1 Sign up for OpenAI
- Go to https://platform.openai.com/signup
- Create an account or log in
- Verify your email

### 1.2 Create API Key
1. Visit https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (you'll only see it once!)
4. Keep it safe - never share this key

### 1.3 Add Balance/Credit
- You need API credits to use OpenAI
- Visit https://platform.openai.com/account/billing/overview
- Add a payment method or promotional credits
- Pricing: ~$0.002 per 1000 tokens (very cheap for testing)

## Step 2: Configure Backend

### 2.1 Create .env file
In the `backend/` folder, create a file named `.env` (based on `.env.example`):

```bash
# backend/.env
PORT=5000
NODE_ENV=development

OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

CORS_ORIGIN=http://localhost:5173
```

Replace `sk-your-api-key-here` with your actual OpenAI API key.

### 2.2 Install Dependencies
```bash
cd backend
npm install
npm install openai
```

## Step 3: Enable OpenAI Integration

### 3.1 Update Chatbot Route
Edit `backend/routes/chatbot.js`:

```javascript
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an HRMS assistant. Answer questions about employees, salaries, and company policies.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const botResponse = completion.choices[0].message.content;

    res.json({
      success: true,
      userMessage: message,
      botResponse: botResponse,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});
```

## Step 4: Train the Chatbot

### 4.1 System Prompts
The system prompt guides how the bot responds. Better prompts = better responses.

Example HRMS-specific prompt:
```javascript
'You are an expert HRMS assistant for a company. You have access to employee information including salaries, certifications, and tax documents. Always provide accurate information from the database. Be professional and helpful.'
```

### 4.2 Context Injection
To make the bot smarter, include employee data in your prompt:

```javascript
import employees from '../data/employees.js';

// In your chat route:
const employeeContext = employees.map(e => 
  `${e.name} (${e.id}): ${e.designation} in ${e.department}, Salary: ₹${e.salary}`
).join('\n');

const messages = [
  {
    role: 'system',
    content: `You are an HRMS assistant. Here's the employee database:\n${employeeContext}\n\nAnswer questions accurately.`
  },
  {
    role: 'user',
    content: message
  }
];
```

## Step 5: Test the Chatbot

### 5.1 Start Backend
```bash
cd backend
npm run dev
```

### 5.2 Start Frontend
In another terminal:
```bash
cd frontend
npm run dev
```

### 5.3 Test in UI
- Open http://localhost:5173
- Go to "Chatbot" tab
- Ask questions like:
  - "What's Raj Kumar's salary?"
  - "Show me employees in IT department"
  - "What certificates does Priya Singh have?"

## Step 6: Advanced Training

### 6.1 Few-Shot Learning
Add example Q&A to train the model better:

```javascript
const messages = [
  {
    role: 'system',
    content: 'You are an HRMS assistant. Answer employee questions.'
  },
  // Examples for the model to learn from
  {
    role: 'user',
    content: 'What is Raj Kumar salary?'
  },
  {
    role: 'assistant',
    content: 'Raj Kumar (EMP001) is a Senior Developer in IT with a salary of ₹750,000.'
  },
  // Actual user question
  {
    role: 'user',
    content: message
  }
];
```

### 6.2 Custom Instructions
Create different prompts for different types of queries:

```javascript
function getSystemPrompt(queryType) {
  const prompts = {
    salary: 'You are a payroll assistant. Provide accurate salary information.',
    employee: 'You are an HR assistant. Provide employee details and information.',
    document: 'You are a document specialist. Help with Form16, certificates, etc.',
    default: 'You are an HRMS assistant. Help with all HR-related queries.'
  };
  
  return prompts[queryType] || prompts.default;
}
```

### 6.3 Temperature Tuning
- `temperature: 0` = Deterministic, same answer always
- `temperature: 1` = Creative, varied responses
- `temperature: 0.7` = Balanced (good for HRMS)

For HRMS, use 0-0.3 (accurate, factual responses).

## Troubleshooting

### Issue: "Invalid API Key"
- Check if your API key is correct
- Make sure it doesn't have extra spaces
- Regenerate the key if needed

### Issue: "Rate limit exceeded"
- You're making too many requests
- Add a delay between requests
- Check your API usage at https://platform.openai.com/account/usage

### Issue: "Chatbot not responding"
- Check backend is running: `curl http://localhost:5000/api/health`
- Check frontend is connected to backend
- Look at server logs for errors

## Next Steps

1. ✅ Integrate OpenAI API
2. 📚 Add more training data
3. 🎯 Implement conversation history
4. 🔍 Add knowledge base search
5. 📊 Track chatbot performance

---

**Questions?** Check `docs/` folder for more tutorials!
