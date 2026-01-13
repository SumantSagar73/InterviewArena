# InterviewArena — Low-Level Implementation Guide

This document explains **how each feature was implemented** at a technical level, covering architecture decisions, key functions, state management, and real-time synchronization patterns.

---

## 1. AI Mock Interview (Solo Practice)

**Files**: `frontend/src/pages/AIInterviewPage.jsx`, `backend/src/controllers/aiController.js`, `backend/src/lib/prompts.js`

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   Groq AI       │
│  AIInterviewPage│◀────│  /ai/interview  │◀────│  (LLaMA 3.3)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
   Web Speech API                              AI_INTERVIEWER_PROMPT
   (Voice Input)                               AI_REPORT_PROMPT
```

### Implementation Details

#### 1.1 Resume Parsing (Client-Side PDF.js)
```javascript
import * as pdfjsLib from 'pdfjs-dist';

const handleFileUpload = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => item.str).join(" ") + "\n";
  }
  return fullText;
};
```

#### 1.2 Interview Plan Generation
- **Endpoint**: `POST /ai/interview/plan`
- **Prompt**: `AI_PREPARATION_PROMPT` — analyzes resume, infers role/difficulty, selects 4-6 topics
- **Response**: Structured JSON with topics and difficulty assignments

#### 1.3 Voice Conversation (Web Speech API)
```javascript
// useSpeechToText — captures voice input
const { isListening, transcript, startListening, stopListening } = useSpeechToText(
  (finalText) => setEditableTranscript(prev => prev + " " + finalText)
);

// useTextToSpeech — auto-starts listening when AI finishes speaking
const { speak } = useTextToSpeech(() => {
  resetTranscript();
  startListening(); // Hands-free continuation
});
```

#### 1.4 Topic Switching Logic
```javascript
const handleTopicSwitch = (topicId) => {
  setTopics(prev => prev.map(t => {
    if (t.id === currentTopicId) return { ...t, status: 'completed' };
    if (t.id === topicId) return { ...t, status: 'active' };
    return t;
  }));
  
  // Notify AI
  handleSendMessage(`USER_ACTION: Switched to topic "${targetTopic.name}".`, true);
};
```

#### 1.5 Report Generation
- **Endpoint**: `POST /ai/interview/report`
- **Payload**: Message history, topics, resume text, final code
- **Prompt**: `AI_REPORT_PROMPT` — generates markdown report with ratings and hiring recommendation

---

## 2. Collaborative Drawing Board (Whiteboard)

**Files**: `frontend/src/components/DrawingBoard.jsx`

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Canvas API    │────▶│  Local State    │────▶│  Stream Chat    │
│   (Drawing)     │     │  (Elements[])   │     │  (wb_element)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Implementation Details

#### 2.1 Element Data Structure
```javascript
const ElementType = { Selection, Rectangle, Circle, Line, Pencil, Eraser, Image };

// Element example
{
  id: Date.now(),
  type: ElementType.Pencil,
  points: [{ x, y }, ...],  // Freehand
  x1, y1, x2, y2,           // Shapes
  color: "#000000",
  lineWidth: 2
}
```

#### 2.2 Infinite Canvas (Pan/Zoom)
```javascript
const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });

// Screen → World coordinates
const screenToWorld = (screenX, screenY) => ({
  x: (screenX - rect.left - camera.x) / camera.z,
  y: (screenY - rect.top - camera.y) / camera.z
});

// Apply transform during render
ctx.translate(camera.x, camera.y);
ctx.scale(camera.z, camera.z);
```

#### 2.3 Real-Time Sync (Stream Chat Events)
```javascript
// Broadcast element (with point simplification for 2KB limit)
const broadcastElement = (element, actionType = 'add') => {
  if (isRemoteActionRef.current) return; // Prevent echo
  
  let syncElement = element;
  if (element.points?.length > 60) {
    // Sample points to reduce size
    const step = Math.ceil(element.points.length / 60);
    syncElement = {
      ...element,
      points: element.points.filter((_, i) => i % step === 0)
    };
  }
  
  channel.sendEvent({ type: 'wb_element', action: actionType, element: syncElement });
};

// Receive updates
channel.on((event) => {
  if (event.type === 'wb_element') {
    isRemoteActionRef.current = true;
    setElements(prev => /* merge logic */);
    setTimeout(() => { isRemoteActionRef.current = false; }, 100);
  }
});
```

#### 2.4 Undo/Redo Stack
```javascript
const [history, setHistory] = useState([]);
const [historyStep, setHistoryStep] = useState(-1);

const saveHistory = (newElements) => {
  setHistory([...history.slice(0, historyStep + 1), newElements]);
  setHistoryStep(prev => prev + 1);
};

const undo = () => {
  if (historyStep > 0) setElements(history[historyStep - 1]);
};
```

---

## 3. Live Interview Session

**Files**: `frontend/src/pages/SessionPage.jsx`, `frontend/src/hooks/useStreamClient.js`

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SessionPage    │────▶│  useStreamClient│────▶│   Stream SDK    │
│  (React)        │     │  (Custom Hook)  │     │  (Video+Chat)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
   Role Detection                              WebRTC / Edge Network
```

### Implementation Details

#### 3.1 Stream Client Initialization
```javascript
const useStreamClient = (session, isHost, isParticipant) => {
  useEffect(() => {
    if (!session || (!isHost && !isParticipant)) return;
    
    // Video client
    const client = new StreamVideoClient({ apiKey, user, token });
    const videoCall = client.call('default', session.callId);
    await videoCall.join({ create: isHost });
    
    // Chat channel (for whiteboard sync)
    const chatChannel = chatClient.channel('messaging', session.callId);
    await chatChannel.watch();
    
    return { streamClient: client, call: videoCall, channel: chatChannel };
  }, [session]);
};
```

#### 3.2 Role-Based UI
```javascript
const isHost = session?.host?.clerkId === user?.id;

{isHost && <ResumePreviewPanel />}   // Host only
{isHost && <InterviewQuestionsPanel />}  // Host only
<DrawingBoard channel={channel} isHost={isHost} />  // Both
<VideoCallUI />  // Both
```

#### 3.3 Draggable Video PIP
```javascript
const [videoPos, setVideoPos] = useState({ x: 30, y: 100 });
const [isDragging, setIsDragging] = useState(false);

const handleMouseDown = (e) => {
  if (e.target.closest(".drag-handle")) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - videoPos.x, y: e.clientY - videoPos.y });
  }
};

// Mouse move updates position
```

---

## 4. AI Interview Assistant

**Files**: `backend/src/controllers/aiController.js`

### Endpoint: `POST /ai/interview/suggestions`

```javascript
export async function generateQuestionSuggestions(req, res) {
  const { resumeText, config, currentPhase } = req.body;

  const prompt = `
    ${AI_INTERVIEW_ASSISTANT_PROMPT}
    RESUME: ${resumeText}
    CONFIG: Role=${config?.role}, Difficulty=${config?.difficulty}
    PHASE: ${currentPhase}
    Generate ONE question in JSON.
  `;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  res.json(JSON.parse(response.choices[0].message.content));
}
```

### Response Format
```json
{
  "suggested_question": "How did you handle state management in your React project?",
  "question_type": "verification",
  "related_topic": "React",
  "recommended_next_step": "probe_deeper"
}
```

---

## 5. AI Resume Analyzer

**Endpoint**: `POST /ai/resume/analyze`

```javascript
export async function analyzeResume(req, res) {
  const { resumeText, jobDescription } = req.body;

  const response = await groq.chat.completions.create({
    messages: [{
      role: "user",
      content: `Analyze resume. Return JSON: { score, summary, matches[], gaps[], advice[], questions[] }
        RESUME: ${resumeText}
        ${jobDescription ? `JOB: ${jobDescription}` : ''}`
    }],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  res.json({ analysis: JSON.parse(response.choices[0].message.content) });
}
```

---

## 6. Code Execution (Piston API)

**File**: `frontend/src/lib/piston.js`

```javascript
export async function executeCode(language, code) {
  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    body: JSON.stringify({
      language,
      version: '*',
      files: [{ content: code }]
    })
  });
  
  const data = await response.json();
  return {
    success: !data.run.stderr,
    output: data.run.stdout || data.run.stderr
  };
}
```

**Flow**: Code → Piston API → Isolated Docker container → Output returned

---

## 7. Key Sync Patterns

| Pattern | Implementation |
|---------|----------------|
| **Echo Prevention** | `isRemoteActionRef` flag prevents re-broadcasting received events |
| **Point Compression** | Pencil strokes sampled to <60 points for 2KB Stream limit |
| **Optimistic Updates** | Apply locally first, sync after `mouseUp` |
| **Last-Write-Wins** | No complex conflict resolution (acceptable for whiteboard) |
| **Unique IDs** | `Date.now()` ensures unique element IDs per client |

---

## 8. Authentication (Clerk)

- **Frontend**: `useUser()` → `user.id` (Clerk ID)
- **Backend**: Webhook syncs Clerk users to MongoDB `User` collection
- **Role Detection**: `session.host.clerkId === user.id` → isHost
- **Stream Tokens**: Backend generates tokens using Clerk ID for video/chat
