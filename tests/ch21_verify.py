# Verify every code snippet shown in book/ch21.js.
# Same self-checking idea as ch2_verify.py: each snippet's expected output
# (as embedded in the chapter file) is asserted here, so any drift between
# the chapter text and real execution fails the run.
#
# The Pillow and Matplotlib snippets need those third-party packages (the
# chapter discloses they run on desktop Python, not in the app). Each library
# gets its own guarded section: when it is not installed, that section is
# skipped WITHOUT failing. The stdlib checks — the coordinate, scale, and
# color arithmetic plus all four graded-exercise reference solutions — always
# run. Matplotlib runs on the headless Agg backend; nothing opens a window.
import io, contextlib, os, sys, tempfile

fails = 0
checks = 0
def check(label, got, want):
    global fails, checks
    checks += 1
    ok = got == want
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        fails += 1
        print(f"     got:  {got!r}")
        print(f"     want: {want!r}")

def repl_seq(label, steps, expected, ns=None):
    # steps: list of (code, is_stmt) sharing one namespace.
    # expected: list of repr/error strings for the non-statement steps.
    if ns is None:
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

def run(code, ns=None):
    buf = io.StringIO()
    if ns is None:
        ns = {}
    with contextlib.redirect_stdout(buf):
        exec(code, ns)
    return buf.getvalue().rstrip("\n")

print("=== stdlib: box tuple arithmetic ===")
repl_seq("box (5, 2, 11, 10) is 6 wide, 8 tall",
    [("11 - 5", False), ("10 - 2", False)],
    ["6", "8"])
repl_seq("bottom-right paste position on a 240x160 card",
    [("240 - 40", False), ("160 - 24", False)],
    ["200", "136"])
repl_seq("scale factor and scaled height for the 1600x1000 photo",
    [("400 / 1600", False), ("int((400 / 1600) * 1000)", False)],
    ["0.25", "250"])
repl_seq("q6: half-width and half-height of a 120x80 image",
    [("120 // 2", False), ("80 // 2", False)],
    ["60", "40"])

print("=== stdlib: the tiling loop's printed pairs ===")
check("nested range(0, 120, 40) x range(0, 48, 24) pairs",
    run("""for left in range(0, 120, 40):
    for top in range(0, 48, 24):
        print(left, top)"""),
    "0 0\n0 24\n40 0\n40 24\n80 0\n80 24")

print("=== stdlib: pie-slice percentage arithmetic ===")
repl_seq("shares of the 30/15/15 practice hour",
    [("30 / 60 * 100", False), ("15 / 60 * 100", False)],
    ["50.0", "25.0"])
repl_seq("autopct '%.1f%%' renders those shares",
    [("'%.1f%%' % (30 / 60 * 100)", False), ("'%.1f%%' % (15 / 60 * 100)", False)],
    ["'50.0%'", "'25.0%'"])

print("=== graded exercises: reference solutions vs expected o ===")
check("ex1 Fit to the frame",
    run("""width = 1600
height = 1000
new_width = 400
scale = new_width / width
new_height = int(scale * height)
print(scale)
print(new_height)
print(str(new_width) + ' x ' + str(new_height))"""),
    "0.25\n250\n400 x 250")
check("ex2 Box arithmetic",
    run("""def box_size(box):
    left, top, right, bottom = box
    return (right - left, bottom - top)

print(box_size((60, 40, 220, 160)))
print(box_size((0, 0, 32, 32)))"""),
    "(160, 120)\n(32, 32)")
check("ex3 Blend two colors",
    run("""def blend(c1, c2):
    r = (c1[0] + c2[0]) // 2
    g = (c1[1] + c2[1]) // 2
    b = (c1[2] + c2[2]) // 2
    a = (c1[3] + c2[3]) // 2
    return (r, g, b, a)

print(blend((255, 0, 0, 255), (0, 0, 255, 255)))
print(blend((255, 255, 255, 255), (0, 0, 0, 255)))"""),
    "(127, 0, 127, 255)\n(127, 127, 127, 255)")
check("ex4 A row of pixels",
    run("""row = []
for x in range(8):
    if x < 5:
        row.append((0, 128, 128, 255))
    else:
        row.append((255, 255, 255, 255))
print(len(row))
print(row[0])
print(row[7])"""),
    "8\n(0, 128, 128, 255)\n(255, 255, 255, 255)")

# ---------------------------------------------------------------------------
# Pillow-dependent checks. Guarded: skipping is not failing.
# ---------------------------------------------------------------------------
PILLOW_CHECKS = 20
try:
    from PIL import Image, ImageColor, ImageDraw
    HAVE_PILLOW = True
except ImportError:
    HAVE_PILLOW = False

if not HAVE_PILLOW:
    print(f"skip: pillow not installed ({PILLOW_CHECKS} checks skipped)")
else:
    before = checks
    olddir = os.getcwd()
    td = tempfile.mkdtemp(prefix="ch21verify_")
    os.chdir(td)
    try:
        print("=== pillow: ImageColor.getcolor ===")
        ns1 = {}
        repl_seq("named colors to RGBA tuples, case-insensitive",
            [("from PIL import ImageColor", True),
             ("ImageColor.getcolor('red', 'RGBA')", False),
             ("ImageColor.getcolor('RED', 'RGBA')", False),
             ("ImageColor.getcolor('teal', 'RGBA')", False),
             ("ImageColor.getcolor('gold', 'RGBA')", False),
             ("ImageColor.getcolor('tomato', 'RGBA')", False)],
            ["(255, 0, 0, 255)", "(255, 0, 0, 255)", "(0, 128, 128, 255)",
             "(255, 215, 0, 255)", "(255, 99, 71, 255)"], ns1)
        repl_seq("q2: 'TEAL' returns the same tuple",
            [("ImageColor.getcolor('TEAL', 'RGBA')", False)],
            ["(0, 128, 128, 255)"], ns1)

        print("=== pillow: new / size / save / open round trip ===")
        ns3 = {}
        repl_seq("teal card: size, background pixel, unpacked dimensions",
            [("from PIL import Image", True),
             ("card = Image.new('RGBA', (240, 160), 'teal')", True),
             ("card.size", False),
             ("card.getpixel((0, 0))", False),
             ("width, height = card.size", True),
             ("width", False),
             ("height", False)],
            ["(240, 160)", "(0, 128, 128, 255)", "240", "160"], ns3)
        repl_seq("no color argument defaults to invisible black",
            [("stamp = Image.new('RGBA', (40, 24))", True),
             ("stamp.getpixel((0, 0))", False)],
            ["(0, 0, 0, 0)"], ns3)
        repl_seq("save to PNG and reopen",
            [("card.save('card.png')", True),
             ("reopened = Image.open('card.png')", True),
             ("reopened.format", False),
             ("reopened.size", False)],
            ["'PNG'", "(240, 160)"], ns3)
        repl_seq("RGBA cannot be saved as JPEG",
            [("card.save('card.jpg')", False)],
            ["OSError: cannot write mode RGBA as JPEG"], ns3)
        exec("card.convert('RGB').save('card.jpg')", ns3)
        check("note claim: convert('RGB') makes the JPEG save work",
            os.path.exists('card.jpg'), True)

        print("=== pillow: crop / paste ===")
        ns4 = {"Image": Image}
        repl_seq("crop returns a new image sized by the box",
            [("card = Image.new('RGBA', (240, 160), 'teal')", True),
             ("corner = card.crop((0, 0, 60, 40))", True),
             ("corner.size", False),
             ("card.crop((150, 100, 240, 160)).size", False)],
            ["(60, 40)", "(90, 60)"], ns4)
        repl_seq("chaining onto paste fails, but the paste happened",
            [("gold_stamp = Image.new('RGBA', (40, 24), 'gold')", True),
             ("banner = Image.new('RGBA', (120, 48), 'white')", True),
             ("banner.paste(gold_stamp, (40, 0)).save('banner.png')", False),
             ("banner.getpixel((50, 10))", False)],
            ["AttributeError: 'NoneType' object has no attribute 'save'",
             "(255, 215, 0, 255)"], ns4)
        ns_tile = {}
        check("tiling program prints the six paste positions",
            run("""from PIL import Image
gold_stamp = Image.new('RGBA', (40, 24), 'gold')
banner = Image.new('RGBA', (120, 48), 'white')
for left in range(0, 120, 40):
    for top in range(0, 48, 24):
        print(left, top)
        banner.paste(gold_stamp, (left, top))
banner.save('banner.png')""", ns_tile),
            "0 0\n0 24\n40 0\n40 24\n80 0\n80 24")
        check("tiling program saves banner.png",
            os.path.exists('banner.png'), True)
        check("prose claim: the last stamp reaches the banner's far pixel",
            ns_tile["banner"].getpixel((119, 47)), (255, 215, 0, 255))

        print("=== pillow: resize / rotate / flip ===")
        ns5 = {}
        repl_seq("resize sizes, float rejection, and the 400x250 fit",
            [("from PIL import Image", True),
             ("photo = Image.new('RGBA', (1600, 1000), 'navy')", True),
             ("photo.resize((800, 500)).size", False),
             ("photo.resize((1600 / 4, 1000 / 4))", False),
             ("photo.resize((400, 250)).size", False)],
            ["(800, 500)",
             "TypeError: 'float' object cannot be interpreted as an integer",
             "(400, 250)"], ns5)
        repl_seq("rotate clips at the old canvas unless expand=True",
            [("tall = Image.new('RGBA', (100, 200), 'navy')", True),
             ("tall.rotate(90).size", False),
             ("tall.rotate(90, expand=True).size", False),
             ("tall.rotate(30, expand=True).size", False)],
            ["(100, 200)", "(200, 100)", "(188, 224)"], ns5)
        repl_seq("flip moves the marked corner across the row",
            [("mark = Image.new('RGBA', (8, 8), 'white')", True),
             ("red = Image.new('RGBA', (1, 1), 'red')", True),
             ("mark.paste(red, (0, 0))", True),
             ("flipped = mark.transpose(Image.Transpose.FLIP_LEFT_RIGHT)", True),
             ("flipped.getpixel((7, 0))", False),
             ("flipped.getpixel((0, 0))", False)],
            ["(255, 0, 0, 255)", "(255, 255, 255, 255)"], ns5)

        print("=== pillow: putpixel / ImageDraw ===")
        check("putpixel program: default, RGB triple, getcolor result",
            run("""from PIL import Image, ImageColor
dot = Image.new('RGBA', (8, 8))
print(dot.getpixel((0, 0)))
for x in range(8):
    for y in range(8):
        if x < 5:
            dot.putpixel((x, y), (46, 139, 87))
        else:
            dot.putpixel((x, y), ImageColor.getcolor('lightgray', 'RGBA'))
print(dot.getpixel((0, 0)))
print(dot.getpixel((7, 7)))"""),
            "(0, 0, 0, 0)\n(46, 139, 87, 255)\n(211, 211, 211, 255)")
        ns_draw = {}
        check("drawing program: rectangle, ellipse, line pixel evidence",
            run("""from PIL import Image, ImageDraw
im = Image.new('RGBA', (120, 80), 'white')
draw = ImageDraw.Draw(im)
draw.rectangle((10, 10, 50, 40), fill='navy')
draw.ellipse((70, 20, 110, 60), fill='tomato')
draw.line([(0, 79), (119, 79)], fill='black')
print(im.getpixel((30, 25)))
print(im.getpixel((90, 40)))
print(im.getpixel((60, 79)))
im.save('shapes.png')""", ns_draw),
            "(0, 0, 128, 255)\n(255, 99, 71, 255)\n(0, 0, 0, 255)")
        check("drawing program saves shapes.png",
            os.path.exists('shapes.png'), True)
        exec("draw.text((10, 55), 'card 1 of 6', fill='black')\nim.save('shapes.png')", ns_draw)
        check("text block runs with the built-in font and resaves",
            os.path.exists('shapes.png'), True)
        check("prose claim: Image objects have no drawing methods",
            hasattr(ns_draw["im"], "rectangle"), False)
    finally:
        os.chdir(olddir)
    delta = checks - before
    check("guarded pillow section ran the declared number of checks",
        delta, PILLOW_CHECKS)

# ---------------------------------------------------------------------------
# Matplotlib-dependent checks. Guarded: skipping is not failing.
# ---------------------------------------------------------------------------
MPL_CHECKS = 7
try:
    import matplotlib
    matplotlib.use("Agg")  # headless; no window ever opens
    import matplotlib.pyplot as plt
    HAVE_MPL = True
except ImportError:
    HAVE_MPL = False

if not HAVE_MPL:
    print(f"skip: matplotlib not installed ({MPL_CHECKS} checks skipped)")
else:
    before = checks
    olddir = os.getcwd()
    td = tempfile.mkdtemp(prefix="ch21verify_mpl_")
    os.chdir(td)
    try:
        print("=== matplotlib: savefig writes real files (Agg backend) ===")
        LINE_BLOCK = """import os
import matplotlib.pyplot as plt

days = [0, 1, 2, 3, 4, 5, 6]
this_week = [15, 12, 18, 15, 0, 22, 15]
last_week = [10, 15, 15, 8, 12, 20, 15]
plt.plot(days, this_week)
plt.plot(days, last_week)
plt.savefig('practice.png')
print(os.path.exists('practice.png'))"""
        BAR_BLOCK = """import matplotlib.pyplot as plt

langs = ['Python', 'JavaScript', 'R', 'Mermaid']
cleared = [12, 10, 6, 5]
plt.bar(langs, cleared)
plt.savefig('cleared.png')"""
        PIE_BLOCK = """import matplotlib.pyplot as plt

split = [30, 15, 15]
parts = ['drills', 'reading', 'review']
plt.pie(split, labels=parts, autopct='%.1f%%')
plt.savefig('hour.png')"""
        LABELED_BLOCK = """import matplotlib.pyplot as plt

days = [0, 1, 2, 3, 4, 5, 6]
this_week = [15, 12, 18, 15, 0, 22, 15]
last_week = [10, 15, 15, 8, 12, 20, 15]
plt.plot(days, this_week, marker='o', color='b', label='this week')
plt.plot(days, last_week, marker='s', color='r', label='last week')
plt.legend()
plt.xlabel('day')
plt.ylabel('minutes')
plt.title('Daily practice')
plt.grid(True)
plt.savefig('labeled.png')"""
        plt.close("all")
        check("line block prints True (practice.png exists)",
            run(LINE_BLOCK), "True")
        check("line block left practice.png on disk",
            os.path.exists('practice.png'), True)
        plt.close("all")
        run(BAR_BLOCK)
        check("bar block runs and saves cleared.png",
            os.path.exists('cleared.png'), True)
        plt.close("all")
        run(PIE_BLOCK)
        check("pie block runs and saves hour.png",
            os.path.exists('hour.png'), True)
        plt.close("all")
        run(LABELED_BLOCK)
        check("labeled block runs and saves labeled.png",
            os.path.exists('labeled.png'), True)
        plt.close("all")
        run(BAR_BLOCK)
        run(PIE_BLOCK)
        check("note claim: two chart blocks in one script share one figure",
            len(plt.get_fignums()), 1)
        plt.figure()
        check("note claim: plt.figure() starts a fresh figure",
            len(plt.get_fignums()), 2)
        plt.close("all")
    finally:
        os.chdir(olddir)
    delta = checks - before
    check("guarded matplotlib section ran the declared number of checks",
        delta, MPL_CHECKS)

print()
print("CH21 VERIFY: ALL PASS" if fails == 0 else f"CH21 VERIFY: {fails} FAILURE(S)")
sys.exit(0 if fails == 0 else 1)
