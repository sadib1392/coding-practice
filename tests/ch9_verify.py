# Verify every code snippet shown in book/ch09.js.
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

print("=== section: Finding text patterns without regular expressions ===")
check("plain-Python order-code checker",
    run("""def is_order_code(text):
    if len(text) != 13:
        return False
    if text[0:4] != 'ORD-':
        return False
    for i in range(4, 8):
        if not text[i].isdecimal():
            return False
    if text[8] != '-':
        return False
    for i in range(9, 13):
        if not text[i].isdecimal():
            return False
    return True

print(is_order_code('ORD-2026-0481'))
print(is_order_code('ORD-26-481'))"""),
    "True\nFalse")

print("=== section: Finding text patterns with regular expressions ===")
repl_seq("compile / search / group",
    [("import re", True),
     (r"code_pat = re.compile(r'ORD-\d{4}-\d{4}')", True),
     ("mo = code_pat.search('Invoice for ORD-2026-0481 enclosed')", True),
     ("mo.group()", False)],
    ["'ORD-2026-0481'"])
repl_seq("search returns None on no match (shown via print -> None)",
    [("import re", True),
     (r"code_pat = re.compile(r'ORD-\d{4}-\d{4}')", True),
     ("code_pat.search('no codes in this sentence')", False)],
    ["None"])
repl_seq("group() on None raises AttributeError",
    [("import re", True),
     (r"code_pat = re.compile(r'ORD-\d{4}-\d{4}')", True),
     ("mo = code_pat.search('no codes in this sentence')", True),
     ("mo.group()", False)],
    ["AttributeError: 'NoneType' object has no attribute 'group'"])
repl_seq("raw string keeps the backslash",
    [(r"len('\b')", False), (r"len(r'\b')", False)],
    ["1", "2"])

print("=== section: Grouping with parentheses and the pipe ===")
repl_seq("two groups: group(1)/group(2)/group()/groups()",
    [("import re", True),
     (r"pair = re.compile(r'ORD-(\d{4})-(\d{4})')", True),
     ("mo = pair.search('Reprint ORD-2026-0481 for the archive')", True),
     ("mo.group(1)", False), ("mo.group(2)", False),
     ("mo.group()", False), ("mo.groups()", False)],
    ["'2026'", "'0481'", "'ORD-2026-0481'", "('2026', '0481')"])
repl_seq("escaped literal parentheses",
    [("import re", True),
     (r"shelf = re.compile(r'\((\d{2})\)')", True),
     ("shelf.search('Shelf (07) is full').group()", False),
     ("shelf.search('Shelf (07) is full').group(1)", False)],
    ["'(07)'", "'07'"])
repl_seq("pipe alternatives, earliest occurrence wins",
    [("import re", True),
     ("carrier = re.compile(r'UPS|FedEx|DHL')", True),
     ("carrier.search('Shipped via FedEx on Monday').group()", False),
     ("carrier.search('DHL handed this to UPS at the border').group()", False)],
    ["'FedEx'", "'DHL'"])
repl_seq("pipe scoped inside a group",
    [("import re", True),
     (r"container = re.compile(r'(pallet|crate) #(\d{2})')", True),
     ("mo = container.search('Move crate #31 to bay 9')", True),
     ("mo.group(1)", False), ("mo.group()", False)],
    ["'crate'", "'crate #31'"])

print("=== section: Quantifiers ===")
repl_seq("? optional group",
    [("import re", True),
     ("warn = re.compile(r'WARN(ING)?')", True),
     ("warn.search('level=WARN disk almost full').group()", False),
     ("warn.search('WARNING: retrying in 5 seconds').group()", False)],
    ["'WARN'", "'WARNING'"])
repl_seq("* zero or more",
    [("import re", True),
     ("sec = re.compile(r'(sub)*section')", True),
     ("sec.search('see the subsubsection on refunds').group()", False),
     ("sec.search('the section header').group()", False)],
    ["'subsubsection'", "'section'"])
repl_seq("+ one or more (and its None case)",
    [("import re", True),
     (r"bay = re.compile(r'bay \d+')", True),
     ("bay.search('forklift to bay 214').group()", False),
     ("bay.search('forklift to bay ')", False)],
    ["'bay 214'", "None"])
repl_seq("{4,6} greedy vs {4,6}? non-greedy",
    [("import re", True),
     (r"door = re.compile(r'\d{4,6}')", True),
     ("door.search('door code 493218 today').group()", False),
     (r"door_lazy = re.compile(r'\d{4,6}?')", True),
     ("door_lazy.search('door code 493218 today').group()", False)],
    ["'493218'", "'4932'"])

print("=== section: findall and character classes ===")
repl_seq("findall without groups: list of strings",
    [("import re", True),
     ("log = 'ORD-2026-0481 shipped; ORD-2025-9930 delayed; ORD-2026-1004 packed'", True),
     (r"re.compile(r'ORD-\d{4}-\d{4}').findall(log)", False)],
    ["['ORD-2026-0481', 'ORD-2025-9930', 'ORD-2026-1004']"])
repl_seq("findall with two groups: list of tuples",
    [("import re", True),
     ("log = 'ORD-2026-0481 shipped; ORD-2025-9930 delayed; ORD-2026-1004 packed'", True),
     (r"re.compile(r'ORD-(\d{4})-(\d{4})').findall(log)", False)],
    ["[('2026', '0481'), ('2025', '9930'), ('2026', '1004')]"])
repl_seq("shorthand classes \\d+ \\w+",
    [("import re", True),
     (r"item = re.compile(r'\d+ \w+')", True),
     ("item.findall('12 bolts, 3 hinges, 40 washers')", False)],
    ["['12 bolts', '3 hinges', '40 washers']"])
repl_seq("custom class and negated class",
    [("import re", True),
     ("re.compile(r'[aeiou]').findall('Forklift out of service')", False),
     ("re.compile(r'[^aeiou ]').findall('bay nine')", False)],
    ["['o', 'i', 'o', 'u', 'o', 'e', 'i', 'e']", "['b', 'y', 'n', 'n']"])
repl_seq("[0-57] is 0-5 plus 7",
    [("import re", True),
     ("re.compile(r'[0-57]').findall('0123456789')", False)],
    ["['0', '1', '2', '3', '4', '5', '7']"])

print("=== section: Anchors, the dot, and dot-star ===")
repl_seq("^ and $ force the whole string to fit",
    [("import re", True),
     (r"bin_pat = re.compile(r'^B-\d{2}$')", True),
     ("bin_pat.search('B-12').group()", False),
     ("bin_pat.search('bin B-12')", False)],
    ["'B-12'", "None"])
repl_seq("dot is exactly one character",
    [("import re", True),
     ("bg = re.compile(r'b.g')", True),
     ("bg.findall('big bag bug bog')", False),
     ("bg.search('brig')", False)],
    ["['big', 'bag', 'bug', 'bog']", "None"])
repl_seq("dot-star grabs between landmarks",
    [("import re", True),
     ("field = re.compile(r'user=(.*) role=(.*)')", True),
     ("mo = field.search('user=mira role=admin')", True),
     ("mo.group(1)", False), ("mo.group(2)", False)],
    ["'mira'", "'admin'"])
repl_seq("greedy vs non-greedy dot-star",
    [("import re", True),
     (r"re.compile(r'\[.*\]').search('[boot] chatter [ready]').group()", False),
     (r"re.compile(r'\[.*?\]').search('[boot] chatter [ready]').group()", False)],
    ["'[boot] chatter [ready]'", "'[boot]'"])
repl_seq("dot stops at newline unless re.DOTALL",
    [("import re", True),
     (r"re.compile(r'.*').search('line one\nline two').group()", False),
     (r"re.compile(r'.*', re.DOTALL).search('line one\nline two').group()", False)],
    ["'line one'", r"'line one\nline two'"])

print("=== section: Substituting text and taming big patterns ===")
repl_seq("sub replaces every match",
    [("import re", True),
     (r"redact = re.compile(r'\w+@\w+\.\w+')", True),
     ("redact.sub('[email removed]', 'Contact mira@example.com or dev@example.org today')", False)],
    ["'Contact [email removed] or [email removed] today'"])
repl_seq("sub with \\1 keeps a captured piece",
    [("import re", True),
     (r"mask = re.compile(r'\d{4}(\d{2})')", True),
     (r"mask.sub(r'****\1', 'codes 493218 and 771402')", False)],
    ["'codes ****18 and ****02'"])
repl_seq("re.IGNORECASE",
    [("import re", True),
     ("level = re.compile(r'error', re.IGNORECASE)", True),
     ("level.search('ERROR: pump offline').group()", False),
     ("level.search('Minor error logged').group()", False)],
    ["'ERROR'", "'error'"])
check("re.VERBOSE program",
    run(r"""import re
code_pat = re.compile(r'''
    ORD-        # the literal prefix
    (\d{4})     # four-digit year
    -           # the separating dash
    (\d{4})     # four-digit serial
    ''', re.VERBOSE)
print(code_pat.search('Recheck ORD-2026-0481 today').group())"""),
    "ORD-2026-0481")
check("combined flags program (IGNORECASE | VERBOSE)",
    run(r"""import re
loose = re.compile(r'''
    ord-        # prefix, any case
    \d{4}       # year
    -           # dash
    \d{4}       # serial
    ''', re.IGNORECASE | re.VERBOSE)
print(loose.search('Confirm Ord-2026-0481 received').group())"""),
    "Ord-2026-0481")

print("=== practice-question executable claims ===")
repl_seq("q1: '\\b' collapses, r'\\b' survives",
    [(r"len('\b')", False), (r"len(r'\b')", False)],
    ["1", "2"])
repl_seq("q2: group() on a failed search raises",
    [("import re", True),
     (r"mo = re.compile(r'ORD-\d{4}').search('nothing here')", True),
     ("mo.group()", False)],
    ["AttributeError: 'NoneType' object has no attribute 'group'"])
repl_seq("q3: group(0)/(1)/(2) numbering",
    [("import re", True),
     (r"qmo = re.compile(r'ORD-(\d{4})-(\d{4})').search('ORD-2026-0481')", True),
     ("qmo.group(0)", False), ("qmo.group(1)", False), ("qmo.group(2)", False)],
    ["'ORD-2026-0481'", "'2026'", "'0481'"])
repl_seq("q4: \\d* allows zero digits, \\d+ does not",
    [("import re", True),
     (r"re.compile(r'bay \d*').search('bay ').group()", False),
     (r"re.compile(r'bay \d+').search('bay ')", False)],
    ["'bay '", "None"])
repl_seq("q5: lazy {4,6}? takes four, greedy takes six",
    [("import re", True),
     (r"re.compile(r'\d{4,6}?').search('493218').group()", False),
     (r"re.compile(r'\d{4,6}').search('493218').group()", False)],
    ["'4932'", "'493218'"])
repl_seq("q6: findall shape without and with groups",
    [("import re", True),
     (r"re.compile(r'B-\d{2}').findall('B-07 and B-12')", False),
     (r"re.compile(r'(B)-(\d{2})').findall('B-07 and B-12')", False)],
    ["['B-07', 'B-12']", "[('B', '07'), ('B', '12')]"])
repl_seq("q7: \\d \\w \\S spot checks",
    [("import re", True),
     (r"re.compile(r'\d').findall('a1b2')", False),
     (r"re.compile(r'\w').findall('a_9-')", False),
     (r"re.compile(r'\S+').findall(' a b ')", False)],
    ["['1', '2']", "['a', '_', '9']", "['a', 'b']"])
repl_seq("q8: [^aeiou] negates inside brackets",
    [("import re", True),
     ("re.compile(r'[^aeiou]').findall('bay')", False)],
    ["['b', 'y']"])
repl_seq("q9: bracketed greedy vs non-greedy",
    [("import re", True),
     (r"re.compile(r'\[.*\]').search('[boot] chatter [ready]').group()", False),
     (r"re.compile(r'\[.*?\]').search('[boot] chatter [ready]').group()", False)],
    ["'[boot] chatter [ready]'", "'[boot]'"])
repl_seq("q10: flags combine with |",
    [("import re", True),
     (r"re.compile(r'b-\d{2}', re.IGNORECASE | re.VERBOSE).search('label B-07').group()", False)],
    ["'B-07'"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 First code, then the count",
    run(r"""import re
line = 'Manifest: ORD-2026-0481, ORD-2025-9930, ORD-2026-1004'
pat = re.compile(r'ORD-\d{4}-\d{4}')
print(pat.search(line).group())
print(len(pat.findall(line)))"""),
    "ORD-2026-0481\n3")
check("ex2 Split the code",
    run(r"""import re
code = 'ORD-2026-0481'
pat = re.compile(r'ORD-(\d{4})-(\d{4})')
mo = pat.search(code)
print(mo.group(1))
print(mo.group(2))"""),
    "2026\n0481")
check("ex3 Redacted log",
    run(r"""import re
log = 'mira@example.com opened bay 7; dev@example.org closed bay 12'
pat = re.compile(r'\w+@\w+\.\w+')
print(pat.sub('[redacted]', log))"""),
    "[redacted] opened bay 7; [redacted] closed bay 12")
check("ex4 Label check",
    run(r"""import re
labels = ['B-07', 'B-123', 'C-44', 'B-9']
pat = re.compile(r'^B-\d{2}$')
for label in labels:
    mo = pat.search(label)
    if mo != None:
        print(label + ' ok')
    else:
        print(label + ' bad')"""),
    "B-07 ok\nB-123 bad\nC-44 bad\nB-9 bad")

print()
print("CH9 VERIFY: ALL PASS" if fails == 0 else f"CH9 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
