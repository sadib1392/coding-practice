# Verify every code snippet shown in book/ch10.js.
# Same idea as ch2_verify.py, but self-checking: each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
# File-writing snippets run inside a fresh temp directory, never the repo.
import io, contextlib, builtins, sys, os, tempfile

os.chdir(tempfile.mkdtemp())

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

print("=== section: Files and filepaths ===")
repl_seq("Path and / joining",
    [("from pathlib import Path", True),
     ("Path('field_notes')", False),
     ("Path('field_notes') / '2026' / 'day03.txt'", False)],
    ["PosixPath('field_notes')", "PosixPath('field_notes/2026/day03.txt')"])
repl_seq("multi-argument Path()",
    [("from pathlib import Path", True),
     ("Path('field_notes', '2026', 'day03.txt')", False)],
    ["PosixPath('field_notes/2026/day03.txt')"])
repl_seq("str() and the two-strings TypeError",
    [("from pathlib import Path", True),
     ("str(Path('field_notes') / '2026' / 'day03.txt')", False),
     ("'field_notes' / '2026'", False)],
    ["'field_notes/2026/day03.txt'",
     "TypeError: unsupported operand type(s) for /: 'str' and 'str'"])
repl_seq("note: string addition builds a nonsense name",
    [("'field_notes' + '2026'", False)],
    ["'field_notes2026'"])

print("=== section: Absolute paths, relative paths, and the working directory ===")
repl_seq("is_absolute on both kinds",
    [("from pathlib import Path", True),
     ("Path('/usr/local/notes.txt').is_absolute()", False),
     ("Path('field_notes/day03.txt').is_absolute()", False)],
    ["True", "False"])

print("=== section: Making folders and taking paths apart ===")
check("mkdir parents/exist_ok then is_dir",
    run("""from pathlib import Path
Path('field_notes/2026').mkdir(parents=True, exist_ok=True)
print(Path('field_notes/2026').is_dir())"""),
    "True")
repl_seq("path parts as attributes",
    [("from pathlib import Path", True),
     ("p = Path('field_notes/2026/day03.txt')", True),
     ("p.name", False),
     ("p.stem", False),
     ("p.suffix", False),
     ("p.parent", False),
     ("p.parent.parent", False)],
    ["'day03.txt'", "'day03'", "'.txt'",
     "PosixPath('field_notes/2026')", "PosixPath('field_notes')"])
repl_seq("anchor: absolute vs relative",
    [("from pathlib import Path", True),
     ("Path('/usr/local/notes.txt').anchor", False),
     ("Path('field_notes/day03.txt').anchor", False)],
    ["'/'", "''"])
repl_seq("note: stem/suffix split on the last dot",
    [("from pathlib import Path", True),
     ("Path('archive.tar.gz').stem", False),
     ("Path('archive.tar.gz').suffix", False)],
    ["'archive.tar'", "'.gz'"])

print("=== section: Checking paths: exists, size, and glob ===")
check("build trip folder and check exists/is_dir",
    run("""from pathlib import Path
Path('trip').mkdir(exist_ok=True)
Path('trip/day01.txt').write_text('set off at dawn\\n')
Path('trip/day02.txt').write_text('rain all morning\\n')
Path('trip/gear.csv').write_text('item,packed\\n')
print(Path('trip/day01.txt').exists())
print(Path('trip/day03.txt').exists())
print(Path('trip').is_dir())
print(Path('trip/day01.txt').is_dir())"""),
    "True\nFalse\nTrue\nFalse")
repl_seq("stat().st_size of the two texts",
    [("from pathlib import Path", True),
     ("Path('trip/day01.txt').stat().st_size", False),
     ("Path('trip/day02.txt').stat().st_size", False)],
    ["16", "17"])
check("sorted glob('*.txt') skips the csv",
    run("""from pathlib import Path
for p in sorted(Path('trip').glob('*.txt')):
    print(p.name)"""),
    "day01.txt\nday02.txt")

print("=== section: Reading files: open, read, close ===")
check("write forecast.txt then open/read/close",
    run("""from pathlib import Path
Path('forecast.txt').write_text('wind from the west\\nrain by evening\\n')
f = open('forecast.txt')
text = f.read()
f.close()
print(text)"""),
    "wind from the west\nrain by evening")
repl_seq("second read() returns empty string",
    [("f = open('forecast.txt')", True),
     ("f.read()", False),
     ("f.read()", False),
     ("f.close()", True)],
    ["'wind from the west\\nrain by evening\\n'", "''"])
repl_seq("readlines keeps trailing newlines",
    [("f = open('forecast.txt')", True),
     ("f.readlines()", False),
     ("f.close()", True)],
    ["['wind from the west\\n', 'rain by evening\\n']"])
repl_seq("missing file raises FileNotFoundError",
    [("open('missing.txt')", False)],
    ["FileNotFoundError: [Errno 2] No such file or directory: 'missing.txt'"])

print("=== section: Writing, appending, and the with statement ===")
repl_seq("write() returns the character count",
    [("f = open('camp_log.txt', 'w')", True),
     ("f.write('day 1: set off\\n')", False),
     ("f.write('day 2: rain\\n')", False),
     ("f.close()", True)],
    ["15", "12"])
check("read camp_log back",
    run("""f = open('camp_log.txt')
print(f.read())
f.close()"""),
    "day 1: set off\nday 2: rain")
check("'w' truncates the existing file",
    run("""f = open('camp_log.txt', 'w')
f.write('replaced\\n')
f.close()
f = open('camp_log.txt')
print(f.read())
f.close()"""),
    "replaced")
check("'a' appends to the end",
    run("""f = open('camp_log.txt', 'a')
f.write('appended\\n')
f.close()
f = open('camp_log.txt')
print(f.read())
f.close()"""),
    "replaced\nappended")
check("no newlines means glued output",
    run("""f = open('glued.txt', 'w')
f.write('spam')
f.write('eggs')
f.close()
f = open('glued.txt')
print(f.read())
f.close()"""),
    "spameggs")
check("with statement reads and closes",
    run("""with open('camp_log.txt') as f:
    print(f.read())"""),
    "replaced\nappended")

print("=== section: Shortcuts and shelves ===")
repl_seq("write_text count and read_text round trip",
    [("from pathlib import Path", True),
     ("Path('motto.txt').write_text('measure twice, cut once\\n')", False),
     ("Path('motto.txt').read_text()", False)],
    ["24", "'measure twice, cut once\\n'"])
check("shelve stores and restores a list",
    run("""import shelve
shelf = shelve.open('campdata')
shelf['gear'] = ['tent', 'lantern', 'rope']
shelf.close()
shelf = shelve.open('campdata')
print(shelf['gear'])
shelf.close()"""),
    "['tent', 'lantern', 'rope']")

print("=== section: the packing list program ===")
check("packing list end to end",
    run("""with open('packing.txt', 'w') as f:
    f.write('stove\\nmatches\\ncompass\\n')
with open('packing.txt', 'a') as f:
    f.write('map\\n')
with open('packing.txt') as f:
    lines = f.readlines()
print('Packing list, ' + str(len(lines)) + ' items:')
for i in range(len(lines)):
    print(str(i + 1) + '. ' + lines[i].strip())"""),
    "Packing list, 4 items:\n1. stove\n2. matches\n3. compass\n4. map")

print("=== practice-question executable claims ===")
repl_seq("q3: evaluate the joined path",
    [("from pathlib import Path", True),
     ("Path('spam') / 'eggs' / 'ham'", False)],
    ["PosixPath('spam/eggs/ham')"])
repl_seq("q4: name/stem/suffix of data/summary.csv",
    [("from pathlib import Path", True),
     ("Path('data/summary.csv').name", False),
     ("Path('data/summary.csv').stem", False),
     ("Path('data/summary.csv').suffix", False)],
    ["'summary.csv'", "'summary'", "'.csv'"])
check("q6: 'w' wipes before the new write",
    run("""with open('qsix.txt', 'w') as f:
    f.write('one\\ntwo\\n')
with open('qsix.txt', 'w') as f:
    f.write('three\\n')
with open('qsix.txt') as f:
    print(f.read())"""),
    "three")
repl_seq("q7: 'r' raises, 'w' and 'a' create",
    [("from pathlib import Path", True),
     ("Path('q7_missing.txt').exists()", False),
     ("open('q7_missing.txt')", False),
     ("f = open('q7_new.txt', 'w')", True),
     ("f.close()", True),
     ("Path('q7_new.txt').exists()", False),
     ("g = open('q7_added.txt', 'a')", True),
     ("g.close()", True),
     ("Path('q7_added.txt').exists()", False)],
    ["False",
     "FileNotFoundError: [Errno 2] No such file or directory: 'q7_missing.txt'",
     "True", "True"])
check("q10: closed is True after the with block",
    run("""with open('forecast.txt') as f:
    text = f.read()
print(f.closed)"""),
    "True")

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Write it, then read it back",
    run("""with open('greeting.txt', 'w') as f:
    f.write('The file outlives the program\\n')
with open('greeting.txt') as f:
    print(f.read())"""),
    "The file outlives the program")
check("ex2 The camping list, numbered",
    run("""with open('camping.txt', 'w') as f:
    f.write('tent\\nlantern\\nrope\\n')
with open('camping.txt') as f:
    lines = f.readlines()
for i in range(len(lines)):
    print(str(i + 1) + ': ' + lines[i].strip())"""),
    "1: tent\n2: lantern\n3: rope")
check("ex3 Append, do not overwrite",
    run("""with open('journal.txt', 'w') as f:
    f.write('checked the tides\\n')
with open('journal.txt', 'a') as f:
    f.write('patched the hull\\n')
    f.write('set sail\\n')
with open('journal.txt') as f:
    print(f.read())"""),
    "checked the tides\npatched the hull\nset sail")
check("ex4 Take the path apart",
    run("""from pathlib import Path
p = Path('field_notes/2026/day03.txt')
print(p.name)
print(p.stem)
print(p.suffix)
print(p.parent)"""),
    "day03.txt\nday03\n.txt\nfield_notes/2026")

print()
print("CH10 VERIFY: ALL PASS" if fails == 0 else f"CH10 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
