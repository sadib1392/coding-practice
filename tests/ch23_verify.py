# Verify every code snippet shown with output in book/ch23.js.
# Same self-checking idea as ch2_verify.py: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run.
#
# pyautogui is NEVER imported, installed, or executed here — it drives the
# real mouse and keyboard, which no build or grader may do. The chapter
# therefore shows every pyautogui block WITHOUT output (disclosed in its
# first section), and there is nothing about those blocks to execute.
# Everything below is built-in Python: the coordinate arithmetic, the window
# geometry, the cursor-simulator session, the executable claims made by the
# practice questions, and all four graded-exercise reference solutions.
import io, contextlib, sys

fails = 0
def check(label, got, want):
    global fails
    ok = got == want
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        fails += 1
        print(f"     got:  {got!r}")
        print(f"     want: {want!r}")

def run(code, ns=None):
    # Execute a chapter block; ns=None runs it standalone, passing the same
    # dict again chains blocks that the chapter presents as one session.
    buf = io.StringIO()
    if ns is None:
        ns = {}
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    return buf.getvalue().rstrip("\n")

print("=== section: Screen coordinates ===")
check("corner and center arithmetic",
    run("""width, height = 1920, 1080
print('bottom-right pixel:', width - 1, height - 1)
print('center:', width // 2, height // 2)"""),
    "bottom-right pixel: 1919 1079\ncenter: 960 540")

print("=== section: Typing and hotkeys (prose claim) ===")
# The chapter claims write(['a', 'b', 'left', 'left', 'X', 'Y']) leaves an
# empty field reading XYab. Simulate an insertion-point text buffer to prove
# the trace without sending a single real keystroke.
def typed(keys):
    buf = []
    cursor = 0
    for k in keys:
        if k == 'left':
            cursor = max(0, cursor - 1)
        else:
            buf.insert(cursor, k)
            cursor = cursor + 1
    return ''.join(buf)
check("write list trace ends as XYab",
    typed(['a', 'b', 'left', 'left', 'X', 'Y']), "XYab")

print("=== section: Windows, message boxes, and pacing ===")
check("window edge arithmetic",
    run("""left, top, width, height = 500, 300, 2070, 1208
right = left + width
bottom = top + height
print('right edge at x =', right)
print('bottom edge at y =', bottom)
print('last pixel inside:', right - 1, bottom - 1)"""),
    "right edge at x = 2570\nbottom edge at y = 1508\nlast pixel inside: 2569 1507")

print("=== section: A cursor simulator (one continuing session) ===")
check("relative walk",
    run("""x, y = 800, 450
moves = [(120, 0), (0, -200), (-60, 35)]
for dx, dy in moves:
    x = x + dx
    y = y + dy
print('cursor ends at', x, y)"""),
    "cursor ends at 860 285")
sim = {}   # the chapter's simulator blocks share one shell session
check("clamp pins coordinates to the screen",
    run("""WIDTH, HEIGHT = 1920, 1080

def clamp(x, y):
    x = max(0, min(x, WIDTH - 1))
    y = max(0, min(y, HEIGHT - 1))
    return x, y

print(clamp(960, 540))
print(clamp(2500, 700))
print(clamp(-80, 1300))""", sim),
    "(960, 540)\n(1919, 700)\n(0, 1079)")
check("run_plan walks the action-plan data",
    run("""def run_plan(plan, x, y):
    clicks = []
    for step in plan:
        if step[0] == 'moveto':
            x, y = clamp(step[1], step[2])
        elif step[0] == 'move':
            x, y = clamp(x + step[1], y + step[2])
        elif step[0] == 'click':
            clicks.append((x, y))
    return x, y, clicks

plan = [('moveto', 640, 400), ('click',), ('move', 0, 130), ('click',),
        ('move', 300, -600), ('click',)]
x, y, clicks = run_plan(plan, 0, 0)
print('final position:', x, y)
print('clicks landed at:', clicks)""", sim),
    "final position: 940 0\nclicks landed at: [(640, 400), (640, 530), (940, 0)]")
check("in_corner sees corners, not edges",
    run("""def in_corner(x, y):
    return x in (0, WIDTH - 1) and y in (0, HEIGHT - 1)

print(in_corner(0, 0))
print(in_corner(1919, 1079))
print(in_corner(960, 0))""", sim),
    "True\nTrue\nFalse")
check("inside() counts the recorded clicks",
    run("""def inside(x, y, left, top, width, height):
    return left <= x < left + width and top <= y < top + height

hits = 0
for cx, cy in clicks:
    if inside(cx, cy, 600, 350, 200, 250):
        hits = hits + 1
print(hits, 'of', len(clicks), 'clicks landed in the window')""", sim),
    "2 of 3 clicks landed in the window")
check("prose claim: the misfire's raw target was (940, -70)",
    (640 + 300, 530 - 600), (940, -70))

print("=== practice-question executable claims ===")
check("q2: corner pixels of a 1920x1080 display",
    [(0, 0), (1920 - 1, 1080 - 1)], [(0, 0), (1919, 1079)])
check("q3: moveTo(50, 100) vs move(50, 100) from (600, 400)",
    [(50, 100), (600 + 50, 400 + 100)], [(50, 100), (650, 500)])
# q6: hotkey('ctrl', 'alt', 's') — press in order, release in reverse.
def hotkey_events(keys):
    events = []
    for k in keys:
        events.append('press ' + k)
    for k in reversed(keys):
        events.append('release ' + k)
    return events
check("q6: hotkey press/release ordering",
    hotkey_events(('ctrl', 'alt', 's')),
    ['press ctrl', 'press alt', 'press s',
     'release s', 'release alt', 'release ctrl'])
check("q8: window edges and last inside pixel",
    [500 + 2070, 300 + 1208, (500 + 2070 - 1, 300 + 1208 - 1)],
    [2570, 1508, (2569, 1507)])
q9 = run("""x, y = clamp(960 + -1000, 540 + -600)
print(x, y, in_corner(x, y))""", sim)
check("q9: big negative move clamps into the fail-safe corner",
    q9, "0 0 True")
check("q10: boundary clicks against the 600/350/200/250 window",
    [600 <= px < 600 + 200 and 350 <= py < 350 + 250
     for px, py in [(700, 400), (799, 500), (800, 500)]],
    [True, True, False])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Walk the cursor",
    run("""x = 400
y = 300
moves = [(150, 0), (0, 125), (-90, -40), (200, 15)]
for dx, dy in moves:
    x = x + dx
    y = y + dy
print('Final position:', x, y)"""),
    "Final position: 660 400")
check("ex2 Clicks in the window",
    run("""clicks = [(250, 200), (600, 300), (199, 149), (599, 449), (400, 500)]
count = 0
for x, y in clicks:
    if 200 <= x < 600 and 150 <= y < 450:
        count = count + 1
print('Inside:', count)"""),
    "Inside: 2")
check("ex3 Spell out the hotkey",
    run("""hotkey = ('ctrl', 'alt', 's')
events = []
for k in hotkey:
    events.append('press ' + k)
for k in reversed(hotkey):
    events.append('release ' + k)
print(', '.join(events))"""),
    "press ctrl, press alt, press s, release s, release alt, release ctrl")
check("ex4 Run the plan",
    run("""def run_plan(plan):
    x = 0
    y = 0
    clicks = 0
    for step in plan:
        if step[0] == 'moveto':
            x = step[1]
            y = step[2]
        elif step[0] == 'move':
            x = x + step[1]
            y = y + step[2]
        elif step[0] == 'click':
            clicks = clicks + 1
    return x, y, clicks

plan = [('moveto', 300, 200), ('click',), ('move', 45, -80), ('click',),
        ('move', -120, 60), ('click',)]
x, y, clicks = run_plan(plan)
print('Ends at', x, y, 'after', clicks, 'clicks')"""),
    "Ends at 225 180 after 3 clicks")

print()
print("CH23 VERIFY: ALL PASS" if fails == 0 else f"CH23 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
