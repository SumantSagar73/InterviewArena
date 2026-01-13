# InterviewArena - Comprehensive Project Documentation

## 1️⃣ Project Overview
**InterviewArena** is a full-stack, real-time collaborative platform designed to revolutionize the technical interview process. Unlike traditional workflows that fragment the experience across multiple tools (Zoom for video, HackerRank for code, Miro for whiteboard), InterviewArena provides a **unified, immersive environment**.

It enables interviewers and candidates to:
-   Collaborate on code with sub-50ms latency.
-   Communicate via high-quality video & audio.
-   Brainstorm system designs on a shared, real-time whiteboard.
-   Leverage AI as a copilot for generating questions and analyzing candidate fit.
-   **Practice solo** with an AI-powered mock interviewer.

---

## 2️⃣ Architecture & Tech Stack

### High-Level Architecture
The application is built on a **Client-Server** model but relies heavily on **Peer-to-Peer (P2P)** and **Edge Network** concepts for real-time features.

-   **Frontend**: React (Vite) + Tailwind CSS + DaisyUI.
-   **Backend**: Node.js + Express.js.
-   **Database**: MongoDB (Mongoose ORM).
-   **Real-Time Layer**: Stream Chat & Video SDKs (Edge Network).
-   **Authentication**: Clerk.
-   **AI Services**: 
    -   **Groq (Llama 3.3 70B)**: Ultra-fast AI for chat, mock interviews, code analysis, and real-time question generation.
    -   **Google Gemini**: For complex resume parsing and contextual question generation.
-   **Code Execution**: Piston API (Isolated Sandbox).

### Why this Stack?
| Component | Choice | Reason |
| :--- | :--- | :--- |
| **Real-Time** | Stream SDK | Built-in edge network handles global latency & scalability better than a custom socket.io server. |
| **Whiteboard** | Canvas API + Stream Events | Lightweight, infinite canvas without heavy third-party dependencies. |
| **AI** | Groq & Gemini | Hybrid approach: Groq for speed (chat/interview), Gemini for depth (resume analysis). |
| **Auth** | Clerk | Handles complex session management, role-based access, and social logins. |

---

## 3️⃣ Key Features & Implementation Details

---

### A. AI Mock Interview (Solo Practice)
**Path**: `frontend/src/pages/AIInterviewPage.jsx`

A complete AI-powered mock interview experience designed for candidates who want to practice technical interviews on their own, anytime.

#### How It Works
1. **Upload Resume**: The candidate uploads their resume (PDF or DOCX). The AI parses the document and silently analyzes skills, experience level, project complexity, and role alignment.
2. **Interview Plan Generation**: Based on the resume, the AI infers:
   - Target role (Frontend, Backend, Full Stack, SDE)
   - Difficulty level (Easy, Medium, Hard)
   - 4-6 relevant interview topics
3. **Structured Interview Flow**: The AI conducts a realistic interview following phases:
   - Brief introduction
   - Resume-based questions (verifying claimed skills)
   - Core technical problems
   - Follow-ups and edge cases
   - Wrap-up question
4. **Voice Input**: Candidates can respond using speech-to-text for a natural conversation experience, simulating a real interview.
5. **Live Coding Round**: When the topic switches to coding, a Monaco editor appears. Candidates can write and execute code in 70+ languages via the Piston API.
6. **Comprehensive Report**: After ending the interview, the AI generates a detailed evaluation report including:
   - Executive summary
   - Topic-by-topic breakdown
   - Technical depth rating (X/10)
   - Problem-solving rating (X/10)
   - Communication rating (X/10)
   - Key strengths and improvement areas
   - Hiring recommendation (Strong Hire / Hire / Lean Hire / No Hire)

#### Technical Details
- Uses **Groq's Llama 3.3 70B** model for fast, intelligent responses
- Custom AI prompts (`AI_INTERVIEWER_PROMPT`, `AI_PREPARATION_PROMPT`, `AI_REPORT_PROMPT`) ensure realistic interviewer behavior
- Interview state managed with React hooks
- Speech recognition via Web Speech API

---

### B. AI Resume Analyzer
**Path**: `frontend/src/pages/ResumeAnalyzerPage.jsx`

A standalone tool for candidates to get AI-powered feedback on their resume before applying to jobs.

#### How It Works
1. **Upload Resume**: Drag-and-drop or select a PDF/DOCX file.
2. **Optional Job Description**: Paste a job description to get targeted match analysis.
3. **AI Analysis**: The system returns:
   - **Match Score** (0-100): How well the resume fits the role
   - **Summary**: 2-3 sentence overview
   - **Matched Skills**: Skills/experience that align with the job
   - **Gaps**: Missing skills or weak areas
   - **Strategic Advice**: Actionable recommendations
   - **Sample Interview Questions**: Questions likely to be asked based on the resume

#### Technical Details
- PDF text extraction using **PDF.js** library
- DOCX parsing using **Mammoth.js**
- AI analysis via Groq with structured JSON output
- Results displayed in a clean, categorized UI with visual indicators

---

### C. AI Interview Assistant (For Human Interviewers)
**Path**: `backend/src/controllers/aiController.js` → `generateQuestionSuggestions`

An AI copilot that assists human interviewers during live sessions by suggesting relevant questions in real-time.

#### How It Works
1. **Background Analysis**: When a candidate joins and uploads their resume, the AI silently analyzes it to understand skills, experience depth, and potential verification needs.
2. **Interviewer Control**: The host (interviewer) can request question suggestions at any point. The AI considers:
   - Candidate's resume
   - Interviewer-selected topics
   - Current interview phase
   - Difficulty level
3. **Non-Intrusive Suggestions**: The AI generates ONE question at a time with metadata:
   ```json
   {
     "suggested_question": "Can you walk me through how you implemented authentication in your e-commerce project?",
     "question_type": "verification",
     "related_topic": "Backend Development",
     "recommended_next_step": "probe_deeper"
   }
   ```
4. **Interviewer Decides**: The human interviewer chooses whether to ask the suggested question, modify it, or ignore it entirely.

#### Question Types Generated
- **Verification**: Confirms ownership of resume claims
- **Conceptual**: Tests theoretical understanding
- **Practical**: Real-world application scenarios
- **Trade-off**: Decision-making and architectural choices
- **Coding Follow-up**: Clarifications for coding problems

#### Technical Details
- Uses `AI_INTERVIEW_ASSISTANT_PROMPT` with strict behavioral constraints
- AI never evaluates candidates during the interview
- Always defers to interviewer's judgment
- Returns structured JSON for easy UI integration

---

### D. Real-Time Collaborative Coding 
**Path**: `frontend/src/components/CodeEditorPanel.jsx`

A synchronized code editor used in the AI Mock Interview for live coding practice.

#### How It Works
1. **Monaco Editor**: The same editor that powers VS Code, providing syntax highlighting, autocomplete, and IntelliSense for 70+ languages.
2. **Real-Time Sync**: Code changes are broadcast via Stream Chat custom events. All participants see updates within ~50ms.
3. **Code Execution**: When the candidate runs code:
   - Code is sent to the **Piston API** (a secure, sandboxed execution engine)
   - Piston spins up an isolated container
   - Code executes with resource limits (time, memory)
   - Output (or errors) are returned and displayed

#### Conflict Resolution
- Uses **"Last-Write-Wins"** strategy with optimistic UI updates
- Local changes apply immediately; remote changes merge on receipt
- Designed for scenarios where one person primarily codes while others observe

#### Supported Languages
JavaScript, Python, Java, C++, Go, Rust, TypeScript, Ruby, PHP, Swift, Kotlin, and 60+ more via Piston runtime.

---

### E. Integrated Video Calls
**Path**: `frontend/src/components/VideoCallUI.jsx`

High-quality video and audio communication built directly into interview sessions.

#### How It Works
1. **Stream Video SDK**: Leverages Stream's global edge network for low-latency video delivery.
2. **Custom PIP Layout**: 
   - Remote participant's video is displayed prominently
   - Self-view is minimized in a corner (Picture-in-Picture style)
3. **Draggable Interface**: The video window can be dragged around the screen so it never blocks important content like the whiteboard or resume panel.
4. **Automatic Quality Adjustment**: Stream SDK handles bandwidth detection and adjusts video quality dynamically.

#### Technical Details
- Uses `StreamVideo` and `StreamCall` components
- Call ID is tied to the session for easy room management
- Supports camera/microphone toggling, mute controls

---

### F. Smart Interview Session (Role-Based)
**Path**: `frontend/src/pages/SessionPage.jsx`

The core interview room where interviewers and candidates collaborate. Sessions are designed for **verbal interviews with visual whiteboard support** — no code editor.

#### How It Works
1. **Session Creation**: Host creates a session (optionally with topics). A unique 6-character room code is generated.
2. **Candidate Joins**: Candidate enters the room code and uploads their resume (mandatory).
3. **Role Detection**: The system automatically identifies who is the host (interviewer) and who is the participant (candidate).
4. **Role-Based UI**: Different tools are shown based on role:

| Feature | Host (Interviewer) | Participant (Candidate) |
| :--- | :--- | :--- |
| **Video Call** | Full controls | Full controls |
| **Whiteboard** | Draw + Clear All | Draw only |
| **Resume Panel** | Can view candidate's resume | Hidden |
| **AI Assistant** | Can request question suggestions | Hidden |

#### Why No Code Editor?
The live session is designed to mimic **real interview conversations**:
- Focus on verbal problem-solving
- Use whiteboard for diagrams and pseudocode
- Coding practice is handled separately in AI Mock Interview

This separation ensures the live session stays lightweight and focused on human interaction.

---

### G. Collaborative Drawing Screen
**Path**: `frontend/src/components/DrawingBoard.jsx`

A real-time collaborative whiteboard for visual discussions during interviews.

#### How It Works
1. **Infinite Canvas**: Pan and zoom across an unlimited drawing area.
2. **Drawing Tools**:
   - **Pen**: Freehand drawing with adjustable colors
   - **Shapes**: Lines, rectangles, circles
   - **Eraser**: Remove individual strokes
   - **Clear All** (Host only): Reset the entire canvas
3. **Real-Time Sync**: 
   - Every stroke is broadcast as a delta event (`wb_element`) via Stream Chat
   - New participants receive full canvas state on join
   - Uses incremental sync to stay under message size limits
4. **Camera Controls**:
   - Pan by dragging with middle mouse or touch
   - Zoom in/out with scroll wheel
   - Coordinate mapping (`worldToScreen` / `screenToWorld`) ensures drawings align correctly at any zoom level

#### Use Cases
- **System Design**: Draw architecture diagrams, microservices, databases, load balancers
- **Algorithm Visualization**: Sketch trees, graphs, arrays, linked lists
- **Concept Explanation**: Illustrate data flow, state machines, ER diagrams
- **Quick Pseudocode**: Write out logic visually before verbal explanation

#### Technical Details
- Built with HTML5 Canvas API
- Custom event system for real-time sync
- Optimized for low-latency collaboration

---

### H. Flexible Session Creation
**Path**: `frontend/src/components/CreateSessionModal.jsx`

A streamlined flow for creating interview sessions without requiring a preset coding problem.

#### How It Works
1. **Open Create Modal**: From the dashboard, host clicks "Create Session"
2. **Add Topics (Optional)**: Host can specify interview topics like:
   - Data Structures & Algorithms
   - System Design
   - React/Frontend
   - Node.js/Backend
   - Behavioral
3. **Upload Resume (Optional for Host)**: If the host has a candidate's resume beforehand, they can upload it
4. **Create Session**: A unique 6-character room code is generated
5. **Share Code**: Host shares the code with the candidate
6. **AI Preparation**: If topics or resume are provided, AI automatically generates relevant interview questions for the host to reference

#### Candidate Join Flow
1. Candidate enters the room code
2. Candidate uploads their resume (required)
3. AI analyzes resume and prepares questions for the host
4. Candidate enters the session and sees video + whiteboard

#### Why Topic-Based?
- **Flexibility**: Not every interview needs a LeetCode-style problem
- **Real-World**: Many interviews are conversational + whiteboard-based
- **Host Control**: Interviewer decides the flow, not the platform


---

## 4️⃣ Removed/Changed Features

| Old Feature | Change |
| :--- | :--- |
| **Code Editor in Live Sessions** | Removed from live interviews. Coding is now exclusive to AI Mock Interview practice. |
| **Problem-Based Sessions** | Now optional. Sessions can be created with just topics or no preset problem. |
| **Fixed Interview Flow** | Replaced with flexible topic-based interviews where host controls the flow. |
| **Code Analyzer in Live Sessions** | Removed. AI analysis is available only in AI Mock Interview. |

---

## 5️⃣ Database Schema Design (MongoDB)

### **1. User Schema** (`models/User.js`)
Stores identity and Clerk mapping.
```javascript
{
  clerkId: String,
  email: String,
  name: String,
  profileImage: String
}
```

### **2. Session Schema** (`models/Session.js`)
The "Room" where interviews happen.
```javascript
{
  sessionCode: String,        // 6-character room ID
  host: ObjectId(User),       // The Interviewer
  participant: ObjectId(User),// The Candidate
  status: String,             // "active" | "completed"
  
  // Collaborative State
  code: String,
  language: String,
  
  // AI & Context
  resume: {                   // Uploaded by candidate
    data: String,             // Base64 encoded (secure storage)
    contentType: String
  },
  aiGeneratedQuestions: [],   // Questions suggested by AI based on resume
  topics: [],                 // Focus areas (e.g., "Algorithms", "System Design")
  hints: [],                  // AI-generated hints during session
  
  // Analyzer Control
  analyzerVotes: [],          // User IDs who voted to enable
  isAnalyzerEnabled: Boolean  // Whether code analyzer is active
}
```

---

## 6️⃣ Setup & Installation

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/your-username/InterviewArena.git
    cd InterviewArena
    ```

2.  **Install Dependencies**:
    ```bash
    npm install             # Installs root dependencies
    npm run build           # Installs frontend & backend dependencies
    ```

3.  **Environment Variables**:
    Create `.env` in `backend/` with:
    ```
    PORT=5000
    MONGODB_URI=...
    CLERK_PUBLISHABLE_KEY=...
    CLERK_SECRET_KEY=...
    STREAM_API_KEY=...
    STREAM_SECRET_KEY=...
    GEMINI_API_KEY=...
    GROQ_API_KEY=...
    ```

4.  **Run Development Servers**:
    ```bash
    # Terminal 1 (Backend)
    cd backend && npm run dev
    
    # Terminal 2 (Frontend)
    cd frontend && npm run dev
    ```

---

## 7️⃣ Available Routes

| Route | Description |
| :--- | :--- |
| `/` | Home/Landing Page |
| `/dashboard` | User dashboard with session management |
| `/ai-interview` | AI Mock Interview (solo practice) |
| `/resume-analyzer` | AI Resume Analyzer tool |
| `/problems` | Browse available coding problems |
| `/problem/:id` | Individual problem view |
| `/session/:id` | Live interview session room |
