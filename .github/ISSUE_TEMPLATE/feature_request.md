---
name: Feature Request / Architecture Enhancement
about: Suggest an idea, clinical workflow enhancement, or AI capability for VitalSync
title: '[FEAT] <Short description>'
labels: ['enhancement', 'rfc']
assignees: ''
---

## Feature Summary
A concise overview of the proposed capability, workflow enhancement, or architecture improvement.

## Problem Statement & Clinical Context
What pain point or operational inefficiency does this address? (e.g., clinician documentation burden, appointment no-shows, patient medication adherence, administrative overhead).

## Target Personas Impacted
- [ ] Doctor / Attending Clinician
- [ ] Patient / Caregiver
- [ ] Front Desk / Triage Nurse
- [ ] Hospital Administrator / Compliance Officer

## Priority Level
- [ ] P0 - Core EHR Engine (Auth, RBAC, Scheduling, State machines)
- [ ] P1 - Clinical Workflow (SOAP notes, vitals, lab reports, warnings)
- [ ] P2 - AI Layer (Intake, summarization, plain-language Rx, RAG assistant)
- [ ] P3 - Nice-to-Have (Analytics, Telemed, Dark mode, PDF export)

## Proposed Architecture / Solution
Describe the architectural changes, data models, or endpoints required.
- **Frontend changes:** UI screens, state management (Zustand/TanStack Query)
- **Backend changes:** Express routes, Mongoose schema updates, Socket.IO events
- **AI / Pipeline considerations:** Model choice (Gemini), prompt templates, PII redaction, human-in-the-loop validation rule

## Safety, Privacy & Compliance Verification
- [ ] Assistive AI only: Includes clinical review step and disclaimer?
- [ ] HIPAA alignment: Adheres to least privilege and field-level encryption?
- [ ] Synthetic data compliance: Test fixtures use only synthetic data?
