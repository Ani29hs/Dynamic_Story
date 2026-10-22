# Dynamic Story Engine — Backend API

Production Express.js & MongoDB Atlas REST API for the Dynamic Story Branching Engine.

---

## 📁 Architecture & File Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB Atlas Mongoose connection
├── controllers/
│   ├── authController.js     # User registration, login & profile
│   ├── storyController.js    # Story creation, scene graph & choices
│   ├── sessionController.js  # Reader progress & traversal path tracking
│   ├── pitchController.js    # Reader community pitch submissions
│   └── userController.js     # User management & XP updates
├── middleware/
│   └── authMiddleware.js     # JWT token verification
├── models/
│   ├── User.js               # User accounts & XP schema
│   ├── Story.js              # Branching stories, nodes & choices schema
│   ├── StorySession.js       # Reader sessions & choices history schema
│   └── ReaderStory.js        # Pitches schema
├── Routes/
│   ├── authRoutes.js         # /register, /login, /profile
│   ├── storyRoutes.js        # /Stories, /Stories/:id
│   ├── sessionRoutes.js      # /StorySessions, /StorySessions/:id
│   ├── pitchRoutes.js        # /ReaderStories, /ReaderStories/:id
│   └── userRoutes.js         # /Users, /Users/:id
├── scripts/
│   └── migrate_db.js         # Migration utility from db.json -> Atlas
├── .env                      # Environment config & MongoDB connection string
├── package.json              # Dependencies & npm scripts
├── readme.md                 # Backend documentation
└── server.js                 # Express application entrypoint
```

---

## 🚀 Running the Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.ftobp2r.mongodb.net/dynamic_stories?retryWrites=true&w=majority
SECRET_KEY=PASSKEY
```

### 3. Start Server
```bash
npm start
```
Server runs at `http://localhost:5000`.

---

## 📡 API Endpoints

### Authentication
- `POST /register` — Register new reader with bcrypt hashed password & receive JWT.
- `POST /login` — Authenticate credentials with bcrypt & receive JWT.
- `GET /profile` — Retrieve authenticated user profile (Protected with `Authorization: Bearer <token>`).

### Stories
- `GET /Stories` — List stories (supports `?status=published`).
- `GET /Stories/:id` — Retrieve full story tree with nodes and choices.
- `POST /Stories` — Create new story.
- `PATCH /Stories/:id` — Update story metadata or scene nodes.
- `PUT /Stories/:id` — Full replace of story object.
- `DELETE /Stories/:id` — Delete story.

### Reading Sessions
- `GET /StorySessions?userId=...&storyId=...` — Retrieve reader session.
- `POST /StorySessions` — Start or persist reading session.
- `PATCH /StorySessions/:id` — Update current node & choices traversal path.

### Community Pitches
- `GET /ReaderStories` — View community pitches.
- `POST /ReaderStories` — Submit reader story proposal.
- `PATCH /ReaderStories/:id` — Review, approve, or reject pitch with admin comments.
- `DELETE /ReaderStories/:id` — Remove pitch.
