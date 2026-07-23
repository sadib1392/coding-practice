# Verify every code snippet shown in book/ch19.js.
# Same self-checking pattern as ch2_verify.py: each deterministic snippet's
# expected output (as embedded in the chapter file) is asserted here, so any
# drift between the chapter text and real execution fails the run.
# Nondeterministic demos (time.time, ctime, now, sleeps, launched children)
# are property-checked instead of string-matched.
import io, contextlib, builtins, sys, shutil, subprocess, datetime, time

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

print("=== section: The Unix epoch and time.time() ===")
t1 = time.time()
t2 = time.time()
check("time.time() returns a float", type(t1).__name__, "float")
check("epoch timestamp past 1.78 billion (mid-2026 claim)", t1 > 1_780_000_000, True)
check("a later call is not smaller", t2 >= t1, True)
ctime_parts = time.ctime().split()
check("ctime shape: weekday month day clock year", len(ctime_parts), 5)
check("ctime ends with a four-digit year", len(ctime_parts[-1]) == 4 and ctime_parts[-1].isdigit(), True)
timing_out = run("""import time
start = time.time()
total = 0
for n in range(1, 1000001):
    total = total + n * n
finish = time.time()
print('sum of the first million squares:', total)
print('seconds:', round(finish - start, 3))""").split("\n")
check("timing script: deterministic sum line", timing_out[0],
    "sum of the first million squares: 333333833333500000")
check("timing script: seconds line shape (one-run value not asserted)",
    timing_out[1].startswith("seconds: ") and 0 <= float(timing_out[1][9:]) < 60, True)
repl_seq("round trims elapsed floats",
    [("round(87.276451, 2)", False), ("round(87.276451)", False), ("round(3.10, 2)", False)],
    ["87.28", "87", "3.1"])

print("=== section: Pausing with time.sleep() ===")
check("ready/steady/go loop text is fixed",
    run("""import time
for step in ['ready', 'steady', 'go']:
    print(step)
    time.sleep(0.2)"""),
    "ready\nsteady\ngo")
check("sleep returns None (its value is the delay)", time.sleep(0.01) is None, True)

print("=== section: A moment in time: datetime ===")
repl_seq("fixed constructor, repr drops trailing zero seconds",
    [("import datetime", True),
     ("launch = datetime.datetime(2026, 7, 23, 9, 30, 0)", True),
     ("launch", False),
     ("launch.year, launch.month, launch.day", False),
     ("launch.hour, launch.minute, launch.second", False)],
    ["datetime.datetime(2026, 7, 23, 9, 30)", "(2026, 7, 23)", "(9, 30, 0)"])
repl_seq("comparisons: the later moment is the greater",
    [("import datetime", True),
     ("handed_in = datetime.datetime(2026, 7, 22, 23, 40, 0)", True),
     ("due = datetime.datetime(2026, 7, 23, 9, 0, 0)", True),
     ("handed_in < due", False), ("due > handed_in", False), ("handed_in == due", False)],
    ["True", "True", "False"])
check("fromtimestamp bridges to a datetime (local-zone value not asserted)",
    isinstance(datetime.datetime.fromtimestamp(1784000000), datetime.datetime), True)

print("=== section: Durations: timedelta and date arithmetic ===")
repl_seq("timedelta normalises to days/seconds/microseconds",
    [("import datetime", True),
     ("gap = datetime.timedelta(weeks=2, days=3, hours=4, minutes=5)", True),
     ("gap.days, gap.seconds, gap.microseconds", False),
     ("gap.total_seconds()", False),
     ("str(gap)", False)],
    ["(17, 14700, 0)", "1483500.0", "'17 days, 4:05:00'"])
repl_seq("any-scale input normalises",
    [("import datetime", True), ("datetime.timedelta(hours=50)", False)],
    ["datetime.timedelta(days=2, seconds=7200)"])
repl_seq("date arithmetic: shift, distance, scale",
    [("import datetime", True),
     ("datetime.datetime(2026, 7, 23) + datetime.timedelta(days=90)", False),
     ("datetime.datetime(2027, 1, 1) - datetime.datetime(2026, 7, 23)", False),
     ("datetime.timedelta(minutes=45) * 6", False),
     ("str(datetime.timedelta(minutes=45) * 6)", False),
     ("datetime.timedelta(hours=1) / 4", False)],
    ["datetime.datetime(2026, 10, 21, 0, 0)", "datetime.timedelta(days=162)",
     "datetime.timedelta(seconds=16200)", "'4:30:00'", "datetime.timedelta(seconds=900)"])
check("wait-for-a-date condition is a plain comparison",
    isinstance(datetime.datetime.now() < datetime.datetime(2026, 12, 1, 10, 0, 0), bool), True)
try:
    datetime.timedelta(months=1)
    check("timedelta(months=1) raises TypeError (note + q6)", "no error", "TypeError")
except TypeError:
    check("timedelta(months=1) raises TypeError (note + q6)", "TypeError", "TypeError")

print("=== section: strftime and strptime ===")
repl_seq("strftime renders a fixed stamp",
    [("import datetime", True),
     ("stamp = datetime.datetime(2026, 7, 23, 14, 5, 9)", True),
     ("stamp.strftime('%Y-%m-%d')", False),
     ("stamp.strftime('%d %B %Y')", False),
     ("stamp.strftime('%A at %I:%M %p')", False),
     ("stamp.strftime('%H:%M:%S')", False)],
    ["'2026-07-23'", "'23 July 2026'", "'Thursday at 02:05 PM'", "'14:05:09'"])
repl_seq("strptime parses fixed strings (unmentioned parts default)",
    [("import datetime", True),
     ("datetime.datetime.strptime('23/07/2026', '%d/%m/%Y')", False),
     ("datetime.datetime.strptime('2026-07-23 14:05', '%Y-%m-%d %H:%M')", False)],
    ["datetime.datetime(2026, 7, 23, 0, 0)", "datetime.datetime(2026, 7, 23, 14, 5)"])
repl_seq("mismatched format fails loudly",
    [("import datetime", True),
     ("datetime.datetime.strptime('23-07-2026', '%d/%m/%Y')", False)],
    ["ValueError: time data '23-07-2026' does not match format '%d/%m/%Y'"])
repl_seq("two-digit year pivot: 68 forward, 69 back",
    [("import datetime", True),
     ("datetime.datetime.strptime(\"May '68\", \"%B '%y\")", False),
     ("datetime.datetime.strptime(\"May '69\", \"%B '%y\")", False)],
    ["datetime.datetime(2068, 5, 1, 0, 0)", "datetime.datetime(1969, 5, 1, 0, 0)"])
repl_seq("note claim: %m is month, %M is minute",
    [("import datetime", True),
     ("stamp = datetime.datetime(2026, 7, 23, 14, 5, 9)", True),
     ("stamp.strftime('%m')", False), ("stamp.strftime('%M')", False)],
    ["'07'", "'05'"])
try:
    '2026'.strftime('%Y')
    check("note claim: strftime on a string raises AttributeError", "no error", "AttributeError")
except AttributeError:
    check("note claim: strftime on a string raises AttributeError", "AttributeError", "AttributeError")

print("=== section: launching programs (real child processes) ===")
if shutil.which("python3") is None:
    fails += 1
    print("FAIL python3 not on PATH; cannot verify the subprocess blocks")
else:
    proc = subprocess.Popen(['python3', '-c', 'import time; time.sleep(1)'])
    check("poll() while the child still runs", proc.poll() == None, True)
    check("wait() blocks then returns 0", proc.wait(), 0)
    check("poll() after exit", proc.poll(), 0)
    check("failing child reports through its exit code",
        subprocess.Popen(['python3', '-c', 'raise SystemExit(2)']).wait(), 2)
    result = subprocess.run(['python3', '-c', "print('backup finished')"],
        capture_output=True, text=True)
    check("run(): child stdout as shown", result.stdout, "backup finished\n")
    check("run(): clean exit returncode", result.returncode, 0)
    report = subprocess.run(['python3', '-c', "print('3 files copied')"],
        capture_output=True, text=True)
    check("capture_output keeps the child's text", report.stdout, "3 files copied\n")
    argv = subprocess.run(['python3', '-c', 'import sys; print(sys.argv[1])', 'quarterly.csv'],
        capture_output=True, text=True)
    check("prose claim: extra list items land in the child's sys.argv",
        argv.stdout, "quarterly.csv\n")

print("=== section: scheduling (countdown prose claim, sleep stubbed) ===")
class FakeTime:
    def __init__(self):
        self.calls = []
    def sleep(self, s):
        self.calls.append(s)
ft = FakeTime()
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    exec("""seconds_left = 10
while seconds_left > 0:
    print(seconds_left)
    time.sleep(1)
    seconds_left = seconds_left - 1""", {"time": ft})
check("steep timer counts 10 down to 1",
    buf.getvalue().rstrip("\n"), "\n".join(str(n) for n in range(10, 0, -1)))
check("steep timer sleeps one second per line", ft.calls, [1] * 10)

print("=== practice-question executable claims ===")
repl_seq("q3: round to two places and to whole",
    [("round(87.276451, 2)", False), ("round(87.276451)", False)],
    ["87.28", "87"])
check("q4: sleep returns None", time.sleep(0.01) is None, True)
repl_seq("q7: leap-year distance, 2026 vs 2028",
    [("import datetime", True),
     ("(datetime.datetime(2026, 3, 1) - datetime.datetime(2026, 2, 27)).days", False),
     ("(datetime.datetime(2028, 3, 1) - datetime.datetime(2028, 2, 27)).days", False)],
    ["2", "3"])
repl_seq("q9: %m versus %M on the fixed stamp",
    [("import datetime", True),
     ("stamp = datetime.datetime(2026, 7, 23, 14, 5, 9)", True),
     ("stamp.strftime('%m')", False), ("stamp.strftime('%M')", False)],
    ["'07'", "'05'"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Days until the deadline",
    run("""import datetime
opened = datetime.datetime(2026, 7, 23)
due = datetime.datetime(2026, 12, 25)
gap = due - opened
print('Days left:', gap.days)"""),
    "Days left: 155")
check("ex2 The invitation line",
    run("""import datetime
event = datetime.datetime(2026, 9, 12, 15, 30)
print(event.strftime('%A %d %B %Y, %I:%M %p'))"""),
    "Saturday 12 September 2026, 03:30 PM")
check("ex3 The library due date",
    run("""import datetime
def due_date(borrowed, loan_days):
    return borrowed + datetime.timedelta(days=loan_days)
print(due_date(datetime.datetime(2026, 7, 23), 21).strftime('%Y-%m-%d'))"""),
    "2026-08-13")
check("ex4 Tidy the appointment list",
    run("""import datetime
appointments = ['03/11/2026', '21/08/2026', '05/01/2027']
parsed = []
for s in appointments:
    parsed.append(datetime.datetime.strptime(s, '%d/%m/%Y'))
parsed.sort()
for d in parsed:
    print(d.strftime('%Y-%m-%d'))"""),
    "2026-08-21\n2026-11-03\n2027-01-05")

print()
print("CH19 VERIFY: ALL PASS" if fails == 0 else f"CH19 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
