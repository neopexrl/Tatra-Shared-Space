# Tatra Shared Space

A prototype web application built for Tatra Banka during the Hack Košice Hackathon 2026.

This project was developed in a 24-hour hackathon sprint as a modern shared-finance experience for small groups and shared wallets. The team created a bank-style UI that allows users to open rooms, invite members, manage shared expenses, and handle room-specific payments.

## What we built

- **Shared rooms** for group financial collaboration
- **Room membership management** with invite flows and role-based actions
- **Payment transfers** into/out of shared rooms
- **Expense tracking** and shopping/check management within each room
- **Compact mobile-friendly UI** for room lists and detail pages
- **Dark banking shell styling** to match Tatra Banka branding and modern fintech design

## Key features

- Room list with quick access to room name, IBAN, and member avatars
- Detailed room page with balance overview, member count, recent activity, and spending cards
- Send money to/from rooms using a simplified payment form
- Member-level spending information and owner actions
- Responsive layout for desktop and mobile web
- Fast debugging and adaptation during the hackathon

## Project structure

- `app/` - application pages and React components for shared spaces
- `backend/` - backend service helpers, API endpoints, AI helpers, and database migrations
- `docs/` - architecture notes and notification system changelog
- `public/` - static mock shell assets, icons, and robots settings
- `src/` - shared shell setup, theme utilities, CSS, and helper scripts

## Hackathon context

This was built as a rapid proof-of-concept during Hack Košice 2026. The goal was to deliver a complete shared-space financial experience in one day, focusing on:

- fast UI iteration
- clear mobile and desktop behavior
- strong visual polish with a bank-themed shell
- lightweight shared finance workflows

## Notes

- This repository represents a prototype, not a final production release
- The current implementation is designed for speed and demonstration
- Future improvements can include stronger backend integration, accessibility improvements, and expanded transaction workflows

## How to Run Locally

### Prerequisites
- Node.js version 20.19.4 or higher
- npm (comes with Node.js)
- For mobile development: Expo Go app on your phone (available on App Store/Google Play)

### Installation
1. Clone or download this repository to your local machine.
2. Navigate to the project directory:
   ```
   cd Tatra-Shared-Space
   ```
3. Install dependencies:
   ```
   npm install
   ```

### Environment Setup
The project uses environment variables for Supabase (database) and Gemini AI integration. These are already configured in the `.env` file included in the repository. If you need to modify them (e.g., for a different Supabase instance), update the `.env` file accordingly.

### Running the Application
This is an Expo-based React Native application that supports web, Android, and iOS.

#### For Web (Recommended for quick testing)
```
npm start
```
This will start a development server and open the app in your default web browser.

#### For Mobile
1. Install the Expo Go app on your mobile device.
2. Run:
   ```
   npm start
   ```
3. Scan the QR code displayed in the terminal with the Expo Go app.

#### For Native Platforms
- Android: `npm run android` (requires Android Studio and emulator or device)
- iOS: `npm run ios` (requires Xcode and simulator or device, macOS only)

### Backend and Database
The application uses Supabase as a backend-as-a-service for database operations. No local backend server is required as all data operations are handled through Supabase's API. The database schema is defined in the `backend/database/` folder with SQL migration files.

### Type Checking
To run TypeScript type checking:
```
npm run typecheck
```

### Troubleshooting
- If you encounter issues with dependencies, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.
- Ensure your Node.js version matches the requirement (>=20.19.4).
- For web issues, check that port 19006 (default Expo port) is not blocked.
