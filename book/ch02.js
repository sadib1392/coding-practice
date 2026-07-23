/* Practice Log book — Chapter 2: if-else and Flow Control.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch02 = {
n: 2,
title: "if-else and Flow Control",
src: "https://automatetheboringstuff.com/3e/chapter2.html",
blurb: "Booleans, comparisons, and the if/elif/else chains that let a program decide.",
sections: [
{ t: "Boolean values",
  body: [
  ["p","The integer, float, and string types from chapter 1 have room for endless different values. The Boolean type has exactly two: True and False. They are written with a capital first letter and no quotes — they are values in their own right, not strings — and they exist to answer yes-or-no questions inside your program."],
  ["code",">>> spam = True\n>>> spam\nTrue\n>>> type(True)\n<class 'bool'>"],
  ["p","Like any other value, a Boolean can be stored in a variable, printed, or handed to a function. What makes the type matter is the rest of this chapter: comparisons produce Booleans, and flow control statements consume them. Every decision a program makes routes through one of these two values."],
  ["code",">>> true\nNameError: name 'true' is not defined"],
  ["note","Python only recognises the exact spellings True and False — lowercase true is an undefined name, as the error above shows. Quoting them is the other mistake: 'True' is a string that merely looks the part, and it will not behave like the Boolean."]
]},
{ t: "Comparison operators",
  body: [
  ["p","A comparison operator takes two values and evaluates down to a single Boolean. There are six: == equal to, != not equal to, < less than, > greater than, <= less than or equal to, and >= greater than or equal to. Each one asks a question about its two sides and answers True or False."],
  ["code",">>> 42 == 42\nTrue\n>>> 42 == 99\nFalse\n>>> 2 != 3\nTrue\n>>> 2 != 2\nFalse"],
  ["p","Comparisons work on strings as well as numbers. Two strings are equal only when they match exactly, character for character — case included."],
  ["code",">>> 'hello' == 'hello'\nTrue\n>>> 'hello' == 'Hello'\nFalse\n>>> 'cat' != 'dog'\nTrue"],
  ["p","Across types, == is strict about meaning. A number is never equal to the string that spells it, because 42 and '42' are different kinds of value. An int and a float can be equal, though: both are numbers, and both are forty-two."],
  ["code",">>> 42 == '42'\nFalse\n>>> 42 == 42.0\nTrue"],
  ["p","The four ordering operators behave the way arithmetic taught you. They earn their keep next to a variable, where the comparison reads like the rule you meant to write."],
  ["code",">>> 10 < 20\nTrue\n>>> 10 > 20\nFalse\n>>> 10 <= 10\nTrue\n>>> 10 >= 12\nFalse"],
  ["code",">>> age = 29\n>>> age <= 30\nTrue\n>>> age != 29\nFalse"],
  ["note","The doubled = in == is the whole difference between comparing and assigning. age == 30 asks a question; age = 30 overwrites the variable. Typing = where you meant == inside a condition is a syntax error — Python catches it, but only after you have stared at the line."]
]},
{ t: "Boolean operators",
  body: [
  ["p","The Boolean operators and, or, and not combine Booleans into bigger questions. and evaluates to True only when both sides are True — one True combination out of four. or evaluates to True when at least one side is True, leaving only one False combination out of four."],
  ["code",">>> True and True\nTrue\n>>> True and False\nFalse\n>>> False or True\nTrue\n>>> False or False\nFalse"],
  ["p","not takes a single value and flips it. Doubling it undoes it — nobody writes not not on purpose, but seeing it once fixes what not does in your head."],
  ["code",">>> not True\nFalse\n>>> not not True\nTrue"],
  ["p","In real code the operands are usually comparisons, not bare Trues and Falses. Each comparison evaluates to a Boolean first, then the Boolean operator combines the results. The parentheses below are not required, but while the precedence rules are new they make the line say what you mean."],
  ["code",">>> (4 < 5) and (5 < 6)\nTrue\n>>> (4 < 5) and (9 < 6)\nFalse\n>>> (1 == 2) or (2 == 2)\nTrue"],
  ["p","Without parentheses, Python evaluates in a fixed order: arithmetic first, then comparisons, then not, then and, then or. Work through both lines below by that order and check yourself against the shell."],
  ["code",">>> 5 > 3 and not 5 > 7\nTrue\n>>> not 1 + 1 == 2 or 5 > 4\nTrue"],
  ["note","and demands both sides; or is satisfied by either. Swap one for the other and the program still runs — it just decides wrong, silently. When a compound condition misbehaves, read it aloud as English and test each side alone in the shell."]
]},
{ t: "Conditions, blocks, and program flow",
  body: [
  ["p","Flow control statements have two parts: a condition, and a block of code. A condition is not a new kind of thing — it is any expression that evaluates to True or False, sitting in the spot where a flow control statement expects one. Every comparison in this chapter is ready to be a condition."],
  ["p","The block is the code the statement governs. Python marks blocks with indentation: a block begins where the indentation steps in, and it ends where the indentation steps back out. The colon at the end of the if line announces that a block follows."],
  ["code","name = 'Mira'\nif name == 'Mira':\n    print('Hello, Mira')\n    print('Both of these lines are inside the block')\nprint('This line runs either way')"],
  ["code","Hello, Mira\nBoth of these lines are inside the block\nThis line runs either way"],
  ["p","Trace it the way Python runs it. Execution starts at the top and moves down a line at a time; at the if it evaluates the condition, and because the condition is True it steps into the block and runs both indented lines. The final print sits outside the block — it is not indented — so it runs no matter what the condition said."],
  ["note","Indentation is meaning, not decoration. Indent a line one level too deep and it joins a block you did not intend; one level too shallow and it leaves one. Python will either raise an IndentationError or, worse, run the wrong lines without complaint."]
]},
{ t: "if, else, and elif",
  body: [
  ["p","An if statement is the simplest flow control: when the condition is True, run the block; when it is False, skip it. An else clause adds the opposite path — a block that runs only when the condition was False. Between them, execution splits into exactly two routes."],
  ["code","password = 'swordfish1'\nif password == 'swordfish1':\n    print('Access granted')\nelse:\n    print('Access denied')"],
  ["code","Access granted"],
  ["p","elif — else if — chains further conditions onto the same statement. Python checks them top to bottom, runs the block of the first condition that is True, and skips the rest of the chain, including conditions that would also have been True. At most one block in a chain runs; a final else catches the case where none were."],
  ["p","Because the first True wins, the order of an elif chain is logic, not style. Here a 70-year-old is caught by the broad age >= 18 test, and the senior branch below it can never run:"],
  ["code","age = 70\nif age >= 18:\n    print('adult prices apply')\nelif age >= 65:\n    print('senior prices apply')"],
  ["code","adult prices apply"],
  ["p","Swap the two tests and the chain behaves: the specific case has to come before the general one that overlaps it."],
  ["code","age = 70\nif age >= 65:\n    print('senior prices apply')\nelif age >= 18:\n    print('adult prices apply')"],
  ["code","senior prices apply"],
  ["note","An elif chain with no final else silently does nothing when every condition is False. Sometimes that is what you want — but when every input must produce an answer, the missing else is a bug that shows no error. The program just skips the whole statement."]
]},
{ t: "A short program: the ticket window",
  body: [
  ["p","This program uses the whole chapter: comparisons, an elif chain whose order carries the logic, and input() from chapter 1. It quotes a cinema ticket price from an age and a day of the week. Read it line by line and predict what it says for a 30-year-old on a Tuesday."],
  ["code","print('How old are you?')\nage = int(input())\nprint('What day is it?')\nday = input()\nif age < 5:\n    print('You get in free')\nelif age >= 65:\n    print('Senior ticket: $5')\nelif day == 'Tuesday':\n    print('Tuesday special: $6')\nelif age < 18:\n    print('Child ticket: $9')\nelse:\n    print('Adult ticket: $15')"],
  ["p","A run, with the user typing 30 and then Tuesday:"],
  ["code","How old are you?\nWhat day is it?\nTuesday special: $6"],
  ["p","Two more runs. With 70 and Tuesday, the senior price wins even though the Tuesday condition would also have matched — it sits earlier in the chain. With 12 and Friday, the chain falls through to the child price:"],
  ["code","How old are you?\nWhat day is it?\nSenior ticket: $5"],
  ["code","How old are you?\nWhat day is it?\nChild ticket: $9"],
  ["note","As in chapter 1, the graded exercises below hardcode their inputs instead of calling input(), because submissions are graded by running your code non-interactively. The decision logic is exactly the same; only where the values come from differs."]
]},
{ t: "Dissecting the ticket window",
  body: [
  ["p","int(input()) is two calls stacked. input() returns whatever was typed — always as a string — and int() converts it to a number so the age comparisons work. Without the conversion, age < 5 would compare a string to an int, and the ordering operators refuse to guess about mismatched types:"],
  ["code",">>> '30' < 5\nTypeError: '<' not supported between instances of 'str' and 'int'"],
  ["p","The day check is case-sensitive, because string equality is exact. A user who types tuesday gets no discount:"],
  ["code",">>> 'tuesday' == 'Tuesday'\nFalse"],
  ["p","Now trace the 12-and-Friday run the way Python does — each condition in the chain evaluates in turn until one answers True:"],
  ["code",">>> 12 < 5\nFalse\n>>> 12 >= 65\nFalse\n>>> 'Friday' == 'Tuesday'\nFalse\n>>> 12 < 18\nTrue"],
  ["p","That is the whole engine of the program: five paths, one taken, chosen by the first condition to answer True. The order — free before senior, senior before Tuesday, child before adult — is what stops a cheaper band from being shadowed by a broader one: the exact bug from the previous section."]
]},
{ t: "Summary",
  body: [
  ["p","Booleans are the two-value type behind every decision a program makes: comparisons produce them, and, or, and not combine them, and flow control statements act on them. A condition is any expression that evaluates to True or False; a block is the indented code a statement governs. if runs its block or skips it, else supplies the opposite path, and an elif chain runs the first branch whose condition answers True — which makes the order of the chain part of the logic."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises below. The next chapter is loops — while, for, and range() — where programs stop just deciding and start repeating."]
]}
],
questions: [
{ q:"What are the two values of the Boolean type, and how must they be written?",
  a:"True and False — capital first letter, no quotes. Lowercase true raises a NameError, and 'True' in quotes is a string that only looks like a Boolean." },
{ q:"Name the six comparison operators.",
  a:"== equal to, != not equal to, < less than, > greater than, <= less than or equal to, >= greater than or equal to. Every one evaluates to a Boolean." },
{ q:"What is the difference between == and =?",
  a:"== is the comparison operator: it asks whether two values are equal and evaluates to True or False. = is assignment: it stores a value in a variable. Writing = in a condition where you meant == is a syntax error." },
{ q:"Evaluate each of these by hand: (5 > 4) and (3 == 3), then not (6 > 10), then (1 == 1) or (2 == 5).",
  a:"All three are True. Both sides of the and are True; not flips the False of 6 > 10 to True; the or is satisfied by its first side alone." },
{ q:"In one sentence each: when does and evaluate to True, and when does or evaluate to False?",
  a:"and is True only when both sides are True. or is False only when both sides are False." },
{ q:"What is a condition, and where in this chapter have you already met one?",
  a:"A condition is any expression that evaluates to True or False, used where a flow control statement expects one. Every comparison in the chapter — age <= 30, 42 == 42 — becomes a condition the moment it follows if." },
{ q:"How does Python know where a block begins and ends?",
  a:"By indentation. A block begins where the indentation steps in after a colon and ends where it steps back out. Wrong indentation changes which lines the statement governs." },
{ q:"In an if/elif/elif chain, what happens once one condition evaluates to True?",
  a:"That branch's block runs and the rest of the chain is skipped — including later conditions that would also have been True. At most one block in a chain runs." },
{ q:"42 == '42' is False, but 42 == 42.0 is True. Why?",
  a:"An int and a string are different kinds of value, so they are never equal. An int and a float are both numbers, and both are forty-two, so == compares them by numeric value." },
{ q:"A chain tests age >= 18 first and age >= 65 second. What does it print for a 70-year-old, and what is the fix?",
  a:"It prints the adult branch — 70 is also at least 18, and the first True wins, so the senior branch is unreachable. Put the more specific test first: check age >= 65 before age >= 18." }
],
exercises: [
{ c:"conditionals", t:"Three questions, three answers", book:"ch02",
  b:"Given a = 17 and b = 20, print the result of a > b, then of a != b, then of a + 3 == b, each on its own line.",
  o:"False\nTrue\nTrue",
  h:["A comparison is an expression — it evaluates to True or False the same way 2 + 2 evaluates to 4.",
     "You can print a comparison directly: print(a > b) prints the Boolean it evaluates to.",
     "The first line is print(a > b); the other two follow the same shape with != and ==."]},
{ c:"conditionals", t:"The bouncer", book:"ch02",
  b:"Given name = 'Ada' and on_list = True, print 'Come in' when the name is exactly 'Ada' and on_list is True. Print 'Not tonight' in every other case.",
  o:"Come in",
  h:["One if, one else, and a single condition with two requirements.",
     "and joins two tests into one condition. A Boolean variable already is a test — write on_list, not on_list == True.",
     "The condition is name == 'Ada' and on_list; the else prints the refusal."]},
{ c:"conditionals", t:"Greeting by the clock", book:"ch02",
  b:"Given hour = 14 on a 24-hour clock, print 'Good morning' before 12, 'Good afternoon' from 12 up to but not including 18, and 'Good evening' from 18 onward.",
  o:"Good afternoon",
  h:["Three outcomes means if, elif, and else.",
     "Once a condition answers True the rest are skipped — so each test only sees the hours the earlier tests let through.",
     "if hour < 12 handles mornings; after that, the afternoon test only needs hour < 18."]},
{ c:"conditionals", t:"Parcel pricing", book:"ch02",
  b:"Given weight = 7 (kilograms), print 'Price: $4' at 1 kg or under, 'Price: $8' at 5 kg or under, 'Price: $15' at 20 kg or under, and 'Too heavy to ship' above 20.",
  o:"Price: $15",
  h:["An elif ladder, one rung per price band.",
     "Order is the logic: test the smallest band first, or a bigger band will catch parcels that deserved the cheaper price.",
     "weight <= 1 first, then weight <= 5, then weight <= 20, then else for the rest."]}
]
};
