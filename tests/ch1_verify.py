# Verify every code snippet shown in book/ch01.js.
# Shell-style examples: eval the expression, print its repr (what the REPL shows).
# Script-style examples: exec and capture stdout.
import io, contextlib

print("=== REPL-style (repr) ===")
repl = [
    "2 + 2",
    "2 + 3 * 6",
    "(2 + 3) * 6",
    "23 / 7",
    "23 // 7",
    "23 % 7",
    "2 ** 4",
    "5 - 2.5",
    "'Hello'",
    "'Alice' + 'Bob'",
    "'Alice' * 3",
    "'spam' * 5",
    "len('hello')",
    "len('')",
    "str(29)",
    "int('42')",
    "float('3.14')",
    "int(7.7)",
    "str(0) + str(2)",
    "40 + 2",
]
for e in repl:
    print(f"{e!r:28} -> {repr(eval(e))}")

print()
print("=== REPL errors ===")
for e in ["'Alice' + 42", "'x' * 'y'", "int('hello')"]:
    try:
        eval(e)
        print(f"{e!r} -> NO ERROR (unexpected)")
    except Exception as ex:
        print(f"{e!r:18} -> {type(ex).__name__}: {ex}")

print()
print("=== variable sequence ===")
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    spam = 40
    print(spam + 2)
    spam = 'Hello'
    print(spam + ' world')
print(buf.getvalue(), end='')

print()
print("=== first-program listing (with input simulated) ===")
# The book's first program uses input(); we show a transcript with canned input.
import builtins
answers = iter(['Al', '4'])
buf = io.StringIO()
real_input = builtins.input
def fake_input(prompt=''):
    v = next(answers)
    print(prompt + v) if False else None
    return v
builtins.input = fake_input
try:
    with contextlib.redirect_stdout(buf):
        # This is the program shown in the reader (hello.py)
        print('Hello, world!')
        print('What is your name?')
        my_name = input()
        print('It is good to meet you, ' + my_name)
        print('The length of your name is ' + str(len(my_name)))
        print('What is your age?')
        my_age = input()
        print('You will be ' + str(int(my_age) + 1) + ' in a year')
finally:
    builtins.input = real_input
print(buf.getvalue(), end='')

print()
print("=== graded exercises: reference solutions ===")
def run(code):
    buf = io.StringIO(); ns = {}
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    return buf.getvalue()

ex1 = """print(2 + 3 * 6)
print((2 + 3) * 6)
print(2 ** 8)"""
ex2 = """print('Alice' + 'Bob')
print('spam' * 3)
print(len('automate'))"""
ex3 = """name = 'Ada'
age = 36
print('My name is ' + name)
print('Next year I will be ' + str(age + 1))"""
ex4 = """minutes_per_day = 60 * 24
print(minutes_per_day)
print(minutes_per_day * 7)"""
for i, ex in enumerate([ex1, ex2, ex3, ex4], 1):
    print(f"--- ex{i} ---")
    print(run(ex), end='')

print()
print("=== practice-question executable claims ===")
q = [
    ("'spam' + 'spamspam'", repr('spam' + 'spamspam')),
    ("'spam' * 3", repr('spam' * 3)),
    ("len('automate')", repr(len('automate'))),
    ("str(99)", repr(str(99))),
    ("int('99')", repr(int('99'))),
    ("int(7.9)", repr(int(7.9))),
    ("float(7)", repr(float(7))),
    ("'I ate ' + str(99) + ' burritos'", repr('I ate ' + str(99) + ' burritos')),
]
for e, r in q:
    print(f"{e:36} -> {r}")
try:
    eval("'I ate ' + 99 + ' burritos'")
    print("concat int -> NO ERROR (unexpected)")
except Exception as ex:
    print(f"'I ate ' + 99 + ' burritos' -> {type(ex).__name__}")
