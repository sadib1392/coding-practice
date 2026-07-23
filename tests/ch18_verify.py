# Verify every code snippet shown in book/ch18.js.
# Same idea as ch2_verify.py, self-checking: each snippet's expected
# output (as embedded in the chapter file) is asserted here, so any drift
# between the chapter text and real execution fails the run.
# All file operations happen inside a fresh temp directory.
import io, contextlib, os, sys, tempfile

os.chdir(tempfile.mkdtemp())

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

def run(code):
    buf = io.StringIO()
    ns = {}
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    return buf.getvalue().rstrip("\n")

print("=== section: The CSV format ===")
# stock.csv exactly as the chapter displays it
STOCK_CSV = 'item,aisle,qty\nWood screws,4,180\n"Paint, exterior",7,12\nSandpaper,4,95\n'
with open("stock.csv", "w", newline="") as f:
    f.write(STOCK_CSV)
repl_seq("hand-splitting the quoted line",
    [("line = '\"Paint, exterior\",7,12'", True), ("line.split(',')", False)],
    ["['\"Paint', ' exterior\"', '7', '12']"])

print("=== section: Reading CSV files ===")
repl_seq("reader -> list of lists of strings, index access",
    [("import csv", True), ("file = open('stock.csv')", True),
     ("reader = csv.reader(file)", True), ("rows = list(reader)", True),
     ("rows", False), ("rows[2][0]", False),
     ("list(reader)", False),  # prose claim: a reader is spent after one pass
     ("file.close()", True)],
    ["[['item', 'aisle', 'qty'], ['Wood screws', '4', '180'], ['Paint, exterior', '7', '12'], ['Sandpaper', '4', '95']]",
     "'Paint, exterior'",
     "[]"])
check("loop with line_num",
    run("""import csv
with open('stock.csv') as file:
    reader = csv.reader(file)
    for row in reader:
        print(f'Line {reader.line_num}: {row}')"""),
    "Line 1: ['item', 'aisle', 'qty']\nLine 2: ['Wood screws', '4', '180']\nLine 3: ['Paint, exterior', '7', '12']\nLine 4: ['Sandpaper', '4', '95']")

print("=== section: Writing CSV files ===")
repl_seq("writer: return values, quoting, \\r\\n endings",
    [("import csv", True), ("file = open('receipt.csv', 'w', newline='')", True),
     ("writer = csv.writer(file)", True),
     ("writer.writerow(['item', 'qty', 'each'])", False),
     ("writer.writerow(['Wood screws', 2, 3.5])", False),
     ("writer.writerow(['Paint, exterior', 1, 24.99])", False),
     ("file.close()", True),
     ("open('receipt.csv', newline='').read()", False)],
    ["15", "19", "27",
     "'item,qty,each\\r\\nWood screws,2,3.5\\r\\n\"Paint, exterior\",1,24.99\\r\\n'"])
check("tsv writer program (writes, prints nothing)",
    run("""import csv
with open('stock.tsv', 'w', newline='') as file:
    writer = csv.writer(file, delimiter='\\t', lineterminator='\\n')
    writer.writerow(['item', 'aisle', 'qty'])
    writer.writerow(['Wood screws', 4, 180])
    writer.writerow(['Paint, exterior', 7, 12])"""),
    "")
repl_seq("tsv raw content: tabs, no quote marks",
    [("open('stock.tsv', newline='').read()", False)],
    ["'item\\taisle\\tqty\\nWood screws\\t4\\t180\\nPaint, exterior\\t7\\t12\\n'"])
repl_seq("prose claim: reader takes the same delimiter keyword",
    [("import csv", True), ("file = open('stock.tsv', newline='')", True),
     ("list(csv.reader(file, delimiter='\\t'))", False), ("file.close()", True)],
    ["[['item', 'aisle', 'qty'], ['Wood screws', '4', '180'], ['Paint, exterior', '7', '12']]"])

print("=== section: Header rows: DictReader and DictWriter ===")
repl_seq("DictReader row dict + note claim: KeyError on wrong case",
    [("import csv", True), ("file = open('stock.csv')", True),
     ("rows = list(csv.DictReader(file))", True),
     ("rows[0]", False),
     ("rows[0]['Qty']", False),  # note claim
     ("file.close()", True)],
    ["{'item': 'Wood screws', 'aisle': '4', 'qty': '180'}",
     "KeyError: 'Qty'"])
check("DictReader loop program",
    run("""import csv
with open('stock.csv') as file:
    for row in csv.DictReader(file):
        print(f"{row['item']}: {row['qty']} in aisle {row['aisle']}")"""),
    "Wood screws: 180 in aisle 4\nPaint, exterior: 12 in aisle 7\nSandpaper: 95 in aisle 4")
repl_seq("DictWriter: fieldnames order, bad key refused, raw content",
    [("import csv", True), ("file = open('reorder.csv', 'w', newline='')", True),
     ("writer = csv.DictWriter(file, ['item', 'qty'])", True),
     ("writer.writeheader()", False),
     ("writer.writerow({'item': 'Sandpaper', 'qty': 40})", False),
     ("writer.writerow({'qty': 6, 'item': 'Paint, exterior'})", False),
     ("writer.writerow({'Item': 'Hinges'})", False),
     ("file.close()", True),
     ("open('reorder.csv', newline='').read()", False)],
    ["10", "14", "21",
     "ValueError: dict contains fields not in fieldnames: 'Item'",
     "'item,qty\\r\\nSandpaper,40\\r\\n\"Paint, exterior\",6\\r\\n'"])

print("=== section: one stock file from three tills ===")
check("till setup program (writes, prints nothing)",
    run("""import csv
till_data = {
    'till_a.csv': [['Deck screws', 12], ['Sandpaper', 3]],
    'till_b.csv': [['Paint roller', 2]],
    'till_c.csv': [['Wood glue', 5], ['Tape measure', 1], ['Sandpaper', 2]],
}
for filename, rows in till_data.items():
    with open(filename, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['item', 'qty'])
        for row in rows:
            writer.writerow(row)"""),
    "")
check("merge program",
    run("""import csv, os
combined = open('combined.csv', 'w', newline='')
writer = csv.writer(combined)
writer.writerow(['item', 'qty'])
for filename in sorted(os.listdir('.')):
    if not filename.startswith('till_') or not filename.endswith('.csv'):
        continue
    with open(filename) as file:
        reader = csv.reader(file)
        for row in reader:
            if reader.line_num == 1:
                continue
            writer.writerow(row)
combined.close()
with open('combined.csv') as file:
    for row in csv.reader(file):
        print(row)"""),
    "['item', 'qty']\n['Deck screws', '12']\n['Sandpaper', '3']\n['Paint roller', '2']\n['Wood glue', '5']\n['Tape measure', '1']\n['Sandpaper', '2']")

print("=== section: JSON: values as text ===")
repl_seq("loads: types mapped, dumps, sort_keys, strictness error",
    [("import json", True),
     ("text = '{\"trail\": \"Ridge Loop\", \"distance_km\": 9.4, \"completed\": true, \"partner\": null}'", True),
     ("hike = json.loads(text)", True),
     ("hike", False),
     ("hike['completed']", False),
     ("type(hike['distance_km'])", False),
     ("json.dumps(hike)", False),
     ("json.dumps(hike, sort_keys=True)", False),
     ("json.loads(\"{'trail': 'Ridge Loop'}\")", False)],
    ["{'trail': 'Ridge Loop', 'distance_km': 9.4, 'completed': True, 'partner': None}",
     "True",
     "<class 'float'>",
     "'{\"trail\": \"Ridge Loop\", \"distance_km\": 9.4, \"completed\": true, \"partner\": null}'",
     "'{\"completed\": true, \"distance_km\": 9.4, \"partner\": null, \"trail\": \"Ridge Loop\"}'",
     "JSONDecodeError: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"])

print("=== section: JSON files: load and dump ===")
check("dump / load round trip program",
    run("""import json
club = {'name': 'Switchback Hiking Club', 'founded': 2019, 'members': ['Ana', 'Priya', 'Tomas']}
with open('club.json', 'w') as file:
    json.dump(club, file)
with open('club.json') as file:
    data = json.load(file)
print(data['members'][1])
print(data == club)"""),
    "Priya\nTrue")
repl_seq("load wants a file object; range has no JSON spelling",
    [("import json", True),
     ("json.load('club.json')", False),
     ("json.dumps({'laps': range(3)})", False)],
    ["AttributeError: 'str' object has no attribute 'read'",
     "TypeError: Object of type range is not JSON serializable"])
# note claim: two dumps in one file -> load refuses with an Extra data error
import json as _json
with open("two.json", "w") as f:
    _json.dump({"a": 1}, f)
    _json.dump({"b": 2}, f)
try:
    with open("two.json") as f:
        _json.load(f)
    check("note claim: two dumps -> Extra data error", "no error", "Extra data: ...")
except Exception as ex:
    check("note claim: two dumps -> Extra data error",
          (type(ex).__name__, str(ex).startswith("Extra data:")),
          ("JSONDecodeError", True))

print("=== section: XML: a tree of elements ===")
# museum.xml exactly as the chapter displays it
MUSEUM_XML = """<museum>
  <exhibit hall="East">
    <name>Clockwork Orrery</name>
    <era>1750s</era>
  </exhibit>
  <exhibit hall="West">
    <name>Basalt Sundial</name>
    <era>Roman</era>
  </exhibit>
</museum>
"""
with open("museum.xml", "w") as f:
    f.write(MUSEUM_XML)
repl_seq("parse, getroot, tag, find, attrib, text",
    [("import xml.etree.ElementTree as ET", True),
     ("tree = ET.parse('museum.xml')", True),
     ("root = tree.getroot()", True),
     ("root.tag", False),
     ("first = root.find('exhibit')", True),
     ("first.attrib", False),
     ("first.find('name').text", False),
     ("type(root.findall('exhibit'))", False),   # q10 claim: findall returns a list
     ("len(root.findall('exhibit'))", False),
     ("root.find('exibit')", False),             # note claim: missing tag -> None
     ("root.find('exibit').text", False)],       # note claim: the crash one step later
    ["'museum'",
     "{'hall': 'East'}",
     "'Clockwork Orrery'",
     "<class 'list'>",
     "2",
     "None",
     "AttributeError: 'NoneType' object has no attribute 'text'"])
check("findall loop program",
    run("""import xml.etree.ElementTree as ET
tree = ET.parse('museum.xml')
root = tree.getroot()
for exhibit in root.findall('exhibit'):
    name = exhibit.find('name').text
    print(f"{name} ({exhibit.attrib['hall']} hall)")"""),
    "Clockwork Orrery (East hall)\nBasalt Sundial (West hall)")

print("=== practice-question executable claims ===")
repl_seq("q1: csv.reader parses the quoted line correctly",
    [("import csv", True),
     ("list(csv.reader(['\"Paint, exterior\",7,12']))", False)],
    ["[['Paint, exterior', '7', '12']]"])
repl_seq("q7: true / null / 9.4 / [1, 2] mappings",
    [("import json", True),
     ("json.loads('true')", False),
     ("json.loads('null')", False),
     ("json.loads('9.4')", False),
     ("type(json.loads('9.4'))", False),
     ("json.loads('[1, 2]')", False),
     ("type(json.loads('12'))", False)],
    ["True", "None", "9.4", "<class 'float'>", "[1, 2]", "<class 'int'>"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Restock report",
    run("""import csv
with open('restock.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(['item', 'qty'])
    writer.writerow(['Deck screws', 140])
    writer.writerow(['Wall anchors, plastic', 500])
    writer.writerow(['Hinges', 48])
with open('restock.csv') as file:
    for row in csv.reader(file):
        print(row)"""),
    "['item', 'qty']\n['Deck screws', '140']\n['Wall anchors, plastic', '500']\n['Hinges', '48']")
check("ex2 Low stock, by name",
    run("""import csv
with open('stock_take.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(['item', 'aisle', 'qty'])
    writer.writerow(['Felt pads', 2, 300])
    writer.writerow(['Chain, brass', 5, 18])
    writer.writerow(['Tarps', 9, 44])
    writer.writerow(['Rope', 5, 260])
with open('stock_take.csv') as file:
    for row in csv.DictReader(file):
        if int(row['qty']) < 50:
            print(f"{row['item']} ({row['qty']} left)")"""),
    "Chain, brass (18 left)\nTarps (44 left)")
check("ex3 Trail log, patched",
    run("""import json
record_text = '{"trail": "Sable Ridge", "distance_km": 12.5, "completed": false, "partner": null}'
record = json.loads(record_text)
record['completed'] = True
record['partner'] = 'Ana'
print(json.dumps(record, sort_keys=True))"""),
    '{"completed": true, "distance_km": 12.5, "partner": "Ana", "trail": "Sable Ridge"}')
check("ex4 Leads from the roster",
    run("""import xml.etree.ElementTree as ET
xml_text = '<club><member level="lead"><name>Ana</name></member><member level="new"><name>Tomas</name></member><member level="lead"><name>Priya</name></member></club>'
root = ET.fromstring(xml_text)
leads = []
for member in root.findall('member'):
    if member.attrib['level'] == 'lead':
        leads.append(member.find('name').text)
print(leads)"""),
    "['Ana', 'Priya']")

print()
print("CH18 VERIFY: ALL PASS" if fails == 0 else f"CH18 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
