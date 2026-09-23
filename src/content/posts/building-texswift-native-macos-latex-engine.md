---
author: Ryan Guo
pubDatetime: 2026-09-20T10:00:00Z
title: "Building TexSwift: A Blazingly Fast Native macOS LaTeX Suite"
featured: true
tags:
  - swift
  - macos
  - latex
  - appkit
description: "Architecting a native Apple Silicon LaTeX editor and compiler with sub-second Tectonic integration, PDFKit live preview, and CoreText typesetting."
---

While web-based LaTeX editors like Overleaf have democratized collaborative typesetting, working locally with traditional TeX distributions (such as MacTeX) often feels heavy, detached, and sluggish. 

**TexSwift** was created to solve this friction: a native, standalone, sub-second LaTeX editor and typesetting workbench built specifically for macOS.

## Core Architectural Pillars

TexSwift brings together three major technical components into a unified desktop application:

### 1. Hybrid Multi-Engine Compilation
TexSwift features an adaptable compilation pipeline:
- **Embedded Tectonic Engine**: A modern, self-contained C/Rust TeX engine compiled for ARM64 macOS that downloads packages dynamically on demand without requiring gigabytes of local TeX distribution.
- **Native CoreText Typesetting**: A lightweight, standalone vector typesetting pipeline capable of rendering mathematical notation and documents instantly without external dependencies.
- **External CLI Toolchain Support**: Seamless detection of `pdflatex`, `xelatex`, and `lualatex` installed in standard system paths (`/Library/TeX/texbin`, Homebrew).

```swift
// Sample asynchronous compiler runner in TexSwift
actor TeXEngineManager {
    func compile(source: String, engine: CompilationEngine) async throws -> CompilationResult {
        switch engine {
        case .tectonic:
            return try await executeTectonicPipeline(source)
        case .coreText:
            return try await renderCoreTextDocument(source)
        case .cli(let executable):
            return try await runExternalProcess(executable, source)
        }
    }
}
```

### 2. High-Performance AppKit Editor
The editor leverages AppKit's `NSTextView` backed by a customized `NSTextStorage` for syntax highlighting:
- **Instant Regex Highlighting**: Syntax highlighting for commands, environments, math blocks (`$ ... $`, `$$ ... $$`), comments, and arguments with zero input lag.
- **Document Structure Parser**: Real-time extraction of sections, subsections, and labels into an interactive Outline Table of Contents.
- **Math Symbol Palette**: A curated floating symbol inspector enabling quick insertion of Greek letters, operators, relations, and delimiters.

### 3. Integrated PDFKit Preview with Sync
- **Persistent Viewport**: Retains exact scroll position and zoom level across recompilations.
- **Flexible Workspace Modes**: Instant switching between Split View (`[ | ]`), Editor-Only (`[ ]`), and PDF-Only (`[ = ]`) with hotkeys.

TexSwift demonstrates that native macOS applications written in Swift and AppKit deliver unprecedented responsiveness and battery efficiency compared to Electron alternatives.
