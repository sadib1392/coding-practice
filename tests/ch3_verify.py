# Verify every code snippet shown in book/ch03.js.
# Same idea as ch2_verify.py, self-checking: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run.
# One extension over ch2: run() swallows SystemExit, because this chapter's
# sys.exit() programs end mid-script by design.
# Nondeterminism: the dice program and the number-hunt game use an unseeded
# random.randint. The chapter never claims a reproducible output for them —
# the dice block shows no output, and the game transcript is labeled as one
# real captured run (secret 4, guesses 25/12/6/3/4). Here that transcript is
# replayed deterministically by patching random.randint to return the captured
# secret, and the live behavior is checked as properties (bounds, convergence).
import io, contextlib, builtins, sys, random

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
            try:
                exec(code, ns)
            except SystemExit:
                pass
    finally:
        builtins.input = real
    return buf.getvalue().rstrip("\n")

print("=== section: The while statement ===")
check("if version runs the block once",
    run("""n = 1
if n <= 5:
    print('lap ' + str(n))
    n = n + 1
print('done')"""),
    "lap 1\ndone")
check("while version runs five laps",
    run("""n = 1
while n <= 5:
    print('lap ' + str(n))
    n = n + 1
print('done')"""),
    "lap 1\nlap 2\nlap 3\nlap 4\nlap 5\ndone")
# prose claim: five iterations, condition evaluated six times
checks_count = 0
iters = 0
n = 1
while True:
    checks_count += 1
    if not (n <= 5):
        break
    iters += 1
    n = n + 1
check("prose: 5 iterations, 6 condition checks", (iters, checks_count), (5, 6))

print("=== section: Waiting for the right answer (canned input) ===")
check("begin loop: no / later / yes",
    run("""answer = ''
while answer != 'yes':
    print('Shall we begin? Type yes to continue.')
    answer = input()
print('Beginning.')""", ["no", "later", "yes"]),
    "Shall we begin? Type yes to continue.\nShall we begin? Type yes to continue.\nShall we begin? Type yes to continue.\nBeginning.")

print("=== section: break statements (canned input) ===")
check("vault loop: sesame / tangerine",
    run("""while True:
    print('Say the vault word.')
    word = input()
    if word == 'tangerine':
        break
    print('Wrong word.')
print('The vault swings open.')""", ["sesame", "tangerine"]),
    "Say the vault word.\nWrong word.\nSay the vault word.\nThe vault swings open.")

print("=== section: continue statements and truthy values ===")
check("continue demo skips 3 and 6",
    run("""n = 0
while n < 8:
    n = n + 1
    if n % 3 == 0:
        continue
    print(n)"""),
    "1\n2\n4\n5\n7\n8")
repl_seq("bool() of falsy and truthy values",
    [("bool(0)", False), ("bool(0.0)", False), ("bool('')", False), ("bool(7)", False), ("bool('ok')", False)],
    ["False", "False", "False", "True", "True"])
check("tickets truthy countdown",
    run("""tickets = 3
while tickets:
    print('ticket ' + str(tickets) + ' sold')
    tickets = tickets - 1
print('none left')"""),
    "ticket 3 sold\nticket 2 sold\nticket 1 sold\nnone left")

print("=== section: for loops and the range() function ===")
check("beep for loop",
    run("""for i in range(4):
    print('beep ' + str(i))"""),
    "beep 0\nbeep 1\nbeep 2\nbeep 3")
check("beep equivalent while loop",
    run("""i = 0
while i < 4:
    print('beep ' + str(i))
    i = i + 1"""),
    "beep 0\nbeep 1\nbeep 2\nbeep 3")
check("rice doubles ten times",
    run("""rice = 1
for i in range(10):
    rice = rice * 2
print(rice)"""),
    "1024")
check("range(3, 8)",
    run("""for i in range(3, 8):
    print(i)"""),
    "3\n4\n5\n6\n7")
check("range(0, 25, 5)",
    run("""for i in range(0, 25, 5):
    print(i)"""),
    "0\n5\n10\n15\n20")
check("range(10, 0, -2) countdown",
    run("""for i in range(10, 0, -2):
    print(i)
print('Go')"""),
    "10\n8\n6\n4\n2\nGo")
check("note: range(5, 0) body never runs",
    run("""for i in range(5, 0):
    print(i)"""),
    "")

print("=== section: Modules, random numbers, and sys.exit() ===")
repl_seq("randint before import is a NameError",
    [("random.randint(1, 6)", False)],
    ["NameError: name 'random' is not defined"])
# dice program: no literal output claimed; assert the stated property instead
dice_ok = True
seen = set()
for _ in range(300):
    out = run("""import random
print('You rolled a ' + str(random.randint(1, 6)))""")
    v = int(out.replace('You rolled a ', ''))
    if not (1 <= v <= 6):
        dice_ok = False
    seen.add(v)
check("dice: 300 runs all print a value in 1..6", dice_ok, True)
check("dice: runs disagree (more than one value seen)", len(seen) > 1, True)
check("sys.exit stops before the second print",
    run("""import sys
print('one')
sys.exit()
print('two')"""),
    "one")
check("ship orders: half speed / all stop",
    run("""import sys
while True:
    print('Enter an order.')
    order = input()
    if order == 'all stop':
        print('Engines halted.')
        sys.exit()
    print('Order logged: ' + order)""", ["half speed", "all stop"]),
    "Enter an order.\nOrder logged: half speed\nEnter an order.\nEngines halted.")

print("=== section: the number hunt ===")
GAME = """import random
secret = random.randint(1, 50)
tries = 0
guess = 0
while guess != secret:
    print('Name a number from 1 to 50.')
    guess = int(input())
    tries = tries + 1
    if guess < secret:
        print('Higher.')
    elif guess > secret:
        print('Lower.')
print('Found it. Tries: ' + str(tries))"""
PROMPT = "Name a number from 1 to 50."

def run_game_fixed(secret, guesses):
    # Deterministic replay: patch random.randint to return a known secret.
    real_randint = random.randint
    random.randint = lambda a, b: secret
    try:
        return run(GAME, [str(g) for g in guesses])
    finally:
        random.randint = real_randint

check("chapter transcript replays exactly (secret 4, guesses 25/12/6/3/4)",
    run_game_fixed(4, [25, 12, 6, 3, 4]),
    "Name a number from 1 to 50.\nLower.\nName a number from 1 to 50.\nLower.\nName a number from 1 to 50.\nLower.\nName a number from 1 to 50.\nHigher.\nName a number from 1 to 50.\nFound it. Tries: 5")
check("game logic: secret 5, guesses 2/7/5",
    run_game_fixed(5, [2, 7, 5]),
    f"{PROMPT}\nHigher.\n{PROMPT}\nLower.\n{PROMPT}\nFound it. Tries: 3")
check("game edge: secret 1 found first try, no hint printed",
    run_game_fixed(1, [1]),
    f"{PROMPT}\nFound it. Tries: 1")
check("game edge: secret 50, guesses 49/50",
    run_game_fixed(50, [49, 50]),
    f"{PROMPT}\nHigher.\n{PROMPT}\nFound it. Tries: 2")

def play_unseeded():
    # Property run against the real unseeded randint: an adaptive driver
    # binary-searches using the printed hints and must converge in <= 6 tries.
    buf = io.StringIO()
    ns = {}
    state = {"lo": 1, "hi": 50, "last": None, "count": 0}
    real = builtins.input
    def drv(prompt=''):
        lines = [l for l in buf.getvalue().splitlines() if l]
        if state["last"] is not None and len(lines) >= 2:
            hint = lines[-2]
            if hint == 'Higher.':
                state["lo"] = state["last"] + 1
            elif hint == 'Lower.':
                state["hi"] = state["last"] - 1
        g = (state["lo"] + state["hi"]) // 2
        state["last"] = g
        state["count"] += 1
        return str(g)
    builtins.input = drv
    try:
        with contextlib.redirect_stdout(buf):
            exec(GAME, ns)
    finally:
        builtins.input = real
    return ns["secret"], state["count"], buf.getvalue().rstrip("\n")

live_ok = True
for _ in range(25):
    secret, count, out = play_unseeded()
    if not (1 <= secret <= 50):
        live_ok = False
    if count > 6:
        live_ok = False
    if not out.endswith("Found it. Tries: " + str(count)):
        live_ok = False
check("game live: 25 unseeded runs, secret in 1..50, found in <= 6 tries", live_ok, True)

print("=== practice-question executable claims ===")
check("q2: condition False first time means zero runs",
    run("""n = 10
while n < 5:
    print(n)
print('after')"""),
    "after")
repl_seq("q4: falsy values",
    [("bool(0)", False), ("bool(0.0)", False), ("bool('')", False)],
    ["False", "False", "False"])
check("q5: range(4) produces 0 1 2 3",
    run("""for i in range(4):
    print(i)"""),
    "0\n1\n2\n3")
check("q6: range(2, 11, 3) produces 2 5 8",
    run("""for i in range(2, 11, 3):
    print(i)"""),
    "2\n5\n8")
check("q7: range(3, 0, -1) produces 3 2 1",
    run("""for i in range(3, 0, -1):
    print(i)"""),
    "3\n2\n1")
check("q7: range(3, 0) produces nothing",
    run("""for i in range(3, 0):
    print(i)"""),
    "")
repl_seq("q8: NameError message for missing import",
    [("random.randint(1, 6)", False)],
    ["NameError: name 'random' is not defined"])
check("q9: sys.exit ends the program, break only the loop",
    run("""import sys
while True:
    break
print('after break')
sys.exit()
print('never')"""),
    "after break")
# q10: buggy continue (counter below the if) jams with n stuck at 0.
# Emulated with a guard in the condition so the check itself terminates.
n = 0
steps = 0
while n < 8 and steps < 1000:
    steps += 1
    if n % 3 == 0:
        continue
    n = n + 1
check("q10: buggy continue never moves n (1000 guarded passes)", (n, steps), (0, 1000))

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Launch countdown",
    run("""for i in range(10, 0, -1):
    print(i)
print('Liftoff')"""),
    "10\n9\n8\n7\n6\n5\n4\n3\n2\n1\nLiftoff")
check("ex1 alternative while-loop solution",
    run("""n = 10
while n >= 1:
    print(n)
    n = n - 1
print('Liftoff')"""),
    "10\n9\n8\n7\n6\n5\n4\n3\n2\n1\nLiftoff")
check("ex2 The multiplying machine",
    run("""total = 1
for i in range(1, 7):
    total = total * i
print(total)"""),
    "720")
check("ex3 Odd ones only",
    run("""for i in range(1, 11):
    if i % 2 == 1:
        print(i)"""),
    "1\n3\n5\n7\n9")
check("ex3 alternative continue solution",
    run("""for i in range(1, 11):
    if i % 2 == 0:
        continue
    print(i)"""),
    "1\n3\n5\n7\n9")
check("ex4 Rock, paper, scissors: one round",
    run("""computer = 'rock'
player = 'scissors'
print('Computer plays ' + computer)
print('Player plays ' + player)
if computer == player:
    print('Tie')
elif (computer == 'rock' and player == 'scissors') or (computer == 'scissors' and player == 'paper') or (computer == 'paper' and player == 'rock'):
    print('Computer wins')
else:
    print('Player wins')"""),
    "Computer plays rock\nPlayer plays scissors\nComputer wins")

print()
print("CH3 VERIFY: ALL PASS" if fails == 0 else f"CH3 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
