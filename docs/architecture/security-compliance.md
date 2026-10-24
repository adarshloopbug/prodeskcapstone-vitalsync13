# VitalSync Security, Privacy & Compliance Architecture

VitalSync is architected in strict alignment with **HIPAA Security & Privacy Rules** (Health Insurance Portability and Accountability Act), **GDPR** health data provisions, and international digital healthcare standards. 

> **MANDATORY PROJECT NOTICE:**  
> All records, patient identities, clinical values, and diagnostic documents utilized in VitalSync are **strictly synthetic**. No real Protected Health Information (PHI) is ever ingested, processed, or stored.

---

## 1. Threat Model Summary (STRIDE Framework)

VitalSync applies the Microsoft STRIDE methodology across all four primary architectural tiers:

| Threat Category | Potential Attack Vector | VitalSync Defense & Architectural Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Adversary impersonates a doctor or patient to access medical charts. | Strong bcrypt password hashing (work factor 12), multi-factor authentication (TOTP), asymmetric JWT signing, automated refresh token rotation with family revocation detection. |
| **Tampering** | Malicious alteration of prescription dosage or past encounter notes. | Cryptographic field-level hashing, immutable WORM audit log chain (HMAC-SHA-256), optimistic concurrency locking on availability slots, and finalized encounter sealing. |
| **Repudiation** | Clinician denies signing a contraindicated prescription; patient denies cancelling slot. | Immutable append-only audit trail logging `actorUserId`, `ipAddress`, `userAgent`, timestamp, and before/after diff for every state change. Digital clinician sign-off on encounters. |
| **Information Disclosure** | PHI leakage via SQL/NoSQL injection, insecure direct object references (IDOR), or LLM prompts. | Strict Zod input sanitization, Mongoose schema binding, Client-Side Field-Level Encryption (CSFLE) for Tier 1 PHI, and local regex-based de-identification before external AI dispatch. |
| **Denial of Service** | Botnet floods the slot reservation endpoint to paralyze outpatient scheduling. | Tiered IP-based rate limiting (Express Rate Limit), Cloudflare WAF, Redis-backed atomic slot locking with 10-minute auto-expiry TTL, and asynchronous queue offloading via BullMQ. |
| **Elevation of Privilege**| Front desk staff attempts to view detailed psychiatric or oncology SOAP notes. | Multi-tier middleware: Role-Based Access Control (RBAC) combined with Attribute-Based Access Control (ABAC) queries that strip clinical narrative fields from staff projections. |

---

## 2. PHI Data Classification Matrix

VitalSync classifies hospital data into three distinct security tiers:

| Data Tier | Category Description | Examples in VitalSync | Protection Controls Required |
| :--- | :--- | :--- | :--- |
| **Tier 1: Direct Identifiers (High Risk)** | Attributes that directly identify an individual patient. | Patient Full Name, Phone, National ID (Aadhaar / SSN), Address, Insurance Policy Number, Emergency Contacts. | **Client-Side Field-Level Encryption (CSFLE)** at rest, TLS 1.3 in transit, strict RBAC, completely masked prior to any AI call. |
| **Tier 2: Protected Health Information (PHI)** | Clinical observations, diagnoses, notes, and laboratory readings. | SOAP Notes (Subjective, Objective, Assessment, Plan), Lab Results (HbA1c, CMP), Vitals Trends, Prescriptions, Allergies. | Encrypted at rest (AES-256), access logged in AuditLogs, restricted to active doctor care relationship, de-identified prior to AI inference. |
| **Tier 3: Operational & System Metadata** | Operational hospital structure and de-identified scheduling slots. | Department codes, Doctor weekly shift templates, Availability slot start/end times, System health metrics. | Standard TLS in transit, database indexing, standard role guards. |

---

## 3. Cryptographic & Encryption Architecture

```
[ Next.js Client ]
       │  TLS 1.3 (ChaCha20-Poly1305 / AES-256-GCM)
       ▼
[ Express API Gateway ]
       │  CSFLE Engine (Client-Side Field-Level Encryption)
       ├─────────────────────────────────────────────┐
       │ Decrypted for Authorized Business Logic     │ Sensitive Fields Encrypted with DEK
       ▼                                             ▼
[ Operational Memory / Zod ]              [ MongoDB Atlas (WiredTiger) ]
                                          - Storage Engine: AES-256 Encrypted
                                          - Data-at-Rest Key Rotation
                                          - CSFLE Encrypted BSON Documents
```

### 3.1 Encryption in Transit
- Mandatory HTTPS enforced via HTTP Strict Transport Security (`HSTS: max-age=63072000; includeSubDomains; preload`).
- TLS 1.3 termination at Cloudflare edge with modern cipher suites: `TLS_AES_256_GCM_SHA384` and `TLS_CHACHA20_POLY1305_SHA256`.
- WebSockets secured via `WSS://` protocol with JWT session handshake validation.

### 3.2 Encryption at Rest & Field-Level Encryption (CSFLE)
- **Database Storage Volume:** Encrypted using AES-256 storage volume encryption on MongoDB Atlas.
- **Client-Side Field-Level Encryption (CSFLE):** High-risk Tier 1 fields (`phone`, `addressLine1`, `emergencyContactPhone`, `subjective`, `assessment`) are encrypted by the Node.js backend *before* transmission over the database wire. Even a database administrator with raw disk access sees only ciphertext.
- **Key Management:** Data Encryption Keys (DEKs) managed via AWS KMS / HashiCorp Vault. Master Key never stored in application code.

---

## 4. Immutable Audit Logging (WORM Policy)

VitalSync implements a **Write-Once-Read-Many (WORM)** audit policy stored in the `AuditLogs` collection.

### 4.1 Log Schema & Cryptographic Chaining
Every mutating event or sensitive PHI read triggers an audit record:
```json
{
  "_id": "AUD-20261025-000892",
  "timestamp": "2026-10-25T10:55:00.142Z",
  "actor": {
    "userId": "USR-1002",
    "role": "DOCTOR",
    "name": "Dr. Priya Sharma",
    "ipAddress": "192.168.1.45"
  },
  "action": "SOAP_SIGNED_WITH_AI",
  "resourceType": "Encounter",
  "resourceId": "ENC-20261025-018",
  "patientId": "PAT-101",
  "justification": null,
  "previousHash": "a82f3b901...",
  "hash": "7c9e12f04b..."
}
```
*Each log entry calculates `hash = HMAC-SHA-256(previousHash + timestamp + actor + action + resourceId)`. If an adversary alters any historical log record, the cryptographic chain is broken immediately, triggering an automated integrity alert.*

---

## 5. AI Safety, Privacy & Ethical Guardrails

```
[ Clinical Query / Raw Note ]
             │
             ▼
┌──────────────────────────────┐
│  1. PII Redaction Gateway    │ ───► Strips Direct Identifiers (Name, Phone, ID)
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  2. Sandboxed Prompt Builder │ ───► Injects Schema, Low Temperature (0.2), Guardrails
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  3. Google Gemini 1.5 API    │ ───► Generates Structured Output JSON
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  4. Zod Schema Verification  │ ───► Enforces Strict Data Types & Boundary Checks
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  5. Clinician Review Gate    │ ───► Mandatory Human-in-the-Loop Sign-off
└──────────────┬───────────────┘
               ▼
[ Enacted in Patient Health Record ]
```

### 5.1 Pre-Inference PII De-Identification Pipeline
Prior to any prompt transmission to Google Gemini API:
1. Direct identifiers (patient name, doctor name, national ID, phone, email) are stripped or replaced with synthetic token pseudonyms (e.g. `[PATIENT_TOKEN_A]`).
2. Dates are normalized to relative clinical intervals (e.g., "3 weeks ago").
3. Verification flag `piiRedactedFlag: true` is asserted in `AIRequestLogs`.

### 5.2 Assistive Role & Clinician Authority
- **No Autonomous Diagnostic Decisions:** The AI engine is strictly assistive. It drafts, summarizes, and explains, but **never** diagnoses or issues unreviewed orders.
- **Mandatory Review Chip:** All AI-generated text in the UI displays a distinctive badge: `"AI-Generated • Review Required"`.
- **Encounter Sign-off:** An AI SOAP note draft cannot be finalized into an official legal medical record until an attending physician reviews the diff, edits where needed, and digitally signs.

### 5.3 Medical Disclaimer Mandates
Every AI output presented to a patient or doctor automatically displays the mandatory disclaimer:
> *"VitalSync AI is an assistive technology designed to support healthcare workflows. It is not a substitute for clinical judgment or medical diagnosis. Patients should always consult qualified healthcare professionals for diagnosis and treatment."*
