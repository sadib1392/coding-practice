/* Practice Log book — Chapter 21: Making Graphs and Manipulating Images.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory:
   Pillow and Matplotlib snippets ran on desktop Python 3.14 with Pillow 12.3.0
   and Matplotlib 3.11.1 (headless Agg backend) in a scratch directory (see
   tests/ch21_verify.py), and the graded exercises run on the built-in Python
   that ships with this app. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch21 = {
n: 21,
title: "Making Graphs and Manipulating Images",
src: "https://automatetheboringstuff.com/3e/chapter21.html",
blurb: "Pixels, box tuples, and Pillow's crop-resize-rotate toolkit, then Matplotlib line, bar, and pie charts from lists of numbers.",
sections: [
{ t: "Pixels and RGBA colors",
  body: [
  ["p","Zoom far enough into any image and it stops being a picture and becomes a grid of pixels — single-color squares, each one addressable and each one changeable from Python. A pixel's color is four integers called an RGBA value: how much red, green, and blue it holds, plus an alpha value for how opaque it is. Every channel runs from 0, meaning none, to 255, the maximum. (255, 0, 0, 255) is fully opaque red, (0, 0, 0, 255) is solid black, and an alpha of 0 makes the pixel invisible — once nothing shows, the other three numbers no longer matter."],
  ["note","Pillow and Matplotlib are third-party packages for a desktop Python — you install them by running pip install pillow matplotlib in a terminal — and neither can run inside this app. Read their code blocks as worked examples; every shown result was captured from a real desktop run. The graded exercises at the bottom use only built-in Python on the same coordinate and color arithmetic, so they run and grade here as usual."],
  ["p","Pillow, the image package this chapter uses, accepts color names as well as tuples. The ImageColor.getcolor() function turns a name into the tuple form: pass the name and the string 'RGBA'. Names are case-insensitive, and there are well over a hundred of them — the full set lives in the keys of the ImageColor.colormap dictionary."],
  ["code",">>> from PIL import ImageColor\n>>> ImageColor.getcolor('red', 'RGBA')\n(255, 0, 0, 255)\n>>> ImageColor.getcolor('RED', 'RGBA')\n(255, 0, 0, 255)\n>>> ImageColor.getcolor('teal', 'RGBA')\n(0, 128, 128, 255)\n>>> ImageColor.getcolor('gold', 'RGBA')\n(255, 215, 0, 255)\n>>> ImageColor.getcolor('tomato', 'RGBA')\n(255, 99, 71, 255)"],
  ["p","Those names — teal, gold, tomato, plus navy and white — are the whole palette for this chapter. Every example builds its images from scratch in code, so every number shown can be checked by running the same lines yourself."]
]},
{ t: "Coordinates and box tuples",
  body: [
  ["p","Pixels are addressed by x- and y-coordinates, and the addressing has one rule that trips everyone: the origin (0, 0) is the top-left corner, x grows to the right, and y grows downward. The bottom row of a 160-pixel-tall image is y = 159, not y = 0."],
  ["note","The y direction is the opposite of a math-class graph. Add 10 to a y-coordinate and the pixel moves down the image, not up. Code that tries to raise a shape by increasing y sinks it instead, and no error points at the real mistake."],
  ["p","Many Pillow methods take a box tuple: four integers naming a rectangle as (left, top, right, bottom). The left and top edges are inside the box; the right and bottom edges are one past it, excluded. That makes the arithmetic clean — width is right minus left, height is bottom minus top, with no off-by-one correction. Take the box (5, 2, 11, 10):"],
  ["code",">>> 11 - 5\n6\n>>> 10 - 2\n8"],
  ["p","Six pixels wide, eight tall. The excluded edges are also what let boxes sit flush against each other: a box ending at right = 60 and a neighbor starting at left = 60 share a border and overlap nowhere. A box covering an entire 240 by 160 image is (0, 0, 240, 160), even though the image's far pixel is (239, 159)."]
]},
{ t: "Opening, creating, and saving images",
  body: [
  ["p","Image work in Pillow flows through Image objects. Image.open(filename) loads an existing file into one; Image.new(mode, size, color) builds one from nothing. This chapter uses new so that every example is self-contained: pass the mode string 'RGBA', a (width, height) tuple, and a background color — a name or an RGBA tuple. The size attribute holds the dimensions, and getpixel((x, y)) reads one pixel's color, which is how these examples check their work."],
  ["code",">>> from PIL import Image\n>>> card = Image.new('RGBA', (240, 160), 'teal')\n>>> card.size\n(240, 160)\n>>> card.getpixel((0, 0))\n(0, 128, 128, 255)\n>>> width, height = card.size\n>>> width\n240\n>>> height\n160"],
  ["p","Leave the color argument off and the background defaults to invisible black — every channel zero, alpha included:"],
  ["code",">>> stamp = Image.new('RGBA', (40, 24))\n>>> stamp.getpixel((0, 0))\n(0, 0, 0, 0)"],
  ["p","save(filename) writes an Image object to disk, choosing the file format from the extension, and Image.open() brings it back. The format attribute of a loaded image names the format it came from:"],
  ["code",">>> card.save('card.png')\n>>> reopened = Image.open('card.png')\n>>> reopened.format\n'PNG'\n>>> reopened.size\n(240, 160)"],
  ["code",">>> card.save('card.jpg')\nOSError: cannot write mode RGBA as JPEG"],
  ["note","JPEG stores no transparency, so saving an RGBA image under a .jpg extension fails with the error above. The extension chose the format, and the format cannot hold the alpha channel. Convert first — card.convert('RGB').save('card.jpg') — or stay with PNG, which keeps alpha."]
]},
{ t: "Cropping, copying, and pasting",
  body: [
  ["p","crop() takes a box tuple and returns a new Image object holding just that rectangle. The original is untouched — crop does not cut, it copies out. The result's size follows the box arithmetic from earlier:"],
  ["code",">>> card = Image.new('RGBA', (240, 160), 'teal')\n>>> corner = card.crop((0, 0, 60, 40))\n>>> corner.size\n(60, 40)\n>>> card.crop((150, 100, 240, 160)).size\n(90, 60)"],
  ["p","copy() returns a full duplicate of an image, which is the standard move before edits you may want to undo. That matters because paste() is different in kind: banner.paste(stamp, (x, y)) draws stamp onto banner with its top-left corner at (x, y), changes banner in place, and returns None. Code that treats paste like crop breaks immediately:"],
  ["code",">>> gold_stamp = Image.new('RGBA', (40, 24), 'gold')\n>>> banner = Image.new('RGBA', (120, 48), 'white')\n>>> banner.paste(gold_stamp, (40, 0)).save('banner.png')\nAttributeError: 'NoneType' object has no attribute 'save'"],
  ["note","The paste itself worked — banner carries the stamp now — but the chained save() was called on paste()'s return value, which is None. Methods that return a new image (crop, resize, rotate) chain; paste edits in place and does not. Put banner.save('banner.png') on its own line."],
  ["p","Placing a stamp flush in a corner is subtraction: the paste position for the bottom-right corner is the image's width minus the stamp's width, and the same for the heights. For the 40 by 24 stamp on the 240 by 160 card, that is the arithmetic behind every watermark script:"],
  ["code",">>> 240 - 40\n200\n>>> 160 - 24\n136"],
  ["p","So paste at (200, 136). To cover a whole surface instead of one corner, drive paste() with nested loops that step by the stamp's size. The banner is 120 by 48 and the stamp 40 by 24, so three columns and two rows tile it exactly:"],
  ["code","from PIL import Image\ngold_stamp = Image.new('RGBA', (40, 24), 'gold')\nbanner = Image.new('RGBA', (120, 48), 'white')\nfor left in range(0, 120, 40):\n    for top in range(0, 48, 24):\n        print(left, top)\n        banner.paste(gold_stamp, (left, top))\nbanner.save('banner.png')"],
  ["code","0 0\n0 24\n40 0\n40 24\n80 0\n80 24"],
  ["p","range(0, 120, 40) produces the left edges 0, 40, 80, and range(0, 48, 24) the top edges 0, 24 — six pastes, and the final stamp's far corner lands on the banner's last pixel because the banner's sides divide evenly by the stamp's."]
]},
{ t: "Resizing, rotating, and flipping",
  body: [
  ["p","resize() returns a new Image at the size you pass — a (width, height) tuple that must hold integers. Division is the natural way to compute those, and division in Python always returns a float, so a bare width / 4 inside the tuple raises:"],
  ["code",">>> photo = Image.new('RGBA', (1600, 1000), 'navy')\n>>> photo.resize((800, 500)).size\n(800, 500)\n>>> photo.resize((1600 / 4, 1000 / 4))\nTypeError: 'float' object cannot be interpreted as an integer"],
  ["p","Wrap computed dimensions in int(). resize() also does nothing to protect proportions — it stretches or squashes to whatever two integers you hand it. To shrink the 1600 by 1000 photo to width 400 without distortion, scale both sides by the same factor: the target width divided by the current one."],
  ["code",">>> 400 / 1600\n0.25\n>>> int((400 / 1600) * 1000)\n250\n>>> photo.resize((400, 250)).size\n(400, 250)"],
  ["note","Resizing (1600, 1000) straight to (400, 400) runs without complaint and delivers a squashed image. The mistake is picking both numbers by hand. Pick one, compute the scale from it, and let int(scale * other_side) produce the second."],
  ["p","rotate(degrees) returns a new Image turned counterclockwise. What it does not do by default is grow the canvas: the turned content is clipped to the original frame, corners lost. Passing expand=True resizes the canvas to fit. Watch the size report both ways for a 100 by 200 image:"],
  ["code",">>> tall = Image.new('RGBA', (100, 200), 'navy')\n>>> tall.rotate(90).size\n(100, 200)\n>>> tall.rotate(90, expand=True).size\n(200, 100)\n>>> tall.rotate(30, expand=True).size\n(188, 224)"],
  ["note","A quarter turn of a tall image should give a wide one, so rotate(90) reporting the unchanged (100, 200) is the tell: the turned content was clipped to the old frame. With expand=True the quarter turn gives the clean swapped size, and an angle like 30 degrees gives a canvas larger than either original dimension, because it must hold a tilted rectangle."],
  ["p","Mirror flips go through transpose(), which also returns a new Image: Image.Transpose.FLIP_LEFT_RIGHT mirrors horizontally, Image.Transpose.FLIP_TOP_BOTTOM vertically. Marking one corner pixel shows the move — paste a red dot at (0, 0), flip left to right, and the dot lands at the opposite end of its row:"],
  ["code",">>> mark = Image.new('RGBA', (8, 8), 'white')\n>>> red = Image.new('RGBA', (1, 1), 'red')\n>>> mark.paste(red, (0, 0))\n>>> flipped = mark.transpose(Image.Transpose.FLIP_LEFT_RIGHT)\n>>> flipped.getpixel((7, 0))\n(255, 0, 0, 255)\n>>> flipped.getpixel((0, 0))\n(255, 255, 255, 255)"]
]},
{ t: "Single pixels and drawing",
  body: [
  ["p","getpixel() has a writing partner: putpixel((x, y), color) sets one pixel, in place, taking an RGBA tuple or an RGB triple — on an RGBA image a triple gets an alpha of 255 filled in. It does not take color names, which is what ImageColor.getcolor() is for. Painting regions a pixel at a time is two nested loops:"],
  ["code","from PIL import Image, ImageColor\ndot = Image.new('RGBA', (8, 8))\nprint(dot.getpixel((0, 0)))\nfor x in range(8):\n    for y in range(8):\n        if x < 5:\n            dot.putpixel((x, y), (46, 139, 87))\n        else:\n            dot.putpixel((x, y), ImageColor.getcolor('lightgray', 'RGBA'))\nprint(dot.getpixel((0, 0)))\nprint(dot.getpixel((7, 7)))"],
  ["code","(0, 0, 0, 0)\n(46, 139, 87, 255)\n(211, 211, 211, 255)"],
  ["p","The first read shows the transparent default, the second the seagreen triple with its alpha filled in, the third the lightgray that getcolor() supplied. An 8 by 8 image is 64 putpixel calls, which is workable; a 1600 by 1000 photo is 1.6 million, which is why shapes go through the ImageDraw module instead. Hand your Image to ImageDraw.Draw() and you get a drawing object whose methods paint onto that image in place:"],
  ["code","from PIL import Image, ImageDraw\nim = Image.new('RGBA', (120, 80), 'white')\ndraw = ImageDraw.Draw(im)\ndraw.rectangle((10, 10, 50, 40), fill='navy')\ndraw.ellipse((70, 20, 110, 60), fill='tomato')\ndraw.line([(0, 79), (119, 79)], fill='black')\nprint(im.getpixel((30, 25)))\nprint(im.getpixel((90, 40)))\nprint(im.getpixel((60, 79)))\nim.save('shapes.png')"],
  ["code","(0, 0, 128, 255)\n(255, 99, 71, 255)\n(0, 0, 0, 255)"],
  ["p","rectangle() and ellipse() take box tuples — the ellipse fills its box, so a square box draws a circle. line() and polygon() take lists of points, point() sets single pixels, and each method accepts fill for the interior plus outline and width where an edge makes sense. The three getpixel() reads confirm navy inside the rectangle, tomato inside the ellipse, and black on the bottom line. Note that the drawing happens on im through draw — the Image object itself has no drawing methods."],
  ["p","Drawing objects also write text: text((x, y), string, fill=color) puts the string's top-left corner at (x, y) in a small built-in font. For a real typeface, ImageFont.truetype() takes a .ttf font filename and a point size, and its result passes to text() as the font argument."],
  ["code","draw.text((10, 55), 'card 1 of 6', fill='black')\nim.save('shapes.png')"],
  ["p","One neighboring tool in passing: the third-party pyperclipimg package copies Image objects to and from the system clipboard, the same service pyperclip provides for strings — desktop only, like everything else in this chapter."]
]},
{ t: "Making graphs with Matplotlib",
  body: [
  ["p","You could draw a bar chart with ImageDraw — rectangles at computed heights — but you would be rebuilding a wheel. Matplotlib is the standard third-party graphing library: hand it lists of numbers and it lays out the axes, scales, ticks, and colors. The convention is to import matplotlib.pyplot under the short name plt. plt.plot() adds a line to the current figure, each further plot() call adds another, and plt.savefig() writes the figure to an image file. A line graph suits values over time — here, two weeks of daily practice minutes:"],
  ["code","import os\nimport matplotlib.pyplot as plt\n\ndays = [0, 1, 2, 3, 4, 5, 6]\nthis_week = [15, 12, 18, 15, 0, 22, 15]\nlast_week = [10, 15, 15, 8, 12, 20, 15]\nplt.plot(days, this_week)\nplt.plot(days, last_week)\nplt.savefig('practice.png')\nprint(os.path.exists('practice.png'))"],
  ["code","True"],
  ["p","The two lists in each plot() call pair up point by point — day 0 with 15 minutes, day 1 with 12, and so on — so they must be the same length. savefig() wrote a finished PNG next to the script, and the print confirms the file exists. Nothing appeared on screen, because showing a window is a separate call:"],
  ["code","plt.show()"],
  ["p","On a desktop, plt.show() opens the figure in an interactive window — pan, zoom, save — and blocks until that window closes. This app has no window to offer, which is why the examples here save files instead. show() is for looking; savefig() is for keeping."],
  ["note","Closing the show() window clears the figure. A second plt.show() displays nothing, and a savefig() placed after the window closes writes out an empty chart. Order the endings savefig first, show second, every time."],
  ["p","plt.scatter() takes the same two lists and draws unconnected points — the call shape is identical to plot(). plt.bar() compares categories instead of tracking time: the first list holds the category labels, the second their values."],
  ["code","import matplotlib.pyplot as plt\n\nlangs = ['Python', 'JavaScript', 'R', 'Mermaid']\ncleared = [12, 10, 6, 5]\nplt.bar(langs, cleared)\nplt.savefig('cleared.png')"],
  ["p","plt.pie() shows parts of a whole. Pass the slice sizes, name them with the labels argument, and add autopct to print each slice's percentage on the chart — the format string '%.1f%%' shows one decimal place. Here an hour of practice splits into drills, reading, and review:"],
  ["code","import matplotlib.pyplot as plt\n\nsplit = [30, 15, 15]\nparts = ['drills', 'reading', 'review']\nplt.pie(split, labels=parts, autopct='%.1f%%')\nplt.savefig('hour.png')"],
  ["p","The percentages are each slice divided by the total, and you can check them before the chart does:"],
  ["code",">>> 30 / 60 * 100\n50.0\n>>> 15 / 60 * 100\n25.0"],
  ["p","So the slices are labeled 50.0%, 25.0%, and 25.0%. The default charts carry no captions; a few more calls finish one for other readers. Keyword arguments on plot() set a per-line marker ('o' for circles, 's' for squares), a color, and a label; plt.legend() collects the labels into a legend box; xlabel(), ylabel(), and title() caption the axes and the figure; grid(True) draws reference lines."],
  ["code","import matplotlib.pyplot as plt\n\ndays = [0, 1, 2, 3, 4, 5, 6]\nthis_week = [15, 12, 18, 15, 0, 22, 15]\nlast_week = [10, 15, 15, 8, 12, 20, 15]\nplt.plot(days, this_week, marker='o', color='b', label='this week')\nplt.plot(days, last_week, marker='s', color='r', label='last week')\nplt.legend()\nplt.xlabel('day')\nplt.ylabel('minutes')\nplt.title('Daily practice')\nplt.grid(True)\nplt.savefig('labeled.png')"],
  ["note","Every pyplot call adds to the current figure until something clears it, so two of these examples run in one script draw into the same figure. Between charts in a single script, call plt.figure() to start a fresh one."]
]},
{ t: "Summary",
  body: [
  ["p","An image is a pixel grid addressed from a top-left origin with y growing downward, and each pixel is an RGBA tuple of four 0-to-255 integers. Box tuples name rectangles as (left, top, right, bottom) with the right and bottom edges excluded, so width and height are plain subtractions. Pillow's Image objects come from Image.open() or Image.new(); crop(), resize(), rotate(), and transpose() return new images, while paste() and putpixel() edit in place and return None; save() writes to disk in the format the extension names. ImageDraw turns an image into a drawing surface for rectangles, ellipses, lines, polygons, and text."],
  ["p","Matplotlib turns lists into charts: plot() for lines, scatter() for points, bar() for categories, pie() for shares, with legend(), axis labels, a title, and a grid as finishing calls — and savefig() belongs before show(), because closing the preview window clears the figure. Answer the practice questions from memory before revealing the answers, then clear the graded exercises below; they run the chapter's coordinate and color arithmetic in plain Python, so they grade here as usual. The next chapter points Python at pictures of words — recognizing text in images, and pulling editable text out of screenshots and scans."]
]}
],
questions: [
{ q:"An RGBA value is four integers. What does each one stand for, and what is the range of each?",
  a:"Red, green, blue, and alpha — how opaque the pixel is. Each is an integer from 0 (none) to 255 (maximum). Alpha 255 is fully opaque; alpha 0 is invisible, whatever the other three say." },
{ q:"How do you turn the color name 'teal' into a tuple Pillow can use, and what does the call return?",
  a:"ImageColor.getcolor('teal', 'RGBA') returns (0, 128, 128, 255). The name is case-insensitive, so 'TEAL' returns the same tuple." },
{ q:"Where does the coordinate (0, 0) sit in an image, and which way does y grow?",
  a:"(0, 0) is the top-left corner. x grows to the right and y grows downward — the reverse of a math-class graph — so the bottom row of an image has the largest y-coordinate." },
{ q:"In the box tuple (5, 2, 11, 10), which edges are included, and how many pixels wide and tall is the box?",
  a:"Left and top are included; right and bottom are excluded. Width is 11 - 5 = 6 and height is 10 - 2 = 8, so the box covers 6 by 8 pixels." },
{ q:"Image.new('RGBA', (40, 24)) passes no background color. What does every pixel of the new image hold?",
  a:"Invisible black, (0, 0, 0, 0) — every channel zero, alpha included, so the image is fully transparent until something is drawn or pasted onto it." },
{ q:"A 120 by 80 image needs its lower-left quarter cropped out. What box tuple do you pass to crop(), and what size comes back?",
  a:"(0, 40, 60, 80): left edge 0, top at half the height, right at half the width, bottom at the full height. The returned image's size is (60, 40)." },
{ q:"crop() and resize() return a new Image. What does paste() do instead, and what breaks if you forget?",
  a:"paste() draws onto the image in place and returns None. Chaining another call onto it — banner.paste(stamp, (40, 0)).save('banner.png') — fails with an AttributeError, because the save() ran on None." },
{ q:"tall is 100 pixels wide and 200 tall. What size is tall.rotate(90)? And with expand=True?",
  a:"tall.rotate(90).size is still (100, 200) — the canvas stays put and the turned content is clipped. With expand=True the canvas grows to fit and the size is (200, 100)." },
{ q:"Which module draws shapes, and why can you not call rectangle() on an Image object directly?",
  a:"The ImageDraw module. ImageDraw.Draw(im) returns a drawing object bound to im, and rectangle(), ellipse(), line(), polygon(), and text() live on that object — Image objects have no drawing methods." },
{ q:"Which Matplotlib function makes each chart — line, scatter, bar, pie — and why must savefig() come before show()?",
  a:"plt.plot() for a line graph, plt.scatter() for a scatter plot, plt.bar() for a bar graph, plt.pie() for a pie chart. Closing the show() window clears the figure, so a savefig() after that writes an empty chart — save first, show second." }
],
exercises: [
{ c:"variables & types", t:"Fit to the frame", book:"ch21",
  b:"A photo is width = 1600 by height = 1000 pixels and must shrink so its width becomes 400 with its proportions kept. Compute scale = 400 / width, then new_height = int(scale * height). Print the scale, then the new height, then the new size on one line in the same form as 640 x 480 — the two numbers joined with ' x ' using str() and +.",
  o:"0.25\n250\n400 x 250",
  h:["The scale factor is what the old width is multiplied by to land on 400 — divide the target by the original.",
     "Division always returns a float, and a pixel count must be an integer: int() cuts the scaled height down to one.",
     "scale = 400 / width and new_height = int(scale * height); the last line joins str(400) and str(new_height) with ' x ' between them."]},
{ c:"functions", t:"Box arithmetic", book:"ch21",
  b:"Write a function box_size(box) that takes a box tuple (left, top, right, bottom) and returns the tuple (width, height). Remember that the right and bottom edges are excluded. Print box_size((60, 40, 220, 160)), then print box_size((0, 0, 32, 32)).",
  o:"(160, 120)\n(32, 32)",
  h:["Width is how far right the box ends minus how far right it starts. The excluded edges are what make plain subtraction correct.",
     "Unpack inside the function — left, top, right, bottom = box — so the four numbers have names.",
     "The returned tuple is (right minus left, bottom minus top); build it in parentheses and return it."]},
{ c:"functions", t:"Blend two colors", book:"ch21",
  b:"Write a function blend(c1, c2) that takes two RGBA tuples and returns a new tuple in which every channel is the average of the two, using integer division //. Print blend((255, 0, 0, 255), (0, 0, 255, 255)), then print blend((255, 255, 255, 255), (0, 0, 0, 255)).",
  o:"(127, 0, 127, 255)\n(127, 127, 127, 255)",
  h:["Average red with red, green with green, blue with blue, alpha with alpha — four small averages, one shared recipe.",
     "Channels are index positions: c1[0] pairs with c2[0], and // 2 keeps every average a whole number.",
     "Each channel is (c1[i] + c2[i]) // 2 for i from 0 to 3; collect the four results into one tuple and return it."]},
{ c:"lists", t:"A row of pixels", book:"ch21",
  b:"Build a list named row holding the RGBA tuples for one 8-pixel row of a progress bar: the first 5 pixels are (0, 128, 128, 255) and the last 3 are (255, 255, 255, 255). Use a loop with append, then print the length of row, then its first entry, then its last entry.",
  o:"8\n(0, 128, 128, 255)\n(255, 255, 255, 255)",
  h:["One loop, eight passes, one append per pass. The only decision each pass is which of the two tuples to append.",
     "range(8) gives x values 0 through 7, and the first five are exactly the ones where x < 5.",
     "Inside the loop: if x < 5 append the teal tuple, else the white one. The last entry to print is row[7]."]}
]
};
