#!/usr/bin/env python3
"""
Generate Anki flashcard decks (.apkg) from LeetCode problem data.
Requires: pip install genanki
Usage: python3 scripts/generate-anki.py
"""

import json
import os
import sys
import hashlib

try:
    import genanki
except ImportError:
    print("Installing genanki...")
    os.system(f"{sys.executable} -m pip install genanki --quiet")
    import genanki


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(ROOT_DIR, "src", "data")


def stable_id(name):
    """Generate a stable numeric ID from a string."""
    return int(hashlib.md5(name.encode()).hexdigest()[:8], 16)


# Card templates
PROBLEM_MODEL = genanki.Model(
    stable_id("lc-study-problem-v1"),
    "LC Problem → Approach",
    fields=[
        {"name": "Title"},
        {"name": "Category"},
        {"name": "Difficulty"},
        {"name": "Patterns"},
        {"name": "Approach"},
        {"name": "KeyInsight"},
        {"name": "SolutionPython"},
        {"name": "TimeComplexity"},
        {"name": "SpaceComplexity"},
    ],
    templates=[
        {
            "name": "Problem → Approach",
            "qfmt": """
<div class="card front">
  <div class="difficulty {{Difficulty}}">{{Difficulty}}</div>
  <h2>{{Title}}</h2>
  <div class="category">{{Category}}</div>
  <div class="patterns">{{Patterns}}</div>
</div>
""",
            "afmt": """
<div class="card back">
  <div class="difficulty {{Difficulty}}">{{Difficulty}}</div>
  <h2>{{Title}}</h2>
  <hr>
  <h3>Approach</h3>
  <p>{{Approach}}</p>
  <h3>Key Insight</h3>
  <p class="insight">{{KeyInsight}}</p>
  <h3>Solution (Python)</h3>
  <pre><code>{{SolutionPython}}</code></pre>
  <div class="complexity">
    <span>⏱️ {{TimeComplexity}}</span>
    <span>💾 {{SpaceComplexity}}</span>
  </div>
</div>
""",
        }
    ],
    css="""
.card { font-family: -apple-system, system-ui, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
.front { text-align: center; }
h2 { margin: 10px 0; }
h3 { color: #0d9488; margin: 15px 0 5px; }
.category { color: #6b7280; margin: 5px 0; }
.patterns { color: #8b5cf6; font-size: 0.9em; }
.difficulty { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.8em; font-weight: bold; color: white; }
.difficulty.Easy { background: #22c55e; }
.difficulty.Medium { background: #f59e0b; }
.difficulty.Hard { background: #ef4444; }
.insight { background: #f0fdf4; padding: 10px; border-left: 3px solid #22c55e; border-radius: 4px; }
pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 0.85em; }
.complexity { display: flex; gap: 20px; margin-top: 10px; color: #6b7280; }
hr { border: none; border-top: 1px solid #e5e7eb; }
""",
)

PATTERN_MODEL = genanki.Model(
    stable_id("lc-study-pattern-v1"),
    "LC Pattern → Template",
    fields=[
        {"name": "PatternName"},
        {"name": "Description"},
        {"name": "WhenToUse"},
        {"name": "TemplatePython"},
        {"name": "TimeComplexity"},
        {"name": "SpaceComplexity"},
    ],
    templates=[
        {
            "name": "Pattern → Template",
            "qfmt": """
<div class="card front">
  <h2>🗂️ {{PatternName}}</h2>
  <p>When would you use this pattern?<br>What's the code template?</p>
</div>
""",
            "afmt": """
<div class="card back">
  <h2>🗂️ {{PatternName}}</h2>
  <hr>
  <p>{{Description}}</p>
  <h3>When to Use</h3>
  {{WhenToUse}}
  <h3>Template (Python)</h3>
  <pre><code>{{TemplatePython}}</code></pre>
  <div class="complexity">
    <span>⏱️ {{TimeComplexity}}</span>
    <span>💾 {{SpaceComplexity}}</span>
  </div>
</div>
""",
        }
    ],
    css=PROBLEM_MODEL.css,
)


def load_problems():
    """Load problem data from JSON files."""
    combined_path = os.path.join(DATA_DIR, "problems.json")
    if os.path.exists(combined_path):
        with open(combined_path) as f:
            return json.load(f)

    problems = []
    for part in ["problems-part1.json", "problems-part2.json"]:
        path = os.path.join(DATA_DIR, part)
        if os.path.exists(path):
            with open(path) as f:
                problems.extend(json.load(f))
    return sorted(problems, key=lambda p: p["id"])


def load_patterns():
    """Load pattern data from JSON file."""
    path = os.path.join(DATA_DIR, "patterns.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


def create_problem_deck(problems):
    """Create Anki deck with problem cards."""
    deck = genanki.Deck(stable_id("lc-neetcode-150"), "NeetCode 150 — Problems")

    for p in problems:
        note = genanki.Note(
            model=PROBLEM_MODEL,
            fields=[
                p["title"],
                p["category"],
                p["difficulty"],
                ", ".join(p.get("patterns", [])),
                p.get("approach", ""),
                p.get("key_insight", ""),
                p.get("solution_python", ""),
                p.get("time_complexity", ""),
                p.get("space_complexity", ""),
            ],
            tags=[
                p["category"].replace(" ", "_").replace("/", "_"),
                p["difficulty"],
                "NeetCode150",
            ],
        )
        deck.add_note(note)

    return deck


def create_pattern_deck(patterns):
    """Create Anki deck with pattern cards."""
    deck = genanki.Deck(stable_id("lc-patterns"), "NeetCode 150 — Patterns")

    for p in patterns:
        when_to_use = "<ul>" + "".join(f"<li>{w}</li>" for w in p.get("when_to_use", [])) + "</ul>"
        note = genanki.Note(
            model=PATTERN_MODEL,
            fields=[
                p["name"],
                p.get("description", ""),
                when_to_use,
                p.get("template_python", ""),
                p.get("time_complexity", ""),
                p.get("space_complexity", ""),
            ],
            tags=["Pattern", p["name"].replace(" ", "_")],
        )
        deck.add_note(note)

    return deck


def main():
    print("🃏 Generating Anki decks...\n")

    problems = load_problems()
    patterns = load_patterns()

    print(f"  Loaded {len(problems)} problems")
    print(f"  Loaded {len(patterns)} patterns\n")

    output_dir = ROOT_DIR
    decks = []

    if problems:
        deck = create_problem_deck(problems)
        decks.append(deck)
        print(f"  ✓ Problem deck: {len(problems)} cards")

    if patterns:
        deck = create_pattern_deck(patterns)
        decks.append(deck)
        print(f"  ✓ Pattern deck: {len(patterns)} cards")

    if decks:
        output_path = os.path.join(output_dir, "neetcode-150.apkg")
        package = genanki.Package(decks)
        package.write_to_file(output_path)
        print(f"\n📦 Saved to: {output_path}")
        print(f"   Import this file into Anki on any device!")
    else:
        print("⚠️  No data found. Run 'npm run build' first to generate problems.json")


if __name__ == "__main__":
    main()
