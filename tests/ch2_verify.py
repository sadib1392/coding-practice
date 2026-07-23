# Verify every code snippet shown in book/ch02.js.
# Same idea as ch1_verify.py, but self-checking: each snippet's expected
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

print("=== section: Boolean values ===")
repl_seq("spam = True / spam / type(True)",
    [("spam = True", True), ("spam", False), ("type(True)", False)],
    ["True", "<class 'bool'>"])
repl_seq("lowercase true is a NameError",
    [("true", False)],
    ["NameError: name 'true' is not defined"])

print("=== section: Comparison operators ===")
repl_seq("== and != on ints",
    [("42 == 42", False), ("42 == 99", False), ("2 != 3", False), ("2 != 2", False)],
    ["True", "False", "True", "False"])
repl_seq("== and != on strings",
    [("'hello' == 'hello'", False), ("'hello' == 'Hello'", False), ("'cat' != 'dog'", False)],
    ["True", "False", "True"])
repl_seq("== across types",
    [("42 == '42'", False), ("42 == 42.0", False)],
    ["False", "True"])
repl_seq("ordering operators",
    [("10 < 20", False), ("10 > 20", False), ("10 <= 10", False), ("10 >= 12", False)],
    ["True", "False", "True", "False"])
repl_seq("ordering with a variable",
    [("age = 29", True), ("age <= 30", False), ("age != 29", False)],
    ["True", "False"])

print("=== section: Boolean operators ===")
repl_seq("and / or truth values",
    [("True and True", False), ("True and False", False), ("False or True", False), ("False or False", False)],
    ["True", "False", "True", "False"])
repl_seq("not / not not",
    [("not True", False), ("not not True", False)],
    ["False", "True"])
repl_seq("mixing comparisons",
    [("(4 < 5) and (5 < 6)", False), ("(4 < 5) and (9 < 6)", False), ("(1 == 2) or (2 == 2)", False)],
    ["True", "False", "True"])
repl_seq("precedence without parentheses",
    [("5 > 3 and not 5 > 7", False), ("not 1 + 1 == 2 or 5 > 4", False)],
    ["True", "True"])

print("=== section: Conditions, blocks, and program flow ===")
check("block demo program",
    run("""name = 'Mira'
if name == 'Mira':
    print('Hello, Mira')
    print('Both of these lines are inside the block')
print('This line runs either way')"""),
    "Hello, Mira\nBoth of these lines are inside the block\nThis line runs either way")

print("=== section: if, else, and elif ===")
check("if/else password program",
    run("""password = 'swordfish1'
if password == 'swordfish1':
    print('Access granted')
else:
    print('Access denied')"""),
    "Access granted")
check("elif order bug (broad test first)",
    run("""age = 70
if age >= 18:
    print('adult prices apply')
elif age >= 65:
    print('senior prices apply')"""),
    "adult prices apply")
check("elif order fixed (specific test first)",
    run("""age = 70
if age >= 65:
    print('senior prices apply')
elif age >= 18:
    print('adult prices apply')"""),
    "senior prices apply")

print("=== section: the ticket window (canned input) ===")
TICKET = """print('How old are you?')
age = int(input())
print('What day is it?')
day = input()
if age < 5:
    print('You get in free')
elif age >= 65:
    print('Senior ticket: $5')
elif day == 'Tuesday':
    print('Tuesday special: $6')
elif age < 18:
    print('Child ticket: $9')
else:
    print('Adult ticket: $15')"""
check("ticket run: 30 / Tuesday", run(TICKET, ["30", "Tuesday"]),
    "How old are you?\nWhat day is it?\nTuesday special: $6")
check("ticket run: 70 / Tuesday", run(TICKET, ["70", "Tuesday"]),
    "How old are you?\nWhat day is it?\nSenior ticket: $5")
check("ticket run: 12 / Friday", run(TICKET, ["12", "Friday"]),
    "How old are you?\nWhat day is it?\nChild ticket: $9")

print("=== section: dissecting the ticket window ===")
repl_seq("string vs int ordering raises",
    [("'30' < 5", False)],
    ["TypeError: '<' not supported between instances of 'str' and 'int'"])
repl_seq("day check is case-sensitive",
    [("'tuesday' == 'Tuesday'", False)],
    ["False"])
repl_seq("trace of the 12/Friday run",
    [("12 < 5", False), ("12 >= 65", False), ("'Friday' == 'Tuesday'", False), ("12 < 18", False)],
    ["False", "False", "False", "True"])

print("=== practice-question executable claims ===")
repl_seq("q4: three hand evaluations",
    [("(5 > 4) and (3 == 3)", False), ("not (6 > 10)", False), ("(1 == 1) or (2 == 5)", False)],
    ["True", "True", "True"])
repl_seq("q5: and/or edge combinations",
    [("True and True", False), ("False or False", False)],
    ["True", "False"])
repl_seq("q9: equality across types",
    [("42 == '42'", False), ("42 == 42.0", False)],
    ["False", "True"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Three questions, three answers",
    run("""a = 17
b = 20
print(a > b)
print(a != b)
print(a + 3 == b)"""),
    "False\nTrue\nTrue")
check("ex2 The bouncer",
    run("""name = 'Ada'
on_list = True
if name == 'Ada' and on_list:
    print('Come in')
else:
    print('Not tonight')"""),
    "Come in")
check("ex3 Greeting by the clock",
    run("""hour = 14
if hour < 12:
    print('Good morning')
elif hour < 18:
    print('Good afternoon')
else:
    print('Good evening')"""),
    "Good afternoon")
check("ex4 Parcel pricing",
    run("""weight = 7
if weight <= 1:
    print('Price: $4')
elif weight <= 5:
    print('Price: $8')
elif weight <= 20:
    print('Price: $15')
else:
    print('Too heavy to ship')"""),
    "Price: $15")

print()
print("CH2 VERIFY: ALL PASS" if fails == 0 else f"CH2 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
