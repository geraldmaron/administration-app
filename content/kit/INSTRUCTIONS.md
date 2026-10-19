# The Administration — scenario authoring kit a7efc120fd33

You are writing crisis scenarios for The Administration, a political simulation game in which the player
is the President of the United States. You do not need the game's code: this kit carries every rule the
game's validator will hold your work to. Your output is one JSON file. It is checked by the same gate every
scenario faces; whatever fails comes back to you as a findings file naming each defect.

These instructions work in any assistant or by hand. Paste this file as the system or project instructions
and attach the rest of the kit, or read the files in order yourself. In the game's repository the kit is the
folder content/kit/, kept current with every change to the rules or the shipped corpus, so a session that can
read the repository needs nothing else.

## The files

- INSTRUCTIONS.md: this file.
- BRIEF.md: the full writing brief. Register, the numbered gates (the validator enforces every one), craft,
  impact, context and binding. Read it in full before writing anything.
- CATALOG.md: the classes, severities and casts, with the extra rules some casts carry.
- DIRECTORS.md: which director's register each cell is written in, and each director's notes.
- DOCTRINE.md: the content doctrine a writer needs: the score, what content can move, craft, realism,
  ripples, register, time and tense.
- EXEMPLARS.json: shipped scenarios that set the bar. Match their register and length.
- CORPUS.md: what the game already has, by class: every id, subject and opening line.
- NEEDS.md: what the corpus is short of: suggested cells, arcs waiting for a reader, the mix by class, and
  the contested issues not to write about yet.
- DEEDS.md: choices players have already made that a new scenario can answer months later. Search it for
  your class; it is long.
- scenario.schema.json: the JSON Schema of the output file, generated from the game's own schema. It
  checks shape only; the gate checks much more.
- TEMPLATE.json: the empty output file, with this kit's version filled in.

## How to work

1. Read BRIEF.md, DOCTRINE.md and CATALOG.md in full, then EXEMPLARS.json.
2. Choose cells. A cell is a class, a severity and a cast pick from CATALOG.md; see "Choosing what to
   write" below.
3. Find your cell's director in DIRECTORS.md and read that director's notes.
4. Read your class's section of CORPUS.md. A subject, opening line or phrase that is already there is a
   defect. Do not open a scenario on the word "The".
5. Write each scenario in the order BRIEF.md's WRITE IN THIS ORDER section gives.
6. Before you hand over, check every scenario against each numbered gate in BRIEF.md, one at a time.

## Choosing what to write

- Given cells: use them.
- Given a topic ("a port strike", "the census"): find the class whose scope in CATALOG.md the week would be
  filed under if someone read it cold, then take the cast and severity NEEDS.md says that class is shortest
  of, unless the topic itself decides them (a week with no foreign government in it is cast "none"). Read
  that class in CORPUS.md first; if the topic is already covered, find the angle it does not have.
- Given nothing: take cells from NEEDS.md in its order. A reader for a dead arc branch comes first; its
  scenario gates on that branch's flag, and DEEDS.md says what the setter left behind.
- Never write about an issue NEEDS.md lists as not yet open.

## The output file

One JSON document and nothing else, shaped like TEMPLATE.json:

    { "kind": "administration-scenario-batch", "kitVersion": "a7efc120fd33", "author": "<who or what wrote it>", "scenarios": [ ... ] }

- Copy "kind" and "kitVersion" exactly. A file carrying another version is refused unread.
- "scenarios" is an array of ScenarioDef objects. One file may hold several cells; each scenario's own
  "class", "severity" and "cast" decide its cell.
- Every "id" is new: not in CORPUS.md and not repeated in the file. Ids read as deeds ("the-dawn-crossing").
- Save it with any name ending in .json. If you cannot attach a file, print the JSON in a single code block
  so it can be saved as one.

## When findings come back

The findings file names each returned scenario and every defect against it. Fix those scenarios and return
a new file holding only them, with the same ids and the same kit version. Scenarios not named have been
accepted; do not send them again.

If the file is refused because the kit version is stale, ask for a fresh kit and check your scenarios
against its BRIEF.md before sending them again.

## What the kit does not cover

Arc cells (a setter and its readers written as one chain) and set-pieces about one named country are written
inside the repository, where the job brief and an owner can bind them.
