/* Practice Log book — Chapter 9: Text Pattern Matching with Regular Expressions.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch09 = {
n: 9,
title: "Text Pattern Matching with Regular Expressions",
src: "https://automatetheboringstuff.com/3e/chapter9.html",
blurb: "One compiled pattern replaces a screenful of string tests: find, extract, count, and rewrite text by its shape.",
sections: [
{ t: "Finding text patterns without regular expressions",
  body: [
  ["p","Suppose every order in a warehouse system gets a code like ORD-2026-0481: the letters ORD, a dash, a four-digit year, another dash, and a four-digit serial. You already know enough Python to check whether a string fits that shape — chapter 8 gave you slicing, isdecimal(), and loops over character positions. It just costs more code than the job deserves."],
  ["code","def is_order_code(text):\n    if len(text) != 13:\n        return False\n    if text[0:4] != 'ORD-':\n        return False\n    for i in range(4, 8):\n        if not text[i].isdecimal():\n            return False\n    if text[8] != '-':\n        return False\n    for i in range(9, 13):\n        if not text[i].isdecimal():\n            return False\n    return True\n\nprint(is_order_code('ORD-2026-0481'))\nprint(is_order_code('ORD-26-481'))"],
  ["code","True\nFalse"],
  ["p","The function works, but look at what it costs: a screenful of code to describe one rigid, thirteen-character shape. It is brittle, too. The day the warehouse adds a second code format, or wants to find every code buried inside a paragraph instead of testing one clean string, this approach collapses into more loops and more ifs."],
  ["p","A regular expression — regex from here on — is a small language for describing text patterns. The whole function above compresses to the pattern r'ORD-\\d{4}-\\d{4}': the literal characters ORD-, then four digits, a dash, and four more digits. This chapter is about writing patterns like that and handing them to Python's re module, which does the checking, finding, and extracting for you."]
]},
{ t: "Finding text patterns with regular expressions",
  body: [
  ["p","The re module is in the standard library, so a plain import re brings it in. You hand a pattern string to re.compile() and get back a pattern object; the pattern object's search() method scans a string for the first place the pattern fits. Inside the pattern, most characters simply mean themselves — O matches O — while \\d is shorthand for any single digit and {4} repeats whatever sits just before it exactly four times."],
  ["code",">>> import re\n>>> code_pat = re.compile(r'ORD-\\d{4}-\\d{4}')\n>>> mo = code_pat.search('Invoice for ORD-2026-0481 enclosed')\n>>> mo.group()\n'ORD-2026-0481'"],
  ["p","search() did two jobs at once: it decided that the pattern occurs in the string, and it found where. What it returns is a Match object, and the Match object's group() method hands back the actual text that matched. When the pattern occurs nowhere in the string, search() returns None instead."],
  ["code",">>> print(code_pat.search('no codes in this sentence'))\nNone"],
  ["p","That None is not a technicality — it is the branch your code has to handle. Call group() on it and the program stops:"],
  ["code",">>> mo = code_pat.search('no codes in this sentence')\n>>> mo.group()\nAttributeError: 'NoneType' object has no attribute 'group'"],
  ["p","The r prefix on the pattern string matters. An ordinary string runs through Python's own escape processing before re ever sees it — chapter 1's \\n and \\t are rewritten into real newline and tab characters. A raw string switches that off, so the backslashes you type are the backslashes the regex engine receives. The two-character sequence \\b means word boundary to re, but in an ordinary string Python swallows it into a single backspace character first:"],
  ["code",">>> len('\\b')\n1\n>>> len(r'\\b')\n2"],
  ["note","Check for None before calling group(). The AttributeError above means search() found nothing and the code assumed it found something — the standard crash of this chapter. Test the result with if mo != None: before touching group()."]
]},
{ t: "Grouping with parentheses and the pipe",
  body: [
  ["p","Parentheses split a pattern into groups. The order-code pattern with two groups added matches exactly the same text as before, but now the Match object remembers which part of the match each group caught. group(1) is the text of the first parenthesized group and group(2) the second; group() — or group(0) — is still the whole match, and groups() returns every captured piece at once as a tuple."],
  ["code",">>> pair = re.compile(r'ORD-(\\d{4})-(\\d{4})')\n>>> mo = pair.search('Reprint ORD-2026-0481 for the archive')\n>>> mo.group(1)\n'2026'\n>>> mo.group(2)\n'0481'\n>>> mo.group()\n'ORD-2026-0481'\n>>> mo.groups()\n('2026', '0481')"],
  ["p","Because parentheses are regex syntax, matching a literal parenthesis takes an escape: \\( and \\). The same goes for the other characters regexes reserve — . ^ $ * + ? { } [ ] \\ | ( ) — a backslash in front turns any of them back into a plain character. Here the shelf number sits inside real parentheses in the text, and the group captures just the digits:"],
  ["code",">>> shelf = re.compile(r'\\((\\d{2})\\)')\n>>> shelf.search('Shelf (07) is full').group()\n'(07)'\n>>> shelf.search('Shelf (07) is full').group(1)\n'07'"],
  ["p","The pipe | matches any one of several alternatives. When more than one alternative occurs in the text, the match lands on the earliest occurrence in the string — not on the order you listed the alternatives:"],
  ["code",">>> carrier = re.compile(r'UPS|FedEx|DHL')\n>>> carrier.search('Shipped via FedEx on Monday').group()\n'FedEx'\n>>> carrier.search('DHL handed this to UPS at the border').group()\n'DHL'"],
  ["p","Inside parentheses, the pipe scopes to just that group — which is how you say that several alternatives share the same surroundings:"],
  ["code",">>> container = re.compile(r'(pallet|crate) #(\\d{2})')\n>>> mo = container.search('Move crate #31 to bay 9')\n>>> mo.group(1)\n'crate'\n>>> mo.group()\n'crate #31'"],
  ["note","Group numbering starts at 1, not 0. Reaching for group(0) to get the first captured piece hands you the entire match instead — 0 is the whole thing, 1 is the first pair of parentheses."]
]},
{ t: "Quantifiers: optional, repeated, counted",
  body: [
  ["p","A quantifier sits after a piece of pattern and says how many times that piece may repeat. The question mark means zero or one — the piece is optional. A log format that sometimes writes WARN and sometimes WARNING is one pattern, not two:"],
  ["code",">>> warn = re.compile(r'WARN(ING)?')\n>>> warn.search('level=WARN disk almost full').group()\n'WARN'\n>>> warn.search('WARNING: retrying in 5 seconds').group()\n'WARNING'"],
  ["p","The star means zero or more, so the piece may be absent, present once, or repeated. The plus means one or more — the same idea, but at least one occurrence is required."],
  ["code",">>> sec = re.compile(r'(sub)*section')\n>>> sec.search('see the subsubsection on refunds').group()\n'subsubsection'\n>>> sec.search('the section header').group()\n'section'"],
  ["code",">>> bay = re.compile(r'bay \\d+')\n>>> bay.search('forklift to bay 214').group()\n'bay 214'\n>>> print(bay.search('forklift to bay '))\nNone"],
  ["p","Curly braces count exactly: {4} is exactly four, {4,6} is four to six, {4,} is four or more, and {,6} is up to six. You have been using {4} since the first pattern in this chapter."],
  ["p","When a range like {4,6} could stop at several different lengths, Python's regexes are greedy: they take the longest text that still lets the whole pattern match. A question mark after the quantifier flips it to non-greedy, taking the shortest:"],
  ["code",">>> door = re.compile(r'\\d{4,6}')\n>>> door.search('door code 493218 today').group()\n'493218'\n>>> door_lazy = re.compile(r'\\d{4,6}?')\n>>> door_lazy.search('door code 493218 today').group()\n'4932'"],
  ["note","The question mark has two jobs, and misreading them is the standard trip-up: after a group or character it means optional, but after a quantifier it means non-greedy. r'(sub)?section' is an optional sub; r'\\d{4,6}?' is a lazy count, not an optional one."]
]},
{ t: "findall and character classes",
  body: [
  ["p","search() stops at the first match. The findall() method returns every non-overlapping match in the string as a list, which turns a day's log into data you can loop over:"],
  ["code",">>> log = 'ORD-2026-0481 shipped; ORD-2025-9930 delayed; ORD-2026-1004 packed'\n>>> re.compile(r'ORD-\\d{4}-\\d{4}').findall(log)\n['ORD-2026-0481', 'ORD-2025-9930', 'ORD-2026-1004']"],
  ["p","findall() changes shape the moment the pattern contains two or more groups: instead of a list of matched strings you get a list of tuples — one tuple per match, one element per group."],
  ["code",">>> re.compile(r'ORD-(\\d{4})-(\\d{4})').findall(log)\n[('2026', '0481'), ('2025', '9930'), ('2026', '1004')]"],
  ["p","\\d is one of several shorthand character classes. \\w matches a word character — a letter, digit, or underscore — and \\s matches a whitespace character. Their uppercase partners invert them: \\D is any character that is not a digit, \\W any that is not a word character, \\S any that is not whitespace. A count-then-noun pattern falls out of just two of these:"],
  ["code",">>> item = re.compile(r'\\d+ \\w+')\n>>> item.findall('12 bolts, 3 hinges, 40 washers')\n['12 bolts', '3 hinges', '40 washers']"],
  ["p","Square brackets build a class of your own: [aeiou] is any one lowercase vowel, and a dash inside the brackets spans a range, so [a-f] and [0-5] work the way you would guess. A caret straight after the opening bracket negates the class — [^aeiou ] is any character that is neither a vowel nor a space."],
  ["code",">>> re.compile(r'[aeiou]').findall('Forklift out of service')\n['o', 'i', 'o', 'u', 'o', 'e', 'i', 'e']\n>>> re.compile(r'[^aeiou ]').findall('bay nine')\n['b', 'y', 'n', 'n']"],
  ["p","Be precise about what a class contains. [0-57] is not the numbers zero through fifty-seven — it is the range 0-5 plus the single character 7, because ranges bind one character at a time:"],
  ["code",">>> re.compile(r'[0-57]').findall('0123456789')\n['0', '1', '2', '3', '4', '5', '7']"],
  ["note","Adding parentheses to a findall() pattern quietly changes its return type. You group part of the pattern for readability, and the list of strings you were looping over becomes a list of tuples — and the breakage shows up wherever the list is used, not on the line you edited."]
]},
{ t: "Anchors, the dot, and dot-star",
  body: [
  ["p","A caret at the start of a pattern anchors it to the start of the string; a dollar sign at the end anchors it to the end. Use both and the whole string must fit the pattern — which is what validating a label needs, as opposed to finding a code somewhere inside a sentence:"],
  ["code",">>> bin_pat = re.compile(r'^B-\\d{2}$')\n>>> bin_pat.search('B-12').group()\n'B-12'\n>>> print(bin_pat.search('bin B-12'))\nNone"],
  ["p","The dot matches any single character except a newline. One dot is one character — it never stretches on its own:"],
  ["code",">>> bg = re.compile(r'b.g')\n>>> bg.findall('big bag bug bog')\n['big', 'bag', 'bug', 'bog']\n>>> print(bg.search('brig'))\nNone"],
  ["p","Dot-star — .* — is the stretch: any character, zero or more times. It is the standard way to grab everything between two landmarks:"],
  ["code",">>> field = re.compile(r'user=(.*) role=(.*)')\n>>> mo = field.search('user=mira role=admin')\n>>> mo.group(1)\n'mira'\n>>> mo.group(2)\n'admin'"],
  ["p","Dot-star is greedy like every quantifier, and with several possible stopping points that bites. Between the first [ and the last ] below there is a lot of text, and greedy .* takes all of it; .*? stops at the first closer:"],
  ["code",">>> re.compile(r'\\[.*\\]').search('[boot] chatter [ready]').group()\n'[boot] chatter [ready]'\n>>> re.compile(r'\\[.*?\\]').search('[boot] chatter [ready]').group()\n'[boot]'"],
  ["p","Because the dot refuses newlines, .* stops at the end of a line. Passing re.DOTALL as a second argument to re.compile() lifts that limit and lets the dot cross line breaks:"],
  ["code",">>> re.compile(r'.*').search('line one\\nline two').group()\n'line one'\n>>> re.compile(r'.*', re.DOTALL).search('line one\\nline two').group()\n'line one\\nline two'"],
  ["note","When the text holds several bracketed chunks and r'\\[.*\\]' returns one giant match, that is not re misbehaving — it is greed doing its default job. Reach for .*? whenever there is more than one possible closing landmark."]
]},
{ t: "Substituting text and taming big patterns",
  body: [
  ["p","The sub() method is find-and-replace: give it a replacement string and the text, and it returns a new string with every match replaced. Redacting addresses out of a support log is one call:"],
  ["code",">>> redact = re.compile(r'\\w+@\\w+\\.\\w+')\n>>> redact.sub('[email removed]', 'Contact mira@example.com or dev@example.org today')\n'Contact [email removed] or [email removed] today'"],
  ["p","The replacement can quote the match's own groups: \\1 in the replacement string means whatever group 1 captured. That is how you replace most of a match but keep a piece — here, masking six-digit door codes down to their last two digits. Write the replacement raw for the same reason you write patterns raw:"],
  ["code",">>> mask = re.compile(r'\\d{4}(\\d{2})')\n>>> mask.sub(r'****\\1', 'codes 493218 and 771402')\n'codes ****18 and ****02'"],
  ["p","re.compile() takes flags as a second argument. re.IGNORECASE makes the pattern blind to case:"],
  ["code",">>> level = re.compile(r'error', re.IGNORECASE)\n>>> level.search('ERROR: pump offline').group()\n'ERROR'\n>>> level.search('Minor error logged').group()\n'error'"],
  ["p","re.VERBOSE lets a pattern span several lines with comments. Whitespace inside a verbose pattern is ignored, so you can lay the pattern out like code and annotate each piece:"],
  ["code","import re\ncode_pat = re.compile(r'''\n    ORD-        # the literal prefix\n    (\\d{4})     # four-digit year\n    -           # the separating dash\n    (\\d{4})     # four-digit serial\n    ''', re.VERBOSE)\nprint(code_pat.search('Recheck ORD-2026-0481 today').group())"],
  ["code","ORD-2026-0481"],
  ["p","The flags argument is a single parameter, so combining flags uses the | character between them — the same symbol as the regex pipe, doing a different job in Python syntax:"],
  ["code","import re\nloose = re.compile(r'''\n    ord-        # prefix, any case\n    \\d{4}       # year\n    -           # dash\n    \\d{4}       # serial\n    ''', re.IGNORECASE | re.VERBOSE)\nprint(loose.search('Confirm Ord-2026-0481 received').group())"],
  ["code","Ord-2026-0481"],
  ["note","In a verbose pattern the whitespace you type is ignored — including a space you meant to match. Write a deliberate space as \\s or escape it with a backslash, or the pattern silently stops requiring it."]
]},
{ t: "Summary",
  body: [
  ["p","A regex pattern is a description of text: literal characters for the fixed parts, \\d \\w \\s and bracketed classes for the variable ones, quantifiers — ? * + and the {} counts — for repetition, parentheses to capture pieces, the pipe for alternatives, and ^ $ anchors to pin the ends of the string. re.compile() turns the description into a pattern object; search() finds the first match and findall() every match; group() reads captured pieces back out; sub() rewrites matches; and IGNORECASE, DOTALL, and VERBOSE bend the rules where real text demands it."],
  ["p","Every pattern in this chapter ran against strings pasted into the program. The next chapter removes that limit: reading and writing files puts whole documents within reach, and a compiled pattern does not care whether its text came from a variable or from a folder of log files. Answer the practice questions from memory before revealing the answers, then clear the graded exercises below."]
]}
],
questions: [
{ q:"Why should every regex pattern be written as a raw string, like r'ORD-\\d{4}'?",
  a:"Ordinary strings pass through Python's escape processing first, which can rewrite backslash sequences before re ever sees them — '\\b' collapses into a one-character backspace, while r'\\b' stays the two characters the engine expects. Raw strings hand your backslashes over untouched." },
{ q:"What does search() return when the pattern is found, and when it is not — and what goes wrong in the second case if you forget?",
  a:"A Match object when found, None when not. Calling group() on that None raises AttributeError: 'NoneType' object has no attribute 'group' — so test with if mo != None: before using the result." },
{ q:"The pattern r'ORD-(\\d{4})-(\\d{4})' matched 'ORD-2026-0481'. What do group(0), group(1), and group(2) return?",
  a:"group(0) is the whole match, 'ORD-2026-0481'. group(1) is '2026' and group(2) is '0481'. Captured groups are numbered from 1; 0 always means the entire match." },
{ q:"What is the difference between * and + ?",
  a:"* means zero or more of the preceding piece, + means one or more. r'bay \\d*' still matches the text 'bay ' because zero digits is allowed, while r'bay \\d+' finds nothing there — at least one digit is required." },
{ q:"The question mark appears in r'(sub)?section' and in r'\\d{4,6}?'. What does it mean in each?",
  a:"After a group it means optional: zero or one sub. After a quantifier it means non-greedy: match the shortest length allowed, so \\d{4,6}? takes four digits from '493218' where plain \\d{4,6} takes all six." },
{ q:"What does findall() return for a pattern with no groups, and for a pattern with two groups?",
  a:"With no groups (or one), a list of the matched strings. With two or more groups, a list of tuples — one tuple per match, one element per group. Adding parentheses to a pattern changes the shape of findall()'s result." },
{ q:"What text do \\d, \\w, and \\s each match, and what do their uppercase versions do?",
  a:"\\d is any digit, \\w a word character — letter, digit, or underscore — and \\s a whitespace character. The uppercase forms match the opposite: \\D any non-digit, \\W any non-word character, \\S any non-whitespace." },
{ q:"What does [^aeiou] match, and how is that caret different from the caret in r'^B-\\d{2}'?",
  a:"Inside brackets the caret negates the class, so [^aeiou] is any character that is not a lowercase vowel. At the front of a pattern it is an anchor forcing the match to start at the beginning of the string. Same character, two unrelated jobs." },
{ q:"Against '[boot] chatter [ready]', what do r'\\[.*\\]' and r'\\[.*?\\]' each match, and why?",
  a:"The greedy version matches the whole span '[boot] chatter [ready]' — .* takes the longest text that still ends with a ]. The non-greedy .*? stops at the first closer and matches just '[boot]'." },
{ q:"What does re.VERBOSE change, and how do you pass it together with re.IGNORECASE?",
  a:"re.VERBOSE makes the compiler ignore whitespace and # comments inside the pattern, so a long pattern can be spread across lines and annotated. Flags share one parameter, so combine them with the | operator: re.compile(pattern, re.IGNORECASE | re.VERBOSE)." }
],
exercises: [
{ c:"strings", t:"First code, then the count", book:"ch09",
  b:"Given line = 'Manifest: ORD-2026-0481, ORD-2025-9930, ORD-2026-1004', compile the pattern r'ORD-\\d{4}-\\d{4}' and print the first matching code, then the number of codes in the line, each on its own line.",
  o:"ORD-2026-0481\n3",
  h:["search() finds the first match; findall() returns every match as a list. Between them you have both lines of output.",
     "The first line is the .group() of the search result. The count is what len() says about the findall() list.",
     "Compile the brief's pattern once. Line one prints pat.search(line).group(); line two prints the len() of pat.findall(line)."]},
{ c:"strings", t:"Split the code", book:"ch09",
  b:"Given code = 'ORD-2026-0481', use a pattern with two groups to print the four-digit year part, then the four-digit serial part, each on its own line.",
  o:"2026\n0481",
  h:["Parentheses in a pattern capture pieces of the match — one pair per piece you want back.",
     "After mo = pat.search(code), the captured pieces are mo.group(1) and mo.group(2). Numbering starts at 1.",
     "The pattern is r'ORD-(\\d{4})-(\\d{4})'. Search the code string, then print group 1 and group 2."]},
{ c:"strings", t:"Redacted log", book:"ch09",
  b:"Given log = 'mira@example.com opened bay 7; dev@example.org closed bay 12', use the pattern r'\\w+@\\w+\\.\\w+' to replace every email address with '[redacted]', and print the result.",
  o:"[redacted] opened bay 7; [redacted] closed bay 12",
  h:["This is find-and-replace, which is one method call on a compiled pattern — no loop needed.",
     "sub() takes the replacement string first and the text second, and it returns the new string rather than printing it.",
     "Compile the brief's pattern, call .sub('[redacted]', log) on it, and print what sub() returns."]},
{ c:"strings", t:"Label check", book:"ch09",
  b:"Given labels = ['B-07', 'B-123', 'C-44', 'B-9'], print one line per label: the label, a space, then 'ok' when the whole label matches r'^B-\\d{2}$' and 'bad' otherwise.",
  o:"B-07 ok\nB-123 bad\nC-44 bad\nB-9 bad",
  h:["One compiled pattern, one for loop over the list, one if/else inside the loop.",
     "The anchors do the whole-string work: with ^ and $ in the pattern, search() returns None unless the entire label fits.",
     "For each label: mo = pat.search(label); when mo != None print label + ' ok', otherwise print label + ' bad'."]}
]
};
