# InterviewArena - Comprehensive Project Documentation

## 1️⃣ Project Overview
**InterviewArena** is a full-stack, real-time collaborative platform designed to revolutionize the technical interview process. Unlike traditional tools that fragment the experience across multiple tabs (Zoom for video, HackerRank for code, Google Docs for notes), InterviewArena provides a **unified, immersive environment**.

It enables interviewers and candidates to:
-   Collaborate on code with sub-50ms latency.
-   Communicate via high-quality video & audio.
-   Leverage AI as a neutral third-party mediator.
-   Analyze candidate fit using resume parsing.

---

## 2️⃣ Architecture & Tech Stack

### High-Level Architecture
The application is built on a **Client-Server** model but relies heavily on **Peer-to-Peer (P2P)** concepts for real-time features.

-   **Frontend**: React (Vite) + Tailwind CSS + DaisyUI.
-   **Backend**: Node.js + Express.js.
-   **Database**: MongoDB (Mongoose ORM).
-   **Real-Time Layer**: Stream Chat & Video SDKs (Edge Network).
-   **Authentication**: Clerk.
-   **AI Services**: Groq (Llama 3) & Google Gemini.
-   **Code Execution**: Piston API (Isolated Sandbox).

### Why this Stack?
| Component | Choice | Reason |
| :--- | :--- | :--- |
| **Real-Time** | Stream SDK | Built-in edge network handles global latency & scalability better than a custom socket.io server. |
| **Editor** | Monaco Editor | Industry standard (VS Code engine) provides the best developer experience. |
| **AI** | Groq (Llama 3) | Near-instant inference speed (~300 tokens/sec) feels "live" compared to GPT-4. |
| **Auth** | Clerk | Handles complex session management, 2FA, and social logins out of the box. |

---

## 3️⃣ Key Features & Implementation Details

### A. Real-Time Collaborative Coding (The "Session")
**Path**: `frontend/src/pages/SessionPage.jsx`
**Backend**: `backend/src/routes/sessionRoute.js`

This is the core of the application. It features a split-screen layout with a draggable video call overlay.

*   **Synchronization Logic**:
    *   I bypassed traditional Operational Transformation (OT) complexity by using **Stream Chat's Custom Events**.
    *   When User A types, an event `code.change` is broadcast with the new content.
    *   User B's client listens for this event and updates the editor state *if* the content differs.
    *   **Conflict Resolution**: Simple "Last-Write-Wins" strategy, which is sufficient for 1-on-1 interviews where users typically take turns typing.

### B. Integrated Video Calls
**Implementation**: `StreamVideo` & `StreamCall` components.
*   The video call is detachable and can be dragged around the screen (`Draggable` implementation using native Mouse events in `SessionPage.jsx`).
*   **Optimization**: The video stream runs on a separate thread/layer via WebRTC, ensuring that heavy JS (code execution) doesn't freeze the video feed.

### C. Modes of Operation
1.  **Solo Practice Mode** (`ProblemPage.jsx`):
    *   Users can practice problems alone.
    *   AI Assistant is available freely.
    *   No video call overhead.
2.  **Live Interview Mode** (`SessionPage.jsx`):
    *   Host (Interviewer) vs. Participant (Candidate).
    *   **Consensus AI**: The AI "Hint" button triggers a voting system. Both users must click "Vote" for the AI to analyze the code. This prevents candidates from cheating while allowing legitimate help.

### D. Multi-Language Code Execution
**Path**: `frontend/src/lib/piston.js`
*   Code is sent to the **Piston API**, a secure, isolated Docker-based execution engine.
*   **Supported Languages**: JavaScript, Python, Java, C++, and 70+ others.
*   **Security**: Since execution happens in Piston's sandboxed containers, my server is safe from `rm -rf /` attacks.

### E. Resume & Career Analyzer
**Path**: `frontend/src/pages/ResumeAnalyzerPage.jsx`
**Backend**: `backend/src/controllers/aiController.js`
*   Users upload a Resume (PDF/Text) and a Job Description.
*   **AI Logic**:
    *   The backend constructs a prompt for Groq (Llama 3).
    *   It extracts: *Match Score*, *Missing Keywords*, and *3 Tailored Behavioral Questions*.
    *   The result is returned as structured JSON for the frontend to render.

---

## 4️⃣ Database Schema Design (MongoDB)

### **1. User Schema** (`models/User.js`)
Stores identity and Clerk mapping.
```javascript
{
  clerkId: String,  // Unique ID from Auth Provider
  email: String,
  name: String,
  profileImage: String
}
```

### **2. Session Schema** (`models/Session.js`)
The "Room" where interviews happen.
```javascript
{
  sessionCode: String,      // 6-character room ID
  host: ObjectId(User),     // The Interviewer
  participant: ObjectId(User), // The Candidate
  status: "active" | "completed",
  problem: String,          // Current problem title
  analyzerVotes: [String],  // List of users who voted for AI help
  isAnalyzerEnabled: Boolean // True if consensus reached
}
```

### **3. Version Schema** (`models/Version.js`)
Tracks code history for playback/restore.
```javascript
{
  sessionId: ObjectId,
  code: String,
  language: String,
  createdAt: timestamp
}
```

---

## 5️⃣ API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/chat/token` | Generates a Stream Chat token for the logged-in user. |
| **GET** | `/api/sessions/:code` | Fetches session details by room code. |
| **POST** | `/api/sessions` | Creates a new interview session. |
| **POST** | `/api/ai/analyze` | Sends code + problem description to Groq for analysis. |
| **POST** | `/api/ai/:id/vote` | Toggles a user's vote for enabling AI assistance. |
| **GET** | `/api/versions` | Retrieves code history for a specific problem/session. |

---

## 6️⃣ Challenges & Trade-offs implemented

### 1. State Synchronization (The "Echo" Problem)
*   **Challenge**: When I receive a code update from the remote user, updating my local editor triggers my *own* `onChange` event, sending the update *back* to them, causing an infinite loop.
*   **Solution**: I implemented a "Remote Update Flag". When applying a code change from a socket event, I temporarily silence the local `onChange` broadcaster.

### 2. The "Consensus" System
*   **Challenge**: How to prevent candidates from using AI to cheat?
*   **Solution**: Implemented a "Voting State" in MongoDB. Only when `votes.length === 2` does the backend allow the `/analyze` endpoint to return data. This required tight coupling between the frontend UI and DB state.

### 3. Package Management (Current Work-in-Progress)
*   **Challenge**: Allowing users to create custom "Problem Packages" (e.g., "Frontend Basics", "Google Top 75") and share them.
*   **Difficulty**: Designing a clean Schema that allows versioning of problem sets and public/private visibility settings has been complex.

---

## 7️⃣ Future Roadmap
-   **Operational Transformation (OT)**: Move from "Last-Write-Wins" to proper OT (using Yjs) to support 3+ users editing simultaneously.
-   **Custom Problem Packages**: Finish the "Package Creation" module to allow community-generated content.
-   **Replay System**: Allow interviewers to watch a "video replay" of the candidate's coding session (reconstructed from Version history).
