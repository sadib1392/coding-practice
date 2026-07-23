# Verify every runnable code snippet shown in book/ch22.js.
# Same self-checking pattern as ch2_verify.py: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between the
# chapter text and real execution fails the run.
# Engine-dependent blocks (pytesseract, NAPS2, shell installs) show no outputs
# in the chapter and are deliberately not executed here — the chapter's early
# note discloses that they cannot run without a separately installed engine.
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

# The hardcoded sample string exactly as the chapter defines it.
RAW_SRC = "raw = 'Delivery con-\\nfirmed  for   order 2O2l\\n=\\nSigned by the recip-\\nient on arrival'"

print("=== section: Reading what the engine hands back ===")
check("sample printed shape",
    run(RAW_SRC + "\nprint(raw)"),
    "Delivery con-\nfirmed  for   order 2O2l\n=\nSigned by the recip-\nient on arrival")
repl_seq("shell echo of raw and its line list",
    [(RAW_SRC, True), ("raw", False), ("raw.split('\\n')", False)],
    ["'Delivery con-\\nfirmed  for   order 2O2l\\n=\\nSigned by the recip-\\nient on arrival'",
     "['Delivery con-', 'firmed  for   order 2O2l', '=', 'Signed by the recip-', 'ient on arrival']"])

print("=== section: Cleaning recognized text ===")
repl_seq("step one: hyphen-newline pairs removed",
    [(RAW_SRC, True), ("raw.replace('-\\n', '')", False)],
    ["'Delivery confirmed  for   order 2O2l\\n=\\nSigned by the recipient on arrival'"])
repl_seq("wrong order: newlines flattened first leaves words broken",
    [(RAW_SRC, True), ("raw.replace('\\n', ' ').replace('-\\n', '')", False)],
    ["'Delivery con- firmed  for   order 2O2l = Signed by the recip- ient on arrival'"])
check("step two: junk line dropped by length threshold",
    run(RAW_SRC + """
text = raw.replace('-\\n', '')
kept = []
for line in text.split('\\n'):
    if len(line) > 3:
        kept.append(line)
print('\\n'.join(kept))"""),
    "Delivery confirmed  for   order 2O2l\nSigned by the recipient on arrival")
repl_seq("content test instead of length test",
    [("import re", True),
     ("bool(re.search(r'[A-Za-z0-9]', '='))", False),
     ("bool(re.search(r'[A-Za-z0-9]', 'ok'))", False)],
    ["False", "True"])
repl_seq("step three: double-space replace undershoots, split-and-join levels",
    [("'confirmed  for   order'.replace('  ', ' ')", False),
     ("' '.join('confirmed  for   order'.split())", False)],
    ["'confirmed for  order'", "'confirmed for order'"])
check("the three general fixes chained on the sample",
    run(RAW_SRC + """
text = raw.replace('-\\n', '')
cleaned = []
for line in text.split('\\n'):
    if len(line) > 3:
        cleaned.append(' '.join(line.split()))
print('\\n'.join(cleaned))"""),
    "Delivery confirmed for order 2O2l\nSigned by the recipient on arrival")
check("scoped confusable fix on the known-format field",
    run("""line = 'Delivery confirmed for order 2O2l'
tail = line[-4:]
print(line[:-4] + tail.replace('O', '0').replace('l', '1'))"""),
    "Delivery confirmed for order 2021")
repl_seq("blanket replace mangles real words",
    [("'Delivery confirmed for order 2O2l'.replace('l', '1')", False)],
    ["'De1ivery confirmed for order 2O21'"])

print("=== practice-question executable claims ===")
repl_seq("q7: blanket O fix breaks the label; scoped fix does not",
    [("'ORDER-2O48'.replace('O', '0')", False),
     ("'ORDER-' + 'ORDER-2O48'[6:].replace('O', '0')", False)],
    ["'0RDER-2048'", "'ORDER-2048'"])
repl_seq("q8: replace halves runs, split-and-join levels them",
    [("'a    b'.replace('  ', ' ')", False),
     ("' '.join('a    b'.split())", False)],
    ["'a  b'", "'a b'"])
repl_seq("q9: hyphen replace must run before newline replace",
    [("'hy-\\nphen'.replace('\\n', ' ')", False),
     ("'hy-\\nphen'.replace('-\\n', '')", False)],
    ["'hy- phen'", "'hyphen'"])
repl_seq("q10: length threshold keeps and drops as claimed",
    [("[x for x in ['Delivery note', '=', '.:'] if len(x) > 3]", False),
     ("len('ok') > 3", False),
     ("import re", True),
     ("bool(re.search(r'[A-Za-z0-9]', 'ok'))", False)],
    ["['Delivery note']", "False", "True"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Reflow the courier note",
    run("""raw = 'The courier con-\\nfirmed the delivery\\nat the loading dock'
print(raw.replace('-\\n', '').replace('\\n', ' '))"""),
    "The courier confirmed the delivery at the loading dock")
check("ex2 Repair the invoice code",
    run("""code = 'INVOICE-2O2l-O07'
fixed = code[8:].replace('O', '0').replace('l', '1')
print(code[:8] + fixed)"""),
    "INVOICE-2021-007")
check("ex3 Check the header line",
    run("""raw = 'PACKING      LIST      PAGE  1'
expected = 'PACKING LIST PAGE 1'
cleaned = ' '.join(raw.split())
if cleaned == expected:
    print('header ok')
else:
    print('header wrong')"""),
    "header ok")
check("ex4 Drop the speck lines",
    run("""raw = 'Delivery note\\n=\\nItems checked twice\\n.:\\nSigned on arrival'
for line in raw.split('\\n'):
    if len(line) > 3:
        print(line)"""),
    "Delivery note\nItems checked twice\nSigned on arrival")

print()
print("CH22 VERIFY: ALL PASS" if fails == 0 else f"CH22 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
