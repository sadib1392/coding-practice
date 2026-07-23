# Verify every code snippet shown in book/ch20.js.
# Same self-checking pattern as ch2_verify.py: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between the
# chapter text and real execution fails the run.
# This chapter's safety rule: NOTHING here touches the network. The ezgmail,
# smtplib, and requests blocks in the chapter are shown without outputs and are
# deliberately NOT executed. What runs here is the deterministic stdlib core:
# email.message.EmailMessage construction and JSON Lines parsing.
import io, contextlib, builtins, sys

fails = 0
def check(label, got, want):
    global fails
    ok = got == want
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        fails += 1
        print(f"     got:  {got!r}")
        print(f"     want: {want!r}")

def repl_seq(label, steps, expected):
    # steps: list of (code, is_stmt) sharing one namespace.
    # expected: list of repr/error strings for the non-statement steps.
    ns = {}
    got = []
    for code, is_stmt in steps:
        if is_stmt:
            exec(code, ns)
        else:
            try:
                got.append(repr(eval(code, ns)))
            except Exception as ex:
                got.append(f"{type(ex).__name__}: {ex}")
    check(label, got, expected)

def run(code, inputs=None):
    buf = io.StringIO()
    ns = {}
    real = builtins.input
    if inputs is not None:
        it = iter(inputs)
        builtins.input = lambda prompt='': next(it)
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, ns)
    finally:
        builtins.input = real
    return buf.getvalue().rstrip("\n")

def check_raises(label, fn, want):
    # For statements that the chapter shows raising: want is "Type: message".
    global fails
    try:
        fn()
        check(label, "no exception was raised", want)
    except Exception as ex:
        check(label, f"{type(ex).__name__}: {ex}", want)

print("=== section: A message is text (hand-built) ===")
check("hand-built message program",
    run("""message = 'From: kavya@example.com\\nTo: renn@example.com'
message = message + '\\nSubject: Practice log for July'
message = message + '\\n\\nFifteen minutes today. Loops are starting to stick.'
print(message)"""),
    "From: kavya@example.com\nTo: renn@example.com\nSubject: Practice log for July\n\nFifteen minutes today. Loops are starting to stick.")

print("=== section: A message is text (EmailMessage) ===")
check("EmailMessage build and print(msg)",
    run("""from email.message import EmailMessage
msg = EmailMessage()
msg['From'] = 'kavya@example.com'
msg['To'] = 'renn@example.com'
msg['Subject'] = 'Practice log for July'
msg.set_content('Fifteen minutes today. Loops are starting to stick.')
print(msg)"""),
    "From: kavya@example.com\nTo: renn@example.com\nSubject: Practice log for July\n"
    "Content-Type: text/plain; charset=\"utf-8\"\nContent-Transfer-Encoding: 7bit\n"
    "MIME-Version: 1.0\n\nFifteen minutes today. Loops are starting to stick.")

# One shared message for the REPL-style claims, exactly as built in the chapter.
from email.message import EmailMessage
msg = EmailMessage()
msg['From'] = 'kavya@example.com'
msg['To'] = 'renn@example.com'
msg['Subject'] = 'Practice log for July'
msg.set_content('Fifteen minutes today. Loops are starting to stick.')

check("msg['Subject'] reads back", repr(msg['Subject']), "'Practice log for July'")
check("msg['Reply-To'] is None (never-set header)", msg['Reply-To'] is None, True)
check("msg.get_content() ends with a newline",
    repr(msg.get_content()),
    "'Fifteen minutes today. Loops are starting to stick.\\n'")

# Chapter claim: nothing nondeterministic is auto-generated on serialization.
check("str(msg) equals msg.as_string()", str(msg) == msg.as_string(), True)
check("serialization is stable across calls", str(msg) == str(msg), True)
check("no auto-generated Date header", 'Date' in msg, False)
check("no auto-generated Message-ID header", 'Message-ID' in msg, False)

print("=== section: A message is text (assignment appends, never replaces) ===")
def assign_to_again():
    msg['To'] = 'imani@example.com'
check_raises("second To assignment raises", assign_to_again,
    "ValueError: There may be at most 1 To headers in a message")
del msg['To']
msg['To'] = 'renn@example.com, imani@example.com'
check("del then reassign reads back the comma string",
    repr(msg['To']), "'renn@example.com, imani@example.com'")
# Note claim: repeatable headers silently stack a duplicate instead of raising.
m2 = EmailMessage()
m2['Comments'] = 'first'
m2['Comments'] = 'second'
check("repeatable header silently stacks",
    [str(v) for v in m2.get_all('Comments')], ["first", "second"])

print("=== section: Credentials, ports, and what belongs in a script ===")
check("dry-run loop",
    run("""recipients = ['ana@example.com', 'bea@example.com', 'cole@example.com']
subject = 'March invoice attached'
for addr in recipients:
    print('DRY RUN - would send to ' + addr + ': ' + subject)"""),
    "DRY RUN - would send to ana@example.com: March invoice attached\n"
    "DRY RUN - would send to bea@example.com: March invoice attached\n"
    "DRY RUN - would send to cole@example.com: March invoice attached")

print("=== section: Push notifications with ntfy (JSON Lines parsing) ===")
POLL_PROGRAM = """import json
poll_text = '{"id":"r7XkQ2ab","time":1786402100,"event":"message","topic":"pl-drill-log-9f3kq","message":"backup finished"}\\n{"id":"c4NwT8pq","time":1786402220,"event":"message","topic":"pl-drill-log-9f3kq","message":"3 files skipped","title":"backup report","priority":4}'
notes = []
for line in poll_text.splitlines():
    notes.append(json.loads(line))
print(len(notes))
print(notes[0]['message'])
print(notes[1]['title'])
print(notes[1]['priority'])
print(notes[0].get('priority', 3))"""
check("poll body parser program", run(POLL_PROGRAM),
    "2\nbackup finished\nbackup report\n4\n3")
repl_seq("json.loads on the whole poll body raises Extra data",
    [("import json", True),
     ("poll_text = '{\"id\":\"r7XkQ2ab\",\"time\":1786402100,\"event\":\"message\",\"topic\":\"pl-drill-log-9f3kq\",\"message\":\"backup finished\"}\\n{\"id\":\"c4NwT8pq\",\"time\":1786402220,\"event\":\"message\",\"topic\":\"pl-drill-log-9f3kq\",\"message\":\"3 files skipped\",\"title\":\"backup report\",\"priority\":4}'", True),
     ("json.loads(poll_text)", False)],
    ["JSONDecodeError: Extra data: line 2 column 1 (char 111)"])

print("=== practice-question executable claims ===")
# q4: field access and the None of a never-set header
q4 = EmailMessage()
q4['Subject'] = 'Practice log for July'
check("q4: msg['Subject'] value", repr(q4['Subject']), "'Practice log for July'")
check("q4: msg['Reply-To'] is None", q4['Reply-To'] is None, True)
# q5: assignment adds, unique headers refuse a second copy
q5 = EmailMessage()
q5['To'] = 'renn@example.com'
def q5_assign():
    q5['To'] = 'imani@example.com'
check_raises("q5: second To assignment raises the quoted ValueError", q5_assign,
    "ValueError: There may be at most 1 To headers in a message")
# q10: JSON Lines vs json.loads — the working pattern parses every line
import json
q10_text = '{"a": 1}\n{"a": 2}'
check_raises("q10: json.loads on two JSON lines raises JSONDecodeError",
    lambda: json.loads(q10_text),
    "JSONDecodeError: Extra data: line 2 column 1 (char 9)")
check("q10: splitlines-then-loads pattern works",
    [json.loads(line) for line in q10_text.splitlines()],
    [{"a": 1}, {"a": 2}])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Headers, blank line, body",
    run("""sender = 'maria@example.com'
recipient = 'devon@example.com'
subject = 'Lunch on Thursday'
body = 'The cafe on 5th at noon.'
print('From: ' + sender)
print('To: ' + recipient)
print('Subject: ' + subject)
print()
print(body)"""),
    "From: maria@example.com\nTo: devon@example.com\nSubject: Lunch on Thursday\n\nThe cafe on 5th at noon.")
check("ex2 Pull out the headers",
    run("""raw = 'From: keiko@example.com\\nTo: manager@example.com\\nSubject: Roof leak in unit 4B\\n\\nThe ceiling drips over the sink.'
for line in raw.splitlines():
    if line.startswith('From: '):
        print(line[6:])
    if line.startswith('Subject: '):
        print(line[9:])"""),
    "keiko@example.com\nRoof leak in unit 4B")
check("ex3 Address or not",
    run("""candidates = ['mira@example.com', 'mira@@example.com', 'mira at example.com', 'ops@mail.example.org', 'sam@example']
for addr in candidates:
    domain = addr.partition('@')[2]
    if addr.count('@') == 1 and ' ' not in addr and '.' in domain:
        print(addr + ': ok')
    else:
        print(addr + ': bad')"""),
    "mira@example.com: ok\nmira@@example.com: bad\nmira at example.com: bad\n"
    "ops@mail.example.org: ok\nsam@example: bad")
check("ex4 Counting recipients",
    run("""to_line = 'To: ana@example.com, bea@example.com, cole@example.com'
addresses = to_line[4:].split(',')
for addr in addresses:
    print(addr.strip())
print('Recipients: ' + str(len(addresses)))"""),
    "ana@example.com\nbea@example.com\ncole@example.com\nRecipients: 3")

print()
print("CH20 VERIFY: ALL PASS" if fails == 0 else f"CH20 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
