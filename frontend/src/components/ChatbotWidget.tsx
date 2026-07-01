import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './ChatbotWidget.css'
import type { ChatMessage, ChatAction, ChatWidget, User } from '../types'

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
        'Apply leave',
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

  // Shared send routine used by the input form, action buttons, and widgets.
  const sendText = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => {
      const next = [...prev, userMessage]
      window.localStorage.setItem(getWidgetStorageKey(user), JSON.stringify(next))
      return next
    })
    setLoading(true)

    try {
      const response = await axios.post(
        '/api/chatbot/chat',
        { message: trimmed },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        text: response.data.botResponse as string,
        sender: 'bot',
        timestamp: new Date(),
        actions: (response.data.actions as ChatAction[] | undefined) ?? [],
        widget: (response.data.widget as ChatWidget | undefined) ?? undefined
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
        id: Date.now() + 1,
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const toSend = inputValue
    setInputValue('')
    await sendText(toSend)
  }

  const handleActionClick = async (action: ChatAction) => {
    setInputValue('')
    await sendText(action.send)
  }

  // Only the most recent message's widget is interactive; older ones are frozen
  // so a user can't re-submit a step they've already passed.
  const lastMessageId = messages.length ? messages[messages.length - 1].id : -1

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
            {messages.map(msg => {
              const isLast = msg.id === lastMessageId
              return (
                <div key={msg.id} className={`message ${msg.sender}`}>
                  <div className="message-bubble">{msg.text}</div>

                  {/* Action buttons (Confirm / Cancel / Skip) */}
                  {msg.sender === 'bot' && msg.actions && msg.actions.length > 0 && (
                    <div className="message-actions">
                      {msg.actions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`message-action-btn ${i > 0 ? 'secondary' : ''}`}
                          onClick={() => handleActionClick(action)}
                          disabled={loading || !isLast}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive widget: date picker or leave-type buttons */}
                  {msg.sender === 'bot' && msg.widget && (
                    <ChatWidgetRenderer
                      widget={msg.widget}
                      disabled={loading || !isLast}
                      onSubmit={sendText}
                    />
                  )}
                </div>
              )
            })}

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

// ── Widget renderer ───────────────────────────────────────────────────────────
// Renders the interactive control the bot attached to a message.

interface ChatWidgetRendererProps {
  widget: ChatWidget;
  disabled: boolean;
  onSubmit: (text: string) => void;
}

function ChatWidgetRenderer({ widget, disabled, onSubmit }: ChatWidgetRendererProps) {
  const [dateValue, setDateValue] = useState('')

  if (widget.type === 'date') {
    return (
      <div className="chat-date-picker">
        <input
          type="date"
          className="chat-date-input"
          value={dateValue}
          min={widget.minDate}
          disabled={disabled}
          onChange={(e) => setDateValue(e.target.value)}
        />
        <button
          type="button"
          className="chat-date-submit"
          disabled={disabled || !dateValue}
          onClick={() => onSubmit(dateValue)}
        >
          Set date
        </button>
      </div>
    )
  }

  if (widget.type === 'leaveTypes') {
    const options = widget.options ?? []
    return (
      <div className="leave-type-grid">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className="leave-type-btn"
            disabled={disabled}
            onClick={() => onSubmit(`type:${opt.code}`)}
          >
            <span className="leave-type-name">{opt.name} ({opt.code})</span>
            <span className={`leave-type-balance ${opt.balance === null || opt.balance <= 0 ? 'zero' : ''}`}>
              {opt.balance === null ? 'no balance set' : `${opt.balance} left`}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return null
}