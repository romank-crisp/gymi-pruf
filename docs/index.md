---
layout: home

hero:
  name: "Gymi-Vorbereitung"
  text: "Content Engine Docs"
  tagline: "Technical reference for the AI-generated exercise system that powers the Gymnasium entrance-exam prep app."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Collections Reference
      link: /collections/

features:
  - icon: 🗄️
    title: Payload CMS Backend
    details: TypeScript-native CMS on top of Postgres. All content lives here — exercises, prompt templates, users, and the audit trail.
  - icon: 🔄
    title: Enforced Lifecycle
    details: Every exercise moves through a strict state machine (generated → published / rejected → retired). Illegal transitions throw before write.
  - icon: 🤖
    title: AI Generation Pipeline
    details: Claude generates exercises from prompt templates in batches. Auto-validation filters before content ever reaches a teacher reviewer.
  - icon: 📋
    title: Reviewer Queue (Week 2)
    details: Custom Payload admin view for the teacher — one exercise at a time, approve / edit / reject with keyboard shortcuts.
---
