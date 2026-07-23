/* Practice Log book — Chapter 15: Google Sheets.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from
   memory. EZSheets needs Google credentials and a network, so every ezsheets
   block is shown without output claims — behavior is described in prose.
   The pure-Python blocks were executed and verified as usual
   (tests/ch15_verify.py re-checks them). */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch15 = {
n: 15,
title: "Google Sheets",
src: "https://automatetheboringstuff.com/3e/chapter15.html",
blurb: "Drive Google Sheets from Python with EZSheets — Spreadsheet and Sheet objects, cells to lists and back, and the quotas that meter every request.",
sections: [
{ t: "Installing and setting up EZSheets",
  body: [
  ["p","Google Sheets is a spreadsheet that lives in the browser and in Google Drive: nothing to install, shareable by link, editable by several people at once. That last part is what makes it worth automating — a script can read and write a spreadsheet your whole household or team sees, with nobody mailing files around. The third-party EZSheets package does the talking; install it from the command line with pip install ezsheets."],
  ["note","This chapter's library needs a desktop Python, a Google account, and credential files, so nothing in it can run inside this offline app — there is no runtime here that can reach Google. The concepts still transfer, and the graded exercises below use built-in Python on the same rows-and-cells ideas, so the chapter is still practised, not just read."],
  ["p","Unlike every library so far, EZSheets cannot simply start working: it has to prove to Google that it is allowed into your account. The setup is a one-time errand through the Google Cloud website, in five parts — create a project, enable both the Google Sheets API and the Google Drive API (Drive handles uploads and downloads), configure the OAuth consent screen, create desktop-app credentials, and download the credentials JSON file that step produces."],
  ["p","The first import in the folder holding that file finishes the job. EZSheets looks in the current working directory, finds the credentials, and opens your browser so you can sign in and approve access. Approving writes two token files — token-sheets.pickle and token-drive.pickle — next to the credentials. From then on those three files are the login: later imports find them and proceed without asking."],
  ["code","# One-time, run in the folder holding your credentials JSON file:\nimport ezsheets\n# The browser opens; sign in and approve access. Two token files\n# appear beside the credentials. Every later import finds all three\n# and stays quiet."],
  ["p","Treat the credential and token files like passwords. Whoever holds them cannot change your Google password, but they can read and edit your spreadsheets, which is plenty. If they leak, revoke the credentials on the Google Cloud console's credentials page and generate fresh ones — the leaked files become useless the moment you do."],
  ["note","Scripts fail here for an unglamorous reason: they were launched from a different folder. EZSheets looks for the credential and token files in the current working directory — the folder you ran the script from, not the folder the script lives in. Launch from the wrong place and the login that worked yesterday is suddenly missing."]
]},
{ t: "Spreadsheet objects",
  body: [
  ["p","The vocabulary first. A spreadsheet holds one or more sheets — the tabs along the bottom of the page — and each sheet is a grid of cells. Columns are lettered from A and rows are numbered from 1, so the grid counts from 1 in both directions, unlike Python lists, which count from 0. That mismatch runs quietly through the whole chapter. EZSheets mirrors the structure with two object types: Spreadsheet and Sheet."],
  ["p","Every Google Sheets spreadsheet has a unique ID, visible in its browser URL between the /d/ and the /edit. Calling ezsheets.Spreadsheet() with no argument creates a new, blank spreadsheet in your Drive; passing an ID — or the whole URL, laziness being fine here — opens an existing one. The object's title attribute is assignable; id and url are read-only facts about it."],
  ["code","import ezsheets\nss = ezsheets.Spreadsheet()      # a new, blank spreadsheet in your Drive\nss.title = 'Shed Loans'          # renames the real spreadsheet as it runs\nsame = ezsheets.Spreadsheet('1FakeSpreadsheetIdForExample')\nalso = ezsheets.Spreadsheet(\n    'https://docs.google.com/spreadsheets/d/1FakeSpreadsheetIdForExample/edit')\n# same and also are handles to the same online spreadsheet"],
  ["p","A Spreadsheet object is a live handle, not a copy. Assigning to ss.title renames the spreadsheet in Drive the moment the line runs. Traffic the other way is not automatic: if someone edits the spreadsheet in their browser after your script loaded it, your objects keep the older data until you call ss.refresh(), which re-reads the online state into the Spreadsheet and every Sheet it holds."],
  ["note","There is no save step, and that cuts both ways. Nothing you do is a local draft — every write lands in the shared spreadsheet immediately, in front of everyone who has it open. Point your first experiments at a throwaway spreadsheet, not the one your team actually uses."]
]},
{ t: "Uploading, downloading, and deleting spreadsheets",
  body: [
  ["p","Existing files can move up into Drive: ezsheets.upload() takes the filename of an Excel, OpenOffice, CSV, or TSV file, creates a new Google Sheets spreadsheet from it, and returns the Spreadsheet object, titled after the file. To see what your account holds, listSpreadsheets() returns a dictionary mapping each spreadsheet's ID to its title."],
  ["code","import ezsheets\nss = ezsheets.upload('shed_loans.xlsx')   # local file in, Spreadsheet out\nmine = ezsheets.listSpreadsheets()        # dict of id: title for your account"],
  ["p","Downloads go the other way. downloadAsExcel(), downloadAsODS(), downloadAsCSV(), downloadAsTSV(), and downloadAsPDF() each write a file into the current working directory and return the filename they wrote. A CSV or TSV file can only hold a single grid, so those two export just the first sheet."],
  ["code","path = ss.downloadAsExcel()     # writes an .xlsx file, returns its filename\ncsv_path = ss.downloadAsCSV()   # first sheet only - a CSV holds one grid"],
  ["p","Deleting is two different acts wearing one name. ss.delete() moves the spreadsheet to Drive's trash, where a human can restore it. ss.delete(permanent=True) skips the trash and cannot be undone — which is why a script should almost never pass it: a bug that trashes a spreadsheet is an undo away, and Drive storage is measured in gigabytes, so reclaiming space is rarely worth the risk."],
  ["note","listSpreadsheets() counts the trash. Delete a spreadsheet, list again, and it is still in the dictionary — delete() only moved it. Code that checks whether a spreadsheet is gone by looking in listSpreadsheets() will keep finding it until the trash is emptied."]
]},
{ t: "Sheet objects",
  body: [
  ["p","The data lives one level down, in Sheet objects. ss.sheets is a tuple of them, in the order the tabs appear, and ss.sheetTitles is the matching tuple of titles. Both routes reach a sheet: ss.sheets[0] by position, ss['Loans'] by title. A newly created spreadsheet arrives with a single sheet named Sheet1."],
  ["p","ss.Sheet('Archive') creates a new tab at the end of the row. An optional second argument places it, the way list.insert() does — ss.Sheet('Overview', 0) makes the new tab first and shifts the rest along. Existing tabs reorder through their index attribute: read it to learn a sheet's position, assign to it to move the tab."],
  ["code","import ezsheets\nss = ezsheets.Spreadsheet('1FakeSpreadsheetIdForExample')\nloans = ss['Loans']         # a tab, by its title\nfirst = ss.sheets[0]        # the same kind of object, by position\nss.Sheet('Archive')         # new tab at the end\nss.Sheet('Overview', 0)     # new tab in front, like list.insert\nloans.index = 0             # move the Loans tab to the front"],
  ["p","Three ways to unmake things, with very different stakes. sheet.delete() removes the tab and its data for good — individual sheets do not pass through the trash; only whole spreadsheets do. sheet.clear() keeps the tab and empties every cell in it. sheet.copyTo(other_ss) copies the sheet into another Spreadsheet object, where it arrives titled Copy of whatever it was called."],
  ["note","The asymmetry is the trap: ss.delete() can be undone from Drive's trash, sheet.delete() cannot be undone at all. A script about to delete a sheet should copyTo() a backup spreadsheet first — after the delete there is nothing to recover."]
]},
{ t: "Reading and writing cell data",
  body: [
  ["p","Square brackets on a Sheet reach single cells. Reading sheet['A1'] evaluates to the cell's value, assignment writes it, and an empty cell comes back as '' — an empty string, not None. Every cell also answers to a second address, a (column, row) pair of integers: sheet[2, 1] is B1, column 2 in row 1, both counted from 1."],
  ["code","import ezsheets\nss = ezsheets.Spreadsheet('1FakeSpreadsheetIdForExample')\nsheet = ss.sheets[0]\nsheet['A1'] = 'Member'\nsheet['B1'] = 'Tokens'\nsheet['A2'] = 'Farrah'\nsheet['B2'] = 30        # written as a number...\nowed = sheet['B2']      # ...read back as the string '30'"],
  ["p","That last comment is the chapter's central trap. Whatever a cell holds, EZSheets hands your program a string: write the integer 30, read back '30'. A string that looks like a number passes silently through prints and comparisons and only fails when arithmetic finally touches it — so convert at the border, the moment a value leaves the sheet:"],
  ["code",">>> int('30') + 12\n42\n>>> '30' + 12\nTypeError: can only concatenate str (not \"int\") to str"],
  ["p","For code that loops over the grid numerically, EZSheets includes address translators. convertAddress() turns 'A2' into its pair form, (1, 2), and turns a pair back into the string form. getColumnLetterOf() and getColumnNumberOf() translate a single column between letter and number — column 2 is B, and past column Z the letters pair up into AA, AB, and onward."],
  ["code","ezsheets.convertAddress('A2')     # the (column, row) pair form of A2\nezsheets.convertAddress(1, 2)     # the string form of column 1, row 2\nezsheets.getColumnLetterOf(2)     # column 2, as a letter\nezsheets.getColumnNumberOf('AB')  # and back the other way"],
  ["note","Two addressing systems, two orders. The pair form is (column, row) — column first. But once getRows() hands you a list of lists, indexing flips to rows[row][column], row first, and starts counting from 0 instead of 1. Most off-by-one bugs in spreadsheet code are one of those two flips."]
]},
{ t: "Rows and columns as lists",
  body: [
  ["p","Each single-cell write is its own network request — around a second each. Three cells, fine; a table, hopeless. The batch methods move whole lines instead. getRow(1) and getColumn(1) — or getColumn('A') — return a row or column as a list of strings; updateRow() and updateColumn() overwrite one from a list. getRows() returns the entire grid as a list of row-lists, and updateRows() writes it back. The working pattern: read once, edit plain Python lists, write once."],
  ["code","import ezsheets\nss = ezsheets.Spreadsheet('1FakeSpreadsheetIdForExample')\nsheet = ss.sheets[0]\nrows = sheet.getRows()     # the whole grid: a list of lists of strings\nrows[1][2] = '58'          # edit the Python copy...\nsheet.updateRows(rows)     # ...write it back in one request"],
  ["p","Once getRows() has run, the spreadsheet part of the program is over — what remains is a plain list of lists, and everything chapters 6 and 7 taught applies to it. Say a bake-sale sheet has a header row, then one row per item: name, price, count sold, every cell a string. Totalling the takings is a slice to skip the header and a conversion before the arithmetic:"],
  ["code","rows = [['ITEM', 'PRICE', 'SOLD'],\n        ['banana bread', '4', '31'],\n        ['flapjack', '3', '18'],\n        ['lemon drizzle', '5', '12']]\ntotal = 0\nfor row in rows[1:]:\n    total = total + int(row[1]) * int(row[2])\nprint('Takings:', total)"],
  ["code","Takings: 238"],
  ["p","A sheet's grid is usually bigger than the table in it — a new sheet arrives 1,000 rows by 26 columns. The rowCount and columnCount attributes report the size, and assigning to them resizes the grid; shrink it below where data sits and the cells off the edge are cut. The oversized grid also explains a surprise in fetched data: rows come back padded to the sheet's width with trailing empty strings."],
  ["note","len(row) measures the sheet's width, not your table's. A three-column table in a 26-column sheet gives every fetched row 23 trailing '' entries, so row[-1] reads padding, not the last column of data. Index by known position, or slice the row down before working with it."]
]},
{ t: "Google Forms and the token ledger",
  body: [
  ["p","Google Forms is the sibling service: build a form — sign-up, RSVP, feedback — send the link around, and every submission lands as a row in a linked Google Sheets spreadsheet, one column per question. To Python that response sheet is just another spreadsheet, which makes a form the cheapest way to get other people's input into a script: the form is the interface, the sheet is the storage, EZSheets is the reader."],
  ["p","Here is a worked shape for the whole chapter: a babysitting co-op that pays in tokens. The shared ledger spreadsheet holds one row per transfer — giver, receiver, amount — and new member families are staked their first tokens by 'POT', the co-op's issuing account, which mints tokens rather than holding them. The auditing script fetches the rows once, then leaves EZSheets behind:"],
  ["code","import ezsheets\nss = ezsheets.Spreadsheet('1FakeSpreadsheetIdForExample')\nrows = ss['Ledger'].getRows()   # one network call, then plain Python"],
  ["p","The audit itself is a dictionary build, straight from chapter 7: walk the data rows, subtract each transfer from the giver — unless the giver is 'POT' — and add it to the receiver. With the fetched rows hardcoded, the logic runs right here:"],
  ["code","rows = [['FROM', 'TO', 'TOKENS'],\n        ['POT', 'Nguyen', '10'],\n        ['POT', 'Okafor', '10'],\n        ['Nguyen', 'Okafor', '3'],\n        ['Okafor', 'Nguyen', '5']]\nbalances = {}\nfor row in rows[1:]:\n    giver, taker, tokens = row[0], row[1], int(row[2])\n    if giver != 'POT':\n        balances[giver] = balances.get(giver, 0) - tokens\n    balances[taker] = balances.get(taker, 0) + tokens\nfor name in sorted(balances):\n    print(name, balances[name])"],
  ["code","Nguyen 12\nOkafor 8"],
  ["p","Recording a new transfer means writing to the first free row. The fetched grid is padded with empty rows, so count the used ones — stop at the first row whose first cell is empty — and write to that count plus one, because the grid numbers its rows from 1 while your count started at 0:"],
  ["code","new_row = ['Okafor', 'Nguyen', '2']\nused = 0\nfor row in rows:\n    if row[0] == '':\n        break\n    used = used + 1\nss['Ledger'].updateRow(used + 1, new_row)   # sheet rows count from 1"]
]},
{ t: "Working with Google Sheets quotas",
  body: [
  ["p","Everything in this chapter rides the network, and Google meters the traffic. A free account gets a few hundred read and write requests per minute, and creating new spreadsheets caps at 250 a day. Those are generous numbers for a script that updates a report a few times an hour, and tight ones for a loop that touches cells individually."],
  ["p","Past the limit, Google's client library raises an HttpError complaining that the quota group is exhausted. By default EZSheets absorbs it: the method call quietly waits and retries, so the symptom is not an exception but a call that takes seconds — sometimes a minute or two — before returning, and the error only re-raises if the retries keep failing. To handle quota errors yourself instead of waiting, set the module flag:"],
  ["code","import ezsheets\nezsheets.IGNORE_QUOTA = True   # quota errors raise instead of retrying quietly"],
  ["note","The quota burner is always the same script: a loop assigning cells one at a time. Three hundred cells is three hundred requests — a whole minute's budget in one go — so the script that sailed through a ten-row test stalls mysteriously on the real table. Batch it: one getRows(), edits in Python, one updateRows()."],
  ["p","The meter is also a reminder of what the tool is for. A shared spreadsheet that people read in their browsers, updated by a script on a human timescale, sits comfortably inside the limits. A program that hammers thousands of values a second wants chapter 14's local Excel files — or a proper database — not a web API."]
]},
{ t: "Summary",
  body: [
  ["p","EZSheets puts a Google account's spreadsheets within reach of a script, at the price of a one-time credential setup: a Google Cloud project, two enabled APIs, and a credentials file that the first import trades for two token files. A Spreadsheet object holds an ordered collection of Sheet objects; cells answer to 'A1' names and to (column, row) pairs counted from 1; whole spreadsheets can be uploaded, downloaded in five formats, trashed, or — permanently — deleted."],
  ["p","Two facts do most of the work in practice. Every value read from a sheet is a string, so int() and float() guard every piece of arithmetic. And every method call is a network request, metered by quota, so real programs fetch the grid once with getRows(), reshape it with the list and dictionary tools from chapters 6 and 7, and write back once with updateRows(). That reshaping is exactly what the four exercises below drill, no Google account required."],
  ["p","The next chapter is Chapter 16, SQLite Databases: data in a single local file again, but structured — a real database where queries do the searching and filtering that this chapter did with loops."]
]}
],
questions: [
{ q:"Before an EZSheets script can touch a spreadsheet, three files have to sit in its working directory. Name them and say where each comes from.",
  a:"The credentials JSON file, downloaded from your Google Cloud project, plus the two token files — token-sheets.pickle and token-drive.pickle — that EZSheets writes after the first import, when you sign in and approve access in the browser. The credentials identify the project; the tokens prove the login happened." },
{ q:"EZSheets models a spreadsheet with two kinds of object. Name them and describe how they nest.",
  a:"Spreadsheet and Sheet. A Spreadsheet holds an ordered tuple of Sheet objects — the tabs — and each Sheet holds the grid of cells where the data actually lives." },
{ q:"A teammate pastes a spreadsheet's browser URL into chat. Give two ways to open it with ezsheets.Spreadsheet().",
  a:"Pass the whole URL, or pull out the ID — the long code between /d/ and /edit in the URL — and pass just that. Either way you get a handle to the same online spreadsheet." },
{ q:"What direction does ezsheets.upload() move data, and what direction does downloadAsExcel() move it?",
  a:"upload() sends a local spreadsheet file — Excel, OpenOffice, CSV, or TSV — up to Google Drive as a new Google Sheets spreadsheet and returns its Spreadsheet object. downloadAsExcel() writes the online spreadsheet down into a local .xlsx file and returns the filename it wrote." },
{ q:"ss is a Spreadsheet with a sheet titled 'Roster'. Write the expression that reads cell B2 of that sheet.",
  a:"ss['Roster']['B2'] — the title picks the Sheet, the cell name picks the cell. The pair form ss['Roster'][2, 2] reads the same cell: column 2, row 2, both counted from 1." },
{ q:"A script writes sheet['B2'] = 30 and later reads the cell back. What value comes back, and what happens if the script adds 12 to it without converting?",
  a:"The string '30' — cell data always comes back as strings. '30' + 12 raises TypeError: can only concatenate str (not \"int\") to str, while int('30') + 12 is 42. Convert at the moment a value leaves the sheet." },
{ q:"ss.delete() and sheet.delete() sound alike. What is the recoverability difference?",
  a:"ss.delete() moves the whole spreadsheet to Drive's trash, where it can be restored — and it still appears in listSpreadsheets(). Only delete(permanent=True) destroys it. sheet.delete() removes a tab with no trash step and no recovery, which is why a backup via copyTo() comes first." },
{ q:"A loop assigns 200 cells one at a time and crawls. Why, and what is the fix?",
  a:"Every single-cell assignment is its own network request — around a second each, and each one counts against the per-minute quota. Fetch once with getRows(), edit the lists in Python, and write once with updateRows(): one request instead of 200." },
{ q:"rows came from getRows(). Which sheet row is rows[3], and why?",
  a:"Sheet row 4. The grid numbers rows from 1 while the Python list counts from 0, so sheet row n sits at rows[n - 1] — and after five used rows, the first free sheet row is 6, the list count plus one." },
{ q:"A script exceeds the request quota. What does EZSheets do by default, and what changes with ezsheets.IGNORE_QUOTA = True?",
  a:"By default it catches Google's quota HttpError and retries, so the call stalls for seconds — sometimes minutes — before returning, and re-raises only if the retries keep failing. With IGNORE_QUOTA set to True the error raises immediately, and handling it is your code's job." }
],
exercises: [
{ c:"lists", t:"Total the takings", book:"ch15",
  b:"A bake-sale sheet came back from getRows() as rows = [['ITEM', 'PRICE', 'SOLD'], ['scones', '3', '24'], ['brownies', '4', '17'], ['fudge', '5', '9']] — every cell a string. Skipping the header row, add up price times sold across the items and print the total in the form: Takings: <total>",
  o:"Takings: 185",
  h:["The first row is column headings, not a sale — the loop has to skip it.",
     "Slice past the header with rows[1:], and convert with int() before multiplying: the cells are strings.",
     "Start total at 0; each pass adds int(row[1]) * int(row[2]); finish with print('Takings:', total)."]},
{ c:"lists", t:"Who has the drill", book:"ch15",
  b:"The tool-shed loan sheet is rows = [['TOOL', 'BORROWER', 'DUE'], ['ladder', 'Priya', 'Friday'], ['drill', 'Marcus', 'Tuesday'], ['sander', 'Lena', 'Monday']]. Find the drill's row and print one line in the form: <borrower> has it until <day>",
  o:"Marcus has it until Tuesday",
  h:["Loop over the data rows, comparing each row's first cell to 'drill'.",
     "An if inside the for picks the matching row; row[1] is the borrower and row[2] the due day.",
     "The matching branch runs print(row[1], 'has it until', row[2]) — the loop around it is yours to write."]},
{ c:"dicts", t:"Rows into records", book:"ch15",
  b:"A sheet's header row is header = ['TOOL', 'BORROWER', 'DUE'] and one data row is row = ['sander', 'Lena', 'Monday']. Build a dict named record that maps each header to the value at the same position, then print record['BORROWER'] and record['DUE'] on separate lines.",
  o:"Lena\nMonday",
  h:["Position 0 of the header pairs with position 0 of the row, 1 with 1, 2 with 2.",
     "Loop over the positions with for i in range(len(header)) and add one key per pass.",
     "Start from record = {}; each pass assigns record[header[i]] = row[i]; then print the two lookups."]},
{ c:"dicts", t:"Audit the token pot", book:"ch15",
  b:"A babysitting co-op's ledger sheet is rows = [['FROM', 'TO', 'TOKENS'], ['POT', 'Ito', '8'], ['POT', 'Reyes', '8'], ['Ito', 'Reyes', '2'], ['Reyes', 'Ito', '5'], ['POT', 'Ito', '4']]. 'POT' mints tokens and is not a member. Build a dict of member balances — each transfer subtracts from the giver unless the giver is 'POT', and always adds to the receiver — then print each member's name and balance on its own line, in alphabetical order.",
  o:"Ito 15\nReyes 5",
  h:["One dict, name to balance, updated once per data row.",
     "balances.get(name, 0) reads a balance that may not exist yet; subtract only when row[0] is not 'POT'.",
     "Per row: tokens = int(row[2]); take tokens off row[0]'s balance unless it is 'POT'; add them to row[1]'s. Print with for name in sorted(balances)."]}
]
};
