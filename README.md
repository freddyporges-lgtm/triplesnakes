# Triple Snakes Scorekeeper

A real-time, multiplayer digital scorekeeper for [Triple Snakes](https://www.kickstarter.com/projects/2070044443/triple-snakes) — a dice-rolling game I created with friends in NYC and brought to life through Kickstarter.

## Background

Triple Snakes is a physical dice game I designed and launched on [Kickstarter in January 2021](https://www.kickstarter.com/projects/2070044443/triple-snakes), raising over $8,000 from 63 backers against a $1,000 goal. The game was born out of late nights with friends in NYC — inspired by Yahtzee but evolved through years of playtesting into its own thing. I handled everything end-to-end: game design, Kickstarter campaign, trademark filing, fulfillment (shipped game sets myself via USPS), eCommerce via Shopify, and marketing through Google and Meta ads.

This web app is the latest chapter — a digital scorekeeper I built as a side project to make it easier for people to track games without pen and paper. 

## The Game

Players roll 4 dice, racing to score exactly **100 points**. Key mechanics:

- **Match scoring** — pairs, triples, and quads score face value multiplied by count
- **Triple Snakes** (three 1s) — the signature move: choose to take 3 points *or* leapfrog to tie the leader's score
- **Snake Eyes** (two 1s) — score zero for the round
- **Bust** — go over 100 and you drop back to 77
- **Rebuttal** — when someone hits 100, everyone else gets one last shot to tie
- **Roll-offs** — tied players settle it head-to-head

The physical game set includes custom dice (designed to look like ice cubes) in a carrying pouch. Full rules at [gamerules.com/triple-snakes](https://gamerules.com/triple-snakes/).

## What This App Does

- Turn-by-turn score entry with all 7 outcome types (match, double-double, four-of-a-kind, straight, triple snakes, snake eyes, zero)
- Full game phase management: normal play, rebuttal, winner's roll-off, loser's roll-off
- Real-time multiplayer via Firebase — one host runs the game, others join as viewers with a room code
- Interactive tutorial that walks new players through a full sample game
- Game log with color-coded events
- Mobile-first responsive design

## Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite** — build tooling
- **Firebase Realtime Database** — multiplayer state sync
- **Framer Motion** — animations
- **Tailwind CSS** — styling
- **Netlify** — hosting

## Running Locally

```bash
npm install
npm run dev
```

## About Me

I'm a product manager by trade. Building things is my hobby — whether it's a physical dice game, a web app, or whatever else catches my interest. Triple Snakes started as a game I played with friends and turned into a Kickstarter, a small business, and now a software project. This repo is a reflection of that: a side project built for fun, not profit.
