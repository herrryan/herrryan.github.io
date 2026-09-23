---
author: Ryan Guo
pubDatetime: 2026-09-15T14:30:00Z
title: "SkimSwift: Re-architecting Academic PDF Reading & Annotation for macOS"
featured: true
tags:
  - swift
  - macos
  - pdfkit
  - architecture
description: "Designing a high-performance document reader with persistent state, interactive PDF annotations, and system Spotlight indexing."
---

Academic researchers and engineers spend hundreds of hours inside PDF documents, analyzing papers, highlighting key claims, and synthesizing citations. 

**SkimSwift** is an open-source native macOS PDF application inspired by the classic Skim reader, modernized for macOS Sonoma, Sequoia, and Apple Silicon architectures.

## Architecture Highlights

### Document State Preservation
One of the most frustrating aspects of standard PDF readers is losing reading context when re-opening a session. SkimSwift implements robust persistent document state:
- Page numbers, zoom scales, and scroll offsets are serialized alongside system bookmarks.
- Automatic session restoration with zero layout flicker.

### Rich Non-Destructive Annotations
SkimSwift supports full PDF annotation specifications:
- Highlight, underline, and strike-through text overlays.
- Freehand drawings, vector shapes, and note callouts.
- Non-destructive export: Annotations can be embedded directly into PDF streams or saved in clean sidecar files for easy version control.

### Spotlight & Metadata Integration
Every document opened in SkimSwift interfaces with macOS Core Spotlight:
- Highlights and notes are indexed locally for system-wide search.
- Searching via macOS Spotlight (`⌘ Space`) directly exposes notes and brings you to the exact page within SkimSwift.
