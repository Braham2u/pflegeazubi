# PflegeAzubi — Work Schedule App for Nursing Trainees

A mobile-first scheduling app built for nursing Ausbildung trainees (Azubis) in Germany. Azubis can view their weekly Dienstplan, track working hours, submit availability wishes (Wunschbuch), request rotation placements, and manage their profile — all in one place.

The app is multilingual (German / English) and designed around the dual-system structure of German nursing training, where trainees split time between care home shifts and Berufsschule days.

---

## Live App

| | URL |
|---|---|
| **Web App** | [https://pflegeazubi.web.app](https://pflegeazubi.web.app) |
| **Kiosk Terminal** | [https://pflegeazubi.web.app/?kiosk=1](https://pflegeazubi.web.app/?kiosk=1) |

The kiosk URL is a standalone clock-in terminal (no login required) designed to run on a shared tablet at the facility entrance. Trainees enter their 6-digit PIN to clock in, start/end breaks, and clock out.

---

## Features

### Trainee (Azubi)
- Weekly shift plan (Dienstplan) with color-coded shift types
- Working time tracker with contracted vs. actual hours
- Availability wish book (Wunschbuch) — request days off or preferred timeframes
- Rotation plan viewer — see assigned facility placements across the training year
- Placement request form — submit requests to transfer or rotate to a different facility
- Profile page with 6-digit clock PIN display and language switcher (DE / EN)
- Correction requests for missing or incorrect timestamps

### Admin (Ausbildungsleitung)
- Dashboard with live metrics — active trainees, on duty, open wishes, pending corrections
- Shift publisher — assign shifts to trainees with custom start/end times (3-step flow)
- Live attendance board — see who is clocked in, on break, or finished
- Correction approval — review and approve/reject trainee time correction requests
- Trainee management — invite new trainees via email with auto-generated temp password and clock PIN
- Wish review — view and approve or reject trainee availability requests
- Rotation management — assign and manage trainee facility placements
- Incoming requests — review and respond to trainee placement transfer requests
- Sub-admin management — assign facility-level sub-admins per Einrichtung

### Sub-Admin (Einrichtungsleitung)
- Facility-scoped view of the shift plan and attendance for their assigned location
- Can publish shifts and view attendance for their own facility only
- No access to other facilities or global admin settings

### Kiosk Terminal
- Standalone PIN-pad clock-in terminal at `/?kiosk=1`
- Trainees enter 6-digit PIN → select action (Start Work / Leave / Break)
- Timestamp summary shown after each clock action
- Auto-resets after 15 seconds
- No access to admin features — fully isolated

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile / Web app | React Native with Expo (iOS + Android + Web) |
| Auth | Firebase Authentication (email/password) |
| Database | Firebase Firestore (real-time) |
| Hosting | Firebase Hosting |
| Language | TypeScript |
| Navigation | React Navigation (bottom tabs + native stack) |
| Dev environment | GitHub Codespaces / VS Code |

---

## Project Structure

```
pflegeazubi/
├── app/
│   ├── screens/        # One file per screen (Dienstplan, Wunschbuch, Profile, Admin…)
│   │   └── admin/      # Admin-only screens (Dashboard, ShiftPublisher, AttendanceBoard…)
│   ├── services/       # Firebase service layer — all Firestore/Auth calls isolated from UI
│   ├── context/        # React context providers (AuthContext, LanguageContext)
│   ├── components/     # Reusable UI components (ShiftCard, PINPad, StatusBadge…)
│   ├── constants/      # Colors, theme tokens, shared constants
│   ├── types/          # TypeScript interfaces (Trainee, Shift, WishEntry, ClockEvent…)
│   ├── navigation/     # Navigation config and route definitions
│   └── i18n/           # Translation files (de.ts, en.ts)
├── assets/             # Images, icons, fonts
├── .env.example        # Firebase config template (actual keys gitignored)
└── firebase.json       # Hosting and Firestore rules config
```

---

## Quick Start (Local)

```bash
git clone https://github.com/Braham2u/pflegeazubi.git
cd pflegeazubi
npm install
```

Create a `.env` file in the project root with your Firebase credentials:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Then run:

```bash
npx expo start --web
```

---

## Running in GitHub Codespaces

1. Click **Code → Codespaces → Create codespace on main**
2. Wait for the container to build and `npm install` to finish
3. Add your Firebase credentials as Codespaces secrets (Settings → Codespaces → Secrets)
4. Codespaces will forward **port 8081** automatically — click the pop-up to open the app

---

## Deploying Updates

```bash
npx expo export -p web && firebase deploy --only hosting
```

---

## Evaluation Dimensions

| Dimension | How this project addresses it |
|---|---|
| **Performance** | Expo web bundle is lean; Firestore queries fetch only the current user's data |
| **Dev Time** | Full scaffold, all screens, auth, and time-clock system delivered within the academic semester timeline |
| **Cost** | Firebase Spark (free tier) covers the entire MVP including hosting; no backend server required |
| **Accuracy** | Domain logic (shift types, ArbZG break rules, DSGVO role isolation) sourced from industry requirements |
| **Usability** | Color-coded shift types, German-first UI with English toggle, invite-only onboarding, kiosk PIN terminal |
| **Security** | Invite-based onboarding prevents open registration; role stored server-side in Firestore; kiosk isolated at separate URL; `.env` gitignored |
| **Scalability** | Firestore scales horizontally; Träger → Einrichtung → Bereich hierarchy supports single homes through large chains (Caritas, BRK, AWO) |
| **Extensibility** | Clean separation of services, screens, types, and context; i18n system makes adding further languages straightforward |
| **Traceability** | Git history shows incremental feature delivery from initial scaffold through full admin panel |

---

## Team

**Health Informatics · TH Deggendorf · SS 2026**

| Name | Student ID | Responsibilities |
|---|---|---|
| **Abraham T. Borbor Jr** | 22210099 | App architecture · React Native UI · Firebase backend & integration · System design · Business plan · Market analysis · Financial model · Survey design · Project management · Presentation lead |
| **Maja Cezkala** | 22210114 | Firebase Functions · Firestore schema · API design · Träger survey outreach · Cost & revenue analysis · Presentation |
| **Josue Kacou** | 22202484 | Database modelling · Firebase hosting & deployment · DevOps setup · Azubi survey outreach · Prototype testing · Presentation |

---

## License

Academic project — TH Deggendorf, SS 2026. Not licensed for commercial use.
