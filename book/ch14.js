/* Practice Log book — Chapter 14: Excel Spreadsheets.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory:
   openpyxl snippets ran on desktop Python 3.14 with openpyxl 3.1.5 in a scratch
   directory (see tests/ch14_verify.py), and the graded exercises run on the
   built-in Python that ships with this app. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch14 = {
n: 14,
title: "Excel Spreadsheets",
src: "https://automatetheboringstuff.com/3e/chapter14.html",
blurb: "Reading and writing real .xlsx files with openpyxl — workbooks, sheets, cells, and the loops that process them.",
sections: [
{ t: "Workbooks, sheets, and cells",
  body: [
  ["p","A spreadsheet file is three layers of container. The file itself — data.xlsx — is a workbook. Inside the workbook are one or more worksheets, the tabs along the bottom of the Excel window, each holding its own grid. And the grid is made of cells: columns lettered A, B, C from the left, rows numbered 1, 2, 3 from the top. A column letter plus a row number names one cell, so C4 is the cell in the third column, fourth row. That three-layer address — which sheet, which column, which row — is how every piece of code in this chapter reaches a value."],
  ["p","Spreadsheets are where office data actually lives, and the work people do to them is exactly what loops are good at: total a column, find the rows where a value is wrong, copy a figure from one sheet into another, a thousand times without a wrong click. The openpyxl module lets Python open .xlsx files and do that work — reading cell values, writing new ones, and saving the result — without Excel itself ever running. You do not even need Excel installed; LibreOffice and Google Sheets open the same files."],
  ["note","openpyxl is a third-party module for a desktop Python — you install it by running pip install openpyxl in a terminal, and this chapter's snippets were captured from real runs there. It cannot run inside this app, so the openpyxl examples are for reading, not for the grader. The graded exercises at the bottom use only built-in Python on the same row-and-column ideas, and those run and grade here as usual."]
]},
{ t: "Reading a workbook",
  body: [
  ["p","The examples in this chapter work on a small bakery's order file, bakery.xlsx. Its Orders sheet holds a header row — Item, Loaves, Price — and then one row per bread: Sourdough, 12 loaves at 6.5; Rye, 8 at 5.25; Baguette, 20 at 3.25. A second sheet, Suppliers, lists names. Loading the file gives you a Workbook object, and sheetnames tells you what tabs it holds:"],
  ["code",">>> import openpyxl\n>>> wb = openpyxl.load_workbook('bakery.xlsx')\n>>> type(wb)\n<class 'openpyxl.workbook.workbook.Workbook'>\n>>> wb.sheetnames\n['Orders', 'Suppliers']"],
  ["p","Index the workbook with a sheet name, like a dictionary, to get a Worksheet object. The active attribute holds the sheet that was selected when the file was last saved — useful when you do not care which sheet is which. Asking for a sheet that does not exist is a KeyError, same as a missing dictionary key:"],
  ["code",">>> sheet = wb['Orders']\n>>> sheet.title\n'Orders'\n>>> wb.active\n<Worksheet \"Orders\">\n>>> wb['Nope']\nKeyError: 'Worksheet Nope does not exist.'"],
  ["p","Index the sheet with a cell name and you get a Cell object — the box, not its contents. The value attribute is the contents. A Cell also knows where it lives: coordinate is the full name, row the number, column_letter the letter."],
  ["code",">>> sheet['A1']\n<Cell 'Orders'.A1>\n>>> sheet['A1'].value\n'Item'\n>>> c = sheet['B2']\n>>> c.value\n12\n>>> c.coordinate\n'B2'\n>>> c.row\n2\n>>> c.column_letter\n'B'"],
  ["p","Cell names like 'B2' are awkward inside a loop, because they are strings. The sheet's cell() method takes row and column as plain integers instead, which is what you want when a loop variable is doing the counting. The sheet also knows its own size: max_row and max_column are the extent of the data."],
  ["code",">>> sheet.cell(row=2, column=1)\n<Cell 'Orders'.A2>\n>>> sheet.cell(row=2, column=1).value\n'Sourdough'\n>>> sheet.max_row\n4\n>>> sheet.max_column\n3"],
  ["p","Put cell() and a range() together and you can walk a whole column — here column 2, from the header down:"],
  ["code","for r in range(1, 5):\n    print(sheet.cell(row=r, column=2).value)"],
  ["code","Loaves\n12\n8\n20"],
  ["note","sheet['A1'] is the cell; sheet['A1'].value is what is written in it. Print the first and you get <Cell 'Orders'.A1>, not your data — forgetting .value is the standard first mistake with openpyxl, and the program runs without any error to point at it."]
]},
{ t: "Column letters and slices",
  body: [
  ["p","Code that counts columns needs numbers; people reading a spreadsheet think in letters. openpyxl ships both directions of the conversion in its utils module. Note where plain counting stops matching your intuition: after column Z the letters double up, so column 27 is AA."],
  ["code",">>> from openpyxl.utils import get_column_letter, column_index_from_string\n>>> get_column_letter(1)\n'A'\n>>> get_column_letter(3)\n'C'\n>>> get_column_letter(27)\n'AA'\n>>> get_column_letter(sheet.max_column)\n'C'\n>>> column_index_from_string('AA')\n27"],
  ["p","To grab a rectangle of cells at once, slice the sheet from one corner name to the other. The slice yields the region row by row, and each row yields its cells, so two nested for loops visit every cell in reading order:"],
  ["code","for row in sheet['A1':'C2']:\n    for c in row:\n        print(c.coordinate, c.value)\n    print('--- row ends ---')"],
  ["code","A1 Item\nB1 Loaves\nC1 Price\n--- row ends ---\nA2 Sourdough\nB2 12\nC2 6.5\n--- row ends ---"],
  ["p","A single whole column is even shorter — index the sheet with just the letter:"],
  ["code","for c in sheet['B']:\n    print(c.value)"],
  ["code","Loaves\n12\n8\n20"],
  ["note","Rows and columns in openpyxl start at 1, not 0. Lists trained you to reach for index 0, but sheet.cell(row=0, column=1) raises an error — there is no row zero, and a loop written range(0, sheet.max_row) both crashes at the start and misses the last row."]
]},
{ t: "A reading project: totalling the order sheet",
  body: [
  ["p","Real spreadsheet programs have a shape you will reuse: open the file and read the cells, build a normal Python data structure from them, then report on the structure. The bakery wants to know what each bread earns and what the whole order book is worth. Loaves times price, summed — a job for a loop over the data rows and a dictionary keyed by item name."],
  ["code","import openpyxl\nwb = openpyxl.load_workbook('bakery.xlsx')\nsheet = wb['Orders']\nrevenue = {}\nfor r in range(2, sheet.max_row + 1):\n    item = sheet.cell(row=r, column=1).value\n    loaves = sheet.cell(row=r, column=2).value\n    price = sheet.cell(row=r, column=3).value\n    revenue[item] = loaves * price\ntotal = 0\nfor item in revenue:\n    print(item + ': $' + str(revenue[item]))\n    total = total + revenue[item]\nprint('Whole order: $' + str(total))"],
  ["code","Sourdough: $78.0\nRye: $42.0\nBaguette: $65.0\nWhole order: $185.0"],
  ["p","Two details to notice. The loop starts at row 2, because row 1 is the header — treat headers as labels, never as data. And the row loop runs to sheet.max_row + 1, because range() stops one short of its end value; forgetting the + 1 silently drops the last bread from the total, which is the kind of bug a spreadsheet user only finds at the end of the month."],
  ["p","Everything about this program scales. The same skeleton reads a thousand-row export from a till system, a membership list, or a lab's measurement log: loop over rows, pull the columns you need by number, accumulate into a dictionary, report. When a spreadsheet is too big to eyeball, this is the program you write instead."]
]},
{ t: "Writing a workbook",
  body: [
  ["p","openpyxl also works in the other direction: make a workbook in memory, fill it, and save it to disk. A fresh Workbook() starts with one empty sheet named Sheet. Renaming it is an assignment to title:"],
  ["code",">>> wb = openpyxl.Workbook()\n>>> wb.sheetnames\n['Sheet']\n>>> sheet = wb.active\n>>> sheet.title\n'Sheet'\n>>> sheet.title = 'Stock'\n>>> wb.sheetnames\n['Stock']"],
  ["p","create_sheet() adds a sheet at the end and returns it; index and title keyword arguments control where it goes and what it is called. Removing one is del on the workbook, the same statement you would use on a dictionary entry:"],
  ["code",">>> wb.create_sheet()\n<Worksheet \"Sheet\">\n>>> wb.create_sheet(index=0, title='Front')\n<Worksheet \"Front\">\n>>> wb.sheetnames\n['Front', 'Stock', 'Sheet']\n>>> del wb['Sheet']\n>>> wb.sheetnames\n['Front', 'Stock']"],
  ["p","Writing a value is the same indexing you used for reading, on the left side of an assignment. Nothing touches the disk until save() — the workbook lives in memory, and quitting without saving discards it, exactly like closing Excel and clicking Do Not Save:"],
  ["code",">>> sheet['A1'] = 'Item'\n>>> sheet['A1'].value\n'Item'\n>>> wb.save('gear.xlsx')"],
  ["note","save() writes to whatever filename you hand it, and if a file by that name exists it is replaced without any warning. Load inventory.xlsx, change cells, save back to 'inventory.xlsx', and the original is gone — one buggy loop and there is no undo. While a program is young, save to a new name and keep the source file untouched."]
]},
{ t: "A writing project: fixing the price list",
  body: [
  ["p","A climbing-gear shop keeps its stocktake in gear.xlsx. First, the program that builds it — a list of rows, written cell by cell with the same cell() method used for reading, plus 1 everywhere because the sheet counts from 1:"],
  ["code","import openpyxl\nwb = openpyxl.Workbook()\nsheet = wb.active\nsheet.title = 'Stock'\nrows = [['Item', 'Price'], ['Rope', 40], ['Chalk', 21], ['Tape', 12], ['Harness', 55]]\nfor r in range(len(rows)):\n    sheet.cell(row=r + 1, column=1).value = rows[r][0]\n    sheet.cell(row=r + 1, column=2).value = rows[r][1]\nwb.save('gear.xlsx')\nprint('saved gear.xlsx with', sheet.max_row, 'rows')"],
  ["code","saved gear.xlsx with 5 rows"],
  ["p","Two of those prices are wrong — chalk sells for 9, not 21, and finger tape for 4, not 12. In a four-row sheet you would fix that by hand; in a four-thousand-row one you write the fix as data. A dictionary maps each wrong item to its correct price, and a loop checks every row against it. Rows whose item is not in the dictionary pass through untouched:"],
  ["code","import openpyxl\nFIXES = {'Chalk': 9, 'Tape': 4}\nwb = openpyxl.load_workbook('gear.xlsx')\nsheet = wb['Stock']\nfor r in range(2, sheet.max_row + 1):\n    item = sheet.cell(row=r, column=1).value\n    if item in FIXES:\n        sheet.cell(row=r, column=2).value = FIXES[item]\nwb.save('gear-fixed.xlsx')\nwb2 = openpyxl.load_workbook('gear-fixed.xlsx')\nsheet2 = wb2['Stock']\nfor r in range(2, sheet2.max_row + 1):\n    print(sheet2.cell(row=r, column=1).value, sheet2.cell(row=r, column=2).value)"],
  ["code","Rope 40\nChalk 9\nTape 4\nHarness 55"],
  ["p","Notice what the dictionary buys you. The corrections are one line of data, not a chain of if item == 'Chalk' tests — adding a third fix means adding a pair to FIXES and touching no other code. And the program saves to gear-fixed.xlsx, so the original survives to be diffed against the output. The same pattern updates any sheet from any lookup: new prices from a supplier file, corrected names from HR, translated labels."]
]},
{ t: "Fonts and formulas",
  body: [
  ["p","Cells carry formatting as well as values. To style one from code, import the Font class from openpyxl.styles, build a Font object with keyword arguments like size, bold, and italic, and assign it to the cell's font attribute. Reading the attribute back confirms what stuck — note that size comes back as the float 18.0:"],
  ["code",">>> from openpyxl.styles import Font\n>>> wb = openpyxl.Workbook()\n>>> sheet = wb.active\n>>> sheet['A1'] = 'Stock report'\n>>> sheet['A1'].font = Font(size=18, bold=True)\n>>> sheet['A1'].font.bold\nTrue\n>>> sheet['A1'].font.size\n18.0"],
  ["p","A formula is written the way a value is — assign a string starting with an equal sign. Spreadsheet users type the same thing into the formula bar. Reading the cell back gives you the string you stored:"],
  ["code",">>> sheet['B2'] = 120\n>>> sheet['B3'] = 45\n>>> sheet['B4'] = '=SUM(B2:B3)'\n>>> sheet['B4'].value\n'=SUM(B2:B3)'\n>>> wb.save('styled.xlsx')"],
  ["p","openpyxl never calculates anything. It stores the formula text; Excel does the arithmetic when the file is opened there. load_workbook() has a data_only=True option that returns the result Excel last saved for the cell instead of the formula — but this file has never been opened by Excel, so there is no saved result and the option returns None:"],
  ["code","wb = openpyxl.load_workbook('styled.xlsx')\nprint(wb.active['B4'].value)\nwb2 = openpyxl.load_workbook('styled.xlsx', data_only=True)\nprint(wb2.active['B4'].value)"],
  ["code","=SUM(B2:B3)\nNone"],
  ["note","Expecting sheet['B4'].value to be 165 is the mistake everyone makes once. The value of a formula cell is the formula. If your program needs the number, compute it in Python from the cells the formula names — you have the loop skills to do it — or rely on data_only and accept None whenever Excel has not saved the file since the formula was written."]
]},
{ t: "Layout: row heights, merged cells, freeze panes, charts",
  body: [
  ["p","Sheet layout is attributes on the worksheet. Row heights and column widths live in the row_dimensions and column_dimensions mappings — index one by row number, the other by column letter, and assign:"],
  ["code",">>> sheet.row_dimensions[1].height = 70\n>>> sheet.column_dimensions['B'].width = 25"],
  ["p","merge_cells() fuses a rectangle of cells into one big cell, named by its range string; the merged cell's value lives in its top-left corner. unmerge_cells() with the same range string splits it back apart:"],
  ["code",">>> sheet.merge_cells('A6:D6')\n>>> str(sheet.merged_cells)\n'A6:D6'\n>>> sheet.unmerge_cells('A6:D6')"],
  ["p","Freeze panes keep header rows visible while the data scrolls. The freeze_panes attribute takes the name of the first cell that should scroll: everything above it and everything to its left stays pinned. So 'A2' pins row 1, 'B1' pins column A, and 'B2' pins both."],
  ["code",">>> sheet.freeze_panes = 'A2'\n>>> sheet.freeze_panes\n'A2'"],
  ["p","Charts are built from three objects. A Reference marks which cells hold the numbers, a Series wraps the Reference with a name, and the chart object collects series. add_chart() places the finished chart with its top-left corner at the cell you name. BarChart has siblings — openpyxl.chart also provides LineChart, ScatterChart, and PieChart:"],
  ["code","wb = openpyxl.Workbook()\nsheet = wb.active\ncounts = [12, 8, 20, 15, 9]\nfor i in range(5):\n    sheet.cell(row=i + 1, column=1).value = counts[i]\nref = openpyxl.chart.Reference(sheet, min_col=1, min_row=1, max_col=1, max_row=5)\nseries = openpyxl.chart.Series(ref, title='Loaves')\nchart = openpyxl.chart.BarChart()\nchart.title = 'Loaves per day'\nchart.append(series)\nsheet.add_chart(chart, 'C2')\nwb.save('chart.xlsx')"],
  ["note","freeze_panes names the first unfrozen cell, not the row you want pinned. Setting it to 'A1' — the natural guess for freezing row 1 — freezes nothing at all, since nothing sits above or left of A1; openpyxl records it as None, the unfrozen state. To pin row 1, name the cell below it: 'A2'."]
]},
{ t: "Summary",
  body: [
  ["p","A workbook holds sheets, a sheet holds cells, and openpyxl gives Python a handle on all three: load_workbook() and Workbook() to open and create, sheetnames and indexing to reach a sheet, cell names or cell(row, column) to reach a value, and save() to write the result to disk — to a new filename while you are still debugging. Around that core sit the trimmings a finished spreadsheet needs: Font objects, formula strings that Excel will calculate later, merged ranges, frozen header rows, and charts."],
  ["p","The programs worth keeping from this chapter are the two skeletons: read rows into a dictionary and report on it, and walk rows applying a dictionary of fixes and save a corrected copy. The graded exercises below drill exactly those moves on plain lists and dictionaries, so they run inside this app — model the sheet, total the column, flip rows to columns, apply the fixes. Same thinking, no Excel required."]
]}
],
questions: [
{ q:"What is the difference between a workbook, a worksheet, and a cell, and what does the address 'C4' mean?",
  a:"The workbook is the whole .xlsx file; a worksheet is one tab's grid inside it; a cell is one box in the grid. 'C4' names the cell in column C — the third column — and row 4." },
{ q:"How do you open an existing spreadsheet file, and how do you find out what sheets it contains?",
  a:"wb = openpyxl.load_workbook('bakery.xlsx') opens it and returns a Workbook object. wb.sheetnames is a list of the sheet names as strings, like ['Orders', 'Suppliers']." },
{ q:"Give two different ways to reach cell B3 of a sheet.",
  a:"sheet['B3'] indexes by cell name; sheet.cell(row=3, column=2) reaches the same cell by numbers. The name form reads well for one-off cells; the numeric form is the one loops can drive." },
{ q:"What is the difference between sheet['A1'] and sheet['A1'].value?",
  a:"sheet['A1'] is the Cell object — printing it shows something like <Cell 'Orders'.A1>. sheet['A1'].value is the contents of the cell. Code that forgets .value gets cell objects where it expected data, with no error to say so." },
{ q:"Do openpyxl's row and column numbers start at 0 or at 1?",
  a:"At 1. sheet.cell(row=1, column=1) is A1, and asking for row 0 or column 0 raises an error. Loops over a sheet run range(1, sheet.max_row + 1), not the range(0, len(...)) shape lists taught you." },
{ q:"What do get_column_letter(27) and column_index_from_string('AA') evaluate to, and where do these functions live?",
  a:"'AA' and 27 — they are inverses. Both are imported from openpyxl.utils, and they exist because code counts columns in integers while sheets label them with letters." },
{ q:"What does openpyxl.Workbook() give you, and when does a file appear on disk?",
  a:"A new workbook in memory with a single empty sheet named 'Sheet'. No file exists until you call wb.save('name.xlsx') — everything before that lives only in memory and is lost if the program ends without saving." },
{ q:"You loaded inventory.xlsx, changed some cells, and want to keep the original file too. What must you do when saving, and why?",
  a:"Save to a different filename, like wb.save('inventory-fixed.xlsx'). save() overwrites an existing file of the same name without warning, so saving back to 'inventory.xlsx' destroys the original with no undo." },
{ q:"After sheet['B4'] = '=SUM(B2:B3)', what does sheet['B4'].value give you — and when does the addition actually happen?",
  a:"The string '=SUM(B2:B3)'. openpyxl stores formula text and never calculates; Excel computes the sum when it opens the file. load_workbook(..., data_only=True) returns Excel's last saved result instead — and None if Excel has never opened and saved the file." },
{ q:"You set sheet.freeze_panes = 'B2'. What is pinned when the file is opened — and why does setting it to 'A1' freeze nothing?",
  a:"Everything above and everything left of B2: row 1 and column A. The attribute names the first unfrozen cell, and nothing sits above or left of A1, so 'A1' means no panes — openpyxl records it as None, same as unfreezing." }
],
exercises: [
{ c:"lists", t:"Total a loaf column", book:"ch14",
  b:"The order sheet, as a list of row lists with a header row: rows = [['Item', 'Loaves'], ['Sourdough', 12], ['Rye', 8], ['Baguette', 20]]. Print each data row as the item name, a colon and a space, and the loaf count — then print 'Total loaves: ' followed by the sum.",
  o:"Sourdough: 12\nRye: 8\nBaguette: 20\nTotal loaves: 40",
  h:["The first row is a header, not data — the loop has to skip it or 'Item' ends up in your total.",
     "rows[1:] slices off the header. Each remaining row is a two-item list: row[0] is the name, row[1] is the count.",
     "Start total at 0; for each row in rows[1:], print row[0] + ': ' + str(row[1]) and add row[1] to total. After the loop, print the total line."]},
{ c:"lists", t:"Rows into columns", book:"ch14",
  b:"A sheet stores by rows, but you need columns. Given grid = [[1, 2, 3], [4, 5, 6]] — two rows, three columns — print each of the three columns as a list: first [1, 4], then [2, 5], then [3, 6].",
  o:"[1, 4]\n[2, 5]\n[3, 6]",
  h:["grid[r][c] is the cell in row r, column c. One column is every row's value at the same fixed c.",
     "Loop c over range(3); inside, build a fresh list by looping r over range(2) and appending grid[r][c].",
     "For each c: start an empty list, append grid[0][c] and grid[1][c] via the inner loop, then print that list before moving to the next c."]},
{ c:"dicts", t:"A sheet in a dictionary", book:"ch14",
  b:"Model a sheet as a dictionary keyed by cell name: sheet = {'A1': 'Item', 'B1': 'Qty', 'A2': 'Nails', 'B2': 150, 'A3': 'Screws', 'B3': 95, 'A4': 'Hooks', 'B4': 60}. For rows 2 through 4, print the item name, a colon and a space, and its quantity — then print 'Total: ' followed by the summed quantities.",
  o:"Nails: 150\nScrews: 95\nHooks: 60\nTotal: 305",
  h:["The keys are strings, and strings can be built: the name cell of row r is 'A' + something.",
     "'A' + str(r) is row r's name key and 'B' + str(r) its quantity key — exactly how cell names worked in the chapter.",
     "Loop r over range(2, 5): look up both keys, print sheet['A' + str(r)] + ': ' + str(the quantity), and add the quantity to a running total. Print the total after the loop."]},
{ c:"dicts", t:"The price fixer", book:"ch14",
  b:"The stocktake rows = [['Rope', 40], ['Chalk', 21], ['Tape', 12], ['Harness', 55]] contain two wrong prices, and fixes = {'Chalk': 9, 'Tape': 4} holds the corrections. Apply every fix to rows, then print each row as the item name, a colon and a space, a dollar sign, and the price.",
  o:"Rope: $40\nChalk: $9\nTape: $4\nHarness: $55",
  h:["Only some rows change — act only when the row's item has an entry in fixes.",
     "row[0] in fixes asks whether a correction exists; fixes[row[0]] is the corrected price; assigning to row[1] changes the list in place.",
     "For each row in rows: if row[0] in fixes, set row[1] = fixes[row[0]]. Then — fixed or not — print row[0] + ': $' + str(row[1])."]}
]
};
