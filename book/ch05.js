/* Practice Log book — Chapter 5: Debugging.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch05 = {
n: 5,
title: "Debugging",
src: "https://automatetheboringstuff.com/3e/chapter5.html",
blurb: "Exceptions on purpose, assertions, log messages, and the debugger — finding bugs by evidence instead of staring.",
sections: [
{ t: "Raising exceptions",
  body: [
  ["p","An exception is how a Python program announces that something has gone wrong enough to stop. You have been on the receiving end since chapter 1 — dividing by zero raises one, and so does handing int() a word it cannot convert. Python raises these on its own; the raise statement lets your code do the same on purpose."],
  ["code",">>> int('forty')\nValueError: invalid literal for int() with base 10: 'forty'"],
  ["p","raise is followed by an exception value, usually built by calling an exception type with a message string. The moment a raise runs, the function stops and the exception travels back up through whoever called it, looking for a try/except to catch it. When nothing does, the program ends and the message is printed."],
  ["code",">>> raise Exception('the beans are gone')\nException: the beans are gone"],
  ["p","The point of raising is to refuse a bad situation early, at the moment your code can still name what is wrong. This function guards an oven: values it cannot serve are rejected with a message, and only sound ones reach the print."],
  ["code","def set_oven(temp):\n    if temp < 50:\n        raise Exception('too cold to bake: ' + str(temp))\n    if temp > 250:\n        raise Exception('oven only goes to 250')\n    print('oven set to ' + str(temp))\n\nset_oven(180)"],
  ["code","oven set to 180"],
  ["p","The caller decides what a failure means. try and except arrived with functions in chapter 4, catching the exceptions Python raises; they catch yours exactly the same way, and str(e) recovers the message the raise packed in."],
  ["code","try:\n    set_oven(300)\nexcept Exception as e:\n    print('could not bake: ' + str(e))"],
  ["code","could not bake: oven only goes to 250"],
  ["note","Raising the generic Exception works, but except Exception catches nearly everything — including errors you never anticipated, which then get mislabelled as the one you did. When a bad value is the problem, raise the specific ValueError and catch exactly that."]
]},
{ t: "Reading a traceback",
  body: [
  ["p","When nothing catches an exception, Python prints a traceback — a report of the crash and the chain of calls that led to it. It reads as noise the first dozen times, but it has a fixed shape, and it names the exact line to look at. Here is a small file with a bug, saved as wrong.py:"],
  ["code","def divide(total, count):\n    return total / count\n\ndef average(total, count):\n    return divide(total, count)\n\nprint(average(12, 0))"],
  ["p","Running it crashes, and Python prints this:"],
  ["code","Traceback (most recent call last):\n  File \"wrong.py\", line 7, in <module>\n  File \"wrong.py\", line 5, in average\n  File \"wrong.py\", line 2, in divide\nZeroDivisionError: division by zero"],
  ["p","Read it from the bottom. The last line is the headline — the exception's type and message. The File entry directly above it is where the error actually happened: line 2, inside divide. The entries above that answer how execution got there: line 7 called average, average's line 5 called divide. That is what the header means by most recent call last — the call that blew up is printed last, not first."],
  ["note","The mistake is trusting the top of a traceback: the top entry is just your outermost call, which is usually fine. Start at the last line, then the File entry above it, and only then walk upward. A terminal also prints each line of source code under its File entry — trimmed here for space."]
]},
{ t: "Assertions",
  body: [
  ["p","An assert statement is a tripwire for states that should be impossible. It takes a condition, then optionally a comma and a message. While the condition is True, the statement does nothing at all. The moment it is False, Python raises AssertionError carrying your message."],
  ["code",">>> speed = 900\n>>> assert speed <= 120, 'speed reading is impossible: ' + str(speed)\nAssertionError: speed reading is impossible: 900"],
  ["p","The passing case makes no sound. This program asserts something that must hold if the arithmetic above it is right — and because it holds, execution walks straight past the assert to the print:"],
  ["code","distance = 42.0\nhours = 1.5\npace = distance / hours\nassert pace > 0, 'pace must be positive'\nprint('average speed: ' + str(pace))"],
  ["code","average speed: 28.0"],
  ["p","The division of labour: raise is for problems you expect the world to hand you — bad data, a value out of range — and callers may catch them and recover. assert is for problems only a programming mistake can cause. A failing assert means the code itself is wrong, so it should crash loudly and close to the mistake, not be caught with try/except and limped past."],
  ["note","Python run with the -O switch strips every assert from the program, so using assert to validate user input means the validation can silently vanish. Checks the program needs at run time are an if plus raise; assert is a development-time safety net."]
]},
{ t: "The logging module",
  body: [
  ["p","The blunt way to watch a program run is to scatter print() calls through it. That works, and it charges you later: once the bug is fixed, every diagnostic print has to be hunted down and deleted by hand, and sooner or later you delete one that was real output. The logging module is the same idea with an off switch."],
  ["p","Two lines at the top of a program switch it on. logging.basicConfig() sets the least important level that will be shown and the shape of each line; logging.debug() then records a message wherever you want eyes. The format used here stamps every line with its level, so diagnostics cannot be mistaken for output:"],
  ["code","import logging\nlogging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')\nlogging.debug('program started')\nanswer = 6 * 7\nlogging.debug('answer computed: ' + str(answer))\nprint(answer)"],
  ["code","DEBUG - program started\nDEBUG - answer computed: 42\n42"],
  ["p","The DEBUG lines are the program narrating what it is doing at the moment it does it; the bare 42 at the end is the program's actual output, from print. Log messages carry a level, they can be filtered or silenced in one line without touching the calls, and they can be routed to a file — the next two sections use all three."],
  ["note","Log lines go to the error stream rather than standard output, so both land on your screen together but they are not the same stream. And basicConfig must run before the first logging call: a logging.warning() fired earlier locks in the default configuration, and your format line is silently ignored."]
]},
{ t: "A bug hunt with log messages",
  body: [
  ["p","Here is the technique on a real bug. stair_total(n) is meant to add the numbers 1 through n — a staircase of four steps should total 1 + 2 + 3 + 4, which is 10. It returns 6. The function already carries a log line inside its loop, so the evidence is on screen:"],
  ["code","import logging\nlogging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')\n\ndef stair_total(n):\n    total = 0\n    for step in range(n):\n        total = total + step\n        logging.debug('step ' + str(step) + ', total ' + str(total))\n    return total\n\nprint(stair_total(4))"],
  ["code","DEBUG - step 0, total 0\nDEBUG - step 1, total 1\nDEBUG - step 2, total 3\nDEBUG - step 3, total 6\n6"],
  ["p","The log convicts the loop at a glance: it started at a step 0 that nobody climbs, and it never reached step 4. That is how range counts — range(n) runs from 0 and stops before n — so the staircase needs range(1, n + 1). Same program, one changed line:"],
  ["code","def stair_total(n):\n    total = 0\n    for step in range(1, n + 1):\n        total = total + step\n        logging.debug('step ' + str(step) + ', total ' + str(total))\n    return total\n\nprint(stair_total(4))"],
  ["code","DEBUG - step 1, total 1\nDEBUG - step 2, total 3\nDEBUG - step 3, total 6\nDEBUG - step 4, total 10\n10"],
  ["p","Without the log lines, all you know is that 6 is wrong. With them, you watch the wrong values happen in order — which step, which running total — and the bug names itself. Write log messages as evidence for your future self: state what value you expected and what the program is actually holding."]
]},
{ t: "Levels, logfiles, and the off switch",
  body: [
  ["p","Every log call carries a level of importance. There are five, least to most serious: DEBUG for fine detail, INFO for confirmation that things are working, WARNING for something odd that has not broken anything yet, ERROR for an operation that failed, and CRITICAL for a failure the program cannot survive. Each has its own function, logging.debug() up to logging.critical()."],
  ["p","The level handed to basicConfig is a threshold: messages below it are dropped before they reach the screen. Set to WARNING, this till program keeps only its three most serious lines:"],
  ["code","import logging\nlogging.basicConfig(level=logging.WARNING, format='%(levelname)s - %(message)s')\nlogging.debug('checking the till float')\nlogging.info('shift started')\nlogging.warning('till is low on change')\nlogging.error('till drawer is stuck')\nlogging.critical('till is missing')"],
  ["code","WARNING - till is low on change\nERROR - till drawer is stuck\nCRITICAL - till is missing"],
  ["p","When the bug is dead, one line silences everything. logging.disable() takes a level and suppresses every message at that level and below — pass CRITICAL, the top, and nothing gets through. The calls stay in the file, ready for the next hunt. This program prints nothing at all; add the same disable line under basicConfig in the staircase program and its output shrinks to the plain 10."],
  ["code","import logging\nlogging.basicConfig(level=logging.DEBUG, format='%(levelname)s - %(message)s')\nlogging.disable(logging.CRITICAL)\nlogging.debug('checking the till float')\nlogging.critical('till is missing')"],
  ["p","The other escape from clutter is to send messages to a file instead of the screen. Give basicConfig a filename and the screen stays clean while the full record accumulates where you can read it after the run:"],
  ["code","import logging\nlogging.basicConfig(filename='cafe_log.txt', level=logging.DEBUG, format='%(levelname)s - %(message)s')\nlogging.debug('opening stock counted')\nlogging.warning('milk is past its date')"],
  ["p","Running that shows nothing on screen; cafe_log.txt now holds both lines, DEBUG - opening stock counted and WARNING - milk is past its date. A logfile keeps diagnostics out of the program's real output and survives after the window is closed."],
  ["note","To switch everything off, the level you pass to logging.disable() is CRITICAL. Passing logging.disable(logging.DEBUG) is the mistake — that suppresses DEBUG and below, which is only DEBUG, and the other four levels keep printing."]
]},
{ t: "Breakpoints and stepping",
  body: [
  ["p","Some bugs never raise anything. This program is meant to add two prices that arrived as text — values read from a file or typed into input() are always strings, simulated here the hardcoded way as usual. It runs without complaint, and the answer is wrong:"],
  ["code","first = '4'\nsecond = '12'\ntotal = first + second\nprint('total cost: ' + total)"],
  ["code","total cost: 412"],
  ["p","Between strings, + means join, so '4' + '12' is '412' — legal, silent, wrong. A debugger is the tool for exactly this. It runs the program under a microscope, pausing before each line so you can inspect what every variable holds right now; watching total become the string '412', quotes visible in the variable pane, catches what a read-through misses, because the source looks like addition. The fix is to convert before adding — int(first) + int(second) makes the total 16."],
  ["p","The book this course follows demonstrates the Mu editor's debugger; IDLE, VS Code, and the browser's devtools ship the same five controls under the same names. Continue runs at full speed until the next pause. Step In executes the current line and, when it calls a function, moves the pause to that function's first line. Step Over runs the whole call at full speed and pauses on the next line of the current function. Step Out finishes the current function and pauses back in its caller; Stop abandons the run."],
  ["p","Stepping through every line stops being viable the moment a loop runs a thousand times. A breakpoint marks a line: the program runs at full speed and pauses only when it reaches that line, variables inspectable each time. In this counter, a breakpoint on the count line pauses only on the 142 turns where the if fired, skipping the other 858:"],
  ["code","count = 0\nfor n in range(1, 1001):\n    if n % 7 == 0:\n        count = count + 1\nprint('multiples of seven: ' + str(count))"],
  ["code","multiples of seven: 142"],
  ["note","The temptation in a paused debugger is to lean on Step In for everything, which drags you line by line into functions you trust — including Python's own. Step Over the calls you believe in, Step In only to the one you suspect, and when the suspect line sits deep inside a loop, set a breakpoint on it instead of stepping your way there."]
]},
{ t: "Summary",
  body: [
  ["p","Debugging is evidence-gathering. raise turns a bad situation into an exception at the moment your code can still name it, and try/except lets the caller decide what the failure means. assert is a tripwire for states only a programming mistake can produce — it should crash near the mistake, never be caught, and never stand in for real validation. A traceback is read from the bottom: the last line is the what, the File entries above it are the where and the how."],
  ["p","Log messages are print debugging with an off switch: five levels from DEBUG to CRITICAL, a basicConfig threshold that filters them, one logging.disable(logging.CRITICAL) line that silences the lot, and a filename that routes them off the screen entirely. A debugger slows the program to one line at a time — Continue, Step In, Step Over, Step Out — and a breakpoint pauses a full-speed run exactly where you need eyes."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises below. The next chapter is lists — Python's first container type, where one variable holds a whole sequence of values and the real data work begins."]
]}
],
questions: [
{ q:"A raise statement runs and nothing catches the exception. What happens to the program?",
  a:"It stops on the spot and prints a traceback whose last line names the type and message — raise Exception('the beans are gone') ends with Exception: the beans are gone. The lines after the raise never run." },
{ q:"Where in a traceback is the line that actually failed, and what does the header's most recent call last mean?",
  a:"At the bottom: the last line gives the exception's type and message, and the File entry directly above it is the line that raised. Calls are printed outermost first, so the most recent one — the call that blew up — comes last." },
{ q:"When is raise the right tool, and when is assert?",
  a:"raise is for situations you expect the world to produce — bad data, a value out of range — and callers may catch it with try/except and recover. assert is a tripwire for states only a programming mistake can cause: a failure means fix the code, so it should crash and never be caught." },
{ q:"pay is 90.0 and the program runs assert pay >= 0, 'pay went negative'. What happens? And when pay is -5?",
  a:"At 90.0 the condition is True, so the statement does nothing and execution continues. At -5 it raises AssertionError: pay went negative and the program stops." },
{ q:"first = '4' and second = '12'. What does first + second evaluate to, and why is there no traceback?",
  a:"'412'. Between strings + means join, which is perfectly legal — so the program is wrong without ever raising. Silent bugs like this are what debuggers and log messages exist to catch." },
{ q:"Name the five logging levels, least to most serious.",
  a:"DEBUG, INFO, WARNING, ERROR, CRITICAL — each with a matching function from logging.debug() to logging.critical(). The level passed to basicConfig is the least serious one that will be shown." },
{ q:"basicConfig was given level=logging.WARNING. Which of the five logging calls produce output?",
  a:"warning, error, and critical. The level is a threshold — debug and info sit below it and are dropped before they reach the screen." },
{ q:"One added line must silence every log message without deleting any calls. What is it?",
  a:"logging.disable(logging.CRITICAL). It suppresses messages at that level and below, and CRITICAL is the top, so nothing gets through — while every logging call stays in the file for the next hunt." },
{ q:"Why are logging.debug() calls better diagnostics than print() calls?",
  a:"They switch off in one line instead of being hunted down and deleted one at a time — and deleting prints risks removing one that was real output. They also carry levels for filtering, a format that labels them, and they can be routed to a logfile." },
{ q:"In a paused debugger, what do Step In and Step Over each do, and what does a breakpoint add?",
  a:"Both execute the current line — Step In follows a function call to its first line and pauses there; Step Over runs the whole call at full speed and pauses on the next line of the current function. A breakpoint lets the program run at full speed and pauses it every time a marked line is reached." }
],
exercises: [
{ c:"error handling", t:"The width gate", book:"ch05",
  b:"Define check_width(cm) that raises ValueError with the message 'width out of range' when cm is less than 1 or greater than 300, and otherwise prints 'width accepted'. Call check_width(120), then call check_width(450) inside a try/except ValueError block that prints 'rejected: ' plus the error's message.",
  o:"width accepted\nrejected: width out of range",
  h:["Two jobs: the function raises at the moment it sees a bad value; the caller decides what the failure means.",
     "raise ValueError('width out of range') fires inside the if; except ValueError as e catches it, and str(e) recovers the message.",
     "In the function: if cm < 1 or cm > 300: raise ValueError(...) — otherwise print. The second call sits under try:, and the except line prints 'rejected: ' + str(e)."]},
{ c:"error handling", t:"Tolerant converter", book:"ch05",
  b:"Define to_int(text) that returns int(text), but returns 0 when the conversion raises ValueError. With a = '42' and b = 'forty', print to_int(a) + to_int(b).",
  o:"42",
  h:["int() on a word raises an exception — this function should treat that as an answer, not a crash.",
     "Put the int(text) attempt in a try block and return the fallback from the except ValueError block.",
     "try: return int(text), and the except ValueError branch returns the fallback instead. Then print the two calls added together."]},
{ c:"error handling", t:"The payroll tripwire", book:"ch05",
  b:"Given hours = 7.5 and rate = 12, compute pay = hours * rate. Add an assert that fails with the message 'pay went negative' if pay is ever below 0, then print 'pay: ' plus str(pay).",
  o:"pay: 90.0",
  h:["A tripwire for an impossible state: when the condition holds, the program carries straight on to the print.",
     "assert takes a condition, a comma, and a message; it raises AssertionError only when the condition is False.",
     "The tripwire is assert pay >= 0, followed by the message string — then print 'pay: ' + str(pay)."]},
{ c:"error handling", t:"Sum with a guard", book:"ch05",
  b:"Define total_to(n) that raises ValueError with the message 'n must be at least 1' when n is less than 1, and otherwise uses a loop to return the sum of 1 through n. Print total_to(5), then call total_to(0) inside a try/except ValueError block that prints 'error: ' plus the error's message.",
  o:"15\nerror: n must be at least 1",
  h:["Guard first, work second: reject the bad n before the loop starts.",
     "The guard is if n < 1: raise ValueError(...). The loop is an accumulator over range(1, n + 1).",
     "After the guard: total = 0, then for step in range(1, n + 1): add step onto total, and return it. The second call sits in try/except ValueError as e printing 'error: ' + str(e)."]}
]
};
