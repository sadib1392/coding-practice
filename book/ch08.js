/* Practice Log book — Chapter 8: Strings and Text Editing.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory.
   One disclosed exception: the pyperclip clipboard example is third-party and
   desktop-only, so its code is shown without any claimed output. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch08 = {
n: 8,
title: "Strings and Text Editing",
src: "https://automatetheboringstuff.com/3e/chapter8.html",
blurb: "Escapes, slices, f-strings, and the method toolbox that trims, splits, and reshapes text.",
sections: [
{ t: "String literals and escape sequences",
  body: [
  ["p","Text in Python lives in string literals, and chapter 1 wrote them all with single quotes. Double quotes make an equally good pair — the only rule is that the opening and closing quote must match. The choice starts to matter the moment the text itself contains a quote character: an apostrophe inside a single-quoted literal ends the string early, and Python rejects the line. Wrapping the same text in double quotes fixes it, and the shell does exactly that when it echoes such a string back."],
  ["code",">>> shop = 'Fjord Antiques'\n>>> shop\n'Fjord Antiques'\n>>> \"we're open\"\n\"we're open\""],
  ["p","The other route is an escape sequence: a backslash followed by one character, standing in for something awkward or impossible to type. \\' is a quote that does not end the string, \\\" the same for double quotes, \\t is a tab, \\n is a line break, and \\\\ is one real backslash. Each two-character escape becomes a single character in the finished string."],
  ["code",">>> print('it\\'s a bargain, isn\\'t it')\nit's a bargain, isn't it\n>>> print('the ledger lives in C:\\\\finds')\nthe ledger lives in C:\\finds"],
  ["code",">>> print('Fjord Antiques\\n\\topen daily\\n\\tcash only')\nFjord Antiques\n\topen daily\n\tcash only"],
  ["p","Because the backslash always starts an escape, a Windows-style path is a trap. In 'C:\\notes\\treasures' the \\n quietly becomes a line break and the \\t a tab — no error, just mangled text. Putting an r before the opening quote makes a raw string: backslashes are ordinary characters and no escapes are interpreted."],
  ["code",">>> print('C:\\notes\\treasures')\nC:\notes\treasures\n>>> print(r'C:\\notes\\treasures')\nC:\\notes\\treasures"],
  ["p","For text that spans lines there are triple quotes. Everything between ''' and ''' is part of one multiline string — line breaks and leading spaces included, quotes inside welcome, no escapes needed."],
  ["code","notice = '''Closed for stocktake\nback Monday\n  - the management'''\nprint(notice)"],
  ["code","Closed for stocktake\nback Monday\n  - the management"],
  ["note","The path bug is the one that ships, because it fails silently: 'C:\\notes' prints as two broken lines and nothing raises. When a literal must keep its backslashes, reach for the r prefix first and doubled backslashes second."]
]},
{ t: "Indexes, slices, and in",
  body: [
  ["p","A string is a sequence of characters, and every character sits at a numbered position — an index — counting from 0. Square brackets after the string pull out the character at one index. A negative index counts from the end, with -1 the last character, and asking for a position that does not exist is an IndexError."],
  ["code",">>> word = 'lighthouse'\n>>> word[0]\n'l'\n>>> word[5]\n'h'\n>>> word[-1]\n'e'\n>>> word[40]\nIndexError: string index out of range"],
  ["p","A slice names two indexes and evaluates to the piece between them — the start index included, the end index excluded. Leave the start out to begin at 0; leave the end out to run to the end of the string."],
  ["code",">>> word[0:5]\n'light'\n>>> word[5:]\n'house'\n>>> word[:5]\n'light'"],
  ["p","Slicing copies. The original is untouched afterward — and it has to be, because strings cannot be edited in place. Assigning into an index raises a TypeError. The way to change a string is to build a new one out of pieces and store that instead."],
  ["code",">>> beam = word[0:5]\n>>> beam\n'light'\n>>> word\n'lighthouse'\n>>> word[0] = 'L'\nTypeError: 'str' object does not support item assignment\n>>> 'L' + word[1:]\n'Lighthouse'"],
  ["p","The in and not in operators ask whether one string appears anywhere inside another and evaluate to a Boolean — chapter 2's type doing this chapter's work. The test is exact, case included."],
  ["code",">>> 'house' in word\nTrue\n>>> 'House' in word\nFalse\n>>> 'ou' in word\nTrue\n>>> 'ship' not in word\nTrue"],
  ["note","The end of a slice is excluded: word[0:5] stops at index 4, and the character at index 5 is not in it. Expecting the end index to be included is the off-by-one everyone writes at least once — check a slice in the shell before trusting it in a program."]
]},
{ t: "f-strings, and two older ways",
  body: [
  ["p","Gluing values into text with + works, but every non-string needs a str() wrapper and the line drowns in quotes and plus signs. An f-string does the same job in one piece: put an f before the opening quote, and anything inside curly braces is evaluated and dropped into the text, numbers converted automatically."],
  ["code",">>> name = 'Ines'\n>>> visits = 7\n>>> name + ' has ' + str(visits) + ' visits'\n'Ines has 7 visits'\n>>> f'{name} has {visits} visits'\n'Ines has 7 visits'"],
  ["p","The braces take any expression, not just a variable name — arithmetic, a method call, a comparison. The expression is evaluated when the f-string is, and its result lands in the text."],
  ["code",">>> f'{name} earns a free coffee in {10 - visits} visits'\n'Ines earns a free coffee in 3 visits'"],
  ["p","Older code does the same job two other ways: %s interpolation, and the format() method with empty braces as slots. Both still run and you will read them in other people's programs; write f-strings in your own. They arrived in Python 3.6, so every Python you meet today has them."],
  ["code",">>> 'seat %s, row %s' % ('12A', 4)\n'seat 12A, row 4'\n>>> 'seat {}, row {}'.format('12A', 4)\n'seat 12A, row 4'"],
  ["code",">>> '{name} has {visits} visits'\n'{name} has {visits} visits'"],
  ["note","Type the braces and forget the f, as in the last example, and there is no error — the braces print literally and the bug surfaces wherever the text is read. If a literal {name} shows up in your output, the missing prefix is the first thing to check."]
]},
{ t: "Case, content checks, and ends",
  body: [
  ["p","String methods are functions attached to the value itself, called with a dot after it. upper(), lower(), and title() return recased copies — and copies is the word, because no string method edits in place. The variable still holds the original until you store the result."],
  ["code",">>> answer = 'Oslo'\n>>> answer.upper()\n'OSLO'\n>>> answer.lower()\n'oslo'\n>>> answer\n'Oslo'"],
  ["p","The everyday use is comparison that ignores case: lowercase both sides and compare the results. isupper() and islower() report on the case already there — True when the string has at least one letter and every letter is in that case, so a string with no letters fails both."],
  ["code",">>> 'OSLO'.lower() == 'oslo'\nTrue\n>>> 'OSLO'.isupper()\nTrue\n>>> 'Oslo'.islower()\nFalse\n>>> '1926'.isupper()\nFalse"],
  ["p","A family of isX() methods classifies content the same way: isalpha() letters only, isalnum() letters and digits only, isdecimal() digits only, isspace() whitespace only, istitle() every word capitalised. All are False for the empty string, and isdecimal() is the honest way to ask whether a string can safely become an int."],
  ["code",">>> 'harbor'.isalpha()\nTrue\n>>> 'gate4'.isalpha()\nFalse\n>>> 'gate4'.isalnum()\nTrue\n>>> '2049'.isdecimal()\nTrue\n>>> '20.49'.isdecimal()\nFalse\n>>> '   '.isspace()\nTrue\n>>> 'Winter Harbor'.istitle()\nTrue"],
  ["p","startswith() and endswith() compare just the beginning or the end of a string — the natural test for filename extensions and prefixes, and case-sensitive like everything else here."],
  ["code",">>> report = 'harbor_survey.txt'\n>>> report.endswith('.txt')\nTrue\n>>> report.startswith('harbor')\nTrue\n>>> report.startswith('Harbor')\nFalse"],
  ["note","Calling answer.upper() and expecting answer itself to change is this chapter's most common mistake. Methods hand back a new string and leave the variable alone — keep the result with answer = answer.upper() or it is gone."]
]},
{ t: "Joining and splitting",
  body: [
  ["p","join() assembles a list of strings into one string. It is called on the separator — the text that goes between the pieces — and takes the list as its argument, which reads backward the first dozen times you write it."],
  ["code",">>> crew = ['Anya', 'Bo', 'Chen']\n>>> ', '.join(crew)\n'Anya, Bo, Chen'\n>>> ' & '.join(crew)\n'Anya & Bo & Chen'\n>>> crew.join(', ')\nAttributeError: 'list' object has no attribute 'join'"],
  ["p","split() is the mirror: called on the string, it returns the list of pieces. With no argument it splits on any run of whitespace; give it a separator to split on that instead. Splitting on '\\n' turns a multiline string into a list of its lines — the standard first move when a program works through text line by line."],
  ["code",">>> 'north gale rising'.split()\n['north', 'gale', 'rising']\n>>> 'oats,rice,lentils'.split(',')\n['oats', 'rice', 'lentils']\n>>> 'crates\\nbarrels\\nsacks'.split('\\n')\n['crates', 'barrels', 'sacks']"],
  ["p","partition() cuts at the first occurrence of a separator and always returns exactly three values: the part before, the separator itself, and the part after. When the separator is missing there is no error — the whole string lands in the first slot and the other two come back empty, so look before trusting the pieces."],
  ["code",">>> 'ana@harbor.example'.partition('@')\n('ana', '@', 'harbor.example')\n>>> 'ana.harbor'.partition('@')\n('ana.harbor', '', '')"],
  ["note","The AttributeError above is the one you will actually hit: lists have no join method. The separator owns it — ', '.join(crew), never crew.join(', '). An empty separator is legal, and ''.join(pieces) welds the pieces together with nothing between."]
]},
{ t: "Aligning and trimming",
  body: [
  ["p","rjust(), ljust(), and center() pad a string out to a given width — with spaces by default, or with any single fill character passed as a second argument. They exist for lining up columns of plain text."],
  ["code",">>> 'Tea'.rjust(10)\n'       Tea'\n>>> 'Tea'.ljust(10)\n'Tea       '\n>>> 'Tea'.center(10)\n'   Tea    '\n>>> 'Tea'.ljust(10, '.')\n'Tea.......'\n>>> 'SALE'.center(12, '-')\n'----SALE----'"],
  ["p","Two justified calls per line give a name column and a price column that stay aligned whatever the name lengths are:"],
  ["code","rows = [['Candles', '2.75'], ['Matches', '0.60']]\nfor row in rows:\n    print(row[0].ljust(10, '.') + row[1].rjust(6, '.'))"],
  ["code","Candles.....2.75\nMatches.....0.60"],
  ["p","The strip family removes characters from the ends of a string and never from the middle. strip() takes whitespace off both ends, lstrip() off the left only, rstrip() off the right only — the standard cleanup for user-typed text before comparing or storing it."],
  ["code",">>> entry = '   7 crates   '\n>>> entry.strip()\n'7 crates'\n>>> entry.lstrip()\n'7 crates   '\n>>> entry.rstrip()\n'   7 crates'"],
  ["p","With an argument, strip() removes those characters instead of whitespace. The argument is a set of individual characters, not a substring — any run of them is peeled off both ends until a different character stops it."],
  ["code",">>> '--warning--'.strip('-')\n'warning'\n>>> 'xyxxdockxyx'.strip('xy')\n'dock'"],
  ["note","strip('xy') does not mean remove the text 'xy'. It means strip x and y characters, in any order, off both ends — the middle is never touched. Removing a substring wherever it appears is a different method (replace), not strip."]
]},
{ t: "Code points and the clipboard",
  body: [
  ["p","Under every character is a number — its Unicode code point. ord() turns a one-character string into that number, chr() turns a number back into its character, and the two undo each other. This is also why string comparisons have an order: 'apple' < 'banana' is settled code point by code point."],
  ["code",">>> ord('A')\n65\n>>> ord('a')\n97\n>>> chr(66)\n'B'\n>>> chr(ord('n') + 1)\n'o'\n>>> 'apple' < 'banana'\nTrue"],
  ["p","The other bridge out of a program is the system clipboard. The third-party pyperclip module reads and writes it with two functions: copy() places text on the clipboard, and paste() returns whatever the clipboard currently holds, always as a string."],
  ["code","import pyperclip\npyperclip.copy('Meet at the north dock')\ntext = pyperclip.paste()\nprint(text.upper())"],
  ["p","After the copy() call the clipboard holds the message, paste() hands it straight back, and the print shows it uppercased. A script built on these two calls turns into a text tool: copy text from any app, run the script, paste the transformed result anywhere."],
  ["note","pyperclip is not part of the standard library, and it talks to the operating system's clipboard — two things the Python inside this app does not have. Its code above is the one block in this chapter shown without a verified output; run it on a desktop Python after pip install pyperclip. Every other output in the chapter was captured by executing the code."]
]},
{ t: "A short program: the badge maker",
  body: [
  ["p","This program uses most of the chapter at once. A sign-up sheet arrives as one messy multiline string — stray spaces, wrong case — and the program splits it into lines, cleans each name, and prints a bordered badge for everyone on the list. Read it and predict the second badge before looking at the output."],
  ["code","sheet = '''  priya raman\nDEV OKAFOR\n   lena wu  '''\nfor entry in sheet.split('\\n'):\n    name = entry.strip().title()\n    print('+' + '-' * 18 + '+')\n    print('|' + name.center(18) + '|')\n    print('+' + '-' * 18 + '+')"],
  ["code","+------------------+\n|   Priya Raman    |\n+------------------+\n+------------------+\n|    Dev Okafor    |\n+------------------+\n+------------------+\n|     Lena Wu      |\n+------------------+"],
  ["p","Trace one entry through the pipeline. '   lena wu  ' is stripped to 'lena wu', title() recases it to 'Lena Wu', and center(18) pads it to eighteen characters before the bars close the box. The border is chapter 1's string replication — '-' * 18 — and the split on '\\n' works because a triple-quoted literal keeps its real line breaks."],
  ["p","Swap the hardcoded sheet for pyperclip.paste() on a desktop and this becomes a clipboard tool: copy a ragged list from anywhere, run the script, paste badges back out. The graded exercises below stay hardcoded, as always, so they can be checked by running your code."]
]},
{ t: "Summary",
  body: [
  ["p","Strings come with a literal syntax rich enough for real text — escape sequences for the untypeable, raw strings for backslashes that must survive, triple quotes for multiple lines — and with positions: an index pulls one character, a slice copies a piece, in asks about membership. None of it modifies the original, because strings are immutable; every change means building a new string. f-strings drop any value or expression into text without a chain of str() calls."],
  ["p","The method toolbox does the everyday work: upper(), lower(), and title() recase; the isX() family classifies; startswith() and endswith() check the edges; split(), join(), and partition() move between one string and many; ljust(), rjust(), and center() align; the strip() family trims the ends. ord() and chr() connect characters to their code points, and pyperclip connects a desktop program to the clipboard. Answer the questions from memory before revealing the answers, then clear the graded exercises. Chapter 9 is text pattern matching with regular expressions — finding text by its shape when you cannot name its exact characters."]
]}
],
questions: [
{ q:"Inside a single-quoted string, how do you write a line break, a tab, and one literal backslash?",
  a:"With escape sequences: \\n is a line break, \\t a tab, and \\\\ a single backslash. Each two-character escape stands for one character in the finished string — len('\\n') is 1." },
{ q:"What does the r prefix change in r'C:\\notes', and when do you reach for it?",
  a:"It makes a raw string: backslashes are ordinary characters and escape sequences are not interpreted, so r'\\n' is two characters while '\\n' is one. Reach for it when a literal must keep its backslashes — Windows paths are the classic case." },
{ q:"word = 'lighthouse'. What do word[0], word[-1], word[0:5], and word[5:] evaluate to?",
  a:"'l', 'e', 'light', and 'house'. Indexes count from 0, a negative index counts from the end, and a slice includes its start index but excludes its end." },
{ q:"Why does word[0] = 'L' raise an error, and how do you get 'Lighthouse' anyway?",
  a:"Strings are immutable, so item assignment raises TypeError: 'str' object does not support item assignment. Build a new string instead: 'L' + word[1:] evaluates to 'Lighthouse'." },
{ q:"'house' in 'lighthouse' is True. What is 'House' in 'lighthouse', and why?",
  a:"False. in is an exact substring test, case included. To match regardless of case, lowercase both sides first — 'House'.lower() in 'lighthouse' is True." },
{ q:"What prints from print(f'total: {2 + 3}'), and what changes if the f is left off?",
  a:"With the f it prints total: 5 — the braces evaluate the expression. Without the f there is no error and the braces print literally: total: {2 + 3}." },
{ q:"label = 'quiet zone'. After label.upper() runs on its own line, what does label hold?",
  a:"Still 'quiet zone'. String methods return a new string and never modify the original; to keep the uppercase version, store it back: label = label.upper()." },
{ q:"What do '2049'.isdecimal(), '20.49'.isdecimal(), and '   '.isspace() evaluate to?",
  a:"True, False, True. isdecimal() wants digits only — the dot fails it, which is what makes it the right check before calling int(). isspace() is True for a whitespace-only string with at least one character." },
{ q:"Which value is join() called on, and what does 'oats,rice,lentils'.split(',') return?",
  a:"join() is called on the separator string and takes the list as its argument: ', '.join(crew). The split returns ['oats', 'rice', 'lentils']. Calling join on the list instead raises an AttributeError." },
{ q:"What do pyperclip.copy() and pyperclip.paste() do, and why does that code not run inside this app?",
  a:"copy() places text on the operating system clipboard; paste() returns the clipboard's current text as a string. pyperclip is a third-party module that needs a desktop Python and OS clipboard access — this app's Python has neither, so the chapter shows that code without a claimed output." }
],
exercises: [
{ c:"strings", t:"Split the compound", book:"ch08",
  b:"Given word = 'snowstorm', print the first four characters, then the last five, then the whole word rebuilt by adding those two slices — three prints, one per line.",
  o:"snow\nstorm\nsnowstorm",
  h:["A slice copies a piece by position — word[start:end], and either end can be left off.",
     "word[:4] is the first four characters; a negative start like word[-5:] counts from the end.",
     "print(word[:4]) is the first line; the third line prints the two slices added with +."]},
{ c:"strings", t:"Clean the weather line", book:"ch08",
  b:"Given city = '  reykjavik  ' and temp = -3, print exactly Reykjavik: -3 degrees. Strip the stray spaces, fix the case with title(), and build the line with an f-string.",
  o:"Reykjavik: -3 degrees",
  h:["Three jobs in one line of output: trim the spaces, recase the name, combine with the number.",
     "strip() and title() can be chained on the same value, and the f-string supplies the colon and the word degrees.",
     "cleaned = city.strip().title() first, then print an f-string containing {cleaned} and {temp}."]},
{ c:"strings", t:"Repack the pantry list", book:"ch08",
  b:"Given order = 'oats,rice,lentils', split it on the commas and print the resulting list, then print the parts joined back into one line with ' and ' between them.",
  o:"['oats', 'rice', 'lentils']\noats and rice and lentils",
  h:["One method breaks a string into a list; its mirror builds one string back from a list.",
     "split(',') is called on the string; join() is called on the separator, not on the list.",
     "parts = order.split(',') is the first half — print that list directly, then hand parts to join() called on ' and '."]},
{ c:"loops", t:"Dotted menu", book:"ch08",
  b:"Given items = [['Tea', '3.50'], ['Espresso', '4.25'], ['Oat scone', '2.90']], print one line per item: the name left-justified to width 12 with dots, then the price right-justified to width 7 with dots.",
  o:"Tea............3.50\nEspresso.......4.25\nOat scone......2.90",
  h:["One output line per inner list — that is a for loop over items.",
     "Each item is a two-value list: item[0] is the name, item[1] the price. ljust() and rjust() both take a width and an optional fill character.",
     "Inside the loop, print item[0].ljust(12, '.') added to the price justified the other way round."]}
]
};
