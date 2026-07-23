# Verify every code snippet shown in book/ch08.js.
# Same idea as ch2_verify.py, self-checking: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run.
# The pyperclip example is third-party and desktop-only; the chapter shows it
# without a claimed output, so here it is compile-checked, and the round-trip
# runs only if pyperclip happens to be installed (otherwise it prints a skip).
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

print("=== section: String literals and escape sequences ===")
repl_seq("quote pairs and shell echo",
    [("shop = 'Fjord Antiques'", True), ("shop", False), ("\"we're open\"", False)],
    ["'Fjord Antiques'", '"we\'re open"'])
check("escaped quotes print",
    run(r"print('it\'s a bargain, isn\'t it')"),
    "it's a bargain, isn't it")
check("escaped backslash print",
    run(r"print('the ledger lives in C:\\finds')"),
    "the ledger lives in C:\\finds")
check("newline and tab escapes",
    run(r"print('Fjord Antiques\n\topen daily\n\tcash only')"),
    "Fjord Antiques\n\topen daily\n\tcash only")
check("mangled Windows path",
    run(r"print('C:\notes\treasures')"),
    "C:\notes\treasures")
check("raw string keeps backslashes",
    run(r"print(r'C:\notes\treasures')"),
    r"C:\notes\treasures")
check("triple-quoted multiline string",
    run("""notice = '''Closed for stocktake
back Monday
  - the management'''
print(notice)"""),
    "Closed for stocktake\nback Monday\n  - the management")

print("=== section: Indexes, slices, and in ===")
repl_seq("indexing lighthouse",
    [("word = 'lighthouse'", True), ("word[0]", False), ("word[5]", False),
     ("word[-1]", False), ("word[40]", False)],
    ["'l'", "'h'", "'e'", "IndexError: string index out of range"])
repl_seq("slices include start, exclude end",
    [("word = 'lighthouse'", True), ("word[0:5]", False), ("word[5:]", False), ("word[:5]", False)],
    ["'light'", "'house'", "'light'"])
repl_seq("slicing copies, original intact",
    [("word = 'lighthouse'", True), ("beam = word[0:5]", True),
     ("beam", False), ("word", False), ("'L' + word[1:]", False)],
    ["'light'", "'lighthouse'", "'Lighthouse'"])
try:
    exec("word = 'lighthouse'\nword[0] = 'L'", {})
    check("item assignment raises TypeError", "no error raised", "TypeError")
except TypeError as ex:
    check("item assignment raises TypeError", str(ex),
          "'str' object does not support item assignment")
repl_seq("in and not in are exact",
    [("word = 'lighthouse'", True), ("'house' in word", False), ("'House' in word", False),
     ("'ou' in word", False), ("'ship' not in word", False)],
    ["True", "False", "True", "True"])

print("=== section: f-strings, and two older ways ===")
repl_seq("concatenation vs f-string",
    [("name = 'Ines'", True), ("visits = 7", True),
     ("name + ' has ' + str(visits) + ' visits'", False),
     ("f'{name} has {visits} visits'", False)],
    ["'Ines has 7 visits'", "'Ines has 7 visits'"])
repl_seq("expression inside the braces",
    [("name = 'Ines'", True), ("visits = 7", True),
     ("f'{name} earns a free coffee in {10 - visits} visits'", False)],
    ["'Ines earns a free coffee in 3 visits'"])
repl_seq("%s interpolation and format()",
    [("'seat %s, row %s' % ('12A', 4)", False),
     ("'seat {}, row {}'.format('12A', 4)", False)],
    ["'seat 12A, row 4'", "'seat 12A, row 4'"])
repl_seq("missing f leaves braces literal",
    [("'{name} has {visits} visits'", False)],
    ["'{name} has {visits} visits'"])

print("=== section: Case, content checks, and ends ===")
repl_seq("recasing returns copies",
    [("answer = 'Oslo'", True), ("answer.upper()", False),
     ("answer.lower()", False), ("answer", False)],
    ["'OSLO'", "'oslo'", "'Oslo'"])
repl_seq("case-insensitive compare, isupper/islower",
    [("'OSLO'.lower() == 'oslo'", False), ("'OSLO'.isupper()", False),
     ("'Oslo'.islower()", False), ("'1926'.isupper()", False)],
    ["True", "True", "False", "False"])
repl_seq("isX family",
    [("'harbor'.isalpha()", False), ("'gate4'.isalpha()", False),
     ("'gate4'.isalnum()", False), ("'2049'.isdecimal()", False),
     ("'20.49'.isdecimal()", False), ("'   '.isspace()", False),
     ("'Winter Harbor'.istitle()", False)],
    ["True", "False", "True", "True", "False", "True", "True"])
repl_seq("startswith and endswith",
    [("report = 'harbor_survey.txt'", True), ("report.endswith('.txt')", False),
     ("report.startswith('harbor')", False), ("report.startswith('Harbor')", False)],
    ["True", "True", "False"])

print("=== section: Joining and splitting ===")
repl_seq("join is called on the separator",
    [("crew = ['Anya', 'Bo', 'Chen']", True), ("', '.join(crew)", False),
     ("' & '.join(crew)", False), ("crew.join(', ')", False)],
    ["'Anya, Bo, Chen'", "'Anya & Bo & Chen'",
     "AttributeError: 'list' object has no attribute 'join'"])
repl_seq("split three ways",
    [("'north gale rising'.split()", False),
     ("'oats,rice,lentils'.split(',')", False),
     (r"'crates\nbarrels\nsacks'.split('\n')", False)],
    ["['north', 'gale', 'rising']", "['oats', 'rice', 'lentils']",
     "['crates', 'barrels', 'sacks']"])
repl_seq("partition always returns three parts",
    [("'ana@harbor.example'.partition('@')", False),
     ("'ana.harbor'.partition('@')", False)],
    ["('ana', '@', 'harbor.example')", "('ana.harbor', '', '')"])

print("=== section: Aligning and trimming ===")
repl_seq("rjust, ljust, center, fill characters",
    [("'Tea'.rjust(10)", False), ("'Tea'.ljust(10)", False),
     ("'Tea'.center(10)", False), ("'Tea'.ljust(10, '.')", False),
     ("'SALE'.center(12, '-')", False)],
    ["'       Tea'", "'Tea       '", "'   Tea    '", "'Tea.......'", "'----SALE----'"])
check("two-column menu program",
    run("""rows = [['Candles', '2.75'], ['Matches', '0.60']]
for row in rows:
    print(row[0].ljust(10, '.') + row[1].rjust(6, '.'))"""),
    "Candles.....2.75\nMatches.....0.60")
repl_seq("strip family",
    [("entry = '   7 crates   '", True), ("entry.strip()", False),
     ("entry.lstrip()", False), ("entry.rstrip()", False)],
    ["'7 crates'", "'7 crates   '", "'   7 crates'"])
repl_seq("strip with a character-set argument",
    [("'--warning--'.strip('-')", False), ("'xyxxdockxyx'.strip('xy')", False)],
    ["'warning'", "'dock'"])

print("=== section: Code points and the clipboard ===")
repl_seq("ord, chr, and string ordering",
    [("ord('A')", False), ("ord('a')", False), ("chr(66)", False),
     ("chr(ord('n') + 1)", False), ("'apple' < 'banana'", False)],
    ["65", "97", "'B'", "'o'", "True"])
CLIP = ("import pyperclip\n"
        "pyperclip.copy('Meet at the north dock')\n"
        "text = pyperclip.paste()\n"
        "print(text.upper())")
try:
    compile(CLIP, "<clipboard example>", "exec")
    check("pyperclip example compiles", "compiles", "compiles")
except SyntaxError as ex:
    check("pyperclip example compiles", f"SyntaxError: {ex}", "compiles")
try:
    import pyperclip
except ImportError:
    print("skip: pyperclip not installed (chapter claims no output for it)")
else:
    saved = pyperclip.paste()
    pyperclip.copy('Meet at the north dock')
    check("pyperclip round-trip", pyperclip.paste().upper(), "MEET AT THE NORTH DOCK")
    pyperclip.copy(saved)

print("=== section: the badge maker ===")
check("badge maker program",
    run("""sheet = '''  priya raman
DEV OKAFOR
   lena wu  '''
for entry in sheet.split('\\n'):
    name = entry.strip().title()
    print('+' + '-' * 18 + '+')
    print('|' + name.center(18) + '|')
    print('+' + '-' * 18 + '+')"""),
    "+------------------+\n|   Priya Raman    |\n+------------------+\n"
    "+------------------+\n|    Dev Okafor    |\n+------------------+\n"
    "+------------------+\n|     Lena Wu      |\n+------------------+")

print("=== practice-question executable claims ===")
repl_seq("q1: escape lengths",
    [("len('\\n')", False), ("len('\\\\')", False)],
    ["1", "1"])
repl_seq("q2: raw string lengths and equality",
    [("len(r'\\n')", False), (r"r'C:\notes' == 'C:\\notes'", False)],
    ["2", "True"])
repl_seq("q3: lighthouse index and slice answers",
    [("word = 'lighthouse'", True), ("word[0]", False), ("word[-1]", False),
     ("word[0:5]", False), ("word[5:]", False)],
    ["'l'", "'e'", "'light'", "'house'"])
try:
    exec("word = 'lighthouse'\nword[0] = 'L'", {})
    check("q4: item assignment error", "no error raised", "TypeError")
except TypeError as ex:
    check("q4: item assignment error", str(ex),
          "'str' object does not support item assignment")
repl_seq("q4: the immutable-safe rebuild",
    [("word = 'lighthouse'", True), ("'L' + word[1:]", False)],
    ["'Lighthouse'"])
repl_seq("q5: in is case-sensitive, lowering fixes it",
    [("'House' in 'lighthouse'", False), ("'House'.lower() in 'lighthouse'", False)],
    ["False", "True"])
check("q6: with the f prefix", run("print(f'total: {2 + 3}')"), "total: 5")
check("q6: without the f prefix", run("print('total: {2 + 3}')"), "total: {2 + 3}")
repl_seq("q7: method result unstored, variable unchanged",
    [("label = 'quiet zone'", True), ("label.upper()", False), ("label", False)],
    ["'QUIET ZONE'", "'quiet zone'"])
repl_seq("q8: isdecimal and isspace answers",
    [("'2049'.isdecimal()", False), ("'20.49'.isdecimal()", False),
     ("'   '.isspace()", False)],
    ["True", "False", "True"])
repl_seq("q9: join on separator, split result",
    [("crew = ['Anya', 'Bo', 'Chen']", True), ("', '.join(crew)", False),
     ("'oats,rice,lentils'.split(',')", False), ("crew.join(', ')", False)],
    ["'Anya, Bo, Chen'", "['oats', 'rice', 'lentils']",
     "AttributeError: 'list' object has no attribute 'join'"])
# q10 (pyperclip roles and why it cannot run here) is covered by the
# compile check and the install-gated round-trip above.

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Split the compound",
    run("""word = 'snowstorm'
print(word[:4])
print(word[-5:])
print(word[:4] + word[-5:])"""),
    "snow\nstorm\nsnowstorm")
check("ex2 Clean the weather line",
    run("""city = '  reykjavik  '
temp = -3
cleaned = city.strip().title()
print(f'{cleaned}: {temp} degrees')"""),
    "Reykjavik: -3 degrees")
check("ex3 Repack the pantry list",
    run("""order = 'oats,rice,lentils'
parts = order.split(',')
print(parts)
print(' and '.join(parts))"""),
    "['oats', 'rice', 'lentils']\noats and rice and lentils")
check("ex4 Dotted menu",
    run("""items = [['Tea', '3.50'], ['Espresso', '4.25'], ['Oat scone', '2.90']]
for item in items:
    print(item[0].ljust(12, '.') + item[1].rjust(7, '.'))"""),
    "Tea............3.50\nEspresso.......4.25\nOat scone......2.90")

print()
print("CH8 VERIFY: ALL PASS" if fails == 0 else f"CH8 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
