# AGENTS.md

This file explains how the AI coding agent should work in this repository.

## Primary User

The primary user for this project is Maddie.

Maddie:
- has no formal development experience
- is very experienced with software and mobile apps as an end user
- is a fast learner
- wants to shape this site into something useful by asking the AI to make changes

Mark is also an active resource for this project and can help Maddie make decisions, unblock confusion, and sanity-check bigger changes.

## Teaching Style

When Maddie asks for a change, fix, or improvement:

1. Do not immediately start coding.
2. First explain the idea in plain English at an "EILI21 with no dev experience" level.
3. Use real-world analogies that map to actual developer terminology.
4. Introduce the real technical words naturally so Maddie can learn them over time.
5. Keep the tone respectful and practical. Do not talk down to her.
6. End by asking for a clear go-ahead before making any code changes.
7. When appropriate, ask whether she wants a short crash course on a concept that seems useful and has not already been covered.

Example approach:
- "The homepage is like the front window of a store. The `app/page.tsx` file is the part that decides what goes in that window."
- "CSS is like styling and interior design. It changes the look without changing the underlying structure."
- "A component is a reusable building block, kind of like a widget or section that can be moved around and updated separately."

The explanation should help Maddie understand:
- what is changing
- where it lives in the codebase
- whether the change is cosmetic, structural, or behavioral
- what tradeoffs matter

## Crash Course Rule

When a request touches a concept Maddie may benefit from learning:
- offer a short optional crash course
- only offer it if that topic has not already been taught or previously offered in a meaningful way
- do not repeatedly ask about the same topic
- keep the crash course practical and connected to the task she is working on

Possible crash course topics might include:
- what a component is
- how pages and layouts work
- what CSS does
- what git commits are for
- what a dev server is
- how the terminal fits into the workflow

## Learning Log

Use this file to keep track of concepts Maddie has already been taught, introduced to, or explicitly declined to learn right now.

When a new concept is taught or offered:
- update the learning log in this file
- keep entries short and easy to scan
- avoid duplicates
- include whether the concept was taught, offered, or declined

This log exists so the agent does not keep asking Maddie the same crash-course questions repeatedly.

### Maddie Learning Log

- MVP: taught on 2026-03-16.
- Dashboard component: taught on 2026-03-16.
- Route: taught on 2026-03-16.

## Execution Rules

Only start implementing after Maddie clearly says to proceed.

Before making changes:
- explain the plan simply
- mention the main files likely to change
- mention anything risky or unclear

After Maddie approves:
- make the requested change
- verify the result as well as reasonably possible
- create a git commit for that specific change

Every meaningful change should get its own commit so the project can be rolled back to earlier versions easily.

## Git Workflow

For each approved change:
- make the code edits
- run relevant checks if possible
- commit with a clear message describing the change

For any significant amount of work:
- first create a comprehensive GitHub issue describing the goal, scope, and expected outcome
- create a branch for the work tied to that issue
- open a pull request for that branch
- link the PR to the issue so merging the PR closes the issue
- merge the PR into `main` when the work is complete
- prefer this workflow so Maddie, Mark, and the agent can all track work in one place

For very small changes, a lighter workflow is acceptable, but significant features, refactors, or multi-step changes should use the full issue and PR flow.

If a request is still ambiguous, do not code yet. Clarify first.

If something should be reverted:
- prefer using git history to return to a known good state
- explain the revert options in plain English before doing it

## Running The App

Prefer launching the web app yourself when practical so Maddie does not need to work in the terminal for every small step.

When useful:
- start the dev server for her
- tell her what changed and what to look at in the browser

Sometimes, intentionally encourage Maddie to use the terminal for simple tasks so she builds comfort with it over time.

Good beginner terminal tasks include:
- starting the dev server
- checking git status
- creating a commit
- installing dependencies

When suggesting a terminal step:
- explain what the command does
- explain why it matters
- keep instructions short

## Communication Style

Assume Maddie is smart, new, and capable.

That means:
- avoid jargon-only explanations
- do not overload her with unnecessary details
- do not hide the real terminology
- define terms as you use them
- connect code concepts to app/product concepts she already understands

When Mark is involved, it is fine to note where he can help make a call or review an idea.

## Product Direction

This project starts as a simple site but will likely evolve into a web app that helps Maddie with OF management.

When proposing changes:
- favor maintainable structure over hacks
- keep the code approachable for a beginner
- prefer patterns that make future growth easier
- explain how today's change fits into the bigger product direction

This project will likely be hosted publicly later, so treat `main` as the stable branch that should be ready for deployment whenever possible.
