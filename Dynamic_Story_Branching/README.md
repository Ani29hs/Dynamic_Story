# Slush Story Engine

A branching interactive fiction platform — write, publish, and play choose-your-own-adventure stories with dynamic narrative paths.

---

## What Is This?

Slush Story Engine is a web application that lets:
- Admins write and publish branching narrative stories using a node-based scene editor.
- Readers play those stories, earn XP, use retreat tokens to rewind scenes, and pitch their own story ideas.

Think of it as your personal interactive story publishing studio meets reading platform, built entirely on HTML, CSS, Vanilla JavaScript, and json-server.

---

## Bored? Here Is How This Cures It

- Play a branching mystery story — every choice takes you down a different path!
- Earn XP as you complete stories and submit pitches.
- Time-Warp Retreat — rewind a scene if you regret your last choice.
- Pitch your own story idea — the admin might turn it into a full story!
- Create your own stories — become the admin and build a multi-path narrative with scenes and choices.

---

## Future Scope

| Feature | Description |
|---|---|
| Real Backend | Replace json-server with Node.js + Express + MongoDB |
| Multiple Endings Showcase | Visual endings gallery per story |
| Comments on Stories | Readers leave reviews and ratings |
| Achievement Badges | Unlock badges for completing stories and earning XP |
| Notifications | Admin notifies readers when a new story is published |
| Mobile App | React Native version |
| Multi-Author Support | Multiple admins collaborating on the same story |
| Audio Mode | Text-to-speech for story narration |
| Custom Themes | Readers pick their preferred UI theme |
| Story Analytics | Admin sees reads, completion rate, and popular choices |

---

## How to Start the Project

### Prerequisites
- Node.js installed (v18+)
- VS Code with Live Server extension

---

### Step 1 — Install Dependencies

```bash
npm install
```

---

### Step 2 — Start the JSON Server Backend

```bash
npx json-server db.json --port 3000
```

Backend runs at: http://localhost:3000

Available endpoints:
- /Users
- /Stories
- /ReaderStories

---

### Step 3 — Start the Frontend

Use VS Code Live Server (Go Live button), OR run:

```bash
python -m http.server 5500
```

App opens at: http://127.0.0.1:5500/Dynamic_Story_Branching/Landing.html

---

## Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | admin123 |
| Reader | Register a new account | Your chosen password |

---

## User Flow

```
Landing Page
    |
    |-- Sign Up --> login.html --> Reader Library
    |
    +-- Login
          |
          |-- Admin Role --> Admin Dashboard
          |
          +-- Reader Role --> Reader Library
```

---

# ADMIN FEATURES

---

## 1. Admin Dashboard — Stories Tab

Shows all stories (draft + published) as cards.

Each card shows:
- Cover image, genre badge, status badge (PUBLISHED / DRAFT)
- Title, Author, description snippet, scene count
- 3 action buttons: Edit | Preview | Delete

Clicking "Read More" opens a Story Showcase Modal with full synopsis, cover art, scene count, and Edit/Back buttons.

---

## 2. Admin Dashboard — Reader Pitches Tab

Shows all reader-submitted story pitches.

Admin can:
- Approve — marks pitch as approved and notifies reader
- Reject — marks pitch as rejected and notifies reader
- Leave a comment (e.g. "Will Consider", "Loved the idea!")

---

## 3. Story Editor

Full story creation and editing interface.

### Story Metadata

Fill in:
- Story Title — displayed on cards and in the library
- Author Name — shown as "BY Author" on cards
- Genre — Fantasy, Mystery, Horror, Adventure, Sci-Fi
- Story Description — synopsis text shown in cards and the modal
- Cover Image URL — cover art image

Click "SAVE STORY METADATA" — saves the story as Draft (Private) to db.json.
Readers cannot see draft stories. Only the admin sees them on the dashboard.

### Scene Node Editor

- Click "+ Add Scene Node" to add a scene.
- Each node has: Title, Scene Text, Location, Characters, and an optional Ending toggle.
- The first node added automatically becomes the Start Node.
- Click "Set as Start" on any non-ending node to reassign the starting point.
- Nodes connect via Choices (edges) forming the branching narrative graph.
- Add / Edit / Remove choices and nodes inline.

### Publishing a Story

Click the "Publish Story" button at the top right.

Requirements before publishing:
1. Story metadata must be saved (title, author, genre, description)
2. At least 1 Scene Node must be added

Once published, the story status becomes "published" in db.json and it instantly appears in the Reader Library for all readers.

---

# READER FEATURES

---

## 1. Reader Library

Displays all published stories as a card grid.

- Search bar — search by title or author name
- Genre Filter — filter by Fantasy, Mystery, Horror, etc.
- Click any story card to start playing

---

## 2. Story Player

- Story loads from db.json starting at the designated Start Node
- Scene text, location, and characters are displayed
- Choice buttons appear — clicking a choice navigates to the next scene
- Ending nodes display a completion screen with the ending type (Good / Bad / Neutral)

### XP System

| Action | XP Earned |
|---|---|
| Complete a story (first time only) | +5 XP |
| Submit a story pitch (once per day) | +20 XP |
| Use Time-Warp Retreat | -5 XP (first use per story is FREE) |

XP is saved to both localStorage and db.json so it persists across sessions.

---

## 3. Time-Warp Retreat

The Time-Warp Retreat button appears during story playback.

- First use per story: FREE — no XP deducted
- Subsequent uses: -5 XP each
- Rewinds the reader back to the previous scene in the traversal path
- Retreat history is synced to localStorage and db.json

---

## 4. Submit a Story Pitch

Switch to the "Submit Pitch" tab on the Reader Library page.

Steps:
1. Enter your Story Title
2. Select a Genre
3. Write a Pitch Description (minimum 20 characters)
4. Click "SUBMIT MY PITCH"

On success:
- +20 XP is awarded (limited to once per calendar day)
- Pitch is saved to db.json under ReaderStories
- You are automatically redirected to My Pitches tab after 2 seconds

---

## 5. My Pitches

Track all your submitted pitches in the "My Pitches" tab.

Each pitch card shows:
- Title, genre badge, submission date
- Status badge: PENDING | APPROVED | REJECTED
- Admin comment if the admin left feedback
- Delete button to permanently remove the pitch

Note: If the admin removes a pitch from the Admin Dashboard, it appears as REJECTED in your My Pitches view so you always know the decision.

---

## Project Structure

```
Dynamic_Story_Branching/
|-- Landing.html              Landing / homepage
|-- db.json                   JSON Server database file
|-- package.json              npm dependencies
|
|-- css/
|   |-- admin.css             Admin dashboard styles
|   |-- reader.css            Reader page styles
|   |-- stories.css           Story editor styles
|   |-- login.css             Login and signup styles
|   +-- style.css             Global / shared styles
|
|-- js/
|   |-- admin.js              Admin dashboard logic (stories, pitches, modals)
|   |-- stories.js            Story editor logic (metadata, nodes, choices, publish)
|   |-- reader.js             Reader library, story player, XP, retreat, pitches
|   |-- preview.js            Admin story preview logic
|   |-- login.js              Login authentication
|   +-- signup.js             User registration
|
+-- pages/
    |-- admin/
    |   |-- admin.html        Admin Dashboard (stories + pitches)
    |   |-- add_stories.html  Story Editor (metadata + scene graph)
    |   +-- preview.html      Admin Story Preview
    |-- auth/
    |   |-- login.html        Login Page
    |   +-- signup.html       Signup / Registration Page
    +-- reader/
        |-- stories.html      Reader Library + Pitch Submission System
        +-- play.html         Interactive Story Playback Engine
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Structure | HTML5 |
| Styling | Vanilla CSS (custom design system) |
| Logic | Vanilla JavaScript (ES6+) |
| Backend / API | json-server v1 beta |
| Database | db.json flat JSON file |
| State Management | localStorage synced with json-server |

---

## Data Schema (db.json)

```json
{
  "Users": [
    {
      "id": "1",
      "name": "Admin",
      "email": "admin@gmail.com",
      "password": "admin123",
      "role": "Admin",
      "xp": 100,
      "completedStories": [],
      "usedFreeRetreatStories": []
    }
  ],
  "Stories": [
    {
      "id": "story_123",
      "title": "The Lost Kingdom",
      "author": "Admin",
      "genre": "adventure",
      "status": "published",
      "description": "A branching adventure...",
      "imageURL": "https://example.com/cover.jpg",
      "nodes": [],
      "startNodeId": null
    }
  ],
  "ReaderStories": [
    {
      "id": "pitch_456",
      "title": "My Story Idea",
      "genre": "fantasy",
      "description": "Once upon a time...",
      "submittedBy": "Reader Name",
      "submittedById": "user_id",
      "status": "pending",
      "adminComment": "",
      "submittedAt": "2026-08-23T14:00:00.000Z"
    }
  ]
}
```

---

Built with love — Slush Story Engine