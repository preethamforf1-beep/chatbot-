# QUICK START - Get Running in 5 Minutes ⚡

## Prerequisites
- Node.js installed (v16+)
- npm or yarn
- A code editor (VS Code)
- OpenAI API key (optional for AI features)

## 🚀 Step 1: Install Dependencies

```bash
cd hrms-portal

# Install all dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
```

## 🚀 Step 2: Start the Backend

```bash
cd backend
npm run dev
```

Expected output:
```
🚀 HRMS Server running on http://localhost:5000
```

## 🚀 Step 3: Start the Frontend (New Terminal)

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.0.0  ready in XXX ms

Local:    http://localhost:5173/
```

## 🚀 Step 4: Open in Browser

Go to: **http://localhost:5173**

You should see the HRMS portal! 🎉

## 🎯 What to Try First

1. **Dashboard Tab**: See employee statistics
2. **Employees Tab**: Click on employee cards to see details
3. **Chatbot Tab**: Ask "What is the average salary?"

## 🔑 Enable AI Chatbot (Optional)

1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Create `backend/.env` file with:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Run: `npm install openai` in backend folder
4. Restart backend: `npm run dev`
5. Update `backend/routes/chatbot.js` with OpenAI code

See `docs/CHATBOT_SETUP.md` for detailed instructions.

## 📁 Project Structure

```
hrms-portal/
├── frontend/       ← React UI (port 5173)
├── backend/        ← Node.js API (port 5000)
├── chatbot/        ← Chatbot training data
└── docs/           ← Tutorials & guides
```

## 🛠️ Common Commands

```bash
# Start both simultaneously
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Stop server: Press Ctrl+C
```

## ✅ Next Steps

- [ ] Project running locally
- [ ] All 3 tabs working (Dashboard, Employees, Chatbot)
- [ ] Read `docs/LEARNING_GUIDE.md`
- [ ] Add OpenAI API key
- [ ] Try custom API endpoints
- [ ] Modify employee data

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 5173 already in use | Close other apps or change port: `npm run dev -- --port 3000` |
| Port 5000 already in use | Kill process or change in `backend/server.js` |
| "Cannot find module" | Run `npm install` again |
| API not responding | Check both servers are running |
| Pages not loading | Hard refresh browser (Ctrl+Shift+R) |

## 📚 Documentation

- `docs/LEARNING_GUIDE.md` - Complete 4-week learning path
- `docs/CHATBOT_SETUP.md` - OpenAI integration tutorial
- `docs/TRAINING_DATA.md` - How to train chatbot
- `docs/API_ENDPOINTS.md` - All API reference

---

**Ready? Start the servers and begin learning!** 🚀
