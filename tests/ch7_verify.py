# Verify every code snippet shown in book/ch07.js.
# Same idea as ch2_verify.py: self-checking — each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
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

def run_raises(label, code, expected_err):
    # for note claims that a program dies with a specific error
    try:
        run(code)
        check(label, "no error raised", expected_err)
    except Exception as ex:
        check(label, f"{type(ex).__name__}: {ex}", expected_err)

print("=== section: The dictionary data type ===")
repl_seq("bike literal and access",
    [("bike = {'kind': 'gravel', 'gears': 12, 'color': 'orange'}", True),
     ("bike['kind']", False),
     ("'My bike has ' + str(bike['gears']) + ' gears'", False)],
    ["'gravel'", "'My bike has 12 gears'"])
repl_seq("add / change / del / len",
    [("bike = {'kind': 'gravel', 'gears': 12, 'color': 'orange'}", True),
     ("bike['bell'] = True", True),
     ("bike['color'] = 'black'", True),
     ("bike", False),
     ("len(bike)", False),
     ("del bike['bell']", True),
     ("len(bike)", False)],
    ["{'kind': 'gravel', 'gears': 12, 'color': 'black', 'bell': True}", "4", "3"])
repl_seq("integer keys",
    [("routes = {7: 'Harbor Loop', 42: 'Airport Express'}", True),
     ("routes[42]", False)],
    ["'Airport Express'"])
repl_seq("wrong-case key raises",
    [("bike = {'kind': 'gravel', 'gears': 12, 'color': 'black'}", True),
     ("bike['Kind']", False)],
    ["KeyError: 'Kind'"])

print("=== section: Dictionaries versus lists ===")
repl_seq("list order matters for ==, dict order does not",
    [("['pen', 'ink'] == ['ink', 'pen']", False),
     ("{'pen': 2, 'ink': 1} == {'ink': 1, 'pen': 2}", False)],
    ["False", "True"])
repl_seq("print follows insertion order; [0] is a key lookup",
    [("stock = {'pen': 2, 'ink': 1}", True),
     ("stock", False),
     ("stock[0]", False)],
    ["{'pen': 2, 'ink': 1}", "KeyError: 0"])

print("=== section: Looping: keys(), values(), and items() ===")
check("three loops program",
    run("""tolls = {'car': 3, 'truck': 8, 'bus': 6}
for v in tolls.values():
    print(v)
for k in tolls.keys():
    print(k)
for i in tolls.items():
    print(i)"""),
    "3\n8\n6\ncar\ntruck\nbus\n('car', 3)\n('truck', 8)\n('bus', 6)")
check("items unpack program",
    run("""tolls = {'car': 3, 'truck': 8, 'bus': 6}
for k, v in tolls.items():
    print('A ' + k + ' pays $' + str(v))"""),
    "A car pays $3\nA truck pays $8\nA bus pays $6")
repl_seq("keys view, list(), and indexing a view",
    [("tolls = {'car': 3, 'truck': 8, 'bus': 6}", True),
     ("tolls.keys()", False),
     ("list(tolls.keys())", False),
     ("tolls.keys()[0]", False)],
    ["dict_keys(['car', 'truck', 'bus'])", "['car', 'truck', 'bus']",
     "TypeError: 'dict_keys' object is not subscriptable"])

print("=== section: Checking for a key, and get() ===")
repl_seq("in / not in on keys and the bare dict",
    [("fees = {'locker': 2, 'towel': 1}", True),
     ("'locker' in fees.keys()", False),
     ("'sauna' in fees.keys()", False),
     ("'towel' in fees", False),
     ("'sauna' not in fees", False)],
    ["True", "False", "True", "True"])
repl_seq("bare in tests keys, not values",
    [("fees = {'locker': 2, 'towel': 1}", True),
     ("2 in fees", False),
     ("2 in fees.values()", False)],
    ["False", "True"])
repl_seq("get() vs hard brackets",
    [("fees = {'locker': 2, 'towel': 1}", True),
     ("fees.get('locker', 0)", False),
     ("fees.get('sauna', 0)", False),
     ("fees['sauna']", False)],
    ["2", "0", "KeyError: 'sauna'"])

print("=== section: setdefault() and the counting pattern ===")
repl_seq("setdefault stores only when missing",
    [("profile = {'name': 'Rui', 'city': 'Porto'}", True),
     ("profile.setdefault('theme', 'light')", False),
     ("profile.setdefault('theme', 'dark')", False),
     ("profile", False)],
    ["'light'", "'light'", "{'name': 'Rui', 'city': 'Porto', 'theme': 'light'}"])
check("vote tally program",
    run("""votes = ['tea', 'coffee', 'tea', 'water', 'tea', 'coffee']
tally = {}
for drink in votes:
    tally.setdefault(drink, 0)
    tally[drink] = tally[drink] + 1
print(tally)"""),
    "{'tea': 3, 'coffee': 2, 'water': 1}")
run_raises("note claim: tally without setdefault dies on first pass",
    """votes = ['tea', 'coffee', 'tea', 'water', 'tea', 'coffee']
tally = {}
for drink in votes:
    tally[drink] = tally[drink] + 1""",
    "KeyError: 'tea'")

print("=== section: the seating chart program ===")
check("seating chart program",
    run("""seats = {'A1': 'Mira', 'A3': 'Omar', 'B2': 'Lena'}

def print_chart(booked):
    for row in ['A', 'B']:
        line = row
        for num in ['1', '2', '3']:
            line = line + ' [' + booked.get(row + num, '----') + ']'
        print(line)

print_chart(seats)
if 'B3' not in seats:
    seats['B3'] = 'Kofi'
del seats['A3']
print_chart(seats)
print(str(len(seats)) + ' of 6 seats are booked')"""),
    "A [Mira] [----] [Omar]\nB [----] [Lena] [----]\nA [Mira] [----] [----]\nB [----] [Lena] [Kofi]\n3 of 6 seats are booked")
repl_seq("alias vs copy.copy",
    [("import copy", True),
     ("original = {'A1': 'Mira'}", True),
     ("alias = original", True),
     ("backup = copy.copy(original)", True),
     ("original['A2'] = 'Noor'", True),
     ("alias", False),
     ("backup", False)],
    ["{'A1': 'Mira', 'A2': 'Noor'}", "{'A1': 'Mira'}"])

print("=== section: Nested dictionaries and lists ===")
check("branch stock totals program",
    run("""def total_stock(branches, item):
    total = 0
    for shop in branches.values():
        total = total + shop.get(item, 0)
    return total

branches = {'north': {'hammer': 4, 'saw': 1},
            'south': {'hammer': 2, 'drill': 6}}
print('hammers in stock: ' + str(total_stock(branches, 'hammer')))
print('saws in stock: ' + str(total_stock(branches, 'saw')))"""),
    "hammers in stock: 6\nsaws in stock: 1")
repl_seq("dict of lists, chained brackets",
    [("clubs = {'robotics': ['Ada', 'Lin'], 'drama': ['Omar']}", True),
     ("clubs['robotics'][1]", False),
     ("len(clubs['drama'])", False),
     ("clubs[1]", False)],
    ["'Lin'", "1", "KeyError: 1"])

print("=== practice-question executable claims ===")
repl_seq("q1: empty dict and len",
    [("len({})", False)],
    ["0"])
repl_seq("q2: exact-case lookup",
    [("bike = {'gears': 12}", True),
     ("bike['gears']", False),
     ("bike['Gears']", False)],
    ["12", "KeyError: 'Gears'"])
repl_seq("q3: equality and order",
    [("['pen', 'ink'] == ['ink', 'pen']", False),
     ("{'pen': 2, 'ink': 1} == {'ink': 1, 'pen': 2}", False)],
    ["False", "True"])
repl_seq("q4: items() yields tuples",
    [("tolls = {'car': 3, 'truck': 8, 'bus': 6}", True),
     ("list(tolls.items())", False),
     ("type(list(tolls.items())[0])", False)],
    ["[('car', 3), ('truck', 8), ('bus', 6)]", "<class 'tuple'>"])
repl_seq("q5: in on dict vs values()",
    [("fees = {'locker': 2, 'towel': 1}", True),
     ("2 in fees", False),
     ("2 in fees.values()", False)],
    ["False", "True"])
repl_seq("q6: get vs brackets on a missing key",
    [("fees = {'locker': 2, 'towel': 1}", True),
     ("fees.get('sauna', 0)", False),
     ("fees['sauna']", False)],
    ["0", "KeyError: 'sauna'"])
repl_seq("q7: setdefault on an existing key",
    [("profile = {'theme': 'light'}", True),
     ("profile.setdefault('theme', 'dark')", False),
     ("profile['theme']", False)],
    ["'light'", "'light'"])
run_raises("q8: counting without the planted zero",
    """tally = {}
for drink in ['tea']:
    tally[drink] = tally[drink] + 1""",
    "KeyError: 'tea'")
repl_seq("q9: assignment aliases, copy.copy copies",
    [("import copy", True),
     ("seats = {'A1': 'Mira'}", True),
     ("alias = seats", True),
     ("backup = copy.copy(seats)", True),
     ("seats['A2'] = 'Noor'", True),
     ("alias == {'A1': 'Mira', 'A2': 'Noor'}", False),
     ("backup == {'A1': 'Mira'}", False)],
    ["True", "True"])
repl_seq("q10: chained brackets and [0] on a dict",
    [("clubs = {'drama': ['Omar']}", True),
     ("clubs['drama'][0]", False),
     ("clubs[0]", False)],
    ["'Omar'", "KeyError: 0"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 The scoreboard",
    run("""standings = {'Rovers': 11, 'United': 8, 'Wanderers': 5}
for team, points in standings.items():
    print(team + ' has ' + str(points) + ' points')"""),
    "Rovers has 11 points\nUnited has 8 points\nWanderers has 5 points")
check("ex2 Off the menu",
    run("""menu = {'espresso': 3, 'flat white': 5, 'mocha': 6}
orders = ['espresso', 'chai', 'mocha']
for drink in orders:
    if drink in menu:
        print(drink + ' costs $' + str(menu[drink]))
    else:
        print('no ' + drink + ' today')"""),
    "espresso costs $3\nno chai today\nmocha costs $6")
check("ex3 The bird tally",
    run("""sightings = ['heron', 'gull', 'heron', 'tern', 'gull', 'heron']
tally = {}
for bird in sightings:
    tally.setdefault(bird, 0)
    tally[bird] = tally[bird] + 1
print(tally)"""),
    "{'heron': 3, 'gull': 2, 'tern': 1}")
check("ex4 Lockers at both sites",
    run("""lockers = {'gym': {'small': 6, 'large': 2}, 'pool': {'small': 3, 'large': 5}}
small = 0
large = 0
for site in lockers.values():
    small = small + site['small']
    large = large + site['large']
print('small lockers: ' + str(small))
print('large lockers: ' + str(large))"""),
    "small lockers: 9\nlarge lockers: 7")

print()
print("CH7 VERIFY: ALL PASS" if fails == 0 else f"CH7 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
