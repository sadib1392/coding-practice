# Verify every executable code snippet shown in book/ch15.js.
# Same idea as ch2_verify.py, and self-checking in the same way: each
# snippet's expected output (as embedded in the chapter file) is asserted
# here, so any drift between the chapter text and real execution fails
# the run. EZSheets blocks need Google credentials and a network, so the
# chapter shows them without output claims and this script does not touch
# them — everything here is stdlib, offline.
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

print("=== section: Reading and writing cell data ===")
# The '30' trap REPL block: the only outputs shown in that section.
repl_seq("cells come back as strings: convert before arithmetic",
    [("int('30') + 12", False), ("'30' + 12", False)],
    ["42", 'TypeError: can only concatenate str (not "int") to str'])

print("=== section: Rows and columns as lists ===")
check("bake-sale takings block",
    run("""rows = [['ITEM', 'PRICE', 'SOLD'],
        ['banana bread', '4', '31'],
        ['flapjack', '3', '18'],
        ['lemon drizzle', '5', '12']]
total = 0
for row in rows[1:]:
    total = total + int(row[1]) * int(row[2])
print('Takings:', total)"""),
    "Takings: 238")
# Note's arithmetic: a 3-column table in a 26-column sheet pads 23 cells.
check("padding note arithmetic (26 - 3 columns)", 26 - 3, 23)

print("=== section: Google Forms and the token ledger ===")
check("token ledger audit block",
    run("""rows = [['FROM', 'TO', 'TOKENS'],
        ['POT', 'Nguyen', '10'],
        ['POT', 'Okafor', '10'],
        ['Nguyen', 'Okafor', '3'],
        ['Okafor', 'Nguyen', '5']]
balances = {}
for row in rows[1:]:
    giver, taker, tokens = row[0], row[1], int(row[2])
    if giver != 'POT':
        balances[giver] = balances.get(giver, 0) - tokens
    balances[taker] = balances.get(taker, 0) + tokens
for name in sorted(balances):
    print(name, balances[name])"""),
    "Nguyen 12\nOkafor 8")
# The append block's pure-Python part: counting used rows lands on the
# first free sheet row (count + 1). The ledger has 5 used rows (header
# plus 4 transfers), so the new transfer belongs in sheet row 6 — with
# or without the grid's trailing empty-row padding.
def first_free_row(rows):
    used = 0
    for row in rows:
        if row[0] == '':
            break
        used = used + 1
    return used + 1
LEDGER = [['FROM', 'TO', 'TOKENS'],
          ['POT', 'Nguyen', '10'],
          ['POT', 'Okafor', '10'],
          ['Nguyen', 'Okafor', '3'],
          ['Okafor', 'Nguyen', '5']]
check("append target row (unpadded rows)", first_free_row(LEDGER), 6)
check("append target row (grid-padded rows)",
    first_free_row(LEDGER + [['', '', ''], ['', '', '']]), 6)

print("=== practice-question executable claims ===")
repl_seq("q6: the string '30' in arithmetic",
    [("int('30') + 12", False), ("'30' + 12", False)],
    ["42", 'TypeError: can only concatenate str (not "int") to str'])
# q9: sheet row n is rows[n - 1]; after five used rows the first free is 6.
repl_seq("q9: 1-based sheet rows vs 0-based lists",
    [("rows = [['r1'], ['r2'], ['r3'], ['r4'], ['r5']]", True),
     ("rows[3]", False), ("len(rows) + 1", False)],
    ["['r4']", "6"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Total the takings",
    run("""rows = [['ITEM', 'PRICE', 'SOLD'],
        ['scones', '3', '24'],
        ['brownies', '4', '17'],
        ['fudge', '5', '9']]
total = 0
for row in rows[1:]:
    total = total + int(row[1]) * int(row[2])
print('Takings:', total)"""),
    "Takings: 185")
check("ex2 Who has the drill",
    run("""rows = [['TOOL', 'BORROWER', 'DUE'],
        ['ladder', 'Priya', 'Friday'],
        ['drill', 'Marcus', 'Tuesday'],
        ['sander', 'Lena', 'Monday']]
for row in rows[1:]:
    if row[0] == 'drill':
        print(row[1], 'has it until', row[2])"""),
    "Marcus has it until Tuesday")
check("ex3 Rows into records",
    run("""header = ['TOOL', 'BORROWER', 'DUE']
row = ['sander', 'Lena', 'Monday']
record = {}
for i in range(len(header)):
    record[header[i]] = row[i]
print(record['BORROWER'])
print(record['DUE'])"""),
    "Lena\nMonday")
check("ex4 Audit the token pot",
    run("""rows = [['FROM', 'TO', 'TOKENS'],
        ['POT', 'Ito', '8'],
        ['POT', 'Reyes', '8'],
        ['Ito', 'Reyes', '2'],
        ['Reyes', 'Ito', '5'],
        ['POT', 'Ito', '4']]
balances = {}
for row in rows[1:]:
    giver, taker, tokens = row[0], row[1], int(row[2])
    if giver != 'POT':
        balances[giver] = balances.get(giver, 0) - tokens
    balances[taker] = balances.get(taker, 0) + tokens
for name in sorted(balances):
    print(name, balances[name])"""),
    "Ito 15\nReyes 5")

print()
print("CH15 VERIFY: ALL PASS" if fails == 0 else f"CH15 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
