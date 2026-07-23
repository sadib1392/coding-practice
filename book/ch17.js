/* Practice Log book — Chapter 17: PDF and Word Documents.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from
   memory: stdlib blocks with python3, pypdf and python-docx blocks in a
   scratch venv, against small sample documents built by the same scripts.
   tests/ch17_verify.py rebuilds those documents and re-checks every claim. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch17 = {
n: 17,
title: "PDF and Word Documents",
src: "https://automatetheboringstuff.com/3e/chapter17.html",
blurb: "pypdf for reading, merging, and locking PDFs; python-docx for taking Word documents apart into paragraphs and runs, and writing new ones.",
sections: [
{ t: "Why PDFs fight you",
  body: [
  ["p","A PDF and a Word document both look like pages of text on screen, and neither is anything like a text file underneath. Open one with plain open() and read() and you get bytes that mean nothing. Both formats are containers, and each needs a library that speaks it: this chapter uses pypdf for PDFs and python-docx for Word's .docx files."],
  ["p","PDF deserves lowered expectations, stated honestly. The format exists to make a page look identical on every printer and every screen, so a PDF file is closer to a drawing program than to a document: place this glyph at these coordinates in this font, then the next one. Nothing requires the file to store words whole, in reading order, or with spaces between them — the spaces you see may just be gaps between positioned letters. Extracting text is therefore reconstruction, and it degrades with fancy layout. A scanned PDF is the extreme case: it holds a photograph of text, and there is nothing to extract without OCR."],
  ["note","pypdf and python-docx are third-party packages: on a desktop Python you install them with pip install pypdf python-docx, and neither can run inside this app. Read their code blocks as worked examples — every output shown was captured from a real desktop run against small sample documents built for this chapter. The graded exercises at the bottom use only built-in Python on the same document-processing ideas, so they run and grade here as usual."],
  ["p","Word's .docx sits at the other extreme. It is a zip archive of XML files — structure all the way down — so a library can read back exactly what the document contains and build new documents piece by piece. The PDF half of this chapter is about working within a hostile format; the Word half is about a format that mostly cooperates."]
]},
{ t: "Reading a PDF with pypdf",
  body: [
  ["p","The sample file for this half of the chapter is minutes.pdf, three pages of rowing club committee minutes. PdfReader opens it, and its pages attribute behaves like a list: len() counts the pages, indexing fetches one, and a for loop walks them in order. Each page's extract_text() returns the page's text as one string."],
  ["code",">>> from pypdf import PdfReader\n>>> reader = PdfReader('minutes.pdf')\n>>> len(reader.pages)\n3\n>>> reader.pages[0].extract_text()\n'Harbour Rowing Club\\nCommittee minutes, 12 March\\nPresent: five members'"],
  ["p","The shell echoes the string in repr form, newlines visible as \\n. print() turns them into real lines, and looping the whole file is two lines more:"],
  ["code","from pypdf import PdfReader\nreader = PdfReader('minutes.pdf')\nfor page in reader.pages:\n    print(page.extract_text())"],
  ["code","Harbour Rowing Club\nCommittee minutes, 12 March\nPresent: five members\nItem 1: boat shed roof\nQuotes to be gathered by April\nItem 2: regatta date\nAgreed for the last Saturday of June"],
  ["p","That extraction is clean because minutes.pdf is a deliberately simple file. Real-world PDFs give rougher results: spacing missing or doubled, two columns interleaved into nonsense, headers dropped into the middle of sentences, words broken at line-end hyphens. pypdf also exposes a page's embedded pictures through page.images, and for badly garbled text one modern cleanup is handing the extraction to an AI chatbot and asking for a faithful reflow — treat that result as a draft to check, never as the document."],
  ["note","The mistake is trusting extract_text() to return what the page shows you. It returns whatever the file's internal text plumbing yields — sometimes perfect, sometimes words squashed together, sometimes an empty string on a page you can plainly read. Test extraction on your real files before building anything on top of it."]
]},
{ t: "New PDFs from old pages",
  body: [
  ["p","pypdf does not edit files in place. There is no save() on a reader and no way to change minutes.pdf on disk. The model is read-modify-write-new: pull pages from existing files with PdfReader, feed them to a PdfWriter, and write the result as a new file. Merging, picking pages, splitting, and rotating are all that one workflow with different pages fed to the writer."],
  ["code","from pypdf import PdfReader, PdfWriter\nwriter = PdfWriter()\nwriter.append('january.pdf')\nwriter.append('february.pdf')\nwith open('winter.pdf', 'wb') as f:\n    writer.write(f)"],
  ["p","append() swallows a whole file at a time — here two monthly newsletters, two pages and one. The output file opens in 'wb' because a PDF is binary; text mode would mangle it. The page count of the result confirms the merge:"],
  ["code",">>> len(PdfReader('winter.pdf').pages)\n3"],
  ["p","append() also takes a pages argument for copying only some pages across. That covers a classic office chore — pull the cover page of every report into one summary file. pages=[0] takes just the first page of each:"],
  ["code","writer = PdfWriter()\nwriter.append('january.pdf', pages=[0])\nwriter.append('february.pdf', pages=[0])\nwith open('front_pages.pdf', 'wb') as f:\n    writer.write(f)"],
  ["code",">>> len(PdfReader('front_pages.pdf').pages)\n2"],
  ["p","Splitting inverts the loop: one writer per page instead of one writer for everything, with add_page() placing a single page at a time."],
  ["code","reader = PdfReader('winter.pdf')\nfor i, page in enumerate(reader.pages):\n    writer = PdfWriter()\n    writer.add_page(page)\n    with open(f'winter_page_{i + 1}.pdf', 'wb') as f:\n        writer.write(f)\n    print(f'wrote winter_page_{i + 1}.pdf')"],
  ["code","wrote winter_page_1.pdf\nwrote winter_page_2.pdf\nwrote winter_page_3.pdf"],
  ["p","Pages also carry a rotation, in clockwise degrees. rotate(90) adds a quarter-turn and returns the page itself, so the new state reads off in one chained line. Repeated calls accumulate — two more quarter-turns would leave rotation at 270 — and the value survives being written out and reopened."],
  ["code",">>> page = PdfReader('minutes.pdf').pages[0]\n>>> page.rotation\n0\n>>> page.rotate(90).rotation\n90"],
  ["note","None of this edits the original — minutes.pdf never changes, and expecting a word-processor-style save-in-place is the mistake. Write results to a new name and keep the source file until the new file is safely on disk. Overwriting the source with your output is how both get lost."]
]},
{ t: "Watermarks and passwords",
  body: [
  ["p","merge_page() stamps one page's content onto another: both end up drawn in the same page space, one layer over the other. That is how a draft stamp, a letterhead, or a watermark lands on every page of an existing file. Here draft_mark.pdf is a one-page file holding nothing but large DRAFT COPY text, stamped across each page of the minutes:"],
  ["code","from pypdf import PdfReader, PdfWriter\nmark = PdfReader('draft_mark.pdf').pages[0]\nwriter = PdfWriter()\nfor page in PdfReader('minutes.pdf').pages:\n    page.merge_page(mark)\n    writer.add_page(page)\nwith open('minutes_draft.pdf', 'wb') as f:\n    writer.write(f)"],
  ["p","Extraction proves the stamp landed — the first page of the result now carries both layers' text:"],
  ["code",">>> PdfReader('minutes_draft.pdf').pages[0].extract_text()\n'Harbour Rowing Club\\nCommittee minutes, 12 March\\nPresent: five members\\nDRAFT COPY'"],
  ["p","A PdfWriter can also encrypt what it writes. Call encrypt() with a password before the write, and the file demands that password in any viewer:"],
  ["code","writer = PdfWriter()\nwriter.append('minutes.pdf')\nwriter.encrypt('swordfish')\nwith open('minutes_locked.pdf', 'wb') as f:\n    writer.write(f)"],
  ["p","Reading an encrypted file back is a three-step dance. is_encrypted answers whether a password is needed; touching the pages before decrypting raises an error; decrypt() with the right password unlocks the reader for the rest of the session."],
  ["code",">>> reader = PdfReader('minutes_locked.pdf')\n>>> reader.is_encrypted\nTrue\n>>> reader.pages[0].extract_text()\nFileNotDecryptedError: File has not been decrypted\n>>> reader.decrypt('swordfish')\n<PasswordType.OWNER_PASSWORD: 2>\n>>> reader.pages[0].extract_text()\n'Harbour Rowing Club\\nCommittee minutes, 12 March\\nPresent: five members'"],
  ["p","decrypt() reports what the password matched. A PDF carries two passwords — a user password that unlocks reading and an owner password meant for changing permissions — and encrypt() with one argument uses the same string for both, which is why the report names the stronger match. A wrong password does not raise; it returns a falsy result, so an if can test the outcome directly:"],
  ["code",">>> PdfReader('minutes_locked.pdf').decrypt('guess')\n<PasswordType.NOT_DECRYPTED: 0>"],
  ["note","decrypt() unlocks the PdfReader object, and the mistake is expecting it to unlock the file: minutes_locked.pdf on disk stays encrypted. To produce an unlocked copy, feed the decrypted reader's pages to a PdfWriter and write a new file — the same read-modify-write-new model as everything else in pypdf."]
]},
{ t: "Word documents: Document, Paragraph, Run",
  body: [
  ["p","Word's .docx format is a zip archive of XML files, which is why reading one back is faithful in a way PDF extraction never is. The library is python-docx, and its two names disagree on purpose: pip install python-docx, but import docx."],
  ["p","python-docx models a document as three nested levels. A Document holds a list of Paragraph objects — every block of text, headings included, is a paragraph. A Paragraph holds Run objects: stretches of text that share one set of formatting. The moment anything changes mid-paragraph — bold switches on, italics switch off — one run ends and the next begins."],
  ["p","The sample file here is newsletter.docx, a small garden society newsletter. The code that builds it appears two sections from now; every value below comes from reopening the saved file."],
  ["code",">>> import docx\n>>> doc = docx.Document('newsletter.docx')\n>>> len(doc.paragraphs)\n6\n>>> doc.paragraphs[0].text\n'The Plot Holder'\n>>> doc.paragraphs[3].text\n'Deliveries arrive Thursday at the north gate.'"],
  ["p","Paragraph number 3 was written with the word Thursday in bold, and its run structure shows the seam: three runs, the formatting change fencing the bold word off from its plain neighbours."],
  ["code",">>> para = doc.paragraphs[3]\n>>> len(para.runs)\n3\n>>> para.runs[1].text\n'Thursday'\n>>> para.runs[1].bold\nTrue\n>>> print(para.runs[0].bold)\nNone"],
  ["p","The plain run's bold is None, not False, and the three states genuinely differ: True forces bold on, False forces it off, None states no opinion and inherits whatever the paragraph's style says. italic and underline work the same tri-state way."],
  ["p","Nothing obliges a run boundary to land on a word edge. In this paragraph the italics were switched on from the middle of the first word, and the runs cut straight through it:"],
  ["code",">>> para = docx.Document('runs_demo.docx').paragraphs[0]\n>>> para.text\n'Water butts refill on Fridays.'\n>>> [r.text for r in para.runs]\n['Wat', 'er butts', ' refill on Fridays.']"],
  ["note","The mistake is treating runs as words or sentences. Files saved by Word itself splinter runs for invisible reasons — spellcheck bookkeeping, revision history — so run boundaries carry no meaning. Use para.text whenever you want the words; touch runs only when formatting is the point."]
]},
{ t: "The full text, and what styles say",
  body: [
  ["p","Getting a document's whole text is a loop over paragraphs, collecting each para.text and joining the pieces with newlines. As a reusable function:"],
  ["code","import docx\n\ndef full_text(path):\n    doc = docx.Document(path)\n    text = []\n    for para in doc.paragraphs:\n        text.append(para.text)\n    return '\\n'.join(text)\n\nprint(full_text('newsletter.docx'))"],
  ["code","The Plot Holder\nCompost rota\nTurning duty passes to bed seven this month.\nDeliveries arrive Thursday at the north gate.\nSeed swap\nBring labelled envelopes to the shed."],
  ["p","One paragraph per line — and the headings land as plain lines, indistinguishable from body text. What marks them as headings is the style, and every paragraph carries one:"],
  ["code",">>> doc = docx.Document('newsletter.docx')\n>>> doc.paragraphs[0].style.name\n'Title'\n>>> doc.paragraphs[1].style.name\n'Heading 1'\n>>> doc.paragraphs[2].style.name\n'Normal'"],
  ["p","Styles make structural filtering possible: keep only the paragraphs whose style says heading, and a document outlines itself. The last graded exercise below turns the same idea into an indented table of contents."],
  ["code","for para in doc.paragraphs:\n    if para.style.name == 'Heading 1':\n        print(para.text)"],
  ["code","Compost rota\nSeed swap"]
]},
{ t: "Writing Word documents",
  body: [
  ["p","docx.Document() with no argument starts a new, empty document — len(doc.paragraphs) on a fresh one is 0. Content is appended in order. add_heading(text, level) adds a heading paragraph, where level 0 means the Title style and 1, 2, 3 mean Heading 1 and down. add_paragraph(text) adds body text and returns the Paragraph; the paragraph's own add_run(text) appends a further stretch and returns the Run, so formatting can be set on exactly that stretch. Nothing touches the disk until save()."],
  ["code","import docx\ndoc = docx.Document()\ndoc.add_heading('The Plot Holder', 0)\ndoc.add_heading('Compost rota', 1)\ndoc.add_paragraph('Turning duty passes to bed seven this month.')\np = doc.add_paragraph('Deliveries arrive ')\np.add_run('Thursday').bold = True\np.add_run(' at the north gate.')\ndoc.add_heading('Seed swap', 1)\ndoc.add_paragraph('Bring labelled envelopes to the shed.')\ndoc.save('newsletter.docx')"],
  ["p","That is the file the reading sections pulled apart: six paragraphs, a Title, two Heading 1s, and the three-run bold sentence all came from these ten lines. p.add_run('Thursday').bold = True is the attribute pattern — add_run hands back the Run, and assigning to its bold styles just that word."],
  ["p","Line and page breaks live inside runs, added with add_break(). A page break pushes what follows onto a new page without starting a new paragraph, so the paragraph count here stays at two:"],
  ["code","import docx\nfrom docx.enum.text import WD_BREAK\ndoc = docx.Document()\ndoc.add_paragraph('End of part one.')\ndoc.paragraphs[0].runs[0].add_break(WD_BREAK.PAGE)\ndoc.add_paragraph('Part two begins.')\ndoc.save('two_parts.docx')"],
  ["code",">>> len(docx.Document('two_parts.docx').paragraphs)\n2"],
  ["p","add_picture(path) drops an image file into the document at its natural size; give a width or height from docx.shared and the other dimension follows the image's proportions. The units are EMUs — Inches(1) is 914400 of them — which is why a shape's width reads back as a large integer:"],
  ["code","import docx\ndoc = docx.Document()\ndoc.add_paragraph('The first seedling of spring:')\ndoc.add_picture('sprout.png', width=docx.shared.Inches(1))\ndoc.save('picture_demo.docx')"],
  ["code",">>> doc = docx.Document('picture_demo.docx')\n>>> len(doc.inline_shapes)\n1\n>>> doc.inline_shapes[0].width\n914400\n>>> docx.shared.Inches(1)\n914400"],
  ["note","save() is the write. python-docx edits an object in memory, and until doc.save(path) runs, the file on disk is unchanged — forgetting the save and re-opening an unchanged document is the classic first bug. The second: saving over a document Word currently has open, then wondering which version is real. Close it there first, or save under a new name."]
]},
{ t: "From Word to PDF",
  body: [
  ["p","The obvious wish — build a .docx with python-docx, ship it as a PDF — has no pure-Python answer worth trusting. Turning paragraphs into printed pages means choosing fonts, wrapping lines, and deciding where each page ends: rendering work, owned by programs that render. python-docx builds structure; it does not lay out pages."],
  ["p","The realistic routes go through a program that already renders documents. Anywhere LibreOffice is installed, its command line converts without opening a window:"],
  ["code","soffice --headless --convert-to pdf newsletter.docx"],
  ["p","On Windows with Word installed, Word itself can be scripted to open a document and save it as PDF. Either way, the conversion is a rendering step performed by another program — check the output with your own eyes, and expect fonts and spacing to shift if the converting program changes. Going the opposite direction, PDF to Word, is reconstruction of the kind this chapter opened with: possible, and always approximate."]
]},
{ t: "Summary",
  body: [
  ["p","PDFs and Word documents are where automation meets real paperwork, and the two deserve opposite expectations. A PDF is a page-description container: pypdf opens it with PdfReader, counts and indexes through reader.pages, and extracts text that ranges from perfect to garbled — while PdfWriter builds new files out of existing pages, which covers merging with append(), splitting with add_page(), rotating, watermarking with merge_page(), and encrypting, always by writing a new file, never by editing in place. A .docx is structure: python-docx hands you Document, Paragraph, and Run, para.text joins a paragraph's runs back into its words, styles name what each paragraph is, and add_heading, add_paragraph, add_run, and save build documents from nothing."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises — plain-Python drills on the same joining, filtering, counting, and outlining this chapter performed on documents, so they run and grade here. The next chapter is CSV, JSON, and XML files: the plain-text data formats where, for once, what the file holds is exactly what you get."]
]}
],
questions: [
{ q:"Why does text extracted from a PDF often come back with wrong spacing, scrambled order, or nothing at all?",
  a:"A PDF stores drawing instructions — glyphs pinned to page coordinates — not text in reading order. extract_text() has to reconstruct words and lines from positions, which is guesswork on complex layouts. A scanned PDF holds only a photograph of text, so without OCR there is nothing to extract." },
{ q:"You have minutes.pdf on disk. Which two lines of pypdf give you its page count?",
  a:"reader = PdfReader('minutes.pdf'), then len(reader.pages). The pages attribute behaves like a list — len(), indexing like reader.pages[0], and for loops all work on it. For the sample file the count is 3." },
{ q:"What does page.extract_text() return, and how do you get from there to readable lines on screen?",
  a:"One string holding the whole page's text, newlines included — the shell echoes it in repr form with the newlines visible as \\n. print() the string to see the lines." },
{ q:"pypdf cannot save changes into an existing file. What is the workflow instead — say, for rotating every page of a file?",
  a:"Read-modify-write-new: open the source with PdfReader, call rotate(90) on each page, add each page to a PdfWriter, and write the writer to a new file opened in 'wb'. The original file never changes." },
{ q:"A page's rotation reads 0. What does it read after page.rotate(90), and after two further rotate(90) calls?",
  a:"90 after the first call, 270 after all three — each call adds a clockwise quarter-turn and the total accumulates. The value also survives writing the page out and reopening the file." },
{ q:"reader.is_encrypted is True. What happens if you touch a page right away, and what unlocks the reader?",
  a:"Extracting from a page raises FileNotDecryptedError: File has not been decrypted. Calling reader.decrypt() with the correct password returns a truthy PasswordType and unlocks page access for that reader; a wrong password returns a falsy result instead of raising. The file on disk stays encrypted either way." },
{ q:"Name the three levels python-docx splits a document into, and what each holds.",
  a:"Document holds the list of paragraphs (doc.paragraphs — headings included, every block of text is a paragraph). Paragraph holds its text, its style, and a list of runs. Run holds one stretch of text sharing one formatting, with attributes like bold, italic, and underline." },
{ q:"In one file from this chapter, para.text gives 'Water butts refill on Fridays.' but para.runs[0].text gives just 'Wat'. Explain both values.",
  a:"The italics in that paragraph switch on mid-word, so the first run ends inside the word Water — runs[0].text is only that first piece. para.text joins every run's text back together, exactly like ''.join of the pieces, which is why it reads as the full sentence." },
{ q:"A run's bold can be True, False, or None. What does each mean, and why does the plain run beside the bold Thursday read None?",
  a:"True forces bold on, False forces it off, and None sets nothing — the run inherits whatever its style says. The plain runs were written with no formatting applied, so they carry no opinion at all, which is None rather than an explicit False." },
{ q:"What does doc.add_heading('Compost rota', 1) add, and what changes when the level argument is 0 or 2?",
  a:"A new paragraph styled 'Heading 1'. Level 0 applies the 'Title' style instead, and level 2 applies 'Heading 2' — the level picks the style, and reading the file back shows the name in para.style.name." }
],
exercises: [
{ c:"strings", t:"Reassemble the runs", book:"ch17",
  b:"A paragraph came out of a .docx in three runs: runs = ['Rot', 'a posted', ' on the shed door.']. Print the paragraph's full text on one line, then the number of runs on the next.",
  o:"Rota posted on the shed door.\n3",
  h:["Runs are pieces of one string, in order. Python glues a list of strings into one with a string method.",
     "''.join(runs) concatenates the pieces with nothing between them — the run boundaries vanish, including the one inside a word.",
     "The first line prints ''.join(runs); the second line needs the function that counts a list's items."]},
{ c:"strings", t:"Full text, minus the blanks", book:"ch17",
  b:"Paragraph texts from a short document, blanks included: paras = ['Minutes', '', 'All present.', '', 'Meeting closed.']. Word files are full of empty paragraphs. Print only the non-empty ones, one per line, keeping their order.",
  o:"Minutes\nAll present.\nMeeting closed.",
  h:["Loop over the list; print some paragraphs and skip others.",
     "An empty paragraph is the empty string. p != '' is True exactly for the ones worth printing.",
     "for p in paras: with an if p != '': guarding the print call."]},
{ c:"lists", t:"Word counts by page", book:"ch17",
  b:"Extracted page texts from a three-page PDF: pages = ['Harbour Rowing Club minutes', 'Item one covers the boat shed roof', 'The regatta lands in late June']. Print each page's word count on its own line, then the total for the whole document.",
  o:"4\n7\n6\n17",
  h:["split() with no argument breaks a string on whitespace — the pieces are its words.",
     "len(page.split()) is one page's count. Keep a running total going alongside the loop.",
     "Start total at 0; inside the loop print len(page.split()) and add it to total; print total after the loop ends."]},
{ c:"lists", t:"Build the table of contents", book:"ch17",
  b:"Headings pulled from a document as (level, title) pairs: toc = [(1, 'Getting the plot'), (2, 'Tools'), (2, 'Watering'), (1, 'First harvest')]. Print one line per heading: two spaces of indent for each level past 1, then the title.",
  o:"Getting the plot\n  Tools\n  Watering\nFirst harvest",
  h:["Each pair unpacks into two names right in the for statement: for level, title in toc:",
     "Multiplying a string repeats it: '  ' * 2 is four spaces, and '  ' * 0 is the empty string — so level 1 gets no indent.",
     "The indent is '  ' * (level - 1); print the indent glued to the title with +."]}
]
};
