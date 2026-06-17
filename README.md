# HRMS Portal with AI Chatbot - Learning Project

This is a **practice project** to learn how to build an HRMS (Human Resource Management System) portal with an integrated OpenAI-powered chatbot.

## Project Overview

- **Frontend**: React with Vite
- **Backend**: Node.js with Express
- **Chatbot**: OpenAI API integration
- **Database**: JSON files (for simplicity in learning)
- **Features**: Employee Management, Payroll, Certificates, Form16, Leave Management

## Project Structure

```
hrms-portal/
├── frontend/          # React application
├── backend/           # Express server & APIs
├── chatbot/           # Chatbot training data & config
├── docs/              # Learning documentation
└── README.md
```

## Quick Start

### 1. Setup Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

### 3. Configure Chatbot
- Add your OpenAI API key to `.env.local`
- See `docs/CHATBOT_SETUP.md` for detailed instructions

## Learning Path

1. **Week 1**: Basic HRMS portal structure
2. **Week 2**: Integrate OpenAI chatbot
3. **Week 3**: Train chatbot with HRMS data
4. **Week 4**: Advanced chatbot features

## Features to Implement

- [x] Employee database
- [x] Payroll information
- [x] Certificates & Form16
- [x] Leave management
- [ ] OpenAI chatbot integration
- [ ] Training data setup
- [ ] Chat UI component
- [ ] Advanced queries handling

## Documentation

- `docs/CHATBOT_SETUP.md` - Chatbot setup guide
- `docs/TRAINING_DATA.md` - How to train the chatbot
- `docs/API_ENDPOINTS.md` - Backend API documentation
- `docs/LEARNING_GUIDE.md` - Step-by-step learning guide

---
**Start with**: `docs/LEARNING_GUIDE.md`

