---
name: Publishing runtime compatibility
description: A production-only Node startup constraint observed in the publishing environment.
---

Production may inject Node networking options that older runtimes reject before any application code runs.

**Why:** Publishing failed despite a successful build and working preview because Node 18 rejected the injected network-family-autoselection-attempt-timeout option.

**How to apply:** Keep the publishing runtime on a supported modern Node version. When preview works but publishing crash-loops before application logs appear, inspect production startup logs rather than assuming an application or database error.
