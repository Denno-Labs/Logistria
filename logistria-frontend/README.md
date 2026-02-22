# 🛰️ LOGISTRIA — B2B Supply Chain Control Tower

> A futuristic, real-time supply chain control tower mobile app built for a hackathon. Built with Expo Router, Firebase, and a "Cyberpunk Corporate" dark UI.

---

## 📱 App Overview

Logistria is a role-based B2B mobile dashboard for supply chain operators. Different roles see different interfaces:

| Role | Experience |
|---|---|
| **Chief Logistics Officer** | Live map of truck fleet + bottom-sheet analytics |
| **Logistics Officer** | Live map of truck fleet + bottom-sheet analytics |
| **Supply Officer** | Inventory, shipments & alerts dashboard |
| **Warehouse Officer** | Inventory, shipments & alerts dashboard |

All roles have access to the **AI War Room** (live chat with AI agents) and the **Settings** screen.

---

## 🧱 Tech Stack

| Layer | Library |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 52) + [Expo Router](https://expo.github.io/router) v4 |
| Language | TypeScript |
| Styling | [NativeWind v4](https://www.nativewind.dev) (Tailwind CSS for React Native) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Auth & DB | [Firebase v12](https://firebase.google.com) (Auth + Firestore) |
| Maps | [react-native-maps](https://github.com/react-native-maps/react-native-maps) |
| Chat | [react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat) |
| Animations | [Moti](https://moti.fyi) + [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| Bottom Sheet | [@gorhom/bottom-sheet](https://gorhom.github.io/react-native-bottom-sheet/) |
| Icons | [lucide-react-native](https://lucide.dev) |
| Glassmorphism | [expo-blur](https://docs.expo.dev/versions/latest/sdk/blur-view/) |
| Image Upload | [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) |

---

## 🗂️ Project Structure

```
logistria-frontend/
├── app/
│   ├── _layout.tsx          # Root layout (GestureHandlerRootView + Stack)
│   ├── index.tsx            # Splash screen (Moti animation → /login)
│   ├── login.tsx            # Firebase Auth (Sign In / Sign Up + role picker)
│   └── (tabs)/
│       ├── _layout.tsx      # Floating glassmorphism tab bar (3 tabs)
│       ├── index.tsx        # Home dashboard (role-based: Map or Inventory)
│       ├── chat.tsx         # AI War Room (GiftedChat + Firestore listener)
│       └── settings.tsx     # Profile, system health, avatar upload, logout
├── store/
│   └── useStore.ts          # Zustand store (auth state + fleet mock data)
├── firebaseConfig.ts        # Firebase init (Auth + Firestore)
├── babel.config.js          # NativeWind v4 Babel config
├── tailwind.config.js       # Tailwind config
└── app.json                 # Expo config
```

---

## ⚙️ Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Expo CLI** — `npm install -g expo`
- **Expo Go** app on your phone **or** Android Emulator / iOS Simulator

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd logistria-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Firebase setup

The project uses Firebase for authentication and Firestore. The `firebaseConfig.ts` file already contains the project credentials. However, for your own deployment you should:

1. Create a project at [firebase.google.com](https://firebase.google.com)
2. Enable **Authentication** → Email/Password sign-in method
3. Enable **Firestore Database** in test mode
4. Replace the config values in `firebaseConfig.ts`:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 4. Start the development server

```bash
npx expo start
```

Then scan the QR code with **Expo Go** (Android/iOS) or press:
- `a` — open Android emulator
- `i` — open iOS simulator
- `w` — open in browser (limited support)

---

## 🔥 Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | Stores `email`, `role`, `createdAt` on signup |
| `agent_logs` | Realtime AI agent messages shown in the War Room |

### `agent_logs` document shape

```json
{
  "message": "Supply chain alert: delay detected.",
  "agentId": 2,
  "agentName": "Supplier Agent",
  "agentAvatar": "🏭",
  "createdAt": "<Firestore Timestamp>"
}
```

If the collection is empty, the War Room falls back to built-in mock messages.

---

## 🎨 Design System

| Token | Value |
|---|---|
| Background | `#081021` |
| Primary Accent (Orange) | `#FF8C00` |
| Secondary Accent (Teal) | `#00C9B1` |
| Danger | `#FF3B3B` |
| Glass surface | `rgba(255,255,255,0.04)` + `border rgba(255,255,255,0.08)` |

All styling uses **StyleSheet** (not Tailwind className) for React Native compatibility with NativeWind v4.

---

## 📲 Screens & Flow

```
Splash (3s Moti animation)
    └─→ Login / Sign Up
            ├─ Sign In: email + password → fetch role from Firestore → Tabs
            └─ Sign Up: email + password + role picker → save to Firestore → Tabs

Tabs (floating glassmorphism tab bar)
    ├─ 🗺  Home
    │       ├─ CLO / Logistics Officer → MapView + BottomSheet fleet summary
    │       └─ Supply / Warehouse Officer → Inventory cards (scrollable)
    ├─ 📡  War Room
    │       └─ GiftedChat + Firestore listener + Mic button (voice simulation)
    └─ ⚙️  Settings
            ├─ Tap avatar → upload photo (expo-image-picker)
            ├─ Push notification toggle
            ├─ Change Password (modal)
            └─ Terminate Session → Firebase signOut → /login
```

---

## 🔐 Authentication Flow

- **Sign In**: `signInWithEmailAndPassword` → fetch `role` from `users/{uid}` in Firestore → store in Zustand → navigate to tabs.
- **Sign Up**: `createUserWithEmailAndPassword` → write `{email, role, createdAt}` to Firestore → store in Zustand → navigate to tabs.
- **Logout**: `signOut(auth)` → clear Zustand → navigate to `/login`.

---

## 🗃️ Zustand Store (`store/useStore.ts`)

```ts
{
  // Auth
  user: FirebaseUser | null,
  role: string | null,
  setUser: (user, role) => void,
  logout: () => void,

  // Fleet (mock data)
  trucks: Array<{ id, lat, lng, status: 'MOVING' | 'DELAYED' }>,
  activeProduct: string,
}
```

---

## 🧪 Testing the App

### Quick test accounts
Create accounts via the Sign Up screen with any email/password. Choose a role during signup — the home dashboard will render differently based on the role stored in Firestore.

### Suggested test flow
1. Sign up as **Chief Logistics Officer** — see the live map with truck markers and the analytics bottom sheet.
2. Sign up as **Warehouse Officer** — see the inventory dashboard instead.
3. Go to **War Room** — tap the 🎙️ mic button or type a message to simulate AI agent responses.
4. Go to **Settings** — tap the avatar to upload a photo, or change your password.

---

## ⚠️ Known Considerations

- **`react-native-maps`** requires Google Maps API key for Android in production. For development with Expo Go, it works without a key.
- **`expo-image-picker`** requires camera roll permissions. The app will prompt the user on first use.
- **`updatePassword`** in Firebase requires the user to have signed in recently. If it fails with `auth/requires-recent-login`, the user must sign out and sign back in before changing their password.
- The **NativeWind v4** Babel config does NOT use the `nativewind/babel` plugin. The correct setup is `jsxImportSource: "nativewind"` in `babel.config.js` — do not change this.

---

## 📦 Key Scripts

```bash
npx expo start          # Start dev server
npx expo start --clear  # Start with cleared cache (use when making config changes)
npx tsc --noEmit        # Type-check without building
```

---

## 🤝 Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`
2. Follow the existing StyleSheet pattern (no `className` on React Native components)
3. Keep the design system colors consistent (`#081021`, `#FF8C00`, `#00C9B1`)
4. Test on both iOS and Android before submitting a PR

---

*Built for a hackathon — LOGISTRIA · Secure Control Tower · All transmissions encrypted* 🛰️
