# Verify every code snippet shown in book/ch12.js.
# Same idea as ch2_verify.py, self-checking: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run. The $-prompt terminal
# transcripts are re-verified for real: the embedded script text is written
# to a temp folder and run via subprocess with the same command line
# arguments the transcript shows, from that folder, so sys.argv matches.
import io, contextlib, os, subprocess, sys, tempfile

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

def raises(label, stmt, expected):
    # For statements (like import) whose shown REPL result is an error line.
    try:
        exec(stmt, {})
        check(label, "no error raised", expected)
    except Exception as ex:
        check(label, f"{type(ex).__name__}: {ex}", expected)

def run(code):
    buf = io.StringIO()
    ns = {}
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    return buf.getvalue().rstrip("\n")

TMP = tempfile.mkdtemp(prefix="ch12verify")
def cli(script_name, script_text, args):
    # Re-create the transcript: bare filename on the command line, run from
    # the script's own folder, so argv[0] is exactly the name as typed.
    path = os.path.join(TMP, script_name)
    with open(path, "w") as f:
        f.write(script_text + "\n")
    r = subprocess.run([sys.executable, script_name] + args,
                       capture_output=True, text=True, cwd=TMP)
    if r.returncode != 0:
        return f"EXIT {r.returncode}: {r.stderr.strip()}"
    return r.stdout.rstrip("\n")

print("=== section: Using the terminal ===")
HELLO = "print('Hello from the terminal')"
check("transcript: python3 hello.py", cli("hello.py", HELLO, []),
    "Hello from the terminal")
try:
    compile("python3 hello.py", "<repl>", "exec")
    check("note: terminal command at >>> is a syntax error", "compiled", "SyntaxError")
except SyntaxError:
    check("note: terminal command at >>> is a syntax error", "SyntaxError", "SyntaxError")
# PATH separator claim: semicolons on Windows, colons on macOS and Linux.
check("PATH separator matches the prose for this OS",
    os.pathsep, ";" if os.name == "nt" else ":")

print("=== section: Self-aware programs ===")
repl_seq("sys.version_info.major",
    [("import sys", True), ("sys.version_info.major", False)],
    ["3"])
raises("import of a missing module",
    "import imaginarytoolkit",
    "ModuleNotFoundError: No module named 'imaginarytoolkit'")
check("module guard program",
    run("""try:
    import imaginarytoolkit
except ModuleNotFoundError:
    print('imaginarytoolkit is not installed, falling back to plain text')"""),
    "imaginarytoolkit is not installed, falling back to plain text")
# os.name / sys.platform claims, checked for the machine running this script.
check("os.name is one of the two documented values",
    os.name in ("nt", "posix"), True)
if os.name == "nt":
    check("sys.platform on Windows", sys.platform, "win32")
else:
    check("sys.platform on macOS/Linux is darwin or linux",
        sys.platform in ("darwin", "linux"), True)

print("=== section: Command line arguments ===")
NAMETAG = """import sys
print('Arguments received:')
print(sys.argv)"""
check("transcript: nametag.py hello world",
    cli("nametag.py", NAMETAG, ["hello", "world"]),
    "Arguments received:\n['nametag.py', 'hello', 'world']")
check("transcript: nametag.py \"hello world\" (quoted, one argument)",
    cli("nametag.py", NAMETAG, ["hello world"]),
    "Arguments received:\n['nametag.py', 'hello world']")
repl_seq("arguments are strings until converted",
    [("'4' + '9'", False), ("int('4') + int('9')", False)],
    ["'49'", "13"])
check("repeat_greeting with a hardcoded argv list",
    run("""def repeat_greeting(argv):
    name = argv[1]
    times = int(argv[2])
    for i in range(times):
        print('Hello, ' + name)

repeat_greeting(['greet.py', 'Maya', '2'])"""),
    "Hello, Maya\nHello, Maya")

print("=== section: Designing a text interface ===")
check("rate: usage line, then a real run",
    run("""def rate(argv):
    if len(argv) < 3:
        print('usage: rate.py MILES HOURS')
        return
    miles = float(argv[1])
    hours = float(argv[2])
    print(miles / hours)

rate(['rate.py'])
rate(['rate.py', '150', '3'])"""),
    "usage: rate.py MILES HOURS\n50.0")
repl_seq("conditional expression picks the clear command",
    [("kind = 'posix'", True), ("'cls' if kind == 'nt' else 'clear'", False),
     ("kind = 'nt'", True), ("'cls' if kind == 'nt' else 'clear'", False)],
    ["'clear'", "'cls'"])

print("=== section: initials.py ===")
INITIALS = """import sys

def acronym(argv):
    if len(argv) < 2:
        print('usage: initials.py WORD [WORD ...] [--dots]')
        return
    words = []
    dots = False
    for arg in argv[1:]:
        if arg == '--dots':
            dots = True
        else:
            words.append(arg)
    letters = []
    for word in words:
        letters.append(word[0].upper())
    if dots:
        print('.'.join(letters) + '.')
    else:
        print(''.join(letters))

acronym(sys.argv)"""
check("transcript: initials.py automate the boring stuff",
    cli("initials.py", INITIALS, ["automate", "the", "boring", "stuff"]),
    "ATBS")
check("transcript: initials.py automate the boring stuff --dots",
    cli("initials.py", INITIALS, ["automate", "the", "boring", "stuff", "--dots"]),
    "A.T.B.S.")
check("transcript: initials.py with no arguments",
    cli("initials.py", INITIALS, []),
    "usage: initials.py WORD [WORD ...] [--dots]")
check("in-app simulation: acronym(['initials.py', 'practice', 'log'])",
    run(INITIALS.replace("acronym(sys.argv)",
        "acronym(['initials.py', 'practice', 'log'])")),
    "PL")

print("=== practice-question executable claims ===")
check("q7: sys.argv for python3 tags.py red blue",
    cli("tags.py", "import sys\nprint(sys.argv)", ["red", "blue"]),
    "['tags.py', 'red', 'blue']")
repl_seq("q8: '4' + '9' concatenates; int() converts",
    [("'4' + '9'", False), ("int('4') + int('9')", False)],
    ["'49'", "13"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Count the arguments",
    run("""args = ['tally.py', 'red', 'green', 'blue']
print(args[0])
print(len(args) - 1)"""),
    "tally.py\n3")
check("ex2 Strings in, numbers out",
    run("""args = ['add.py', '4', '9']
print(args[1] + args[2])
print(int(args[1]) + int(args[2]))"""),
    "49\n13")
check("ex3 The usage message",
    run("""def shout(argv):
    if len(argv) < 2:
        print('usage: shout.py WORD')
    else:
        print(argv[1].upper())

shout(['shout.py'])
shout(['shout.py', 'quiet'])"""),
    "usage: shout.py WORD\nQUIET")
check("ex4 Flags versus words",
    run("""args = ['banner.py', 'launch', 'day', '--upper']
words = []
upper = False
for arg in args[1:]:
    if arg == '--upper':
        upper = True
    else:
        words.append(arg)
line = ' '.join(words)
if upper:
    line = line.upper()
print(line)"""),
    "LAUNCH DAY")

print()
print("CH12 VERIFY: ALL PASS" if fails == 0 else f"CH12 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
