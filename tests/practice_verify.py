import io, os, contextlib, json, tempfile

# Each entry: (concept, id, code). Outputs captured by real execution.
S = [
("variables & types","v1","""x = 7
y = 2
print(x / y)
print(x // y)
print(x % y)"""),
("variables & types","v2","""a = "3"
b = 4
print(a * b)"""),
("variables & types","v3","""print(type(5).__name__)
print(int("10") + int("5"))"""),

("strings","s1","""s = "python"
print(s[1:4])
print(s[::-1])
print(len(s))"""),
("strings","s2","""print("a-b-c".split("-"))
print("_".join(["x", "y", "z"]))"""),
("strings","s3","""name = "ada"
print(f"{name.capitalize()} is {len(name)}")"""),

("conditionals","c1","""x = 0
if x:
    print("truthy")
else:
    print("falsy")"""),
("conditionals","c2","""n = 15
if n % 3 == 0 and n % 5 == 0:
    print("both")
elif n % 3 == 0:
    print("three")
else:
    print("neither")"""),
("conditionals","c3","""score = 82
print("pass" if score >= 60 else "fail")"""),

("loops","l1","""total = 0
for i in range(1, 5):
    total += i
print(total)"""),
("loops","l2","""for i in range(3):
    if i == 1:
        continue
    print(i)"""),
("loops","l3","""n = 5
result = 1
while n > 1:
    result *= n
    n -= 1
print(result)"""),

("lists","li1","""nums = [1, 2, 3]
nums.append(4)
nums.insert(0, 0)
print(nums)
print(nums[-1])"""),
("lists","li2","""a = [1, 2, 3]
b = a
b.append(4)
print(a)"""),
("lists","li3","""nums = [3, 1, 2]
print(sorted(nums))
print(nums)"""),

("dicts","d1","""d = {"a": 1, "b": 2}
d["c"] = 3
print(d)
print(d.get("z", 0))"""),
("dicts","d2","""counts = {}
for ch in "banana":
    counts[ch] = counts.get(ch, 0) + 1
print(counts)"""),
("dicts","d3","""d = {"x": 1, "y": 2}
print(list(d.keys()))
print("x" in d)"""),

("functions","f1","""def greet(name="there"):
    return "hi " + name
print(greet())
print(greet("ada"))"""),
("functions","f2","""def f(x):
    x = x + 1
n = 5
f(n)
print(n)"""),
("functions","f3","""def add(*nums):
    return sum(nums)
print(add(1, 2, 3, 4))"""),

("list comprehensions","lc1","""print([x * x for x in range(5)])"""),
("list comprehensions","lc2","""nums = [1, 2, 3, 4, 5, 6]
print([n for n in nums if n % 2 == 0])"""),
("list comprehensions","lc3","""print(["even" if n % 2 == 0 else "odd" for n in range(4)])"""),

("file I/O","fi1","""with open("note.txt", "w") as f:
    f.write("line1\\n")
    f.write("line2\\n")
with open("note.txt") as f:
    print(f.read())"""),
("file I/O","fi2","""with open("data.txt", "w") as f:
    f.write("a\\nb\\nc\\n")
with open("data.txt") as f:
    lines = f.readlines()
print(len(lines))
print(lines[0].strip())"""),
("file I/O","fi3","""with open("log.txt", "w") as f:
    f.write("x")
with open("log.txt", "a") as f:
    f.write("y")
with open("log.txt") as f:
    print(f.read())"""),

("error handling","e1","""try:
    print(10 / 0)
except ZeroDivisionError:
    print("cannot divide by zero")"""),
("error handling","e2","""def to_int(s):
    try:
        return int(s)
    except ValueError:
        return -1
print(to_int("42"))
print(to_int("oops"))"""),
("error handling","e3","""try:
    print("start")
    raise ValueError("bad")
except ValueError as err:
    print("caught:", err)
finally:
    print("done")"""),

("classes","cl1","""class Counter:
    def __init__(self):
        self.n = 0
    def bump(self):
        self.n += 1
c = Counter()
c.bump()
c.bump()
print(c.n)"""),
("classes","cl2","""class Dog:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return self.name + " says woof"
d = Dog("Rex")
print(d.speak())"""),
("classes","cl3","""class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def __repr__(self):
        return f"Point({self.x}, {self.y})"
print(Point(1, 2))"""),

("iterators & generators","g1","""def squares(n):
    for i in range(n):
        yield i * i
print(list(squares(4)))"""),
("iterators & generators","g2","""def count_up(n):
    for i in range(n):
        yield i
g = count_up(3)
print(next(g))
print(next(g))"""),
("iterators & generators","g3","""gen = (x * 2 for x in [1, 2, 3])
print(sum(gen))"""),
]

work = tempfile.mkdtemp()
os.chdir(work)
results = []
for concept, pid, code in S:
    buf = io.StringIO()
    ns = {}
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, ns)
        out = buf.getvalue()
        err = None
    except Exception as ex:
        out = buf.getvalue()
        err = f"{type(ex).__name__}: {ex}"
    results.append({"concept": concept, "id": pid, "out": out, "err": err})

print(json.dumps(results, indent=1))
