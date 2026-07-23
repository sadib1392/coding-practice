/* Practice Log book — Chapter 20: Sending Email, Texts, and Push Notifications.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory.
   Blocks that would touch the network (ezgmail, smtplib, requests/ntfy) are shown
   without outputs on purpose — nothing in this chapter sends anything. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch20 = {
n: 20,
title: "Sending Email, Texts, and Push Notifications",
src: "https://automatetheboringstuff.com/3e/chapter20.html",
blurb: "Messages as text your code can build and parse — then Gmail's API, carrier SMS gateways, and ntfy push notifications to move them.",
sections: [
{ t: "How email travels",
  body: [
  ["p","When you send an email, it does not go to the recipient. It goes to a mail server, which relays it to the recipient's mail server, where it waits until they check. The handing-over is a protocol called SMTP — Simple Mail Transfer Protocol — and it only ever pushes mail toward a destination. Reading is a second protocol, IMAP: a client logs in to its own mailbox and fetches, searches, or deletes what has arrived. Two directions, two protocols."],
  ["p","Python's standard library speaks both, through the smtplib and imaplib modules, and for decades that was the whole story: connect to a server, log in with a password, hand over text. The big providers ended that story. Gmail — roughly a third of all mailboxes — treats a bare password login from a script as a break-in attempt and refuses it. The supported road into a Gmail account is Google's Gmail API, and this chapter drives it through EZGmail, a module the book's author wrote to wrap that API in ordinary function calls."],
  ["p","Email is also a bridge to other channels. This chapter ends with two of them: text messages sent through the email gateways that phone carriers run, and push notifications sent to your phone through ntfy, a free service that works over plain HTTP requests."],
  ["note","None of the sends in this chapter can run inside this app. Real messages need a desktop Python with extra modules installed, accounts you have created, and credential files that live on that machine — none of which exist here. Blocks that would touch the network are shown without output. The part that runs anywhere, including here, is the text itself — building and parsing messages — and that is exactly what the graded exercises drill."]
]},
{ t: "A message is text",
  body: [
  ["p","Strip away the transport and an email message is a piece of structured text: one line per header, each a label, a colon, and a value — then one empty line, then the body. You can build one with nothing but string concatenation:"],
  ["code","message = 'From: kavya@example.com\\nTo: renn@example.com'\nmessage = message + '\\nSubject: Practice log for July'\nmessage = message + '\\n\\nFifteen minutes today. Loops are starting to stick.'\nprint(message)"],
  ["code","From: kavya@example.com\nTo: renn@example.com\nSubject: Practice log for July\n\nFifteen minutes today. Loops are starting to stick."],
  ["p","The empty line is load-bearing. Mail software reads headers until the first blank line; everything after it is body, even if a body line happens to start with a word and a colon. The \\n\\n in the code above is that boundary."],
  ["p","The standard library has a class that builds this text for you and gets the details right: EmailMessage, from the email.message module. Headers are assigned like dictionary entries, the body goes in through set_content(), and printing the message serializes it back to wire text:"],
  ["code","from email.message import EmailMessage\nmsg = EmailMessage()\nmsg['From'] = 'kavya@example.com'\nmsg['To'] = 'renn@example.com'\nmsg['Subject'] = 'Practice log for July'\nmsg.set_content('Fifteen minutes today. Loops are starting to stick.')\nprint(msg)"],
  ["code","From: kavya@example.com\nTo: renn@example.com\nSubject: Practice log for July\nContent-Type: text/plain; charset=\"utf-8\"\nContent-Transfer-Encoding: 7bit\nMIME-Version: 1.0\n\nFifteen minutes today. Loops are starting to stick."],
  ["p","Your three headers came out exactly as you set them, in order, followed by three the class added: Content-Type, Content-Transfer-Encoding, and MIME-Version, the bookkeeping that lets modern mail carry accents, attachments, and multiple parts. Nothing else appears — the class does not invent a Date or a message ID on its own, so what you set is exactly what serializes. Reading fields back works like a dictionary too, with one difference worth noticing: a header you never set is None, not an error."],
  ["code",">>> msg['Subject']\n'Practice log for July'\n>>> msg['Reply-To'] is None\nTrue\n>>> msg.get_content()\n'Fifteen minutes today. Loops are starting to stick.\\n'"],
  ["p","set_content() made sure the body ends with a newline — the \\n at the end of the repr. Changing a header is the part that surprises people. Assignment adds a header; it never replaces one. Headers that may only appear once, like To, refuse the second copy outright:"],
  ["code",">>> msg['To'] = 'imani@example.com'\nValueError: There may be at most 1 To headers in a message\n>>> del msg['To']\n>>> msg['To'] = 'renn@example.com, imani@example.com'\n>>> msg['To']\n'renn@example.com, imani@example.com'"],
  ["note","msg['To'] = ... looks like updating a dictionary, and that is the mistake — assignment appends, it does not overwrite. Unique headers like To raise the ValueError above; repeatable ones such as Comments silently stack a duplicate instead, which is worse, because nothing tells you. When you mean replace, del the header first, then assign. Several recipients are one comma-separated string, as the last line shows."]
]},
{ t: "Sending through Gmail with EZGmail",
  body: [
  ["p","EZGmail needs a one-time setup before any code runs: a Gmail account for your scripts, then a visit to the Google Cloud console to create a project, enable the Gmail API for it, and approve the mail scope on the consent screen. The end state is two files sitting next to your script — a credentials file that identifies your project, and a token file recording that your account approved it. The book's appendix and the EZGmail documentation walk through the console clicks; the two files are the part that matters here."],
  ["code",">>> import ezgmail\n>>> ezgmail.init()"],
  ["p","init() reads those two files and authenticates. Silence is success — it returns without printing anything when the setup is right, and raises an exception when a file is missing or stale. After that, sending is a single call:"],
  ["code",">>> ezgmail.send('renn@example.com', 'Practice log for July', 'Fifteen minutes today. Loops are starting to stick.')"],
  ["p","Recipient, subject line, body — the same three pieces you assembled by hand in the last section, and on success the call simply returns with nothing to show. Attachments ride along as an optional fourth argument, a list of filenames, and the keyword arguments cc and bcc take copy recipients:"],
  ["code",">>> ezgmail.send('renn@example.com', 'July photos', 'Two from the lake.', ['dock.jpg', 'heron.jpg'])"],
  ["p","Gmail's server applies its own judgment to what you hand it. Send the same subject and body over and over and it may quietly stop delivering them, because repetition is the shape of spam. Attach a .exe or a .zip and it may refuse outright, because those are the shapes viruses arrive in."],
  ["note","Testing a send script by firing the identical message at yourself ten times is the mistake that trips this. Deliveries thin out, the script looks broken, and no error says why — Gmail is derating a sender that behaves like a spammer. Vary the text while testing, or better, do not send at all: the dry-run pattern in the next section."]
]},
{ t: "Credentials, ports, and what belongs in a script",
  body: [
  ["p","The older road — smtplib against a provider that still allows password logins — is worth seeing once, because every line of it teaches a habit. With msg the EmailMessage from earlier:"],
  ["code","import smtplib\nsmtp = smtplib.SMTP('smtp.example.com', 587)\nsmtp.starttls()\nsmtp.login('bot@example.com', app_password)\nsmtp.send_message(msg)\nsmtp.quit()"],
  ["p","Connect, upgrade, log in, hand over, hang up. Each call sends a command to the server and gets back a numbered reply — the 200s mean accepted — and each raises an exception when the server refuses, so a wrong password surfaces as SMTPAuthenticationError, not as a return code you forgot to check. No output is shown here because no server is being contacted."],
  ["p","Two details in that block carry most of the bugs. The port: 587 is the client submission port, and starttls() upgrades the connection to encryption before the password crosses the wire. Port 25 is for server-to-server relay, and home internet providers commonly block it — a script pointed at 25 stalls or is refused, with an error that never mentions ports. The recipients: send_message() reads them from the message's own headers, but the older sendmail() function takes them as a separate argument that must be a list of address strings — hand it one comma-joined string and it is treated as a single address."],
  ["p","Then there is app_password, the variable that is deliberately not a quoted string. A password pasted into a script stops being a secret the moment the file is copied, shared, or backed up somewhere you forgot about. Secrets belong outside the code — a small file the script reads at runtime, or an environment variable — and the OAuth files from the last section deserve the same respect, because they are the access: anyone holding your token file holds your mailbox until you revoke it from the account's security page."],
  ["p","Two more habits from the same family. Give your scripts their own account, so a bug spams a mailbox nobody loves. And before the first real run, replace the send call with a print and read what would have gone out:"],
  ["code","recipients = ['ana@example.com', 'bea@example.com', 'cole@example.com']\nsubject = 'March invoice attached'\nfor addr in recipients:\n    print('DRY RUN - would send to ' + addr + ': ' + subject)"],
  ["code","DRY RUN - would send to ana@example.com: March invoice attached\nDRY RUN - would send to bea@example.com: March invoice attached\nDRY RUN - would send to cole@example.com: March invoice attached"],
  ["note","The password hardcoded into the script is the mistake this section exists for. It works, which is the trap — until the file lands in a shared folder or a repository, and the mailbox goes with it. Keep secrets in files or variables the code reads at runtime, keep those files out of anything shared, and revoke tokens you cannot account for."]
]},
{ t: "Reading mail: threads, messages, and search",
  body: [
  ["p","Gmail groups replies into conversation threads, and EZGmail mirrors that. unread() returns a list of GmailThread objects for your unread conversations — the 25 most recent by default, more if you pass the maxResults keyword argument — and recent() does the same for the latest conversations regardless of read state. summary() prints a one-line digest of each thread in such a list:"],
  ["code",">>> unread = ezgmail.unread()\n>>> ezgmail.summary(unread)"],
  ["p","Neither call is shown with output because the results are your mailbox's contents. The shapes are fixed, though. A GmailThread is a container: its messages attribute is a list of GmailMessage objects, one per email in the conversation. The GmailMessage is where the substance lives — subject, body, timestamp, sender, and recipient are plain attributes, so unread[0].messages[0].subject is the first unread conversation's first message's subject string."],
  ["p","search() takes the same query language as the search box on the Gmail website and returns the same list-of-threads shape. Bare words match anywhere; operators narrow it: label:UNREAD for unread mail, from:kavya@example.com for a sender, subject:invoice for subject words, has:attachment for mail carrying files."],
  ["p","Attachments hang off the message. Its attachments attribute is a list of filenames, downloadAttachment() fetches one by name, and downloadAllAttachments() fetches all of them, returning the list of written filenames. Both accept a downloadFolder keyword argument naming the directory to write into:"],
  ["code",">>> results = ezgmail.search('subject:invoice has:attachment')\n>>> results[0].messages[0].downloadAllAttachments(downloadFolder='invoices')"],
  ["note","Downloads land in the current working directory by default, and an attachment named like a file you already have replaces that file without asking. Run an attachment loop from the wrong folder once and it quietly overwrites whatever shares a name. Pass downloadFolder and give downloads a directory of their own."]
]},
{ t: "Texts through an email gateway",
  body: [
  ["p","People stand nearer their phones than their inboxes, which is why a text often lands where an email waits. The cheapest way to send one from a program is not an SMS service at all: most phone carriers run an SMS email gateway, a mail server that accepts ordinary email addressed to a phone number at the carrier's gateway domain and re-sends the body as a text message to that phone. Sending a text becomes sending an email — to an address shaped like 8125550137@txt.examplemobile.com, the number in front, the carrier's gateway domain behind. The real domain for a given carrier turns up with a web search for the carrier's name plus sms email gateway, and every send in this chapter, EZGmail or smtplib, works unchanged with such an address."],
  ["p","Carriers usually run two gateways: an SMS one, which truncates around the traditional 160 characters, and an MMS one for longer messages and media — a photo goes as an attachment through the MMS gateway. You also need to know which carrier the number belongs to, which is exactly the catch: the gateway is per-carrier, and numbers move between carriers without changing digits."],
  ["p","The price of free is reliability. Delivery is not guaranteed and can lag by minutes or forever; nothing tells your program a message did not arrive; the recipient cannot reply to it; send too many and the gateway silently blocks you, with no published number for how many is too many; and a gateway that works today may be gone tomorrow. That makes gateways fine for the occasional non-urgent note to yourself, and wrong for anything that must arrive. Dependable or bulk texting is a paid product — telecom APIs such as Twilio — with subscriptions, sign-up review, and rules that differ by country."],
  ["note","The tempting mistake is wiring a gateway into something that matters — a server-down alert, say. The channel fails silently in both directions: the text may never arrive, and nothing tells your script it did not. For messages you need to trust, pay for an SMS API or use the push notifications below."]
]},
{ t: "Push notifications with ntfy",
  body: [
  ["p","ntfy.sh is a publish-subscribe notification service that runs over plain HTTP, which means the requests module from the web-scraping chapter is the only tool you need. The unit is a topic — a name you invent. Install the ntfy app on your phone, subscribe it to your topic, and from then on any program that makes a POST request to the topic's URL rings every subscriber within seconds:"],
  ["code",">>> import requests\n>>> requests.post('https://ntfy.sh/pl-drill-log-9f3kq', 'backup finished')"],
  ["p","requests.post() publishes; the requests.get() you know from scraping is for reading. The call returns a Response object whose repr shows the HTTP status — 200 for an accepted message, 403 when a paid, reserved topic refuses your post. No output is shown here because no request is being made."],
  ["p","The message string is the notification. Metadata rides in HTTP headers, passed as a dictionary to the headers keyword argument: Title is the subject-line analog, Priority runs '1' to '5' with 3 the default — higher does not deliver faster, it is a signal subscribers can filter on — and Tags are filter keywords, some of which display as small icons by the title:"],
  ["code","import requests\nrequests.post('https://ntfy.sh/pl-drill-log-9f3kq', '3 files skipped',\n    headers={'Title': 'backup report', 'Priority': '4', 'Tags': 'floppy_disk'})"],
  ["p","Free topics take about 250 messages a day, 4,096 bytes each, and within that the body is any text you like. The service records nothing about who posted — there are no senders, only the topic — so when provenance matters, put your own from and to labels inside the message, ideally as JSON."],
  ["p","Reading works over the same URL with /json and a poll parameter — give me what you have, then hang up:"],
  ["code",">>> resp = requests.get('https://ntfy.sh/pl-drill-log-9f3kq/json?poll=1')"],
  ["p","A since parameter narrows the window: since=10m for the last ten minutes (s, m, and h combine, as in 2h30m), since= an epoch timestamp — the seconds-since-1970 numbers time.time() produces — or since= a message id to resume after it. Join parameters with an ampersand: /json?poll=1&since=10m. Poll once a minute at most; the service also offers streaming for programs that need messages the moment they arrive."],
  ["p","What comes back is not one JSON value. It is one JSON object per line — a format called JSON Lines — and parsing it is pure standard library, which means this part runs right here. With a poll body hardcoded as a Python string:"],
  ["code","import json\npoll_text = '{\"id\":\"r7XkQ2ab\",\"time\":1786402100,\"event\":\"message\",\"topic\":\"pl-drill-log-9f3kq\",\"message\":\"backup finished\"}\\n{\"id\":\"c4NwT8pq\",\"time\":1786402220,\"event\":\"message\",\"topic\":\"pl-drill-log-9f3kq\",\"message\":\"3 files skipped\",\"title\":\"backup report\",\"priority\":4}'\nnotes = []\nfor line in poll_text.splitlines():\n    notes.append(json.loads(line))\nprint(len(notes))\nprint(notes[0]['message'])\nprint(notes[1]['title'])\nprint(notes[1]['priority'])\nprint(notes[0].get('priority', 3))"],
  ["code","2\nbackup finished\nbackup report\n4\n3"],
  ["p","splitlines() separates the objects, json.loads() turns each line into a dictionary, and from there it is chapter-seven material: id is unique per message, time and expires are epoch seconds, event is 'message' for the ones you care about, and your metadata arrives typed — priority as a number, absent when it was never set, which is why the last line reads it with .get() and the service's default of 3. Feeding the whole body to json.loads() in one call is the natural first attempt, and it fails on the second line:"],
  ["code",">>> json.loads(poll_text)\nJSONDecodeError: Extra data: line 2 column 1 (char 111)"],
  ["note","A topic named alerts or backup is the mistake here. ntfy topics are one public namespace with no passwords, so the name is the whole secret — a guessable one means strangers post into your notifications and read what your scripts publish. Generate one long random name, store it with your other secrets, and replace it if it ever leaks."]
]},
{ t: "Summary",
  body: [
  ["p","Under every library in this chapter is the same object: a message, which is text — header lines, a blank line, a body. EmailMessage builds that text correctly and reads it back like a dictionary, with assignment that appends rather than replaces. Transport is what varies. Gmail insists on its API: EZGmail wraps it, authenticates with a credentials file and a token file instead of a password in your code, sends with one call, and hands your mailbox back as threads of messages with subject, body, sender, and attachments as plain attributes, searchable in the Gmail search box's own language."],
  ["p","Beyond the inbox, a carrier's email gateway turns email into text messages — free, and silently unreliable, so it carries nothing that matters. ntfy turns an HTTP POST into a phone notification: the topic name is address and password at once, metadata travels in headers, and polling returns JSON Lines that splitlines() and json.loads() take apart. Around all of it, the habits: secrets live outside the script, test sends are dry runs, and a bot gets its own account."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises below — every one of them is the string work this chapter runs on. The next chapter is Making Graphs and Manipulating Images, where your programs stop writing messages and start producing charts and editing pictures."]
]}
],
questions: [
{ q:"Two protocols carry this chapter's mail. Which one moves a message toward the recipient's server, and which one lets a program read a mailbox it owns?",
  a:"SMTP is the sending side: your program hands the message to a mail server, and servers relay it toward the recipient's server. IMAP is the reading side: a client logs in to its own mailbox and fetches or searches what has arrived. Python's standard library speaks both, through smtplib and imaplib." },
{ q:"Python already ships smtplib. Why does this chapter drive Gmail through EZGmail instead?",
  a:"Gmail's security and anti-spam measures refuse a bare username-and-password login from a script, so the smtplib and imaplib route fails against it. EZGmail wraps the official Gmail API, which authenticates through OAuth files set up once — Gmail access without a password ever appearing in the code." },
{ q:"ezgmail.init() looks for two files next to your script. What are they, and what does each hold?",
  a:"A credentials file and a token file. The credentials file identifies your project — the thing created in the Google Cloud console when the Gmail API was enabled. The token file records that one specific account approved that project's access. Together they let init() authenticate with no password in the code." },
{ q:"After msg['Subject'] = 'Practice log for July', what does msg['Subject'] evaluate to — and what does msg['Reply-To'] evaluate to if it was never set?",
  a:"msg['Subject'] evaluates to the string 'Practice log for July'. A header that was never set is not an error: msg['Reply-To'] evaluates to None, which is why the chapter tests it with is None." },
{ q:"msg already has a To header, and you assign msg['To'] = 'imani@example.com' to change it. What actually happens, and what is the fix?",
  a:"Assignment adds a header, it never replaces one — and To may only appear once, so Python raises ValueError: There may be at most 1 To headers in a message. Delete first with del msg['To'], then assign the value you meant; several recipients go in one comma-separated string." },
{ q:"In EZGmail, what is the difference between a GmailThread and a GmailMessage, and which one carries subject, body, and sender?",
  a:"A GmailThread is a whole conversation; a GmailMessage is one email inside it. The thread's messages attribute is the list of its GmailMessage objects, and the message is what carries subject, body, timestamp, sender, and recipient as plain attributes." },
{ q:"What search string finds mail that carries attachments, and where else could you type the same string with the same meaning?",
  a:"'has:attachment', passed to ezgmail.search(). The same operators work typed into the search box on the Gmail website — search() shares its query language, including label:UNREAD, from:, and subject:." },
{ q:"Name three ways a text sent through an SMS email gateway can quietly fail you.",
  a:"Any three of: delivery is not guaranteed and can lag or never happen; nothing reports that a message failed to arrive; the recipient cannot reply; the gateway silently blocks senders who send too much, with no stated limit; and a gateway that works today may be gone tomorrow." },
{ q:"Nothing about a public ntfy topic asks for a password. What is the only thing protecting yours, and what follows from that?",
  a:"The topic name itself — anyone who knows it can post to it and read it. So the name must be long, random, and treated like a password: never a guessable word like alerts or test, never posted anywhere public, and replaced if it leaks." },
{ q:"resp.text from a ntfy poll holds two lines, each one a JSON object. Why does json.loads(resp.text) fail, and what is the working pattern?",
  a:"json.loads() parses exactly one JSON value, so the second line makes it raise JSONDecodeError: Extra data. The body is JSON Lines, not JSON: splitlines() it, call json.loads() on each line, and collect the resulting dictionaries." }
],
exercises: [
{ c:"strings", t:"Headers, blank line, body", book:"ch20",
  b:"Given sender = 'maria@example.com', recipient = 'devon@example.com', subject = 'Lunch on Thursday', and body = 'The cafe on 5th at noon.', print the message in wire shape: a From: line, a To: line, a Subject: line, one empty line, then the body.",
  o:"From: maria@example.com\nTo: devon@example.com\nSubject: Lunch on Thursday\n\nThe cafe on 5th at noon.",
  h:["Five prints, five lines: three labelled header lines, one empty line, then the body. print() with nothing between the parentheses prints the empty line.",
     "Each header line is a label glued to a variable: 'From: ' + sender, or an f-string. The empty line is the boundary that separates headers from body in a real message.",
     "print('From: ' + sender) and print('To: ' + recipient) are the first two lines; Subject follows the same shape, then print() alone, then the body."]},
{ c:"strings", t:"Pull out the headers", book:"ch20",
  b:"Given raw = 'From: keiko@example.com\\nTo: manager@example.com\\nSubject: Roof leak in unit 4B\\n\\nThe ceiling drips over the sink.', print only the value of the From header, then only the value of the Subject header, each on its own line.",
  o:"keiko@example.com\nRoof leak in unit 4B",
  h:["splitlines() turns the raw message into a list of lines you can loop over. Only two of those lines matter here.",
     "startswith() tells you whether a line is the header you want, and slicing cuts the label off the front — 'From: ' is 6 characters long, 'Subject: ' is 9.",
     "Loop over raw.splitlines(); when a line startswith('From: '), print line[6:]. The Subject line works the same way with its own label length."]},
{ c:"strings", t:"Address or not", book:"ch20",
  b:"Given candidates = ['mira@example.com', 'mira@@example.com', 'mira at example.com', 'ops@mail.example.org', 'sam@example'], print each address followed by ': ok' if it has exactly one @, no spaces, and a dot somewhere after the @ — otherwise followed by ': bad'.",
  o:"mira@example.com: ok\nmira@@example.com: bad\nmira at example.com: bad\nops@mail.example.org: ok\nsam@example: bad",
  h:["Three rules, and each one is a string test you already know. Run the same tests on every address in the list and print one verdict line per address.",
     "count('@') settles the first rule, the in operator finds a space, and partition('@') hands you the part after the @ so you can look for a dot in it.",
     "domain = addr.partition('@')[2]; the condition joins addr.count('@') == 1, a no-space test, and '.' in domain with and — then print addr plus ': ok' or ': bad'."]},
{ c:"strings", t:"Counting recipients", book:"ch20",
  b:"Given to_line = 'To: ana@example.com, bea@example.com, cole@example.com', print each address on its own line with surrounding spaces removed, then print 'Recipients: ' followed by the count.",
  o:"ana@example.com\nbea@example.com\ncole@example.com\nRecipients: 3",
  h:["Slice the 'To: ' label off the front first; after that, commas are what separate one address from the next.",
     "to_line[4:] drops the label, split(',') turns the rest into a list, and strip() removes the space that splitting leaves on the front of each piece.",
     "addresses = to_line[4:].split(','); loop and print addr.strip() for each, then build the last line from len(addresses) — str() turns the count into text you can add to 'Recipients: '."]}
]
};
