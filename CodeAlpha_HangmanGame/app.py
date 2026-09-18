"""
CodeAlpha Hangman Game - Premium Chrome Edition
===============================================

A polished, browser-based Hangman game built for the CodeAlpha Python
Programming Internship (Task 1).

Architecture (kept simple and readable):

  * app.py                 -> Flask backend + ALL Hangman logic (pure Python)
  * templates/index.html   -> the game page
  * static/css/style.css   -> premium dark 3D-style design
  * static/js/script.js    -> UI, animations and fetch() calls to the backend

Run the game with:

    python app.py

Flask starts at http://127.0.0.1:5000 and Chrome opens automatically.

CodeAlpha compliance: Python + random + lists + strings + loops + if/else,
exactly 5 predefined words, maximum 6 incorrect guesses, user input.
"""

import random
import subprocess
import sys
import threading
import time
import webbrowser

from flask import Flask, jsonify, render_template, request

# ---------------------------------------------------------------------------
# Game configuration
# ---------------------------------------------------------------------------

# The 5 predefined words required by the internship task.
WORDS = ["python", "coding", "computer", "developer", "program"]

# The player is allowed exactly 6 incorrect guesses.
MAX_ATTEMPTS = 6

# Scoring rules (real values - the interface displays what Python calculates).
POINTS_PER_LETTER = 100          # points for every correct letter
POINTS_PER_SPARE_ATTEMPT = 150   # win bonus for every unused attempt

HOST = "127.0.0.1"
PORT = 5000
GAME_URL = f"http://{HOST}:{PORT}/"

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Game logic (pure Python - the browser is only a display)
# ---------------------------------------------------------------------------

class HangmanGame:
    """Everything about one round: the word, the guesses, the score."""

    def __init__(self):
        self.streak = 0            # consecutive wins - survives new games
        self.start_new_game()

    def start_new_game(self):
        """Reset the round and pick a new random word."""
        self.secret_word = random.choice(WORDS)
        self.status = "playing"          # playing / won / lost
        self.guessed_letters = []        # every letter the player tried
        self.correct_letters = []        # letters that are in the word
        self.wrong_letters = []          # letters that are not in the word
        self.attempts_left = MAX_ATTEMPTS
        self.score = 0                   # points earned in this round
        self.set_message("New round started. Guess a letter!", "info", True)

    def process_guess(self, raw_letter):
        """Validate one guessed letter and update the game state."""
        if not isinstance(raw_letter, str):
            raw_letter = ""
        letter = raw_letter.strip().lower()

        if self.status != "playing":
            self.set_message("This round is over. Start a new game!", "warning", True)
            return

        # --- Validation of the input (the backend never trusts the browser) ---
        if letter == "":
            self.set_message("Please enter one letter.", "warning", False)
        elif len(letter) > 1:
            self.set_message("Please enter only one letter at a time.", "warning", False)
        elif not letter.isalpha():
            self.set_message("Please enter a valid alphabet letter.", "warning", False)
        elif letter in self.guessed_letters:
            self.set_message("You already guessed that letter.", "warning", True)
        else:
            self.apply_letter(letter)

    def apply_letter(self, letter):
        """Register a new, valid letter and check for win or loss."""
        self.guessed_letters.append(letter)

        if letter in self.secret_word:
            self.correct_letters.append(letter)
            self.score += POINTS_PER_LETTER
            self.set_message(
                f"Good job! '{letter.upper()}' is in the word.", "success", True
            )
        else:
            self.wrong_letters.append(letter)
            self.attempts_left -= 1
            self.set_message(
                f"Sorry, '{letter.upper()}' is not in the word.", "danger", True
            )

        self.check_game_status()

    def check_game_status(self):
        """Detect a win (all letters guessed) or a loss (no attempts left)."""
        word_complete = all(c in self.correct_letters for c in self.secret_word)

        if word_complete:
            self.status = "won"
            self.score += self.attempts_left * POINTS_PER_SPARE_ATTEMPT
            self.streak += 1
            self.set_message(
                f"You guessed the word '{self.secret_word.upper()}'!", "success", True
            )
        elif self.attempts_left == 0:
            self.status = "lost"
            self.streak = 0
            self.set_message(
                f"Out of attempts. The word was '{self.secret_word.upper()}'.",
                "danger", True,
            )

    def set_message(self, text, kind, clear_input):
        """kind is info / warning / success / danger; clear_input clears the textbox."""
        self.message = text
        self.message_type = kind
        self.clear_input = clear_input

    def get_state(self):
        """Return the whole game state as a dictionary (sent to Chrome as JSON)."""
        word_display = [
            c.upper() if c in self.correct_letters else "_"
            for c in self.secret_word
        ]
        game_finished = self.status in ("won", "lost")

        return {
            "status": self.status,
            "word_display": word_display,
            "attempts_left": self.attempts_left,
            "attempts_max": MAX_ATTEMPTS,
            "attempts_used": MAX_ATTEMPTS - self.attempts_left,
            "correct_letters": [c.upper() for c in self.correct_letters],
            "wrong_letters": [c.upper() for c in self.wrong_letters],
            "guessed_letters": [c.upper() for c in self.guessed_letters],
            "secret_word": self.secret_word.upper() if game_finished else None,
            "message": self.message,
            "message_type": self.message_type,
            "clear_input": self.clear_input,
            "score": self.score,
            "streak": self.streak,
        }


# The single game that the Flask server plays with.
GAME = HangmanGame()


# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    """Serve the game page."""
    return render_template("index.html")


@app.route("/api/state")
def api_state():
    """Return the current game state (used when the page loads)."""
    return jsonify(GAME.get_state())


@app.route("/api/new", methods=["POST"])
def api_new():
    """Start a new round with a new random word."""
    GAME.start_new_game()
    return jsonify(GAME.get_state())


@app.route("/api/guess", methods=["POST"])
def api_guess():
    """Process one guessed letter and return the updated game state."""
    data = request.get_json(silent=True) or {}
    GAME.process_guess(data.get("letter"))
    return jsonify(GAME.get_state())


# ---------------------------------------------------------------------------
# Opening the game in Chrome
# ---------------------------------------------------------------------------

def find_chrome_path():
    """Look up Chrome in the Windows registry. Returns None if not found."""
    try:
        import winreg  # only exists on Windows
    except ImportError:
        return None

    try:
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
        ) as key:
            return winreg.QueryValue(key, None)
    except OSError:
        return None


def open_in_chrome(url):
    """Open the URL in Chrome; fall back to the default browser if needed."""
    chrome_path = find_chrome_path()
    if chrome_path:
        try:
            subprocess.Popen([chrome_path, url])
            return
        except OSError:
            pass

    try:
        webbrowser.get("chrome").open(url)
        return
    except webbrowser.Error:
        pass

    webbrowser.open(url)  # last resort: whatever browser is the default


def open_browser_later(url):
    """Wait a moment so Flask is ready, then open Chrome."""
    time.sleep(1.0)
    open_in_chrome(url)


# ---------------------------------------------------------------------------
# Start everything
# ---------------------------------------------------------------------------

def main():
    """Start Flask and open the game in Chrome."""
    print("=" * 56)
    print("  CodeAlpha Hangman Game - Premium Chrome Edition")
    print(f"  Running at: {GAME_URL}")
    print("  Press Ctrl+C in this window to stop the game.")
    print("=" * 56)

    if "--no-browser" not in sys.argv:
        threading.Thread(target=open_browser_later, args=(GAME_URL,), daemon=True).start()

    app.run(host=HOST, port=PORT, debug=False)


if __name__ == "__main__":
    main()
