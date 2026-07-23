/* Practice Log book — Chapter 24: Text-to-Speech and Speech Recognition Engines.
   Original lesson text following the chapter-by-chapter curriculum of
   "Automate the Boring Stuff with Python" (3rd ed.) by Al Sweigart.
   Read the original chapter free at the src link below.
   Every shown output was captured by executing the code, not written from memory:
   the plain-Python snippets ran on desktop Python 3.14 (see tests/ch24_verify.py),
   and the graded exercises run on the built-in Python that ships with this app.
   Engine-invoking snippets (pyttsx3, whisper, yt-dlp) need audio hardware, system
   voices, model downloads, or a network, so they are shown without outputs. */
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.ch24 = {
n: 24,
title: "Text-to-Speech and Speech Recognition Engines",
src: "https://automatetheboringstuff.com/3e/chapter24.html",
blurb: "Making programs speak and listen — and the string work that makes either worth doing.",
sections: [
{ t: "Machines that speak and listen",
  body: [
  ["p","Speech runs in two directions. A text-to-speech engine — TTS — takes a string and produces audio: a script can announce that the backup finished while you are across the room. A speech recognition engine — STT, speech to text — takes audio and produces a string: an hour of meeting becomes text you can search, quote, and feed to every tool from the earlier chapters. Both directions turn speech into something a program can hold, which is the whole reason they belong in an automation book."],
  ["p","Both directions also fail, and they fail silently. A TTS engine reads exactly the string it is given, by its own pronunciation rules — hand it your calendar shorthand and it will say something, just not what you meant. A recognition engine writes its best guess at what it heard: homophones, names, and jargon come back as different words, spelled cleanly, with no error raised. Wrong audio plays fine and wrong text reads fine. The checking, in both directions, is your program's job — and it is ordinary string work."],
  ["note","The engines in this chapter need a desktop Python with speakers and a microphone, system voices, and often a network connection or a large one-time model download. None of that exists inside this app, so the engine snippets here are for reading and are shown without outputs. The graded exercises at the bottom practice the text side — preparing text for speaking and processing recognized transcripts — with built-in Python, and those run and grade here as usual."]
]},
{ t: "Offline engines and cloud engines",
  body: [
  ["p","Speech engines come in two families. Offline engines run entirely on your machine: pyttsx3 speaks by driving the synthesizer your operating system already ships — SAPI 5 on Windows, NSSpeechSynthesizer on macOS, eSpeak on Linux — and Whisper recognizes speech with a model file it downloads once and then uses locally. Offline means private, free per use, and indifferent to whether the wifi is up."],
  ["p","The costs are real. pyttsx3 sounds like the operating system talking: flat and robotic — fine for an alert, wrong for anything a person must listen to for ten minutes. Local recognition is the opposite problem: Whisper's transcripts are genuinely good, but the model files run from under a hundred megabytes to a few gigabytes, and transcription on an ordinary CPU can take as long as the recording itself, sometimes longer."],
  ["p","Cloud engines — the speech APIs from the big providers — flip every one of those properties. The voices are close to human and the recognition is fast at any scale, but your audio and text leave the machine, nothing works without a network, every request is billed, and the API can change under a script that ran fine last month. The honest decision rule: offline when the words just need to be spoken or captured, cloud when the voice itself is the product."],
  ["note","The mistake on each side is the same one: judging by first contact. pyttsx3's default voice undersells what TTS can do, so people dismiss the offline option in a minute; a metered cloud engine wired into a script that runs every minute quietly turns a toy into a bill. Match the engine to the job, not to the demo."]
]},
{ t: "Making a program speak",
  body: [
  ["p","pyttsx3 is a third-party package for a desktop Python — you install it by running pip install pyttsx3 in a terminal. pyttsx3.init() connects to the operating system's synthesizer and returns an engine object; everything else is method calls on that engine."],
  ["code","import pyttsx3\n\nengine = pyttsx3.init()\nengine.say('The backup finished with three errors.')\nengine.runAndWait()"],
  ["p","This program prints nothing — its output is sound from the speakers. say() does not speak; it only adds the string to a queue. runAndWait() plays through the queue and blocks until the audio finishes. That split is the first stumble with pyttsx3: a script that calls say() three times and ends produces silence, because it exits with the queue never played."],
  ["p","The engine has properties you read with getProperty() and change with setProperty(): rate is the speaking speed in words per minute, volume runs from 0.0 to 1.0, and voice selects from the voices installed on the machine. The voices list is different on every operating system and every machine, so inspect engine.getProperty('voices') yourself rather than copying a voice id from someone else's code."],
  ["code","engine.setProperty('rate', 150)\nengine.setProperty('volume', 0.8)\nvoices = engine.getProperty('voices')\nengine.setProperty('voice', voices[0].id)"],
  ["p","save_to_file() takes the same text but writes the audio to a WAV file instead of playing it — useful when the speaking happens later or on another device. It queues the work exactly like say(), so it still needs runAndWait() to actually run, and the file lands in the script's working directory."],
  ["code","engine.save_to_file('Meeting moved to two thirty.', 'reminder.wav')\nengine.runAndWait()"],
  ["note","The mistake that makes TTS sound broken is feeding it raw shorthand. engine.say('Dentist appt Mon, 2 hrs') hands the engine strings it has no reading for — appt, hrs — and it will pronounce them by its own rules, not yours. The engine is not going to learn your abbreviations; your program expands them first, and the section on preparing text below is exactly that job."]
]},
{ t: "Recognizing speech",
  body: [
  ["p","Whisper is an open speech recognition model from OpenAI that runs on your own machine: pip install openai-whisper in a terminal. It also needs ffmpeg, a separate non-Python program, installed on the system to read audio files. The first call to load_model() downloads the model file once and caches it; after that, recognition is fully local — no audio leaves the machine. Models come in sizes — tiny, base, small, medium, large — and the trade is uniform: each step up is more accurate, a bigger download, more memory, and a longer wait."],
  ["code","import whisper\n\nmodel = whisper.load_model('base')\nresult = model.transcribe('standup.wav')\nprint(result['text'])"],
  ["p","No output is shown for this block because there is none to promise: what prints depends entirely on the recording and the machine. What the shapes look like is fixed, though. transcribe() returns a dictionary: result['text'] is the whole transcript as one string, and result['segments'] is a list of dictionaries, each holding a start time, an end time (both in seconds), and the text heard between them. On an ordinary laptop CPU, budget roughly the length of the recording to transcribe it, and more for the bigger models."],
  ["p","Accuracy is good and its failures are predictable. One clear speaker using everyday vocabulary transcribes almost cleanly. Names, project jargon, people talking over each other, and accents far from the training data come back as confident wrong guesses — real words, correctly spelled, that were never said. Punctuation is inferred, not heard. The engine never flags a word as uncertain; the transcript gives you no visual difference between what it heard and what it invented."],
  ["note","The mistake is treating the transcript as a record instead of a draft. Recognition errors look typed — a misheard name or number arrives cleanly spelled, raises no error, and reads as fact to everyone downstream. Read the transcript against your memory of the audio before it goes into minutes, an email, or another program."]
]},
{ t: "Subtitles and downloaded audio",
  body: [
  ["p","A segment holds a start time, an end time, and the words in between — which is precisely what a subtitle is. The common subtitle format, SRT, is plain text: numbered entries, a time range with millisecond commas, the text, and a blank line between entries. The sample below is written by hand to show the shape; it is not engine output."],
  ["code","1\n00:00:00,000 --> 00:00:03,500\nWelcome back to the workshop\n\n2\n00:00:03,500 --> 00:00:08,000\ntoday we are wiring the sensor"],
  ["p","You could format that yourself from result['segments'] — it is string work you know — but Whisper ships writers that do it. get_writer() takes a format name and an output directory and returns a function; call it with the result and the audio filename and the subtitle file appears next to your script, ready for any video player. Ask for 'vtt' instead of 'srt' to get the web-native format."],
  ["code","from whisper.utils import get_writer\n\nwriter = get_writer('srt', '.')\nwriter(result, 'standup.wav')"],
  ["p","The recording itself often starts life as an online video. yt-dlp is a third-party downloader: give it a URL and options — 'format': 'bestaudio/best' asks for the audio track — and it saves the media to disk, ready for transcribe(). One boundary before the loop closes: many sites' terms forbid downloading, so keep this for your own recordings and material you have permission to keep. Video in, audio out, transcript out of that, subtitles out of that — each arrow is one call."],
  ["code","import yt_dlp\n\noptions = {'format': 'bestaudio/best'}\nwith yt_dlp.YoutubeDL(options) as ydl:\n    ydl.download(['https://example.com/talks/soldering-basics'])"]
]},
{ t: "Preparing text for speech",
  body: [
  ["p","Everything an engine speaks passes through a string first, and that string is yours to fix. This is where the chapter turns back into code you can run anywhere, this app included: dictionaries from chapter 7 and string methods from chapter 8 are the whole toolkit. Start with the shorthand problem from the note above. An expansion table maps each abbreviation to its spoken form, and the dictionary method get(word, word) makes the swap in one call — the second argument is what comes back on a miss, so unknown words pass through untouched."],
  ["code","expansions = {'Mon': 'Monday', 'Feb': 'February', 'hrs': 'hours', 'appt': 'appointment'}\nreminder = 'Dentist appt Mon Feb 9, allow 2 hrs'\nspoken = []\nfor word in reminder.split():\n    spoken.append(expansions.get(word, word))\nprint(' '.join(spoken))"],
  ["code","Dentist appointment Monday February 9, allow 2 hours"],
  ["p","Now watch the same table miss. Punctuation glued to a word changes the key: 'hrs.' with a period is a different string from 'hrs', the lookup fails, and get() quietly hands back the unexpanded shorthand."],
  ["code",">>> expansions.get('hrs', 'hrs')\n'hours'\n>>> expansions.get('hrs.', 'hrs.')\n'hrs.'"],
  ["p","No error, no warning — the abbreviation just sails through to the speaker. Either put the punctuated forms in the table too, or strip punctuation from each word before looking it up. The second text job is length. Speech hardware and speech APIs often cap how much text they take per call, and listeners lose long unbroken sentences anyway, so text gets split into chunks under a limit — without ever breaking a word. The rule: grow a line while the next word still fits, start a new line when it does not."],
  ["code","def chunks(text, cap):\n    pieces = []\n    line = ''\n    for word in text.split():\n        if line == '':\n            line = word\n        elif len(line) + 1 + len(word) <= cap:\n            line = line + ' ' + word\n        else:\n            pieces.append(line)\n            line = word\n    if line != '':\n        pieces.append(line)\n    return pieces\n\nnotice = 'The garage door code changes on the first Monday of every month'\nfor piece in chunks(notice, 24):\n    print(len(piece), piece)"],
  ["code","20 The garage door code\n20 changes on the first\n21 Monday of every month"],
  ["note","The tempting shortcut is slicing: text[0:24], text[24:48], and so on. That meets the cap and breaks words at every cut — the twenty-fourth character lands mid-word more often than not. A length cap on speakable text has to be enforced word by word, which is why the function grows a line one word at a time and only measures before adding."]
]},
{ t: "Working with transcripts",
  body: [
  ["p","Whatever the engine, what comes back is a string and a list of dictionaries — chapter 7 and chapter 8 material again. The data below is written by hand in the shape transcribe() returns (the same two entries as the subtitle sample earlier), so everything in this section runs right here. First, the segments: each is a dictionary, so timing questions are one subtraction away."],
  ["code","segments = [\n    {'start': 0.0, 'end': 3.5, 'text': 'Welcome back to the workshop'},\n    {'start': 3.5, 'end': 8.0, 'text': 'today we are wiring the sensor'},\n]\nfor seg in segments:\n    print(seg['end'] - seg['start'], 'seconds:', seg['text'])"],
  ["code","3.5 seconds: Welcome back to the workshop\n4.5 seconds: today we are wiring the sensor"],
  ["p","A transcript plus a duration answers a question speakers actually ask: how fast was that? Words per minute is the word count — len(transcript.split()), never len(transcript), which counts characters — times 60, divided by the seconds. Conversational pace sits near 150; rehearsed talks aim a little lower."],
  ["code","transcript = ('thanks everyone for joining today we have three items '\n              'on the agenda the budget the hiring plan and the office move')\nseconds = 9\nwords = len(transcript.split())\nprint(words, 'words in', seconds, 'seconds')\nprint('pace:', round(words * 60 / seconds), 'wpm')"],
  ["code","21 words in 9 seconds\npace: 140 wpm"],
  ["p","Recognition engines also faithfully write down the noises between the words — um, uh, er — which nobody wants in the written version. Cleaning them is a filter: keep each word unless its lowercase form is on the cut list. The lowercase step matters, because the filler that starts a sentence arrives capitalized."],
  ["code","fillers = {'um', 'uh', 'er'}\nraw = 'um so the er projector uh cable went um missing again'\nkept = []\nfor word in raw.split():\n    if word.lower() not in fillers:\n        kept.append(word)\nprint(' '.join(kept))\nprint('cut', len(raw.split()) - len(kept), 'filler words')"],
  ["code","so the projector cable went missing again\ncut 4 filler words"],
  ["note","The over-eager version of that filter adds 'so', 'well', 'like', and 'right' to the cut list — and starts deleting words people meant, because every one of them does real work in some sentences. Keep the list to pure noises, and reread the cleaned text the same way you reread the transcript it came from."]
]},
{ t: "Summary",
  body: [
  ["p","Text-to-speech turns strings into audio; speech recognition turns audio back into strings. Offline engines — pyttsx3 on the operating system's own voices, Whisper on a locally cached model — are private and free per use, at the price of flat voices and heavy compute; cloud engines sound better and scale, at the price of privacy, a network dependency, and a meter. With pyttsx3, say() queues and runAndWait() speaks, properties set rate, volume, and voice, and save_to_file() writes a WAV instead of playing. Whisper's transcribe() returns a dictionary — the full text plus timed segments, which are one writer call away from being subtitles. On both sides of any engine sits plain Python: expanding shorthand before it is spoken, capping chunk lengths without breaking words, and measuring or cleaning what came back. The engines are replaceable; the string work is yours and transfers to all of them."],
  ["p","Answer the practice questions from memory before revealing the answers, then clear the graded exercises below. This is the final chapter, so there is no next one to point to — what remains is consolidation. The concept ladder on the practice tab drills the ideas every one of these chapters was built from, and the book tab shows which chapters still have graded exercises you have not passed; go back and clear those before adding anything new. A program you can still write a month after the chapter that taught it is the measure that matters, and the ledger will tell you honestly."]
]}
],
questions: [
{ q:"A reminder app is about to speak the string 'Dr. Okafor, appt Mon, 2 hrs'. What will a text-to-speech engine do with the shorthand, and whose job is the fix?",
  a:"The engine reads exactly the string it is given, by its own pronunciation rules — it has no reading for appt or hrs that matches what you meant, so the shorthand comes out wrong. Expanding the text before the engine sees it is your program's job: a dictionary of spoken forms and a word-by-word pass." },
{ q:"A pyttsx3 script calls engine.say() three times and then ends. Nothing plays. What is missing?",
  a:"engine.runAndWait(). say() only queues text; runAndWait() plays through the queue and blocks until the audio finishes. Without it the script exits with the queue never played." },
{ q:"Name one thing you give up by choosing an offline engine, and one thing you give up by choosing a cloud engine.",
  a:"Offline gives up polish and ease: pyttsx3 speaks in the operating system's flat voices, and local recognition costs disk, memory, and CPU time. Cloud gives up privacy, independence, and a fixed cost of zero: audio and text leave the machine, nothing works without a network, and every request is billed." },
{ q:"What changes as Whisper models grow from tiny to large?",
  a:"Accuracy rises, and so does every cost: a bigger one-time download, more memory, and longer transcription time on the same machine. tiny is fast and rough; large is slow and strong. The trade is uniform, so the right size is the smallest one whose transcripts you can live with." },
{ q:"What does model.transcribe('standup.wav') return, and where do subtitles come from in it?",
  a:"A dictionary. result['text'] is the whole transcript as one string; result['segments'] is a list of dictionaries, each with a start time, an end time, and the text heard between them — exactly the three things a subtitle entry needs, which is what get_writer('srt', '.') formats." },
{ q:"Why should you read a transcript before pasting it into meeting minutes?",
  a:"Because recognition errors look typed. The engine writes its best guess — misheard names and numbers arrive as real words, cleanly spelled, with no error raised and nothing marking them as uncertain. A transcript is a draft to check against your memory of the audio, not a record." },
{ q:"The expansion table is {'hrs': 'hours'}. What does expansions.get('hrs.', 'hrs.') return, and why?",
  a:"'hrs.' — unchanged. The key 'hrs.' with the period is a different string from 'hrs', so the lookup misses and get() falls back to its second argument, the word itself. Punctuation glued to a word silently defeats a word-by-word table; strip it first or add the punctuated forms as keys." },
{ q:"For t = 'to be or not to be', what do len(t) and len(t.split()) each measure?",
  a:"len(t) counts characters — 18 here, spaces included. len(t.split()) counts words — 6. A words-per-minute figure has to be built on the second; built on the first, the pace comes out absurdly high and the bug shows no error." },
{ q:"What does '  um   so  '.split() evaluate to, and why does that matter for word counts?",
  a:"['um', 'so']. With no argument, split() treats any run of whitespace as a single separator and ignores leading and trailing space, so messy spacing never produces empty strings — word counts stay honest even when the text is ragged." },
{ q:"Why do this chapter's graded exercises use only built-in Python instead of the engines?",
  a:"The engines need what this app does not have: speakers and microphones, system voices, model downloads, a network. The text on both sides of an engine — what you feed it and what it hands back — is ordinary string and dictionary work, and that part runs and grades here like any other chapter." }
],
exercises: [
{ c:"dicts", t:"Say it in full", book:"ch24",
  b:"A reminder is about to be read aloud. Given expansions = {'Dr.': 'Doctor', 'Ave.': 'Avenue', 'appt.': 'appointment'} and text = 'Your appt. with Dr. Okafor is on Maple Ave.', build the spoken version: replace each word that appears in the table with its spoken form, keep every other word, and print the result as one line.",
  o:"Your appointment with Doctor Okafor is on Maple Avenue",
  h:["Work word by word: text.split() hands you the words, and each word is either in the table or it is not.",
     "expansions.get(word, word) covers both cases in one call — the spoken form when the word is a key, the word itself when it is not.",
     "Collect expansions.get(word, word) into a list as you loop, then print(' '.join(that_list)). Check which words are keys here — the periods are part of them."]},
{ c:"strings", t:"Twenty characters at a time", book:"ch24",
  b:"A small speech module accepts at most 20 characters per call. Given text = 'Please collect your parcel from the front desk before noon', print it as chunks, one per line: add words to the current chunk while it stays within 20 characters counting the single spaces between words, start a new chunk when the next word would not fit, and never break a word. Print the final chunk too.",
  o:"Please collect your\nparcel from the\nfront desk before\nnoon",
  h:["Grow a line one word at a time; the only decision each word forces is whether it still fits.",
     "The fit test is len(line) + 1 + len(word) <= 20 — the + 1 is the space you would insert. The first word of a line goes in without a test.",
     "Loop over text.split() keeping a line string: extend it while the next word fits, print it and restart with that word when it does not. When the loop ends, one line has not been printed yet."]},
{ c:"functions", t:"The pace check", book:"ch24",
  b:"Rehearsal check. Write a function pace(transcript, seconds) that returns the words-per-minute as a whole number: the word count times 60, divided by seconds, rounded with round(). With transcript = 'the fire alarm test scheduled for friday morning has moved to monday afternoon instead' and seconds = 6, print the word pace: then the result then wpm, separated by single spaces, in one line.",
  o:"pace: 140 wpm",
  h:["Count words with len(transcript.split()), never len(transcript) — one counts words, the other counts characters.",
     "Words per minute is the word count times 60 divided by the seconds; round() turns the float into the whole number. The function returns the number — the print stays outside.",
     "The return line is round(words * 60 / seconds) with words built from split. Call the function inside print('pace:', ..., 'wpm')."]},
{ c:"strings", t:"Strike the fillers", book:"ch24",
  b:"A transcript came back padded with fillers. Given raw = 'Um the uh delivery got um pushed to uh Thursday', remove every word whose lowercase form is 'um' or 'uh' and print the cleaned line. Then print cut: followed by a space and the number of words you removed.",
  o:"the delivery got pushed to Thursday\ncut: 4",
  h:["Split, keep only the words that are not fillers, then join what is left with spaces.",
     "The first filler is 'Um' with a capital U — compare word.lower(), or it slips through the check.",
     "Build a kept list from the words whose lowercase form is not in ('um', 'uh'); the cleaned line is ' '.join(kept), and the count is the original word count minus len(kept)."]}
]
};
