/* Practice Log book — Chapter 4: Functions.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch04 = {
n: 4,
title: "Functions",
src: "https://automatetheboringstuff.com/3e/chapter4.html",
blurb: "Writing your own functions: def, parameters, return values, None, scope, and the try/except net for errors.",
sections: [
{ t: "Creating a function",
  body: [
  ["p","A function is a named block of code that runs when you call it, not when you write it. You have been calling functions since chapter 1 — print(), input(), len() — and this chapter is about defining your own. The def statement names the function; the indented block under it is the body, and Python skips straight past that body until the name is called."],
  ["code","def closing_checklist():\n    print('Lock the till')\n    print('Wipe the counters')\n    print('Flip the sign')\n\nclosing_checklist()\nprint('See you tomorrow')\nclosing_checklist()"],
  ["code","Lock the till\nWipe the counters\nFlip the sign\nSee you tomorrow\nLock the till\nWipe the counters\nFlip the sign"],
  ["p","Trace it the way Python runs it. The def is read first: Python learns the name and moves on without running the body. The first call jumps execution into the body, runs its three lines, and returns to the line after the call. The middle print runs, then the second call repeats the same body — the checklist appears twice because the function was called twice, not written twice."],
  ["p","That is the point of a function: one copy of the code, run as many times as you need. Without it you would paste the three prints everywhere the shop closes, and a change to the checklist would mean hunting down every copy. With it, you edit the body once and every call gets the new version."],
  ["note","Writing closing_checklist without the parentheses names the function without calling it. The line runs, does nothing visible, and raises no error — the checklist just never prints. The parentheses are the call."]
]},
{ t: "Arguments and parameters",
  body: [
  ["p","A call can carry values into the function. The values in the parentheses of the call are arguments; the variable named in the parentheses of the def line is a parameter. When the call happens, the argument is assigned to the parameter, and the body runs with that value in place."],
  ["code","def stamp_card(customer):\n    print('Stamp for ' + customer)\n    print('Nine more for a free drink, ' + customer)\n\nstamp_card('Noor')\nstamp_card('Felix')"],
  ["code","Stamp for Noor\nNine more for a free drink, Noor\nStamp for Felix\nNine more for a free drink, Felix"],
  ["p","The vocabulary is worth pinning down, because the rest of the book leans on it. The def statement defines stamp_card. The line stamp_card('Noor') calls it, passing the string 'Noor'. The value being passed is the argument; customer, the variable that receives it, is the parameter. Same body, different argument, different output — that is what parameters are for."],
  ["p","A parameter is not a normal variable: it exists only while its call is running. When the function returns, the parameter is destroyed. Add print(customer) at the bottom of the program, outside the function, and the program stops with an error — shown here as the final line of the error message:"],
  ["code","def stamp_card(customer):\n    print('Stamp for ' + customer)\n\nstamp_card('Noor')\nprint(customer)"],
  ["code","Stamp for Noor\nNameError: name 'customer' is not defined"],
  ["note","The mistake this error is catching: treating a parameter as if it outlives the call. By the time print(customer) runs, the call is over and customer is gone. If the caller needs the value afterwards, the caller already has it — it passed the argument in."]
]},
{ t: "Return values",
  body: [
  ["p","A function call is an expression: the whole call evaluates down to a single value, the same way 2 + 2 evaluates to 4. len('espresso') evaluates to 8. The value a call evaluates to is its return value, and because a call is a value, it can be stored, combined, or passed straight into another call."],
  ["code",">>> len('espresso')\n8\n>>> size = len('espresso')\n>>> size + 1\n9"],
  ["p","In your own functions, the return statement chooses that value: the return keyword followed by an expression. The moment execution reaches a return, the function ends and the call becomes that value — any lines below the return are skipped."],
  ["code","def day_type(day):\n    if day == 'Saturday' or day == 'Sunday':\n        return 'weekend'\n    else:\n        return 'weekday'\n\nkind = day_type('Sunday')\nprint('Sunday is a ' + kind)\nprint('Monday is a ' + day_type('Monday'))"],
  ["code","Sunday is a weekend\nMonday is a weekday"],
  ["p","The two print lines use the return value two ways. The first stores it in kind and concatenates the variable. The second skips the variable and drops the call directly into the concatenation — legal because day_type('Monday') already is the string 'weekday' by the time + needs it."],
  ["note","A function that prints its answer instead of returning it looks identical when you run it once. The difference appears the moment you try to store or combine the result — printing puts text on the screen and hands nothing back. Which is the next section."]
]},
{ t: "None and named parameters",
  body: [
  ["p","Python has a value that means no value: None, the only value of the NoneType data type, always spelled with a capital N. Every function call evaluates to something, so a function that never reaches a return statement evaluates to None. A bare return with no expression does the same. print() is the everyday example — it puts text on the screen, but the call itself returns None."],
  ["code",">>> receipt = print('paid')\npaid\n>>> receipt\n>>> print(receipt)\nNone\n>>> receipt == None\nTrue\n>>> type(receipt)\n<class 'NoneType'>"],
  ["p","Read that shell session carefully. The assignment line still prints paid — that is print doing its screen work — while None travels into receipt. Then the bare receipt line shows nothing at all: the interactive shell suppresses a result of None instead of echoing it. print(receipt) forces it into view, because print writes the text form of whatever it is given."],
  ["p","Arguments so far have been matched to parameters by position: first argument to first parameter. Some functions also take named parameters, matched by the name written in the call. print() has two useful ones — sep sets what goes between multiple values, and end replaces the newline it normally adds at the end."],
  ["code",">>> print('2026', '07', '23', sep='-')\n2026-07-23"],
  ["code","for number in range(3, 0, -1):\n    print(number, end=' ')\nprint('liftoff')"],
  ["code","3 2 1 liftoff"],
  ["p","Without end=' ', that loop would stack the countdown down the screen, one number per line. With it, each print ends in a space instead of a newline, so the next print continues the same line, and the final print('liftoff') closes it with the normal newline."],
  ["code",">>> print('a', 'b', '-')\na b -\n>>> print('a', 'b', sep='-')\na-b"],
  ["note","sep and end only work by name. Passing '-' as a plain third argument does not make it a separator — print treats it as one more value to display, as the first shell line above shows. Forgetting the sep= is the whole difference between the two lines."]
]},
{ t: "The call stack",
  body: [
  ["p","Functions call other functions, so execution is often several calls deep. Python keeps the order straight with the call stack: every call pushes a frame that records where execution must come back to, and every return pops the top frame and resumes there. The frame on top always belongs to the function running right now."],
  ["code","def make_breakfast():\n    print('make_breakfast starts')\n    toast_bread()\n    brew_coffee()\n    print('make_breakfast ends')\n\ndef toast_bread():\n    print('toast_bread starts')\n    print('toast_bread ends')\n\ndef brew_coffee():\n    print('brew_coffee starts')\n    grind_beans()\n    print('brew_coffee ends')\n\ndef grind_beans():\n    print('grind_beans starts')\n    print('grind_beans ends')\n\nmake_breakfast()"],
  ["code","make_breakfast starts\ntoast_bread starts\ntoast_bread ends\nbrew_coffee starts\ngrind_beans starts\ngrind_beans ends\nbrew_coffee ends\nmake_breakfast ends"],
  ["p","Match each ends line to its starts line and the nesting appears. make_breakfast calls toast_bread, which finishes before brew_coffee begins. brew_coffee then calls grind_beans, so grind_beans must end before brew_coffee can — its frame sits on top of brew_coffee's, and the stack only comes off from the top. When make_breakfast finally returns, the stack is empty and execution is back at the top level of the program."],
  ["p","You never manage this memory yourself; Python maintains the stack behind the scenes. It matters here because it explains the output order above, and it matters in the next section because every frame gets its own private set of variables."]
]},
{ t: "Local and global scopes",
  body: [
  ["p","A variable assigned inside a function lives in that call's local scope — created when the call starts, destroyed when it returns. A variable assigned outside all functions lives in the global scope, which lasts as long as the program. Parameters are local variables; that is why customer vanished in the arguments section. The same rule covers any variable a function assigns:"],
  ["code","def measure():\n    reading = 72\n\nmeasure()\nprint(reading)"],
  ["code","NameError: name 'reading' is not defined"],
  ["p","The traffic rules between the two scopes are short. Code in the global scope cannot use local variables — they do not exist once the call ends, as the error above shows. Code inside a function, though, can read a global variable it never assigns:"],
  ["code","def show_price():\n    print(price)\n\nprice = 3.5\nshow_price()"],
  ["code","3.5"],
  ["p","Assignment is where the trap is. Assigning to a name inside a function creates a local variable, even when a global variable already has that name — the function is writing on its own scratchpad, and the global is untouched:"],
  ["code","def reset_total():\n    total = 0\n    print(total)\n\ntotal = 500\nreset_total()\nprint(total)"],
  ["code","0\n500"],
  ["p","When a function genuinely must assign to the global, it says so with the global statement. Declaring global score at the top of the function tells Python that score in this function means the global one — so no local is created and the assignment lands outside:"],
  ["code","def add_points():\n    global score\n    score = score + 10\n\nscore = 0\nadd_points()\nadd_points()\nprint(score)"],
  ["code","20"],
  ["p","One error ties the rules together. If a function assigns a name anywhere in its body, Python treats that name as local for the whole function — including lines above the assignment. Reading it before the assignment is then an error, and Python will not quietly fall back to the global:"],
  ["code","def update_score():\n    print(score)\n    score = score + 1\n\nscore = 3\nupdate_score()"],
  ["code","UnboundLocalError: cannot access local variable 'score' where it is not associated with a value"],
  ["note","The mistake behind that error: meaning the global on the print line while assigning the same name below it. The fix is to pick one — pass the value in as a parameter and return the new one, or declare global at the top. Relying on globals gets harder to debug as programs grow; parameters and return values keep each function's effect on the rest of the program narrow."]
]},
{ t: "Handling errors with try and except",
  body: [
  ["p","Until now, an error has meant the whole program stops. This bill splitter divides a restaurant bill and dies partway through the batch — the third call divides by zero, and the fourth never runs:"],
  ["code","def per_person(bill, people):\n    return bill / people\n\nprint(per_person(60, 4))\nprint(per_person(60, 0))\nprint(per_person(60, 3))"],
  ["code","15.0\nZeroDivisionError: division by zero"],
  ["p","try and except let a program survive an expected error. The risky code goes in the try clause; when the named error is raised there, execution jumps to the except clause, runs it, and the program continues instead of crashing:"],
  ["code","def per_person(bill, people):\n    try:\n        return bill / people\n    except ZeroDivisionError:\n        print('Cannot split by zero')\n\nprint(per_person(60, 4))\nprint(per_person(60, 0))\nprint(per_person(60, 3))"],
  ["code","15.0\nCannot split by zero\nNone\n20.0"],
  ["p","The None in that output is the last section paying off. On the zero call, the except clause prints its message and the function ends without reaching a return — so the call evaluates to None, and the outer print displays it. The batch then carries on: the 60 and 3 call still produces 20.0."],
  ["p","Where you put the try matters. Catching around the calls instead of inside the function also stops the crash, but execution never jumps back into a try clause once it has left — the rest of the batch is abandoned:"],
  ["code","def per_person(bill, people):\n    return bill / people\n\ntry:\n    print(per_person(60, 4))\n    print(per_person(60, 0))\n    print(per_person(60, 3))\nexcept ZeroDivisionError:\n    print('Cannot split by zero')"],
  ["code","15.0\nCannot split by zero"],
  ["note","The 60 and 3 call silently disappearing is the mistake to watch for: a try wrapped around a whole batch turns one bad item into a lost batch. Catch inside the function when the other calls should survive; catch outside when one failure should end the run."]
]},
{ t: "A short program: the running log",
  body: [
  ["p","This program uses the whole chapter: two functions, parameters, return values, an implicit None, and a try clause. It reports the pace of three training runs in minutes per kilometre, and one of the entries is bad data — a run logged with a distance of zero."],
  ["code","def pace(minutes, distance_km):\n    try:\n        return minutes / distance_km\n    except ZeroDivisionError:\n        print('Distance cannot be zero')\n\ndef report(day, minutes, distance_km):\n    result = pace(minutes, distance_km)\n    if result == None:\n        print(day + ': no valid pace')\n    else:\n        print(day + ': ' + str(result) + ' min per km')\n\nreport('Monday', 30, 5)\nreport('Wednesday', 24, 0)\nreport('Friday', 27, 6)"],
  ["code","Monday: 6.0 min per km\nDistance cannot be zero\nWednesday: no valid pace\nFriday: 4.5 min per km"],
  ["p","Trace the Wednesday call with the call stack in mind. report is called and its frame goes on the stack; report calls pace, stacking a second frame. Inside pace, 24 / 0 raises ZeroDivisionError, the except clause prints the complaint, and the function falls off its end — returning None. pace's frame pops, and back in report, result == None is True, so the no valid pace line prints. Two frames up, two frames down, no crash."],
  ["p","Notice what report does not know: how pace handles bad data, or that a try clause is involved at all. It only sees the return value — a number or None — and decides from that. Each function showing the rest of the program nothing but its parameters and its return value is what keeps a growing program traceable. The str(result) conversion is chapter 1 doing quiet work: + will not concatenate a float onto a string without it."]
]},
{ t: "Summary",
  body: [
  ["p","def creates a function; calling it runs the body with the arguments assigned to the parameters. A call is an expression that evaluates to the function's return value, and a function that never reaches a return evaluates to None. Arguments are matched by position unless passed by name, the way print() takes sep and end. The call stack tracks where every call must return to, and each call's variables live in a local scope that dies at return — assignment inside a function makes a local unless a global statement says otherwise. try and except catch a named error and let the program continue."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises below. The next chapter is debugging — what tracebacks are actually telling you, and how to find the line where a program goes wrong."]
]}
],
questions: [
{ q:"A program contains a def statement but never calls the function. What does the body print when the program runs?",
  a:"Nothing. def only creates the function — Python reads the name and skips the body. The body runs when the function is called, once per call." },
{ q:"In stamp_card('Noor') calling def stamp_card(customer), which is the argument, which is the parameter, and how long does the parameter live?",
  a:"'Noor' is the argument — the value passed in the call. customer is the parameter — the variable that receives it. It exists only while the call runs; using it after the function returns raises NameError." },
{ q:"What does a call to a function with no return statement evaluate to?",
  a:"None. Falling off the end of a function returns None, and a bare return with no expression does the same. Every call evaluates to something." },
{ q:"Inside a function, what is the difference between print(result) and return result?",
  a:"print displays the value and hands nothing back, so the call still evaluates to None. return makes the call itself evaluate to the value, so the caller can store it or use it in an expression. A function that only prints cannot have its answer reused." },
{ q:"At the interactive shell, entering receipt shows nothing when receipt is None, but print(receipt) shows None. Why the difference?",
  a:"The shell suppresses a bare expression result of None instead of echoing it. print always writes the text form of its argument, so it displays None explicitly." },
{ q:"What does print('a', 'b') put between the two values and at the end, and how do you change each?",
  a:"A single space between and a newline at the end, printing a b. The sep named parameter replaces the space and end replaces the newline — both must be passed by name, or the value is just printed as one more item." },
{ q:"In the breakfast program, grind_beans finishes. How does Python know execution continues inside brew_coffee and not somewhere else?",
  a:"The call stack. Each call pushes a frame recording where to return; grind_beans's frame sits on top of brew_coffee's, so when it pops, execution resumes right after the grind_beans() call line. The top frame is always the currently running function." },
{ q:"A global total holds 500 and a function runs total = 0 with no global statement. What happens to the global?",
  a:"Nothing. Assignment inside a function creates a local variable that merely shares the name. The local prints as 0 inside the call and dies at return; the global still holds 500." },
{ q:"When do you need the global statement — to assign to a global inside a function, to read one, or both?",
  a:"Only to assign. A function can read a global it never assigns with no declaration at all. Without the global statement, an assignment quietly creates a local instead of changing the global." },
{ q:"per_person catches ZeroDivisionError and prints a message. Why does print(per_person(60, 0)) print None afterwards?",
  a:"The except clause prints the message but never reaches a return, so the function returns None, and the outer print displays it. The message comes from inside the function; the None is its return value." }
],
exercises: [
{ c:"functions", t:"Two tickets", book:"ch04",
  b:"Define a function ticket(name) that prints 'Ticket for ' followed by the name. Call it once with 'Iris' and once with 'Hugo'.",
  o:"Ticket for Iris\nTicket for Hugo",
  h:["A def statement only creates the function — nothing prints until you call it with parentheses.",
     "The parameter receives whatever string the call passes in; concatenate it after 'Ticket for ' with +.",
     "def ticket(name): with one print inside, then two calls at the left margin, each passing one of the names."]},
{ c:"functions", t:"Return, then reuse", book:"ch04",
  b:"Define a function double(n) that returns n * 2. Print double(7), then print double(double(5)).",
  o:"14\n20",
  h:["return hands a value back to wherever the call happened — nothing prints until the caller prints it.",
     "A call is an expression, so it can sit inside print() or inside another call's parentheses.",
     "The body is a single return line. The second print passes double(5) as the argument to another double call — inner call first, 5 becomes 10, then 10 becomes 20."]},
{ c:"functions", t:"Pass or fail", book:"ch04",
  b:"Define a function grade(score) that returns 'pass' when score is at least 50 and 'fail' otherwise. Print grade(72), then grade(50), then grade(31), each on its own line.",
  o:"pass\npass\nfail",
  h:["Two outcomes from one number: the function decides with if and else, and returns a string either way.",
     "At least 50 is score >= 50 — which makes 50 itself a pass. Each branch needs its own return.",
     "if score >= 50: return 'pass', and the else branch returns the other string. Then three print(grade(...)) lines."]},
{ c:"functions", t:"Split the bill", book:"ch04",
  b:"Define a function split_bill(total, people) that returns total / people, with the division inside a try clause. When ZeroDivisionError is raised, the except clause should print 'No diners' instead. Print split_bill(80, 4), then print split_bill(80, 0).",
  o:"20.0\nNo diners\nNone",
  h:["The division goes in the try clause; the except clause names ZeroDivisionError and prints the message.",
     "A function that ends without reaching a return evaluates to None — that is why the second call still prints a third line.",
     "Inside the function: try with return total / people, except ZeroDivisionError with the print. Outside, wrap both calls in print()."]}
]
};
