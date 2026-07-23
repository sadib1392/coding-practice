# Verify every runnable code snippet shown in book/ch24.js.
# Same idea as ch2_verify.py, self-checking: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run.
# Engine-invoking snippets (pyttsx3, whisper, yt-dlp) need audio hardware,
# system voices, model downloads, or a network; they are shown in the chapter
# WITHOUT outputs and are deliberately not executed here. Everything below
# is stdlib only.
import io, contextlib, builtins, sys

fails = 0
def check(label, got, want):
    global fails
    ok = got == want
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        fails += 1
        print(f"     got:  {got!r}")
        print(f"     want: {want!r}")

def repl_seq(label, steps, expected):
    # steps: list of (code, is_stmt) sharing one namespace.
    # expected: list of repr/error strings for the non-statement steps.
    ns = {}
    got = []
    for code, is_stmt in steps:
        if is_stmt:
            exec(code, ns)
        else:
            try:
                got.append(repr(eval(code, ns)))
            except Exception as ex:
                got.append(f"{type(ex).__name__}: {ex}")
    check(label, got, expected)

def run(code, inputs=None):
    buf = io.StringIO()
    ns = {}
    real = builtins.input
    if inputs is not None:
        it = iter(inputs)
        builtins.input = lambda prompt='': next(it)
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, ns)
    finally:
        builtins.input = real
    return buf.getvalue().rstrip("\n")

print("=== section: Preparing text for speech ===")
check("expansion table program",
    run("""expansions = {'Mon': 'Monday', 'Feb': 'February', 'hrs': 'hours', 'appt': 'appointment'}
reminder = 'Dentist appt Mon Feb 9, allow 2 hrs'
spoken = []
for word in reminder.split():
    spoken.append(expansions.get(word, word))
print(' '.join(spoken))"""),
    "Dentist appointment Monday February 9, allow 2 hours")
repl_seq("get() hit vs punctuation miss",
    [("expansions = {'Mon': 'Monday', 'Feb': 'February', 'hrs': 'hours', 'appt': 'appointment'}", True),
     ("expansions.get('hrs', 'hrs')", False),
     ("expansions.get('hrs.', 'hrs.')", False)],
    ["'hours'", "'hrs.'"])

CHUNKS_DEF = """def chunks(text, cap):
    pieces = []
    line = ''
    for word in text.split():
        if line == '':
            line = word
        elif len(line) + 1 + len(word) <= cap:
            line = line + ' ' + word
        else:
            pieces.append(line)
            line = word
    if line != '':
        pieces.append(line)
    return pieces
"""
check("chunking program",
    run(CHUNKS_DEF + """
notice = 'The garage door code changes on the first Monday of every month'
for piece in chunks(notice, 24):
    print(len(piece), piece)"""),
    "20 The garage door code\n20 changes on the first\n21 Monday of every month")
# Property checks on the shown chunking: cap respected, no word broken.
ns = {}
exec(CHUNKS_DEF, ns)
notice = 'The garage door code changes on the first Monday of every month'
pieces = ns['chunks'](notice, 24)
check("chunking respects the 24-char cap", [p for p in pieces if len(p) > 24], [])
check("chunking never breaks a word", ' '.join(pieces).split(), notice.split())

print("=== section: Working with transcripts ===")
check("segments stand-in program",
    run("""segments = [
    {'start': 0.0, 'end': 3.5, 'text': 'Welcome back to the workshop'},
    {'start': 3.5, 'end': 8.0, 'text': 'today we are wiring the sensor'},
]
for seg in segments:
    print(seg['end'] - seg['start'], 'seconds:', seg['text'])"""),
    "3.5 seconds: Welcome back to the workshop\n4.5 seconds: today we are wiring the sensor")
check("words-per-minute program",
    run("""transcript = ('thanks everyone for joining today we have three items '
              'on the agenda the budget the hiring plan and the office move')
seconds = 9
words = len(transcript.split())
print(words, 'words in', seconds, 'seconds')
print('pace:', round(words * 60 / seconds), 'wpm')"""),
    "21 words in 9 seconds\npace: 140 wpm")
check("filler-cleaning program",
    run("""fillers = {'um', 'uh', 'er'}
raw = 'um so the er projector uh cable went um missing again'
kept = []
for word in raw.split():
    if word.lower() not in fillers:
        kept.append(word)
print(' '.join(kept))
print('cut', len(raw.split()) - len(kept), 'filler words')"""),
    "so the projector cable went missing again\ncut 4 filler words")

print("=== practice-question executable claims ===")
repl_seq("q7: expansion table miss on 'hrs.'",
    [("expansions = {'hrs': 'hours'}", True),
     ("expansions.get('hrs.', 'hrs.')", False),
     ("expansions.get('hrs', 'hrs')", False)],
    ["'hrs.'", "'hours'"])
repl_seq("q8: len(t) is 18 chars, len(t.split()) is 6 words",
    [("t = 'to be or not to be'", True),
     ("len(t)", False),
     ("len(t.split())", False)],
    ["18", "6"])
repl_seq("q9: no-arg split collapses whitespace",
    [("'  um   so  '.split()", False)],
    ["['um', 'so']"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Say it in full",
    run("""expansions = {'Dr.': 'Doctor', 'Ave.': 'Avenue', 'appt.': 'appointment'}
text = 'Your appt. with Dr. Okafor is on Maple Ave.'
spoken = []
for word in text.split():
    spoken.append(expansions.get(word, word))
print(' '.join(spoken))"""),
    "Your appointment with Doctor Okafor is on Maple Avenue")

EX2 = """text = 'Please collect your parcel from the front desk before noon'
line = ''
for word in text.split():
    if line == '':
        line = word
    elif len(line) + 1 + len(word) <= 20:
        line = line + ' ' + word
    else:
        print(line)
        line = word
print(line)"""
ex2_out = run(EX2)
check("ex2 Twenty characters at a time", ex2_out,
    "Please collect your\nparcel from the\nfront desk before\nnoon")
check("ex2 every chunk is 20 chars or fewer",
    [p for p in ex2_out.split("\n") if len(p) > 20], [])

check("ex3 The pace check",
    run("""def pace(transcript, seconds):
    return round(len(transcript.split()) * 60 / seconds)

transcript = 'the fire alarm test scheduled for friday morning has moved to monday afternoon instead'
print('pace:', pace(transcript, 6), 'wpm')"""),
    "pace: 140 wpm")
repl_seq("ex3 word count behind the pace",
    [("transcript = 'the fire alarm test scheduled for friday morning has moved to monday afternoon instead'", True),
     ("len(transcript.split())", False),
     ("len(transcript.split()) * 60 / 6", False)],
    ["14", "140.0"])

check("ex4 Strike the fillers",
    run("""raw = 'Um the uh delivery got um pushed to uh Thursday'
kept = []
for word in raw.split():
    if word.lower() not in ('um', 'uh'):
        kept.append(word)
print(' '.join(kept))
print('cut:', len(raw.split()) - len(kept))"""),
    "the delivery got pushed to Thursday\ncut: 4")

print()
print("CH24 VERIFY: ALL PASS" if fails == 0 else f"CH24 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
