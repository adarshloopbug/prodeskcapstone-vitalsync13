# 🎬 VitalSync Track B: Video Presentation Script & Teleprompter

> **Target Duration:** ~90 to 120 Seconds (Comfortable, slow speaking pace)  
> **Topic:** Track B — Secure Authentication & JWT Integration (TRD Phases 1, 2, 3)

---

## 🖥️ Scene 1: Introduction (00:00 – 00:18)

### 🔴 What to Show on Screen:
* **Browser Window**: Navigate to `http://localhost:3000/login`
* **Action**: Hover cursor over the top banner *"VitalSync Enterprise Healthcare Platform"* and the *"Sign In to VitalSync"* title.

### 🎙️ Spoken Words (Narration):
> "Hello everyone. Today I'm presenting our Track B implementation for the VitalSync Healthcare Platform, focusing on Secure Authentication and JWT Integration across all three required phases."

---

## 🖥️ Scene 2: Phase 1 — Cryptographic Security with bcryptjs (00:18 – 00:35)

### 🔴 What to Show on Screen:
* **VS Code Window**: Open file `server/src/models/User.js`
* **Action**: Highlight lines 38–46: the `userSchema.pre('save')` hook and `bcrypt.genSalt(10)`.

### 🎙️ Spoken Words (Narration):
> "In Phase 1, we implemented data modeling and cryptographic security. Passwords never touch the database in plaintext. A pre-save hook automatically salts and hashes every password using bcrypt with 10 rounds, and the hash is stripped during JSON conversion."

---

## 🖥️ Scene 3: Phase 2 — Auth Endpoints & Signed JWT (00:35 – 00:52)

### 🔴 What to Show on Screen:
* **VS Code Window**: Open file `server/src/routes/auth.routes.js`
* **Action**: Highlight the `/api/auth/register` and `/api/auth/login` controllers with `jwt.sign()`.

### 🎙️ Spoken Words (Narration):
> "In Phase 2, we engineered the auth endpoints. Our login controller verifies credentials with bcrypt.compare and issues a signed JSON Web Token containing role claims like Doctor, Patient, Staff, and Admin."

---

## 🖥️ Scene 4: Phase 3 — Live Login & JWT Inspector Cockpit (00:52 – 01:15)

### 🔴 What to Show on Screen:
* **Browser Window**: Return to `http://localhost:3000/login`
* **Action**:
  1. Click the **"Doctor"** persona button (`dr.priya.sharma@vitalsync.health`).
  2. Click the teal **"Sign In & Sync JWT Token"** button.
  3. On the dashboard, point cursor to the **JWT Inspector Cockpit** showing the decoded User ID, the DOCTOR role, and the countdown timer.

### 🎙️ Spoken Words (Narration):
> "In Phase 3, we connected the frontend. Logging in stores the JWT in localStorage. Here in our live JWT Inspector, you can see the decoded claims: User ID, the Doctor role, and a live expiry countdown."

---

## 🖥️ Scene 5: Phase 3 — Protected API Pipeline (/api/tasks) (01:15 – 01:32)

### 🔴 What to Show on Screen:
* **Browser Window**: Scroll slightly down to **Protected Data Pipeline (/api/tasks)**
* **Action**:
  1. Click **"+ New Clinical Task"**.
  2. Type a sample title (e.g. *"Review Patient ECG"*).
  3. Click **"Create Protected Task"** and show it added instantly.

### 🎙️ Spoken Words (Narration):
> "Every request to `/api/tasks` is intercepted and sent with a Bearer token. Our Express verifyToken middleware authenticates it before granting access to protected data."

---

## 🖥️ Scene 6: Client Interception in Action (01:32 – 01:48)

### 🔴 What to Show on Screen:
* **Browser Window**: In the JWT Inspector Cockpit
* **Action**: Click the button: **"Test Token Expiry"**  
  *(The screen will immediately redirect back to `http://localhost:3000/login?reason=expired` with an alert banner)*

### 🎙️ Spoken Words (Narration):
> "To demonstrate automated client interception, watch what happens when a token expires: the client immediately purges local credentials and enforces a redirect to the login page."

---

## 🖥️ Scene 7: Automated Tests & Conclusion (01:48 – 02:00)

### 🔴 What to Show on Screen:
* **Terminal Window**: Switch to terminal showing Jest output:
  `PASS tests/auth.test.js (10 passed, 10 total)`

### 🎙️ Spoken Words (Narration):
> "Finally, our automated Jest test suite validates the entire pipeline with all ten tests passing cleanly. This completes our Track B deliverables. Thank you!"

---

## 🚀 Quick Keyboard Shortcut Tips for Smooth Recording:
* **`Alt + Tab`**: Switch cleanly between Browser &rarr; VS Code &rarr; Terminal.
* **Keep windows maximized**: So the layout looks clean and readable.
* **Pacing**: Speak at a calm, relaxed speed—the script has built-in pauses between every action.
