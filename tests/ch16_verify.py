# Verify every code snippet shown in book/ch16.js.
# Same idea as ch2_verify.py, but self-checking: each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
# The reading sections form one continuous sqlite3 session, so the checks
# below share one namespace in book order, exactly as the chapter tells it.
import io, contextlib, os, sqlite3, sys, tempfile

fails = 0
def check(label, got, want):
    global fails
    ok = got == want
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        fails += 1
        print(f"     got:  {got!r}")
        print(f"     want: {want!r}")

def errline(fn):
    # The single final traceback line, as the chapter shows errors.
    try:
        fn()
        return "NO ERROR RAISED"
    except Exception as ex:
        mod = type(ex).__module__
        name = type(ex).__name__
        full = name if mod in ("builtins", None) else f"{mod}.{name}"
        return f"{full}: {ex}"

def run(code, ns=None):
    # Execute a program block, capturing stdout (trailing newline stripped).
    buf = io.StringIO()
    if ns is None:
        ns = {}
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    return buf.getvalue().rstrip("\n")

# ---- the running session: one :memory: database across sections 2-8 ----
ns = {}

print("=== section: Connecting and cursors ===")
exec("import sqlite3\nconn = sqlite3.connect(':memory:')\ncur = conn.cursor()", ns)
check("type(cur) echo", repr(eval("type(cur)", ns)), "<class 'sqlite3.Cursor'>")

print("=== section: CREATE TABLE and column types ===")
check("create + sqlite_master block",
    run("cur.execute('CREATE TABLE records (title TEXT, artist TEXT, year INTEGER, price REAL)')\n"
        "cur.execute('SELECT name FROM sqlite_master')\n"
        "print(cur.fetchall())", ns),
    "[('records',)]")
check("duplicate CREATE TABLE error",
    errline(lambda: eval("cur.execute('CREATE TABLE records (title TEXT)')", ns)),
    "sqlite3.OperationalError: table records already exists")
check("note claim: IF NOT EXISTS is silent",
    errline(lambda: eval("cur.execute('CREATE TABLE IF NOT EXISTS records (title TEXT)')", ns))
        .startswith("NO ERROR"),
    True)

print("=== section: INSERT and placeholders ===")
check("insert + executemany rowcount block",
    run("cur.execute('INSERT INTO records VALUES (?, ?, ?, ?)', ('Cold Static', 'The Vantas', 1979, 18.0))\n"
        "more = [('Meridian', 'Ada Lune', 1984, 12.5),\n"
        "        ('Paper Sun', 'The Vantas', 1981, 9.5),\n"
        "        ('Glasshouse', 'Marrow Lane', 1979, 22.0)]\n"
        "cur.executemany('INSERT INTO records VALUES (?, ?, ?, ?)', more)\n"
        "print(cur.rowcount)", ns),
    "3")
exec('title = "Harbor\'s Edge"', ns)
check("SQL glued with + breaks on the apostrophe",
    errline(lambda: eval("cur.execute(\"INSERT INTO records (title) VALUES ('\" + title + \"')\")", ns)),
    'sqlite3.OperationalError: near "s": syntax error')
exec("n = cur.execute('INSERT INTO records VALUES (?, ?, ?, ?)', (title, 'Lena Vale', 1990, 15.0)).rowcount", ns)
check("placeholder insert rowcount n", repr(eval("n", ns)), "1")
exec("conn.commit()", ns)

print("=== section: SELECT, fetchone, and fetchall ===")
exec("rows = cur.execute('SELECT title, year FROM records').fetchall()", ns)
check("fetchall of five records", repr(eval("rows", ns)),
    "[('Cold Static', 1979), ('Meridian', 1984), ('Paper Sun', 1981), ('Glasshouse', 1979), (\"Harbor's Edge\", 1990)]")
exec("res = cur.execute('SELECT title FROM records')", ns)
check("first fetchone", repr(eval("res.fetchone()", ns)), "('Cold Static',)")
check("second fetchone", repr(eval("res.fetchone()", ns)), "('Meridian',)")
check("fetchall returns only the remaining rows", repr(eval("res.fetchall()", ns)),
    "[('Paper Sun',), ('Glasshouse',), (\"Harbor's Edge\",)]")
check("exhausted fetchone prints None", run("print(res.fetchone())", ns), "None")
check("q6 claim: exhausted fetchall returns []", repr(eval("res.fetchall()", ns)), "[]")
exec("row = cur.execute('SELECT title, year FROM records').fetchone()", ns)
check("row[0]", repr(eval("row[0]", ns)), "'Cold Static'")
check("row[1]", repr(eval("row[1]", ns)), "1979")
check("iterating the cursor",
    run("for row in cur.execute('SELECT title, price FROM records'):\n    print(row)", ns),
    "('Cold Static', 18.0)\n('Meridian', 12.5)\n('Paper Sun', 9.5)\n('Glasshouse', 22.0)\n(\"Harbor's Edge\", 15.0)")

print("=== section: WHERE and ORDER BY ===")
check("WHERE artist ORDER BY title",
    repr(eval("cur.execute('SELECT title FROM records WHERE artist = ? ORDER BY title', ('The Vantas',)).fetchall()", ns)),
    "[('Cold Static',), ('Paper Sun',)]")
check("WHERE price < 16 ORDER BY price",
    repr(eval("cur.execute('SELECT title, price FROM records WHERE price < ? ORDER BY price', (16,)).fetchall()", ns)),
    "[('Paper Sun', 9.5), ('Meridian', 12.5), (\"Harbor's Edge\", 15.0)]")
check("ORDER BY year DESC with title tie-break",
    repr(eval("cur.execute('SELECT year, title FROM records ORDER BY year DESC, title').fetchall()", ns)),
    "[(1990, \"Harbor's Edge\"), (1984, 'Meridian'), (1981, 'Paper Sun'), (1979, 'Cold Static'), (1979, 'Glasshouse')]")

print("=== section: UPDATE and DELETE ===")
check("UPDATE one row, rowcount",
    run("cur.execute('UPDATE records SET price = ? WHERE title = ?', (16.0, 'Cold Static'))\n"
        "print(cur.rowcount)\nconn.commit()", ns),
    "1")
check("price check after update",
    repr(eval("cur.execute('SELECT price FROM records WHERE title = ?', ('Cold Static',)).fetchone()", ns)),
    "(16.0,)")
check("DELETE one row, rowcount",
    run("cur.execute('DELETE FROM records WHERE title = ?', ('Paper Sun',))\n"
        "print(cur.rowcount)\nconn.commit()", ns),
    "1")
check("UPDATE without WHERE touches every row",
    run("cur.execute('UPDATE records SET price = ?', (5.0,))\nprint(cur.rowcount)", ns),
    "4")
check("every price flattened to 5.0",
    repr(eval("cur.execute('SELECT title, price FROM records ORDER BY title').fetchall()", ns)),
    "[('Cold Static', 5.0), ('Glasshouse', 5.0), (\"Harbor's Edge\", 5.0), ('Meridian', 5.0)]")

print("=== section: commit, rollback, and close ===")
exec("conn.rollback()", ns)
check("rollback restores the last committed state",
    repr(eval("cur.execute('SELECT title, price FROM records ORDER BY title').fetchall()", ns)),
    "[('Cold Static', 16.0), ('Glasshouse', 22.0), (\"Harbor's Edge\", 15.0), ('Meridian', 12.5)]")
exec("conn.close()", ns)

# The three shop.db scripts run in a scratch directory, each a fresh script
# namespace, exactly as the chapter presents them.
old_cwd = os.getcwd()
with tempfile.TemporaryDirectory() as tmp:
    os.chdir(tmp)
    try:
        check("script 1: create wishlist, insert two, commit",
            run("import sqlite3\n"
                "conn = sqlite3.connect('shop.db')\n"
                "cur = conn.cursor()\n"
                "cur.execute('CREATE TABLE wishlist (title TEXT)')\n"
                "cur.execute('INSERT INTO wishlist VALUES (?)', ('Night Signal',))\n"
                "cur.execute('INSERT INTO wishlist VALUES (?)', ('Low Tide',))\n"
                "conn.commit()\nconn.close()"),
            "")
        check("script 2: insert without commit",
            run("import sqlite3\n"
                "conn = sqlite3.connect('shop.db')\n"
                "cur = conn.cursor()\n"
                "cur.execute('INSERT INTO wishlist VALUES (?)', ('Stray Light',))\n"
                "conn.close()"),
            "")
        ns3 = {}
        check("script 3: the uncommitted row is gone",
            run("import sqlite3\n"
                "conn = sqlite3.connect('shop.db')\n"
                "cur = conn.cursor()\n"
                "print(cur.execute('SELECT title FROM wishlist ORDER BY title').fetchall())", ns3),
            "[('Low Tide',), ('Night Signal',)]")
        exec("conn.close()", ns3)
        check("closed connection refuses work",
            errline(lambda: eval("cur.execute('SELECT title FROM wishlist')", ns3)),
            "sqlite3.ProgrammingError: Cannot operate on a closed database.")
    finally:
        os.chdir(old_cwd)

print("=== practice-question executable claims ===")
qc = sqlite3.connect(':memory:')
qcur = qc.cursor()
check("q3 claim: execute returns the cursor itself",
    qcur.execute('SELECT 1') is qcur, True)
check("q4 claim: the five storage classes, by typeof()",
    [qcur.execute('SELECT typeof(?)', (v,)).fetchone()[0]
     for v in (None, 3, 3.5, 'a', b'\x00')],
    ['null', 'integer', 'real', 'text', 'blob'])
qcur.execute('CREATE TABLE t (title TEXT)')
qcur.execute('INSERT INTO t VALUES (?)', ('Paper Sun',))
qrow = qcur.execute('SELECT title FROM t').fetchone()
check("q10 claim: one-column row is a one-element tuple", repr(qrow), "('Paper Sun',)")
check("q10 claim: row[0] is the bare string", repr(qrow[0]), "'Paper Sun'")
qc.close()

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 The restock list",
    run("""import sqlite3
conn = sqlite3.connect(':memory:')
cur = conn.cursor()
cur.execute('CREATE TABLE restock (item TEXT, qty INTEGER)')
rows = [('hinges', 12), ('washers', 40), ('dowels', 8)]
cur.executemany('INSERT INTO restock VALUES (?, ?)', rows)
for row in cur.execute('SELECT item, qty FROM restock ORDER BY item'):
    print(row)"""),
    "('dowels', 8)\n('hinges', 12)\n('washers', 40)")
check("ex2 Under ten dollars",
    run("""import sqlite3
conn = sqlite3.connect(':memory:')
cur = conn.cursor()
cur.execute('CREATE TABLE plants (name TEXT, price REAL)')
rows = [('fern', 12.5), ('basil', 4.0), ('cactus', 9.5), ('monstera', 30.0)]
cur.executemany('INSERT INTO plants VALUES (?, ?)', rows)
for row in cur.execute('SELECT name FROM plants WHERE price < ? ORDER BY name', (10,)):
    print(row[0])"""),
    "basil\ncactus")
check("ex3 The staff directory",
    run("""import sqlite3
conn = sqlite3.connect(':memory:')
cur = conn.cursor()
cur.execute('CREATE TABLE staff (name TEXT, role TEXT)')
staff = {'Imani': 'projectionist', 'Theo': 'box office', 'Ravi': 'usher'}
for name, role in staff.items():
    cur.execute('INSERT INTO staff VALUES (?, ?)', (name, role))
for row in cur.execute('SELECT name, role FROM staff ORDER BY name'):
    print(f'{row[0]}: {row[1]}')"""),
    "Imani: projectionist\nRavi: usher\nTheo: box office")
check("ex4 The clearance rack",
    run("""import sqlite3
conn = sqlite3.connect(':memory:')
cur = conn.cursor()
cur.execute('CREATE TABLE games (title TEXT, price REAL)')
rows = [('Karts', 35.0), ('Quest', 50.0), ('Puzzler', 20.0), ('Racer', 15.0)]
cur.executemany('INSERT INTO games VALUES (?, ?)', rows)
cur.execute('UPDATE games SET price = price - 10 WHERE price > ?', (30,))
cur.execute('DELETE FROM games WHERE title = ?', ('Racer',))
cur.execute('SELECT title, price FROM games ORDER BY title')
print(cur.fetchall())"""),
    "[('Karts', 25.0), ('Puzzler', 20.0), ('Quest', 40.0)]")

print()
print("CH16 VERIFY: ALL PASS" if fails == 0 else f"CH16 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
