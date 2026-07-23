/* Practice Log book — Chapter 1: Python Basics.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch01 = {
n: 1,
title: "Python Basics",
src: "https://automatetheboringstuff.com/3e/chapter1.html",
blurb: "Expressions, data types, variables, and your first program.",
sections: [
{ t: "Expressions and the interactive shell",
  body: [
  ["p","The fastest way to learn what Python does is to type single instructions at it and watch what comes back. The interactive shell (also called the REPL) does exactly that: you enter one instruction, Python runs it immediately and shows the result. Everything in this chapter can be tried there, and you should — reading about code is not the same as watching it evaluate."],
  ["p","The most basic kind of instruction is an expression: values combined with operators, like 2 + 2. Every expression evaluates down to a single value. That idea carries the whole language — wherever Python expects a value, you can use any expression that produces one."],
  ["code",">>> 2 + 2\n4\n>>> 2 + 3 * 6\n20\n>>> (2 + 3) * 6\n30"],
  ["p","Operators follow the precedence you know from math: ** first, then * / // %, then + and -, with parentheses overriding everything. When a line surprises you, add parentheses until it says what you mean."],
  ["code",">>> 23 / 7\n3.2857142857142856\n>>> 23 // 7\n3\n>>> 23 % 7\n2\n>>> 2 ** 4\n16"],
  ["p","Four operators matter more than they look: / is division and always produces a decimal result, // is integer division that floors the result, % gives the remainder after division, and ** is exponentiation. The remainder operator turns out to be the workhorse — testing divisibility, wrapping around a range, splitting a number into digits."],
  ["note","A lone value like 2 is also an expression — it evaluates to itself. An expression with a dangling operator, like 5 +, is not, and the shell will answer with a syntax error naming the line. Error messages are information, not punishment; read them."]
]},
{ t: "The integer, floating-point, and string data types",
  body: [
  ["p","Every value has a data type. A whole number like -2 or 30 is an integer (int). A number with a decimal point like 3.25 is a floating-point number (float). Text is a string (str), written inside quotes: 'Hello'. The type decides what the value can do — and 4 the int is a different value from 4.0 the float and '4' the string, even though a person reads all three the same way."],
  ["code",">>> 5 - 2.5\n2.5\n>>> 'Hello'\n'Hello'"],
  ["p","Mixing ints and floats in arithmetic is fine — the result is a float. Mixing numbers and strings is not: Python refuses to guess whether you wanted addition or joining, and raises a TypeError instead. That strictness feels fussy for a week and then starts catching your bugs for you."],
  ["code",">>> 'Alice' + 42\nTypeError: can only concatenate str (not \"int\") to str"]
]},
{ t: "String concatenation and replication",
  body: [
  ["p","Operators change meaning with the types they are given. On two strings, + is concatenation — it joins them into one string, with no space added unless you put one there. On a string and an integer, * is replication — it repeats the string that many times."],
  ["code",">>> 'Alice' + 'Bob'\n'AliceBob'\n>>> 'Alice' * 3\n'AliceAliceAlice'\n>>> 'spam' * 5\n'spamspamspamspamspam'"],
  ["p","The combinations that make no sense raise errors: 'x' * 'y' fails because repeating a string a string-number of times means nothing, and 'Alice' * 3.5 fails because you cannot repeat something a fractional number of times. When an operator meets types it has no rule for, Python stops and tells you rather than inventing an answer."]
]},
{ t: "Storing values in variables",
  body: [
  ["p","A variable is a name that stores a value so you can use it later. You create one with an assignment statement: spam = 40 binds the name spam to the value 40. From then on, using spam in an expression is the same as using the value it holds."],
  ["code",">>> spam = 40\n>>> spam + 2\n42"],
  ["p","Assigning again overwrites the old value — a variable holds one value at a time, and it is always the most recent one. It can even change type: the name spam can hold 40 now and 'Hello' a moment later. Python does not mind; the type lives with the value, not the name."],
  ["code",">>> spam = 'Hello'\n>>> spam + ' world'\n'Hello world'"],
  ["p","Names have three rules: one word with no spaces, only letters, numbers, and the underscore, and not starting with a number. spam, my_name, and account4 are legal; my name, my-name, and 4account are not. Case matters — spam and Spam are different variables. Beyond legality there is judgement: a name should say what the value is for. total_price tells the next reader something; tp tells them nothing."]
]},
{ t: "Your first program",
  body: [
  ["p","The shell runs one instruction at a time; a program is a file of instructions run top to bottom. This one uses everything the chapter has introduced. In this app you will write programs in the editor below each exercise; here, read it line by line and predict what it does."],
  ["code","# This program says hello and asks for my name.\nprint('Hello, world!')\nprint('What is your name?')\nmy_name = input()\nprint('It is good to meet you, ' + my_name)\nprint('The length of your name is ' + str(len(my_name)))\nprint('What is your age?')\nmy_age = input()\nprint('You will be ' + str(int(my_age) + 1) + ' in a year')"],
  ["p","A sample run, with the user typing Al and then 4:"],
  ["code","Hello, world!\nWhat is your name?\nIt is good to meet you, Al\nThe length of your name is 2\nWhat is your age?\nYou will be 5 in a year"],
  ["note","Exercises in this app hardcode their inputs instead of calling input(), because submissions are graded by running your code non-interactively. The functions are the same; only where the value comes from differs."]
]},
{ t: "Dissecting your program",
  body: [
  ["p","The first line is a comment. Anything after a # is ignored by Python; it exists for the human reader. print() displays whatever value you hand it on the screen. input() waits for the user to type a line and press enter, then hands that line back — and this is the detail that bites everyone once: input() always returns a string, even when the user types digits."],
  ["p","len() takes a string and returns the number of characters in it, as an integer. That is why the program wraps it in str() before joining it to other text: len(my_name) is a number, and + will not join a number to a string."],
  ["code",">>> len('hello')\n5\n>>> str(29)\n'29'\n>>> int('42')\n42\n>>> float('3.14')\n3.14"],
  ["p","str(), int(), and float() convert a value to that type, which is how you cross between text and numbers on purpose. Two conversions worth memorizing: int('42') parses digits into a number and raises ValueError on anything else, and int(7.7) truncates to 7 — it drops the fraction, it does not round."],
  ["code",">>> int(7.7)\n7\n>>> int('hello')\nValueError: invalid literal for int() with base 10: 'hello'"],
  ["p","That is the whole machinery of the age line: input() produces the string '4', int() turns it into 4, adding 1 gives 5, and str() turns it back into '5' so print() can join it into the sentence."]
]},
{ t: "Summary",
  body: [
  ["p","Expressions are values and operators, and they evaluate to a single value. Values have types — integer, float, string — and the type decides what an operator does, including refusing combinations that make no sense. Variables store one value at a time under a name you choose. Programs are instructions run in order, and print(), input(), len(), str(), int(), and float() are enough to write one that talks back."],
  ["p","Work the practice questions from memory before revealing the answers, then clear the graded exercises below. The next chapter is flow control — making programs decide and repeat."]
]}
],
questions: [
{ q:"Which of these are operators, and which are values?  *  'hello'  -88.8  -  /  +  5",
  a:"The operators are *, -, /, and +. The values are 'hello' (a string), -88.8 (a float), and 5 (an integer)." },
{ q:"What is an expression made of, and what does every expression do?",
  a:"An expression is values combined with operators. Every expression evaluates down to a single value — 2 + 2 evaluates to 4, and a lone value like 2 is itself an expression." },
{ q:"spam = 10 is not an expression. What is it called, and what does it do?",
  a:"It is an assignment statement. It stores the value 10 in the variable named spam; it does not evaluate to a value itself." },
{ q:"What is the difference between the integer, floating-point, and string types?",
  a:"An int is a whole number like 30. A float has a decimal point like 3.25. A string is text inside quotes like 'Hello' — even '30' is text, not a number." },
{ q:"What does 'spam' + 'spamspam' evaluate to? And 'spam' * 3?",
  a:"Both evaluate to 'spamspamspam'. + on two strings concatenates them; * on a string and an integer replicates the string that many times." },
{ q:"Why is 100 an invalid variable name?",
  a:"A variable name cannot begin with a number. hundred or n100 would be legal; 100 is just the integer value one hundred." },
{ q:"What three functions convert a value to an integer, a float, and a string?",
  a:"int(), float(), and str()." },
{ q:"Why does 'I ate ' + 99 + ' burritos' cause an error, and how do you fix it?",
  a:"+ will not join a string to an integer — it raises a TypeError. Convert the number first: 'I ate ' + str(99) + ' burritos' evaluates to 'I ate 99 burritos'." },
{ q:"What does len('automate') return, and what type is the result?",
  a:"8, as an integer — len() counts the characters in the string." },
{ q:"What does int(7.9) evaluate to — 7 or 8?",
  a:"7. int() truncates a float toward zero; it drops the fraction rather than rounding. round(7.9) is what gives 8." }
],
exercises: [
{ c:"variables & types", t:"Order of operations", book:"ch01",
  b:"Print the result of 2 + 3 * 6, then (2 + 3) * 6, then 2 ** 8, each on its own line.",
  o:"20\n30\n256",
  h:["Three print() calls, one expression inside each.",
     "Precedence: * binds before +, parentheses override, ** is exponentiation.",
     "print(2 + 3 * 6), then the parenthesised version, then print(2 ** 8)"]},
{ c:"strings", t:"Join and repeat", book:"ch01",
  b:"Print 'Alice' joined to 'Bob' on one line, then 'spam' repeated 3 times, then the number of characters in 'automate'. Three lines of output.",
  o:"AliceBob\nspamspamspam\n8",
  h:["Each line is one operator or one function on strings.",
     "+ concatenates two strings, * replicates one, len() counts characters.",
     "print('Alice' + 'Bob'), print('spam' * 3), print(len('automate'))"]},
{ c:"variables & types", t:"Name and age", book:"ch01",
  b:"Store name = 'Ada' and age = 36 in variables. Print 'My name is Ada' by joining the variable into the sentence, then print 'Next year I will be 37' using age + 1.",
  o:"My name is Ada\nNext year I will be 37",
  h:["Joining a number into text needs a conversion.",
     "+ joins strings only; str() turns the number into text first.",
     "print('My name is ' + name), then print('Next year I will be ' + str(age + 1))"]},
{ c:"variables & types", t:"Minutes in a week", book:"ch01",
  b:"Store the number of minutes in a day (60 * 24) in a variable and print it. Then print the number of minutes in a week using that variable.",
  o:"1440\n10080",
  h:["Compute once, store it, reuse the variable.",
     "The second line is your variable times 7.",
     "minutes_per_day = 60 * 24, print it, then print(minutes_per_day * 7)"]}
]
};
