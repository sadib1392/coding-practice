/* Practice Log book — Chapter 12: Designing and Deploying Command Line Programs.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory;
   the $-prompt transcripts were captured by running the scripts with real
   command line arguments through a real interpreter. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch12 = {
n: 12,
title: "Designing and Deploying Command Line Programs",
src: "https://automatetheboringstuff.com/3e/chapter12.html",
blurb: "The terminal, sys.argv, and what it takes to run a finished Python tool outside the editor.",
sections: [
{ t: "Programs, scripts, and commands",
  body: [
  ["p","Every program so far has run inside an editor, or inside this app. That is fine while you are writing it, but a finished tool should not make you open an editor, find the file, and press run every time. Deployment is the step where a program becomes something you launch in a keystroke or two — and, if you want, something you hand to a person who has never installed Python."],
  ["p","The vocabulary around this is loose, but the words do lean in different directions. A program is any complete piece of software. A script is a program an interpreter runs straight from its source file, the way Python runs a .py file. A command is a program built for the terminal: no windows, no buttons, all of its configuration handed over up front as text. A shell script is a text file that replays several terminal commands in one go — Windows calls these batch files. An application is the other end of the scale: a GUI, an installer, many files. The useful distinction is never the label; it is how the thing is run and shipped."],
  ["note","This chapter's workflow lives on a desktop Python installation — a terminal, a real sys.argv, pip. This app runs Python inside your browser, where none of that exists, so nothing on this page asks you to open a terminal. Everything runnable here relies on one honest trick: build the argument list yourself as a plain Python list, and the parsing code cannot tell the difference. The graded exercises below do exactly that."]
]},
{ t: "Using the terminal",
  body: [
  ["p","A terminal is a text window with a loop inside: it shows a prompt, you type a command, it prints the reply, and the prompt comes back. Terminals predate every GUI you have used, and they never left, because for launching tools they are still the fastest thing there is. You will hear the same window called a command line, a CLI, a shell, or a console."],
  ["p","The prompt itself varies. Windows shows the folder you are standing in followed by an angle bracket; macOS ends its prompt with a percent sign; Linux with a dollar sign. The terminal, like every running program, has a current working directory — the folder that relative paths are measured from, and usually the one displayed in the prompt."],
  ["p","Three commands cover most navigation. cd, followed by a path, moves the terminal to another folder; on macOS and Linux, pwd prints where you are, and on Windows, cd with nothing after it does the same job. ls lists the current folder's contents on macOS and Linux; on Windows the equivalent is dir. Terminal work is mostly a rhythm of cd to move and ls or dir to look around."],
  ["p","Python itself is a program you can launch this way. On Windows it is installed as python; on macOS and Linux it is python3. Run it with nothing after it and you get the familiar interactive shell with its three angle brackets. Put a script's filename after it instead — absolute, or relative to the current working directory — and it runs the script. Here is a one-line script to prove it with:"],
  ["code","print('Hello from the terminal')"],
  ["p","Save that as hello.py, cd to its folder, and hand the filename to the interpreter. The transcripts in this chapter shorten the prompt to a single $ — you type what follows the $, and the lines under it are the reply, captured from a real run:"],
  ["code","$ python3 hello.py\nHello from the terminal"],
  ["p","Typing a bare name like python3 works because of the PATH environment variable: a list of folders, separated by colons on macOS and Linux and semicolons on Windows, that the terminal searches in order when you name a program. The first folder that contains a matching name wins, and subfolders are not searched. Windows also checks the current working directory before PATH; macOS and Linux never do, which is why a program sitting right next to you still needs to be run as ./name — the dot-slash names it by path instead of asking PATH."],
  ["p","Two commands tell you how a name will resolve: where on Windows and which on macOS and Linux print the full path of the program a bare name would run. They are the first thing to reach for when the wrong Python answers. Later in this chapter you will want a folder of your own on PATH — the convention is a Scripts folder under your home folder, added through the environment variables dialog on Windows, or with an export PATH= line in the shell startup file (.zshrc on macOS, .bashrc on Linux). Either way, only terminals opened afterward see the change."],
  ["note","The terminal prompt and the Python prompt are different places, and mixing them up is the classic first-day mistake. Typing python3 hello.py at the three-angle-bracket prompt is a syntax error — you are already inside Python, and the interactive shell does not speak terminal. Leave the shell with exit() first, then run the script from the terminal prompt."]
]},
{ t: "Virtual environments and pip",
  body: [
  ["p","Sooner or later two of your programs will need different versions of the same third-party package, and one Python installation cannot hold both at once. Python's answer is the virtual environment: a private, disposable Python setup with its own installed packages, one per project, so dependencies never collide and your operating system's own Python — which macOS and Linux tools quietly rely on — is never touched."],
  ["p","The venv module that ships with Python creates one. From your project folder, python3 -m venv .venv builds the environment into a folder named .venv — the name is convention, not law. Creating it changes nothing by itself; you activate it in the terminal, by running the activate.bat script inside it on Windows or source .venv/bin/activate on macOS and Linux. Activation rewires PATH for that one terminal window, so python now means the environment's interpreter, and it puts the environment's name in front of your prompt as a reminder. deactivate undoes it; deleting the .venv folder deletes the whole environment."],
  ["p","Packages come from PyPI, the Python Package Index, and are installed by pip, the package manager that ships with Python. The reliable way to call it is through the interpreter itself: python3 -m pip install pyperclip installs a package into whichever Python ran the command, which — with your environment active — is exactly where you want it. The same shape lists what is installed (python3 -m pip list), upgrades, and uninstalls."],
  ["note","When import fails moments after a pip install succeeded, you almost always installed into a different Python than the one running your script — the system interpreter instead of the environment, or one environment while another was active. Running pip as python3 -m pip with the right environment active makes the mismatch go away, because the installing Python and the running Python are then the same program."]
]},
{ t: "Self-aware programs",
  body: [
  ["p","A script headed for other machines has to stop assuming and start asking. Python sets up several variables that let a program inspect its own situation. __file__ holds the path of the script's own .py file — the clean way to find files that travel alongside it. sys.executable holds the path of the interpreter that is running, and sys.version_info holds the interpreter's version as numbers you can compare, which beats picking digits out of a version string:"],
  ["code",">>> import sys\n>>> sys.version_info.major\n3"],
  ["p","For behavior that depends on the operating system, os.name evaluates to 'nt' on Windows and 'posix' on macOS and Linux, and sys.platform is more specific — 'win32', 'darwin', or 'linux'. A deploy-minded script branches on these instead of assuming its author's machine."],
  ["p","The same defensive habit covers third-party packages. An import of something that is not installed raises ModuleNotFoundError:"],
  ["code",">>> import imaginarytoolkit\nModuleNotFoundError: No module named 'imaginarytoolkit'"],
  ["p","Left unhandled, that error is a traceback on someone else's screen. Wrapping the import in try lets the program either explain what to install or fall back to a plainer behavior:"],
  ["code","try:\n    import imaginarytoolkit\nexcept ModuleNotFoundError:\n    print('imaginarytoolkit is not installed, falling back to plain text')"],
  ["code","imaginarytoolkit is not installed, falling back to plain text"]
]},
{ t: "Command line arguments",
  body: [
  ["p","The text after a command's name is its command line arguments, and they do for a program what arguments do for a function: configure one particular run before it starts. ls by itself lists the folder you are in; ls with a folder name after it lists that folder instead. Your Python scripts receive the same treatment — whatever you type after the script's name arrives inside the program as sys.argv, a plain list of strings. This four-line script does nothing but show it to you:"],
  ["code","import sys\nprint('Arguments received:')\nprint(sys.argv)"],
  ["p","Two real runs. The arguments are split on spaces, and the script's own name — exactly as typed — rides along at the front:"],
  ["code","$ python3 nametag.py hello world\nArguments received:\n['nametag.py', 'hello', 'world']"],
  ["p","When an argument needs to contain a space, quote it at the command line and it arrives as one element:"],
  ["code","$ python3 nametag.py \"hello world\"\nArguments received:\n['nametag.py', 'hello world']"],
  ["p","Read sys.argv the way those runs show it: index 0 is the program's name, the real arguments start at index 1, and every element is a string — even the ones that look like numbers. A user who types 4 and 9 has handed you '4' and '9', and + will glue them instead of adding them until you convert:"],
  ["code",">>> '4' + '9'\n'49'\n>>> int('4') + int('9')\n13"],
  ["p","There is no terminal in this app, but sys.argv is only ever a list — so write your parsing as a function that takes the list as a parameter, and feed it a list you built yourself. On a desktop the last line would be repeat_greeting(sys.argv); here you hand in the same values by hand, and the parsing code cannot tell the difference:"],
  ["code","def repeat_greeting(argv):\n    name = argv[1]\n    times = int(argv[2])\n    for i in range(times):\n        print('Hello, ' + name)\n\nrepeat_greeting(['greet.py', 'Maya', '2'])"],
  ["code","Hello, Maya\nHello, Maya"],
  ["note","Two mistakes to expect. Reaching for argv[0] and being surprised it is the program's own name — your first real argument lives at argv[1]. And doing arithmetic on an argument without converting it first — every element of sys.argv is a string, so the '2' above had to pass through int() before range() would take it."]
]},
{ t: "Designing a text interface",
  body: [
  ["p","Commands get typed far more often than they get read, which inverts the naming advice you learned for variables: short wins. A command you run five times a day should cost a few keystrokes, not a sentence. Before claiming a name, check it is free — run which or where on your candidate, and pick something else if an existing program answers."],
  ["p","A command should also say how it wants to be called. The convention is a usage message: one line naming the arguments in order, printed whenever the arguments received cannot be worked with — most often when too few arrive. It turns a silent failure or a traceback into instructions. The shape below checks len(argv) before touching an index that might not exist:"],
  ["code","def rate(argv):\n    if len(argv) < 3:\n        print('usage: rate.py MILES HOURS')\n        return\n    miles = float(argv[1])\n    hours = float(argv[2])\n    print(miles / hours)\n\nrate(['rate.py'])\nrate(['rate.py', '150', '3'])"],
  ["code","usage: rate.py MILES HOURS\n50.0"],
  ["p","Arguments that switch behavior on and off, rather than carry data, are flags, written with a leading double dash: --quiet to suppress output, --verbose to add more. Flags are just list elements, so a loop over argv[1:] can pull them out and treat everything else as data. Keep the set small — once flags multiply and interact, hand-rolled parsing turns into a pile of cases, and the standard library's argparse module is the better tool."],
  ["p","Real terminals offer presentation tricks this app cannot show: clearing the screen between frames of output, colored text through third-party packages such as bext, sounds, and small pop-up dialogs through pymsgbox. All of them need a real terminal or display, and all are easy to overdo — a command that prints only what matters is easier to use, and easier to chain into other commands. One clearing trick is worth reading even here, because it is a conditional expression — a one-line if that evaluates to a value. The screen-clearing program is os.system('cls' if os.name == 'nt' else 'clear'), and the expression inside picks the right command per operating system:"],
  ["code",">>> kind = 'posix'\n>>> 'cls' if kind == 'nt' else 'clear'\n'clear'\n>>> kind = 'nt'\n>>> 'cls' if kind == 'nt' else 'clear'\n'cls'"],
  ["note","A flag is still just a list element — nothing marks '--upper' as special except the code you write. Forget to filter it out and it shows up in your output as one of the words. The program in the next section has to dodge exactly that."]
]},
{ t: "A short program: initials.py",
  body: [
  ["p","A small, honest use for everything above: a command that turns a phrase into its acronym, for the project names you keep abbreviating in notes. The name initials is short, readable, and — checked with which — not taken. It takes the words as arguments, prints the first letter of each in uppercase, and accepts one flag, --dots, for the dotted style. Too few arguments gets the usage line."],
  ["code","import sys\n\ndef acronym(argv):\n    if len(argv) < 2:\n        print('usage: initials.py WORD [WORD ...] [--dots]')\n        return\n    words = []\n    dots = False\n    for arg in argv[1:]:\n        if arg == '--dots':\n            dots = True\n        else:\n            words.append(arg)\n    letters = []\n    for word in words:\n        letters.append(word[0].upper())\n    if dots:\n        print('.'.join(letters) + '.')\n    else:\n        print(''.join(letters))\n\nacronym(sys.argv)"],
  ["p","Three real runs — the plain style, the flag, and the empty call that earns the usage line:"],
  ["code","$ python3 initials.py automate the boring stuff\nATBS"],
  ["code","$ python3 initials.py automate the boring stuff --dots\nA.T.B.S."],
  ["code","$ python3 initials.py\nusage: initials.py WORD [WORD ...] [--dots]"],
  ["p","Read it top to bottom. The len(argv) guard fires before any index is touched. The first loop is the flag filter from the previous section: '--dots' flips a Boolean, everything else is a word. The second loop collects word[0].upper() for each word, and the final if picks a join — periods between letters plus a trailing one, or nothing at all. Notice what the order of the two loops buys: the flag can appear anywhere among the words and the result is the same."],
  ["p","To run it in this app, replace the last line with a call that hands in the list yourself:"],
  ["code","acronym(['initials.py', 'practice', 'log'])"],
  ["code","PL"]
]},
{ t: "Deploying a finished program",
  body: [
  ["p","Deployment is the last mile: the program works, and now it should start from anywhere in a keystroke or two. The ingredients are the ones this chapter has been assembling — a Scripts folder on PATH, a virtual environment holding the program's packages, and one small wrapper file per operating system, because the terminal cannot run a bare .py file the way it runs a real command."],
  ["p","On Windows the wrapper is a batch file: a .bat text file in the Scripts folder, carrying three commands — activate the environment, run python on the script while forwarding any arguments along, deactivate. With the Scripts folder on PATH, the tool now starts from any terminal by its bare name, or from the Run dialog behind the Windows key plus R; the extension is optional when launching."],
  ["p","On macOS the wrapper is a .command text file with the same activate-run-deactivate contents, made executable with chmod u+x — after which Spotlight can launch it by name. Spotlight has no way to pass arguments, so any the program needs must be written into the file. On Linux it is an extensionless shell script, also marked executable with chmod, plus a small .desktop entry file in the launcher's applications folder so the system launcher can find it."],
  ["p","All of that still assumes Python on the receiving machine. To hand your program to someone with no Python at all, the third-party PyInstaller package compiles it: python -m PyInstaller --onefile tool.py produces, in a dist folder, a single executable that bundles your script together with a full copy of the Python interpreter. That bundled interpreter is why even a tiny script becomes a file measured in megabytes — and why the result needs nothing installed to run."],
  ["note","PyInstaller builds only for the operating system it runs on — a Windows build will not run on macOS, and the reverse. Build on each system you want to support. And expect mail providers to block executable attachments; share a compiled program some other way."]
]},
{ t: "Summary",
  body: [
  ["p","This chapter was about the life of a program after the editor. The terminal launches programs by name; PATH decides what a bare name means; cd, pwd, ls, and dir cover navigation. A script receives its configuration as command line arguments in sys.argv — program name at index 0, arguments after it, every element a string. Good commands keep their names short, print a usage line when called wrong, and take flags like --dots for switchable behavior. Virtual environments give each project its own packages, pip fills them from PyPI, wrapper files put your tool one keystroke away, and PyInstaller turns a script into a single executable for machines with no Python at all."],
  ["p","Because this app has no terminal, every runnable example here wrapped its parsing in a function and handed it a hardcoded list — which is exactly what the graded exercises below ask you to do. Answer the practice questions from memory before revealing the answers, then clear the exercises. The next chapter leaves your machine behind and starts pulling pages from the web."]
]}
],
questions: [
{ q:"What is the difference between a script and an application?",
  a:"A script is a program an interpreter runs straight from its source file, the way Python runs a .py file. An application is a full GUI program — many files, an installer, features aimed at end users. The labels are loose; the real distinction is how the thing is run and shipped." },
{ q:"Which command lists the contents of the current folder on Windows, and which on macOS and Linux?",
  a:"dir on Windows; ls on macOS and Linux. Both list the files and subfolders of the terminal's current working directory." },
{ q:"What does the PATH environment variable contain, and what does the terminal use it for?",
  a:"A list of folder paths — separated by semicolons on Windows, colons on macOS and Linux. When you type a bare program name, the terminal searches those folders in order and runs the first match, which is why putting a Scripts folder on PATH makes your tools runnable from anywhere." },
{ q:"On macOS and Linux, why does a program sitting in your current folder need to be run as ./name?",
  a:"Those systems resolve bare names through PATH only and never check the current folder. The ./ prefix names the program by path instead, so PATH is not consulted. Windows checks the current folder first, so it does not need the prefix." },
{ q:"What problem do virtual environments solve?",
  a:"Two programs needing different versions of the same package cannot share one Python installation. A virtual environment is a private Python setup with its own installed packages — one per project keeps dependencies from colliding, and it leaves the operating system's own Python untouched." },
{ q:"What is sys.argv, and what is always at index 0?",
  a:"The list of command line arguments Python hands to a script. Index 0 is the program's own name exactly as it was typed; the real arguments start at index 1, and every element is a string." },
{ q:"You run python3 tags.py red blue from the folder containing tags.py. What exactly is sys.argv inside the script?",
  a:"['tags.py', 'red', 'blue'] — the script name as typed at index 0, then each space-separated argument, all of them strings." },
{ q:"A script run as python3 add.py 4 9 stores args = sys.argv. Why does print(args[1] + args[2]) show 49 rather than 13?",
  a:"Every element of sys.argv is a string, so + concatenates '4' and '9' into '49'. Convert before adding: int(args[1]) + int(args[2]) is 13." },
{ q:"What is a usage message, and when should a command print one?",
  a:"One line stating the exact shape of a correct call — usage: initials.py WORD [WORD ...] [--dots] — printed when the arguments received cannot be worked with, most often when too few arrive. It turns a silent failure or a traceback into instructions." },
{ q:"What does PyInstaller produce, and why is the file so large?",
  a:"A single standalone executable, built in the dist folder by the --onefile option, that people without Python can run. It bundles a full copy of the Python interpreter with your script — that is the size — and it runs only on the operating system it was built on." }
],
exercises: [
{ c:"lists", t:"Count the arguments", book:"ch12",
  b:"A script was started as python3 tally.py red green blue, so inside it, sys.argv is ['tally.py', 'red', 'green', 'blue']. Given args = ['tally.py', 'red', 'green', 'blue'], print the program's own name, then the number of arguments that came after it, each on its own line.",
  o:"tally.py\n3",
  h:["The program's name rides along in the list — the arguments are everything after it.",
     "args[0] is the name; len(args) counts the whole list, name included.",
     "Print args[0] first; the second line is the length of the list minus one."]},
{ c:"strings", t:"Strings in, numbers out", book:"ch12",
  b:"Every command line argument arrives as a string. Given args = ['add.py', '4', '9'], print what + produces with the two arguments as they are, then print their sum after converting each with int(), each result on its own line.",
  o:"49\n13",
  h:["What + does depends on the types of its two sides.",
     "args[1] and args[2] are '4' and '9' — strings. + glues strings and adds numbers; int() converts.",
     "First print args[1] + args[2] untouched; then convert each with int() and print the sum."]},
{ c:"functions", t:"The usage message", book:"ch12",
  b:"Write a function shout(argv) that prints exactly usage: shout.py WORD when the list holds nothing after the program name, and otherwise prints the first argument in uppercase. Call it twice: with ['shout.py'], then with ['shout.py', 'quiet'].",
  o:"usage: shout.py WORD\nQUIET",
  h:["One function, two branches: the list is too short, or it is not.",
     "len(argv) tells you whether anything followed the program name; the string method .upper() does the shouting.",
     "Compare len(argv) to 2 — the short branch prints the usage line, the other prints the first real argument uppercased. Then call the function once with each list."]},
{ c:"loops", t:"Flags versus words", book:"ch12",
  b:"Given args = ['banner.py', 'launch', 'day', '--upper'], loop over everything after the program name. The words go into a list; '--upper' is a flag, not a word — when it appears anywhere, the output is uppercased. Join the words with single spaces and print the resulting line.",
  o:"LAUNCH DAY",
  h:["The loop has two jobs: spot the flag, collect everything else.",
     "Loop over args[1:] — comparing each item to '--upper' either flips a Boolean or appends a word.",
     "After the loop, join the word list with ' '.join, uppercase the joined line when the flag was seen, and print it."]}
]
};
