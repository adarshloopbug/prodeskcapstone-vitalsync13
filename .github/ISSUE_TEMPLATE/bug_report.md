---
name: Bug Report
about: Create a report to help us improve VitalSync
title: '[BUG] <Short description>'
labels: ['bug', 'triage']
assignees: ''
---

## Bug Description
A clear and concise description of what the bug is. Note: VitalSync utilizes **synthetic clinical data only**; never paste real patient identifiers.

## Persona / Role Encountered Under
- [ ] Patient
- [ ] Doctor
- [ ] Staff / Front Desk
- [ ] Hospital Admin
- [ ] System / Automated Worker (BullMQ)

## Steps to Reproduce
1. Navigate to '...'
2. Click on '....'
3. Fill inputs with synthetic test values '....'
4. Observe error response or abnormal UI state

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
What actually occurred (include screenshot or network response if applicable).

## Environment Details
- **App Module:** (e.g., `apps/web` or `apps/api`)
- **Browser & Version:** (e.g., Chrome 130, Safari 18)
- **Node.js Version:** (e.g., v20.x LTS)
- **Database / Cache State:** (MongoDB Atlas replica set / Redis v7)

## Security & Compliance Checklist
- [ ] Confirmed NO real Protected Health Information (PHI) is attached in screenshots or logs.
- [ ] Verified whether this bug impacts the audit log trail or RBAC authorization gates.
