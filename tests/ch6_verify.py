# Verify every code snippet shown in book/ch06.js.
# Same idea as ch2_verify.py: self-checking — each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
# Random snippets carry no exact-output claims in the chapter; they are
# property-checked here (membership / permutation / None return) instead.
import io, contextlib, builtins, sys, copy, random

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
    # Extends ch2's helper: statements that raise (e.g. word[0] = 'h') do not
    # compile as expressions, so fall back to exec and capture the error there.
    ns = {}
    got = []
    for code, is_stmt in steps:
        if is_stmt:
            exec(code, ns)
        else:
            try:
                try:
                    got.append(repr(eval(code, ns)))
                except SyntaxError:
                    exec(code, ns)
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

def raises_type(code, setup=""):
    # For claims whose error TYPE is stated in prose but whose message is
    # not shown in the chapter (message wording differs across 3.12/3.14).
    ns = {}
    if setup:
        exec(setup, ns)
    try:
        exec(code, ns)
        return "no error"
    except Exception as ex:
        return type(ex).__name__

print("=== section: The list data type ===")
repl_seq("literal, len, empty list",
    [("pantry = ['rice', 'lentils', 'salt']", True), ("pantry", False),
     ("len(pantry)", False), ("len([])", False)],
    ["['rice', 'lentils', 'salt']", "3", "0"])
repl_seq("indexes and use in expressions",
    [("pantry = ['rice', 'lentils', 'salt', 'cumin']", True),
     ("pantry[0]", False), ("pantry[3]", False), ("'I bought ' + pantry[1]", False)],
    ["'rice'", "'cumin'", "'I bought lentils'"])
repl_seq("nested list, double indexing",
    [("stacked = [['jar', 'tin'], [10, 20, 30]]", True),
     ("stacked[0]", False), ("stacked[1][2]", False)],
    ["['jar', 'tin']", "30"])
repl_seq("negative indexes",
    [("pantry = ['rice', 'lentils', 'salt', 'cumin']", True),
     ("pantry[-1]", False), ("pantry[-2]", False)],
    ["'cumin'", "'salt'"])
repl_seq("index one past the end",
    [("pantry = ['rice', 'lentils', 'salt', 'cumin']", True), ("pantry[4]", False)],
    ["IndexError: list index out of range"])
repl_seq("note claim: indexing an empty list",
    [("[][0]", False)],
    ["IndexError: list index out of range"])

print("=== section: Slices, changes, and del ===")
repl_seq("two-index slices",
    [("pantry = ['rice', 'lentils', 'salt', 'cumin']", True),
     ("pantry[1:3]", False), ("pantry[0:2]", False)],
    ["['lentils', 'salt']", "['rice', 'lentils']"])
repl_seq("omitted-side slices",
    [("pantry = ['rice', 'lentils', 'salt', 'cumin']", True),
     ("pantry[:2]", False), ("pantry[2:]", False), ("pantry[:]", False)],
    ["['rice', 'lentils']", "['salt', 'cumin']", "['rice', 'lentils', 'salt', 'cumin']"])
repl_seq("index assignment",
    [("pantry = ['rice', 'lentils', 'salt', 'cumin']", True),
     ("pantry[1] = 'beans'", True), ("pantry", False)],
    ["['rice', 'beans', 'salt', 'cumin']"])
repl_seq("concatenation and replication",
    [("['a', 'b'] + ['c']", False), ("[0, 1] * 3", False)],
    ["['a', 'b', 'c']", "[0, 1, 0, 1, 0, 1]"])
repl_seq("del by index",
    [("pantry = ['rice', 'beans', 'salt', 'cumin']", True),
     ("del pantry[1]", True), ("pantry", False)],
    ["['rice', 'salt', 'cumin']"])
# note claim: deleting 1 then 2 skips a survivor (meant to drop 'b' and 'c')
repl_seq("note claim: del shifts later indexes down",
    [("l = ['a', 'b', 'c', 'd']", True), ("del l[1]", True), ("del l[2]", True), ("l", False)],
    ["['a', 'c']"])

print("=== section: Looping, membership, and unpacking ===")
check("for-in over chores",
    run("""chores = ['dishes', 'laundry', 'compost']
for chore in chores:
    print('Tonight: ' + chore)"""),
    "Tonight: dishes\nTonight: laundry\nTonight: compost")
check("range(len()) with indexes",
    run("""supplies = ['tape', 'glue', 'string']
for i in range(len(supplies)):
    print('Slot ' + str(i) + ': ' + supplies[i])"""),
    "Slot 0: tape\nSlot 1: glue\nSlot 2: string")
repl_seq("in and not in",
    [("'glue' in ['tape', 'glue', 'string']", False),
     ("'nails' in ['tape', 'glue', 'string']", False),
     ("'nails' not in ['tape', 'glue', 'string']", False)],
    ["True", "False", "True"])
repl_seq("short-circuit guard on empty list",
    [("row = []", True), ("len(row) > 0 and row[0] == 'go'", False)],
    ["False"])
repl_seq("multiple assignment unpacks",
    [("box = [120, 80, 45]", True), ("width, height, depth = box", True), ("height", False)],
    ["80"])
check("prose claim: unpack count mismatch raises ValueError",
    raises_type("x, y = [1, 2, 3]"), "ValueError")
repl_seq("swap without a third variable",
    [("a, b = 5, 9", True), ("a, b = b, a", True), ("a", False)],
    ["9"])
check("enumerate pairs index and item",
    run("""steps = ['knead', 'proof', 'bake']
for number, step in enumerate(steps):
    print(str(number) + ' ' + step)"""),
    "0 knead\n1 proof\n2 bake")

print("=== section: Augmented assignment and list methods ===")
repl_seq("augmented assignment on numbers and lists",
    [("total = 0", True), ("total += 6", True), ("total += 4", True), ("total", False),
     ("tags = ['new']", True), ("tags += ['sale']", True), ("tags", False)],
    ["10", "['new', 'sale']"])
repl_seq("index() finds the first match",
    [("spices = ['clove', 'anise', 'mace', 'anise']", True), ("spices.index('anise')", False)],
    ["1"])
check("prose claim: index() on a missing value raises ValueError",
    raises_type("spices.index('dill')", "spices = ['clove', 'anise']"), "ValueError")
repl_seq("append and insert",
    [("spices = ['clove', 'anise', 'mace', 'anise']", True),
     ("spices.append('sumac')", True), ("spices", False),
     ("spices.insert(1, 'caraway')", True), ("spices", False)],
    ["['clove', 'anise', 'mace', 'anise', 'sumac']",
     "['clove', 'caraway', 'anise', 'mace', 'anise', 'sumac']"])
repl_seq("remove and pop",
    [("spices = ['clove', 'caraway', 'anise', 'mace', 'anise', 'sumac']", True),
     ("spices.remove('anise')", True), ("spices", False),
     ("spices.pop()", False), ("spices.pop(0)", False), ("spices", False)],
    ["['clove', 'caraway', 'mace', 'anise', 'sumac']",
     "'sumac'", "'clove'", "['caraway', 'mace', 'anise']"])
repl_seq("remove on a missing value",
    [("spices = ['caraway', 'mace', 'anise']", True), ("spices.remove('dill')", False)],
    ["ValueError: list.remove(x): x not in list"])
repl_seq("sort strings, numbers, reverse=True",
    [("spices = ['caraway', 'mace', 'anise']", True),
     ("spices.sort()", True), ("spices", False),
     ("costs = [40, 5, 19]", True), ("costs.sort()", True), ("costs", False),
     ("costs.sort(reverse=True)", True), ("costs", False)],
    ["['anise', 'caraway', 'mace']", "[5, 19, 40]", "[40, 19, 5]"])
repl_seq("reverse()",
    [("spices = ['anise', 'caraway', 'mace']", True),
     ("spices.reverse()", True), ("spices", False)],
    ["['mace', 'caraway', 'anise']"])
check("sort() returns None program",
    run("""words = ['pear', 'fig']
words = words.sort()
print(words)"""),
    "None")
repl_seq("sort refuses mixed types",
    [("mixed = [3, 'two', 1]", True), ("mixed.sort()", False)],
    ["TypeError: '<' not supported between instances of 'str' and 'int'"])
repl_seq("code-point order and key=str.lower",
    [("letters = ['b', 'A', 'a', 'B']", True),
     ("letters.sort()", True), ("letters", False),
     ("letters.sort(key=str.lower)", True), ("letters", False)],
    ["['A', 'B', 'a', 'b']", "['A', 'a', 'B', 'b']"])

print("=== section: Random selection and ordering (property checks) ===")
flavors = ['mint', 'lemon', 'peach', 'cocoa']
check("random.choice always picks from the list",
    all(random.choice(flavors) in flavors for _ in range(200)), True)
cards = ['2H', '9C', 'KD', 'AS', '5S']
shuffled = cards[:]
random.shuffle(shuffled)
check("random.shuffle keeps the same items (permutation)",
    sorted(shuffled) == sorted(cards), True)
check("note claim: random.shuffle returns None",
    random.shuffle(cards) is None, True)

print("=== section: Tuples and immutability ===")
repl_seq("strings refuse item assignment",
    [("word = 'copper'", True), ("word[0] = 'h'", False)],
    ["TypeError: 'str' object does not support item assignment"])
repl_seq("build a new string instead",
    [("word = 'copper'", True), ("'h' + word[1:]", False)],
    ["'hopper'"])
repl_seq("tuple reads like a list, refuses assignment",
    [("size = (1920, 1080)", True), ("size[0]", False), ("len(size)", False),
     ("size[0] = 4096", False)],
    ["1920", "2", "TypeError: 'tuple' object does not support item assignment"])
repl_seq("one-item tuple needs the comma",
    [("type(('solo',))", False), ("type(('solo'))", False)],
    ["<class 'tuple'>", "<class 'str'>"])
repl_seq("list() and tuple() conversions",
    [("list(('a', 'b'))", False), ("tuple([1, 2, 3])", False), ("list('mud')", False)],
    ["['a', 'b']", "(1, 2, 3)", "['m', 'u', 'd']"])
repl_seq("tuples lack the changing methods",
    [("size = (1920, 1080)", True), ("size.append(720)", False)],
    ["AttributeError: 'tuple' object has no attribute 'append'"])

print("=== section: References and copies ===")
repl_seq("two names, one list",
    [("packed = ['tent', 'stove']", True), ("gear = packed", True),
     ("gear.append('rope')", True), ("packed", False)],
    ["['tent', 'stove', 'rope']"])
check("function mutates the caller's list",
    run("""def add_receipt(papers):
    papers.append('receipt')

tray = ['form', 'letter']
add_receipt(tray)
print(tray)"""),
    "['form', 'letter', 'receipt']")
repl_seq("copy.copy makes an independent flat copy",
    [("import copy", True), ("packed = ['tent', 'stove']", True),
     ("spare = copy.copy(packed)", True), ("spare.append('lamp')", True),
     ("packed", False), ("spare", False)],
    ["['tent', 'stove']", "['tent', 'stove', 'lamp']"])
repl_seq("shallow copy shares inner lists",
    [("import copy", True), ("bins = [['bolt'], ['washer']]", True),
     ("flat = copy.copy(bins)", True), ("flat[0].append('nut')", True), ("bins", False)],
    ["[['bolt', 'nut'], ['washer']]"])
repl_seq("deepcopy copies all the way down",
    [("import copy", True), ("bins = [['bolt'], ['washer']]", True),
     ("deep = copy.deepcopy(bins)", True), ("deep[0].append('nut')", True),
     ("bins", False), ("deep", False)],
    ["[['bolt'], ['washer']]", "[['bolt', 'nut'], ['washer']]"])
repl_seq("note claim: full slice [:] is a one-level copy",
    [("orig = [1, 2]", True), ("dup = orig[:]", True), ("dup.append(3)", True),
     ("orig", False), ("dup", False)],
    ["[1, 2]", "[1, 2, 3]"])

print("=== section: the standby queue ===")
check("standby queue program",
    run("""standby = ['Priya', 'Marcus', 'Elena']
standby.append('Tomas')
print('Waiting: ' + str(len(standby)))
if 'Elena' in standby:
    standby.remove('Elena')
seat = standby.pop(0)
print('Now boarding: ' + seat)
for place, name in enumerate(standby):
    print(str(place + 1) + '. ' + name)"""),
    "Waiting: 4\nNow boarding: Priya\n1. Marcus\n2. Tomas")
check("note claim: remove() without the guard raises ValueError",
    raises_type("standby.remove('Zoe')", "standby = ['Marcus', 'Tomas']"), "ValueError")

print("=== practice-question executable claims ===")
repl_seq("q1: first and last by index",
    [("pantry = ['rice', 'lentils', 'salt']", True),
     ("pantry[0]", False), ("pantry[-1]", False)],
    ["'rice'", "'salt'"])
repl_seq("q2: slice excludes the end index",
    [("pantry = ['rice', 'lentils', 'salt']", True), ("pantry[0:2]", False)],
    ["['rice', 'lentils']"])
repl_seq("q3: nested list counts as one item",
    [("len(['a', ['b', 'c']])", False)],
    ["2"])
repl_seq("q4: index 3 of a three-item list",
    [("['x', 'y', 'z'][3]", False)],
    ["IndexError: list index out of range"])
repl_seq("q5: append at the end, insert at an index",
    [("nums = [1, 2]", True), ("nums.append(3)", True), ("nums", False),
     ("nums.insert(0, 0)", True), ("nums", False)],
    ["[1, 2, 3]", "[0, 1, 2, 3]"])
repl_seq("q6: sort() returns None and sorts in place",
    [("words = ['pear', 'fig']", True), ("ret = words.sort()", True),
     ("ret", False), ("words", False)],
    ["None", "['fig', 'pear']"])
repl_seq("q7: membership answers",
    [("pantry = ['rice', 'lentils', 'salt']", True),
     ("'salt' in pantry", False), ("'tea' not in pantry", False)],
    ["True", "True"])
repl_seq("q8: tuple item assignment",
    [("dims = (800, 600)", True), ("dims[0] = 1024", False)],
    ["TypeError: 'tuple' object does not support item assignment"])
repl_seq("q9: aliasing through a second name",
    [("a = [1, 2]", True), ("b = a", True), ("b.append(3)", True), ("a", False)],
    ["[1, 2, 3]"])
repl_seq("q10: shallow copy shares inners, deepcopy does not",
    [("import copy", True), ("outer = [['p'], ['q']]", True),
     ("sh = copy.copy(outer)", True), ("sh[0].append('r')", True), ("outer", False),
     ("outer2 = [['p'], ['q']]", True), ("dp = copy.deepcopy(outer2)", True),
     ("dp[0].append('r')", True), ("outer2", False)],
    ["[['p', 'r'], ['q']]", "[['p'], ['q']]"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Ends of the shelf",
    run("""tools = ['hammer', 'wrench', 'saw', 'drill']
print('First: ' + tools[0])
print('Last: ' + tools[-1])"""),
    "First: hammer\nLast: drill")
check("ex2 Stockroom moves",
    run("""crates = ['apples', 'pears', 'plums']
crates.append('figs')
crates.remove('pears')
crates.insert(0, 'kiwis')
print(crates)"""),
    "['kiwis', 'apples', 'plums', 'figs']")
check("ex3 Receipt total",
    run("""prices = [4, 7, 2, 9]
total = 0
for price in prices:
    total += price
print('Total: ' + str(total))"""),
    "Total: 22")
check("ex4 Roll call, alphabetized",
    run("""names = ['Rosa', 'Amir', 'Lena']
names.sort()
print('Roll call:')
for name in names:
    print(name)"""),
    "Roll call:\nAmir\nLena\nRosa")

print()
print("CH6 VERIFY: ALL PASS" if fails == 0 else f"CH6 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
