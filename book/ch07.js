/* Practice Log book — Chapter 7: Dictionaries and Structuring Data.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch07 = {
n: 7,
title: "Dictionaries and Structuring Data",
src: "https://automatetheboringstuff.com/3e/chapter7.html",
blurb: "Key-value pairs, safe lookups with get() and setdefault(), the counting pattern, and nesting that models real things.",
sections: [
{ t: "The dictionary data type",
  body: [
  ["p","A dictionary is a collection of values, like a list — but where a list numbers its entries, a dictionary labels them. Each entry is a key-value pair: the key is the label you look things up by, and the value is what is stored under it. A dictionary literal is written in braces, with a colon between each key and its value and commas between the pairs."],
  ["code",">>> bike = {'kind': 'gravel', 'gears': 12, 'color': 'orange'}\n>>> bike['kind']\n'gravel'\n>>> 'My bike has ' + str(bike['gears']) + ' gears'\n'My bike has 12 gears'"],
  ["p","Square brackets fetch a value by its key, the way an index fetches from a list. Assignment through brackets does double duty: assigning to a key the dictionary already has replaces that value, and assigning to a new key creates the pair. del removes a pair, and len() counts how many pairs there are."],
  ["code",">>> bike['bell'] = True\n>>> bike['color'] = 'black'\n>>> bike\n{'kind': 'gravel', 'gears': 12, 'color': 'black', 'bell': True}\n>>> len(bike)\n4\n>>> del bike['bell']\n>>> len(bike)\n3"],
  ["p","Keys are not limited to strings. Integers work too, and they behave like labels, not positions — a route dictionary keyed by route number has a key 42 without having keys 0 through 41."],
  ["code",">>> routes = {7: 'Harbor Loop', 42: 'Airport Express'}\n>>> routes[42]\n'Airport Express'"],
  ["code",">>> bike['Kind']\nKeyError: 'Kind'"],
  ["note","Keys match exactly, capitalisation included — 'Kind' is a different key from 'kind', and looking up a key that is not there stops the program with the KeyError above. Misspelling a key while assigning is worse: no error at all, just a new pair you did not mean to create, and a bug that surfaces somewhere else."]
]},
{ t: "Dictionaries versus lists",
  body: [
  ["p","A list is a sequence: its entries sit at numbered positions, and that order is part of the value. Two lists holding the same items in a different order are not equal. A dictionary has no positions — you reach entries by key — so two dictionaries with the same pairs are equal no matter what order the pairs were typed in."],
  ["code",">>> ['pen', 'ink'] == ['ink', 'pen']\nFalse\n>>> {'pen': 2, 'ink': 1} == {'ink': 1, 'pen': 2}\nTrue"],
  ["p","Order is not invisible, though. When Python prints a dictionary or loops over it, the pairs come out in the order they were added — dependable, and the reason the exercise outputs in this chapter are predictable. What a dictionary never has is a position you can ask for: no slicing, and no first item."],
  ["code",">>> stock = {'pen': 2, 'ink': 1}\n>>> stock\n{'pen': 2, 'ink': 1}\n>>> stock[0]\nKeyError: 0"],
  ["note","The mistake is asking a dictionary for its first item with [0]. That bracket is a key lookup, not a position — stock[0] goes hunting for a key 0, and unless you stored one, it dies with the KeyError above. To walk the entries in order, loop; to fetch one entry, name its key."]
]},
{ t: "Looping: keys(), values(), and items()",
  body: [
  ["p","Three dictionary methods hand a loop the contents: values() gives the values, keys() gives the keys, and items() gives whole pairs. A for loop over each looks like this — and notice that items() delivers every pair as a tuple, printed in parentheses."],
  ["code","tolls = {'car': 3, 'truck': 8, 'bus': 6}\nfor v in tolls.values():\n    print(v)\nfor k in tolls.keys():\n    print(k)\nfor i in tolls.items():\n    print(i)"],
  ["code","3\n8\n6\ncar\ntruck\nbus\n('car', 3)\n('truck', 8)\n('bus', 6)"],
  ["p","Working with a whole tuple is clumsy. Put two names in the for line and Python unpacks each pair as it arrives — the key into the first name, the value into the second. This is the shape of most dictionary loops you will ever write."],
  ["code","tolls = {'car': 3, 'truck': 8, 'bus': 6}\nfor k, v in tolls.items():\n    print('A ' + k + ' pays $' + str(v))"],
  ["code","A car pays $3\nA truck pays $8\nA bus pays $6"],
  ["p","What keys() returns is not a real list — it is a view, a lightweight object made for looping. Pass it to list() when you genuinely need a list."],
  ["code",">>> tolls = {'car': 3, 'truck': 8, 'bus': 6}\n>>> tolls.keys()\ndict_keys(['car', 'truck', 'bus'])\n>>> list(tolls.keys())\n['car', 'truck', 'bus']\n>>> tolls.keys()[0]\nTypeError: 'dict_keys' object is not subscriptable"],
  ["note","A view can be looped over but not indexed — tolls.keys()[0] fails with the TypeError above, and the fix is list(tolls.keys())[0]. Most of the time you never need the conversion: the for loop is the natural way through a dictionary, and it takes the view as-is."]
]},
{ t: "Checking for a key, and get()",
  body: [
  ["p","The in and not in operators from the lists chapter work on dictionaries. Tested against keys() — or against the bare dictionary, which is the same check, shorter — they tell you whether a key exists before you commit to fetching it."],
  ["code",">>> fees = {'locker': 2, 'towel': 1}\n>>> 'locker' in fees.keys()\nTrue\n>>> 'sauna' in fees.keys()\nFalse\n>>> 'towel' in fees\nTrue\n>>> 'sauna' not in fees\nTrue"],
  ["p","Bare in tests keys and only keys. The value 2 is in the dictionary, but 2 in fees answers False, because no key is 2. To search the values, say so with values()."],
  ["code",">>> 2 in fees\nFalse\n>>> 2 in fees.values()\nTrue"],
  ["p","The get() method folds the check and the fetch into one call. It takes a key and a fallback: you get the value when the key exists and the fallback when it does not, and either way the program keeps running."],
  ["code",">>> fees.get('locker', 0)\n2\n>>> fees.get('sauna', 0)\n0\n>>> fees['sauna']\nKeyError: 'sauna'"],
  ["note","Hard brackets are for keys you know are there; get() is for keys that might not be. Writing fees['sauna'] when 'sauna' may be absent is the most common dictionary crash there is — the KeyError above, in the middle of a run that was going fine."]
]},
{ t: "setdefault() and the counting pattern",
  body: [
  ["p","setdefault() is get()'s writing twin. It takes a key and a value, stores the pair only when the key is missing, and returns whatever is under the key afterward. One call replaces the three-line dance of testing not in and then assigning."],
  ["code",">>> profile = {'name': 'Rui', 'city': 'Porto'}\n>>> profile.setdefault('theme', 'light')\n'light'\n>>> profile.setdefault('theme', 'dark')\n'light'\n>>> profile\n{'name': 'Rui', 'city': 'Porto', 'theme': 'light'}"],
  ["p","The second call changed nothing: 'theme' already existed, so 'dark' was ignored and the stored 'light' came back. That store-only-once behaviour powers the counting pattern — tallying things when you do not know the categories in advance. The dictionary starts empty; setdefault plants a zero the first time each new thing appears; then the count goes up by one."],
  ["code","votes = ['tea', 'coffee', 'tea', 'water', 'tea', 'coffee']\ntally = {}\nfor drink in votes:\n    tally.setdefault(drink, 0)\n    tally[drink] = tally[drink] + 1\nprint(tally)"],
  ["code","{'tea': 3, 'coffee': 2, 'water': 1}"],
  ["p","Trace the first two loop passes. For the first 'tea', setdefault stores tea: 0 and the next line lifts it to 1. For 'coffee', the same. When 'tea' comes around again, setdefault sees the key and does nothing, and the count moves to 2. Swap in words, error codes, or bird sightings — the pattern does not change."],
  ["note","Delete the setdefault line and the loop dies on its very first pass: tally[drink] = tally[drink] + 1 must read tally['tea'] before it can add, and that read raises KeyError: 'tea'. You cannot add 1 to a count that does not exist yet — planting the zero is the whole point of the pattern."]
]},
{ t: "A short program: the seating chart",
  body: [
  ["p","Dictionaries earn their keep modelling real things. Here a six-seat theatre is a dictionary whose keys are seat labels — row letter plus seat number, 'A1' through 'B3' — and whose values are the names of whoever booked them. A free seat is simply not in the dictionary, and get() with a '----' fallback lets one function draw the whole chart, gaps included."],
  ["code","seats = {'A1': 'Mira', 'A3': 'Omar', 'B2': 'Lena'}\n\ndef print_chart(booked):\n    for row in ['A', 'B']:\n        line = row\n        for num in ['1', '2', '3']:\n            line = line + ' [' + booked.get(row + num, '----') + ']'\n        print(line)\n\nprint_chart(seats)\nif 'B3' not in seats:\n    seats['B3'] = 'Kofi'\ndel seats['A3']\nprint_chart(seats)\nprint(str(len(seats)) + ' of 6 seats are booked')"],
  ["code","A [Mira] [----] [Omar]\nB [----] [Lena] [----]\nA [Mira] [----] [----]\nB [----] [Lena] [Kofi]\n3 of 6 seats are booked"],
  ["p","Every move is a dictionary operation from this chapter. Booking Kofi into B3 is one assignment, guarded by not in so an existing booking would not be silently overwritten. Cancelling Omar's seat is del. The chart function never looks at seat A2 directly — it builds each key from row + num and lets get() answer '----' for the empty ones. And len(seats) counts bookings, not seats: the free ones were never entries."],
  ["p","One more tool matters for programs like this: making a backup you can reset from. Plain assignment does not copy — as with lists in the last chapter, it gives one dictionary a second name. The copy module's copy.copy() function makes a genuinely independent dictionary."],
  ["code",">>> import copy\n>>> original = {'A1': 'Mira'}\n>>> alias = original\n>>> backup = copy.copy(original)\n>>> original['A2'] = 'Noor'\n>>> alias\n{'A1': 'Mira', 'A2': 'Noor'}\n>>> backup\n{'A1': 'Mira'}"],
  ["note","Saving the chart with backup = seats saves nothing: both names point at the one dictionary, and the backup mutates right along with the original — exactly what happened to alias above. When you need a separate copy to reset from, that is copy.copy(seats)."]
]},
{ t: "Nested dictionaries and lists",
  body: [
  ["p","Values can themselves be dictionaries or lists, and that is how flat pairs grow into structure. A hardware chain's stock fits in a dictionary of dictionaries: outer keys are branch names, and each inner dictionary maps an item to a count. A function that totals one item across branches loops over the outer values() and reads each inner dictionary with get(item, 0), so a branch that never stocked the item counts as zero instead of crashing."],
  ["code","def total_stock(branches, item):\n    total = 0\n    for shop in branches.values():\n        total = total + shop.get(item, 0)\n    return total\n\nbranches = {'north': {'hammer': 4, 'saw': 1},\n            'south': {'hammer': 2, 'drill': 6}}\nprint('hammers in stock: ' + str(total_stock(branches, 'hammer')))\nprint('saws in stock: ' + str(total_stock(branches, 'saw')))"],
  ["code","hammers in stock: 6\nsaws in stock: 1"],
  ["p","Lists nest just as well. A club roster maps each club name to a list of members, and the brackets chain: the first pair looks up a key, and the second indexes the list that came back."],
  ["code",">>> clubs = {'robotics': ['Ada', 'Lin'], 'drama': ['Omar']}\n>>> clubs['robotics'][1]\n'Lin'\n>>> len(clubs['drama'])\n1\n>>> clubs[1]\nKeyError: 1"],
  ["note","Read chained brackets left to right. clubs['robotics'][1] fetches the list first, then indexes into it. Reverse the order — clubs[1]['robotics'] — and the dictionary is asked for a key 1 straight away, so the whole expression dies on the KeyError above before the second bracket ever runs."]
]},
{ t: "Summary",
  body: [
  ["p","A dictionary stores key-value pairs: brackets fetch by key and raise KeyError when the key is absent, in and not in test keys, and get() and setdefault() are the soft versions — fetch with a fallback, store only when missing. keys(), values(), and items() feed loops, with items() delivering tuples you unpack in the for line. Equality ignores the order pairs were entered, printing follows it, and there are no positions — which is why [0] is a lookup, not a first item. Nest dictionaries and lists inside each other and you can model seating charts, branch stock, rosters — the shape of real data."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises below. The next chapter is strings and text editing — a closer look at the type most of your keys have been all along."]
]}
],
questions: [
{ q:"How is an empty dictionary written, and what does len() report for it?",
  a:"{} — braces with nothing between them, where an empty list is []. len({}) is 0, because len() counts key-value pairs." },
{ q:"bike = {'gears': 12}. What does bike['gears'] evaluate to, and what happens when you ask for bike['Gears']?",
  a:"12. bike['Gears'] raises KeyError: 'Gears' — keys match exactly, capitalisation included, so 'Gears' is simply a key the dictionary does not have." },
{ q:"['pen', 'ink'] == ['ink', 'pen'] is False, yet {'pen': 2, 'ink': 1} == {'ink': 1, 'pen': 2} is True. Why?",
  a:"Order is part of a list's value: same items, different positions, not equal. A dictionary has no positions, so == only asks whether the two hold the same key-value pairs — the order they were typed in is irrelevant." },
{ q:"In a for loop, what do keys(), values(), and items() each hand you — and what type does items() use for each entry?",
  a:"keys() hands you each key, values() each value, items() each whole pair — and items() delivers every pair as a tuple, like ('car', 3), which is why for k, v in tolls.items() unpacks into two names." },
{ q:"fees = {'locker': 2, 'towel': 1}. What do 2 in fees and 2 in fees.values() evaluate to, and why do they differ?",
  a:"False, then True. Bare in tests keys and only keys — no key is 2. The value 2 is only found when you point the test at fees.values()." },
{ q:"When 'sauna' is not a key of fees, what is the difference between fees['sauna'] and fees.get('sauna', 0)?",
  a:"fees['sauna'] raises KeyError: 'sauna' and stops the program. fees.get('sauna', 0) returns the fallback 0 and execution carries on — get() is the lookup for keys that might not be there." },
{ q:"profile already has 'theme' set to 'light'. What does profile.setdefault('theme', 'dark') return, and what is profile['theme'] afterward?",
  a:"It returns 'light', and profile['theme'] is still 'light'. setdefault() only stores its value when the key is missing; on an existing key it changes nothing and hands back what is already stored." },
{ q:"In the counting pattern, why must tally.setdefault(drink, 0) come before tally[drink] = tally[drink] + 1?",
  a:"The right-hand side has to read the current count before it can add 1, and for a first-seen drink that read raises KeyError. setdefault plants a 0 the first time each key appears, so the read always succeeds." },
{ q:"backup = seats versus backup = copy.copy(seats): which one gives you an independent copy, and what does the other do?",
  a:"copy.copy(seats) builds a new, independent dictionary. Plain assignment just gives the same dictionary a second name — change one and the other shows the change, because there is only one dictionary." },
{ q:"clubs = {'drama': ['Omar']}. What does each pair of brackets in clubs['drama'][0] do, and what does clubs[0] raise?",
  a:"The first is a key lookup that returns the list ['Omar']; the second indexes that list, giving 'Omar'. clubs[0] raises KeyError: 0 — on a dictionary, [0] hunts for a key 0, not a first item." }
],
exercises: [
{ c:"dicts", t:"The scoreboard", book:"ch07",
  b:"Given standings = {'Rovers': 11, 'United': 8, 'Wanderers': 5}, print one line per team, in the dictionary's order: the team name, then ' has ', then its points, then ' points'.",
  o:"Rovers has 11 points\nUnited has 8 points\nWanderers has 5 points",
  h:["items() hands a loop one key-value pair at a time.",
     "Put two names in the for line — for team, points in standings.items() — and each pair unpacks as it arrives.",
     "Loop with for team, points in standings.items(); inside, print the team, ' has ', the points, and ' points' joined with + — remembering str() around the number."]},
{ c:"dicts", t:"Off the menu", book:"ch07",
  b:"Given menu = {'espresso': 3, 'flat white': 5, 'mocha': 6} and orders = ['espresso', 'chai', 'mocha'], print one line per order: when the drink is on the menu, the name plus ' costs $' plus its price; otherwise 'no ' plus the name plus ' today'.",
  o:"espresso costs $3\nno chai today\nmocha costs $6",
  h:["Loop over the orders list. Each order produces one of two possible lines, which means an if and an else.",
     "drink in menu tests whether the drink is one of the keys — no .keys() needed. Inside the if, menu[drink] is safe because the test just passed.",
     "for drink in orders: when drink in menu, print the name, ' costs $', and str(menu[drink]) joined with +; otherwise print the no-line."]},
{ c:"dicts", t:"The bird tally", book:"ch07",
  b:"Given sightings = ['heron', 'gull', 'heron', 'tern', 'gull', 'heron'], build a dictionary that counts how many times each bird appears, then print the dictionary.",
  o:"{'heron': 3, 'gull': 2, 'tern': 1}",
  h:["Start from an empty dictionary and fill it as you loop — this is the counting pattern from the reading.",
     "You cannot add 1 to a count that does not exist yet. setdefault(bird, 0) plants the zero exactly once per bird.",
     "tally = {}; then for each bird: setdefault it to 0, then tally[bird] = tally[bird] + 1. Print tally once, after the loop ends."]},
{ c:"dicts", t:"Lockers at both sites", book:"ch07",
  b:"Given lockers = {'gym': {'small': 6, 'large': 2}, 'pool': {'small': 3, 'large': 5}}, add up the lockers across both sites and print two lines: 'small lockers: ' plus the total, then 'large lockers: ' plus the total.",
  o:"small lockers: 9\nlarge lockers: 7",
  h:["Each value in the outer dictionary is itself a dictionary — loop over lockers.values() to visit each site once.",
     "Keep two running totals, both starting at 0. At each site, the counts you need are site['small'] and site['large'].",
     "for site in lockers.values(): add site['small'] into one total and site['large'] into the other; after the loop, print both lines, wrapping each total in str()."]}
]
};
