# VitalSync REST API Specification & Real-Time Event Catalog

**Base URL:** `https://api.vitalsync.health/api/v1` (Production) / `http://localhost:5000/api/v1` (Development)  
**Protocol:** HTTPS / TLS 1.3  
**Content-Type:** `application/json`  
**Authentication:** Bearer JWT in `Authorization` header (`Authorization: Bearer <accessToken>`)  
**Data Compliance Notice:** All endpoints accept and return **strictly synthetic clinical data**.

---

## 1. Authentication & Identity (`/auth`)

### 1.1 Register User
- **Method & Path:** `POST /auth/register`
- **Role Required:** Public (Open)
- **Description:** Registers a new patient or staff user. Doctors and Admins are provisioned by Admin.
- **Request Body:**
  ```json
  {
    "email": "rajesh.patel@example.com",
    "password": "StrongPassword!2026",
    "role": "PATIENT",
    "firstName": "Rajesh",
    "lastName": "Patel",
    "phone": "+91-98765-43210",
    "dateOfBirth": "1984-07-14",
    "gender": "MALE"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "user": {
      "id": "USR-8821",
      "email": "rajesh.patel@example.com",
      "role": "PATIENT",
      "firstName": "Rajesh",
      "lastName": "Patel"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "7f8b9c0d1e2f3a4b...",
      "expiresIn": 900
    }
  }
  ```
- **Error Codes:** `400 Bad Request` (Zod validation failure), `409 Conflict` (Email already registered).

### 1.2 Login with Password
- **Method & Path:** `POST /auth/login`
- **Role Required:** Public
- **Request Body:**
  ```json
  {
    "email": "dr.priya.sharma@vitalsync.health",
    "password": "SecurePassword!2026"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "USR-1002",
      "email": "dr.priya.sharma@vitalsync.health",
      "role": "DOCTOR",
      "firstName": "Priya",
      "lastName": "Sharma",
      "profileId": "DOC-501"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "3a4b5c6d...",
      "expiresIn": 900
    }
  }
  ```
- **Error Codes:** `401 Unauthorized` (Invalid credentials), `429 Too Many Requests` (Rate limit exceeded).

### 1.3 Refresh Access Token
- **Method & Path:** `POST /auth/refresh`
- **Role Required:** Public (valid refresh token in body or HttpOnly cookie)
- **Request Body:**
  ```json
  {
    "refreshToken": "3a4b5c6d..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "9e8d7c6b...",
      "expiresIn": 900
    }
  }
  ```
- **Error Codes:** `401 Unauthorized` (Revoked token / token reuse detected, invalidates family).

### 1.4 Logout
- **Method & Path:** `POST /auth/logout`
- **Role Required:** Authenticated
- **Request Body:** `{ "refreshToken": "9e8d7c6b..." }`
- **Response (200 OK):** `{ "success": true, "message": "Session invalidated" }`

---

## 2. Doctors & Schedules (`/doctors`, `/schedules`)

### 2.1 List Doctors with Specialties
- **Method & Path:** `GET /doctors`
- **Role Required:** Public / Authenticated
- **Query Params:** `specialty=Cardiology`, `departmentId=DEP-01`, `status=AVAILABLE`, `limit=20`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "DOC-501",
        "name": "Dr. Priya Sharma",
        "specialty": "Internal Medicine",
        "qualification": "MD (Internal Med), FACP",
        "department": { "id": "DEP-02", "name": "General Medicine" },
        "consultationFee": 800,
        "currentStatus": "AVAILABLE",
        "nextAvailableSlot": "2026-10-25T10:30:00Z"
      }
    ]
  }
  ```

### 2.2 Update Doctor Live Availability Status
- **Method & Path:** `PATCH /doctors/:id/status`
- **Role Required:** `DOCTOR` (Self) or `STAFF`
- **Request Body:**
  ```json
  {
    "currentStatus": "IN_CONSULTATION"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "doctorId": "DOC-501",
    "currentStatus": "IN_CONSULTATION",
    "updatedAt": "2026-10-25T09:15:00Z"
  }
  ```
- **Side Effect:** Emits `doctor:status` via Socket.IO to `availability:board`.

---

## 3. Availability & Slot Reservation (`/availability`)

### 3.1 Get Slots for Doctor & Date
- **Method & Path:** `GET /availability/slots`
- **Role Required:** Authenticated
- **Query Params:** `doctorId=DOC-501`, `date=2026-10-25`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "slots": [
      {
        "id": "SLOT-1030",
        "doctorId": "DOC-501",
        "startTime": "2026-10-25T10:30:00Z",
        "endTime": "2026-10-25T11:00:00Z",
        "status": "AVAILABLE"
      },
      {
        "id": "SLOT-1100",
        "doctorId": "DOC-501",
        "startTime": "2026-10-25T11:00:00Z",
        "endTime": "2026-10-25T11:30:00Z",
        "status": "HELD"
      }
    ]
  }
  ```

### 3.2 Hold Slot (Atomic Lock)
- **Method & Path:** `POST /availability/slots/:id/hold`
- **Role Required:** `PATIENT`, `STAFF`
- **Description:** Atomically locks a slot for 10 minutes to prevent double-booking.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "slotId": "SLOT-1030",
    "status": "HELD",
    "heldUntil": "2026-10-25T10:40:00Z",
    "holdDurationSeconds": 600
  }
  ```
- **Error Codes:** `409 Conflict` (Slot currently held or booked by another session).

### 3.3 Release Held Slot
- **Method & Path:** `POST /availability/slots/:id/release`
- **Role Required:** User holding the slot, or `STAFF`
- **Response (200 OK):** `{ "success": true, "status": "AVAILABLE" }`

---

## 4. Appointments (`/appointments`)

### 4.1 Create Appointment (Confirm Hold)
- **Method & Path:** `POST /appointments`
- **Role Required:** `PATIENT`, `STAFF`
- **Request Body:**
  ```json
  {
    "slotId": "SLOT-1030",
    "patientId": "PAT-101",
    "type": "IN_PERSON",
    "chiefComplaint": "Follow-up for persistent fatigue and blood sugar management"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "appointment": {
      "id": "APT-20261025-0042",
      "appointmentNumber": "APT-20261025-0042",
      "patientId": "PAT-101",
      "doctorId": "DOC-501",
      "scheduledAt": "2026-10-25T10:30:00Z",
      "status": "CONFIRMED",
      "noShowRiskScore": 0.12
    }
  }
  ```
- **Error Codes:** `400 Bad Request`, `409 Conflict` (Hold expired or slot modified).

### 4.2 Update Appointment Status (Check-in, Complete, Cancel)
- **Method & Path:** `PATCH /appointments/:id/status`
- **Role Required:** Role-guarded (Staff can check in; Doctor can start/complete; Patient/Doctor/Staff can cancel).
- **Request Body:**
  ```json
  {
    "status": "CHECKED_IN",
    "reason": "Patient arrived at front desk"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "appointmentId": "APT-20261025-0042",
    "status": "CHECKED_IN",
    "checkInTime": "2026-10-25T10:18:22Z"
  }
  ```

---

## 5. Patients & Medical Timeline (`/patients`, `/timeline`)

### 5.1 Get Patient 360 Profile
- **Method & Path:** `GET /patients/:id`
- **Role Required:** `DOCTOR` (assigned), `PATIENT` (self), `STAFF` (demographics only)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "patient": {
      "id": "PAT-101",
      "mrn": "VSYN-2026-00892",
      "name": "Rajesh Patel",
      "dateOfBirth": "1984-07-14",
      "age": 42,
      "gender": "MALE",
      "bloodGroup": "B+",
      "allergies": [
        { "allergen": "Penicillin", "severity": "SEVERE", "reaction": "Anaphylaxis" }
      ],
      "activeDiagnoses": [
        { "icd10": "E11.9", "description": "Type 2 Diabetes Mellitus" },
        { "icd10": "I10", "description": "Essential Hypertension" }
      ]
    }
  }
  ```

### 5.2 Get Medical History Timeline
- **Method & Path:** `GET /patients/:id/timeline`
- **Role Required:** `DOCTOR`, `PATIENT` (self)
- **Query Params:** `category=all|encounters|labs|vitals|prescriptions`, `startDate=2026-01-01`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "timeline": [
      {
        "id": "TL-001",
        "date": "2026-10-25T10:30:00Z",
        "category": "ENCOUNTER",
        "title": "General Medicine Follow-up",
        "doctorName": "Dr. Priya Sharma",
        "summary": "SOAP encounter finalized. Blood sugar control reviewed."
      },
      {
        "id": "TL-002",
        "date": "2026-06-15T08:00:00Z",
        "category": "LAB_RESULT",
        "title": "Comprehensive Metabolic Panel & HbA1c",
        "summary": "HbA1c: 7.2% (High), Fasting Glucose: 142 mg/dL."
      }
    ]
  }
  ```

---

## 6. Clinical Encounters & SOAP Notes (`/encounters`)

### 6.1 Create or Update Encounter
- **Method & Path:** `POST /encounters`
- **Role Required:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "appointmentId": "APT-20261025-0042",
    "subjective": "Patient reports mild dizziness in the morning. Adheres to Metformin 500mg BID.",
    "objective": "BP: 138/88 mmHg, HR: 76 bpm. Heart sounds normal. No pedal edema.",
    "assessment": "Type 2 Diabetes Mellitus with sub-optimal glycemic control. Essential Hypertension.",
    "plan": "Increase Metformin to 850mg BID. Order repeat HbA1c in 3 months. Lifestyle counseling."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "encounter": {
      "id": "ENC-20261025-018",
      "status": "DRAFT",
      "encounterNumber": "ENC-20261025-018"
    }
  }
  ```

### 6.2 Sign & Finalize Encounter
- **Method & Path:** `POST /encounters/:id/sign`
- **Role Required:** `DOCTOR` (attending)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "status": "FINALIZED",
    "signedAt": "2026-10-25T10:55:00Z"
  }
  ```

---

## 7. Vitals Recording & Trends (`/vitals`)

### 7.1 Record Vitals
- **Method & Path:** `POST /vitals`
- **Role Required:** `STAFF` (Nurse), `DOCTOR`
- **Request Body:**
  ```json
  {
    "patientId": "PAT-101",
    "encounterId": "ENC-20261025-018",
    "bloodPressureSystolic": 138,
    "bloodPressureDiastolic": 88,
    "heartRateBpm": 76,
    "temperatureCelsius": 37.1,
    "oxygenSaturationSpO2": 98.5,
    "respiratoryRate": 16,
    "weightKg": 78.4,
    "heightCm": 175.0
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "vitalsId": "VIT-9081",
    "bmi": 25.6,
    "bmiCategory": "Overweight"
  }
  ```

### 7.2 Get Longitudinal Vitals Trend
- **Method & Path:** `GET /vitals/trends?patientId=PAT-101&metric=bloodPressure&range=6m`
- **Role Required:** `DOCTOR`, `PATIENT` (self)

---

## 8. Prescriptions & Drug Interaction Checking (`/prescriptions`)

### 8.1 Validate Medication Interaction & Allergy Warning
- **Method & Path:** `POST /prescriptions/validate-safety`
- **Role Required:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "patientId": "PAT-101",
    "proposedMedications": [
      { "medicationId": "MED-MET-500", "genericName": "Metformin", "dosage": "850mg" },
      { "medicationId": "MED-LIS-10", "genericName": "Lisinopril", "dosage": "10mg" }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "safe": true,
    "warnings": [
      {
        "type": "DRUG_DISEASE_CAUTION",
        "severity": "MILD",
        "description": "Monitor renal function (eGFR) periodically with dual therapy."
      }
    ],
    "allergyConflicts": []
  }
  ```

### 8.2 Create Prescription
- **Method & Path:** `POST /prescriptions`
- **Role Required:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "patientId": "PAT-101",
    "encounterId": "ENC-20261025-018",
    "items": [
      {
        "medicationId": "MED-MET-850",
        "drugName": "Metformin HCl 850mg",
        "dosage": "1 tablet",
        "frequency": "BID (Twice daily with meals)",
        "durationDays": 90,
        "refillsAllowed": 2
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "prescription": {
      "id": "RX-20261025-0091",
      "status": "ACTIVE",
      "issuedAt": "2026-10-25T10:55:00Z"
    }
  }
  ```

---

## 9. AI Assistive Endpoints (`/ai`)

### 9.1 AI Pre-Visit Intake Assistant
- **Method & Path:** `POST /ai/intake/chat`
- **Role Required:** `PATIENT`
- **Request Body:**
  ```json
  {
    "appointmentId": "APT-20261025-0042",
    "userMessage": "I have been having frequent headaches and thirst for 3 weeks."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "assistantResponse": "I understand. Have you noticed any changes in your vision or chest pain? Please note: if you experience severe sudden pain, seek emergency care immediately.",
    "redFlagDetected": false,
    "preVisitSummaryDraft": {
      "chiefSymptoms": ["Polydipsia", "Persistent Cephalea"],
      "duration": "3 weeks",
      "urgencyLevel": "ROUTINE"
    },
    "disclaimer": "VitalSync AI provides intake assistance, not a medical diagnosis."
  }
  ```

### 9.2 AI SOAP Encounter Note Drafting
- **Method & Path:** `POST /ai/encounters/draft-soap`
- **Role Required:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "encounterId": "ENC-20261025-018",
    "patientId": "PAT-101",
    "rawNotes": "Patient with known T2D and HTN. Thirst elevated. BP today 138/88. Metformin increased to 850 BID."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "structuredSoap": {
      "subjective": "42-year-old male with established Type 2 Diabetes and Hypertension presents for follow-up. Reports elevated polydipsia over the past 3 weeks. Adherent to current medication regimen.",
      "objective": "Vitals: BP 138/88 mmHg, HR 76 bpm. Alert, oriented, in no acute distress.",
      "assessment": "1. Type 2 Diabetes Mellitus - sub-optimal glycemic control.\n2. Essential Hypertension - moderately elevated.",
      "plan": "1. Metformin increased to 850mg PO BID.\n2. Follow-up HbA1c order in 90 days.\n3. Return to clinic in 3 months or sooner if symptoms worsen."
    },
    "disclaimer": "AI-generated draft. Mandatory clinician review and signature required."
  }
  ```

### 9.3 Plain-Language Prescription Explainer
- **Method & Path:** `POST /ai/prescriptions/:id/explain`
- **Role Required:** `PATIENT`, `DOCTOR`
- **Query Params:** `language=en|hi`, `readingLevel=grade6|grade8`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "explanation": {
      "language": "en",
      "readingLevel": "Grade 6",
      "medications": [
        {
          "name": "Metformin 850mg",
          "purpose": "Helps lower your blood sugar by improving how your body handles insulin.",
          "howToTake": "Take 1 pill twice every day with your breakfast and dinner to avoid an upset stomach.",
          "precautions": "Drink plenty of water and avoid excessive alcohol."
        }
      ]
    },
    "disclaimer": "Assistive explanation. Follow all instructions given by your doctor and pharmacist."
  }
  ```

### 9.4 Semantic RAG "Ask VitalSync"
- **Method & Path:** `POST /ai/rag/query`
- **Role Required:** `PATIENT` (own records), `DOCTOR` (assigned patient)
- **Request Body:**
  ```json
  {
    "targetPatientId": "PAT-101",
    "query": "What was my HbA1c in the last test and when was it done?"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "answer": "Your last HbA1c test was recorded on June 15, 2026, with a result of 7.2%, which is above the standard reference range of 4.0 - 5.6%.",
    "citations": [
      {
        "sourceId": "LAB-20260615-001",
        "sourceType": "LabResult",
        "title": "Comprehensive Metabolic Panel & HbA1c",
        "date": "2026-06-15"
      }
    ],
    "disclaimer": "VitalSync AI provides informational retrieval only. Consult your doctor for medical advice."
  }
  ```

---

## 10. Admin, Audit & Analytics (`/admin`, `/analytics`)

### 10.1 Query Audit Logs (WORM Stream)
- **Method & Path:** `GET /admin/audit-logs`
- **Role Required:** `ADMIN`
- **Query Params:** `actorId=USR-1002`, `resourceType=Patient`, `startDate=2026-10-01`, `page=1`, `limit=50`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "totalCount": 1280,
    "page": 1,
    "logs": [
      {
        "id": "AUD-99120",
        "timestamp": "2026-10-25T10:55:00Z",
        "actor": { "id": "USR-1002", "role": "DOCTOR", "name": "Dr. Priya Sharma" },
        "action": "SOAP_SIGNED_WITH_AI",
        "resourceType": "Encounter",
        "resourceId": "ENC-20261025-018",
        "ipAddress": "192.168.1.45",
        "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    ]
  }
  ```

### 10.2 Hospital Analytics KPIs
- **Method & Path:** `GET /analytics/dashboard`
- **Role Required:** `ADMIN`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "metrics": {
      "patientLoadToday": 142,
      "averageWaitTimeMinutes": 14.2,
      "noShowRatePercent": 6.8,
      "departmentCapacityUtilization": {
        "Cardiology": 88.5,
        "GeneralMedicine": 92.0,
        "Pediatrics": 64.0
      }
    }
  }
  ```

---

## 11. Real-Time Socket.IO Event Catalog

The VitalSync real-time layer operates over secure WebSocket connections (`wss://api.vitalsync.health/socket.io`).

### 11.1 Rooms & Access Control
| Room Name | Target Audience | Authorization Gate |
| :--- | :--- | :--- |
| `availability:board` | Staff & active scheduling clients | Public slot status broadcast |
| `doctor:{doctorId}` | Attending doctor & clinic nurse | Verified session of assigned clinician |
| `patient:{patientId}` | Individual patient | Verified session matching `req.user.patientId` |
| `clinic:queue` | Front desk triage & waiting room monitors | Role `STAFF` or `ADMIN` |

### 11.2 Event Catalog

#### `slot:held`
- **Trigger:** A patient or staff member initiates a 10-minute hold on a slot.
- **Rooms:** `availability:board`, `doctor:{doctorId}`
- **Payload:**
  ```json
  {
    "slotId": "SLOT-1030",
    "doctorId": "DOC-501",
    "startTime": "2026-10-25T10:30:00Z",
    "heldUntil": "2026-10-25T10:40:00Z",
    "status": "HELD"
  }
  ```

#### `slot:released`
- **Trigger:** Slot hold expired or cancelled by patient.
- **Rooms:** `availability:board`, `doctor:{doctorId}`
- **Payload:** `{ "slotId": "SLOT-1030", "doctorId": "DOC-501", "status": "AVAILABLE" }`

#### `appointment:updated`
- **Trigger:** Appointment status transition (e.g. `CONFIRMED` -> `CHECKED_IN`).
- **Rooms:** `doctor:{doctorId}`, `patient:{patientId}`, `clinic:queue`
- **Payload:**
  ```json
  {
    "appointmentId": "APT-20261025-0042",
    "newStatus": "CHECKED_IN",
    "checkInTime": "2026-10-25T10:18:22Z"
  }
  ```

#### `doctor:status`
- **Trigger:** Doctor updates status toggle (Available, In Consultation, On Break, Off Duty).
- **Rooms:** `availability:board`, `clinic:queue`
- **Payload:**
  ```json
  {
    "doctorId": "DOC-501",
    "doctorName": "Dr. Priya Sharma",
    "currentStatus": "IN_CONSULTATION",
    "timestamp": "2026-10-25T09:15:00Z"
  }
  ```

#### `queue:updated`
- **Trigger:** Patient check-in, doctor starts consult, or patient leaves.
- **Rooms:** `clinic:queue`
- **Payload:**
  ```json
  {
    "waitingCount": 4,
    "inConsultationCount": 6,
    "averageWaitTimeMinutes": 12
  }
  ```

#### `prescription:status`
- **Trigger:** Prescription transition (`ACTIVE` -> `DISPENSED`, or refill requested).
- **Rooms:** `patient:{patientId}`, `doctor:{doctorId}`
- **Payload:**
  ```json
  {
    "prescriptionId": "RX-20261025-0091",
    "status": "DISPENSED",
    "dispensedAt": "2026-10-25T11:30:00Z"
  }
  ```

#### `notification:new`
- **Trigger:** Asynchronous background alert (appointment reminder, lab ready).
- **Rooms:** `patient:{patientId}` or `doctor:{doctorId}`
- **Payload:**
  ```json
  {
    "id": "NOTIF-7721",
    "type": "APPOINTMENT_REMINDER",
    "title": "Upcoming Consultation Tomorrow",
    "message": "Reminder: Consultation with Dr. Priya Sharma at 10:30 AM.",
    "createdAt": "2026-10-24T10:30:00Z"
  }
  ```
