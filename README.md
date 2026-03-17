# Maddie HQ

Maddie HQ is a growing web app for organizing the moving parts of Maddie's creator workflow.

Right now, the app includes:
- a home page that acts like the front door to the product
- a Social Insights room for comparing TikTok and Instagram performance
- a Post Progress Tracker room for keeping up with day-to-day content tasks

Over time, this project is meant to grow into a more complete operations app for Maddie's business, including better planning, insight review, and decision support.

## What Maddie Is Building

This is not just a website with a few pretty screens.

It is becoming a creator control center: one place where Maddie can:
- understand what content is working
- keep track of what needs to get done
- organize ideas and posting workflow
- eventually make smarter decisions using data instead of memory alone

In plain English:
- the `Insights` page is the results room
- the `Tracker` page is the workflow room
- the `Home` page is the front lobby that helps organize the tools

## Current App Structure

This app uses Next.js, which means each major page usually has its own route.

Current routes:
- `/` -> Home page
- `/insights` -> Social Insights dashboard
- `/tracker` -> Post Progress Tracker

Important files:
- `app/layout.tsx` -> shared app shell and top navigation
- `app/page.tsx` -> homepage
- `app/insights/page.tsx` -> social insights room
- `app/tracker/page.tsx` -> post progress tracker room
- `app/globals.css` -> shared styling across the app
- `AGENTS.md` -> instructions for how the AI agent should collaborate on this project

## Critical Reminders For Maddie

These are the important things to remember when working on this app with AI.

### 1. Ask For Explanations First

If Maddie wants a change, the AI should explain the idea in plain English before building it.

That explanation should help Maddie understand:
- what is changing
- which page or file it probably affects
- whether the change is mostly visual, behavioral, or structural
- what tradeoffs matter

This matters because the goal is not just to ship features. The goal is also to help Maddie learn how the app fits together.

### 2. Give A Clear Go-Ahead Before Code Changes

The AI should not just charge ahead when Maddie is still thinking out loud.

Once Maddie says to proceed, the AI can build the change.

This keeps brainstorming separate from implementation and helps avoid accidental work in the wrong direction.

### 3. Bigger Work Should Be Tracked On GitHub

When the work is significant, use this flow:
1. Create a GitHub issue that explains the work.
2. Create a branch for that issue.
3. Do the work on that branch.
4. Open a pull request.
5. Merge the PR into `main`.
6. Let the issue close when the PR is merged.

Why this matters:
- Maddie can see what is being worked on
- Mark can review or comment more easily
- the team gets a cleaner project history
- this will make future hosting and deployment workflows easier

### 4. Every Meaningful Change Should Be Saved Cleanly

Git is the project history system.

That means:
- commits should describe real chunks of work
- the history should stay easy to understand
- it should be possible to roll back to older versions if needed

Think of commits like labeled save points.

### 5. `main` Should Stay Stable

The `main` branch is the official latest version of the app.

Later, when the app is hosted publicly, `main` may become the branch that automatically deploys to the live web app. That means changes merged into `main` should be reasonably safe and intentional.

### 6. This App Should Stay Beginner-Friendly

The code should grow in a way that Maddie can gradually understand.

That means:
- avoid unnecessary complexity
- prefer clear structure over hacks
- keep naming readable
- explain the real terminology as it comes up

## Working With The AI

The AI is expected to help in two ways:
- build features and make changes
- teach Maddie the plumbing as the app grows

That means the AI should:
- explain things in plain English first
- use real developer terms without hiding them
- offer small crash courses when useful
- keep track of what Maddie has already been taught in `AGENTS.md`

Examples of topics Maddie may learn over time:
- route
- component
- layout
- state
- commit
- pull request

## How To Run The App

If the app is not already running:

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

If the app is already running in another terminal, Next.js will usually auto-refresh when files change.

## How To Think About The Current Rooms

### Home

The home page is the front door. It should help Maddie quickly understand what tools exist and where to go next.

### Insights

This room is for understanding performance.

It should eventually help answer questions like:
- What is working on TikTok?
- What is working on Instagram?
- Which content patterns are worth repeating?
- What should Maddie do more of next?

### Tracker

This room is for managing execution.

It should eventually help answer questions like:
- What content is being planned?
- What is in progress?
- What is ready to post?
- What keeps getting stuck?

## Future Direction

This project will likely keep expanding.

Likely future additions:
- a content planner
- better suggestions and recommendations
- more detailed analytics input or account integrations
- public hosting and automatic deployment from GitHub

The key rule is to keep building in a way that makes future growth easier, not messier.

## If Something Feels Broken

Start with the simple checks:
- Is the app running on `localhost:3000`?
- Is the change on the right page or route?
- Did the browser refresh?
- Is there an error in the dev server terminal?
- Did the change get committed to the correct branch?

If Maddie is unsure, she should ask the AI what changed, where it lives, and how to verify it.

## Final Note For Maddie

You do not need to become a full-time developer to use this project well.

The real goal is:
- learn enough to direct the product confidently
- understand the major moving parts
- build useful things quickly with AI support

That is a very realistic goal, and this repo should keep getting better at supporting it.
