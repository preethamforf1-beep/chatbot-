// Chatbot Component
// Main chatbot interface for HRMS questions

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './Chatbot.css'

function getPageStorageKey() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return `hrmsChatbotPageMessages-${user?.employeeId || 'guest'}`
}

function loadSavedMessages() {
  const saved = window.localStorage.getItem(getPageStorageKey())
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

export default function Chatbot() {
  const role = JSON.parse(localStorage.getItem('user') || 'null')?.role
  const isPrivileged = role === 'admin' || role === 'hr'

  const [messages, setMessages] = useState(() => {
    const saved = loadSavedMessages()
    return saved ?? [
      {
        id: 1,
        text: "Hi! I'm your HRMS Assistant. I can help you with employee information, salaries, certificates, Form16 details, and general questions like today's date. What would you like to know?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]
  })
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputValue.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => {
      const next = [...prev, userMessage]
      window.localStorage.setItem(getPageStorageKey(), JSON.stringify(next))
      return next
    })
    setInputValue('')
    setLoading(true)
    setError(null)

    try {
      // Send to backend chatbot API with access token
      const accessToken = localStorage.getItem('accessToken') || null
      const response = await axios.post('/api/chatbot/chat',
        { message: inputValue },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      // Add bot response
      const botMessage = {
        id: messages.length + 2,
        text: response.data.botResponse,
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => {
        const next = [...prev, botMessage]
        window.localStorage.setItem(getPageStorageKey(), JSON.stringify(next))
        return next
      })
    } catch (err) {
      setError('Failed to get response from chatbot')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    const defaultMessages = [
      {
        id: 1,
        text: "Hi! I'm your HRMS Assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]
    setMessages(defaultMessages)
    window.localStorage.setItem(getPageStorageKey(), JSON.stringify(defaultMessages))
    setError(null)
  }

  const suggestedQuestions = isPrivileged
    ? [
        'Show all employees',
        'How do I view employee private details?',
        'What is the payroll summary?',
        'How do I access Form16 for an employee?',
        'How many leaves are pending?',
        'What are the company holidays?',
        'What is today\'s date?'
      ]
    : [
        'What are my details?',
      'Show my basic info',
      'my detials',
        'What is my salary?',
        'Show my salary history',
        'How many leaves are available?',
        'How do I download Form16?',
        'What are the company holidays?',
        'What is today\'s date?'
      ]

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>💬 HRMS Chatbot Assistant</h2>
        <p>Ask me anything about employees, salaries, and documents</p>
      </div>

      {/* Info Box */}
      <div className="chatbot-info">
        <strong>💡 Current Status:</strong> Rule-based responses (Learning Mode)
        <br />
        To enable OpenAI integration, add your API key to <code>backend/.env</code>
      </div>

      {/* Chat Box */}
      <div className="chat-box">
        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-avatar">
                {msg.sender === 'bot' ? '🤖' : '👤'}
              </div>
              <div className="message-content">
                <p className="message-text">{msg.text}</p>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="message bot">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="suggested-questions">
            <p>Try asking:</p>
            <div className="suggestions">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  className="suggestion-btn"
                  onClick={() => {
                    setInputValue(q)
                    // Optional: auto-send
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {/* Input Form */}
        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me about employees, salaries, certificates, or today's date..."
            disabled={loading}
            className="chat-input"
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !inputValue.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={clearChat}
          >
            Clear
          </button>
        </form>
      </div>

      {/* Documentation Link */}
      <div className="chatbot-footer">
        <p>📚 Want to learn how to train the chatbot? Check <strong>docs/CHATBOT_SETUP.md</strong></p>
      </div>
    </div>
  )
}
