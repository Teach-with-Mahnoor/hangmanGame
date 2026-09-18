# Hangman Game — CodeAlpha Python Internship (Task 1)

A premium, browser-based Hangman game built with **Python + Flask** and a modern
dark **3D-style interface** (glassmorphism, neon glow, particles, parallax and an
animated SVG hangman).

The complete game logic lives in **Python** — the browser is only the display.
There is no database, no external API and no frontend framework.

---

## Features

- Exactly **5 predefined words** — chosen randomly with Python's `random`
- Classic Hangman rules: **maximum 6 incorrect guesses**
- Animated SVG hangman — one body part is drawn per wrong guess (head, body,
  two arms, two legs), with stroke-draw + fade animation
- Premium dark UI: glassmorphism cards, glowing orbs, floating particles,
  subtle parallax and 3D card tilt
- Word tiles that light up and lift when a letter is revealed
- **Virtual QWERTY keyboard** (unused / correct / incorrect / disabled states)
  plus full **physical keyboard** support (type a letter, press Enter)
- Live statistics: **ATTEMPTS · WRONG GUESSES · SCORE · STREAK** — all computed
  by the Python backend, nothing is fake
- Toast notifications (no annoying browser alerts)
- **How to Play** modal with the 5 game rules
- Win experience: "YOU WON!" overlay with confetti + **PLAY AGAIN**
- Loss experience: "GAME OVER" overlay showing the secret word + **TRY AGAIN**
- Fully responsive layout (desktop, laptop, tablet, small widths)
- Input validation on the frontend **and** in the backend
- Works in any modern browser — designed and tested for **Google Chrome**

---

## Technologies

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Backend   | Python 3, Flask, `random`, `threading`, `winreg` |
| Frontend  | HTML5, CSS3 (animations, SVG, transforms), Vanilla JavaScript |
| Styling   | No external fonts, images or libraries       |
| Database  | None (not required)                          |
| APIs      | None (not required)                          |

---

## Project structure

```text
CodeAlpha_HangmanGame/
│
├── app.py                  # Flask backend + ALL Hangman game logic
├── README.md               # This documentation
├── requirements.txt        # Python dependency (Flask)
│
├── templates/
│   └── index.html          # The game page
│
├── static/
│   ├── css/
│   │   └── style.css       # Premium dark 3D-style design
│   └── js/
│       └── script.js       # UI rendering, animations, fetch() calls
│
└── screenshots/            # Screenshots of the finished game
```

---

## Installation

1. **Install Python 3** (version 3.8 or newer) from
   [python.org](https://www.python.org/downloads/) — make sure the box
   *"Add Python to PATH"* is checked during installation.

2. **Install Flask** (the only dependency):

   ```bash
   pip install -r requirements.txt
   ```

---

## How to run

Start the game with a single command:

```bash
python app.py
```

Then:

- Flask starts a local server at **http://127.0.0.1:5000**
- **Google Chrome opens automatically** and loads the game
- (If Chrome cannot be detected, the default browser is used instead.
  You can also start the server without auto-opening with
  `python app.py --no-browser` and open the URL manually.)

To stop the game, press `Ctrl+C` in the terminal window.

---

## How to play

1. Guess one letter at a time — click a key on the virtual keyboard, or type
   on your physical keyboard and press **Enter**.
2. Correct letters appear in the word.
3. Incorrect guesses build the Hangman, one body part per mistake.
4. You have **6 incorrect guesses** — after that, the round is lost.
5. Guess the complete word before all 6 attempts are used to win the round.

---

## Scoring (calculated in Python)

| Event                             | Points                        |
|-----------------------------------|-------------------------------|
| Every correct letter              | +100                          |
| Each unused attempt when you win  | +150 (win bonus)              |
| Win a round                       | Streak +1                     |
| Lose a round                      | Streak resets to 0            |

The **streak survives new games** so you can build a winning run; the round
score resets with every new word.

---

## How it works (architecture)

```text
Chrome (index.html + style.css + script.js)
        │  fetch()  →  /api/guess {"letter": "p"}
        ▼
Flask (app.py)  →  HangmanGame.process_guess("p")
        │  validates input, updates letters / attempts / score / streak
        ▼
        JSON state  →  script.js re-renders the UI
```

- The **browser never decides the rules** — it only sends letters and displays
  the state returned by Python.
- Every guess is validated in the backend: empty input, multiple letters,
  non-alphabet characters and duplicate letters all get proper messages.

### API endpoints

| Route               | Method | Purpose                              |
|---------------------|--------|--------------------------------------|
| `/`                 | GET    | Serves the game page                 |
| `/api/state`        | GET    | Current game state (JSON)            |
| `/api/new`          | POST   | Starts a new round with a new word   |
| `/api/guess`        | POST   | Processes one guessed letter         |

---

## CodeAlpha task requirements checklist

- [x] Python — entire game logic implemented in Python
- [x] `random` — random word selection
- [x] Loops, if/else, strings, lists — used throughout the logic
- [x] User input — letter guesses from the player
- [x] Maximum 6 incorrect guesses
- [x] Exactly 5 predefined words: `python, coding, computer, developer, program`
- [x] No external word API
- [x] No database
- [x] Runs with a single command: `python app.py`
- [x] Runs in Google Chrome at `http://127.0.0.1:5000`

---

## Credits

Built as **Task 1 — Hangman Game** for the
**CodeAlpha Python Programming Internship**.
