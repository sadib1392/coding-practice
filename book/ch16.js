/* Practice Log book — Chapter 16: SQLite Databases.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory:
   see tests/ch16_verify.py. sqlite3 is in Python's standard library, so this
   whole chapter — exercises included — runs on the Python built into this app. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch16 = {
n: 16,
title: "SQLite Databases",
src: "https://automatetheboringstuff.com/3e/chapter16.html",
blurb: "Real databases from the standard library — CREATE, INSERT with placeholders, SELECT, and the commit that makes changes stick.",
sections: [
{ t: "Tables, rows, and columns",
  body: [
  ["p","A relational database stores data in tables. A table looks like a spreadsheet grid: named columns across the top, one row per record. The difference is what it is built for. A spreadsheet is a surface you look at; a database is a structure you question. Each column has a declared type, each row is one complete record, and instead of scrolling and eyeballing, you write a query — show me every row where the price is under ten, sorted by name — and the database hands back exactly those rows."],
  ["p","Most database systems you have heard of — PostgreSQL, MySQL — are server programs: they run all the time, and programs connect to them over a network. SQLite is the other kind. It is a library, not a server. The whole database lives in one ordinary file on disk, and the sqlite3 module in Python's standard library reads and writes it directly. There is nothing to install and nothing to administer, which is why SQLite sits inside phones, browsers, and most of the apps on your machine. For personal automation — and for this chapter — it is the right size."],
  ["p","You talk to it in SQL, a small language for describing what you want done to tables. Your Python program writes SQL statements as ordinary strings and hands them over, so this chapter is two languages riding in one program: Python supplies the values and the control flow, SQL names the table work. The statements you meet here — CREATE TABLE, INSERT, SELECT, UPDATE, DELETE — are the working core of the language."]
]},
{ t: "Connecting and cursors",
  body: [
  ["p","sqlite3.connect() opens a database and returns a Connection object. Give it a filename like 'shop.db' and it opens that file, creating it first if there is nothing there. Give it the special name ':memory:' and it builds a database in RAM instead — no file anywhere, gone the moment the connection closes. That is the version to reach for while practising: same SQL, nothing left behind."],
  ["code",">>> import sqlite3\n>>> conn = sqlite3.connect(':memory:')\n>>> cur = conn.cursor()\n>>> type(cur)\n<class 'sqlite3.Cursor'>"],
  ["p","The work splits between the two objects. The Connection stands for the database as a whole: it commits, rolls back, and closes. The Cursor is what actually runs SQL — its execute() method takes one statement as a string — and it holds whatever rows the statement produced. One detail worth noticing now: execute() returns the cursor itself, which is why you will later see calls chained together, like cur.execute(...).fetchall()."],
  ["note","In this app, a file-backed database like 'shop.db' lands in the browser's temporary filesystem. It works, but the browser can clear it like any other temporary storage — so for the drills here, ':memory:' is the natural choice. The SQL is identical either way."]
]},
{ t: "CREATE TABLE and column types",
  body: [
  ["p","The running example is a secondhand record shop's inventory. CREATE TABLE names the new table and lists its columns, each as a name and a type: the title and artist are TEXT, the year is an INTEGER, the price is a REAL (a float). The sqlite_master table is SQLite's own catalog of what exists, so a quick SELECT against it confirms the table arrived. Still in the session from the last section:"],
  ["code","cur.execute('CREATE TABLE records (title TEXT, artist TEXT, year INTEGER, price REAL)')\ncur.execute('SELECT name FROM sqlite_master')\nprint(cur.fetchall())"],
  ["code","[('records',)]"],
  ["p","TEXT, INTEGER, and REAL are three of SQLite's five storage classes — NULL and BLOB (raw bytes) are the other two. Be warned that SQLite enforces these types loosely compared with other databases: it will mostly let you insert a string into an INTEGER column without complaint. Treat the declarations as a statement of intent, and keep the discipline of matching them on the Python side."],
  ["code",">>> cur.execute('CREATE TABLE records (title TEXT)')\nsqlite3.OperationalError: table records already exists"],
  ["note","The already-exists error is what greets you the second time a setup script runs. Writing CREATE TABLE IF NOT EXISTS records (...) instead makes the statement do nothing, silently, when the table is already there — which is what a setup script usually wants."]
]},
{ t: "INSERT and placeholders",
  body: [
  ["p","INSERT INTO adds rows. Write a question mark in the SQL for every value, and pass the values themselves as a tuple in execute()'s second argument — this is how execute is meant to be called, not an advanced variant. For a stack of rows, executemany() takes the statement once and a list of tuples, and runs it for each one. Continuing the session:"],
  ["code","cur.execute('INSERT INTO records VALUES (?, ?, ?, ?)', ('Cold Static', 'The Vantas', 1979, 18.0))\nmore = [('Meridian', 'Ada Lune', 1984, 12.5),\n        ('Paper Sun', 'The Vantas', 1981, 9.5),\n        ('Glasshouse', 'Marrow Lane', 1979, 22.0)]\ncur.executemany('INSERT INTO records VALUES (?, ?, ?, ?)', more)\nprint(cur.rowcount)"],
  ["code","3"],
  ["p","rowcount is how many rows the last statement touched — three, one per tuple in the list. Now the wrong way to build that statement, because you will be tempted: gluing the value into the SQL string with +. It survives exactly until the first title containing an apostrophe."],
  ["code",">>> title = \"Harbor's Edge\"\n>>> cur.execute(\"INSERT INTO records (title) VALUES ('\" + title + \"')\")\nsqlite3.OperationalError: near \"s\": syntax error"],
  ["p","The apostrophe in Harbor's ended the SQL string early, and the parser choked on the leftovers. The deeper problem is that a value glued into the statement can rewrite the statement — the classic SQL injection attack is exactly this bug, aimed. A placeholder never parses the value as SQL, so both problems vanish at once. The same insert, done properly, and then a commit — commit() saves everything so far, and the last section of this chapter is about what that means:"],
  ["code",">>> n = cur.execute('INSERT INTO records VALUES (?, ?, ?, ?)', (title, 'Lena Vale', 1990, 15.0)).rowcount\n>>> n\n1\n>>> conn.commit()"],
  ["note","Building SQL with + and str() is the bug that works all through testing and dies on real data. Placeholders are not politeness for security teams — they are the normal way to pass values, and the only version worth practising."]
]},
{ t: "SELECT, fetchone, and fetchall",
  body: [
  ["p","SELECT asks for rows: name the columns you want, then the table. execute() runs the query; the fetch methods collect results. fetchall() returns every remaining row as a list, and each row arrives as a plain Python tuple — the shop now holds five records:"],
  ["code",">>> rows = cur.execute('SELECT title, year FROM records').fetchall()\n>>> rows\n[('Cold Static', 1979), ('Meridian', 1984), ('Paper Sun', 1981), ('Glasshouse', 1979), (\"Harbor's Edge\", 1990)]"],
  ["p","Those rows happened to come back in the order they were inserted. Enjoy it, but do not build on it — the next section is about why. fetchone() returns just the next row, because a cursor is a position moving through results: each call advances it, fetchall() scoops up whatever is left, and once the results run out fetchone() returns None. None does not echo in the interactive shell, so the last line prints it to prove it:"],
  ["code",">>> res = cur.execute('SELECT title FROM records')\n>>> res.fetchone()\n('Cold Static',)\n>>> res.fetchone()\n('Meridian',)\n>>> res.fetchall()\n[('Paper Sun',), ('Glasshouse',), (\"Harbor's Edge\",)]\n>>> print(res.fetchone())\nNone"],
  ["p","Notice ('Cold Static',) — selecting one column still gives a tuple, one element wide, and the trailing comma is what makes it a tuple. Index a row like any tuple to get the values out:"],
  ["code",">>> row = cur.execute('SELECT title, year FROM records').fetchone()\n>>> row[0]\n'Cold Static'\n>>> row[1]\n1979"],
  ["p","The cursor is also iterable, so a for loop walks the results one row at a time without ever building the full list — the natural shape when all you want is to process each row:"],
  ["code","for row in cur.execute('SELECT title, price FROM records'):\n    print(row)"],
  ["code","('Cold Static', 18.0)\n('Meridian', 12.5)\n('Paper Sun', 9.5)\n('Glasshouse', 22.0)\n(\"Harbor's Edge\", 15.0)"]
]},
{ t: "WHERE and ORDER BY",
  body: [
  ["p","WHERE filters rows inside the database, before they ever reach Python — no loop, no if. The value you compare against travels in a placeholder, same as an INSERT. ORDER BY sorts the results by a column; both clauses bolt onto the same SELECT:"],
  ["code",">>> cur.execute('SELECT title FROM records WHERE artist = ? ORDER BY title', ('The Vantas',)).fetchall()\n[('Cold Static',), ('Paper Sun',)]\n>>> cur.execute('SELECT title, price FROM records WHERE price < ? ORDER BY price', (16,)).fetchall()\n[('Paper Sun', 9.5), ('Meridian', 12.5), (\"Harbor's Edge\", 15.0)]"],
  ["p","Add DESC to sort downward. When the sort column has ties — two records from 1979 — the order inside the tie is up to SQLite unless you break it yourself with a second sort key:"],
  ["code",">>> cur.execute('SELECT year, title FROM records ORDER BY year DESC, title').fetchall()\n[(1990, \"Harbor's Edge\"), (1984, 'Meridian'), (1981, 'Paper Sun'), (1979, 'Cold Static'), (1979, 'Glasshouse')]"],
  ["note","Without ORDER BY, SQLite returns rows in whatever order is cheapest — usually insertion order, right up until a delete or an index quietly changes that, far from the code that breaks. If a SELECT's order ever matters — because you print it, compare it, or grade it — give it an ORDER BY. The exercises below hold you to this."]
]},
{ t: "UPDATE and DELETE",
  body: [
  ["p","UPDATE changes rows in place: SET names the column and its new value, WHERE picks which rows. The shop reprices one album, and rowcount confirms the statement touched exactly one row. Same session as ever:"],
  ["code","cur.execute('UPDATE records SET price = ? WHERE title = ?', (16.0, 'Cold Static'))\nprint(cur.rowcount)\nconn.commit()"],
  ["code","1"],
  ["code",">>> cur.execute('SELECT price FROM records WHERE title = ?', ('Cold Static',)).fetchone()\n(16.0,)"],
  ["p","DELETE FROM removes whole rows — the WHERE clause is the only thing standing between one row and all of them. Paper Sun sells:"],
  ["code","cur.execute('DELETE FROM records WHERE title = ?', ('Paper Sun',))\nprint(cur.rowcount)\nconn.commit()"],
  ["code","1"],
  ["p","Now the mistake this section exists for. Leave the WHERE off an UPDATE and it applies to every row in the table — no error, no warning, just a rowcount you probably did not read. One mistyped statement flattens every price in the shop:"],
  ["code","cur.execute('UPDATE records SET price = ?', (5.0,))\nprint(cur.rowcount)"],
  ["code","4"],
  ["code",">>> cur.execute('SELECT title, price FROM records ORDER BY title').fetchall()\n[('Cold Static', 5.0), ('Glasshouse', 5.0), (\"Harbor's Edge\", 5.0), ('Meridian', 5.0)]"],
  ["p","Every record now costs five dollars. The damage is real — and it is also not committed yet, which is exactly what the next section is for."]
]},
{ t: "commit, rollback, and close",
  body: [
  ["p","Changes pile up in a transaction: nothing you insert, update, or delete is final until commit() keeps it, and rollback() throws away everything since the last commit. The repricing disaster from the previous section was never committed — the two earlier commits were — so one rollback puts the shop back exactly there:"],
  ["code",">>> conn.rollback()\n>>> cur.execute('SELECT title, price FROM records ORDER BY title').fetchall()\n[('Cold Static', 16.0), ('Glasshouse', 22.0), (\"Harbor's Edge\", 15.0), ('Meridian', 12.5)]"],
  ["p","For a ':memory:' database that is the whole story. For a database file on disk, commit also decides what the file keeps after your program ends — which makes forgetting it the most expensive small mistake in this chapter. Three short scripts against the same file tell it best. The first one behaves:"],
  ["code","import sqlite3\nconn = sqlite3.connect('shop.db')\ncur = conn.cursor()\ncur.execute('CREATE TABLE wishlist (title TEXT)')\ncur.execute('INSERT INTO wishlist VALUES (?)', ('Night Signal',))\ncur.execute('INSERT INTO wishlist VALUES (?)', ('Low Tide',))\nconn.commit()\nconn.close()"],
  ["p","The second script adds one more title — and closes without committing:"],
  ["code","conn = sqlite3.connect('shop.db')\ncur = conn.cursor()\ncur.execute('INSERT INTO wishlist VALUES (?)', ('Stray Light',))\nconn.close()"],
  ["p","The third script reopens the file to see what survived:"],
  ["code","conn = sqlite3.connect('shop.db')\ncur = conn.cursor()\nprint(cur.execute('SELECT title FROM wishlist ORDER BY title').fetchall())"],
  ["code","[('Low Tide',), ('Night Signal',)]"],
  ["p","Stray Light is gone. The insert ran, the script finished without an error, and the row still evaporated, because close() discards uncommitted changes. The fix is one line — conn.commit() before conn.close(). And once a connection is closed, it is done taking orders:"],
  ["code",">>> conn.close()\n>>> cur.execute('SELECT title FROM wishlist')\nsqlite3.ProgrammingError: Cannot operate on a closed database."],
  ["note","Forgetting commit is the classic sqlite3 bug: the program prints all the right answers while it runs, and the database file is empty the next morning. Every insert worked — inside a transaction nobody kept. When a database mysteriously loses data, look for the missing commit() first."]
]},
{ t: "Summary",
  body: [
  ["p","SQLite gives your programs a real database with nothing to install: connect() — to a file, or to ':memory:' for a throwaway — returns the Connection, the Connection's cursor() runs the SQL. CREATE TABLE declares columns and their types, INSERT INTO adds rows with a ? placeholder for every value, and SELECT reads them back through fetchone(), fetchall(), or a plain for loop over the cursor, each row a Python tuple. WHERE narrows a statement to the rows you mean, ORDER BY makes the order deliberate, and UPDATE and DELETE reshape the table under the same WHERE discipline — with rowcount as the receipt. Around all of it sit the transaction calls: commit() to keep, rollback() to undo, close() to finish."],
  ["p","Three habits from this chapter are worth hardening now: values go through placeholders, never glued into the SQL; any SELECT whose order matters carries an ORDER BY; and file-backed work commits before it closes. The full chapter goes further than these pages — ALTER TABLE and DROP TABLE, foreign keys that join tables together, and backing up a live database — and is worth reading at the source link above."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises — they run the real sqlite3 module right here. The next chapter turns to the files people actually email each other all day: PDF and Word documents, and how Python reads and writes them."]
]}
],
questions: [
{ q:"In a database like the records table, what are the table, a row, and a column?",
  a:"The table is the whole collection of records sharing the same columns. A row is one record — one album — and it arrives in Python as a tuple. A column is one named, typed field that every row has, like price REAL." },
{ q:"What does sqlite3.connect(':memory:') build, and how does it differ from sqlite3.connect('shop.db')?",
  a:"':memory:' builds the database in RAM: fast, private to the connection, and gone when the connection closes. A filename opens a database file on disk, creating it if needed — that one persists after the program ends, holding whatever was committed." },
{ q:"Connection and Cursor split the work. Which object does what, and what does execute() return?",
  a:"The Connection stands for the whole database: commit(), rollback(), close(). The Cursor runs statements with execute() and holds the results. execute() returns the cursor itself, which is why cur.execute(...).fetchall() chains." },
{ q:"Name SQLite's five storage classes.",
  a:"NULL, INTEGER, REAL, TEXT, and BLOB. The chapter's table used three of them: TEXT for title and artist, INTEGER for year, REAL for price." },
{ q:"Why do values go through ? placeholders instead of being glued into the SQL string with +?",
  a:"Two reasons, one bug apart: a glued-in value containing an apostrophe ends the SQL string early and raises an OperationalError, and a hostile value can rewrite the statement itself — SQL injection. A placeholder never parses the value as SQL, so it handles any text safely." },
{ q:"What is the difference between fetchone() and fetchall(), and what does each return once the results run out?",
  a:"fetchone() returns the next row and advances the cursor; fetchall() returns all remaining rows as a list. Exhausted, fetchone() returns None and fetchall() returns an empty list." },
{ q:"A SELECT with no ORDER BY printed rows in insertion order. Can you rely on that?",
  a:"No. Without ORDER BY the order is whatever SQLite finds cheapest — often insertion order, until a delete or an index changes it. Any SELECT whose order matters gets an ORDER BY, and a tie needs a second sort key, like ORDER BY year DESC, title." },
{ q:"An UPDATE runs without its WHERE clause. What happens, and what was the only visible evidence in the chapter?",
  a:"It updates every row in the table — no error, no warning. The evidence was cur.rowcount coming back as 4, one per surviving record, and the SELECT afterward showing every price flattened to 5.0." },
{ q:"A script inserts a row into a database file and then calls close() without commit(). What does the file hold afterward?",
  a:"Everything up to the last commit, and nothing after it — the uncommitted insert is discarded when the connection closes. That is why Stray Light was missing when the wishlist was reopened. commit() before close() is the fix." },
{ q:"Selecting one column returns rows like ('Paper Sun',). What is that trailing comma, and how do you get the bare string out?",
  a:"Rows are always tuples, even one column wide, and the comma is what makes a one-element tuple a tuple. Index it: row[0] is 'Paper Sun'." }
],
exercises: [
{ c:"file I/O", t:"The restock list", book:"ch16",
  b:"Open a ':memory:' database. Create a table restock with columns item TEXT and qty INTEGER, then load it using executemany and placeholders with these rows: ('hinges', 12), ('washers', 40), ('dowels', 8). SELECT item and qty ORDER BY item and print each row tuple on its own line.",
  o:"('dowels', 8)\n('hinges', 12)\n('washers', 40)",
  h:["Follow the reading's shape: connect to ':memory:', get a cursor, CREATE TABLE, insert, then loop over a SELECT.",
     "executemany() takes the INSERT statement once and the whole list of tuples. After execute(), the cursor itself is the thing to loop over — print(row) prints the tuple.",
     "cur.executemany('INSERT INTO restock VALUES (?, ?)', rows) loads it; then for row in cur.execute('SELECT item, qty FROM restock ORDER BY item'): print(row)."]},
{ c:"file I/O", t:"Under ten dollars", book:"ch16",
  b:"In a ':memory:' database, create plants with columns name TEXT and price REAL, and insert ('fern', 12.5), ('basil', 4.0), ('cactus', 9.5), ('monstera', 30.0) with placeholders. SELECT the name of every plant priced under 10, ORDER BY name, and print each name on its own line — the bare string, not the tuple.",
  o:"basil\ncactus",
  h:["Filter in SQL with a WHERE clause, not in Python with an if.",
     "The compared price travels in a placeholder: WHERE price < ? with (10,) — a one-element tuple keeps its comma. Each row is a one-element tuple too, so print row[0].",
     "The query is 'SELECT name FROM plants WHERE price < ? ORDER BY name'; loop over cur.execute(...) and print(row[0])."]},
{ c:"dicts", t:"The staff directory", book:"ch16",
  b:"Start from staff = {'Imani': 'projectionist', 'Theo': 'box office', 'Ravi': 'usher'}. In a ':memory:' database, create a table staff with columns name TEXT and role TEXT, insert one row per dictionary item with placeholders, then SELECT both columns ORDER BY name and print each row as the name, a colon and a space, then the role.",
  o:"Imani: projectionist\nRavi: usher\nTheo: box office",
  h:["The dictionary already holds the pairs; .items() hands them over as (name, role) tuples, ready for a two-placeholder INSERT.",
     "Loop over staff.items() and run one INSERT per pair — or pass list(staff.items()) to executemany(). The printout is an f-string built from row[0] and row[1].",
     "for name, role in staff.items(): cur.execute('INSERT INTO staff VALUES (?, ?)', (name, role)) — then loop over the ordered SELECT and print(f'{row[0]}: {row[1]}')."]},
{ c:"lists", t:"The clearance rack", book:"ch16",
  b:"Create games (title TEXT, price REAL) in a ':memory:' database and insert ('Karts', 35.0), ('Quest', 50.0), ('Puzzler', 20.0), ('Racer', 15.0). With one UPDATE, cut every price over 30 by 10. Then DELETE the row titled 'Racer'. Finish with SELECT title and price ORDER BY title, and print the fetchall() list with a single print call.",
  o:"[('Karts', 25.0), ('Puzzler', 20.0), ('Quest', 40.0)]",
  h:["Three statements in order — an UPDATE, a DELETE, then one SELECT whose result prints as a single list.",
     "SET price = price - 10 reads each row's old price; WHERE price > ? decides which rows it touches. DELETE FROM games WHERE title = ? removes the one row. fetchall() gives the one printable list.",
     "cur.execute('UPDATE games SET price = price - 10 WHERE price > ?', (30,)), then cur.execute('DELETE FROM games WHERE title = ?', ('Racer',)), then print the fetchall() of SELECT title, price FROM games ORDER BY title."]}
]
};
