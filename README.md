# LeetCode Study — Cross-Device NeetCode 150 Study System

A Progressive Web App (PWA) + Anki flashcard system for mastering the NeetCode 150 problems. Study on your phone, laptop, or any device with a browser.

## ✨ Features

- 📱 **PWA** — Install on phone, works offline, responsive mobile-first design
- 🔄 **Spaced Repetition** — Built-in SM-2 algorithm schedules reviews for optimal retention
- 🧠 **Quiz Mode** — Pattern recognition, complexity identification, approach recall
- 📝 **Code Solutions** — Python + JavaScript with syntax highlighting
- 📊 **Progress Dashboard** — Track mastery across all 15 categories
- 🌙 **Dark/Light Mode** — System-aware with manual toggle
- 🔗 **Cross-Device Sync** — Export/import progress as JSON
- 🃏 **Anki Decks** — Generate .apkg flashcard files for Anki

## 🚀 Getting Started

### Run Locally

```bash
# Clone the repo
git clone <your-repo-url>
cd leetcode-study

# Build the problem data
npm run build

# Start the dev server
npm run dev
# Open http://localhost:8080
```

### Deploy to GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages → Source: Deploy from branch (main)
3. Your site will be live at `https://yourusername.github.io/leetcode-study/`

### Generate Anki Decks

```bash
# Install Python dependency
pip install genanki

# Generate .apkg file
npm run generate-anki

# Import neetcode-150.apkg into Anki on any device
```

## 📖 Study Workflow

### On Laptop (deep study)
1. Open the PWA in your browser
2. Browse problems by category
3. Read hints progressively, try solving before revealing the solution
4. Write your own notes for each problem
5. Rate your understanding (Again/Hard/Good/Easy) to schedule reviews

### On Phone (review & quiz)
1. Open the PWA or use Anki mobile app
2. Review due flashcards during commute/breaks
3. Take pattern recognition quizzes
4. Check your progress dashboard

### Syncing Between Devices
1. On Device A: Settings → Export Progress → Save JSON file
2. Transfer the file (email, cloud drive, AirDrop, etc.)
3. On Device B: Settings → Import Progress → Load JSON file

## 🗂️ NeetCode 150 Categories

| Category | Count |
|----------|-------|
| Arrays & Hashing | 9 |
| Two Pointers | 5 |
| Sliding Window | 6 |
| Stack | 7 |
| Binary Search | 7 |
| Linked List | 11 |
| Trees | 15 |
| Tries | 3 |
| Heap / Priority Queue | 7 |
| Backtracking | 9 |
| Graphs | 13 |
| Dynamic Programming | 12 |
| 2-D Dynamic Programming | 11 |
| Greedy | 8 |
| Intervals | 6 |
| Math & Bit Manipulation | 8 |
| Advanced Graphs | 6 |

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules)
- **Styling**: Mobile-first CSS with custom properties
- **Storage**: IndexedDB for progress persistence
- **Offline**: Service Worker with cache-first strategy
- **Spaced Repetition**: SM-2 algorithm
- **Code Highlighting**: Prism.js
- **Anki**: Python + genanki

## 📁 Project Structure

```
leetcode-study/
├── public/              # Static assets served to browser
│   ├── index.html       # App shell
│   ├── manifest.json    # PWA manifest
│   ├── sw.js            # Service worker
│   ├── icons/           # PWA icons
│   └── styles/main.css  # All styles
├── src/
│   ├── app.js           # Main entry point + router
│   ├── components/      # UI components
│   ├── data/            # Problem & pattern JSON data
│   ├── lib/             # Storage + spaced repetition
│   └── utils/           # Helper functions
├── scripts/
│   ├── build.js         # Merges problem data
│   └── generate-anki.py # Generates Anki decks
└── README.md
```

## License

MIT
