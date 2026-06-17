# TRAINING DATA & CHATBOT IMPROVEMENT GUIDE

Learn how to teach your chatbot to be smarter and more useful.

## 📚 Understanding Training Data

### What is Training Data?
Training data teaches the chatbot how to respond to questions. There are several types:

1. **Examples** - Q&A pairs the bot learns from
2. **Context** - Information about your company/employees
3. **Rules** - Patterns to match
4. **Feedback** - Corrections to improve responses

## 🎯 Step 1: Rule-Based Training (Before OpenAI)

### Current Implementation
Location: `backend/routes/chatbot.js` - `generateResponse()` function

### Add New Rules
```javascript
function generateResponse(message) {
  const msg = message.toLowerCase();
  
  // Add your new rules here:
  if (msg.includes('department') && msg.includes('size')) {
    return 'We have IT, HR, and Finance departments.';
  }
  
  if (msg.includes('best employee') || msg.includes('top performer')) {
    return 'All our employees are valuable! Each one contributes uniquely.';
  }

  if (msg.includes('contextual chatbot') || msg.includes('ai-powered contextual') || msg.includes('natural language processing') || msg.includes('machine learning')) {
    return 'AI-powered contextual chatbots use NLP and ML to understand intent, remember recent conversation context, and respond in a more natural, personalized way.';
  }
  
  return 'I can help with employee information. Ask me anything!';
}
```

### Test Your Rules
```bash
# Restart backend
npm run dev

# Try the question in chatbot UI
# "What is the size of each department?"
```

---

## 🤖 Step 2: OpenAI Training

### Method 1: System Prompt Engineering

The system prompt guides how the AI responds. Good prompts = Good responses.

**Basic Prompt:**
```javascript
const systemPrompt = 'You are an HRMS assistant.';
```

**Better Prompt:**
```javascript
const systemPrompt = `You are a professional HRMS assistant for a tech company.
Your responsibilities:
- Provide accurate employee information
- Help with salary and payroll queries
- Assist with certificate and Form16 requests
- Maintain employee privacy
- Be friendly and professional`;
```

**Excellent Prompt (with examples):**
```javascript
const systemPrompt = `You are an expert HRMS assistant for a software company.
You have detailed knowledge of:
- Employee details and roles
- Salary structures and benefits
- Certifications and qualifications
- Tax documents (Form16, ITR)
- Leave policies and payroll

Guidelines:
- Always provide accurate information
- If unsure, say "I don't have that information"
- Be professional but friendly
- Use specific numbers and facts
- Never make up employee information

Example responses you should mimic:
Q: "What's Raj's salary?"
A: "Raj Kumar (EMP001) is our Senior Developer in the IT department with a base salary of ₹750,000."

Q: "Does anyone have AWS certification?"
A: "Yes, Raj Kumar has AWS Certified Solutions Architect certification."`;
```

### Method 2: Context Injection

Include employee data in your prompt:

```javascript
import employees from '../data/employees.js';

function createSystemPrompt() {
  // Build employee summary
  const employeeSummary = employees
    .map(e => `${e.name} (${e.id}): ${e.designation} in ${e.department}, Salary: ₹${e.salary}`)
    .join('\n');
  
  return `You are an HRMS assistant. Here's our employee database:
${employeeSummary}

Answer questions based on this data accurately and professionally.`;
}

// Use in your chat route:
const systemPrompt = createSystemPrompt();
```

### Method 3: Few-Shot Learning

Show examples so the model learns better:

```javascript
const messages = [
  {
    role: 'system',
    content: 'You are an HRMS assistant. Answer employee questions accurately.'
  },
  // Example 1: Employee Query
  {
    role: 'user',
    content: 'What is Priya Singh doing?'
  },
  {
    role: 'assistant',
    content: 'Priya Singh (EMP002) is the HR Manager in our HR department with a salary of ₹600,000.'
  },
  // Example 2: Salary Comparison
  {
    role: 'user',
    content: 'Compare salaries of IT and HR employees'
  },
  {
    role: 'assistant',
    content: 'Raj Kumar from IT earns ₹750,000 while Priya Singh from HR earns ₹600,000. IT department has higher salaries.'
  },
  // User's Actual Question
  {
    role: 'user',
    content: userMessage
  }
];
```

---

## 🎓 Step 3: Advanced Training Techniques

### Technique 1: Query Classification
Identify what type of question it is:

```javascript
function classifyQuery(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('salary') || msg.includes('pay')) return 'salary';
  if (msg.includes('certificate') || msg.includes('qualification')) return 'certificate';
  if (msg.includes('form16') || msg.includes('tax')) return 'tax';
  if (msg.includes('department') || msg.includes('team')) return 'department';
  
  return 'general';
}

// Use specific prompt for each type
function getTypeSpecificPrompt(queryType) {
  const prompts = {
    salary: 'You are a payroll specialist. Provide accurate salary information.',
    certificate: 'You are an HR specialist. Provide certification details.',
    tax: 'You are a tax advisor. Help with Form16 and tax queries.',
    department: 'You are an organizational expert. Provide team information.',
    general: 'You are a general HR assistant.'
  };
  
  return prompts[queryType] || prompts.general;
}
```

### Technique 2: Confidence Scoring

Rate how confident the chatbot is:

```javascript
async function getChatbotResponse(message) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: 'You are an HRMS assistant. At the end of your response, rate your confidence (HIGH/MEDIUM/LOW).'
    },
    { role: 'user', content: message }]
  });
  
  const text = response.choices[0].message.content;
  
  // Parse confidence level
  const confidenceMatch = text.match(/Confidence: (HIGH|MEDIUM|LOW)/i);
  
  return {
    response: text,
    confidence: confidenceMatch ? confidenceMatch[1] : 'UNKNOWN'
  };
}

### Technique 4: Intent Classification (Implementation note)

Add a lightweight classifier on the server to route queries to specialized prompts and handle privacy rules before calling an external AI. Example:

```javascript
function classifyQuery(message) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('salary') || msg.includes('pay')) return 'salary';
  if (msg.includes('certificate') || msg.includes('certified')) return 'certificate';
  if (msg.includes('form16') || msg.includes('tax')) return 'tax';
  if (msg.includes('department') || msg.includes('team')) return 'department';
  return 'general';
}
```

Use the detected intent to: 
- Choose a short, specialized system prompt (improves accuracy).
- Decide whether to deny the request locally (for sensitive info).
- Route to HR/Admin-only flows when required.

### Technique 5: Confidence Propagation

Ask the model to append a small confidence indicator (HIGH/MEDIUM/LOW) at the end of its reply and parse it on the server. Return the confidence to the client so the UI can surface a warning or offer a confirmation step for low-confidence answers.

Example server-side parsing:

```javascript
const raw = data.choices[0].message.content;
const confidenceMatch = raw.match(/Confidence:\s*(HIGH|MEDIUM|LOW)/i);
const confidence = confidenceMatch ? confidenceMatch[1] : 'UNKNOWN';
const text = raw.replace(/\n?\s*Confidence:\s*(HIGH|MEDIUM|LOW)\.?\s*$/i, '').trim();
```

This combination (intent classification + confidence) gives a practical, privacy-aware way to improve chatbot behavior while keeping sensitive data local.

```

### Technique 3: Conversation History

Keep context across multiple messages:

```javascript
class ChatbotSession {
  constructor() {
    this.history = [];
    this.maxMessages = 10;
  }
  
  addMessage(role, content) {
    this.history.push({ role, content });
    
    // Keep only last 10 messages to save tokens
    if (this.history.length > this.maxMessages) {
      this.history.shift();
    }
  }
  
  getMessages() {
    return this.history;
  }
  
  async getResponse(userMessage) {
    this.addMessage('user', userMessage);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an HRMS assistant.' },
        ...this.history
      ]
    });
    
    const botMessage = response.choices[0].message.content;
    this.addMessage('assistant', botMessage);
    
    return botMessage;
  }
}

// Usage in your route:
const sessions = new Map();

router.post('/chat', async (req, res) => {
  const userId = req.body.userId || 'default';
  
  if (!sessions.has(userId)) {
    sessions.set(userId, new ChatbotSession());
  }
  
  const session = sessions.get(userId);
  const response = await session.getResponse(req.body.message);
  
  res.json({ success: true, botResponse: response });
});
```

---

## 📊 Step 4: Performance Tuning

### Parameter Tuning

```javascript
// Temperature: How creative/random the response is
// 0 = Always the same (good for facts)
// 1 = Very creative (good for creative writing)
temperature: 0.2,  // HRMS should be factual, not creative

// Max Tokens: Maximum length of response
max_tokens: 300,   // Keep HRMS responses concise

// Top P: Diversity of token selection
top_p: 0.8,        // Good balance

// Frequency Penalty: Avoid repetition
frequency_penalty: 0.0,

// Presence Penalty: Encourage new topics
presence_penalty: 0.0
```

### Cost Optimization

```javascript
// Option 1: Use cheaper model
model: 'gpt-3.5-turbo',  // $0.002 per 1K tokens

// Option 2: Cache responses
const responseCache = new Map();
function getCachedResponse(question) {
  if (responseCache.has(question)) {
    return responseCache.get(question);
  }
  // Fetch from OpenAI
}

// Option 3: Summarize long queries
function summarizeQuery(longMessage) {
  if (longMessage.length > 500) {
    // Send to OpenAI to summarize first
    return getSummary(longMessage);
  }
  return longMessage;
}
```

---

## 🧪 Step 5: Testing & Evaluation

### Create Test Cases

```javascript
const testCases = [
  {
    question: 'What is the salary of Raj Kumar?',
    expectedKeywords: ['Raj', 'salary', '750000'],
    type: 'factual'
  },
  {
    question: 'How many employees do we have?',
    expectedKeywords: ['3', 'employees'],
    type: 'factual'
  },
  {
    question: 'Who works in the IT department?',
    expectedKeywords: ['Raj', 'IT'],
    type: 'factual'
  },
  {
    question: 'What are your capabilities?',
    expectedKeywords: ['employee', 'salary', 'certificate'],
    type: 'capability'
  }
];

async function testChatbot() {
  for (const test of testCases) {
    const response = await chatbot.getResponse(test.question);
    const passed = test.expectedKeywords.every(kw => 
      response.toLowerCase().includes(kw.toLowerCase())
    );
    
    console.log(`${passed ? '✓' : '✗'} ${test.question}`);
    if (!passed) {
      console.log(`  Response: ${response}`);
    }
  }
}
```

### Evaluate Responses

```javascript
// Checklist for good responses:
const evaluationCriteria = {
  accuracy: 'Is the information correct?',
  completeness: 'Does it answer the full question?',
  clarity: 'Is it easy to understand?',
  professional: 'Is the tone appropriate?',
  concise: 'Is it not too long?'
};

// Score each response
function scoreResponse(response, criteria) {
  let score = 0;
  for (const criterion of Object.values(criteria)) {
    // Manually evaluate or use automated checks
    score += evaluateOne(response, criterion);
  }
  return score / Object.keys(criteria).length;
}
```

---

## 📈 Step 6: Iterative Improvement

### Weekly Improvement Cycle

1. **Monday**: Log all chatbot questions from previous week
2. **Tuesday**: Identify failed queries
3. **Wednesday**: Update training data & prompts
4. **Thursday**: Test new version
5. **Friday**: Deploy if good, else refine

### Collect Feedback

```javascript
// Add rating to responses
router.post('/chatbot/feedback', (req, res) => {
  const { messageId, rating, feedback } = req.body;
  
  // Store in database
  saveFeedback({
    messageId,
    rating,  // 1-5 stars
    feedback,
    timestamp: new Date()
  });
  
  res.json({ success: true });
});
```

---

## 🎯 Your Training Roadmap

1. **Week 1**: Write 10 good rule-based responses
2. **Week 2**: Enable OpenAI, write system prompts
3. **Week 3**: Add employee context to prompts
4. **Week 4**: Implement conversation history
5. **Week 5**: Add few-shot learning examples
6. **Week 6**: Optimize performance and cost
7. **Week 7**: Collect and analyze user feedback
8. **Week 8**: Deploy improved chatbot

---

**Next Step**: Start with your first system prompt! See `docs/CHATBOT_SETUP.md` for implementation.
