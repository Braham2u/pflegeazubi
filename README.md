# PflegeAzubi — Work Schedule App for Nursing Trainees

A mobile-first scheduling app built for nursing Ausbildung trainees (Azubis) in Germany. Azubis can view their weekly Dienstplan, track working hours, submit availability wishes (Wunschbuch), and manage their profile — all in one place. The app is multilingual (German / English) and designed around the dual-system structure of German nursing training, where trainees split time between care home shifts and Berufsschule days.

---

## Quick Start (Docker)

```bash
git clone https://github.com/your-username/pflegeazubi.git
cd pflegeazubi
docker-compose up
```

Then open [http://localhost:8081](http://localhost:8081) in your browser.
Click **"Demo ansehen"** on the login screen to explore without Firebase credentials.

---

## Running in GitHub Codespaces

1. Click **Code → Codespaces → Create codespace on main**
2. Wait for the container to build and `npm install` to finish
3. Codespaces will forward **port 8081** automatically — click the pop-up to open the app in your browser

> The `devcontainer-simple.json` in `.devcontainer/` is the recommended config for Codespaces — it uses the official Microsoft Node 20 image and starts Expo web automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native with Expo (iOS + Android + Web) |
| Auth | Firebase Authentication (email/password) |
| Database | Firebase Firestore (real-time) |
| Push notifications | Expo Push Notification Service |
| Language | TypeScript |
| Navigation | React Navigation (bottom tabs) |
| Containerisation | Docker + Docker Compose |
| Dev environment | GitHub Codespaces / VS Code devcontainer |

---

## AI Agent Workflow

This project was built using a human-AI collaboration model as part of a university study on AI-assisted software development.

**Human role — Abraham T. Borbor Jr.**
Product owner and domain expert on the German nursing Ausbildung system. Abraham makes all architectural and product decisions, defines requirements, validates outputs, and is the single source of truth for what gets built and why.

**AI role — Claude (Anthropic)**
Claude.ai was used for planning, research, and drafting the project brief. Claude Code (VS Code extension) was used for all implementation — scaffolding the project, building screens, wiring Firebase, and refactoring based on feedback. Claude writes no code without a clear brief.

**How we use Plan Mode**
Every significant feature begins with a written brief. Claude Code is run in Plan Mode to outline exactly what files it will create or modify and what logic it will implement. Abraham reviews and approves the plan before any file is touched. This prevents unwanted changes and keeps the human in control of the codebase.

**Source of truth**
The project brief document (`pflegeazubi_brief.pdf`) is attached at the start of every new Claude Code session. Because Claude Code does not persist conversation history between sessions, the brief re-establishes full context — data model, role system, feature list, build order, and design decisions — so the AI can continue without re-explaining from scratch.

**Async development**
Claude Code can be given a well-defined task (e.g. "build the AvailabilityScreen with add/edit timeframes per the brief") and runs largely unattended while Abraham works on user research, survey outreach, or thesis writing. Results are reviewed and tested before merging.

---

## Evaluation Dimensions

| Dimension | How this project addresses it |
|---|---|
| **Performance** | Expo web bundle is lean; Firestore real-time listeners fetch only the current user's data; dummy data mode removes all network dependency for demos |
| **Dev Time** | Full scaffold + four screens + auth + i18n built in a single session using Claude Code; estimated 10× faster than solo development |
| **Cost** | Firebase Spark (free tier) covers the entire MVP; no backend server; Docker image uses node:20-alpine to minimise size |
| **Accuracy** | Domain logic (shift types, Berufsschule inline display, DSGVO role isolation) sourced directly from project brief written by a domain expert |
| **Usability** | Color-coded shift types, German-first UI with English toggle, invite-only onboarding, and demo mode lower the barrier for non-technical evaluators |
| **Security** | Invite-based onboarding prevents open registration; role stored server-side in Firestore, never self-selected; `.env` gitignored; DSGVO access control isolates each Azubi's data |
| **Scalability** | Firestore scales horizontally; Träger → Einrichtung → Bereich hierarchy supports single homes through large chains (Caritas, BRK, AWO); Expo EAS for App Store deployment |
| **Extensibility** | Clean separation of services, screens, types, and context; i18n system makes adding Arabic/Tagalog/Hindi straightforward; production stack (Supabase + Railway) documented in brief |
| **Traceability** | Every feature maps to a numbered step in the build order; AI session context restored via brief at session start; git history shows incremental feature delivery |

---

*PflegeAzubi Project Brief v1.0 — April 2026 — Abraham T. Borbor Jr. — THD ECRI Pfarrkirchen*
