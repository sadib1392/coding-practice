# Verify every code snippet shown in book/ch04.js.
# Same pattern as ch2_verify.py, self-checking: each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
# Two helpers beyond ch2's set, required by ch4's content:
#   repl_shell — simulates the interactive shell faithfully, including
#                printed side effects and the suppression of bare None
#   run_err   — programs that end in an error; asserts output + final line
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

def repl_shell(label, entries, expected):
    # entries: list of code strings, one shell entry each, sharing a namespace.
    # expected: list of lists — the visible lines for each entry, in shell
    # order: printed output first, then the repr when the value is not None
    # (a bare None shows nothing), errors as their final 'Type: message' line.
    ns = {}
    got = []
    for code in entries:
        buf = io.StringIO()
        tail = None
        with contextlib.redirect_stdout(buf):
            try:
                try:
                    cobj = compile(code, "<repl>", "eval")
                except SyntaxError:
                    exec(code, ns)
                else:
                    val = eval(cobj, ns)
                    if val is not None:
                        tail = repr(val)
            except Exception as ex:
                tail = f"{type(ex).__name__}: {ex}"
        lines = buf.getvalue().rstrip("\n").split("\n") if buf.getvalue() else []
        if tail is not None:
            lines.append(tail)
        got.append(lines)
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

def run_err(code):
    # Run a program expected to stop with an error. Returns (output, errline)
    # where errline is the 'Type: message' final line the chapter shows.
    buf = io.StringIO()
    ns = {}
    err = None
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, ns)
    except Exception as ex:
        err = f"{type(ex).__name__}: {ex}"
    return buf.getvalue().rstrip("\n"), err

print("=== section: Creating a function ===")
check("closing checklist program",
    run("""def closing_checklist():
    print('Lock the till')
    print('Wipe the counters')
    print('Flip the sign')

closing_checklist()
print('See you tomorrow')
closing_checklist()"""),
    "Lock the till\nWipe the counters\nFlip the sign\nSee you tomorrow\nLock the till\nWipe the counters\nFlip the sign")
check("note: bare function name does nothing",
    run("""def closing_checklist():
    print('Lock the till')

closing_checklist"""),
    "")

print("=== section: Arguments and parameters ===")
check("stamp_card with two arguments",
    run("""def stamp_card(customer):
    print('Stamp for ' + customer)
    print('Nine more for a free drink, ' + customer)

stamp_card('Noor')
stamp_card('Felix')"""),
    "Stamp for Noor\nNine more for a free drink, Noor\nStamp for Felix\nNine more for a free drink, Felix")
out, err = run_err("""def stamp_card(customer):
    print('Stamp for ' + customer)

stamp_card('Noor')
print(customer)""")
check("parameter gone after return: output", out, "Stamp for Noor")
check("parameter gone after return: error line", err, "NameError: name 'customer' is not defined")

print("=== section: Return values ===")
repl_seq("len evaluates to a value",
    [("len('espresso')", False), ("size = len('espresso')", True), ("size + 1", False)],
    ["8", "9"])
check("day_type program",
    run("""def day_type(day):
    if day == 'Saturday' or day == 'Sunday':
        return 'weekend'
    else:
        return 'weekday'

kind = day_type('Sunday')
print('Sunday is a ' + kind)
print('Monday is a ' + day_type('Monday'))"""),
    "Sunday is a weekend\nMonday is a weekday")

print("=== section: None and named parameters ===")
repl_shell("None shell session (bare None suppressed)",
    ["receipt = print('paid')", "receipt", "print(receipt)", "receipt == None", "type(receipt)"],
    [["paid"], [], ["None"], ["True"], ["<class 'NoneType'>"]])
repl_shell("sep joins a date",
    ["print('2026', '07', '23', sep='-')"],
    [["2026-07-23"]])
check("countdown with end=' '",
    run("""for number in range(3, 0, -1):
    print(number, end=' ')
print('liftoff')"""),
    "3 2 1 liftoff")
repl_shell("positional '-' vs sep='-'",
    ["print('a', 'b', '-')", "print('a', 'b', sep='-')"],
    [["a b -"], ["a-b"]])

print("=== section: The call stack ===")
BREAKFAST = """def make_breakfast():
    print('make_breakfast starts')
    toast_bread()
    brew_coffee()
    print('make_breakfast ends')

def toast_bread():
    print('toast_bread starts')
    print('toast_bread ends')

def brew_coffee():
    print('brew_coffee starts')
    grind_beans()
    print('brew_coffee ends')

def grind_beans():
    print('grind_beans starts')
    print('grind_beans ends')

make_breakfast()"""
check("breakfast chain order",
    run(BREAKFAST),
    "make_breakfast starts\ntoast_bread starts\ntoast_bread ends\nbrew_coffee starts\ngrind_beans starts\ngrind_beans ends\nbrew_coffee ends\nmake_breakfast ends")

print("=== section: Local and global scopes ===")
out, err = run_err("""def measure():
    reading = 72

measure()
print(reading)""")
check("local invisible outside: no output", out, "")
check("local invisible outside: error line", err, "NameError: name 'reading' is not defined")
check("reading a global works",
    run("""def show_price():
    print(price)

price = 3.5
show_price()"""),
    "3.5")
check("assignment makes a local; global untouched",
    run("""def reset_total():
    total = 0
    print(total)

total = 500
reset_total()
print(total)"""),
    "0\n500")
check("global statement assigns the global",
    run("""def add_points():
    global score
    score = score + 10

score = 0
add_points()
add_points()
print(score)"""),
    "20")
out, err = run_err("""def update_score():
    print(score)
    score = score + 1

score = 3
update_score()""")
check("read-then-assign: no output", out, "")
check("read-then-assign: error line", err,
    "UnboundLocalError: cannot access local variable 'score' where it is not associated with a value")

print("=== section: Handling errors with try and except ===")
out, err = run_err("""def per_person(bill, people):
    return bill / people

print(per_person(60, 4))
print(per_person(60, 0))
print(per_person(60, 3))""")
check("uncaught: output before the crash", out, "15.0")
check("uncaught: error line", err, "ZeroDivisionError: division by zero")
check("caught inside the function",
    run("""def per_person(bill, people):
    try:
        return bill / people
    except ZeroDivisionError:
        print('Cannot split by zero')

print(per_person(60, 4))
print(per_person(60, 0))
print(per_person(60, 3))"""),
    "15.0\nCannot split by zero\nNone\n20.0")
check("caught around the calls: batch abandoned",
    run("""def per_person(bill, people):
    return bill / people

try:
    print(per_person(60, 4))
    print(per_person(60, 0))
    print(per_person(60, 3))
except ZeroDivisionError:
    print('Cannot split by zero')"""),
    "15.0\nCannot split by zero")

print("=== section: the running log ===")
check("running log program",
    run("""def pace(minutes, distance_km):
    try:
        return minutes / distance_km
    except ZeroDivisionError:
        print('Distance cannot be zero')

def report(day, minutes, distance_km):
    result = pace(minutes, distance_km)
    if result == None:
        print(day + ': no valid pace')
    else:
        print(day + ': ' + str(result) + ' min per km')

report('Monday', 30, 5)
report('Wednesday', 24, 0)
report('Friday', 27, 6)"""),
    "Monday: 6.0 min per km\nDistance cannot be zero\nWednesday: no valid pace\nFriday: 4.5 min per km")

print("=== practice-question executable claims ===")
check("q1: def alone prints nothing until called",
    run("""def note():
    print('inside')

print('defined, not called yet')
note()"""),
    "defined, not called yet\ninside")
out, err = run_err("""def stamp_card(customer):
    print('Stamp for ' + customer)

stamp_card('Noor')
print(customer)""")
check("q2: parameter dies at return (NameError)", err,
    "NameError: name 'customer' is not defined")
repl_seq("q3: no return statement means None",
    [("def shrug():\n    pass", True), ("shrug() == None", False)],
    ["True"])
check("q4: print hands back None, return hands back the value",
    run("""def with_print(n):
    print(n * 2)

def with_return(n):
    return n * 2

a = with_print(4)
b = with_return(4)
print(a)
print(b)"""),
    "8\nNone\n8")
repl_shell("q5: bare None suppressed, print(None) shown",
    ["receipt = None", "receipt", "print(receipt)"],
    [[], [], ["None"]])
repl_shell("q6: default sep is a space",
    ["print('a', 'b')"],
    [["a b"]])
lines = run(BREAKFAST).split("\n")
check("q7: grind_beans ends before brew_coffee ends (stack order)",
    lines.index("grind_beans ends") < lines.index("brew_coffee ends"), True)
check("q8: local assignment leaves global at 500",
    run("""def reset_total():
    total = 0

total = 500
reset_total()
print(total)"""),
    "500")
check("q9: reading needs no declaration, assigning needs global",
    run("""def show_price():
    print(price)

def add_points():
    global score
    score = score + 10

price = 3.5
score = 0
show_price()
add_points()
print(score)"""),
    "3.5\n10")
check("q10: except path returns None",
    run("""def per_person(bill, people):
    try:
        return bill / people
    except ZeroDivisionError:
        print('Cannot split by zero')

print(per_person(60, 0))"""),
    "Cannot split by zero\nNone")

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Two tickets",
    run("""def ticket(name):
    print('Ticket for ' + name)

ticket('Iris')
ticket('Hugo')"""),
    "Ticket for Iris\nTicket for Hugo")
check("ex2 Return, then reuse",
    run("""def double(n):
    return n * 2

print(double(7))
print(double(double(5)))"""),
    "14\n20")
check("ex3 Pass or fail",
    run("""def grade(score):
    if score >= 50:
        return 'pass'
    else:
        return 'fail'

print(grade(72))
print(grade(50))
print(grade(31))"""),
    "pass\npass\nfail")
check("ex4 Split the bill",
    run("""def split_bill(total, people):
    try:
        return total / people
    except ZeroDivisionError:
        print('No diners')

print(split_bill(80, 4))
print(split_bill(80, 0))"""),
    "20.0\nNo diners\nNone")

print()
print("CH4 VERIFY: ALL PASS" if fails == 0 else f"CH4 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
