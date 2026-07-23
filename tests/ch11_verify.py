# Verify every code snippet shown in book/ch11.js.
# Same idea as ch2_verify.py, but self-checking: each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
#
# Chapter 11 snippets create and destroy files, so this script chdirs into
# a throwaway temp directory before anything runs, and every block gets a
# fresh empty subdirectory — matching the chapter's promise that any block
# runs from scratch in an empty folder. Nothing touches the repo tree.
import io, contextlib, builtins, os, sys, tempfile

ROOT = tempfile.mkdtemp(prefix="ch11_verify_")
os.chdir(ROOT)

fails = 0
def check(label, got, want):
    global fails
    ok = got == want
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        fails += 1
        print(f"     got:  {got!r}")
        print(f"     want: {want!r}")

_blk = 0
def fresh():
    # Every chapter block is self-contained: give it an empty cwd.
    global _blk
    _blk += 1
    d = os.path.join(ROOT, f"blk{_blk:02d}")
    os.makedirs(d)
    os.chdir(d)

def exc_name(ex):
    # Tracebacks show builtins unqualified and shutil.Error qualified;
    # the chapter's error lines follow the same convention.
    t = type(ex)
    return t.__name__ if t.__module__ == "builtins" else f"{t.__module__}.{t.__name__}"

def repl_seq(label, steps, expected):
    # steps: list of (code, is_stmt) sharing one namespace, run in a fresh dir.
    # expected: list of repr/error strings for the non-statement steps.
    fresh()
    ns = {}
    got = []
    for code, is_stmt in steps:
        if is_stmt:
            exec(code, ns)
        else:
            try:
                got.append(repr(eval(code, ns)))
            except Exception as ex:
                got.append(f"{exc_name(ex)}: {ex}")
    check(label, got, expected)

def run(code, inputs=None):
    fresh()
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

print("=== section: Copying files and folders ===")
repl_seq("copy: into a new name, into a folder, missing source",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("os.makedirs('field_notes')", True),
     ("Path('field_notes/day1.txt').write_text('saw two herons')", False),
     ("shutil.copy('field_notes/day1.txt', 'field_notes/day1_spare.txt')", False),
     ("shutil.copy('field_notes/day1.txt', '.')", False),
     ("sorted(os.listdir('field_notes'))", False),
     ("shutil.copy('field_notes/day9.txt', 'spare.txt')", False)],
    ["14",
     "'field_notes/day1_spare.txt'",
     "'./day1.txt'",
     "['day1.txt', 'day1_spare.txt']",
     "FileNotFoundError: [Errno 2] No such file or directory: 'field_notes/day9.txt'"])
repl_seq("copytree: whole tree, then destination-exists error",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("os.makedirs('recipes/breads')", True),
     ("Path('recipes/soup.txt').write_text('leek and potato')", False),
     ("Path('recipes/breads/rye.txt').write_text('needs a starter')", False),
     ("shutil.copytree('recipes', 'recipes_backup')", False),
     ("sorted(os.listdir('recipes_backup'))", False),
     ("Path('recipes_backup/breads/rye.txt').read_text()", False),
     ("shutil.copytree('recipes', 'recipes_backup')", False)],
    ["15", "15",
     "'recipes_backup'",
     "['breads', 'soup.txt']",
     "'needs a starter'",
     "FileExistsError: [Errno 17] File exists: 'recipes_backup'"])

print("=== section: Moving and renaming ===")
repl_seq("move into an existing folder",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("os.makedirs('sorted_mail')", True),
     ("Path('invoice.txt').write_text('amount due: 40')", False),
     ("shutil.move('invoice.txt', 'sorted_mail')", False),
     ("os.path.exists('invoice.txt')", False)],
    ["14", "'sorted_mail/invoice.txt'", "False"])
repl_seq("rename, then missing parent folder error",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("Path('draft.txt').write_text('nearly finished')", False),
     ("shutil.move('draft.txt', 'final.txt')", False),
     ("shutil.move('final.txt', 'archive/final.txt')", False)],
    ["15", "'final.txt'",
     "FileNotFoundError: [Errno 2] No such file or directory: 'archive/final.txt'"])
repl_seq("missing folder silently becomes a rename",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("Path('notes.txt').write_text('call the vet')", False),
     ("shutil.move('notes.txt', 'archive')", False),
     ("os.path.isdir('archive')", False)],
    ["12", "'archive'", "False"])
repl_seq("explicit destination path replaces silently",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("Path('old_report.txt').write_text('first version')", False),
     ("Path('report.txt').write_text('second version')", False),
     ("shutil.move('old_report.txt', 'report.txt')", False),
     ("Path('report.txt').read_text()", False),
     ("os.path.exists('old_report.txt')", False)],
    ["13", "14", "'report.txt'", "'first version'", "False"])
repl_seq("folder clash raises, explicit path overwrites",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("os.makedirs('outbox')", True),
     ("Path('outbox/memo.txt').write_text('old copy')", False),
     ("Path('memo.txt').write_text('new copy')", False),
     ("shutil.move('memo.txt', 'outbox')", False),
     ("shutil.move('memo.txt', 'outbox/memo.txt')", False),
     ("Path('outbox/memo.txt').read_text()", False)],
    ["8", "8",
     "shutil.Error: Destination path 'outbox/memo.txt' already exists",
     "'outbox/memo.txt'",
     "'new copy'"])

print("=== section: Deleting for good ===")
repl_seq("remove a file, rmdir an empty folder, remove twice fails",
    [("import os", True),
     ("from pathlib import Path", True),
     ("Path('scratch.txt').write_text('temporary')", False),
     ("os.remove('scratch.txt')", True),
     ("os.path.exists('scratch.txt')", False),
     ("os.makedirs('empty_box')", True),
     ("os.rmdir('empty_box')", True),
     ("os.remove('scratch.txt')", False)],
    ["9", "False",
     "FileNotFoundError: [Errno 2] No such file or directory: 'scratch.txt'"])
check("rmtree deletes the whole tree",
    run("""import shutil, os
from pathlib import Path
os.makedirs('old_project/data')
Path('old_project/readme.txt').write_text('v1')
Path('old_project/data/results.csv').write_text('1,2,3')
shutil.rmtree('old_project')
print(os.path.exists('old_project'))"""),
    "False")
check("dry run prints the would-delete list",
    run("""import os
from pathlib import Path
os.makedirs('downloads', exist_ok=True)
for name in ['cat.png', 'notes.txt', 'old.tmp', 'draft.tmp']:
    Path('downloads/' + name).write_text('x')
for name in sorted(os.listdir('downloads')):
    if name.endswith('.tmp'):
        print('would delete', 'downloads/' + name)"""),
    "would delete downloads/draft.tmp\nwould delete downloads/old.tmp")

print("=== section: The safer delete: send2trash ===")
print("ok   send2trash block: desktop-only, no output claimed in the chapter, not executed by design")

print("=== section: Walking a directory tree ===")
check("sorted walk visits folders and files deterministically",
    run("""import os
from pathlib import Path
os.makedirs('expedition/photos', exist_ok=True)
os.makedirs('expedition/notes', exist_ok=True)
Path('expedition/packing.txt').write_text('rope, tent')
Path('expedition/photos/ridge.png').write_text('not a real png')
Path('expedition/photos/river.png').write_text('also fake')
Path('expedition/notes/day1.txt').write_text('set off late')
for folder, subfolders, files in os.walk('expedition'):
    subfolders.sort()
    print('folder:', folder)
    for name in sorted(files):
        print('  file:', name)"""),
    "folder: expedition\n  file: packing.txt\nfolder: expedition/notes\n  file: day1.txt\nfolder: expedition/photos\n  file: ridge.png\n  file: river.png")

print("=== section: Compressing with the zipfile module ===")
check("zip create, namelist, file_size, compress_size comparison",
    run("""import os, zipfile
from pathlib import Path
os.makedirs('reports', exist_ok=True)
Path('reports/january.txt').write_text('rain every day ' * 20)
Path('reports/february.txt').write_text('two dry weeks')
with zipfile.ZipFile('reports.zip', 'w') as backup:
    for name in sorted(os.listdir('reports')):
        backup.write('reports/' + name, compress_type=zipfile.ZIP_DEFLATED)
with zipfile.ZipFile('reports.zip') as backup:
    print(backup.namelist())
    info = backup.getinfo('reports/january.txt')
    print(info.file_size)
    print(info.compress_size < info.file_size)"""),
    "['reports/february.txt', 'reports/january.txt']\n300\nTrue")
check("mode 'w' per file keeps only the last file",
    run("""import zipfile
from pathlib import Path
Path('a.txt').write_text('first')
Path('b.txt').write_text('second')
with zipfile.ZipFile('box.zip', 'w') as z:
    z.write('a.txt')
with zipfile.ZipFile('box.zip', 'w') as z:
    z.write('b.txt')
with zipfile.ZipFile('box.zip') as z:
    print(z.namelist())"""),
    "['b.txt']")
check("zip round trip: delete original, restore from archive",
    run("""import os, zipfile
from pathlib import Path
Path('shopping.txt').write_text('eggs and flour')
with zipfile.ZipFile('pantry.zip', 'w') as z:
    z.write('shopping.txt', compress_type=zipfile.ZIP_DEFLATED)
os.remove('shopping.txt')
with zipfile.ZipFile('pantry.zip') as z:
    z.extractall('restored')
print(sorted(os.listdir('restored')))
print(Path('restored/shopping.txt').read_text())"""),
    "['shopping.txt']\neggs and flour")

print("=== section: the numbered backup ===")
check("numbered backup: _1 then _2, tree shape in namelist",
    run("""import os, zipfile
from pathlib import Path

os.makedirs('herbarium/scans', exist_ok=True)
Path('herbarium/index.txt').write_text('3 specimens')
Path('herbarium/scans/fern.txt').write_text('frond, pressed')
Path('herbarium/scans/moss.txt').write_text('cushion, dried')

def backup_to_zip(folder):
    number = 1
    while os.path.exists(folder + '_' + str(number) + '.zip'):
        number = number + 1
    zip_name = folder + '_' + str(number) + '.zip'
    with zipfile.ZipFile(zip_name, 'w') as backup:
        for current, subfolders, files in os.walk(folder):
            subfolders.sort()
            for name in sorted(files):
                backup.write(current + '/' + name, compress_type=zipfile.ZIP_DEFLATED)
    print('created', zip_name)

backup_to_zip('herbarium')
backup_to_zip('herbarium')
with zipfile.ZipFile('herbarium_2.zip') as z:
    print(z.namelist())"""),
    "created herbarium_1.zip\ncreated herbarium_2.zip\n['herbarium/index.txt', 'herbarium/scans/fern.txt', 'herbarium/scans/moss.txt']")

print("=== practice-question executable claims ===")
repl_seq("q1: copytree destination must not exist",
    [("import shutil, os", True),
     ("os.makedirs('box/inner')", True),
     ("shutil.copytree('box', 'box2')", False),
     ("shutil.copytree('box', 'box2')", False)],
    ["'box2'", "FileExistsError: [Errno 17] File exists: 'box2'"])
repl_seq("q3: move to a missing folder leaves a plain file",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("Path('n.txt').write_text('x')", False),
     ("shutil.move('n.txt', 'archive')", False),
     ("os.path.isdir('archive')", False),
     ("os.path.isfile('archive')", False)],
    ["1", "'archive'", "False", "True"])
repl_seq("q4: silent replace vs shutil.Error refusal",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("os.makedirs('crowded')", True),
     ("Path('crowded/f.txt').write_text('kept')", False),
     ("Path('f.txt').write_text('incoming')", False),
     ("shutil.move('f.txt', 'crowded')", False),
     ("shutil.move('f.txt', 'crowded/f.txt')", False),
     ("Path('crowded/f.txt').read_text()", False)],
    ["4", "8",
     "shutil.Error: Destination path 'crowded/f.txt' already exists",
     "'crowded/f.txt'",
     "'incoming'"])
repl_seq("q5: remove/rmdir/rmtree division of labor",
    [("import shutil, os", True),
     ("from pathlib import Path", True),
     ("os.makedirs('t/deep')", True),
     ("Path('t/deep/a.txt').write_text('x')", False),
     ("Path('one.txt').write_text('y')", False),
     ("os.remove('one.txt')", True),
     ("os.makedirs('hollow')", True),
     ("os.rmdir('hollow')", True),
     ("shutil.rmtree('t')", True),
     ("[os.path.exists(p) for p in ['one.txt', 'hollow', 't']]", False)],
    ["1", "1", "[False, False, False]"])
check("q9: sorting the subfolder list steers the visit order",
    run("""import os
os.makedirs('w/zebra', exist_ok=True)
os.makedirs('w/apple', exist_ok=True)
os.makedirs('w/mango', exist_ok=True)
for folder, subfolders, files in os.walk('w'):
    subfolders.sort()
    print(folder)"""),
    "w\nw/apple\nw/mango\nw/zebra")
check("q10: 'w' once per file discards earlier members",
    run("""import zipfile
from pathlib import Path
for name in ['p.txt', 'q.txt', 'r.txt']:
    Path(name).write_text('data')
for name in ['p.txt', 'q.txt', 'r.txt']:
    with zipfile.ZipFile('backup.zip', 'w') as z:
        z.write(name)
with zipfile.ZipFile('backup.zip') as z:
    print(z.namelist())"""),
    "['r.txt']")

print("=== graded exercises: reference solutions vs expected o ===")
EX1 = """import os, shutil
from pathlib import Path
os.makedirs('shipment/text', exist_ok=True)
os.makedirs('shipment/images', exist_ok=True)
for name in ['crate1.txt', 'crate2.txt', 'photo1.png', 'photo2.png', 'photo3.png']:
    Path('shipment/' + name).write_text('cargo')
for name in os.listdir('shipment'):
    if name.endswith('.txt'):
        shutil.move('shipment/' + name, 'shipment/text/' + name)
    elif name.endswith('.png'):
        shutil.move('shipment/' + name, 'shipment/images/' + name)
print('text:', sorted(os.listdir('shipment/text')))
print('images:', sorted(os.listdir('shipment/images')))"""
check("ex1 Sort the shipment", run(EX1),
    "text: ['crate1.txt', 'crate2.txt']\nimages: ['photo1.png', 'photo2.png', 'photo3.png']")
# The app's Python filesystem persists between submissions, so the reference
# solution must produce the same output when run again in the same directory.
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    exec(EX1, {})
check("ex1 rerun in the same directory (persistent-FS safety)",
    buf.getvalue().rstrip("\n"),
    "text: ['crate1.txt', 'crate2.txt']\nimages: ['photo1.png', 'photo2.png', 'photo3.png']")
check("ex2 Clear the build litter",
    run("""import os
from pathlib import Path
os.makedirs('workbench', exist_ok=True)
for name in ['part1.py', 'part2.py', 'build1.tmp', 'build2.tmp', 'build3.tmp']:
    Path('workbench/' + name).write_text('scrap')
deleted = 0
for name in sorted(os.listdir('workbench')):
    if name.endswith('.tmp'):
        os.remove('workbench/' + name)
        deleted = deleted + 1
print('deleted:', deleted)
print('kept:', sorted(os.listdir('workbench')))"""),
    "deleted: 3\nkept: ['part1.py', 'part2.py']")
check("ex3 The file census",
    run("""import os
from pathlib import Path
os.makedirs('fieldwork/site_a', exist_ok=True)
os.makedirs('fieldwork/site_b', exist_ok=True)
for name in ['a1.txt', 'a2.txt']:
    Path('fieldwork/site_a/' + name).write_text('sample')
for name in ['b1.txt', 'b2.txt', 'b3.txt']:
    Path('fieldwork/site_b/' + name).write_text('sample')
total = 0
for folder, subfolders, files in os.walk('fieldwork'):
    subfolders.sort()
    print(folder, len(files))
    total = total + len(files)
print('total:', total)"""),
    "fieldwork 0\nfieldwork/site_a 2\nfieldwork/site_b 3\ntotal: 5")
check("ex4 Archive and restore",
    run("""import os, shutil, zipfile
from pathlib import Path
os.makedirs('logs', exist_ok=True)
Path('logs/boot.txt').write_text('ready')
Path('logs/crash.txt').write_text('overflow')
with zipfile.ZipFile('records.zip', 'w') as z:
    for name in sorted(os.listdir('logs')):
        z.write('logs/' + name, compress_type=zipfile.ZIP_DEFLATED)
shutil.rmtree('logs')
with zipfile.ZipFile('records.zip') as z:
    z.extractall()
    print(z.namelist())
print(Path('logs/boot.txt').read_text())"""),
    "['logs/boot.txt', 'logs/crash.txt']\nready")

print()
print("CH11 VERIFY: ALL PASS" if fails == 0 else f"CH11 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
