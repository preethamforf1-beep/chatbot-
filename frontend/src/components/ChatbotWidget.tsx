import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './ChatbotWidget.css'
import type { ChatMessage, User } from '../types'

interface ChatbotWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  accessToken: string | null;
  user: User | null;
}

function getWidgetStorageKey(user: User | null): string {
  return `hrmsChatbotWidgetMessages-${user?.employeeId ?? 'guest'}`
}

function loadWidgetMessages(user: User | null): ChatMessage[] | null {
  const saved = window.localStorage.getItem(getWidgetStorageKey(user))
  if (!saved) return null
  try {
    const parsed = JSON.parse(saved) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed as ChatMessage[]
  } catch {
    return null
  }
}

function getDefaultMessages(user: User | null): ChatMessage[] {
  return [
    {
      id: 1,
      text: `Hi ${user?.name ?? 'there'}! 👋 I'm your HRMS Assistant. I can help with your personal info, company announcements, portal guidance, today's date, and more. What would you like to know?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]
}

export default function ChatbotWidget({ isOpen, onToggle, accessToken, user }: ChatbotWidgetProps) {
  const isPrivileged = user?.role === 'admin' || user?.role === 'hr'
  const suggestedQuestions = isPrivileged
    ? [
        'Show all employees',
        'How do I view employee private details?',
        'What is the payroll summary?',
        'How do I access Form16 for an employee?',
        'How many leaves are pending?',
        'How can I approve a leave request?',
        'What are the company holidays?',
        "What is today's date?"
      ]
    : [
        'What are my details?',
        'How many leaves are available?',
        'Apply CL for 5 July, Full Day',
        'Cancel my leave',
        'What are the company holidays?',
        "What is today's date?"
      ]

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadWidgetMessages(user)
    return saved ?? getDefaultMessages(user)
  })
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const saved = loadWidgetMessages(user)
    setMessages(saved ?? getDefaultMessages(user))
  }, [user?.employeeId, user?.name])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => {
      const next = [...prev, userMessage]
      window.localStorage.setItem(getWidgetStorageKey(user), JSON.stringify(next))
      return next
    })
    setInputValue('')
    setLoading(true)

    try {
      const response = await axios.post(
        '/api/chatbot/chat',
        { message: inputValue },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const botMessage: ChatMessage = {
        id: messages.length + 2,
        text: response.data.botResponse as string,
        sender: 'bot',
        timestamp: new Date()
      }

      setMessages(prev => {
        const next = [...prev, botMessage]
        window.localStorage.setItem(getWidgetStorageKey(user), JSON.stringify(next))
        return next
      })
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : ''
      const errText = axios.isAxiosError(err)
        ? err.response?.data?.error || 'Sorry, I encountered an error. Please try again.'
        : 'Sorry, I encountered an error. Please try again.'

      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        text: errText + (detail ? ` (${detail})` : ''),
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => {
        const next = [...prev, errorMessage]
        window.localStorage.setItem(getWidgetStorageKey(user), JSON.stringify(next))
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="chatbot-toggle" onClick={onToggle} title="Chat with us">
        <span className="chat-icon">💬</span>
        {!isOpen && <span className="chat-badge">Let's Chat</span>}
      </button>

      {isOpen && (
        <div className="chatbot-widget">
          <div className="chatbot-header">
            <h3>HRMS Assistant</h3>
            <span className="user-role">{user?.role}</span>
            <button className="close-btn" onClick={onToggle}>×</button>
          </div>

          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-bubble">{msg.text}</div>
              </div>
            ))}

            {messages.length <= 1 && (
              <div className="chatbot-suggestions">
                <p>Try one of these</p>
                <div className="chatbot-suggestions-grid">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      type="button"
                      className="chatbot-suggestion-btn"
                      onClick={() => setInputValue(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="message bot">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about leave requests, approvals, company info, or today's date..."
              disabled={loading}
              className="chatbot-input"
            />
            <button type="submit" className="send-btn" disabled={loading || !inputValue.trim()}>
              →
            </button>
          </form>
        </div>
      )}
    </>
  )
}
