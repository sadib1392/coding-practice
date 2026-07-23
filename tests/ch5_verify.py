# Verify every code snippet shown in book/ch05.js.
# Same idea as ch2_verify.py, self-checking: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run.
# Logging blocks run in a fresh subprocess (python -u, stderr merged into
# stdout) because basicConfig only configures a process once and log lines
# go to stderr; -u keeps the interleaving in program order, as on a tty.
# The traceback block is made deterministic by compiling with the synthetic
# filename 'wrong.py' (no absolute paths, no machine-specific frames).
import io, contextlib, builtins, sys, os, subprocess, tempfile, traceback

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
    # A statement expected to raise (raise, assert) is passed with
    # is_stmt=False: eval fails to compile it, the exec fallback runs it,
    # and the exception is captured as "Type: message".
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

def run_prog(code, split=False):
    # Run code as a file in a fresh interpreter from a scratch directory.
    # Returns (output, dirpath); with split=True, (stdout, stderr, dirpath).
    d = tempfile.mkdtemp()
    with open(os.path.join(d, "prog.py"), "w") as f:
        f.write(code)
    if split:
        r = subprocess.run([sys.executable, "-u", "prog.py"], cwd=d,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return r.stdout.decode().rstrip("\n"), r.stderr.decode().rstrip("\n"), d
    r = subprocess.run([sys.executable, "-u", "prog.py"], cwd=d,
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return r.stdout.decode().rstrip("\n"), d

print("=== section: Raising exceptions ===")
repl_seq("int('forty') raises ValueError",
    [("int('forty')", False)],
    ["ValueError: invalid literal for int() with base 10: 'forty'"])
repl_seq("uncaught raise shows type and message",
    [("raise Exception('the beans are gone')", False)],
    ["Exception: the beans are gone"])
SET_OVEN = """def set_oven(temp):
    if temp < 50:
        raise Exception('too cold to bake: ' + str(temp))
    if temp > 250:
        raise Exception('oven only goes to 250')
    print('oven set to ' + str(temp))"""
check("oven guard accepts a sound value",
    run(SET_OVEN + "\n\nset_oven(180)"),
    "oven set to 180")
check("caller catches the oven raise",
    run(SET_OVEN + """\n\ntry:
    set_oven(300)
except Exception as e:
    print('could not bake: ' + str(e))"""),
    "could not bake: oven only goes to 250")

print("=== section: Reading a traceback ===")
WRONG = """def divide(total, count):
    return total / count

def average(total, count):
    return divide(total, count)

print(average(12, 0))"""
try:
    exec(compile(WRONG, 'wrong.py', 'exec'), {})
    tb = "(no exception)"
except ZeroDivisionError as e:
    # skip this harness's own exec frame; keep only wrong.py frames
    tb = "".join(traceback.format_exception(type(e), e, e.__traceback__.tb_next)).rstrip("\n")
check("wrong.py traceback, deterministic via compile filename",
    tb,
    'Traceback (most recent call last):\n'
    '  File "wrong.py", line 7, in <module>\n'
    '  File "wrong.py", line 5, in average\n'
    '  File "wrong.py", line 2, in divide\n'
    'ZeroDivisionError: division by zero')

print("=== section: Assertions ===")
repl_seq("failing assert carries the message",
    [("speed = 900", True),
     ("assert speed <= 120, 'speed reading is impossible: ' + str(speed)", False)],
    ["AssertionError: speed reading is impossible: 900"])
check("passing assert makes no sound",
    run("""distance = 42.0
hours = 1.5
pace = distance / hours
assert pace > 0, 'pace must be positive'
print('average speed: ' + str(pace))"""),
    "average speed: 28.0")

print("=== section: The logging module ===")
LOGINTRO = """import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')
logging.debug('program started')
answer = 6 * 7
logging.debug('answer computed: ' + str(answer))
print(answer)"""
out, _ = run_prog(LOGINTRO)
check("logging intro, screen shows log lines then output", out,
    "DEBUG - program started\nDEBUG - answer computed: 42\n42")
sout, serr, _ = run_prog(LOGINTRO, split=True)
check("note claim: print goes to stdout", sout, "42")
check("note claim: log lines go to stderr", serr,
    "DEBUG - program started\nDEBUG - answer computed: 42")

print("=== section: A bug hunt with log messages ===")
STAIR_SETUP = """import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')

"""
STAIR_BUG = """def stair_total(n):
    total = 0
    for step in range(n):
        total = total + step
        logging.debug('step ' + str(step) + ', total ' + str(total))
    return total

print(stair_total(4))"""
STAIR_FIX = """def stair_total(n):
    total = 0
    for step in range(1, n + 1):
        total = total + step
        logging.debug('step ' + str(step) + ', total ' + str(total))
    return total

print(stair_total(4))"""
out, _ = run_prog(STAIR_SETUP + STAIR_BUG)
check("buggy staircase logs steps 0..3 and prints 6", out,
    "DEBUG - step 0, total 0\nDEBUG - step 1, total 1\nDEBUG - step 2, total 3\nDEBUG - step 3, total 6\n6")
out, _ = run_prog(STAIR_SETUP + STAIR_FIX)
check("fixed staircase logs steps 1..4 and prints 10", out,
    "DEBUG - step 1, total 1\nDEBUG - step 2, total 3\nDEBUG - step 3, total 6\nDEBUG - step 4, total 10\n10")

print("=== section: Levels, logfiles, and the off switch ===")
LEVELS = """import logging
logging.basicConfig(level=logging.WARNING, format='%(levelname)s - %(message)s')
logging.debug('checking the till float')
logging.info('shift started')
logging.warning('till is low on change')
logging.error('till drawer is stuck')
logging.critical('till is missing')"""
out, _ = run_prog(LEVELS)
check("WARNING threshold keeps the three most serious lines", out,
    "WARNING - till is low on change\nERROR - till drawer is stuck\nCRITICAL - till is missing")
DISABLE = """import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')
logging.disable(logging.CRITICAL)
logging.debug('checking the till float')
logging.critical('till is missing')"""
out, _ = run_prog(DISABLE)
check("disable(CRITICAL) prints nothing at all", out, "")
out, _ = run_prog("""import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')
logging.disable(logging.CRITICAL)

""" + STAIR_FIX)
check("prose claim: disabled staircase output shrinks to 10", out, "10")
LOGFILE = """import logging
logging.basicConfig(filename='cafe_log.txt', level=logging.DEBUG, format='%(levelname)s - %(message)s')
logging.debug('opening stock counted')
logging.warning('milk is past its date')"""
out, d = run_prog(LOGFILE)
check("logfile run shows nothing on screen", out, "")
with open(os.path.join(d, "cafe_log.txt")) as f:
    content = f.read()
check("cafe_log.txt holds both lines", content,
    "DEBUG - opening stock counted\nWARNING - milk is past its date\n")

print("=== section: Breakpoints and stepping ===")
check("string prices join instead of adding",
    run("""first = '4'
second = '12'
total = first + second
print('total cost: ' + total)"""),
    "total cost: 412")
repl_seq("prose claim: converting first makes the total 16",
    [("int('4') + int('12')", False)],
    ["16"])
check("multiples of seven counter",
    run("""count = 0
for n in range(1, 1001):
    if n % 7 == 0:
        count = count + 1
print('multiples of seven: ' + str(count))"""),
    "multiples of seven: 142")

print("=== practice-question executable claims ===")
repl_seq("q1: uncaught Exception final line",
    [("raise Exception('the beans are gone')", False)],
    ["Exception: the beans are gone"])
repl_seq("q4: assert passes at 90.0, fails at -5",
    [("pay = 90.0", True),
     ("assert pay >= 0, 'pay went negative'", False),
     ("pay = -5", True),
     ("assert pay >= 0, 'pay went negative'", False)],
    ["AssertionError: pay went negative"])
repl_seq("q5: '4' + '12' joins silently",
    [("'4' + '12'", False)],
    ["'412'"])
repl_seq("q6: the five levels ascend in seriousness",
    [("import logging", True),
     ("logging.DEBUG < logging.INFO < logging.WARNING < logging.ERROR < logging.CRITICAL", False)],
    ["True"])
out, _ = run_prog(LEVELS)
check("q7: at WARNING only warning/error/critical show", out,
    "WARNING - till is low on change\nERROR - till drawer is stuck\nCRITICAL - till is missing")
out, _ = run_prog(DISABLE)
check("q8: disable(CRITICAL) silences every call", out, "")

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 The width gate",
    run("""def check_width(cm):
    if cm < 1 or cm > 300:
        raise ValueError('width out of range')
    print('width accepted')

check_width(120)
try:
    check_width(450)
except ValueError as e:
    print('rejected: ' + str(e))"""),
    "width accepted\nrejected: width out of range")
check("ex2 Tolerant converter",
    run("""def to_int(text):
    try:
        return int(text)
    except ValueError:
        return 0

a = '42'
b = 'forty'
print(to_int(a) + to_int(b))"""),
    "42")
check("ex3 The payroll tripwire",
    run("""hours = 7.5
rate = 12
pay = hours * rate
assert pay >= 0, 'pay went negative'
print('pay: ' + str(pay))"""),
    "pay: 90.0")
check("ex4 Sum with a guard",
    run("""def total_to(n):
    if n < 1:
        raise ValueError('n must be at least 1')
    total = 0
    for step in range(1, n + 1):
        total = total + step
    return total

print(total_to(5))
try:
    print(total_to(0))
except ValueError as e:
    print('error: ' + str(e))"""),
    "15\nerror: n must be at least 1")

print()
print("CH5 VERIFY: ALL PASS" if fails == 0 else f"CH5 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
