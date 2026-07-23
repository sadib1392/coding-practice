# Verify every code snippet shown in book/ch13.js.
# Same self-checking pattern as ch2_verify.py: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between the
# chapter text and real execution fails the run.
#
# No network is used, ever. requests / selenium / playwright code in the
# chapter is shown without output claims, so nothing about them is (or could
# be) asserted here. Beautiful Soup checks need beautifulsoup4; when it is not
# installed they are skipped without failing (the app itself never runs bs4 —
# those outputs were captured in a scratch venv and are re-checked here
# whenever bs4 is available).
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

print("=== section: URLs, HTTP, and the webbrowser module ===")
repl_seq("join builds the address for the map URL",
    [("' '.join(['12', 'Harbour', 'Lane'])", False)],
    ["'12 Harbour Lane'"])

print("=== section: Accessing a web API ===")
repl_seq("json.loads on the weather string",
    [("import json", True),
     ("raw = '{\"city\": \"Norwich\", \"temp_c\": 17.4, \"windy\": true}'", True),
     ("data = json.loads(raw)", True),
     ("data['temp_c']", False),
     ("data['windy']", False),
     ("type(data)", False)],
    ["17.4", "True", "<class 'dict'>"])

print("=== section: Understanding HTML ===")
check("html.parser TagLogger demo",
    run("""from html.parser import HTMLParser

class TagLogger(HTMLParser):
    def handle_starttag(self, tag, attrs):
        print('start:', tag, attrs)
    def handle_data(self, data):
        if data.strip() != '':
            print('text :', data.strip())

page = '<h1 id="top">Tide times</h1><p>High tide at <b>14:52</b> today.</p>'
TagLogger().feed(page)"""),
    "start: h1 [('id', 'top')]\ntext : Tide times\nstart: p []\ntext : High tide at\nstart: b []\ntext : 14:52\ntext : today.")

print("=== practice-question executable claims (stdlib) ===")
repl_seq("q3: json.loads dict and index",
    [("import json", True),
     ("json.loads('{\"temp\": 18, \"windy\": false}')", False),
     ("json.loads('{\"temp\": 18, \"windy\": false}')['temp']", False)],
    ["{'temp': 18, 'windy': False}", "18"])

print("=== section: Parsing HTML with Beautiful Soup (needs beautifulsoup4) ===")
BS4_CHECK_COUNT = 17
PAGE = """<html><head><title>Kettle and Crow - Beans</title></head>
<body>
<h1 id="shopname">Kettle and Crow</h1>
<p class="bean">Kenya Nyeri <span class="price">$18</span></p>
<p class="bean">Sumatra Lintong <span class="price">$15</span></p>
<p class="bean sale">Brazil Cerrado <span class="price">$11</span></p>
<a href="https://example.com/order">Order page</a>
</body></html>"""
try:
    import bs4
except ImportError:
    print(f"skip: bs4 not installed ({BS4_CHECK_COUNT} checks skipped)")
else:
    soup = bs4.BeautifulSoup(PAGE, 'html.parser')
    check("select('#shopname') repr",
        repr(soup.select('#shopname')),
        '[<h1 id="shopname">Kettle and Crow</h1>]')
    check("select('#shopname')[0].text",
        soup.select('#shopname')[0].text,
        'Kettle and Crow')
    prices = soup.select('.price')
    check("len(select('.price'))", len(prices), 3)
    check("prices[0] repr", repr(prices[0]), '<span class="price">$18</span>')
    check("prices[0].text", prices[0].text, '$18')
    check("select('p.sale span') repr",
        repr(soup.select('p.sale span')),
        '[<span class="price">$11</span>]')
    link = soup.select('a')[0]
    check("link.get('href')", link.get('href'), 'https://example.com/order')
    check("link.text", link.text, 'Order page')
    check("link.attrs", link.attrs, {'href': 'https://example.com/order'})
    loop_out = []
    for span in soup.select('.price'):
        loop_out.append(span.text)
    check("price loop output", "\n".join(loop_out), "$18\n$15\n$11")
    tag = soup.select('h1')[0]
    check("tag repr prints like HTML",
        repr(tag), '<h1 id="shopname">Kettle and Crow</h1>')
    try:
        tag.upper()
        got = "no error"
    except Exception as ex:
        got = f"{type(ex).__name__}: {ex}"
    check("tag.upper() raises", got, "TypeError: 'NoneType' object is not callable")
    check("tag.text.upper()", tag.text.upper(), 'KETTLE AND CROW')
    got = [repr(soup.select('.discount'))]
    try:
        soup.select('.discount')[0]
        got.append("no error")
    except Exception as ex:
        got.append(f"{type(ex).__name__}: {ex}")
    check("select('.discount') empty, [0] raises",
        got, ["[]", "IndexError: list index out of range"])
    faq = bs4.BeautifulSoup("<a href='https://example.com/faq'>Help pages</a>",
                            'html.parser').select('a')[0]
    check("q4: anchor tag name / href / inner text",
        [faq.name, faq.get('href'), faq.text],
        ['a', 'https://example.com/faq', 'Help pages'])
    check("q7: tag object vs .text types",
        [type(tag).__name__, type(tag.text).__name__],
        ['Tag', 'str'])
    check("q8: len(select('p.bean span'))",
        len(soup.select('p.bean span')), 3)

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Pull the title",
    run("""page = '<html><head><title>Tide Tables for Norwich</title></head><body></body></html>'
start = page.find('<title>') + len('<title>')
end = page.find('</title>')
print(page[start:end])"""),
    "Tide Tables for Norwich")
check("ex2 Harvest the links",
    run("""links = "<p><a href='https://example.com/tea'>Tea</a> and <a href='https://example.com/pots'>Pots</a> and <a href='https://example.org/faq'>FAQ</a></p>"
for part in links.split("href='")[1:]:
    print(part[:part.find("'")])"""),
    "https://example.com/tea\nhttps://example.com/pots\nhttps://example.org/faq")
check("ex3 Tag census",
    run("""page = '<h1>Menu</h1><p>Soup</p><p>Bread</p><ul><li>Oat</li><li>Rye</li><li>Corn</li></ul><p>Butter</p>'
counts = {}
for tag in ['h1', 'p', 'li']:
    counts[tag] = page.count('<' + tag + '>')
print(counts)"""),
    "{'h1': 1, 'p': 3, 'li': 3}")
check("ex4 Strip the tags",
    run("""snippet = '<p>Rain <b>likely</b> after noon; bring a <i>dry</i> bag.</p>'
text = ''
i = 0
while i < len(snippet):
    if snippet[i] == '<':
        i = snippet.find('>', i) + 1
    else:
        text = text + snippet[i]
        i = i + 1
print(text)"""),
    "Rain likely after noon; bring a dry bag.")

print()
print("CH13 VERIFY: ALL PASS" if fails == 0 else f"CH13 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
