/* Practice Log book — Chapter 22: Recognizing Text in Images.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory.
   Engine-dependent blocks (pytesseract, NAPS2) show no outputs: they need a
   separately installed OCR engine and are disclosed in-section as not runnable here. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch22 = {
n: 22,
title: "Recognizing Text in Images",
src: "https://automatetheboringstuff.com/3e/chapter22.html",
blurb: "OCR turns pictures of text into strings — imperfect ones — and the string toolkit cleans up what comes back.",
sections: [
{ t: "What OCR is — and when it fails",
  body: [
  ["p","Every text tool this book has built up — chapter 8's string methods, chapter 9's regular expressions, chapter 10's file reads — starts from text that is already a string. A scanned page, a screenshot, or a photographed receipt is not one. It is a grid of pixels, and until something converts those pixels into characters, none of the string toolkit can touch it. Optical character recognition — OCR — is that conversion: software reads the letter shapes in an image and returns its best guess at the text they spell. It is what lets a program pull totals off scanned receipts or names off photographed forms instead of a person retyping them."],
  ["p","The engine in this chapter is Tesseract, a free and open source OCR program, driven from Python through the pytesseract package. What it reads well is narrower than the word recognition suggests. It is built for print: typewritten text in an ordinary font, dark on a light background, lines running level, one column at a time. Handwriting, stylized lettering, and photographs of whole scenes mostly defeat it — and defeat does not mean an error message. The engine returns a string either way; a bad image simply produces a confidently wrong one."],
  ["note","Tesseract is a desktop program, not Python code — pytesseract only relays images to an engine installed separately through the operating system. None of the engine calls in this chapter can run inside this app, so those blocks are shown without outputs and are not graded. The graded exercises below practice the step that always follows OCR — cleaning up the recognized text — which is plain built-in Python and runs here as usual."]
]},
{ t: "Installing the engine",
  body: [
  ["p","The install happens twice, in two different worlds. First the engine itself, installed the way your operating system installs any program — not with pip. On Windows, download the Tesseract installer from the project's page, run it, and afterwards add its install folder to the PATH environment variable (chapter 12 covered PATH) so the tesseract program can be found. On macOS and Linux, one terminal line does it:"],
  ["code","brew install tesseract          # macOS, via Homebrew\nsudo apt install tesseract-ocr  # Linux, Debian and Ubuntu"],
  ["p","Recognition is driven by per-language data files. English ships by default; every other language is a separate pack — a .traineddata file named by a three-letter ISO 639 code, fra for French, deu for German, jpn for Japanese. The Windows installer offers the packs as checkboxes during setup; elsewhere they install the same way the engine did:"],
  ["code","brew install tesseract-lang         # macOS, all packs\nsudo apt install tesseract-ocr-deu  # Linux, one pack"],
  ["p","Second, the Python side. The pytesseract package is the bridge between your script and the installed engine, and installing it also brings in Pillow, the image library from chapter 21 that opens the files you will feed it:"],
  ["code","pip install pytesseract"],
  ["p","The mistake to expect here is finishing that pip install and calling the job done. The import will work, and the first real recognition call will fail, because the bridge has no engine to talk to — pip installed the Python half, and the engine half only ever comes from the operating system installs above."]
]},
{ t: "Extracting text from an image",
  body: [
  ["p","With both halves installed, extraction is four lines:"],
  ["code","import pytesseract\nfrom PIL import Image\n\nimg = Image.open('scan.png')\ntext = pytesseract.image_to_string(img)"],
  ["p","Image.open() reads the file into an image object without caring what is pictured in it. image_to_string() is where recognition happens: pytesseract hands the image to the Tesseract engine and returns everything it recognized, as one plain string. No output is shown for this block — what comes back depends on the engine version and language data of the machine that runs it. What is certain is the shape of the result: a string, and an imperfect one."],
  ["p","Imperfect in predictable ways. Line breaks land where the printed lines broke, and a word split across lines by a hyphen stays split. Font and size vanish — a heading and a footnote arrive as equals. Spacing is approximate, and a page set in columns comes back with the columns interleaved. Individual characters swap for look-alikes: capital O for the digit zero, lowercase L for the digit one, and pairs like them. The number swaps are the ones that hurt, because a misread word looks misspelled while a misread number just looks like a number."],
  ["note","The mistake is trusting the result because it is finally a string — printing it, seeing mostly right text, and feeding it straight into the rest of the program. Treat every recognition result as a draft. The second half of this chapter is the checking and cleaning that turns a draft into data."]
]},
{ t: "Image quality and preprocessing",
  body: [
  ["p","Recognition quality is mostly decided before the engine runs. When you control how the image is made, control it: scan straight so the lines run level, keep dark text on a light background rather than the reverse, one column of text per image, an ordinary font. When the image arrives as it is, an image editor — or chapter 21's Pillow, in code — can still improve it: crop away everything that is not text, trim dark scanner borders, leave a small light margin around the text, raise the contrast until the letters stand off the background, and clear away stray specks."],
  ["p","Cropping is the step that pays off first. An engine given a whole photograph hunts for letter shapes everywhere and finds them in brickwork and wood grain; the same engine given a tight crop of the label does far better. Chapter 21's crop() takes the box as left, top, right, bottom:"],
  ["code","from PIL import Image\n\nimg = Image.open('parcel-photo.png')\nlabel = img.crop((410, 220, 980, 470))\nlabel.save('parcel-label.png')"],
  ["p","Specks matter more than they look like they should. A fleck of dust or a shadow at the page edge is not skipped: the engine reads it, and it comes out the other end as a stray mark or a line of one or two characters. Cleaning specks out of the image beforehand is best; failing that, they can be filtered out of the text afterwards, and the cleaning section below does exactly that."]
]},
{ t: "Other languages and searchable PDFs",
  body: [
  ["p","The engine assumes English unless told otherwise. Reading anything else takes two things: the language pack installed, and the lang keyword argument naming it. With the wrong language set there is, again, no error — the engine forces the shapes it sees into the alphabet it was told to expect, and a German page read as English comes back as junk that was never either language."],
  ["code","import pytesseract\nfrom PIL import Image\n\nimg = Image.open('menu.png')\ntext = pytesseract.image_to_string(img, lang='deu')\nboth = pytesseract.image_to_string(img, lang='deu+eng')"],
  ["p","The plus sign combines packs for pages that mix languages, and pytesseract.get_languages() returns the list of pack codes installed on the machine, so a script can check before it asks."],
  ["p","One step past plain strings: a common OCR job is turning a stack of scanned images into a PDF you can search, with the recognized text sitting invisibly behind each page image. The open source NAPS2 application does this, and chapter 19's subprocess module can drive it from a script — run this way, NAPS2 never opens a window. Its location differs per system; the path below is the Windows one, and macOS and Linux use their own (the NAPS2 documentation lists them):"],
  ["code","import subprocess\n\nnaps2 = ['C:/Program Files/NAPS2/NAPS2.Console.exe']\nsubprocess.run(naps2 + ['-i', 'page1.png;page2.png', '-o', 'scans.pdf',\n    '--ocrlang', 'eng', '-n', '0', '-f'])"],
  ["p","Reading the argument list: -i names the inputs, semicolon-separated, one page each; -o names the PDF to create; --ocrlang picks the recognition language by the same codes as above; -n 0 asks for zero flatbed scans, so no physical scanner needs to be attached; -f overwrites the output file if it already exists. The input syntax goes further than filenames: square brackets after a PDF name select pages with exactly the index and slice notation of chapter 6's lists — doc.pdf[0] is the first page, doc.pdf[0:2] the first two, doc.pdf[-1] the last."]
]},
{ t: "Reading what the engine hands back",
  body: [
  ["p","From here to the end of the chapter, everything runs — on built-in Python, in this app. The engine's output is a string, so the tools that fix it are ones you already own. The sample below is hardcoded: it is not a real engine transcript, it is a stand-in built to carry the kinds of noise the earlier sections promised — hyphen-split words, uneven spacing, a speck line, and look-alike characters in the one field that must be exact."],
  ["code","raw = 'Delivery con-\\nfirmed  for   order 2O2l\\n=\\nSigned by the recip-\\nient on arrival'\nprint(raw)"],
  ["code","Delivery con-\nfirmed  for   order 2O2l\n=\nSigned by the recip-\nient on arrival"],
  ["p","print() shows the shape — five lines, two of them ending in split words, one line of junk. It hides the rest. The gaps between words are hard to count by eye, and the order code is unreadable in the worst way: that 2O2l is capital O and lowercase L standing where zero and one should be, and nothing about the printed line says so. Ask for the raw value in the shell and the string stops hiding — every character is spelled out:"],
  ["code",">>> raw\n'Delivery con-\\nfirmed  for   order 2O2l\\n=\\nSigned by the recip-\\nient on arrival'\n>>> raw.split('\\n')\n['Delivery con-', 'firmed  for   order 2O2l', '=', 'Signed by the recip-', 'ient on arrival']"],
  ["p","Now the plan writes itself, in a workable order: rejoin the hyphen-split words while the hyphen-newline pairs still exist, drop the junk line, even out the spacing, and repair the order code last, on its own — because only there do you know which characters were meant to be digits."],
  ["note","The mistake is cleaning before looking. A replace chain written from an assumption about the noise runs without error and fixes nothing — the gaps you guessed were double spaces were single, the zero you guessed was misread was fine all along. Look at a real sample in the shell first. Every rule in the next section came from reading this one."]
]},
{ t: "Cleaning recognized text",
  body: [
  ["p","Step one, the hyphens. The marker for a split word is exact — a hyphen immediately followed by a newline — and chapter 8's replace() removes every occurrence in one call:"],
  ["code",">>> raw.replace('-\\n', '')\n'Delivery confirmed  for   order 2O2l\\n=\\nSigned by the recipient on arrival'"],
  ["p","Order matters here. Flatten the newlines to spaces first and the hyphen-newline pair no longer exists to be found — the words stay broken, now with a space wedged in:"],
  ["code",">>> raw.replace('\\n', ' ').replace('-\\n', '')\n'Delivery con- firmed  for   order 2O2l = Signed by the recip- ient on arrival'"],
  ["p","Step two, the junk line. Split into lines and keep the ones long enough to be real — a chapter 3 loop, a chapter 6 list, and a threshold:"],
  ["code","text = raw.replace('-\\n', '')\nkept = []\nfor line in text.split('\\n'):\n    if len(line) > 3:\n        kept.append(line)\nprint('\\n'.join(kept))"],
  ["code","Delivery confirmed  for   order 2O2l\nSigned by the recipient on arrival"],
  ["p","A threshold is a guess, and it cuts both ways — a real two-character line would be thrown out with the specks. When that risk is live, test what a line contains instead of how long it is. Chapter 9's re module asks whether any letter or digit is present:"],
  ["code",">>> import re\n>>> bool(re.search(r'[A-Za-z0-9]', '='))\nFalse\n>>> bool(re.search(r'[A-Za-z0-9]', 'ok'))\nTrue"],
  ["p","Step three, the spacing. The obvious fix undershoots: replacing two spaces with one only halves each run, so wide gaps survive the pass. The split-and-join idiom levels everything at once, because split() with no argument treats any run of whitespace as a single break:"],
  ["code",">>> 'confirmed  for   order'.replace('  ', ' ')\n'confirmed for  order'\n>>> ' '.join('confirmed  for   order'.split())\n'confirmed for order'"],
  ["p","Those three fixes are general — they apply to any recognized text, no matter what it says. Chained on the sample:"],
  ["code","raw = 'Delivery con-\\nfirmed  for   order 2O2l\\n=\\nSigned by the recip-\\nient on arrival'\ntext = raw.replace('-\\n', '')\ncleaned = []\nfor line in text.split('\\n'):\n    if len(line) > 3:\n        cleaned.append(' '.join(line.split()))\nprint('\\n'.join(cleaned))"],
  ["code","Delivery confirmed for order 2O2l\nSigned by the recipient on arrival"],
  ["p","The order code still reads 2O2l, and no general rule can fix it — nothing about a string says which characters were meant as digits. What fixes it is knowledge of the field: this code is always the last four characters of its line and always digits, so swapping O to zero and lowercase L to one is safe there and only there. Scope the replaces to the field with chapter 6's slicing:"],
  ["code","line = 'Delivery confirmed for order 2O2l'\ntail = line[-4:]\nprint(line[:-4] + tail.replace('O', '0').replace('l', '1'))"],
  ["code","Delivery confirmed for order 2021"],
  ["p","Run the same replaces on the whole line instead and real words pay for it — Delivery has a lowercase L of its own:"],
  ["code",">>> 'Delivery confirmed for order 2O2l'.replace('l', '1')\n'De1ivery confirmed for order 2O21'"],
  ["p","One class of mistake survives all of this: a word misread as a different, correctly spelled word. No replace rule catches it, and neither does a spellchecker, because nothing is misspelled. That layer is where large language models get used — send the raw text with a prompt asking for OCR corrections only. It works, with the same warning as the OCR itself: a model fixes, misses, and occasionally invents, all with equal confidence, so a person still reads the result. The deterministic rules above earn their place because they can be tested; use them for every fix they can express, and spend the judgment calls only where they cannot."]
]},
{ t: "Summary",
  body: [
  ["p","OCR converts an image of text into a string. The pieces are an engine — Tesseract, installed at the operating system level, with per-language data packs — and pytesseract as the Python bridge, with Pillow opening the files. What the engine reads well is narrow: level, typewritten, dark on light, one column, cropped to the text that matters, in the language its data expects. What it returns is always a draft: hyphenation kept, layout flattened, spacing approximate, look-alike characters swapped — with misread digits the hardest noise to spot. The repair kit is the string toolkit you already had: remove the hyphen-newline pairs first, filter junk lines by length or by content, level the spacing with split and join, and fix character confusions only inside fields whose format you know. For scanned stacks that should become searchable documents, the NAPS2 application builds PDFs with the recognized text embedded, driven from Python through subprocess."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises — each one is a cleanup pass on a noisy recognized string. The next chapter is Controlling the Keyboard and Mouse: Python moving the pointer, clicking, and typing on its own, which is how a program operates applications that never expected to be automated."]
]}
],
questions: [
{ q:"What does OCR do, and why does a program need it before any of the string toolkit applies?",
  a:"Optical character recognition turns an image of text — pixels — into a Python string. String methods, regular expressions, and every other text tool need a string to work on; until recognition runs, a scanned page is only a picture." },
{ q:"pip install pytesseract finished without trouble, but the first recognition call fails. What is missing?",
  a:"The engine. Tesseract is a separate desktop program installed through the operating system — an installer on Windows, brew or apt elsewhere — and pytesseract is only the bridge that hands images to it. pip installed the bridge, not the engine." },
{ q:"Which two calls take you from a filename to recognized text?",
  a:"Image.open() from Pillow reads the file into an image object, and pytesseract's image_to_string() sends that image to the engine and returns whatever it recognized as one plain string." },
{ q:"Name three kinds of noise to expect in recognized text even from a clean scan.",
  a:"Words split by end-of-line hyphens stay split; spacing and layout are approximate, with multi-column pages coming back interleaved; look-alike characters swap, like capital O for zero and lowercase L for one. The digit swaps are the worst of these, because a wrong word looks wrong while a wrong number just looks like a number." },
{ q:"What kind of image does the engine handle well, and what should you not expect it to read?",
  a:"Typewritten text in an ordinary font, dark on a light background, level lines, one column — ideally cropped to just the text. Handwriting, stylized fonts, and photographs of whole scenes mostly fail, and the failure is not an error but a confidently wrong string." },
{ q:"A German page came back as junk text. What went wrong, and what changes for a page that mixes German and English?",
  a:"The engine ran with its default English data, so it forced English letters onto German shapes. Pass lang='deu' — with the German pack installed — and for the mixed page combine codes with a plus sign: lang='deu+eng'." },
{ q:"The part after the label in 'ORDER-2O48' should be digits. What does 'ORDER-2O48'.replace('O', '0') evaluate to, and why is it the wrong fix?",
  a:"'0RDER-2048' — the replace also rewrites the label's own capital O. Scope the fix to the part known to be digits and reattach the label: 'ORDER-' + 'ORDER-2O48'[6:].replace('O', '0') gives 'ORDER-2048'." },
{ q:"Why does ' '.join(line.split()) even out uneven spacing when line.replace('  ', ' ') does not?",
  a:"replace only halves each run in a single pass — 'a    b'.replace('  ', ' ') still holds two spaces, giving 'a  b'. split() with no argument treats any whitespace run as one break and discards it, so joining the pieces with single spaces levels every gap at once: ' '.join('a    b'.split()) is 'a b'." },
{ q:"When reflowing hyphen-split words, why must replace('-\\n', '') run before replace('\\n', ' ')?",
  a:"The hyphen fix keys on the exact two-character pair, hyphen then newline. Flatten newlines to spaces first and the pair no longer exists: 'hy-\\nphen' becomes 'hy- phen' and the word stays broken. Run the hyphen replace first and it becomes 'hyphen'." },
{ q:"After splitting recognized text into lines, how do you drop the junk that page specks become, and what is the risk?",
  a:"Keep only lines that clear a length test — with len(line) > 3, 'Delivery note' survives while '=' and '.:' drop. The risk is that a threshold is a guess: a real two-character line like 'ok' fails the same test, so read a sample before picking the number, or test content instead with re.search(r'[A-Za-z0-9]', line)." }
],
exercises: [
{ c:"strings", t:"Reflow the courier note", book:"ch22",
  b:"OCR keeps the printed line breaks, and a word split by an end-of-line hyphen arrives broken. Given raw = 'The courier con-\\nfirmed the delivery\\nat the loading dock', remove every hyphen-newline pair to rejoin the split word, turn the remaining newline into a space, and print the single flowed line.",
  o:"The courier confirmed the delivery at the loading dock",
  h:["Two different newlines are in the string — one right after a hyphen inside a word, one between whole words. They need different treatment.",
     "replace() covers both cases: the exact pair '-\\n' should vanish entirely, and the plain '\\n' should become a space. Do them in that order, or the pair is destroyed before it is found.",
     "raw.replace('-\\n', '') rejoins the split word; chain one more replace to swap the leftover newline for a space, then print it."]},
{ c:"strings", t:"Repair the invoice code", book:"ch22",
  b:"A code was recognized as code = 'INVOICE-2O2l-O07'. The INVOICE- label is correct, but everything after it should be digits and dashes only — the engine misread some digits as capital O and lowercase L. Repair those misreads without touching the label, and print the fixed code.",
  o:"INVOICE-2021-007",
  h:["Run the replaces across the whole string and the label breaks too — INVOICE has a capital O of its own.",
     "Slicing protects the label: code[:8] is 'INVOICE-' and code[8:] is the part that should be digits. Run the replaces on the second piece only.",
     "fixed = code[8:].replace('O', '0').replace('l', '1') — print the label slice with fixed glued on behind it."]},
{ c:"strings", t:"Check the header line", book:"ch22",
  b:"A form header came back with uneven gaps. Given raw = 'PACKING      LIST      PAGE  1' and expected = 'PACKING LIST PAGE 1', collapse every run of spaces in raw to a single space, then print 'header ok' when the cleaned line equals expected and 'header wrong' when it does not.",
  o:"header ok",
  h:["replace('  ', ' ') only halves each run of spaces — after one pass, a wide gap is still a gap.",
     "split() with no argument breaks on any run of whitespace and throws it away; ' '.join(...) rebuilds the line with single spaces. The comparison after that is chapter 2 material.",
     "cleaned = ' '.join(raw.split()) — compare cleaned to expected with ==, and an if/else picks which verdict prints."]},
{ c:"loops", t:"Drop the speck lines", book:"ch22",
  b:"Specks at the page edge come out of OCR as tiny junk lines. Given raw = 'Delivery note\\n=\\nItems checked twice\\n.:\\nSigned on arrival', print only the real lines — the ones longer than three characters — each on its own line, in their original order.",
  o:"Delivery note\nItems checked twice\nSigned on arrival",
  h:["The junk lines are one or two characters; the real ones are much longer. Length is the whole test.",
     "raw.split('\\n') gives the list of lines; a for loop visits each one, and an if decides which lines reach print().",
     "for line in raw.split('\\n'): — the body is a single if comparing len(line) to 3 before printing."]}
]
};
