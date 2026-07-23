/* Practice Log book — Chapter 19: Keeping Time, Scheduling Tasks, and Launching Programs.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch19 = {
n: 19,
title: "Keeping Time, Scheduling Tasks, and Launching Programs",
src: "https://automatetheboringstuff.com/3e/chapter19.html",
blurb: "Epoch timestamps, datetime arithmetic, and the subprocess calls that let one program run another.",
sections: [
{ t: "The Unix epoch and time.time()",
  body: [
  ["p","Every machine your code runs on keeps a clock, and Python reads it through the time module. To make clock readings comparable, programming settled on one shared reference moment: the Unix epoch, midnight on January 1, 1970, UTC. time.time() returns the number of seconds between that moment and right now, as a float called an epoch timestamp."],
  ["code",">>> import time\n>>> time.time()"],
  ["p","No output is printed above, on purpose: the value is the moment you run it, so any number this page claimed would be wrong on your machine. What you will see is a float — past 1.78 billion by mid-2026 — and a slightly bigger one every time you call it. time.ctime() reads the same clock and returns it as a short readable string instead: weekday, month, day, clock time, year."],
  ["p","A timestamp on its own is just a large number. Timestamps earn their keep in pairs: call time.time() before a piece of code and again after, subtract, and the difference is how many seconds the code took. That technique is called profiling, and it needs no equipment beyond the clock you already have."],
  ["code","import time\nstart = time.time()\ntotal = 0\nfor n in range(1, 1000001):\n    total = total + n * n\nfinish = time.time()\nprint('sum of the first million squares:', total)\nprint('seconds:', round(finish - start, 3))"],
  ["p","One run printed:"],
  ["code","sum of the first million squares: 333333833333500000\nseconds: 0.096"],
  ["p","Read the two lines differently. The sum is arithmetic — every machine that runs this program prints 333333833333500000. The seconds line belongs to that one run on that one laptop; your machine will print its own figure. The elapsed float arrives with a dozen noisy digits, which is why the program passes it through round()."],
  ["code",">>> round(87.276451, 2)\n87.28\n>>> round(87.276451)\n87\n>>> round(3.10, 2)\n3.1"],
  ["p","round(value, 2) keeps two digits after the decimal point; round(value) with no second argument returns the nearest whole number. The last line is not a mistake: 3.10 and 3.1 are the same float, and Python always displays a float without trailing zeros, so there was nothing for round() to trim."],
  ["note","Two parts of this chapter never run inside this app. The in-app Python is Pyodide, running in your browser: it cannot launch other programs (subprocess does not work there) and it has no cron or any other scheduler to hand work to. time and datetime work fine here, and the graded exercises below stay inside them. The launching and scheduling sections show desktop code and claim no output — run those on your own computer."]
]},
{ t: "Pausing with time.sleep()",
  body: [
  ["p","time.sleep(n) stops the program for n seconds — a float is fine, so time.sleep(0.2) is a fifth of a second. It blocks: nothing after it runs until the pause ends. Sleeping inside a loop paces the loop."],
  ["code","import time\nfor step in ['ready', 'steady', 'go']:\n    print(step)\n    time.sleep(0.2)"],
  ["code","ready\nsteady\ngo"],
  ["p","The three words appear one at a time with a 0.2-second gap between them. Notice what sleep does and does not touch: it decides when each line appears, never what the lines say, so the output text is fixed even though the timing is real. The pause itself is a promise of at least, not exactly — the operating system wakes your program at the requested moment or a whisker after, so never build logic that needs sleep to be precise."],
  ["p","Here is a program that uses the whole toolkit so far. You practise in short drills; this times each one. The first Enter starts the clock, every Enter after that ends a drill and prints how long it took, and Ctrl-C ends the session. Pressing Ctrl-C raises a KeyboardInterrupt exception, so the loop sits inside try so the except clause can end things tidily instead of crashing. Like chapter 2's ticket window, this one is for your desktop shell — grading in this app is non-interactive, so no graded exercise will ever call input() or sleep()."],
  ["code","import time\nprint('Enter starts the first drill and ends each one. Ctrl-C quits.')\ninput()\nsession_start = time.time()\ndrill_start = session_start\ndrill_number = 1\ntry:\n    while True:\n        input()\n        now = time.time()\n        print('drill', drill_number, 'took', round(now - drill_start, 2), 'seconds')\n        drill_start = now\n        drill_number = drill_number + 1\nexcept KeyboardInterrupt:\n    print()\n    print('session over after', round(time.time() - session_start, 2), 'seconds')"],
  ["p","No output is claimed for this one — every number it prints is your own timing. A session looks like a drill line per Enter press, each with its rounded duration, and then the session total when Ctrl-C lands. The whole program is two timestamps per drill and a subtraction, wrapped in a loop."],
  ["note","The mistake with sleep is forgetting that it holds the entire program hostage. A time.sleep(300) means five minutes in which your program prints nothing, reads nothing, and reacts to nothing. Fine in a script whose only job is to wait; wrong anywhere something else should be happening. Long waits usually belong to the scheduling section at the end of this chapter, not to sleep."]
]},
{ t: "A moment in time: datetime",
  body: [
  ["p","An epoch timestamp is one number — good for subtracting, silent about calendars. Asking what month a timestamp falls in, or what the date is ninety days later, means calendar work, and that is the datetime module's job. Its datetime type stores a moment as parts you can read: year, month, day, hour, minute, second, microsecond."],
  ["code",">>> import datetime\n>>> datetime.datetime.now()"],
  ["p","datetime.datetime.now() builds a datetime from the system clock, so its exact repr — datetime.datetime(year, month, day, hour, minute, second, microsecond) — depends on the moment you call it, and no output is claimed here. To pin down a moment you choose, pass the parts as numbers: year, month, day, then optionally hour, minute, second on a 24-hour clock."],
  ["code",">>> launch = datetime.datetime(2026, 7, 23, 9, 30, 0)\n>>> launch\ndatetime.datetime(2026, 7, 23, 9, 30)\n>>> launch.year, launch.month, launch.day\n(2026, 7, 23)\n>>> launch.hour, launch.minute, launch.second\n(9, 30, 0)"],
  ["p","Each part comes back through an attribute. Look closely at the repr: the zero seconds you passed in are not displayed. The value still has second 0 — the attribute proves it — but the repr leaves off trailing parts that are zero. Datetimes also compare with the chapter 2 operators, and the rule is single: the later moment is the greater one."],
  ["code",">>> handed_in = datetime.datetime(2026, 7, 22, 23, 40, 0)\n>>> due = datetime.datetime(2026, 7, 23, 9, 0, 0)\n>>> handed_in < due\nTrue\n>>> due > handed_in\nTrue\n>>> handed_in == due\nFalse"],
  ["p","The two worlds connect: datetime.datetime.fromtimestamp() takes an epoch timestamp and returns the datetime it lands on — in your machine's local time zone. The same timestamp names the same instant everywhere, but a machine set to Tokyo time and one set to Toronto time will show different wall-clock datetimes for it, which is why the line below claims no output."],
  ["code",">>> datetime.datetime.fromtimestamp(1784000000)"],
  ["note","Nothing in these datetime objects records a time zone — they are naive, just wall-clock digits. The mistake is comparing a datetime from your own machine with one parsed out of a server's log in another zone: Python happily compares the digits, reports one of them earlier, and raises no error, even though the instants may be ordered the other way around. Inside one machine's clock, naive datetimes are fine; across sources, make sure they were recorded in the same zone before trusting a comparison."]
]},
{ t: "Durations: timedelta and date arithmetic",
  body: [
  ["p","A datetime is a moment; a timedelta is a length of time with no anchor to any date. Build one with keyword arguments — weeks, days, hours, minutes, seconds, milliseconds, microseconds — in any mix. Whatever you pass in, the object stores it normalised into just three attributes: days, seconds, microseconds."],
  ["code",">>> import datetime\n>>> gap = datetime.timedelta(weeks=2, days=3, hours=4, minutes=5)\n>>> gap.days, gap.seconds, gap.microseconds\n(17, 14700, 0)\n>>> gap.total_seconds()\n1483500.0\n>>> str(gap)\n'17 days, 4:05:00'"],
  ["p","Two weeks and three days folded into 17 days; four hours and five minutes folded into 14,700 seconds. total_seconds() flattens the whole duration to one number, and str() prints it for humans. The normalising works on any scale you feed it:"],
  ["code",">>> datetime.timedelta(hours=50)\ndatetime.timedelta(days=2, seconds=7200)"],
  ["p","The point of the type is arithmetic. Adding a timedelta to a datetime shifts the moment; subtracting one datetime from another asks how far apart they are and answers with a timedelta; * and / scale a duration by a number."],
  ["code",">>> datetime.datetime(2026, 7, 23) + datetime.timedelta(days=90)\ndatetime.datetime(2026, 10, 21, 0, 0)\n>>> datetime.datetime(2027, 1, 1) - datetime.datetime(2026, 7, 23)\ndatetime.timedelta(days=162)\n>>> datetime.timedelta(minutes=45) * 6\ndatetime.timedelta(seconds=16200)\n>>> str(datetime.timedelta(minutes=45) * 6)\n'4:30:00'\n>>> datetime.timedelta(hours=1) / 4\ndatetime.timedelta(seconds=900)"],
  ["p","Ninety days after July 23 lands on October 21, and Python did the month lengths for you — that is the entire sales pitch. The calendar knowledge extends to leap years: February 2026 has 28 days, February 2028 has 29, and the arithmetic quietly accounts for both. Combine comparisons with sleep and you get the standard wait-for-a-date pattern:"],
  ["code","import datetime, time\ndoors_open = datetime.datetime(2026, 12, 1, 10, 0, 0)\nwhile datetime.datetime.now() < doors_open:\n    time.sleep(1)\nprint('the sale is live')"],
  ["p","The loop checks the clock once a second — the sleep is there so it does not burn a CPU core asking millions of times per second — and falls through the moment now() passes the target. No output is claimed: when this prints depends on the day you run it."],
  ["note","datetime.timedelta(months=1) raises a TypeError, and so does years= (the exact message text varies between Python versions). That is deliberate: a month is 28 to 31 days and a year is 365 or 366, so neither names a fixed duration. The follow-up mistake is faking it with timedelta(days=365) — it runs, and then drifts a day for every leap year it crosses. For real calendar offsets, do arithmetic on the datetime parts you mean."]
]},
{ t: "strftime and strptime: datetimes to strings and back",
  body: [
  ["p","A repr like datetime.datetime(2026, 7, 23, 14, 5, 9) is for programmers. To show a moment to a person — or to write it into a filename or a report line — use the strftime() method: you hand it a format string, and it returns the datetime rendered through that format. Directives starting with % stand for the parts; everything else is passed through as-is."],
  ["p","The date directives: %Y is the four-digit year, %y the two-digit year, %m the month number 01 to 12, %B the full month name, %b the short month name, %d the day 01 to 31. The time and weekday directives: %A is the weekday name, %a its short form, %H the hour 00 to 23, %I the hour 01 to 12, %M the minute, %S the second, %p AM or PM, and %% a literal percent sign."],
  ["code",">>> import datetime\n>>> stamp = datetime.datetime(2026, 7, 23, 14, 5, 9)\n>>> stamp.strftime('%Y-%m-%d')\n'2026-07-23'\n>>> stamp.strftime('%d %B %Y')\n'23 July 2026'\n>>> stamp.strftime('%A at %I:%M %p')\n'Thursday at 02:05 PM'\n>>> stamp.strftime('%H:%M:%S')\n'14:05:09'"],
  ["p","strptime() is the same journey in reverse: you have the string and want the datetime. The f stands for format, the p for parse. Pass the text first and then a format built from the same directives — and the format must match the text exactly, separator for separator. Parts the format never mentions fall back to defaults: the time to 00:00, the day to the 1st."],
  ["code",">>> datetime.datetime.strptime('23/07/2026', '%d/%m/%Y')\ndatetime.datetime(2026, 7, 23, 0, 0)\n>>> datetime.datetime.strptime('2026-07-23 14:05', '%Y-%m-%d %H:%M')\ndatetime.datetime(2026, 7, 23, 14, 5)"],
  ["p","When the text and the format disagree — dashes in one, slashes in the other — the parse fails loudly:"],
  ["code",">>> datetime.datetime.strptime('23-07-2026', '%d/%m/%Y')\nValueError: time data '23-07-2026' does not match format '%d/%m/%Y'"],
  ["p","Two-digit years deserve suspicion. %y has to guess a century, and Python's guess is a fixed window:"],
  ["code",">>> datetime.datetime.strptime(\"May '68\", \"%B '%y\")\ndatetime.datetime(2068, 5, 1, 0, 0)\n>>> datetime.datetime.strptime(\"May '69\", \"%B '%y\")\ndatetime.datetime(1969, 5, 1, 0, 0)"],
  ["p","00 through 68 parse as 2000 through 2068; 69 through 99 parse as 1969 through 1999. So '68 and '69 land 99 years apart. When you control the data format, write four-digit years and the guessing never starts."],
  ["note","Case is meaning in a format string. %m is the month; %M is the minute. For the stamp above, strftime('%m') returns '07' and strftime('%M') returns '05' — so a date format written with %M raises no error and simply shows a minute where the month belongs, looking plausible until the minute changes. The other slip is direction: strftime formats a datetime you have, strptime parses a string you were given. Call strftime on a string and the AttributeError tells you which side you are actually standing on."]
]},
{ t: "Launching other programs: subprocess",
  body: [
  ["p","Python can start any other program on the machine — the subprocess module is the front desk (this whole section is desktop code; see the note back in the first section). The workhorse is subprocess.run(), and you pass it a list: the first item is the program to launch, and every item after it becomes one of that program's command line arguments. run() starts the child program, waits for it to finish, and returns a CompletedProcess object describing how it went. The child below is simply a second copy of Python, told with -c to run one line."],
  ["code",">>> import subprocess\n>>> result = subprocess.run(['python3', '-c', \"print('backup finished')\"])\nbackup finished\n>>> result.returncode\n0"],
  ["p","The child shares your terminal, so its print lands on your screen mid-conversation — that is the bare 'backup finished' line. Its exit is summarised by returncode: 0 means it finished cleanly, and any other number is the program reporting failure. (On Windows the interpreter is usually launched as python or py rather than python3.) To collect the child's output instead of letting it spill onto the terminal, ask for it:"],
  ["code",">>> report = subprocess.run(['python3', '-c', \"print('3 files copied')\"], capture_output=True, text=True)\n>>> report.stdout\n'3 files copied\\n'"],
  ["p","capture_output=True gathers what the child wrote, and text=True hands it to you as a string rather than raw bytes. The trailing \\n in the repr is the newline print always adds — visible here because you are looking at the string's repr, not printing it. Any extra list items after the program name arrive in the child's sys.argv, which is how you pass a filename to a command line tool. When you do not want to wait, subprocess.Popen() starts the child and returns immediately with a handle: poll() answers None while the child still runs and its exit code once it has finished, and wait() blocks until the child exits."],
  ["code",">>> proc = subprocess.Popen(['python3', '-c', 'import time; time.sleep(1)'])\n>>> proc.poll() == None\nTrue\n>>> proc.wait()\n0\n>>> subprocess.Popen(['python3', '-c', 'raise SystemExit(2)']).wait()\n2"],
  ["p","The first child sleeps for a second, so the immediate poll() finds it still running; wait() then blocks out the rest of the second and returns 0. The second child exits with code 2 on purpose — check the code before trusting whatever a child was supposed to produce. One more launching trick: every operating system has a command that opens a file with whatever application owns its type, exactly as a double-click would. macOS calls it open, Windows calls it start (which needs shell=True), and most Linux desktops have xdg-open."],
  ["code","import subprocess\nsubprocess.run(['open', 'quarterly_report.pdf'])                  # macOS\n# subprocess.run(['start', 'quarterly_report.pdf'], shell=True)   # Windows\n# subprocess.run(['xdg-open', 'quarterly_report.pdf'])            # Linux"],
  ["p","No output is claimed — what launches, and in front of which window, is your machine's business. The operating system looks up which application handles .pdf and hands the file over."],
  ["note","Popen returns before the child has done anything at all — that is its purpose — so the next line of your script runs immediately. The mistake is launching a converter with Popen and reading its output file on the very next line: the file is not there yet. When the next step needs the child finished, call wait(), or just use run(), which waits built-in. And treat kill() with respect: it ends the child instantly, with no save-your-work prompt."]
]},
{ t: "Scheduling: hand the clock to the operating system",
  body: [
  ["p","Suppose a report script should run every weekday at 07:30. You could write a Python loop that sleeps until then — but it only works while the machine is awake, the lid is open, and the script has not died, and nothing tells you when any of those stops being true. The operating system already owns a scheduler built for exactly this: cron on Linux and macOS, launchd as the macOS-native option, Task Scheduler on Windows. You register the command once, and the OS starts your script at the times you asked for; the script itself just does its job and exits."],
  ["code","# one line in a crontab — minute, hour, day-of-month, month, day-of-week, command\n30 7 * * 1-5   python3 /Users/you/reports/daily_report.py"],
  ["p","Reading the five fields: minute 30, hour 7, any day of the month, any month, days 1 to 5 — Monday to Friday at 07:30. Task Scheduler and launchd express the same idea through a settings window or a configuration file instead of a one-liner. The dividing rule: a wait measured in seconds inside a running program belongs to sleep; anything daily, weekly, or at-4am belongs to the scheduler."],
  ["p","To close the chapter, one small program that uses both halves: a steep timer for tea. It counts down, one line per second, and then opens a note file with whatever application owns .txt — the countdown is time's half, the handover is subprocess's half."],
  ["code","import time, subprocess\nseconds_left = 10\nwhile seconds_left > 0:\n    print(seconds_left)\n    time.sleep(1)\n    seconds_left = seconds_left - 1\nsubprocess.run(['open', 'tea_is_ready.txt'])   # 'start' plus shell=True on Windows, 'xdg-open' on Linux"],
  ["p","It prints 10 down to 1, one number per second, then hands tea_is_ready.txt to the default application. Set seconds_left to 180 for a real black tea. No output is claimed for the block because it ends by launching an application — but the countdown half is pure print and sleep, and by now you can read exactly what it will say."],
  ["note","The mistake is promoting the sleep loop to a job it cannot hold: leaving a while-loop Python script running for days as your scheduler. It dies with the first reboot, the first closed lid, the first crash — silently. The OS scheduler survives all three. Loop-and-sleep is for waits your running program owns, measured in seconds or minutes; the scheduler is for appointments."]
]},
{ t: "Summary",
  body: [
  ["p","The time module reads the system clock: time.time() returns seconds since the Unix epoch — two of those timestamps subtracted measure any piece of code — and time.sleep() pauses the program, blocking everything while it does. The datetime module does the calendar work: datetime objects are moments you can compare, timedelta objects are durations, and adding or subtracting them handles month lengths and leap years for you. strftime() renders a datetime into any string shape; strptime() parses a string back into a datetime, provided the format matches exactly. Past the clock, subprocess.run() launches another program and waits, Popen() launches without waiting, and the operating system's scheduler — cron, launchd, Task Scheduler — starts your scripts at appointed times far more reliably than a sleeping loop."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises — they stay inside datetime and timedelta, so they run and grade right here in the app. The next chapter is Sending Email, Texts, and Push Notifications — where a script that runs on a schedule stops keeping its results to itself and starts telling you about them."]
]}
],
questions: [
{ q:"What moment is the Unix epoch, and what does time.time() return?",
  a:"Midnight on January 1, 1970, UTC. time.time() returns the seconds since that moment as a float — the epoch timestamp. By mid-2026 the value is past 1.78 billion, and every call returns a slightly bigger number than the last." },
{ q:"time.time() never returns the same value twice, so how do you use it to measure how long a piece of code takes?",
  a:"Call it once before the code and once after, and subtract. Each timestamp is meaningless alone; the difference between the two is the elapsed seconds. That subtract-two-timestamps pattern is profiling." },
{ q:"What does round(87.276451, 2) evaluate to, and why does this chapter keep reaching for round()?",
  a:"87.28. Elapsed-time floats arrive with a dozen noisy digits, and round(value, 2) trims them to two decimal places for printing. round(value) with no second argument goes further and returns the nearest whole number — 87 here." },
{ q:"What does time.sleep(3) do while it runs, and what value does it return?",
  a:"It blocks the entire program for at least about three seconds — nothing after it runs until the pause ends, and the wake-up can be a whisker late but is never deliberately early. It returns None: the function exists for its delay, not its value." },
{ q:"What is the difference between a datetime object and a timedelta object?",
  a:"A datetime is a moment — year, month, day, hour, minute, second, microsecond. A timedelta is a length of time anchored to no date. The two do arithmetic together: subtracting two datetimes yields a timedelta, and adding a timedelta to a datetime yields a new datetime." },
{ q:"Why does datetime.timedelta() accept weeks= but refuse months= and years=?",
  a:"A week is always exactly seven days, so it converts to a fixed duration. A month is 28 to 31 days and a year 365 or 366, so neither names a fixed length of time — passing months= or years= raises a TypeError (the message wording varies between Python versions)." },
{ q:"With d1 = datetime.datetime(2026, 3, 1) and d2 = datetime.datetime(2026, 2, 27), what is (d1 - d2).days?",
  a:"2 — February 2026 has 28 days, so the 27th is two days before March 1. Run the same subtraction with 2028, a leap year, and the answer is 3. Carrying that calendar knowledge is exactly what datetime arithmetic is for." },
{ q:"strftime and strptime differ by one letter. Which direction does each go, and what do the f and p stand for?",
  a:"strftime formats a datetime you have into a string — f for format. strptime parses a string you were given into a datetime — p for parse. strftime is a method on a datetime object; strptime is called as datetime.datetime.strptime(text, format)." },
{ q:"For stamp = datetime.datetime(2026, 7, 23, 14, 5, 9), what do stamp.strftime('%m') and stamp.strftime('%M') each return?",
  a:"'07' and '05'. %m is the month number and %M is the minute — the case of the letter is the entire difference, and mixing them raises no error. A date format written with %M quietly shows the minute where the month belongs." },
{ q:"You started a program with subprocess.Popen(). What is the difference between calling poll() and calling wait() on the object you got back?",
  a:"poll() asks without waiting: it returns None while the child is still running and the exit code once it has finished. wait() blocks until the child exits, then returns the exit code. Use poll() to check in while doing other work; use wait() when the next step needs the child done." }
],
exercises: [
{ c:"variables & types", t:"Days until the deadline", book:"ch19",
  b:"The grant you are writing opened on July 23, 2026 and is due December 25, 2026. Build both moments with datetime.datetime, subtract them, and print 'Days left:' followed by the number of days between the two dates.",
  o:"Days left: 155",
  h:["Subtracting one datetime from another gives a timedelta, and a timedelta knows its own length in days.",
     "Build datetime.datetime(2026, 7, 23) and datetime.datetime(2026, 12, 25); the subtraction's .days attribute is the number you need.",
     "gap = due - opened, then print('Days left:', gap.days)."]},
{ c:"strings", t:"The invitation line", book:"ch19",
  b:"An open-studio night happens on September 12, 2026 at 3:30 in the afternoon. Build that moment with datetime.datetime, then print it through strftime in this shape: 'Friday 01 May 2026, 07:15 PM' — weekday name, zero-padded day, full month name, year, then a comma and the 12-hour time with AM or PM.",
  o:"Saturday 12 September 2026, 03:30 PM",
  h:["Half past three in the afternoon on a 24-hour constructor means the hour argument is 15, and the minute is 30.",
     "The directives, in order: %A %d %B %Y for the date part, then a comma and %I:%M %p for the time part.",
     "datetime.datetime(2026, 9, 12, 15, 30).strftime('%A %d ...') — finish the format string with the month, year, and 12-hour time directives."]},
{ c:"functions", t:"The library due date", book:"ch19",
  b:"Write a function due_date(borrowed, loan_days) that returns the datetime a loan ends. For a book borrowed on July 23, 2026 with a 21-day loan, call it and print the result formatted as year-month-day with strftime('%Y-%m-%d').",
  o:"2026-08-13",
  h:["Inside the function, the borrowed moment plus a duration of loan_days is the due moment.",
     "datetime.timedelta(days=loan_days) builds the duration; adding it to a datetime returns the later datetime.",
     "The body is return borrowed + datetime.timedelta(days=loan_days); call it with datetime.datetime(2026, 7, 23) and 21, then strftime the result."]},
{ c:"lists", t:"Tidy the appointment list", book:"ch19",
  b:"appointments = ['03/11/2026', '21/08/2026', '05/01/2027'] holds day/month/year strings. Parse each one with strptime, sort the resulting datetimes, and print each on its own line formatted as '%Y-%m-%d'.",
  o:"2026-08-21\n2026-11-03\n2027-01-05",
  h:["As strings these sort by their first characters, which is day-of-month order — nonsense. Parse first, sort second.",
     "datetime.datetime.strptime(s, '%d/%m/%Y') builds each datetime; append them to a list and call .sort() — datetimes sort chronologically on their own.",
     "Loop once appending strptime(s, '%d/%m/%Y') for each s, sort the list, then loop again printing each one through .strftime('%Y-%m-%d')."]}
]
};
