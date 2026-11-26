# Bedrock Customer Support – React Frontend

A ready-to-run React/Vite frontend for the Node.js + Express + MongoDB + Amazon Bedrock backend developed in this learning project.

## Included

- Streaming chat using `POST /api/chat/stream` and the browser Fetch API.
- Parses Server-Sent Events (`conversation`, `token`, `stop`, `done`, `error`).
- Sends `message` and `conversationId` in the request body.
- Sends the configurable `x-user-id` header used by the current demo backend.
- Displays input/output/total tokens, estimated cost, stop reason and guardrail intervention status.
- Local browser conversation list. The actual conversation history remains stored in MongoDB by the backend.
- Markdown and GitHub-flavoured Markdown rendering.
- Responsive layout and new-chat workflow.

## Requirements

- Node.js 20 or newer recommended.
- Your backend running locally.
- Backend streaming route: `POST /api/chat/stream`.
- Backend request body:
  ```json
  {
    "message": "How can I track my order?",
    "conversationId": null
  }
  ```
- Backend SSE events:
  - `conversation`: `{ "conversationId": "..." }`
  - `token`: `{ "text": "..." }`
  - `stop`: `{ "stopReason": "end_turn", "blocked": false }`
  - `done`: `{ "conversationId": "...", "usage": {}, "blocked": false, "cost": {} }`
  - `error`: `{ "message": "..." }`

The parser also accepts token events whose data is a plain text string. If your controller uses a slightly different event shape, adjust `src/services/chatService.js`.

## Setup

1. Extract the ZIP.
2. Open a terminal in the extracted `bedrock-customer-support-frontend` directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and set your backend URL:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_DEMO_USER_ID=demo-user-001
   ```
   Replace port `5000` with the port used by your Express server.
5. Start the frontend:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5173`.

## Backend CORS

Your Express app must allow `http://localhost:5173` and the `x-user-id` header. Example:

```js
import cors from "cors";

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-user-id"]
}));
```

Register CORS before your API routes.

## Important notes

- The current `x-user-id` header is a development-only identity mechanism. Replace it with proper authentication before production.
- The frontend stores a lightweight conversation index and message cache in browser `localStorage` for convenience. MongoDB remains the source of truth for persisted backend messages.
- Selecting a previous conversation reuses its MongoDB `conversationId`; the backend should load the history when the next message is sent. This frontend does not assume an undocumented conversation-history GET endpoint.
- Costs are displayed as estimates using the rates configured in your backend. The frontend does not calculate or alter AWS pricing.
- Do not put AWS access keys, Bedrock credentials, Guardrail IDs requiring secrecy, or other server secrets in Vite environment variables. Browser variables are public.
- The frontend never calls AWS directly. All Bedrock requests go through your Express backend.

## Useful commands

```bash
npm run dev
npm run build
npm run preview
```
