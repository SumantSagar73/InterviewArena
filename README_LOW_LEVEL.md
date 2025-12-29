# 🛠️ InterviewArena: Low-Level Technical Documentation

This document provides a granular, file-level explanation of the **InterviewArena** codebase. It is intended for developers who need to understand the internal logic, function signatures, and service interconnections.

---

## 🏗️ Backend Architecture (`/backend/src`)

### 📂 `server.js` (The Heart)
- **Why**: Acts as the central hub for the Node.js environment.
- **Key Logic**: Sets up the Express middleware (JSON parsing, CORS), registers routes, and initializes the MongoDB connection.
- **Connections**: Links `inngest`, `chatRoutes`, `sessionRoutes`, and `aiRoutes` to the global `/api` namespace.

### 📂 `lib/` (Core Utilities)
- **`db.js`**:
    - **Function**: `connectDB()` — Establishes a singleton Mongoose connection to MongoDB.
- **`env.js`**:
    - **Role**: Centralizes all `process.env` access with clear error messaging for missing keys.
- **`inngest.js`**:
    - **Function**: `syncUser` — A background job that listens for `clerk/user.created` to keep our DB in sync.
- **`stream.js`**:
    - **Exports**: `chatClient` and `streamClient` instances.
    - **Function**: `upsertStreamUser(userData)` — Injects our local user data into Stream's specialized user database.

### 📂 `models/` (Data Schemas)
- **`User.js`**: Stores profile info derived from Clerk (Name, Email, ClerkID).
- **`Session.js`**: The most critical model. Tracks the problem title, difficulty, room host, participants, and AI consensus votes.
- **`Version.js`**: Manages the snapshot history of code for specific sessions.

### 📂 `controllers/` (Business Logic)
- **`sessionController.js`**:
    - **`createSession`**: Generates a 6-digit room code, creates a DB entry, and initializes the Stream Video/Chat IDs.
    - **`joinSessionByCode`**: Validates codes, manages participant limits, and adds the joining user to the Stream Chat channel.
- **`aiController.js`**:
    - **`analyzeCode`**: Sends a prompt to Groq API. It includes the problem description and candidate's code to ensure contextual feedback.
    - **`toggleAnalyzerVote`**: Manages the array of `analyzerVotes` in the session document to enforce the consensus model.
- **`versionController.js`**:
    - **`createVersion`**: Saves the current code state to the database associated with a session ID.

### 📂 `middleware/` (Security Layer)
- **`protectRoute.js`**:
    - **Logic**: A multi-stage middleware. It first validates the user's JWT via Clerk's `requireAuth()`, then fetches the corresponding user from MongoDB and attaches it to `req.user` for use in subsequent controllers.

---

## 🎨 Frontend Architecture (`/frontend/src`)

### 📂 `pages/` (View Layer)
- **`SessionPage.jsx`**:
    - **Logic**: Orchestrates the entire interview UI. It uses the `PanelGroup` for the resizable layout and coordinates between the `CodeEditorPanel`, `VideoCallUI`, and `AIAnalyzerPanel`.
- **`DashboardPage.jsx`**:
    - **Logic**: Shows "Active Rooms" and "My Recent Sessions" by fetching data from the backend via TanStack Query.

### 📂 `components/` (UI Logic)
- **`CodeEditorPanel.jsx`**:
    - **Role**: Wraps the Monaco Editor. Manages language switching and triggers the `onRunCode` callback.
- **`AIAnalyzerPanel.jsx`**:
    - **Logic**: A complex component that handles the "Voting UI," "Consensus Meter," and eventually displays the AI-generated observations.
- **`VideoCallUI.jsx`**:
    - **Role**: Integrates the `StreamCall` and `SpeakerLayout` for the video feed and the side-chat drawer.

### 📂 `hooks/` (Reusable Logic)
- **`useStreamClient.js`**:
    - **Purpose**: A "Lifecycle Hook." It connects the user to the Stream servers, joins the specific `callId`, and handles the cleanup (leaving the call) when the component unmounts.
- **`useAI.js`**:
    - **Role**: Provides mutations for analyzing code and generating hints, keeping the UI components free of API calling logic.

### 📂 `lib/` (Client Utilities)
- **`piston.js`**:
    - **Function**: `executeCode(language, code)` — Communicates with the external Piston API to run code in an isolated Docker container and return the standard output/error.
- **`axios.js`**:
    - **Role**: A pre-configured Axios instance with `withCredentials: true` and the base `VITE_API_URL` to ensure consistent API communication.

---

## 🔌 Service Interconnections

1.  **Authentication (Clerk ↔ Backend ↔ Stream)**:
    -   The frontend gets a JWT from Clerk.
    -   The backend uses this JWT to identify the user.
    -   The backend generates a specialized "Stream Token" using the user's Clerk ID, allowing them to access the video call securely without a separate password.

2.  **Collaboration (Frontend ↔ Stream Chat)**:
    -   Code synchronization and AI vote notifications happen over the Stream Chat WebSocket channel. This avoids the overhead of polling our main MongoDB database for every keystroke.

3.  **AI Analysis (Frontend ↔ Backend ↔ Groq)**:
    -   The frontend sends code to our backend controller.
    -   The backend constructs a technical interviewer persona prompt.
    -   Groq returns the response, which is then streamed (or sent in bulk) back to the UI.

4.  **Async Workflows (Clerk Webhooks ↔ Inngest ↔ MongoDB)**:
    -   Whenever a user profile is updated in Clerk, **Inngest** hears about it via a webhook and silently updates our local `User` collection and Stream identity. This ensures the UI always shows the correct profile pictures and names.

---
*Documentation for maintainers and reviewers focusing on technical depth and architectural clarity.*
