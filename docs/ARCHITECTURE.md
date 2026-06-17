# HRMS Architecture

This document summarizes how the HRMS app is built and how the pieces connect.

Downloadable SVG version: [ARCHITECTURE.svg](ARCHITECTURE.svg)

```mermaid
flowchart LR
  U[User browser / portal] -->|Login or ask a question| F[Frontend<br/>React + Vite]
  F -->|POST /api/auth/login| B[Backend<br/>Node.js + Express]
  B -->|validates credentials| DB[Local data repository]
  DB -->|user record| B
  B -->|returns access + refresh tokens| F
  F -->|stores token| LS[LocalStorage]

  F -->|API request with Bearer token| B
  B --> A[/api/auth]
  B --> E[/api/employees]
  B --> P[/api/payroll]
  B --> C[/api/chatbot]
  B --> D[(Local JS data files)]

  C -->|verify token| JWT[JWT auth verify]
  C -->|normalize and classify message| M[Query router]
  M -->|sensitive or personal| L[Local rule-based response]
  M -->|safe general query| G[Groq AI API]
  G -->|AI answer| C
  G -->|error or missing key| L
  L -->|response| C

  C -->|JSON response| F
  F -->|render answer| U

  classDef apiNode fill:#f1f5f9,stroke:#64748b,stroke-dasharray:8 5;
  classDef backendNode fill:#ecfccb,stroke:#65a30d;
  classDef aiNode fill:#fae8ff,stroke:#c026d3;
  classDef dataNode fill:#fff7ed,stroke:#ea580c;

  class A,E,P,C apiNode;
  class B,JWT backendNode;
  class G aiNode;
  class D,DB,LS dataNode;
```

## Workflow

1. User opens the portal and logs in through the frontend.
2. Frontend sends `POST /api/auth/login` to the backend with email and password.
3. Backend checks `users.js` and `employees.js` via the repository and issues JWT access and refresh tokens.
4. Frontend stores the access token in `localStorage` and includes it in future API calls.
5. When the user asks the chatbot, the frontend posts `POST /api/chatbot/chat` with the message.
6. Backend verifies the token, normalizes typos, and classifies the message for sensitivity.
7. Personal or sensitive queries are answered locally using built-in rule-based logic.
8. Safe general queries are sent to the Groq AI API for an AI-generated response.
9. If Groq is unavailable or returns an error, the backend falls back to local response generation.
10. The response is returned as JSON and displayed in the frontend chat UI.

## Stack

- Frontend: React, Vite, Axios, CSS
- Backend: Node.js, Express, CORS, dotenv, JWT
- Chatbot: Custom backend rules plus Groq AI for some queries
- Data: Local JavaScript data files instead of a real database

## Data Flow

1. User logs in through the frontend.
2. Frontend stores the access token in `localStorage`.
3. Frontend sends requests to the backend API.
4. Backend reads local data files and handles chatbot logic.
5. Chatbot returns rule-based answers or uses Groq AI when allowed.

## Notes

- There is no external database like MySQL, PostgreSQL, or MongoDB in the current setup.
- If you want a raster version too, I can generate a PNG next.