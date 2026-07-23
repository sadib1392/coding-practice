/* Practice Log book — Chapter 11: Organizing Files.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from
   memory — except the send2trash block, which is desktop-only and is shown
   with no output claimed (disclosed in its section). */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch11 = {
n: 11,
title: "Organizing Files",
src: "https://automatetheboringstuff.com/3e/chapter11.html",
blurb: "shutil, os.walk, and zipfile: copying, moving, deleting, and archiving files in bulk without destroying the wrong thing.",
sections: [
{ t: "Copying files and folders",
  body: [
  ["p","Chapter 10 opened files one at a time — read one, write one, close it. Organizing a real folder is a different job: dozens of files to copy, file away, rename, delete, or bundle up, and doing that by hand is exactly the boring work a program should absorb. The tool is the shutil module — shell utilities — working alongside os and pathlib from the last chapter."],
  ["p","One convention before the first call. File operations are real: a careless delete practised on your own documents costs you your documents. So every example in this chapter builds its own small scratch layout first, using relative paths, and then operates only on that. Any block can run in an empty practice folder, top to bottom, and will print the same thing every time."],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> os.makedirs('field_notes')\n>>> Path('field_notes/day1.txt').write_text('saw two herons')\n14\n>>> shutil.copy('field_notes/day1.txt', 'field_notes/day1_spare.txt')\n'field_notes/day1_spare.txt'\n>>> shutil.copy('field_notes/day1.txt', '.')\n'./day1.txt'\n>>> sorted(os.listdir('field_notes'))\n['day1.txt', 'day1_spare.txt']\n>>> shutil.copy('field_notes/day9.txt', 'spare.txt')\nFileNotFoundError: [Errno 2] No such file or directory: 'field_notes/day9.txt'"],
  ["p","shutil.copy(source, destination) copies one file and returns the path of the new copy. The destination decides the copy's name: an existing folder means the copy keeps its own name and lands inside — '.' is the current folder — while any other destination is used as the new filename. Copying a file that does not exist raises the FileNotFoundError shown, and nothing is created."],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> os.makedirs('recipes/breads')\n>>> Path('recipes/soup.txt').write_text('leek and potato')\n15\n>>> Path('recipes/breads/rye.txt').write_text('needs a starter')\n15\n>>> shutil.copytree('recipes', 'recipes_backup')\n'recipes_backup'\n>>> sorted(os.listdir('recipes_backup'))\n['breads', 'soup.txt']\n>>> Path('recipes_backup/breads/rye.txt').read_text()\n'needs a starter'\n>>> shutil.copytree('recipes', 'recipes_backup')\nFileExistsError: [Errno 17] File exists: 'recipes_backup'"],
  ["p","shutil.copytree(source, destination) copies a whole folder: the folder itself, every file in it, every subfolder, all the way down. The destination is the new top folder's name, and it must not exist yet."],
  ["note","The second copytree call is the mistake to remember: run a backup twice and the destination from the first run is already there, so the call fails with FileExistsError instead of quietly refreshing anything. Delete the old copy first, pick a new name — or pass dirs_exist_ok=True once merging into an existing copy is genuinely what you mean."]
]},
{ t: "Moving and renaming",
  body: [
  ["p","shutil.move(source, destination) is filing and renaming in one function. Given an existing folder as the destination, it files: the file moves inside and keeps its name. The return value tells you where it ended up, and the original path is gone."],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> os.makedirs('sorted_mail')\n>>> Path('invoice.txt').write_text('amount due: 40')\n14\n>>> shutil.move('invoice.txt', 'sorted_mail')\n'sorted_mail/invoice.txt'\n>>> os.path.exists('invoice.txt')\nFalse"],
  ["p","Given anything else, it renames: the destination is the file's new name. The new name can sit inside another folder — but that folder has to exist already, or the move fails."],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> Path('draft.txt').write_text('nearly finished')\n15\n>>> shutil.move('draft.txt', 'final.txt')\n'final.txt'\n>>> shutil.move('final.txt', 'archive/final.txt')\nFileNotFoundError: [Errno 2] No such file or directory: 'archive/final.txt'"],
  ["p","Those two meanings — folder means file it, anything else means rename it — set up this chapter's sharpest trap. You meant to file notes.txt into an archive folder, but no such folder exists:"],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> Path('notes.txt').write_text('call the vet')\n12\n>>> shutil.move('notes.txt', 'archive')\n'archive'\n>>> os.path.isdir('archive')\nFalse"],
  ["note","No error, no warning: because archive did not exist as a folder, the move was a rename, and notes.txt is now a file called archive with no extension. When a move is meant as filing, make the folder first — os.makedirs before, or an os.path.isdir check — because Python will not guess that you meant a folder that is not there."],
  ["p","The other trap is the overwrite. Move a file to an explicit destination path that already exists and the old file is replaced — silently, permanently, with no trash to fish it out of:"],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> Path('old_report.txt').write_text('first version')\n13\n>>> Path('report.txt').write_text('second version')\n14\n>>> shutil.move('old_report.txt', 'report.txt')\n'report.txt'\n>>> Path('report.txt').read_text()\n'first version'\n>>> os.path.exists('old_report.txt')\nFalse"],
  ["p","Moving into a folder is stricter. If the folder already holds a file by that name, the move refuses with an error instead of replacing — so the same name collision either destroys a file or raises, depending on how you spelled the destination:"],
  ["code",">>> import shutil, os\n>>> from pathlib import Path\n>>> os.makedirs('outbox')\n>>> Path('outbox/memo.txt').write_text('old copy')\n8\n>>> Path('memo.txt').write_text('new copy')\n8\n>>> shutil.move('memo.txt', 'outbox')\nshutil.Error: Destination path 'outbox/memo.txt' already exists\n>>> shutil.move('memo.txt', 'outbox/memo.txt')\n'outbox/memo.txt'\n>>> Path('outbox/memo.txt').read_text()\n'new copy'"],
  ["note","Before any move into a crowded folder, decide which behavior you are getting: a full destination path replaces without asking, a folder destination raises shutil.Error on a clash. The dangerous one is the quiet one — the second version of report.txt above is simply gone."]
]},
{ t: "Deleting for good",
  body: [
  ["p","Two small deleting tools live in the os module. os.remove(path) deletes one file — os.unlink is the same operation under an older name, so treat them as one function with two spellings. os.rmdir(path) removes one folder, and only an empty one; a folder with anything still inside is refused."],
  ["code",">>> import os\n>>> from pathlib import Path\n>>> Path('scratch.txt').write_text('temporary')\n9\n>>> os.remove('scratch.txt')\n>>> os.path.exists('scratch.txt')\nFalse\n>>> os.makedirs('empty_box')\n>>> os.rmdir('empty_box')\n>>> os.remove('scratch.txt')\nFileNotFoundError: [Errno 2] No such file or directory: 'scratch.txt'"],
  ["p","Note the last line: deleting something that is already gone is itself an error. A delete is not make-sure-this-is-absent — it is this-exists-destroy-it, and Python holds you to the first half."],
  ["p","The third tool is the one to respect. shutil.rmtree(path) deletes a folder and everything below it — every file, every subfolder, in one call:"],
  ["code","import shutil, os\nfrom pathlib import Path\nos.makedirs('old_project/data')\nPath('old_project/readme.txt').write_text('v1')\nPath('old_project/data/results.csv').write_text('1,2,3')\nshutil.rmtree('old_project')\nprint(os.path.exists('old_project'))"],
  ["code","False"],
  ["note","rmtree is the call that turns a typo into a disaster: point it at the wrong variable, or at 'old_projects' when you meant 'old_project', and an entire tree is gone the moment the line runs. Nothing goes to the trash. Nothing asks whether you are sure. There is no undo."],
  ["p","The habit that makes deleting code safe to write: run the loop once with print standing in for the delete call, and read the list it produces."],
  ["code","import os\nfrom pathlib import Path\nos.makedirs('downloads', exist_ok=True)\nfor name in ['cat.png', 'notes.txt', 'old.tmp', 'draft.tmp']:\n    Path('downloads/' + name).write_text('x')\nfor name in sorted(os.listdir('downloads')):\n    if name.endswith('.tmp'):\n        print('would delete', 'downloads/' + name)"],
  ["code","would delete downloads/draft.tmp\nwould delete downloads/old.tmp"],
  ["p","Only after the printed list matches your intent exactly — nothing extra, nothing missing — swap print out for os.remove and run it again. The dry run costs seconds; the mistake it catches is permanent."]
]},
{ t: "The safer delete: send2trash",
  body: [
  ["p","On your own computer there is a middle path between keeping a file and destroying it: the operating system's trash. The third-party send2trash package sends files there instead of erasing them — installed once with python -m pip install send2trash, used with one function:"],
  ["code","import send2trash\nsend2trash.send2trash('old_notes.txt')"],
  ["p","The file disappears from its folder but sits in the trash until you empty it, so a wrong path costs a trip to the recycle bin instead of the file. That makes send2trash the right default for deletes in real scripts on a desktop; keep os.remove and shutil.rmtree for scratch layouts a script builds itself and can rebuild."],
  ["note","send2trash is desktop-only, which is why this is the one block in the chapter shown without its output: this app's Python runs in your browser on a private in-memory filesystem with no trash can and no pip, so there is nowhere to send anything and no way to install the package. On a real computer the two lines work as shown. The dry-run habit from the previous section still applies — trash you have to dig through is better than deletion, but a correct list beats both."]
]},
{ t: "Walking a directory tree",
  body: [
  ["p","Filing one file is a line; filing a whole tree needs a loop that visits every folder, however deep. That loop is os.walk. Give it a top folder and it yields one pass per folder anywhere below: each pass hands over three things — the folder's path, a list of its subfolder names, and a list of its filenames."],
  ["code","import os\nfrom pathlib import Path\nos.makedirs('expedition/photos', exist_ok=True)\nos.makedirs('expedition/notes', exist_ok=True)\nPath('expedition/packing.txt').write_text('rope, tent')\nPath('expedition/photos/ridge.png').write_text('not a real png')\nPath('expedition/photos/river.png').write_text('also fake')\nPath('expedition/notes/day1.txt').write_text('set off late')\nfor folder, subfolders, files in os.walk('expedition'):\n    subfolders.sort()\n    print('folder:', folder)\n    for name in sorted(files):\n        print('  file:', name)"],
  ["code","folder: expedition\n  file: packing.txt\nfolder: expedition/notes\n  file: day1.txt\nfolder: expedition/photos\n  file: ridge.png\n  file: river.png"],
  ["p","Read the output against the code: three folders, three passes. The loop variable folder carries the joined path — 'expedition/notes', not just 'notes' — so folder + '/' + name is a usable path for any file the pass hands you. That is the pattern every bulk operation builds on: walk, and inside the walk, act on each file."],
  ["p","The two sort calls are not decoration. The filesystem hands os.walk its lists in whatever order it likes, so an unsorted walk prints in a different order on a different machine. Sorting the filenames fixes your output; sorting the subfolder list does more — that list is os.walk's own route plan, and because the walk descends top-down into exactly those names, sorting it in place fixes the order folders are visited in."],
  ["note","The walking mistake: renaming or deleting inside the tree while os.walk is still iterating over it. The lists you were handed describe a tree that no longer matches the disk — files you moved are still listed under their old names, folders you removed are still on the route. Collect the paths you mean to change into a list during the walk, and do the changing after the loop ends."]
]},
{ t: "Compressing with the zipfile module",
  body: [
  ["p","A zip file packs a whole layout — folders, files, and their contents — into one compressed file: the natural final form for a backup, and the natural travel form for anything sent elsewhere. Python reads and writes them with the zipfile module. ZipFile takes a mode the way open() does: 'r' reads an existing archive, 'w' writes a new one, 'a' adds to one that exists."],
  ["code","import os, zipfile\nfrom pathlib import Path\nos.makedirs('reports', exist_ok=True)\nPath('reports/january.txt').write_text('rain every day ' * 20)\nPath('reports/february.txt').write_text('two dry weeks')\nwith zipfile.ZipFile('reports.zip', 'w') as backup:\n    for name in sorted(os.listdir('reports')):\n        backup.write('reports/' + name, compress_type=zipfile.ZIP_DEFLATED)\nwith zipfile.ZipFile('reports.zip') as backup:\n    print(backup.namelist())\n    info = backup.getinfo('reports/january.txt')\n    print(info.file_size)\n    print(info.compress_size < info.file_size)"],
  ["code","['reports/february.txt', 'reports/january.txt']\n300\nTrue"],
  ["p","Each path passed to write() becomes the stored name inside the archive, folder part and all — namelist() shows both members under reports/, in the order they were added. getinfo() looks one member up and reports two sizes: file_size is the original, compress_size is the space it occupies in the archive. The compress_type=zipfile.ZIP_DEFLATED argument is what turns compression on; january's three hundred characters of repeated weather store in fewer bytes than they started with, which is what the final True asserts."],
  ["code","import zipfile\nfrom pathlib import Path\nPath('a.txt').write_text('first')\nPath('b.txt').write_text('second')\nwith zipfile.ZipFile('box.zip', 'w') as z:\n    z.write('a.txt')\nwith zipfile.ZipFile('box.zip', 'w') as z:\n    z.write('b.txt')\nwith zipfile.ZipFile('box.zip') as z:\n    print(z.namelist())"],
  ["code","['b.txt']"],
  ["note","Mode 'w' does not mean write-into — it means start-this-archive-over. Opening the zip with 'w' once per file, as this loop-shaped mistake does, throws away the archive so far each time, and the finished zip holds only the last file written. Open once and write many inside one with block, or open with 'a' to add to an archive that already exists."],
  ["code","import os, zipfile\nfrom pathlib import Path\nPath('shopping.txt').write_text('eggs and flour')\nwith zipfile.ZipFile('pantry.zip', 'w') as z:\n    z.write('shopping.txt', compress_type=zipfile.ZIP_DEFLATED)\nos.remove('shopping.txt')\nwith zipfile.ZipFile('pantry.zip') as z:\n    z.extractall('restored')\nprint(sorted(os.listdir('restored')))\nprint(Path('restored/shopping.txt').read_text())"],
  ["code","['shopping.txt']\neggs and flour"],
  ["p","Everything comes back out with extractall(folder), which unpacks every member into the folder you name, creating it if needed — or extractall() with no argument, which unpacks into the current folder under the stored paths. A single member comes out with extract(name, folder). The round trip above is the whole backup story: zip it, lose the original, restore it intact."]
]},
{ t: "A short program: the numbered backup",
  body: [
  ["p","This program is the chapter assembled. It keeps zip snapshots of a folder, numbering each one, the way you might snapshot a project before changing it. Three steps: find a zip name not yet used, create the archive, walk the tree and write every file into it."],
  ["code","import os, zipfile\nfrom pathlib import Path\n\nos.makedirs('herbarium/scans', exist_ok=True)\nPath('herbarium/index.txt').write_text('3 specimens')\nPath('herbarium/scans/fern.txt').write_text('frond, pressed')\nPath('herbarium/scans/moss.txt').write_text('cushion, dried')\n\ndef backup_to_zip(folder):\n    number = 1\n    while os.path.exists(folder + '_' + str(number) + '.zip'):\n        number = number + 1\n    zip_name = folder + '_' + str(number) + '.zip'\n    with zipfile.ZipFile(zip_name, 'w') as backup:\n        for current, subfolders, files in os.walk(folder):\n            subfolders.sort()\n            for name in sorted(files):\n                backup.write(current + '/' + name, compress_type=zipfile.ZIP_DEFLATED)\n    print('created', zip_name)\n\nbackup_to_zip('herbarium')\nbackup_to_zip('herbarium')\nwith zipfile.ZipFile('herbarium_2.zip') as z:\n    print(z.namelist())"],
  ["code","created herbarium_1.zip\ncreated herbarium_2.zip\n['herbarium/index.txt', 'herbarium/scans/fern.txt', 'herbarium/scans/moss.txt']"],
  ["p","Step one is the while loop: herbarium_1.zip exists after the first call, so the second call counts up and lands on herbarium_2.zip — run it again tomorrow and you get herbarium_3.zip without overwriting a thing. Step two opens the archive with 'w', once, outside the walking loop. Step three is the sorted walk from two sections ago, writing each file under its full path — which is why namelist() shows the tree's shape."],
  ["note","The zips land next to herbarium, not inside it, and that placement is load-bearing: archive into the folder you are walking and every snapshot swallows the ones before it, growing until you notice. When the destination has to sit inside the source, the fix is to skip it during the walk — keeping it outside is simpler."]
]},
{ t: "Summary",
  body: [
  ["p","shutil.copy and shutil.copytree duplicate a file and a tree; shutil.move files into an existing folder or renames to any other destination — with a rename where you expected filing when the folder is missing, and a silent replace when an explicit destination already exists. os.remove deletes a file, os.rmdir an empty folder, shutil.rmtree a whole tree with no undo; on a desktop, send2trash is the recoverable alternative, and everywhere, the dry run — print first, delete second — is what keeps bulk deletes honest. os.walk visits every folder under a top one, handing each pass a path and two lists you sort yourself, and zipfile bundles what you organized: 'w' to start an archive, 'a' to add, extractall to bring everything back."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises — each one builds its own scratch layout the way the examples do. The next chapter changes altitude: designing and deploying command line programs, where scripts like this chapter's backup tool grow an interface other people can run."]
]}
],
questions: [
{ q:"What is the difference between shutil.copy and shutil.copytree?",
  a:"copy duplicates one file; copytree duplicates a whole folder — the folder, its files, its subfolders, all the way down. copytree's destination must not already exist: running the same backup twice raises FileExistsError on the second run." },
{ q:"A zip member reports file_size 300 and a much smaller compress_size. What are the two numbers, and what did ZIP_DEFLATED have to do with the difference?",
  a:"file_size is the member's original size; compress_size is the space it occupies inside the archive. Passing compress_type=zipfile.ZIP_DEFLATED to write() is what enables compression — repetitive content stores far smaller, and extracting restores the original bytes in full." },
{ q:"You run shutil.move('notes.txt', 'archive') expecting to file the note away, but there is no archive folder. What happened to your file?",
  a:"It was renamed. Because archive does not exist as a folder, the destination is treated as a new name, so notes.txt is now a file called archive with no extension — and no error was raised. Make the folder first when a move is meant as filing." },
{ q:"When does shutil.move replace an existing file silently, and when does it refuse with an error?",
  a:"Given an explicit destination path that already exists, it replaces the file silently and permanently. Given a folder whose contents already include that filename, it raises shutil.Error instead. The spelling of the destination decides which collision behavior you get." },
{ q:"Which call deletes a single file, which deletes an empty folder, and which deletes a folder with everything in it?",
  a:"os.remove deletes one file (os.unlink is the same operation under an older name), os.rmdir deletes one empty folder, and shutil.rmtree deletes a folder and its entire contents. rmtree is the one to treat with respect: one wrong path erases a whole tree, permanently." },
{ q:"What does a dry run of a deleting loop look like, and what has to be true before you convert it into the real thing?",
  a:"The same loop with print standing in for os.remove, printing each path it would delete. Only when the printed list matches your intent exactly — nothing extra, nothing missing — do you swap print back out for the delete call." },
{ q:"Why prefer send2trash over os.remove in a real desktop script, and why can it not run in this app?",
  a:"send2trash moves files to the operating system's trash, so a wrong path is recoverable; os.remove destroys immediately. It is a third-party package that needs a desktop trash can — this app's Python runs in the browser on an in-memory filesystem with neither the package nor a trash to send anything to." },
{ q:"What three things does os.walk hand your loop on each pass?",
  a:"The current folder's path, the list of its subfolder names, and the list of its filenames. One pass arrives for every folder anywhere under the top one, and the path joins with a filename to make a usable relative path." },
{ q:"os.walk visits folders in whatever order the filesystem supplies. How do you make a walk deterministic, and why does sorting the subfolder list in place change more than your printing?",
  a:"Sort both lists yourself. Sorting the filenames only tidies your own output, but the subfolder list is os.walk's route plan: the walk descends top-down into exactly those names, so sorting that list in place fixes the order folders are visited in." },
{ q:"A loop zips three files by calling zipfile.ZipFile('backup.zip', 'w') once per file. What does the finished archive hold, and what is the fix?",
  a:"Only the last file — mode 'w' starts the archive over on every open, discarding the previous passes. Open the archive once with 'w' and write all three inside one with block, or open with 'a' to add to an existing archive." }
],
exercises: [
{ c:"file I/O", t:"Sort the shipment", book:"ch11",
  b:"Create a folder shipment holding five files: crate1.txt, crate2.txt, photo1.png, photo2.png, and photo3.png (contents are up to you). Add subfolders shipment/text and shipment/images, move every .txt file into text and every .png file into images — give shutil.move the full destination path, so the move still works when run twice — then print two lines: text: followed by the sorted name list of the text folder, and images: followed by the sorted name list of the images folder.",
  o:"text: ['crate1.txt', 'crate2.txt']\nimages: ['photo1.png', 'photo2.png', 'photo3.png']",
  h:["Build the layout first — os.makedirs for the two subfolders, a loop of write_text calls for the five files — then decide each file's destination from its ending with name.endswith('.txt').",
     "os.makedirs('shipment/text', exist_ok=True) tolerates already existing, and the move destination is 'shipment/text/' + name — the full path, not the folder — so a rerun replaces instead of raising shutil.Error.",
     "Loop over os.listdir('shipment'); when name.endswith('.txt'), shutil.move('shipment/' + name, 'shipment/text/' + name). The .png branch mirrors it, and print('text:', sorted(os.listdir('shipment/text'))) shapes one output line."]},
{ c:"file I/O", t:"Clear the build litter", book:"ch11",
  b:"Create a folder workbench holding part1.py, part2.py, build1.tmp, build2.tmp, and build3.tmp (contents are up to you). Delete every file ending in .tmp, counting as you delete, then print two lines: deleted: followed by the count, and kept: followed by the sorted list of surviving filenames.",
  o:"deleted: 3\nkept: ['part1.py', 'part2.py']",
  h:["Loop over the folder's filenames and pick out the ones that end in .tmp — everything else stays untouched.",
     "os.remove('workbench/' + name) deletes one file; count with deleted = deleted + 1. Drafting the loop with print in place of os.remove first is the habit this chapter is about.",
     "for name in sorted(os.listdir('workbench')): when name.endswith('.tmp'), remove it and add one to the count. After the loop, print('deleted:', deleted) — the kept line is one more print around a sorted listdir."]},
{ c:"loops", t:"The file census", book:"ch11",
  b:"Build a tree: a folder fieldwork containing a subfolder site_a with two .txt files and a subfolder site_b with three .txt files (names and contents are up to you). Walk it with os.walk, sorting the subfolder list in place, and print one line per folder: the folder's path, a space, and the number of files directly inside it. Finish with a line in the form total: 5.",
  o:"fieldwork 0\nfieldwork/site_a 2\nfieldwork/site_b 3\ntotal: 5",
  h:["os.walk does the visiting — your loop only counts what each pass hands over, and len() of the filename list is the whole per-folder count.",
     "Keep a running total: start it at 0 before the loop, add len(files) on every pass. subfolders.sort() inside the loop pins the visiting order.",
     "for folder, subfolders, files in os.walk('fieldwork'): sort the subfolders, print(folder, len(files)), add len(files) to the total — one print after the loop reports total: and the sum."]},
{ c:"file I/O", t:"Archive and restore", book:"ch11",
  b:"Create a folder logs holding boot.txt containing exactly ready and crash.txt containing exactly overflow. Zip both files into records.zip under their logs/ paths, adding them in sorted order, then delete the whole logs folder with shutil.rmtree. Restore it by calling extractall() on the zip, then print two lines: the archive's namelist(), and the restored text of logs/boot.txt.",
  o:"['logs/boot.txt', 'logs/crash.txt']\nready",
  h:["Four stages in order: build the folder, zip it, rmtree it, restore it. Between the rmtree and the extractall, the zip is the only copy in existence.",
     "zipfile.ZipFile('records.zip', 'w') opens the archive once; inside the with block, z.write('logs/' + name) for each sorted name stores the logs/ paths the output shows.",
     "After shutil.rmtree('logs'), reopen the archive in read mode; z.extractall() with no argument rebuilds logs/ in the current folder — then print z.namelist() and Path('logs/boot.txt').read_text()."]}
]
};
