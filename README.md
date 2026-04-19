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
