/* Practice Log book — Chapter 10: Reading and Writing Files.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch10 = {
n: 10,
title: "Reading and Writing Files",
src: "https://automatetheboringstuff.com/3e/chapter10.html",
blurb: "Paths with pathlib, the open-use-close workflow, and files that outlive the program.",
sections: [
{ t: "Files and filepaths",
  body: [
  ["p","A program that only keeps values in variables loses everything the moment it ends. Files are how work survives. A file is a chunk of data with a filename, and it lives at a path — the sequence of folders that leads to it. field_notes/2026/day03.txt names a file day03.txt inside a folder 2026 inside a folder field_notes."],
  ["code",">>> from pathlib import Path\n>>> Path('field_notes')\nPosixPath('field_notes')\n>>> Path('field_notes') / '2026' / 'day03.txt'\nPosixPath('field_notes/2026/day03.txt')"],
  ["p","Path() from the pathlib module turns a string into a path object, and the / operator joins path pieces into longer paths. This is the tool to reach for instead of gluing strings together with +: Windows separates folders with backslashes while macOS and Linux use forward slashes, and Path objects absorb that difference so your code does not have to. Passing several pieces to Path() at once builds the same thing."],
  ["code",">>> Path('field_notes', '2026', 'day03.txt')\nPosixPath('field_notes/2026/day03.txt')"],
  ["p","PosixPath is what Path objects are called on macOS and Linux — and in this app, whose Python runs on a Linux-flavoured filesystem. On Windows the same code produces WindowsPath objects instead; the code you write is identical. When a function insists on a plain string, str() converts the path back. The / trick works only while at least one of the first two operands is a Path — two bare strings have no idea what / should mean."],
  ["code",">>> str(Path('field_notes') / '2026' / 'day03.txt')\n'field_notes/2026/day03.txt'\n>>> 'field_notes' / '2026'\nTypeError: unsupported operand type(s) for /: 'str' and 'str'"],
  ["note","Building paths with string addition is the mistake pathlib exists to prevent: 'field_notes' + '2026' silently produces 'field_notes2026', one nonsense name with no separator in it. Join with Path and /, and the separator is always there and always right for the machine the code runs on."]
]},
{ t: "Absolute paths, relative paths, and the working directory",
  body: [
  ["p","An absolute path spells out the full route from the root of the filesystem — on macOS and Linux it starts with /, like /usr/local/notes.txt. A relative path starts from wherever the program happens to be standing, a location called the current working directory. field_notes/day03.txt means: from the working directory, step into field_notes, find day03.txt. is_absolute() tells the two apart."],
  ["code",">>> from pathlib import Path\n>>> Path('/usr/local/notes.txt').is_absolute()\nTrue\n>>> Path('field_notes/day03.txt').is_absolute()\nFalse"],
  ["p","Path.cwd() reports the working directory as an absolute path, and os.chdir() moves it. What they print depends entirely on the machine and the moment — /home/ada/projects on one computer, something else on yours — which is why this book never shows their output as fact. Path.home() is the same kind of call: it returns the logged-in user's home folder, /Users/ada style on a Mac, /home/ada style on Linux."],
  ["note","In this app your Python runs inside the browser, on a private temporary filesystem — there is no /Users folder or C: drive in it, and files you create vanish when the session ends. Relative paths like notes.txt work exactly as described, so every runnable example and exercise in this chapter uses them."]
]},
{ t: "Making folders and taking paths apart",
  body: [
  ["p","Paths can name folders that do not exist yet. mkdir() creates one. With parents=True it creates the whole chain of missing folders in one call, and exist_ok=True stops it from raising FileExistsError when the folder is already there — which it will be, the second time your program runs. os.makedirs() from the os module is the older spelling of the same job."],
  ["code","from pathlib import Path\nPath('field_notes/2026').mkdir(parents=True, exist_ok=True)\nprint(Path('field_notes/2026').is_dir())"],
  ["code","True"],
  ["p","Once you hold a path object, its pieces read off as attributes. No file needs to exist for any of these — they are questions about the name, not the disk."],
  ["code",">>> p = Path('field_notes/2026/day03.txt')\n>>> p.name\n'day03.txt'\n>>> p.stem\n'day03'\n>>> p.suffix\n'.txt'\n>>> p.parent\nPosixPath('field_notes/2026')\n>>> p.parent.parent\nPosixPath('field_notes')"],
  ["p","name is the last piece, stem is the name without its extension, suffix is the extension with its dot, and parent is everything before the name. parent chains — each extra .parent strips one more layer. The anchor is the root the path hangs from: '/' for an absolute path, and the empty string for a relative one."],
  ["code",">>> Path('/usr/local/notes.txt').anchor\n'/'\n>>> Path('field_notes/day03.txt').anchor\n''"],
  ["note","stem and suffix split on the last dot only: for archive.tar.gz the stem is 'archive.tar' and the suffix is just '.gz'. Code that assumes one dot per filename mis-slices names like these."]
]},
{ t: "Checking paths: exists, size, and glob",
  body: [
  ["p","Opening a path that is not there crashes a program, so Path objects carry their own checks. exists() answers whether anything is at the path; is_file() and is_dir() answer what kind of thing it is. The program below builds a small folder to test against — write_text(), covered properly later in this chapter, creates a file holding a string in one line."],
  ["code","from pathlib import Path\nPath('trip').mkdir(exist_ok=True)\nPath('trip/day01.txt').write_text('set off at dawn\\n')\nPath('trip/day02.txt').write_text('rain all morning\\n')\nPath('trip/gear.csv').write_text('item,packed\\n')\nprint(Path('trip/day01.txt').exists())\nprint(Path('trip/day03.txt').exists())\nprint(Path('trip').is_dir())\nprint(Path('trip/day01.txt').is_dir())"],
  ["code","True\nFalse\nTrue\nFalse"],
  ["p","stat() bundles a file's bookkeeping, and its st_size field is the size in bytes. Plain English text costs one byte per character, so day01.txt — sixteen characters counting the newline — weighs 16. stat() also carries timestamps of the file's last change, but those depend on when you run the code, so no output is claimed for them here."],
  ["code",">>> Path('trip/day01.txt').stat().st_size\n16\n>>> Path('trip/day02.txt').stat().st_size\n17"],
  ["p","glob() lists the contents of a folder that match a pattern. In a pattern, * stands for any run of characters, so '*.txt' matches every name ending in .txt — the .csv file is skipped. glob() promises nothing about order, so the loop sorts before printing; without sorted(), the same folder can list its files in a different order on a different system."],
  ["code","from pathlib import Path\nfor p in sorted(Path('trip').glob('*.txt')):\n    print(p.name)"],
  ["code","day01.txt\nday02.txt"],
  ["note","exists() returning False does not distinguish a missing file from a misspelled path — day3.txt and day03.txt are both simply not there. When a check that should pass keeps failing, print the path you are actually testing before doubting the disk."]
]},
{ t: "Reading files: open, read, close",
  body: [
  ["p","The reading workflow is three steps: open() the file, which returns a file object; call the file object's read methods; close() it. open() takes the path and a mode string — 'r' means reading, and it is the default, so open('forecast.txt') opens for reading. read() returns the whole file as one string."],
  ["code","from pathlib import Path\nPath('forecast.txt').write_text('wind from the west\\nrain by evening\\n')\nf = open('forecast.txt')\ntext = f.read()\nf.close()\nprint(text)"],
  ["code","wind from the west\nrain by evening"],
  ["p","A file object keeps a bookmark of how far you have read. The first read() takes everything from the bookmark to the end and leaves the bookmark there, so a second read() returns the empty string. That surprises everyone once."],
  ["code",">>> f = open('forecast.txt')\n>>> f.read()\n'wind from the west\\nrain by evening\\n'\n>>> f.read()\n''\n>>> f.close()"],
  ["p","readlines() splits the same content into a list, one string per line. Each string keeps its trailing newline — visible in the repr below — which is why lines read from a file usually pass through strip() before use."],
  ["code",">>> f = open('forecast.txt')\n>>> f.readlines()\n['wind from the west\\n', 'rain by evening\\n']\n>>> f.close()"],
  ["p","Reading a path that does not exist raises FileNotFoundError. The parts worth reading are the exception's name and the path it quotes. The bracketed number in the middle is the operating system's own code for the failure, and it varies by platform — desktop Pythons say Errno 2, while the browser runtime this app uses reports Errno 44 for the very same mistake."],
  ["code",">>> open('missing.txt')\nFileNotFoundError: [Errno 2] No such file or directory: 'missing.txt'"],
  ["note","'r' being the default cuts both ways: open('results.txt') on a file your program was supposed to create first crashes exactly like this. When one program both writes and reads a file, the write must happen — and be closed — before the read."]
]},
{ t: "Writing, appending, and the with statement",
  body: [
  ["p","Writing is the same workflow with a different mode. 'w' opens for writing, creating the file when it is missing. write() puts a string into the file and returns the number of characters written — the shell echoes that count after each call. write() adds nothing you did not pass it: no spaces between calls, and no newlines."],
  ["code",">>> f = open('camp_log.txt', 'w')\n>>> f.write('day 1: set off\\n')\n15\n>>> f.write('day 2: rain\\n')\n12\n>>> f.close()"],
  ["code","f = open('camp_log.txt')\nprint(f.read())\nf.close()"],
  ["code","day 1: set off\nday 2: rain"],
  ["p","The mistake 'w' is waiting to punish: it truncates. Opening an existing file in 'w' mode wipes its contents at the moment of opening, before any write happens. camp_log.txt held two lines; after this program it holds one."],
  ["code","f = open('camp_log.txt', 'w')\nf.write('replaced\\n')\nf.close()\nf = open('camp_log.txt')\nprint(f.read())\nf.close()"],
  ["code","replaced"],
  ["p","'a' is append mode. It also creates a missing file, but on an existing one it adds to the end instead of wiping — the mode for logs and running records."],
  ["code","f = open('camp_log.txt', 'a')\nf.write('appended\\n')\nf.close()\nf = open('camp_log.txt')\nprint(f.read())\nf.close()"],
  ["code","replaced\nappended"],
  ["p","Because write() adds no newlines, two writes without them produce one glued word — the classic first file-writing bug:"],
  ["code","f = open('glued.txt', 'w')\nf.write('spam')\nf.write('eggs')\nf.close()\nf = open('glued.txt')\nprint(f.read())\nf.close()"],
  ["code","spameggs"],
  ["p","Every open() so far has needed a matching close(), and forgetting one is easy. Until a file is closed, written data can sit in a buffer instead of the file, and the operating system keeps the handle tied up. The with statement does the closing for you: it opens the file, hands it to the name after as, and guarantees the close when the block ends — even when the block dies on an error. This is the form to use from now on."],
  ["code","with open('camp_log.txt') as f:\n    print(f.read())"],
  ["code","replaced\nappended"],
  ["note","Reopening a file in 'w' mode to add to it is the data-loss version of the truncate rule: the old contents are gone before the new write lands. Adding means 'a'. Reserve 'w' for files you mean to rebuild from nothing."]
]},
{ t: "Shortcuts and shelves: read_text, write_text, and shelve",
  body: [
  ["p","For the common one-shot cases, Path objects carry the whole workflow in a single call. write_text() opens in 'w' mode, writes the string, closes, and returns the character count. read_text() opens, reads everything, closes, and returns the string. No file object, no close to forget."],
  ["code",">>> from pathlib import Path\n>>> Path('motto.txt').write_text('measure twice, cut once\\n')\n24\n>>> Path('motto.txt').read_text()\n'measure twice, cut once\\n'"],
  ["p","Text files store text, and only text. To keep an actual Python value — a list, a dictionary — across runs, the shelve module stores variables in a shelf file. A shelf works like a dictionary whose contents survive the program ending: open it, assign to keys, close it; reopen later and the values are back."],
  ["code","import shelve\nshelf = shelve.open('campdata')\nshelf['gear'] = ['tent', 'lantern', 'rope']\nshelf.close()\nshelf = shelve.open('campdata')\nprint(shelf['gear'])\nshelf.close()"],
  ["code","['tent', 'lantern', 'rope']"],
  ["p","shelve manages its own files on disk — what they are called and how many there are varies by system, and they are not meant to be opened as text. One honest limitation: the browser Python this app runs on does not ship the storage backend shelve needs, so this example is one to try in a desktop Python, not here. The graded exercises below stay on plain text files, which work everywhere."]
]},
{ t: "A short program: the packing list",
  body: [
  ["p","This program uses the chapter end to end: 'w' to start a file fresh, 'a' to add to it, with to handle the closing, readlines() to get the lines back, and strip() from chapter 8 to clean them. Read it and predict the output before looking."],
  ["code","with open('packing.txt', 'w') as f:\n    f.write('stove\\nmatches\\ncompass\\n')\nwith open('packing.txt', 'a') as f:\n    f.write('map\\n')\nwith open('packing.txt') as f:\n    lines = f.readlines()\nprint('Packing list, ' + str(len(lines)) + ' items:')\nfor i in range(len(lines)):\n    print(str(i + 1) + '. ' + lines[i].strip())"],
  ["code","Packing list, 4 items:\n1. stove\n2. matches\n3. compass\n4. map"],
  ["p","The first with block writes three lines in one string — the newlines inside it are what make them lines. The second opens in 'a' and adds a fourth. The third reads all four back as a list, and the loop rebuilds each line with its number, using strip() to drop the newline that readlines() keeps."],
  ["note","One design choice worth copying: the program starts in 'w' mode, so every run rebuilds the file and prints the same four items. Start it in 'a' instead and each run would stack another copy of the list onto the file — output growing every time, and the bug only visible on the second run."]
]},
{ t: "Summary",
  body: [
  ["p","A file is data with a name at the end of a path. pathlib's Path objects build paths with /, take them apart with name, stem, suffix, and parent, and answer questions with exists(), is_file(), is_dir(), stat(), and glob(). Reading and writing follow one workflow — open, use, close — with the mode string deciding everything: 'r' reads and is the default, 'w' creates or wipes, 'a' adds to the end. with runs the workflow and guarantees the close, read_text() and write_text() compress the one-shot cases to a single call, and shelve stores live Python values instead of text."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises. The next chapter, Organizing Files, puts this one to work on whole folders at a time."]
]}
],
questions: [
{ q:"What does the / operator do when one of its operands is a Path object, and what happens when both operands are plain strings?",
  a:"With a Path on either side it joins path pieces into a longer Path, inserting the right separator for the system. With two plain strings it raises TypeError: unsupported operand type(s) for /: 'str' and 'str' — strings alone do not know what / should mean." },
{ q:"What is the difference between an absolute and a relative path, and what is a relative path measured from?",
  a:"An absolute path spells the full route from the filesystem root and starts with / on macOS and Linux. A relative path is measured from the current working directory — the folder the program is standing in when it runs." },
{ q:"What does Path('spam') / 'eggs' / 'ham' evaluate to?",
  a:"PosixPath('spam/eggs/ham') on macOS, Linux, and in this app — the three pieces joined with separators. On Windows the same code produces a WindowsPath instead." },
{ q:"For p = Path('data/summary.csv'): what are p.name, p.stem, and p.suffix?",
  a:"p.name is 'summary.csv', p.stem is 'summary', and p.suffix is '.csv'. None of them need the file to exist — they are read off the name, not the disk." },
{ q:"What questions do exists(), is_file(), and is_dir() answer?",
  a:"exists(): is anything at this path. is_file(): is it there and a file. is_dir(): is it there and a folder. All three answer False for a path with nothing at it." },
{ q:"Name the three mode strings for open(). Which is the default, and what does 'w' do to a file that already exists?",
  a:"'r' reads, 'w' writes, 'a' appends; the default is 'r'. Opening an existing file in 'w' truncates it — the old contents are wiped at the moment of opening, before any write happens." },
{ q:"What happens when you open a path that does not exist in 'r' mode, and in 'w' mode?",
  a:"'r' raises FileNotFoundError, since there is nothing to read. 'w' creates the file empty and opens it for writing — and 'a' creates missing files the same way." },
{ q:"What is the difference between what read() and readlines() return?",
  a:"read() returns the whole file as one string. readlines() returns a list with one string per line, each keeping its trailing newline — which is why lines usually pass through strip() before use." },
{ q:"Name two ways write() behaves differently from print().",
  a:"write() adds no newline, so consecutive writes glue together unless the strings end in one, and it returns the number of characters written. print() adds the newline for you and returns nothing." },
{ q:"What does the with statement guarantee that a bare open() does not?",
  a:"That the file is closed when the block ends, even when the block exits on an error — afterwards the file object's closed attribute is True. With a bare open(), a forgotten close() can leave written data sitting in a buffer instead of the file." }
],
exercises: [
{ c:"file I/O", t:"Write it, then read it back", book:"ch10",
  b:"Create greeting.txt containing the single line 'The file outlives the program' using open() in 'w' mode, ending the line with a newline character. Then open the file again in 'r' mode, read the whole contents with read(), and print them.",
  o:"The file outlives the program",
  h:["Two opens on the same filename: the first puts text in, the second gets it back out.",
     "'w' mode with write() creates the file; the default 'r' mode with read() returns its contents as one string.",
     "with open('greeting.txt', 'w') as f: f.write('The file outlives the program\\n') — then a second with block that prints f.read()."]},
{ c:"file I/O", t:"The camping list, numbered", book:"ch10",
  b:"Write three lines to camping.txt — tent, lantern, rope — then read the file back with readlines() and print each item numbered with a colon, like 1: tent, one per line.",
  o:"1: tent\n2: lantern\n3: rope",
  h:["One write() call can carry all three lines — newlines are characters in the string, not separate commands.",
     "readlines() returns a list of strings that keep their newlines; strip() takes the newline off each before you rebuild the line.",
     "After lines = f.readlines(), loop with for i in range(len(lines)) and print str(i + 1) + ': ' + lines[i].strip()."]},
{ c:"file I/O", t:"Append, do not overwrite", book:"ch10",
  b:"Create journal.txt containing the line 'checked the tides' using 'w' mode. Then append two more lines using 'a' mode — 'patched the hull' and 'set sail' — each ending in a newline. Finally read the file and print its contents.",
  o:"checked the tides\npatched the hull\nset sail",
  h:["Three opens in sequence. The mode string is the only thing that changes between the first two.",
     "'w' starts the file fresh, 'a' adds to the end without touching what is already there — and write() never adds newlines for you.",
     "with open('journal.txt', 'w') first, then with open('journal.txt', 'a') for the two later lines, then read it back and print."]},
{ c:"file I/O", t:"Take the path apart", book:"ch10",
  b:"Given p = Path('field_notes/2026/day03.txt'), print four lines: the filename, the stem, the suffix, and the parent folder — in that order.",
  o:"day03.txt\nday03\n.txt\nfield_notes/2026",
  h:["No file needs to exist — these are questions about the path itself, answered without touching the disk.",
     "name, stem, suffix, and parent are attributes, not method calls: p.name, no parentheses.",
     "from pathlib import Path, build p, then four prints, starting with print(p.name)."]}
]
};
