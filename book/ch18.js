/* Practice Log book — Chapter 18: CSV, JSON, and XML Files.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch18 = {
n: 18,
title: "CSV, JSON, and XML Files",
src: "https://automatetheboringstuff.com/3e/chapter18.html",
blurb: "Three plaintext data formats — flat rows, typed values, nested tags — and the standard-library module that parses each one.",
sections: [
{ t: "The CSV format",
  body: [
  ["p","A CSV file is a spreadsheet reduced to plain text: one row per line, fields separated by commas. Because it is only text, every spreadsheet program and every programming language can read and write it, which has made it the default way tabular data moves between programs. The price of that simplicity is everything else — no fonts, no formulas, no column types. Every value in a CSV file is text until your code decides otherwise."],
  ["code","item,aisle,qty\nWood screws,4,180\n\"Paint, exterior\",7,12\nSandpaper,4,95"],
  ["p","Save those four lines as stock.csv — a hardware shop's stock list, one header row and three items. The third line is the reason this chapter's module exists: the paint's name contains a comma, so the file wraps the field in quote marks. Anything reading this file has to know that the comma inside the quotes separates nothing."],
  ["code",">>> line = '\"Paint, exterior\",7,12'\n>>> line.split(',')\n['\"Paint', ' exterior\"', '7', '12']"],
  ["note","The tempting shortcut is to read() the file and split each line on ',' — no import needed, and it works until the first quoted field. Then one field becomes two and the quote marks ride along as data, as the wreck above shows. Quoting rules are the csv module's whole job; never hand-split a CSV line."]
]},
{ t: "Reading CSV files",
  body: [
  ["p","import csv, open the file, and hand the file object to csv.reader. The reader is not a list — it is an object that walks the file — but passing it to list() pulls every row at once: a list of lists, one inner list per row, one string per field."],
  ["code",">>> import csv\n>>> file = open('stock.csv')\n>>> reader = csv.reader(file)\n>>> rows = list(reader)\n>>> rows\n[['item', 'aisle', 'qty'], ['Wood screws', '4', '180'], ['Paint, exterior', '7', '12'], ['Sandpaper', '4', '95']]\n>>> rows[2][0]\n'Paint, exterior'\n>>> file.close()"],
  ["p","The quoted comma came through: 'Paint, exterior' is one field, quote marks gone. Notice also what did not happen — '4' and '180' are strings. The csv module never converts types; every field arrives as text, and arithmetic on a quantity needs int() first. One more property matters: a reader is spent after one pass. list(reader) a second time gives an empty list — to read the file again, reopen it and make a new reader."],
  ["p","For files too big to hold in memory at once, skip list() and loop over the reader directly. Each pass of the loop receives one row, and the reader's line_num attribute reports which line of the file it is on."],
  ["code","import csv\nwith open('stock.csv') as file:\n    reader = csv.reader(file)\n    for row in reader:\n        print(f'Line {reader.line_num}: {row}')"],
  ["code","Line 1: ['item', 'aisle', 'qty']\nLine 2: ['Wood screws', '4', '180']\nLine 3: ['Paint, exterior', '7', '12']\nLine 4: ['Sandpaper', '4', '95']"],
  ["note","rows[2][0] answers third row, first field — fine for a quick poke at the shell, but code built on magic column numbers breaks the day someone adds a column in front. The header-row tools two sections down fix that properly."]
]},
{ t: "Writing CSV files",
  body: [
  ["p","csv.writer mirrors the reader: open the file for writing — mode 'w', and always newline='' — make a writer from the file object, and feed writerow one list per row. At the shell, writerow answers with the number of characters it wrote; programs usually ignore that number."],
  ["code",">>> import csv\n>>> file = open('receipt.csv', 'w', newline='')\n>>> writer = csv.writer(file)\n>>> writer.writerow(['item', 'qty', 'each'])\n15\n>>> writer.writerow(['Wood screws', 2, 3.5])\n19\n>>> writer.writerow(['Paint, exterior', 1, 24.99])\n27\n>>> file.close()\n>>> open('receipt.csv', newline='').read()\n'item,qty,each\\r\\nWood screws,2,3.5\\r\\n\"Paint, exterior\",1,24.99\\r\\n'"],
  ["p","Reading the raw file back shows the writer doing three jobs unasked. The 2 and 24.99 went in as numbers and came out as text. 'Paint, exterior' picked up quote marks because it contains the delimiter. And every row ends in \\r\\n, the Windows-style line ending the CSV convention specifies — the writer produces those itself."],
  ["p","That last detail is what newline='' is for. Without it, a file opened in text mode on Windows translates every \\n the writer emits, turning \\r\\n into \\r\\r\\n — and a spreadsheet shows the file double-spaced, a blank row under every real one. With newline='' the file object leaves line endings alone and the writer's own \\r\\n stands."],
  ["note","Forgetting newline='' is the classic csv bug because it passes your own testing: macOS and Linux do not translate line endings, so the file looks perfect on the machine that wrote it and turns up double-spaced on the colleague's Windows machine that opens it. Pass newline='' on every open() the csv module touches — reading included, where it protects quoted fields that contain line breaks."],
  ["p","The comma is only the default delimiter. For comma-heavy data, tab-separated files sidestep the quoting dance entirely: pass delimiter='\\t' to the writer — and lineterminator='\\n' if you want plain line endings instead of \\r\\n."],
  ["code","import csv\nwith open('stock.tsv', 'w', newline='') as file:\n    writer = csv.writer(file, delimiter='\\t', lineterminator='\\n')\n    writer.writerow(['item', 'aisle', 'qty'])\n    writer.writerow(['Wood screws', 4, 180])\n    writer.writerow(['Paint, exterior', 7, 12])"],
  ["code",">>> open('stock.tsv', newline='').read()\n'item\\taisle\\tqty\\nWood screws\\t4\\t180\\nPaint, exterior\\t7\\t12\\n'"],
  ["p","The quote marks around the paint are gone. Quoting exists to protect the delimiter, and with tabs as the delimiter an embedded comma needs no protection. Reading the file back takes the same keyword: csv.reader(file, delimiter='\\t')."]
]},
{ t: "Header rows: DictReader and DictWriter",
  body: [
  ["p","The first row of stock.csv is not stock — it is labels. csv.reader hands it over as data anyway and leaves skipping it to you. DictReader treats it as what it is: every later row becomes a dictionary whose keys are the header names, and your code asks for row['qty'] instead of row[2]."],
  ["code",">>> import csv\n>>> file = open('stock.csv')\n>>> rows = list(csv.DictReader(file))\n>>> rows[0]\n{'item': 'Wood screws', 'aisle': '4', 'qty': '180'}\n>>> file.close()"],
  ["code","import csv\nwith open('stock.csv') as file:\n    for row in csv.DictReader(file):\n        print(f\"{row['item']}: {row['qty']} in aisle {row['aisle']}\")"],
  ["code","Wood screws: 180 in aisle 4\nPaint, exterior: 12 in aisle 7\nSandpaper: 95 in aisle 4"],
  ["p","DictWriter is the reverse. You declare the column order once, as the fieldnames list; writeheader() writes the label row; then writerow takes dictionaries. Key order inside each dictionary is irrelevant — fieldnames decides the columns, and the second writerow below lists qty first yet lands in the right columns anyway. A key that is not in fieldnames is refused outright:"],
  ["code",">>> import csv\n>>> file = open('reorder.csv', 'w', newline='')\n>>> writer = csv.DictWriter(file, ['item', 'qty'])\n>>> writer.writeheader()\n10\n>>> writer.writerow({'item': 'Sandpaper', 'qty': 40})\n14\n>>> writer.writerow({'qty': 6, 'item': 'Paint, exterior'})\n21\n>>> writer.writerow({'Item': 'Hinges'})\nValueError: dict contains fields not in fieldnames: 'Item'\n>>> file.close()\n>>> open('reorder.csv', newline='').read()\n'item,qty\\r\\nSandpaper,40\\r\\n\"Paint, exterior\",6\\r\\n'"],
  ["note","That ValueError is the misspelled-key mistake caught loudly — 'Item' with a capital is not 'item'. DictReader has the quiet version: its keys come from the file's header exactly, case and all, so row['Qty'] on this file raises KeyError: 'Qty'. When a key fails, check the header row, not your memory of it."]
]},
{ t: "A short program: one stock file from three tills",
  body: [
  ["p","Each till in the shop dumps its own CSV at closing time, header included. The morning job is one combined file with a single header. The first block fakes the three till files so the whole thing runs anywhere; in real life the tills would have written them."],
  ["code","import csv\ntill_data = {\n    'till_a.csv': [['Deck screws', 12], ['Sandpaper', 3]],\n    'till_b.csv': [['Paint roller', 2]],\n    'till_c.csv': [['Wood glue', 5], ['Tape measure', 1], ['Sandpaper', 2]],\n}\nfor filename, rows in till_data.items():\n    with open(filename, 'w', newline='') as file:\n        writer = csv.writer(file)\n        writer.writerow(['item', 'qty'])\n        for row in rows:\n            writer.writerow(row)"],
  ["p","The merge walks every matching file, skips each one's header line, and funnels every data row through one writer. sorted() pins the file order — os.listdir returns names in whatever order the filesystem happens to hold them, and a program whose output shuffles between runs is a program you cannot test."],
  ["code","import csv, os\ncombined = open('combined.csv', 'w', newline='')\nwriter = csv.writer(combined)\nwriter.writerow(['item', 'qty'])\nfor filename in sorted(os.listdir('.')):\n    if not filename.startswith('till_') or not filename.endswith('.csv'):\n        continue\n    with open(filename) as file:\n        reader = csv.reader(file)\n        for row in reader:\n            if reader.line_num == 1:\n                continue\n            writer.writerow(row)\ncombined.close()\nwith open('combined.csv') as file:\n    for row in csv.reader(file):\n        print(row)"],
  ["code","['item', 'qty']\n['Deck screws', '12']\n['Sandpaper', '3']\n['Paint roller', '2']\n['Wood glue', '5']\n['Tape measure', '1']\n['Sandpaper', '2']"],
  ["p","This skeleton — find the files, read rows, decide, write rows — is most of real CSV work. Dropping a column, renaming a header, filtering dead stock, converting commas to tabs: only the middle of the loop changes."],
  ["note","reader.line_num == 1 skips each file's own header because a fresh reader starts counting at 1 for every file. Get the test wrong — skipping row 0, or skipping only the first file's header — and the program either eats one stock line per till or writes the word 'item' into the data. Check the combined file against a row you can recognise before trusting the output."]
]},
{ t: "JSON: values as text",
  body: [
  ["p","JSON — JavaScript Object Notation — is how programs hand each other structured values as text, and it is what most web services speak. Where CSV is flat rows of strings, JSON keeps structure and type. A JSON document is one value, and a value is one of six things: an object of \"key\": value pairs in braces, an array of values in square brackets, a string in double quotes, a number, true or false, or null."],
  ["p","The json module maps those onto Python nearly one to one: object to dict, array to list, string to str, number to int when it has no decimal point and float when it does, true and false to True and False, null to None. json.loads — load string — does the parsing."],
  ["code",">>> import json\n>>> text = '{\"trail\": \"Ridge Loop\", \"distance_km\": 9.4, \"completed\": true, \"partner\": null}'\n>>> hike = json.loads(text)\n>>> hike\n{'trail': 'Ridge Loop', 'distance_km': 9.4, 'completed': True, 'partner': None}\n>>> hike['completed']\nTrue\n>>> type(hike['distance_km'])\n<class 'float'>"],
  ["p","The result is an ordinary dict holding ordinary values — note the spelling shifts, true to True and null to None. json.dumps goes the other way, dict to text. Keys come back in insertion order, which for a parsed dict means the order they had in the text; when that order was someone else's choice and you need output that stays identical run after run — a test, a diff, this book's graded exercises — sort_keys=True imposes alphabetical order instead."],
  ["code",">>> json.dumps(hike)\n'{\"trail\": \"Ridge Loop\", \"distance_km\": 9.4, \"completed\": true, \"partner\": null}'\n>>> json.dumps(hike, sort_keys=True)\n'{\"completed\": true, \"distance_km\": 9.4, \"partner\": null, \"trail\": \"Ridge Loop\"}'"],
  ["p","JSON is stricter than Python's own notation, and the gap is exactly where hand-written JSON goes wrong: single quotes are not JSON, trailing commas are not JSON, comments are not JSON."],
  ["code",">>> json.loads(\"{'trail': 'Ridge Loop'}\")\nJSONDecodeError: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"],
  ["note","A Python dict's repr looks close enough to JSON to paste into a config file — single quotes and all — and that file then fails to parse, exactly as above. json.dumps exists to produce valid JSON; repr does not."]
]},
{ t: "JSON files: load and dump",
  body: [
  ["p","loads and dumps work on strings; load and dump work on open file objects — the s is for string. Saving a structure to disk and reloading it later is two short with blocks:"],
  ["code","import json\nclub = {'name': 'Switchback Hiking Club', 'founded': 2019, 'members': ['Ana', 'Priya', 'Tomas']}\nwith open('club.json', 'w') as file:\n    json.dump(club, file)\nwith open('club.json') as file:\n    data = json.load(file)\nprint(data['members'][1])\nprint(data == club)"],
  ["code","Priya\nTrue"],
  ["p","The == on the last line is the point: dump then load hands back an equal structure — dict, list, str, int, all preserved. Two mistakes hide among these four names. Handing load a filename string fails, because load wants the open file object, not the file's name. And not every Python value has a JSON spelling — a range, an open file, a function: dumps refuses them."],
  ["code",">>> import json\n>>> json.load('club.json')\nAttributeError: 'str' object has no attribute 'read'\n>>> json.dumps({'laps': range(3)})\nTypeError: Object of type range is not JSON serializable"],
  ["note","A JSON file holds one value. Calling json.dump twice on the same file writes two values back to back, and json.load later refuses the file with an Extra data error naming the leftover text. When there are many records, collect them in one list and dump the list."]
]},
{ t: "XML: a tree of elements",
  body: [
  ["p","XML wraps values in named tags instead of commas or braces. An element is an opening tag, content, and a matching closing tag; the content can be text or further elements, so a document is a tree; an opening tag can carry name=\"value\" attributes. Exactly one element — here, museum — is the root that contains everything else. Save this as museum.xml:"],
  ["code","<museum>\n  <exhibit hall=\"East\">\n    <name>Clockwork Orrery</name>\n    <era>1750s</era>\n  </exhibit>\n  <exhibit hall=\"West\">\n    <name>Basalt Sundial</name>\n    <era>Roman</era>\n  </exhibit>\n</museum>"],
  ["p","The standard library's parser is xml.etree.ElementTree, imported as ET by convention. ET.parse reads a file and getroot() hands you the root element; ET.fromstring skips the file and parses a string straight to the root. An element has three parts worth knowing: its tag name, its attribute dictionary attrib, and its text."],
  ["code",">>> import xml.etree.ElementTree as ET\n>>> tree = ET.parse('museum.xml')\n>>> root = tree.getroot()\n>>> root.tag\n'museum'\n>>> first = root.find('exhibit')\n>>> first.attrib\n{'hall': 'East'}\n>>> first.find('name').text\n'Clockwork Orrery'"],
  ["p","find returns the first child element with a matching tag; findall returns a list of all of them, ready to loop:"],
  ["code","import xml.etree.ElementTree as ET\ntree = ET.parse('museum.xml')\nroot = tree.getroot()\nfor exhibit in root.findall('exhibit'):\n    name = exhibit.find('name').text\n    print(f\"{name} ({exhibit.attrib['hall']} hall)\")"],
  ["code","Clockwork Orrery (East hall)\nBasalt Sundial (West hall)"],
  ["note","find on a tag that is not there returns None, and the crash comes one step later: root.find('exibit').text dies with AttributeError: 'NoneType' object has no attribute 'text'. The traceback blames the .text on the end; the actual bug is the misspelled tag name in front of it."]
]},
{ t: "Summary",
  body: [
  ["p","Three plaintext formats, one habit: reach for the parser instead of parsing by hand. CSV is flat rows of strings — csv.reader and csv.writer handle the quoting you must never split yourself, DictReader and DictWriter tie rows to the header row, and newline='' belongs on every open() in between. JSON carries typed values — loads and dumps for strings, load and dump for files, six spellings mapped cleanly onto dict, list, str, numbers, True, False, and None. XML nests named elements into a tree, and ElementTree walks it with find, findall, attrib, and text."],
  ["p","Between them these formats cover most data files a program will ever hand you: every spreadsheet export, most web service replies, and a long tail of feeds and configuration files. Answer the questions below from memory, then take the exercises to the grader. The next chapter is Chapter 19, Keeping Time, Scheduling Tasks, and Launching Programs — where a script learns what time it is, waits on purpose, and starts other programs itself."]
]}
],
questions: [
{ q:"A CSV line reads '\"Paint, exterior\",7,12'. What does line.split(',') get wrong that csv.reader gets right?",
  a:"split cuts at every comma blindly: four pieces, quote marks still attached — ['\"Paint', ' exterior\"', '7', '12']. csv.reader knows the quoting rules, treats the comma inside quotes as data, and hands back three clean fields: ['Paint, exterior', '7', '12']." },
{ q:"What does csv.reader give you for each row, and what type is a quantity like 180 when it arrives?",
  a:"A list with one string per field. 180 arrives as the string '180' — the csv module never converts types, so doing arithmetic on it needs int() first." },
{ q:"Why does every open() paired with the csv module need newline=''?",
  a:"The writer emits its own \\r\\n row endings. Without newline='', text mode on Windows translates the \\n again, producing \\r\\r\\n — the file opens double-spaced in a spreadsheet, a blank row under every real one. newline='' tells the file object to leave line endings alone." },
{ q:"How do you write a tab-separated file with the csv module, and what happens to the quote marks around 'Paint, exterior' when you do?",
  a:"Pass delimiter='\\t' to csv.writer (and the same to csv.reader when reading it back). The quote marks disappear: quoting protects the delimiter, and once the delimiter is a tab, an embedded comma needs no protection." },
{ q:"Where does DictReader get its keys, and what does the first stock.csv data row look like as a dictionary?",
  a:"From the file's header row, spelled exactly as the file spells it. The first data row is {'item': 'Wood screws', 'aisle': '4', 'qty': '180'} — values still strings." },
{ q:"In DictWriter, what does the fieldnames list decide, and what happens when writerow gets a dictionary with a key that is not in it?",
  a:"fieldnames fixes the column order and supplies what writeheader() writes; the key order inside each row's dictionary is ignored. A key outside fieldnames raises a ValueError naming the stray key — spelling and case must match." },
{ q:"json.loads meets true, null, 9.4, and [1, 2]. What Python values come back?",
  a:"True, None, the float 9.4, and the list [1, 2]. JSON numbers become int without a decimal point and float with one; objects become dicts, strings become str." },
{ q:"json.load versus json.loads — which takes what, and what error tells you that you gave load a filename instead?",
  a:"The s is for string: loads parses a string, load reads an open file object. json.load('club.json') fails with AttributeError: 'str' object has no attribute 'read' — it wanted the open file, not its name." },
{ q:"You need json.dumps output that is identical run after run, but the dict came from someone else's JSON text. What do you pass, and what does the default order depend on?",
  a:"Pass sort_keys=True for alphabetical key order. The default is insertion order — for a parsed dict, the order the keys had in the JSON text, which was chosen by whoever wrote that text." },
{ q:"In ElementTree, what is the difference between find and findall, and where do an element's attributes and inner text live?",
  a:"find returns the first child element with a matching tag, or None when there is none; findall returns a list of every match. Attributes live in the .attrib dictionary; the text between the tags is .text." }
],
exercises: [
{ c:"file I/O", t:"Restock report", book:"ch18",
  b:"Using csv.writer, write restock.csv with the header row item,qty and three stock rows: Deck screws 140, then Wall anchors, plastic 500 (one item field with the comma inside it), then Hinges 48. Open the file with mode 'w' and newline=''. Then read the file back with csv.reader and print each row.",
  o:"['item', 'qty']\n['Deck screws', '140']\n['Wall anchors, plastic', '500']\n['Hinges', '48']",
  h:["Two halves: one with block that writes four rows, then one that reads them back. The csv module handles the comma in the anchors row on its own — do not add quote marks yourself.",
     "writer.writerow takes one list per row. Reading back is a loop over csv.reader printing each row — the quantities coming back as strings is correct, not a bug.",
     "Shape: open('restock.csv', 'w', newline='') as file, make csv.writer(file), four writerow calls; then reopen the file for reading and loop over csv.reader printing each row."]},
{ c:"file I/O", t:"Low stock, by name", book:"ch18",
  b:"Write stock_take.csv with the header row item,aisle,qty and four rows: Felt pads / 2 / 300, then Chain, brass / 5 / 18 (the comma belongs in the name), then Tarps / 9 / 44, then Rope / 5 / 260. Then read it with csv.DictReader and, for every item with fewer than 50 left, print the name followed by the quantity in parentheses, like: Tarps (44 left)",
  o:"Chain, brass (18 left)\nTarps (44 left)",
  h:["Write the file with csv.writer as in the previous exercise; the new part is reading with DictReader and filtering rows.",
     "DictReader keys come from your header row: row['item'] and row['qty']. The quantity arrives as a string — int(row['qty']) before comparing it to 50.",
     "The reading half: loop over csv.DictReader(file); when int(row['qty']) < 50, print an f-string built from row['item'] and row['qty']."]},
{ c:"dicts", t:"Trail log, patched", book:"ch18",
  b:"The variable record_text holds this JSON, typed as one Python string: '{\"trail\": \"Sable Ridge\", \"distance_km\": 12.5, \"completed\": false, \"partner\": null}'. Parse it with json.loads, then record the finished hike: set completed to True and partner to 'Ana'. Print json.dumps of the result with sort_keys=True.",
  o:"{\"completed\": true, \"distance_km\": 12.5, \"partner\": \"Ana\", \"trail\": \"Sable Ridge\"}",
  h:["json.loads hands back an ordinary dict — change it the way you change any dict, then dump it back to text.",
     "Assign with Python's spellings, True and 'Ana'; dumps writes them out as JSON's true and \"Ana\". sort_keys=True makes the key order deterministic.",
     "Three steps: parse record_text with json.loads, assign the two keys on the result, then print json.dumps of it with sort_keys=True."]},
{ c:"lists", t:"Leads from the roster", book:"ch18",
  b:"The variable xml_text holds this XML, typed as one Python string: '<club><member level=\"lead\"><name>Ana</name></member><member level=\"new\"><name>Tomas</name></member><member level=\"lead\"><name>Priya</name></member></club>'. Parse it with xml.etree.ElementTree, build a list of the name text of every member whose level attribute is 'lead', and print that list.",
  o:"['Ana', 'Priya']",
  h:["ET.fromstring(xml_text) returns the club element; findall('member') gives its member elements as a list to loop over.",
     "Inside the loop, the level is member.attrib['level'] and the name text is member.find('name').text. Append matches to a list created before the loop.",
     "Skeleton: start with an empty list; for each member in root.findall('member'), append the name text when the level attribute equals 'lead'; print the list after the loop."]}
]
};
