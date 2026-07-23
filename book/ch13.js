/* Practice Log book — Chapter 13: Web Scraping.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from
   memory: stdlib blocks with python3, Beautiful Soup blocks in a scratch
   venv with beautifulsoup4 installed. Network-touching code (requests,
   selenium, playwright) is shown without output claims — nothing was fetched. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch13 = {
n: 13,
title: "Web Scraping",
src: "https://automatetheboringstuff.com/3e/chapter13.html",
blurb: "Downloading pages with requests, pulling data out of them with Beautiful Soup, and driving a real browser when a page will not sit still.",
sections: [
{ t: "URLs, HTTP, and the webbrowser module",
  body: [
  ["p","Everything the earlier chapters did happened on your own machine. Web scraping is the skill of reaching out: writing programs that download web pages and pull data out of them. Before any downloading, two ideas need to be solid — what a URL is, and how little of the protocol underneath you have to care about."],
  ["p","A URL names one page. https://example.org/tides/norwich says which protocol to speak (https), which server to ask (example.org), and which page on that server you want (/tides/norwich). HTTP is the fetch-and-carry protocol browsers speak; HTTPS is the same conversation encrypted, and it is what nearly every site uses now. Your programs will hand URLs to libraries and let the libraries speak the protocol."],
  ["p","The simplest web-touching program uses the built-in webbrowser module, which does exactly one thing: open a browser tab at a URL you give it."],
  ["code","import webbrowser\nwebbrowser.open('https://example.org/tides/norwich')"],
  ["p","Running that flips you over to your browser with the page loading. open() cannot read the page or report what happened there — the browser takes over. That single trick still automates something real: any chore that ends with a person looking at the right page."],
  ["p","A worked example: a script that opens a map page for whatever address you type after its name. Map sites put the search term straight in the URL after a fixed prefix, so the whole program is: read the address words from sys.argv, join them into one string, glue that onto the prefix, open the result. The joining is chapter 8 material:"],
  ["code",">>> ' '.join(['12', 'Harbour', 'Lane'])\n'12 Harbour Lane'"],
  ["code","# mapopen.py - open a map page for a street address\nimport webbrowser, sys\naddress = ' '.join(sys.argv[1:])\nwebbrowser.open('https://example.org/maps/place/' + address)"],
  ["p","sys.argv holds the words typed after the program's name, so python mapopen.py 12 Harbour Lane makes address the string '12 Harbour Lane'. The same shape opens weather pages for postcodes or tracking pages for parcel numbers: find the URL pattern, fill in the variable part, open."],
  ["note","Almost everything else in this chapter — requests, Beautiful Soup, Selenium, Playwright — is a third-party package: on a desktop Python you install each one with pip, and none of them can run inside this app. Read those code blocks as worked examples. The graded exercises at the bottom use only built-in Python, so they run and grade here as usual."]
]},
{ t: "Downloading pages with the requests module",
  body: [
  ["p","requests is the third-party library that downloads things without ceremony; pip install requests puts it on a desktop machine. Its requests.get() function takes a URL, performs the whole HTTP conversation, and hands back a Response object holding everything the server said."],
  ["code","import requests\nres = requests.get('https://example.org/poems/rain.txt')"],
  ["p","The Response carries a status code — the server's one-number verdict on the request. 200 is the famous success; 404 is the equally famous page-not-found. res.status_code holds the number, and res.text holds the downloaded page as one string, ready for len(), slicing, in, and everything else chapter 8 taught."],
  ["p","Checking the verdict every time is the discipline that separates scripts you trust from scripts you debug. The clean way is res.raise_for_status(): it does nothing when the download succeeded and raises requests.exceptions.HTTPError when it failed, so a bad download stops the program at the download instead of poisoning everything after it."],
  ["code","import requests\nres = requests.get('https://example.org/poems/rain.txt')\nres.raise_for_status()\n# from here res.text is yours to search and slice"],
  ["p","Saving a download to disk means writing bytes, not text. Open the file with 'wb' — write binary — and let iter_content() hand the body over in chunks, so a big file never has to fit in memory all at once:"],
  ["code","import requests\nres = requests.get('https://example.org/poems/rain.txt')\nres.raise_for_status()\nwith open('rain.txt', 'wb') as f:\n    for chunk in res.iter_content(100000):\n        f.write(chunk)"],
  ["p","'wb' matters because the response body arrives as raw bytes. Writing bytes byte-for-byte keeps images and other binary files intact and does no harm to text. Letting text mode reinterpret the encoding is how downloads get quietly mangled."],
  ["note","Scraping runs on someone else's server. Check a site's terms of service and its robots.txt file before pointing a program at it, keep your request rate gentle, and prefer an official API when one exists."]
]},
{ t: "Accessing a web API",
  body: [
  ["p","Some of the most useful downloads are not pages for people but answers for programs. A web API is a URL that returns data in JSON — a text format for nested values — instead of HTML. A weather service might answer https://api.example.org/forecast?lat=52.6&lon=1.3 with a JSON description of current conditions rather than a page about them."],
  ["p","JSON looks close enough to Python to read on sight, but it arrives as one big string. The built-in json module converts it: json.loads() takes the string and returns real Python values you can index. This part is standard library, so it runs here:"],
  ["code",">>> import json\n>>> raw = '{\"city\": \"Norwich\", \"temp_c\": 17.4, \"windy\": true}'\n>>> data = json.loads(raw)\n>>> data['temp_c']\n17.4\n>>> data['windy']\nTrue\n>>> type(data)\n<class 'dict'>"],
  ["p","A JSON object becomes a dict, arrays become lists, numbers become numbers — and JSON's lowercase true arrived as Python's True. Once loads() has run, an API's answer is chapter 7 material: index into it, loop over it, take what you need."],
  ["p","With requests the two steps chain — fetch, then parse. Response objects even carry a .json() method that does the loads() call for you:"],
  ["code","import requests\nres = requests.get('https://api.example.org/forecast?lat=52.6&lon=1.3')\nres.raise_for_status()\nforecast = res.json()\nprint(forecast['current']['temp_c'])"],
  ["p","APIs are everywhere once you start looking: weather, currency rates, public transport, dictionary definitions. Each service documents its URL patterns and the shape of its answers. When a site offers an API, use it instead of scraping the human pages — the data is cleaner, the format is stabler, and it is what the site wants programs to do."]
]},
{ t: "Understanding HTML",
  body: [
  ["p","To pull data out of a page you need just enough HTML to navigate it. An HTML file is text where every piece of content sits inside tags: <h1>Tide times</h1> is an h1 element — opening tag, inner text, closing tag. Elements nest inside each other, and the nesting makes a tree: the page is elements inside elements all the way down."],
  ["p","An opening tag can carry attributes — name=\"value\" pairs riding inside the angle brackets. Two matter most for scraping: id, a name meant to be unique on the page, and class, a label shared by every element of the same kind. Links use href to hold their destination. This fragment uses all three:"],
  ["code","<h1 id=\"shopname\">Kettle and Crow</h1>\n<p class=\"bean\">Kenya Nyeri <span class=\"price\">$18</span></p>\n<a href=\"https://example.com/order\">Order page</a>"],
  ["p","Every page will show you its HTML. Right-click in the browser and choose View Page Source — that is the exact text the server sent, the same string your program will download. Scrolling a real page's source is humbling: thousands of lines, most of them nothing to do with the data you want. Nobody reads it top to bottom."],
  ["p","The developer tools are the shortcut. Right-click the element you care about — the price, the headline — and choose Inspect: the browser opens its Elements panel scrolled to that node of the tree, nesting and attributes laid bare. That is where you find the id or class you will aim your program at. F12 or ctrl-shift-I opens the same panel; on a Mac, cmd-option-I."],
  ["p","Python ships a taste of parsing in the standard library. html.parser walks HTML text and reports what it finds; the small class below just prints each report. Class syntax is ahead of this book's curriculum — read those lines as a fixed recipe and watch the output instead:"],
  ["code","from html.parser import HTMLParser\n\nclass TagLogger(HTMLParser):\n    def handle_starttag(self, tag, attrs):\n        print('start:', tag, attrs)\n    def handle_data(self, data):\n        if data.strip() != '':\n            print('text :', data.strip())\n\npage = '<h1 id=\"top\">Tide times</h1><p>High tide at <b>14:52</b> today.</p>'\nTagLogger().feed(page)"],
  ["code","start: h1 [('id', 'top')]\ntext : Tide times\nstart: p []\ntext : High tide at\nstart: b []\ntext : 14:52\ntext : today."],
  ["p","The parser sees the page as a stream of events — a tag opens, text appears, a tag closes — with attributes delivered as name-value pairs. Notice what it does not give you: nothing here remembers that 14:52 sat inside the paragraph. Real scraping wants the tree kept intact, and that is the next section's library."],
  ["note","HTML on the real web is messier than any tutorial fragment — unclosed tags, attributes in either quote style or none, whitespace everywhere. Writing your own parser out of find() and split() feels easy right up until it meets a real page. The exercises below do it anyway, on tidy fragments, so you learn both the mechanics and the limits."]
]},
{ t: "Parsing HTML with Beautiful Soup",
  body: [
  ["p","Beautiful Soup builds the tree. It is third-party — pip install beautifulsoup4, then import bs4 — and its job is to turn HTML into an object you search with CSS selectors instead of string surgery. Every example below parses this small shop page, held in a Python string:"],
  ["code","page = \"\"\"<html><head><title>Kettle and Crow - Beans</title></head>\n<body>\n<h1 id=\"shopname\">Kettle and Crow</h1>\n<p class=\"bean\">Kenya Nyeri <span class=\"price\">$18</span></p>\n<p class=\"bean\">Sumatra Lintong <span class=\"price\">$15</span></p>\n<p class=\"bean sale\">Brazil Cerrado <span class=\"price\">$11</span></p>\n<a href=\"https://example.com/order\">Order page</a>\n</body></html>\"\"\""],
  ["p","bs4.BeautifulSoup() takes the HTML and the name of a parser — 'html.parser' is the built-in one from the last section, doing the low-level reading while Beautiful Soup assembles the tree. On a fetched page you would pass res.text; the parsing is identical either way."],
  ["code",">>> import bs4\n>>> soup = bs4.BeautifulSoup(page, 'html.parser')\n>>> soup.select('#shopname')\n[<h1 id=\"shopname\">Kettle and Crow</h1>]\n>>> soup.select('#shopname')[0].text\n'Kettle and Crow'"],
  ["p","select() takes a CSS selector — the same little language the developer tools show — and returns a list of every matching element. '#shopname' means the element whose id is shopname; ids are unique, so that list has one entry. The other selector to learn first is '.name', which matches every element whose class includes name:"],
  ["code",">>> prices = soup.select('.price')\n>>> len(prices)\n3\n>>> prices[0]\n<span class=\"price\">$18</span>\n>>> prices[0].text\n'$18'"],
  ["p","Selectors compose. 'p span' matches spans anywhere inside paragraphs; 'p.sale span' narrows that to paragraphs whose classes include sale. And a match is an element object, not a string — .text extracts its visible text, .get() reads one attribute, .attrs shows them all:"],
  ["code",">>> soup.select('p.sale span')\n[<span class=\"price\">$11</span>]\n>>> link = soup.select('a')[0]\n>>> link.get('href')\n'https://example.com/order'\n>>> link.text\n'Order page'\n>>> link.attrs\n{'href': 'https://example.com/order'}"],
  ["p","A scraper is those pieces in a loop: select the elements, take .text or .get() from each. This one prints every price on the page:"],
  ["code","for span in soup.select('.price'):\n    print(span.text)"],
  ["code","$18\n$15\n$11"],
  ["p","The costliest confusion is between an element and its text. An element prints looking exactly like HTML source, so it is easy to treat it as a string — but string methods are not there:"],
  ["code",">>> tag = soup.select('h1')[0]\n>>> tag\n<h1 id=\"shopname\">Kettle and Crow</h1>\n>>> tag.upper()\nTypeError: 'NoneType' object is not callable\n>>> tag.text.upper()\n'KETTLE AND CROW'"],
  ["p","The strange message is Beautiful Soup being helpful somewhere else: an unknown name on a tag is treated as a search for a child tag called upper, there is none, and calling the resulting None fails. The fix is knowing which thing you hold — the tag while you still need attributes or further selecting, .text the moment you want the words."],
  ["p","The other everyday surprise is the selector that matches nothing. select() never complains — it returns an empty list, and the error arrives later, at the indexing:"],
  ["code",">>> soup.select('.discount')\n[]\n>>> soup.select('.discount')[0]\nIndexError: list index out of range"],
  ["note","A selector is a bet that the page keeps its shape. One pinned to layout — 'div div span', counting on the third item in the second column — loses that bet at the site's next redesign, and the failure arrives as empty lists, not loud errors. Anchor on ids and meaning-carrying class names, check for the empty list, and treat every scraper as maintenance you have signed up for."],
  ["p","Everything bigger is composition. Open every result of a search: fetch the results page, select the result links, webbrowser.open() each href. Download a comic archive: fetch a page, select the image's URL and the previous-page link, save the one, follow the other, repeat. Fetch, select, act — that is the whole trade."]
]},
{ t: "Controlling the browser with Selenium",
  body: [
  ["p","requests never runs JavaScript. A page that builds its content with scripts after loading hands requests an empty shell, and no selector can find what was never in the download. Pages behind logins, or flows that demand real clicks, are the same story. The heavyweight answer is to stop imitating a browser and drive a real one."],
  ["p","Selenium (pip install selenium) launches a browser your program steers. The window visibly opens and navigates — anything a person could do at the keyboard and mouse, the script does instead:"],
  ["code","from selenium import webdriver\nfrom selenium.webdriver.common.by import By\nbrowser = webdriver.Firefox()\nbrowser.get('https://example.org/login')"],
  ["p","Finding elements uses the selectors you already know, through find_element(). It returns the first match as an object with actions on it: .click() presses it, .send_keys() types into it, .text reads it. Note the contrast with Beautiful Soup: find_element() raises NoSuchElementException when nothing matches, where select() handed you an empty list. The plural find_elements() is the list-returning one."],
  ["code","box = browser.find_element(By.CSS_SELECTOR, '#username')\nbox.send_keys('mira')\nbrowser.find_element(By.CSS_SELECTOR, 'button[type=\"submit\"]').click()"],
  ["p","Forms are that pattern repeated: find each field, send_keys() its value, click the submit button — the real browser handles the actual submitting, cookies and JavaScript included. Special keys live in the Keys module (Keys.ENTER, Keys.F5, the arrows), and the browser object handles the chrome: back(), forward(), refresh(), and quit() to close the window."]
]},
{ t: "Controlling the browser with Playwright",
  body: [
  ["p","Playwright is the younger tool for the same job, with one extra setup step that downloads its own browser builds: pip install playwright, then playwright install at the command line. Its scripts wrap the session in a with block that opens the machinery and cleans it up:"],
  ["code","from playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n    browser = p.chromium.launch(headless=False)\n    page = browser.new_page()\n    page.goto('https://example.org/login')\n    page.fill('#username', 'mira')\n    page.click('button[type=\"submit\"]')\n    browser.close()"],
  ["p","The moves map one-to-one onto Selenium's: goto() navigates, fill() types into whatever the selector matches, click() presses it, and page.keyboard.press() sends special keys like 'Enter'. headless=False shows the window while you develop; leave it out and the browser runs invisibly, which is what unattended scrapers usually want."],
  ["p","Choosing between these last two sections and the rest of the chapter is the real skill. Driving a browser is slow and heavy — a whole application starts up to answer each question. When the data sits in the plain HTML, requests plus Beautiful Soup wins on every count. The browser tools are for the pages that leave you no choice."]
]},
{ t: "Summary",
  body: [
  ["p","The chapter is one pipeline seen at increasing depth. A URL names the page; webbrowser.open() shows it to a person; requests.get() downloads it for a program, with raise_for_status() as the seatbelt and 'wb' the honest way to save it. APIs skip HTML entirely and answer in JSON, which json.loads() turns into dicts and lists. For pages, Beautiful Soup parses the HTML into a tree, select() finds elements by the ids and classes the developer tools showed you, and .text and .get() lift out the words and the attributes. When JavaScript builds the page, Selenium or Playwright drives a real browser through the same motions."],
  ["p","The graded exercises stay inside built-in Python — tidy HTML fragments and the string tools from chapter 8 — so the mechanics of finding things in markup run and grade right here. Answer the questions from memory before revealing, then clear the exercises."]
]}
],
questions: [
{ q:"requests.get() has just returned. What object do you have, and what does calling raise_for_status() on it do?",
  a:"A Response object holding everything the server said. raise_for_status() is the success check: it does nothing when the download worked and raises requests.exceptions.HTTPError when it failed, so a bad download crashes at the download instead of feeding garbage to the rest of the program." },
{ q:"Why open the output file with open(filename, 'wb') when saving a download, and what is iter_content() for?",
  a:"'wb' writes raw bytes, which keeps binary files like images intact and does no harm to text; text mode would reinterpret the encoding and can mangle the file. iter_content() hands the body over in chunks of a size you choose, so a large download is written piece by piece instead of held in memory whole." },
{ q:"What does json.loads('{\"temp\": 18, \"windy\": false}') evaluate to, and how do you get the 18 out of it?",
  a:"The dict {'temp': 18, 'windy': False} — JSON objects become dicts, and JSON's lowercase false becomes Python's False. Index it like any dict: ['temp'] gives 18." },
{ q:"In <a href='https://example.com/faq'>Help pages</a> — name the tag, the attribute, and the inner text.",
  a:"The tag is a. href is its one attribute, holding 'https://example.com/faq'. The inner text — what the page displays, and what .text would return — is 'Help pages'." },
{ q:"You need the id of one specific button on a live page. What is faster than reading the page source, and how do you get there?",
  a:"The browser's developer tools: right-click the button and choose Inspect. The Elements panel opens with that exact element highlighted in the tree, attributes in plain view. View Page Source shows the same document, but as a wall of text you would have to search by hand." },
{ q:"soup.select('.discount') matched nothing. What does it return, and what happens at soup.select('.discount')[0]?",
  a:"An empty list — select() never raises over a failed match. The [0] is what raises: IndexError: list index out of range. An unexpected empty list usually means the selector is wrong or the page changed; check the list before indexing into it." },
{ q:"What is the difference between soup.select('h1')[0] and soup.select('h1')[0].text?",
  a:"The first is a tag object: it prints looking like HTML, and it still knows its attributes, so .get() and further selecting work on it. The second is a plain string of the visible text. String methods belong to the second — called on the tag object they fail strangely, because an unknown name on a tag is treated as a search for a child tag." },
{ q:"Which selector finds every span inside a p whose class includes bean, and what does select() return when several elements match?",
  a:"'p.bean span'. select() always returns a list of matches in page order — on the shop page, all three price spans, including the one whose class is 'bean sale', because that class includes bean. One match or none still arrives as a list." },
{ q:"A scraper that ran for months now returns empty lists on every page. What is the likeliest break, and what makes a scraper last longer?",
  a:"The site changed its design and the selectors describe the old page — the Python is fine; the bet the selectors made is lost. Selectors anchored to ids and meaning-carrying class names outlive redesigns better than layout-shaped ones, and checking for empty results turns silent failure into a clear signal. Every scraper is standing maintenance." },
{ q:"When is driving a real browser with Selenium or Playwright worth its cost over requests plus Beautiful Soup?",
  a:"When the downloaded HTML does not contain the data: pages assembled by JavaScript after load, content behind logins, flows that need real clicks and typing. A driven browser runs the page the way a person's browser does, at the price of starting a whole application. When the data sits in the plain HTML, requests plus Beautiful Soup is faster, lighter, and steadier." }
],
exercises: [
{ c:"strings", t:"Pull the title", book:"ch13",
  b:"Given page = '<html><head><title>Tide Tables for Norwich</title></head><body></body></html>', use find() and slicing to print the text inside the title tag, and nothing else.",
  o:"Tide Tables for Norwich",
  h:["find() gives you the index where a substring begins. You need two positions: where the title text starts and where it stops.",
     "page.find('<title>') is where the tag begins, not where the text begins — the text starts len('<title>') characters further along. The closing tag's index is where the text stops.",
     "start is page.find('<title>') plus len('<title>'); end is page.find('</title>'). Print the slice between them."]},
{ c:"strings", t:"Harvest the links", book:"ch13",
  b:"Given links = \"<p><a href='https://example.com/tea'>Tea</a> and <a href='https://example.com/pots'>Pots</a> and <a href='https://example.org/faq'>FAQ</a></p>\", print each href URL on its own line, in page order.",
  o:"https://example.com/tea\nhttps://example.com/pots\nhttps://example.org/faq",
  h:["Each URL sits between href=' and the very next ' character.",
     "Splitting the string on href=' leaves a list where every piece after the first starts with a URL. Slicing the list with [1:] skips that first piece.",
     "Loop over links.split(\"href='\")[1:]; in each piece the URL runs from the start up to piece.find(\"'\"). Slice it out and print it."]},
{ c:"dicts", t:"Tag census", book:"ch13",
  b:"Given page = '<h1>Menu</h1><p>Soup</p><p>Bread</p><ul><li>Oat</li><li>Rye</li><li>Corn</li></ul><p>Butter</p>', build a dict mapping each tag name in the list ['h1', 'p', 'li'] to how many times its opening tag occurs in page, then print the dict.",
  o:"{'h1': 1, 'p': 3, 'li': 3}",
  h:["count() answers how many times a substring occurs, and the opening tag for p is the exact text <p>.",
     "Loop over the three names. For each, build its opening tag out of the name with + and count that, storing the result under the name in a dict.",
     "Start from counts = {} and fill counts[tag] inside the loop — the text to count is '<' + tag + '>'. Print the whole dict once at the end."]},
{ c:"strings", t:"Strip the tags", book:"ch13",
  b:"Given snippet = '<p>Rain <b>likely</b> after noon; bring a <i>dry</i> bag.</p>', print the visible text with every tag removed, using a while loop and find().",
  o:"Rain likely after noon; bring a dry bag.",
  h:["Everything from a < to the next > is markup to skip; every other character is text to keep.",
     "Walk an index across the string with a while loop. On an ordinary character, add it to a result string and step forward one; on a <, jump the index straight past the matching >.",
     "snippet.find('>', i) locates the closing bracket at or after i, so setting i to that plus one skips the whole tag. Collect kept characters in a string that starts empty, and print it after the loop."]}
]
};
