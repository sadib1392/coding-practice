/* Practice Log book — Chapter 23: Controlling the Keyboard and Mouse.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   pyautogui drives the real mouse and keyboard of whatever machine runs it,
   so its snippets were never executed for this build and are shown without
   outputs — the chapter discloses this up front. Every output that IS shown
   comes from built-in Python only and was captured by executing the code
   (see tests/ch23_verify.py); the graded exercises run on the built-in
   Python that ships with this app. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch23 = {
n: 23,
title: "Controlling the Keyboard and Mouse",
src: "https://automatetheboringstuff.com/3e/chapter23.html",
blurb: "GUI automation with pyautogui — fail-safes first, then screen coordinates, synthetic clicks and keystrokes, and the action plans this app grades in plain Python.",
sections: [
{ t: "GUI automation and staying in control",
  body: [
  ["p","The modules of the last few chapters automated things that live in files — spreadsheets, images, text. The pyautogui module automates the layer above all of them: it moves the real mouse pointer, presses the real mouse buttons, and types real keystrokes. To the operating system its events are indistinguishable from your hand, which means a Python program can drive any application, including ones that offer no other way in — the clunky inventory tool at work, a form that exists only on screen, a game."],
  ["p","That power fails differently from anything earlier in the book. A buggy file program raises an exception and stops. A buggy GUI program keeps clicking and typing into whatever window happens to be in front, at machine speed — and the mouse you would normally use to stop it is the one being driven. So this chapter starts with the ways to stay in control, not with the features."],
  ["p","pyautogui ships two controls, both on by default. First, after every pyautogui call completes its action, the library waits one tenth of a second — longer if you assign a bigger number to pyautogui.PAUSE — so a runaway program moves in steps rather than a blur, and your hand gets a gap to act in. Second, the fail-safe: if the mouse cursor sits in any of the four corners of the screen when a pyautogui call runs, that call raises pyautogui.FailSafeException instead of performing its action. Slamming the cursor into a corner is a gesture you can make faster than a script can finish, and the uncaught exception ends the program. That corner slam is your abort plan — settle on it before the first run, not during the first emergency. One line buys extra thinking room while a script is young:"],
  ["code","import pyautogui\npyautogui.PAUSE = 1"],
  ["p","The last resort costs more: log out. Ctrl-Alt-Del on Windows and Linux, Command-Shift-Q on macOS — logging out shuts down every running program, the runaway script included, at the price of any unsaved work. On macOS there is also a step before the first run: the terminal or editor launching your script needs permission to control the computer, granted under Privacy and Security, then Accessibility, in the system settings — and the screenshot functions later in this chapter need the separate Screen Recording permission."],
  ["note","GUI automation drives a real desktop — a real cursor, real keystrokes, whatever window has focus when they land. It cannot run inside this app, and no grader could run it safely, so every pyautogui block in this chapter appears without output. The graded exercises at the bottom practice the planning half of the skill — coordinates, paths, and action sequences — in built-in Python, and those run and grade here as usual."]
]},
{ t: "Screen coordinates",
  body: [
  ["p","Every pyautogui function that touches the mouse has to be told where, and where is a pair of numbers. The screen is a grid of pixels with the origin (0, 0) at the top-left corner. The x-coordinate counts pixels rightward; the y-coordinate counts downward — down, not up. There are no negative coordinates on screen, and no pixel sits at the width or height itself, because counting starts at zero. The corner arithmetic is worth doing once in plain Python:"],
  ["code","width, height = 1920, 1080\nprint('bottom-right pixel:', width - 1, height - 1)\nprint('center:', width // 2, height // 2)"],
  ["code","bottom-right pixel: 1919 1079\ncenter: 960 540"],
  ["p","On a 1920x1080 display the columns run 0 through 1919 and the rows 0 through 1079 — width minus one, height minus one. Your own display's numbers come from pyautogui.size(), which returns a Size named tuple: a tuple that also answers to attribute names, so screen[0] and screen.width are the same value. pyautogui.position() does the same for the cursor, returning a Point of where it sat at the moment of the call:"],
  ["code","import pyautogui\nscreen = pyautogui.size()\nspot = pyautogui.position()"],
  ["p","Run those two lines on a desktop and the values are your resolution and wherever the cursor happened to rest. Everything else in this chapter is built on such pairs of numbers — which is why the planning half of GUI automation turns out to be ordinary arithmetic."],
  ["note","The y-axis catches everyone once. Mathematics classes drew y growing upward; screens grow it downward, so moving the cursor toward the top of the screen means making y smaller. The point (0, 1079) on a 1080-row display is the bottom-left corner, not the top — misread that and every vertical move in your plan runs the wrong way."]
]},
{ t: "Moving, clicking, and dragging",
  body: [
  ["p","pyautogui.moveTo(x, y) places the cursor at an absolute position — the same spot no matter where the cursor started. pyautogui.move(x, y) is the relative sibling: it shifts the cursor from wherever it currently sits, so positive arguments go right and down, negative arguments go left and up. Both jump instantly unless you pass the duration keyword argument, the number of seconds the motion should take:"],
  ["code","import pyautogui\npyautogui.moveTo(100, 100)\npyautogui.moveTo(100, 100, duration=0.5)\npyautogui.move(200, 0)\npyautogui.move(0, -50)"],
  ["p","A loop makes the difference visible on a real desktop. This traces a rectangle four times; with the duration, a watcher sees the cursor glide along each edge, and with the keyword deleted it teleports corner to corner instead:"],
  ["code","for i in range(4):\n    pyautogui.moveTo(500, 300, duration=0.25)\n    pyautogui.moveTo(700, 300, duration=0.25)\n    pyautogui.moveTo(700, 500, duration=0.25)\n    pyautogui.moveTo(500, 500, duration=0.25)"],
  ["p","Clicking is pyautogui.click(): press and release the left button at the cursor's current position. Given coordinates, it moves there first, so click(300, 400) is a moveTo and a click in one call. The button keyword argument accepts 'left', 'middle', or 'right', and doubleClick(), rightClick(), and middleClick() name the common cases. Underneath, a click is two separate events, and pyautogui exposes them as mouseDown() and mouseUp() for the times a program must hold a button:"],
  ["code","pyautogui.click(300, 400)\npyautogui.rightClick(300, 400)\npyautogui.doubleClick()"],
  ["p","Dragging — moving the cursor while a button stays held — reuses the same two shapes: dragTo(x, y) is absolute and drag(x, y) is relative, with arguments exactly as in moveTo and move. Give drags a duration. At instant speed some applications never register the gesture, and a drawing program hands you back an empty canvas:"],
  ["code","pyautogui.dragTo(650, 200, duration=0.5)\npyautogui.drag(0, 120, duration=0.5)"],
  ["p","pyautogui.scroll(units) turns the wheel at the cursor's position — a positive argument scrolls up, a negative one down, and the size of one unit varies by operating system and application, so calibrating it takes an experiment. For harvesting coordinates in the first place, pyautogui.mouseInfo() opens a small helper application called MouseInfo that displays the live cursor position and the pixel color under it. You run it from the interactive shell while setting a script up, not from inside the script:"],
  ["code","pyautogui.scroll(200)\npyautogui.scroll(-200)"],
  ["note","moveTo(100, 100) and move(100, 100) both run without complaint, and only one goes where you meant. The absolute call lands at (100, 100); the relative call lands 100 right and 100 down of wherever the cursor was. Mix them up and every later click happens in the wrong place — with no error anywhere, because clicking the wrong pixel is still a perfectly legal click."]
]},
{ t: "Typing and hotkeys",
  body: [
  ["p","pyautogui.write() types a string, one synthetic key press at a time, into whichever window and text field hold keyboard focus. Putting focus there is the script's job — a click on the target field is the usual first step. An optional second argument sets a pause in seconds between characters, for applications that drop input arriving at machine speed:"],
  ["code","import pyautogui\npyautogui.click(100, 200)\npyautogui.write('Inventory count complete.')\npyautogui.write('slower this time', 0.25)"],
  ["p","Keys that produce no character go by name: 'enter', 'esc', 'tab', 'left', 'f1', 'volumedown', and the rest of the strings listed in pyautogui.KEYBOARD_KEYS. The names 'shift', 'ctrl', 'alt', and 'win' refer to the left-hand key of each pair. Handing write() a list lets plain characters and named keys mix:"],
  ["code","pyautogui.write(['a', 'b', 'left', 'left', 'X', 'Y'])"],
  ["p","Trace that list against an empty text field. a and b are typed, two presses of the left arrow walk the insertion point back to the start, then X and Y are typed in front — the field ends up reading XYab. For a single key there is pyautogui.press('enter'), and keyDown() and keyUp() split a press from its release for keys that must stay held across other actions."],
  ["p","pyautogui.hotkey() handles combinations: it presses its arguments in the order given and releases them in reverse order, which is the rule your fingers already follow for Ctrl-C — control down, c down, c up, control up. Written out with keyDown() and keyUp(), a four-key combination is eight calls; hotkey() is one:"],
  ["code","pyautogui.hotkey('ctrl', 'c')\npyautogui.hotkey('ctrl', 'alt', 'shift', 's')"],
  ["note","write() types into whatever has focus, and focus follows the user. Switching windows to check something while the script runs redirects every remaining keystroke into the wrong application — a chat box, an address bar, an editor with your code in it. Start the script, then keep your hands off the machine until it finishes or you abort it in a corner."]
]},
{ t: "Screenshots and image recognition",
  body: [
  ["p","pyautogui.screenshot() captures the whole screen and returns it as a Pillow Image object, the same type chapter 21 cropped and saved — everything you learned there applies to it. Two smaller functions answer questions without handling a whole image: pixel(x, y) returns the RGB color tuple of one screen pixel, and pixelMatchesColor(x, y, rgb) returns True or False. That second one is a cheap guard a script can run before clicking — if the button's known gray is not at the button's coordinates, whatever is there now is not the button:"],
  ["code","import pyautogui\nshot = pyautogui.screenshot()\ncolor = pyautogui.pixel(50, 200)\nok = pyautogui.pixelMatchesColor(50, 200, (90, 94, 99))"],
  ["p","Hardcoded coordinates assume the target never moves. locateOnScreen() drops that assumption: give it the filename of a small image you saved earlier — a screenshot of one button, say — and it searches the live screen for that picture, returning a Box named tuple of left, top, width, and height for the first match. locateAllOnScreen() yields a Box for every match. When there is no match anywhere on screen, locateOnScreen() raises pyautogui.ImageNotFoundException, so working scripts call it inside try and except and decide there what missing means:"],
  ["code","try:\n    spot = pyautogui.locateOnScreen('submit_button.png')\n    pyautogui.click(spot.left + 5, spot.top + 5)\nexcept pyautogui.ImageNotFoundException:\n    print('button is not on screen')"],
  ["p","The matching is pixel-perfect. A single pixel one shade off — an antialiasing difference, a hover highlight, a changed display scaling factor — and the image is not found. Screenshots taken on one machine rarely locate anything on another. Treat image recognition as fragile glue, kept for the cases nothing sturdier covers."],
  ["note","The coordinates that worked yesterday fail quietly today: the window opened 40 pixels lower, the resolution changed, a toolbar appeared, and every hardcoded (x, y) in the script now points at something else. The script still runs — pyautogui happily clicks whatever is there now. When a GUI script misbehaves, suspect the coordinates before the logic, and reharvest them with mouseInfo()."]
]},
{ t: "Windows, message boxes, and pacing",
  body: [
  ["p","Sturdier than matching pixels: ask the operating system where a window is. pyautogui bundles the PyGetWindow package for this — though as of version 1.0.0 these functions work only on Windows, not macOS or Linux. getActiveWindow() returns an object for the window currently accepting keyboard input, carrying its geometry as plain numbers and its title as a string. getAllTitles() lists every open window's title, getWindowsWithTitle() finds windows by name, and getWindowsAt(x, y) finds the ones under a point. The window objects also act: maximize(), minimize(), activate(), resizeTo(), moveTo(), and close() drive the window frame itself:"],
  ["code","import pyautogui\nwin = pyautogui.getActiveWindow()\nprint(win.title, win.left, win.top, win.width, win.height)\nwin.maximize()"],
  ["p","A window's rectangle is four numbers — left, top, width, height — and everything else about it is arithmetic on those. Where does a window at (500, 300) that is 2070 wide and 1208 tall end? Plain Python answers, and this part runs anywhere:"],
  ["code","left, top, width, height = 500, 300, 2070, 1208\nright = left + width\nbottom = top + height\nprint('right edge at x =', right)\nprint('bottom edge at y =', bottom)\nprint('last pixel inside:', right - 1, bottom - 1)"],
  ["code","right edge at x = 2570\nbottom edge at y = 1508\nlast pixel inside: 2569 1507"],
  ["p","GUI scripts also need a voice, and print() goes to a terminal the user may not be watching. pyautogui's message boxes pop dialogs instead: alert(text) shows the text with an OK button, confirm(text) offers OK and Cancel and returns the choice as a string, prompt(text) collects a typed line, and password(text) does the same behind asterisks:"],
  ["code","pyautogui.alert('The batch is finished.')\nanswer = pyautogui.confirm('Process the next folder?')\nlabel = pyautogui.prompt('Name for this run?')"],
  ["p","Pacing functions round out a script's manners. pyautogui.sleep(3) is time.sleep(3) without the import, and pyautogui.countdown(10) prints the numbers ten down to one, a second apart, while you arrange the windows the script is about to use. The habit worth copying: begin every GUI script with a countdown, so there is time to reach a corner if the first click turns out to be aimed wrong:"],
  ["code","pyautogui.countdown(5)\npyautogui.click(880, 440)"],
  ["note","right is left + width — and that column of pixels is the first one OUTSIDE the window. A window 200 wide starting at x = 600 occupies columns 600 through 799, and a click at x = 800 misses it. Writing left <= x <= left + width when testing whether a point is inside counts one column too many, and the bug only bites for clicks exactly on the edge — the worst kind of sometimes."]
]},
{ t: "A cursor simulator: plans you can verify",
  body: [
  ["p","A pyautogui script is a plan wrapped around a delivery mechanism. The delivery — real events on a real desktop — cannot run here, and does not need to: every mistake this chapter has warned about was arithmetic, not hardware. Wrong absolute coordinates, offsets applied the wrong way, clicks landing outside their window. Plans are lists, tuples, and arithmetic, and those run anywhere Python runs, including this app's grader. So build the practice version: a simulated cursor that follows the same rules and can be checked by execution."],
  ["p","Start with the core motion rule — a relative move adds its offsets to the current position, exactly as pyautogui.move() does. A walk is then a list of offset pairs and one loop:"],
  ["code","x, y = 800, 450\nmoves = [(120, 0), (0, -200), (-60, 35)]\nfor dx, dy in moves:\n    x = x + dx\n    y = y + dy\nprint('cursor ends at', x, y)"],
  ["code","cursor ends at 860 285"],
  ["p","A real cursor cannot leave the screen, so the simulator should not either. Pin it to a 1920x1080 display with a clamp: min() caps a coordinate at the last legal pixel, then max() lifts it back to zero if it went negative. A move aimed at x = 2500 stops at column 1919:"],
  ["code","WIDTH, HEIGHT = 1920, 1080\n\ndef clamp(x, y):\n    x = max(0, min(x, WIDTH - 1))\n    y = max(0, min(y, HEIGHT - 1))\n    return x, y\n\nprint(clamp(960, 540))\nprint(clamp(2500, 700))\nprint(clamp(-80, 1300))"],
  ["code","(960, 540)\n(1919, 700)\n(0, 1079)"],
  ["p","Now make the whole plan data: a list of tuples whose first element names the action and whose rest are its arguments. That is exactly the information a pyautogui script encodes, minus the desktop. A function walks the list with an if/elif chain, tracking the cursor and recording where every click lands — clamp() from the last listing stays in service:"],
  ["code","def run_plan(plan, x, y):\n    clicks = []\n    for step in plan:\n        if step[0] == 'moveto':\n            x, y = clamp(step[1], step[2])\n        elif step[0] == 'move':\n            x, y = clamp(x + step[1], y + step[2])\n        elif step[0] == 'click':\n            clicks.append((x, y))\n    return x, y, clicks\n\nplan = [('moveto', 640, 400), ('click',), ('move', 0, 130), ('click',),\n        ('move', 300, -600), ('click',)]\nx, y, clicks = run_plan(plan, 0, 0)\nprint('final position:', x, y)\nprint('clicks landed at:', clicks)"],
  ["code","final position: 940 0\nclicks landed at: [(640, 400), (640, 530), (940, 0)]"],
  ["p","Read the click record against the plan. The third move was meant to go up 60 pixels and someone typed 600; the raw target was (940, -70), the clamp caught the escape at the top edge, and the click landed at (940, 0). On a real desktop that is a click into the menu bar of whatever is frontmost. The simulator turned a would-be misfire into a line of output you can read before any damage is possible."],
  ["p","The fail-safe corner test is two membership checks — a corner is an x at either horizontal extreme paired with a y at either vertical extreme. The same session continues:"],
  ["code","def in_corner(x, y):\n    return x in (0, WIDTH - 1) and y in (0, HEIGHT - 1)\n\nprint(in_corner(0, 0))\nprint(in_corner(1919, 1079))\nprint(in_corner(960, 0))"],
  ["code","True\nTrue\nFalse"],
  ["p","(960, 0) reports False: the top edge is not a corner, which is why the real fail-safe asks for a corner slam and not merely an edge. Last, hit-testing. A click is inside a window when its x falls in the half-open span from left up to but not including left + width, and its y does the same with top and height — the edge arithmetic from the previous section, written as a function. Run the three recorded clicks against a window at (600, 350), 200 wide and 250 tall:"],
  ["code","def inside(x, y, left, top, width, height):\n    return left <= x < left + width and top <= y < top + height\n\nhits = 0\nfor cx, cy in clicks:\n    if inside(cx, cy, 600, 350, 200, 250):\n        hits = hits + 1\nprint(hits, 'of', len(clicks), 'clicks landed in the window')"],
  ["code","2 of 3 clicks landed in the window"],
  ["p","Two clicks hit; the clamped misfire at (940, 0) missed, exactly as it would have missed on the desktop. This is the half of GUI automation a grader can hold you to, and the exercises below drill it: walk a cursor through relative moves, count clicks inside a rectangle, expand a hotkey into its press and release sequence, and process an action plan with a function."],
  ["note","A passing simulation proves the plan's geometry, not the desktop's cooperation. The screen a plan was written for can still change underneath it — which is what the pauses, the fail-safe, and locateOnScreen() are for. Trust the arithmetic here; verify the desktop there."]
]},
{ t: "Summary",
  body: [
  ["p","pyautogui gives Python your hands. moveTo() and move() steer the cursor absolutely and relatively, click(), dragTo(), drag(), and scroll() work the buttons and wheel, and write(), press(), keyDown(), keyUp(), and hotkey() work the keyboard — hotkey() pressing its arguments in order and releasing them in reverse. Around the hands sit the eyes and the voice: screenshot(), pixel(), and pixelMatchesColor() look at the screen, locateOnScreen() finds a saved image pixel-perfectly or raises ImageNotFoundException, the window functions ask the operating system for real geometry on Windows, and alert(), confirm(), prompt(), and password() talk to the user. Before all of it come the controls — the PAUSE gap after every call, the four-corner fail-safe raising FailSafeException, a countdown before the first click, and logging out as the last resort."],
  ["p","The part you keep even without a desktop is the grid: (0, 0) at top-left, y growing downward, every position a pair of integers, every window four of them, every plan a list of steps over that grid. That is what the graded exercises below hold you to, in built-in Python. The next chapter hands the computer a different pair of human tools entirely — Chapter 24 covers text-to-speech and speech recognition engines, where programs speak aloud and listen back."]
]}
],
questions: [
{ q:"A GUI automation script is misbehaving and the mouse is being driven. What is the fastest way to stop it, and what happens inside the library when you do?",
  a:"Slam the cursor into any of the four corners of the screen. The next pyautogui call finds the cursor there and raises pyautogui.FailSafeException instead of performing its action; uncaught, that ends the program. The one-tenth-of-a-second pause after every call is what guarantees your hand a gap to reach the corner in." },
{ q:"On a 1920x1080 display, what are the coordinates of the top-left and bottom-right pixels — and why is the bottom-right not (1920, 1080)?",
  a:"(0, 0) and (1919, 1079). Counting starts at zero, so 1920 columns are numbered 0 through 1919 and 1080 rows are numbered 0 through 1079 — the last pixel is at width minus one, height minus one." },
{ q:"The cursor sits at (600, 400). Where is it after pyautogui.moveTo(50, 100) — and where after pyautogui.move(50, 100) instead?",
  a:"moveTo(50, 100) is absolute: the cursor lands at (50, 100) regardless of where it started. move(50, 100) is relative: 50 right and 100 down from (600, 400) puts it at (650, 500)." },
{ q:"What does the duration keyword argument change in moveTo(), dragTo(), and their relatives, and what happens when you leave it out?",
  a:"It sets how many seconds the motion takes. Left out, it defaults to 0 and the cursor jumps instantly. Instant moves are fine; instant drags are the ones some applications fail to register, so drags in particular deserve a duration." },
{ q:"What makes drag(0, 200) different from move(0, 200)?",
  a:"Both shift the cursor 200 pixels down from where it sits. drag() does it with the left mouse button held down, so the motion selects, draws, or moves whatever the application puts under a held button; move() just relocates the cursor." },
{ q:"List the exact press and release events, in order, produced by pyautogui.hotkey('ctrl', 'alt', 's').",
  a:"Press ctrl, press alt, press s — then release s, release alt, release ctrl. hotkey() presses its arguments in the order given and releases them in reverse order, the same order your fingers use." },
{ q:"Your script calls locateOnScreen('save_icon.png') and crashes on some mornings but not others. What is happening, and what is the fix?",
  a:"When no pixel-perfect match for the image is on screen — a theme change, a hover highlight, or a scaling difference is enough — locateOnScreen() raises pyautogui.ImageNotFoundException, and uncaught it ends the script. Call it inside try and except, and decide in the except block what the script should do when the image is missing." },
{ q:"A window reports left=500, top=300, width=2070, height=1208. Where are its right and bottom edges, and what is the last pixel inside it?",
  a:"right = left + width = 2570 and bottom = top + height = 1508 — and both of those name the first column and row OUTSIDE the window. The last pixel inside is (2569, 1507)." },
{ q:"In the chapter's simulator, the cursor is at the center of the 1920x1080 screen, (960, 540), and the next step is ('move', -1000, -600). Where does the clamped cursor end up, and what would a real pyautogui call do next?",
  a:"The raw target is (-40, -60); clamp() pins it to (0, 0), the top-left corner. A real pyautogui call finding the cursor there would raise pyautogui.FailSafeException — the plan has slammed its own fail-safe." },
{ q:"A window sits at left=600, top=350, width=200, height=250. Which of the clicks (700, 400), (799, 500), and (800, 500) land inside it?",
  a:"The first two. The x span runs from 600 up to but not including 800, so 799 is the last column inside and 800 is already out. The half-open test left <= x < left + width is what gets the edge exactly right." }
],
exercises: [
{ c:"loops", t:"Walk the cursor", book:"ch23",
  b:"A simulated cursor starts at x = 400, y = 300. moves = [(150, 0), (0, 125), (-90, -40), (200, 15)] lists relative moves, pyautogui.move() style — each pair adds to the current position. Apply them in order, then print 'Final position:' followed by x and y.",
  o:"Final position: 660 400",
  h:["Each move is relative — it adds to where the cursor already is. The new x is the old x plus the first number of the pair.",
     "for dx, dy in moves: unpacks each pair as the loop reaches it. Update x with dx and y with dy in the body.",
     "The body is x = x + dx and y = y + dy; after the loop ends, print('Final position:', x, y)."]},
{ c:"lists", t:"Clicks in the window", book:"ch23",
  b:"A window occupies x from 200 up to but not including 600, and y from 150 up to but not including 450 — left 200, top 150, width 400, height 300. clicks = [(250, 200), (600, 300), (199, 149), (599, 449), (400, 500)] records five clicks. Count the clicks that land inside the window and print 'Inside:' followed by the count.",
  o:"Inside: 2",
  h:["A click is inside only when its x falls in the window's x span and its y falls in the y span — two tests joined with and.",
     "Python chains comparisons: 200 <= x < 600 is one test for the whole x span. Unpack each click with for x, y in clicks.",
     "Start count at 0. In the loop: if 200 <= x < 600 and 150 <= y < 450, add 1 to count. After the loop, print('Inside:', count)."]},
{ c:"lists", t:"Spell out the hotkey", book:"ch23",
  b:"hotkey = ('ctrl', 'alt', 's'). A hotkey call presses its keys in the order given, then releases them in reverse order. Build a list of the six event strings — 'press ctrl', 'press alt', 'press s', 'release s', 'release alt', 'release ctrl' — and print them joined with a comma and a space.",
  o:"press ctrl, press alt, press s, release s, release alt, release ctrl",
  h:["Two passes over the same tuple — forward for the presses, backward for the releases — appending strings to one list.",
     "reversed(hotkey) walks the tuple backward. Build each string as 'press ' + k or 'release ' + k, and ', '.join(events) glues the finished list into one line.",
     "First loop: for k in hotkey, append 'press ' + k. Second loop: for k in reversed(hotkey), append 'release ' + k. Then print(', '.join(events))."]},
{ c:"functions", t:"Run the plan", book:"ch23",
  b:"Write run_plan(plan) for a cursor that starts at (0, 0). A ('moveto', x, y) step jumps to (x, y), ('move', dx, dy) shifts by the offsets, and ('click',) counts one click. The function returns the final x, the final y, and the click count. Run it on plan = [('moveto', 300, 200), ('click',), ('move', 45, -80), ('click',), ('move', -120, 60), ('click',)] and print one line: 'Ends at' followed by x and y, then 'after', the click count, and 'clicks', all space-separated.",
  o:"Ends at 225 180 after 3 clicks",
  h:["The function tracks three values — x, y, and a click count — and step[0] tells it which kind of step it is looking at.",
     "An if/elif chain on step[0]: 'moveto' assigns step[1] and step[2] to x and y, 'move' adds them instead, and 'click' adds 1 to the count. Return all three with return x, y, clicks.",
     "Unpack the call as x, y, clicks = run_plan(plan), then print('Ends at', x, y, 'after', clicks, 'clicks')."]}
]
};
