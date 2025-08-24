# AI Interviewer

AI Interviewer is a full-stack MERN application designed to provide a realistic, conversational mock interview experience. It features an advanced conversational engine that asks dynamic, context-aware questions, includes live coding challenges, and provides detailed performance feedback to help users prepare for technical interviews.

---

## 🚀 Features

- **Realistic Mock Interviews:** Engages users in a natural, turn-by-turn dialogue, asking relevant follow-up questions based on their answers.  
- **Integrated Coding Challenges:** Seamlessly transitions from conversational questions to a live coding exercise within the interview flow.  
- **Customizable Sessions:** Users can choose from different interviewer personas (e.g., Friendly HR, Direct Tech Lead) and difficulty levels (Junior, Mid, Senior).  
- **On-Demand Hints:** Provides helpful hints for tough questions, guiding users without giving away the answer.  
- **Voice & Text Interaction:** Supports both speech-to-text and text-to-speech for flexible and accessible user experience.  
- **Detailed Performance Feedback:** After each session, users receive a comprehensive breakdown of their performance, including an overall score and analysis.  
- **Dedicated Coding Practice:** A separate practice arena allows users to hone problem-solving skills with coding challenges filterable by difficulty, supporting multiple languages (JavaScript, Python, C++, Java).  
- **Session Management:** In-progress interviews are saved automatically, allowing users to pause and resume at their convenience.  
- **Performance Analytics:** A personal dashboard tracks interview history and displays an average score to help users monitor improvement over time.  
- **Secure User Accounts:** All user data, including interview history and in-progress sessions, is securely stored with JWT-based authentication.  

---

## 🛠️ Technical Architecture

- **Frontend:** React + TypeScript with Tailwind CSS for styling.  
- **Backend:** Node.js + Express providing RESTful APIs.  
- **Database:** MongoDB with Mongoose ODM.  
- **Authentication:** JWT-based secure authentication.  
- **Conversational Engine:** Backend integrates with a large language model for generating questions, hints, and feedback (proxied through backend for security).  
- **Web APIs:** Uses Web Speech API (voice recognition) & Speech Synthesis API (interviewer voice).  

---

## ⚙️ Local Development Setup

You need to set up **backend** and **frontend**.

### ✅ Prerequisites

- Node.js and npm installed  
- MongoDB connection string (free cluster via [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))  
- API Key from a generative AI service (e.g., Google AI Studio)  
- A modern browser that supports Web Speech API (e.g., Chrome, Edge)  

---

### 🔧 Backend Setup

1. Navigate to server folder:
   ```bash
   cd server
````

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in `/server` with:

   ```env
   # MongoDB connection string
   MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/my-db?retryWrites=true&w=majority

   # Secret for JWT authentication
   JWT_SECRET=your_super_secret_jwt_key

   # AI service API key
   API_KEY=your_ai_service_api_key
   ```

4. Start the server:

   ```bash
   npm start
   ```

   Server runs at: `http://localhost:5000`

---

### 🎨 Frontend Setup

1. Go to project root directory

2. Serve frontend using `serve`:

   ```bash
   npx serve
   ```

3. Open the provided URL (usually `http://localhost:3000`) in your browser.

---

## 🐞 Troubleshooting

* **Server auth error:** Check `.env` in `/server` and restart server after changes.
* **Not authorized errors:** Log out and log in again (JWT might have expired).
* **Voice not working:** Use Chrome/Edge and allow microphone permissions.

---

## 📌 Notes

* In-progress interviews auto-save → resume anytime.
* Works with both voice and text input.
* Tracks performance history for better preparation.

---

