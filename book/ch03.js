/* Practice Log book — Chapter 3: Loops.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch03 = {
n: 3,
title: "Loops",
src: "https://automatetheboringstuff.com/3e/chapter3.html",
blurb: "while, for, break, continue, and range() — the statements that make a program repeat.",
sections: [
{ t: "The while statement",
  body: [
  ["p","A while statement runs its block again and again, for as long as its condition keeps answering True. On the page it is an if with a different keyword — condition, colon, indented block — and the difference is all in what happens at the bottom of the block. An if statement moves on. A while statement jumps back up to the condition and asks again."],
  ["code","n = 1\nif n <= 5:\n    print('lap ' + str(n))\n    n = n + 1\nprint('done')"],
  ["code","lap 1\ndone"],
  ["p","With if, the block ran once and execution fell through to the final print. Change one word and the same block becomes a loop. After every pass, Python re-evaluates n <= 5, and only a False answer lets the program continue past the block:"],
  ["code","n = 1\nwhile n <= 5:\n    print('lap ' + str(n))\n    n = n + 1\nprint('done')"],
  ["code","lap 1\nlap 2\nlap 3\nlap 4\nlap 5\ndone"],
  ["p","Each pass through the block is called an iteration. This loop runs five iterations, and the condition is evaluated six times — the sixth check, with n at 6, is the one that answers False and ends the loop. The n = n + 1 line is what moves the loop toward that ending; a while loop only stops if something inside it changes what the condition measures."],
  ["note","Delete the n = n + 1 line and n stays 1, every check answers True, and the loop runs forever — an infinite loop, the classic loop bug. In a terminal, ctrl-C forces a stuck program to stop; if you ran it in this app, reload the page. Then find the variable the condition depends on and ask which line was supposed to change it."]
]},
{ t: "Waiting for the right answer",
  body: [
  ["p","The most common job for a while loop is refusing to move on. The program below asks the same question until it hears the answer it wants. The variable is primed with an empty string so that the first check answers True and execution enters the loop at all — on pass one there is nothing else answer could hold."],
  ["code","answer = ''\nwhile answer != 'yes':\n    print('Shall we begin? Type yes to continue.')\n    answer = input()\nprint('Beginning.')"],
  ["p","A run, with the user typing no, then later, then yes. The prompt prints once per iteration — one for each answer the loop considered — and the third answer is the one that makes answer != 'yes' answer False:"],
  ["code","Shall we begin? Type yes to continue.\nShall we begin? Type yes to continue.\nShall we begin? Type yes to continue.\nBeginning."],
  ["p","Look closely at what the condition compares: exactly the string yes. A user who types Yes or YES stays in the loop, because string equality is case-sensitive, as chapter 2 showed. Real programs usually normalise input before comparing it; the string tools for that arrive in a later chapter."],
  ["note","As in earlier chapters, the graded exercises below never call input(), because submissions are graded by running your code non-interactively. Each exercise hardcodes its inputs instead. The loops behave identically; only where the values come from differs."]
]},
{ t: "break statements",
  body: [
  ["p","break ends a loop from inside its block. The moment execution reaches the word, the loop is over and the program resumes after the block — the condition never gets another look. Its natural partner is while True, a condition that can never end the loop on its own, which makes the break inside the only way out."],
  ["code","while True:\n    print('Say the vault word.')\n    word = input()\n    if word == 'tangerine':\n        break\n    print('Wrong word.')\nprint('The vault swings open.')"],
  ["p","A run, with the user typing sesame and then tangerine:"],
  ["code","Say the vault word.\nWrong word.\nSay the vault word.\nThe vault swings open."],
  ["p","Compare this loop with the previous section's. The while True shape reads in a different order — take the answer in, then decide whether to leave — and it needs no priming line, because the condition no longer inspects the variable. Both shapes are common. Pick the one whose reading order matches the logic in your head."],
  ["note","break only ends the loop when execution actually reaches it. A break sitting behind an if that never fires does nothing, and the while True loop it was supposed to stop is still infinite. When that happens, print the value the if inspects and compare it to your condition, character by character."]
]},
{ t: "continue statements and truthy values",
  body: [
  ["p","continue is break with less commitment. Where break abandons the loop, continue abandons only the current pass: execution jumps straight back to the condition, and whatever remained of the block is skipped. The loop below uses it to step over multiples of 3, picked out with the remainder operator from chapter 1 — n % 3 is 0 exactly when 3 divides n."],
  ["code","n = 0\nwhile n < 8:\n    n = n + 1\n    if n % 3 == 0:\n        continue\n    print(n)"],
  ["code","1\n2\n4\n5\n7\n8"],
  ["p","On the passes where n reaches 3 and 6, the continue fires and the print is skipped; every other pass falls past the if and prints. The count still advances on every pass, because the n = n + 1 sits safely above the continue."],
  ["note","That position is load-bearing. Move n = n + 1 below the if and the very first pass jams: n is 0, 0 % 3 is 0, continue jumps back before the counter moves, and the same pass repeats forever, printing nothing. When a loop with continue hangs, ask what the continue is jumping over."],
  ["p","Conditions are not limited to comparisons — any value can stand where True or False is expected, because every value counts as either truthy or falsy. Of the types met so far, 0, 0.0, and the empty string are falsy; everything else is truthy. Passing a value to bool() shows which side it falls on:"],
  ["code",">>> bool(0)\nFalse\n>>> bool(0.0)\nFalse\n>>> bool('')\nFalse\n>>> bool(7)\nTrue\n>>> bool('ok')\nTrue"],
  ["p","Truthiness is why while tickets: below is a working condition. It reads as while tickets is not zero, and the loop ends at the exact moment the count runs out:"],
  ["code","tickets = 3\nwhile tickets:\n    print('ticket ' + str(tickets) + ' sold')\n    tickets = tickets - 1\nprint('none left')"],
  ["code","ticket 3 sold\nticket 2 sold\nticket 1 sold\nnone left"]
]},
{ t: "for loops and the range() function",
  body: [
  ["p","A while loop runs for as long as something holds. When you know instead how many times the block should run, reach for a for loop and range(). The statement below reads: for each value range(4) produces, run the block once, with i holding the current value."],
  ["code","for i in range(4):\n    print('beep ' + str(i))"],
  ["code","beep 0\nbeep 1\nbeep 2\nbeep 3"],
  ["p","Two things here surprise almost everyone. The count starts at 0, not 1, and it stops before the number you gave — range(4) produces 0, 1, 2, 3. The block still runs exactly four times, and that is the real meaning of the argument: it is the number of iterations, not the last value printed."],
  ["p","A for loop is a while loop with the bookkeeping folded in. Written out by hand, the same program needs a priming line, a comparison, and an increment — the three jobs for was quietly doing:"],
  ["code","i = 0\nwhile i < 4:\n    print('beep ' + str(i))\n    i = i + 1"],
  ["code","beep 0\nbeep 1\nbeep 2\nbeep 3"],
  ["p","The loop variable does not have to appear inside the block. Here i is nothing but a run counter while another variable does the work, doubling a number ten times over:"],
  ["code","rice = 1\nfor i in range(10):\n    rice = rice * 2\nprint(rice)"],
  ["code","1024"],
  ["p","range() takes up to three arguments: a start, a stop, and a step. With two arguments the count begins where you say instead of at 0 — the stop stays excluded. A third argument sets the jump between values, and making it negative turns the count into a countdown:"],
  ["code","for i in range(3, 8):\n    print(i)"],
  ["code","3\n4\n5\n6\n7"],
  ["code","for i in range(0, 25, 5):\n    print(i)"],
  ["code","0\n5\n10\n15\n20"],
  ["code","for i in range(10, 0, -2):\n    print(i)\nprint('Go')"],
  ["code","10\n8\n6\n4\n2\nGo"],
  ["note","range(5, 0) is not a countdown. Counting up from 5 with the default step of 1, there is nothing before the stop of 0, so the loop body never runs — no values, no error, nothing. A loop that silently does nothing usually has an empty range behind it. Counting down must be said in the step: range(5, 0, -1)."]
]},
{ t: "Modules, random numbers, and sys.exit()",
  body: [
  ["p","Python's standard library arrives as modules — named bundles of functions that exist for your program only after an import statement. Use one without importing it and the name is simply undefined:"],
  ["code",">>> random.randint(1, 6)\nNameError: name 'random' is not defined"],
  ["p","One line cures that for the whole program. random.randint(a, b) returns a whole number from a to b with both ends included, which makes the program below a six-sided die:"],
  ["code","import random\nprint('You rolled a ' + str(random.randint(1, 6)))"],
  ["p","No output is shown here, deliberately: there is no single right output to show. Each run prints some number from 1 to 6, and repeated runs disagree — this is the first program in the book designed to be unpredictable. There is also a from random import randint form that permits bare randint(1, 6); this book keeps the full random.randint spelling, which leaves the function's origin visible at the call."],
  ["p","The sys module carries sys.exit(), the function that ends the whole program immediately — not just a loop, everything:"],
  ["code","import sys\nprint('one')\nsys.exit()\nprint('two')"],
  ["code","one"],
  ["p","The second print is never reached. Inside a while True loop, sys.exit() is the harder cousin of break: break leaves the loop and lets the program continue below it; sys.exit() stops the program dead. This program logs orders until it hears the one that shuts it down:"],
  ["code","import sys\nwhile True:\n    print('Enter an order.')\n    order = input()\n    if order == 'all stop':\n        print('Engines halted.')\n        sys.exit()\n    print('Order logged: ' + order)"],
  ["p","A run, with the user typing half speed and then all stop:"],
  ["code","Enter an order.\nOrder logged: half speed\nEnter an order.\nEngines halted."]
]},
{ t: "A short program: the number hunt",
  body: [
  ["p","This game gathers up most of the chapter. random.randint() picks a secret, a while loop keeps the round alive until the guess matches, an if/elif chain hands out directions, and a counter keeps score. Read it slowly and work out what the guess = 0 line is for before running it."],
  ["code","import random\nsecret = random.randint(1, 50)\ntries = 0\nguess = 0\nwhile guess != secret:\n    print('Name a number from 1 to 50.')\n    guess = int(input())\n    tries = tries + 1\n    if guess < secret:\n        print('Higher.')\n    elif guess > secret:\n        print('Lower.')\nprint('Found it. Tries: ' + str(tries))"],
  ["p","One real run, captured as it happened: the secret came up 4, and the player closed in by typing 25, then 12, then 6, then 3, then 4. Your run will differ — the secret changes every time:"],
  ["code","Name a number from 1 to 50.\nLower.\nName a number from 1 to 50.\nLower.\nName a number from 1 to 50.\nLower.\nName a number from 1 to 50.\nHigher.\nName a number from 1 to 50.\nFound it. Tries: 5"],
  ["p","guess = 0 primes the loop the same way answer = '' did earlier: secret is always at least 1, so the first check of guess != secret is guaranteed True. When the guess finally lands, neither hint branch fires — there is deliberately no else — and the loop condition itself ends the round. The same skeleton, one randint plus a loop plus an if/elif chain, is how you would build rock, paper, scissors against the computer: roll 1 to 3, map each number to a move, compare moves to pick a winner. One deterministic round of it waits in the last graded exercise."]
]},
{ t: "Summary",
  body: [
  ["p","Loops are the second half of flow control. while repeats a block for as long as its condition answers True, and the condition only changes if the block changes what it measures — forget that, and you have written an infinite loop. break abandons the loop, continue abandons the pass, and while True plus break is a loop shape you will meet everywhere. for with range() runs a block a known number of times: counting from 0, stopping before the stop, jumping by the step."],
  ["p","import opens the standard library — random.randint() for numbers you cannot predict, sys.exit() for ending a program before its last line. Answer the practice questions from memory before revealing the answers, then clear the graded exercises below. The next chapter is functions — def, parameters, return values, and scope — where the programs you have been writing line by line start folding into named, reusable pieces."]
]}
],
questions: [
{ q:"An if statement and a while statement both have a condition and a block. What is the one difference in how they run?",
  a:"After an if block runs, execution moves on past the statement. After a while block runs, execution jumps back to the condition and checks it again — the block repeats for as long as the condition keeps answering True." },
{ q:"A while loop's condition is False the very first time it is checked. How many times does the block run?",
  a:"Zero. The condition is checked before every pass, including the first, so a False start skips the block entirely — a while loop is not guaranteed even one iteration." },
{ q:"What is the difference between break and continue?",
  a:"break ends the loop entirely: execution resumes after the block, and the condition is never consulted again. continue ends only the current pass: execution jumps back to the condition, and the loop may well keep going." },
{ q:"Which values are falsy, and what does that make a condition like while n: mean?",
  a:"Of the types met so far: 0, 0.0, and the empty string. Everything else is truthy. while n: behaves like while n != 0: — the loop runs until n reaches zero." },
{ q:"What values does range(4) produce, and how many times does for i in range(4): run its block?",
  a:"0, 1, 2, 3 — starting at 0 and stopping before 4. The block runs four times: the argument is the number of iterations, not the last value." },
{ q:"What does range(2, 11, 3) produce?",
  a:"2, 5, 8 — start at 2, jump by 3, stop before 11. The next value would be 11 itself, and the stop is always excluded." },
{ q:"Write a range() call that produces 3, 2, 1.",
  a:"range(3, 0, -1) — start at 3, step by -1, stop before 0. The negative step must be spelled out: range(3, 0) counts upward into an empty range and produces nothing at all." },
{ q:"A program calls random.randint(1, 6) and stops with NameError: name 'random' is not defined. What is missing?",
  a:"The line import random, before the call — usually at the top of the file. A module's functions exist for your program only once the module has been imported." },
{ q:"Both break and sys.exit() can end a while True loop. What is the difference?",
  a:"break ends only the loop; the program carries on with whatever follows the block. sys.exit() ends the whole program on the spot — nothing after it runs anywhere in the file. It also needs import sys first." },
{ q:"In the continue example, what goes wrong if the n = n + 1 line moves below the if/continue?",
  a:"The loop jams on the very first pass: n is 0, 0 % 3 is 0, so continue fires before the counter ever moves. The same pass then repeats forever with n still 0 — an infinite loop that prints nothing." }
],
exercises: [
{ c:"loops", t:"Launch countdown", book:"ch03",
  b:"Print the numbers 10 down to 1, one per line, then print 'Liftoff'. A loop must do the counting — not eleven print lines.",
  o:"10\n9\n8\n7\n6\n5\n4\n3\n2\n1\nLiftoff",
  h:["Counting down is just counting with a different step.",
     "range() takes a start, a stop, and a step — and the step can be negative. A while loop on a shrinking counter works too.",
     "range(10, 0, -1) visits 10 through 1. Print inside the loop; the Liftoff print goes after it, unindented."]},
{ c:"loops", t:"The multiplying machine", book:"ch03",
  b:"Multiply together every whole number from 1 to 6 using a loop and a running total, then print the single result.",
  o:"720",
  h:["Same pattern as totalling numbers with +, but with one twist at the start.",
     "A running product must start at 1 — start it at 0 and every multiplication leaves it at 0. Multiply the total by each loop value.",
     "total = 1 before the loop; total = total * i inside for i in range(1, 7); one print after the loop."]},
{ c:"loops", t:"Odd ones only", book:"ch03",
  b:"Using a loop over the numbers 1 to 10, print only the odd ones, each on its own line.",
  o:"1\n3\n5\n7\n9",
  h:["Some passes print, some passes must stay quiet.",
     "i % 2 is 1 for odd numbers and 0 for even — an if (or a continue) inside the loop decides. A range() step is the other route.",
     "Loop i from 1 to 10; when i % 2 == 1, print i; otherwise let the pass end without printing."]},
{ c:"conditionals", t:"Rock, paper, scissors: one round", book:"ch03",
  b:"Given computer = 'rock' and player = 'scissors', print 'Computer plays rock', then 'Player plays scissors', then the verdict on its own line: 'Tie' if the moves match, otherwise 'Computer wins' or 'Player wins'. Rock beats scissors, scissors beats paper, paper beats rock.",
  o:"Computer plays rock\nPlayer plays scissors\nComputer wins",
  h:["Two prints built from the variables with +, then one decision.",
     "Check the tie first with ==. After that, exactly three move pairs mean the computer wins; everything left over is a player win.",
     "elif for the computer: (computer is rock and player is scissors) or the other two winning pairs, joined with or. The else prints Player wins."]}
]
};
