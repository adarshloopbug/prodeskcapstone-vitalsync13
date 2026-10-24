# VitalSync Role-Based & Attribute-Based Access Control (RBAC / ABAC) Matrix

VitalSync enforces a multi-layered security model combining **Role-Based Access Control (RBAC)** with fine-grained **Attribute-Based Access Control (ABAC)**. This architecture implements the HIPAA principle of **Least Privilege** across all operations.

---

## 1. Role Definitions

| Role | Domain Scope & Responsibility |
| :--- | :--- |
| **`PATIENT`** | Consumer of healthcare services. Access strictly scoped to self-records, personal scheduling, prescriptions, and assistive AI intake. |
| **`DOCTOR`** | Licensed clinical practitioner. Full clinical authority over assigned patients: encounters (SOAP), prescriptions, lab orders, and AI clinical copilot tools. |
| **`STAFF`** | Front-desk receptionists, clinic coordinators, and triage nurses. Operations, scheduling, check-ins, vitals recording, and live queue management. Shielded from sensitive clinical narratives. |
| **`ADMIN`** | Hospital IT administrators and compliance officers. System provisioning, department routing, role assignment, audit log monitoring, and high-level analytics. Shielded from direct PHI clinical records. |

---

## 2. Core Permission Matrix (CRUDX)

**Legend:**
- **`C`**: Create
- **`R`**: Read
- **`U`**: Update
- **`D`**: Delete / Soft-delete
- **`X`**: Execute / Sign / Approve
- **`--`**: No Access
- **`*`**: Scoped by ABAC Attribute Rules (see Section 3)

| Resource | `PATIENT` | `DOCTOR` | `STAFF` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: |
| **Users / Credentials** | R* / U* (Self) | R* / U* (Self) | R* / U* (Self) | C / R / U / D |
| **Patient Demographics** | R* / U* (Self) | R* / U* | C / R / U | R / U |
| **Availability Slots** | R (Public) | C* / R* / U* | C / R / U | C / R / U / D |
| **Doctor Schedules** | R | C* / R* / U* | R / U | C / R / U / D |
| **Appointments** | C* / R* / U* | R* / U* | C / R / U / D | R / U |
| **Encounters (SOAP Notes)**| R* (Finalized) | C* / R* / U* / X | -- (Shielded) | R* (Break-glass) |
| **Vitals Records** | R* (Self) | C* / R* / U* | C / R / U | R (De-identified) |
| **Diagnoses List** | R* (Self) | C* / R* / U* | R* (Summary only) | -- |
| **Allergies** | R* (Self) | C* / R* / U* | C / R | -- |
| **Lab Results & Docs** | R* (Self) | C* / R* / U* / X | C / R (Upload only) | -- |
| **Medication Catalog** | R | R | R | C / R / U / D |
| **Prescriptions** | R* (Self) | C* / R* / U* / X | R* (Fulfill/Dispense) | -- |
| **AI Intake Summary** | C* / R* (Self) | R* / X (Approve) | R* (Triage flag) | -- |
| **AI SOAP Drafts** | -- | C* / R* / U* / X | -- | -- |
| **Ask VitalSync RAG** | X* (Self scope) | X* (Assigned Pt) | -- | -- |
| **Audit Logs (WORM)** | -- | -- | -- | R (Immutable) |
| **Hospital Analytics** | -- | R* (Self dept) | R* (Wait queue) | R (Full Hospital) |

---

## 3. Attribute-Based Access Control (ABAC) Rules

RBAC determines basic capabilities; ABAC evaluates dynamic runtime context (actor ID, resource owner, patient-doctor relationship, emergency status).

### Rule 1: Patient Tenant Isolation
```typescript
function canAccessPatientRecord(actor: SessionUser, targetPatientId: string): boolean {
  if (actor.role === 'PATIENT') {
    return actor.patientId === targetPatientId;
  }
  return true; // Subject to Doctor / Staff rules below
}
```
*A patient cannot access, query, or receive vector embeddings for any record where `patientId !== actor.patientId`.*

### Rule 2: Doctor Care Relationship Verification
```typescript
async function canDoctorAccessPatient(doctorId: string, targetPatientId: string): Promise<boolean> {
  // 1. Is Doctor explicitly assigned as Primary Physician?
  const isPrimary = await Patients.exists({ _id: targetPatientId, primaryDoctorId: doctorId });
  if (isPrimary) return true;

  // 2. Does Doctor have an active, upcoming, or past appointment with the patient?
  const hasAppointment = await Appointments.exists({
    patientId: targetPatientId,
    doctorId: doctorId,
    status: { $in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] }
  });
  if (hasAppointment) return true;

  // 3. Fallback: Emergency Break-Glass (Section 4)
  return false;
}
```

### Rule 3: Clinical Shielding for Staff
Staff members can record baseline vitals (BP, Heart Rate, SpO2) and view triage flags, but **cannot view** narrative fields: `subjective`, `objective`, `assessment`, `plan`, or psychiatric notes. Database queries projecting records for `STAFF` automatically strip these fields:
```typescript
const staffProjection = {
  subjective: 0,
  objective: 0,
  assessment: 0,
  plan: 0
};
```

### Rule 4: Administrative Separation of Concerns
Hospital Admins manage infrastructure, role assignments, department routing, and audit logs. Admins **never** have default read access to patient clinical encounters. Any admin attempt to inspect clinical notes requires an explicit break-glass event with mandatory legal justification.

---

## 4. Emergency "Break-Glass" Access Protocol

In life-threatening emergency situations where an unassigned clinician or emergency physician requires instantaneous access to an unknown patient's chart:

1. **Invocation:** Clinician sends `POST /api/v1/patients/:id/break-glass` with a mandatory clinical justification text (minimum 30 characters).
2. **Access Grant:** A time-bounded 2-hour emergency read token is issued.
3. **Audit Dispatch:** An immutable, high-priority audit record is written to `AuditLogs` with:
   - `action: "BREAK_GLASS"`
   - `actorUserId: clinician.id`
   - `patientId: targetPatient.id`
   - `justification: string`
   - `ipAddress: string`
   - `timestamp: now()`
4. **Instant Alert:** BullMQ triggers an immediate high-priority alert notification to the Hospital Compliance Officer and Hospital Admin via email and SMS.
