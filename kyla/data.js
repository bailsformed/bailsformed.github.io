/* =====================================================================
   GREMLIN TOWN: content. Quests, grown-up missions, scripts, gremlin
   lines, shop, and Seraphine's compliments. Steps starting with "👪 "
   need a parent or grown-up. Senior year 2026–27 → freshman year 2027–28.
   ===================================================================== */

const GREMS = [
  {id:"gnorbert", name:"Gnorbert", col:"#8fd19a", belly:"#e3f9e3", acc:"glasses",
   role:"Head of Planning. Has a clipboard. The clipboard has a clipboard.",
   lines:["I have made a list. The list is color-coded. You're welcome.","We are not panicking. We are SCHEDULING.","Deadlines don't care about vibes. I do, though. A little.","One step. Then a snack. That's the whole system.","I put on my Serious Hat for you. It's the same hat. I'm just holding it seriously.","Rest is allowed. Quitting isn't. I wrote that down in pen."]},
  {id:"pickle", name:"Pickle", col:"#c6e35a", belly:"#f4ffd0", acc:"sprout",
   role:"Chaos department. Ate a stamp once. Still thinks about it.",
   lines:["i ate a stamp. was it important","can I apply to college too. I don't have a transcript but I have a rock","WHAT ARE WE DOING. I'M IN. what are we doing","I licked the Wi-Fi router. we're good now","i have been practicing backflips for when you do good. i am ready. i have never been more ready","is FAFSA a type of pasta"]},
  {id:"crumbs", name:"Sir Crumbs", col:"#c7b2ff", belly:"#f1ebff", acc:"tophat",
   role:"Court fanfic writer. Writes about you. Extremely dramatic.",
   lines:["Chapter 47: in which our heroine opens one (1) email and the crowd WEEPS.","I have tagged today's events as 'hurt/comfort' and 'competence kink for paperwork'. Kidding. Mostly.","Your arc is giving slow burn. The burn is college. It's going great.","Every protagonist has a training arc. This is yours. Very cinematic of you.","I've written 40,000 words about you finishing that one step. It's in editing."]},
  {id:"moth", name:"Moth", col:"#9fc4e8", belly:"#e8f3ff", acc:"nightcap",
   role:"Soft-days department. Sleepy. Good at hugs (small ones).",
   lines:["hi. you're doing okay. even if it doesn't feel like it.","drink some water? I'll wait. 💧","small steps still count as steps. I checked.","you don't have to feel ready. you just have to do the next tiny thing.","nobody figured this out alone. that's why we're here."]},
  {id:"beans", name:"Beans", col:"#ffb370", belly:"#fff0e0", acc:"visor",
   role:"Treasurer. Loves money. Loves you more. (Barely.)",
   lines:["money money money. jk. save some.","every paycheck goes in the jars FIRST. then we vibe.","your future self called. she wants you to save $20.","fun money is part of the budget. guilt-free spending is a feature, not a bug.","never pay to apply for a scholarship. that's a scam and I will bite it."]},
  {id:"gub", name:"Gub", col:"#ffa3c8", belly:"#ffe6f1", acc:"tongue",
   role:"Gub.",
   lines:["gub.","gub?","gub!!!","...gub. 💖","gub gub (he says you're doing great)"]},
];

const CHAPTERS = [
  {e:"✨", n:"Episode 0: The Awakening", when:"Right now", blurb:"Set up your base. Tiny stuff. Gremlins watching (supportively)."},
  {e:"🔍", n:"Arc 1: Recon", when:"Nov–Dec 2026", blurb:"Figure out what you want and find the schools that fit."},
  {e:"📝", n:"Arc 2: The Application Arc", when:"Dec 2026–Feb 2027", blurb:"Essay, activities, recommenders, SUBMIT."},
  {e:"💰", n:"Arc 3: The Money Arc", when:"NOW–Mar 2027 · the FAFSA is open", blurb:"Free money. Go get it. Some of it runs out first-come, first-served."},
  {e:"⚖️", n:"Arc 4: The Decision Arc", when:"Mar–May 1, 2027", blurb:"Decisions, aid offers, choosing your school."},
  {e:"🏋️", n:"Arc 5: Summer Training Arc", when:"May–Aug 2027", blurb:"The paperwork gauntlet before move-in. Don't vanish on us."},
  {e:"🎓", n:"Season 2: Freshman Year", when:"Aug 2027–May 2028", blurb:"You made it. Now we survive (and thrive, a little)."},
  {e:"🎮", n:"Adulting DLC", when:"Anytime · your job + real-life stuff", blurb:"Paychecks, bank accounts, taxes, and being a whole person."},
];

const QUESTS = [
 // ---- Episode 0
 {id:"q0a",ch:0,e:"👋",t:"Meet the Gremlin Committee",xp:40,
  why:"Bailey hired us. We were paid in snacks. We take this very seriously.",
  steps:["Tap every gremlin on the Home screen (they each have a Thing)","Peek at every tab once (just look, don't do anything)","Open ⚙️ and set your name, state, and favorite fandom"]},
 {id:"q0b",ch:0,e:"📧",t:"Make your Official Grown-Up Email",xp:60,
  why:"Colleges and scholarships will email you A LOT. A separate email keeps that stuff from getting buried under fandom newsletters.",
  steps:["Make a free email like firstname.lastname27@…","Turn on notifications for it on your phone","Save the password somewhere safe (a notes app with a lock works)"],
  tip:"No 'xXbugqueenXx'. Save that energy for your fanfic username."},
 {id:"q0c",ch:0,e:"🧭",t:"Find your School Counselor (a free real-life guide NPC)",xp:100,
  why:"Your counselor sends your transcript, can give you fee waivers, and knows the local scholarships. Helping you is literally their job. You are not bothering them.",
  steps:["Find out who your school counselor is (ask the front office)","Ask for a 15-minute meeting (copy the script in 🆘 Grown-ups)","Go, and ask the 5 questions in the tip below","Type what they said into your quest notes"],
  tip:"Ask: (1) Am I on track to graduate? (2) How do I get my transcript sent? (3) Do I qualify for application fee waivers? (4) Are there local scholarships? (5) What deadlines should I know about?"},
 {id:"q0d",ch:0,e:"🃏",t:"Pull your first College Card",xp:40,
  steps:["Open 🏫 Colleges","Add ANY school you're even 1% curious about (your local community college counts!)"]},

 // ---- Arc 1 Recon
 {id:"q1a",ch:1,e:"🔮",t:"The Vibe Check",xp:60,
  why:"Before picking schools, figure out what YOU want. 'I don't know' is a real answer. Write it down anyway.",
  steps:["Big school, small school, or no idea?","Close to home, a drive away, or far far away?","3 things you're even a little curious about studying","Live on campus, or at home?","Type your answers in the quest notes"],
  tip:"You do NOT need to know your major. Tons of college freshmen change theirs. 'Undecided' is a real option."},
 {id:"q1b",ch:1,e:"🛡️",t:"Build your Party (the College List)",xp:100,
  why:"Aim for 5–8 schools in a mix: a couple you'll almost surely get into AND can afford, a few that are a good match, and a dream school or two.",
  steps:["Browse schools on College Scorecard or BigFuture (links below)","Get 5–8 schools onto your College Cards","Include at least 2 'likely' schools (you'll almost surely get in AND can afford)","Add your state's public university","Add your local community college. It's a cheap, smart path, and you can transfer later."],
  links:[["College Scorecard","https://collegescorecard.ed.gov/"],["BigFuture","https://bigfuture.collegeboard.org/"]]},
 {id:"q1c",ch:1,e:"🧮",t:"Net Price Calculator side quest",xp:100,
  why:"The sticker price is a lie! Every college has a Net Price Calculator on its website that estimates what YOU would actually pay after free grant money. A $50k school can end up cheaper than a $20k one.",
  steps:["Search '[college name] net price calculator'","👪 Ask a parent for your family's rough yearly income (you'll need it for the calculator)","Fill it out for one college and put the estimate on its card","Do the rest of your College Cards"]},
 {id:"q1d",ch:1,e:"⏰",t:"Deadline scavenger hunt",xp:80,urgent:true,
  why:"Every school has its own deadline. Regular deadlines are usually Jan 1–Feb 1. Some state schools take applications on a rolling basis (earlier = better).",
  steps:["Find each college's application deadline (on its 'Apply' page)","Find out HOW you apply: Common App, the school's own website, or something else","Check if the SAT/ACT is required, optional, or not used at all","Put deadlines on your College Cards (Gnorbert will nag you as they get close)"]},
 {id:"q1e",ch:1,e:"🚌",t:"Go touring (in person or online)",xp:80,
  steps:["Pick 1–2 schools to tour","Take a virtual tour on the college's website (counts!)","👪 If you can, plan an in-person visit (you may need a ride)","Mark it toured on the College Card and rate the vibe"],
  tip:"At a tour, ask a real student: 'What do you wish you knew freshman year?' They will tell you everything."},

 // ---- Arc 2 Applications
 {id:"q2a",ch:2,e:"🗝️",t:"Make your Common App account",xp:80,
  why:"Hundreds of colleges use the Common App, so one application goes to many schools. If none of your schools use it, apply on their own websites and mark this done.",
  steps:["Make an account at commonapp.org using your grown-up email","Fill out the Profile section","👪 Fill out the Family section (you'll need your parents' basic info + education)","Add your colleges to 'My Colleges'","Check the fee waiver question in your Profile (if money is tight, you may qualify)"],
  links:[["Common App","https://www.commonapp.org/"]]},
 {id:"q2b",ch:2,e:"📊",t:"The Activities List (your stat sheet)",xp:100,
  why:"You get up to 10 activities. YOUR JOB COUNTS. Babysitting counts. Taking care of family counts. Running a fan account or writing fic can count as creative writing / social media.",
  steps:["Brain-dump everything you've done in high school: jobs, clubs, sports, family stuff, hobbies","For each one, write hours per week and weeks per year","Write 1 line for each, starting with an action word ('Trained new hires…', 'Wrote 80k-word…')","Put your job on it. Seriously. Colleges love a working student."]},
 {id:"q2c",ch:2,e:"✒️",t:"The Essay Arc",xp:200,
  why:"The Common App essay is up to 650 words. You write fanfic. You can write about yourself. It's just a fic where you're the main character.",
  steps:["Read the essay prompts (one is 'any topic you want')","Brain-dump 3 stories only you could tell (10 minutes, messy is fine)","Pick one and write a really ugly first draft (ugly is the point)","Get feedback from 1 person (English teacher, counselor, or Bailey)","Revise, then read it out loud to catch mistakes","Paste it into your application"],
  tip:"Show ONE real moment, don't list accomplishments. Funny is allowed. Weird is allowed. Being you is the whole point."},
 {id:"q2d",ch:2,e:"💌",t:"Recruit your Recommenders",xp:100,
  why:"Many schools want 1–2 letters from teachers. Ask at LEAST 3–4 weeks before your first deadline. Teachers get a lot of these requests.",
  steps:["Pick 1–2 teachers who know you (junior or senior year classes are best)","Ask in person or by email (copy the script in 🆘 Grown-ups)","Add them in the Common App / school portal so they get the upload link","Send a thank-you note after. They did you a real favor."]},
 {id:"q2e",ch:2,e:"📜",t:"Transcripts & test scores",xp:60,
  steps:["Ask your counselor to send your transcript to each college","If you took the SAT/ACT and your scores help you, send them","If a school is test-optional and you didn't do great, it's okay to skip it"]},
 {id:"q2f",ch:2,e:"🚀",t:"SUBMIT (the Boss Fight)",xp:250,
  steps:["Read through each application one last time","Pay the fee, or use your fee waiver","Hit submit 😱","Screenshot the confirmation","Mark it Applied on the College Card"]},
 {id:"q2g",ch:2,e:"🔔",t:"Check your Applicant Portals",xp:60,
  why:"After you apply, each college emails you a login to its applicant portal. Missing documents show up THERE, and so do decisions.",
  steps:["Find the portal email from each college (check spam!)","Make each portal login and save the passwords","Look for a 'missing items' checklist and fix anything that's there","Check your portals every week or two until decisions come out"]},

 // ---- Arc 3 Money
 {id:"q3a",ch:3,e:"🪪",t:"Make your StudentAid.gov account",xp:80,urgent:true,
  why:"The 2027–28 FAFSA is OPEN NOW. It's the form for free federal money (and most state and college money too). Some state and college aid is first-come, first-served, so earlier = more money.",
  steps:["Go to StudentAid.gov and make an account (you'll need your Social Security number)","Verify your email and phone","Save your username, password, and backup code somewhere safe"],
  links:[["Make an account","https://studentaid.gov/fsa-id/create-account/launch"]]},
 {id:"q3b",ch:3,e:"📣",t:"Summon the Parent (FAFSA edition)",xp:100,urgent:true,
  why:"If you're a dependent student (most seniors are), the FAFSA needs a parent's info too. Not having it doesn't mean you're stuck. See the 'No grown-up can help?' box in 🆘 Grown-ups.",
  steps:["👪 Send your parent the FAFSA text from 🆘 Grown-ups","👪 Parent makes their own StudentAid.gov account","👪 Parent finds their 2025 tax return (the 2027–28 FAFSA uses 2025 tax info)","Pick a day to do it together"]},
 {id:"q3c",ch:3,e:"📋",t:"Complete the FAFSA",xp:250,urgent:true,
  steps:["Log in at StudentAid.gov and start the 2027–28 FAFSA","Fill out your section","List every college on your cards (you can add up to 20)","Invite your parent as a 'contributor' (you need their name, birthday, SSN, and email)","👪 Parent fills out their part and signs","Submit! 🎉 Screenshot the confirmation"],
  tip:"If you can't get a parent's info (they're unsafe, gone, or refusing), DON'T just stop. The FAFSA has an option for that. Call a college's financial aid office and say 'I have unusual circumstances with my parents.' They'll help.",
  links:[["Start the FAFSA","https://studentaid.gov/h/apply-for-aid/fafsa"],["Aid Estimator","https://studentaid.gov/aid-estimator/"]]},
 {id:"q3d",ch:3,e:"🔎",t:"Read your FAFSA Submission Summary",xp:60,
  steps:["A few days after submitting, look for your FAFSA Submission Summary in email / StudentAid.gov","Find your Student Aid Index (SAI). A lower number = more aid.","Check if it says you may be eligible for a Pell Grant (free money!)","If anything says 'action required', do it or show your counselor"]},
 {id:"q3e",ch:3,e:"🏛️",t:"State aid quest",xp:80,
  why:"Most states have their own grants and scholarships. Some just use the FAFSA, some need their own application, and some deadlines are EARLY.",
  steps:["Look up your state's college grant (button in the tip below)","Check: does it need its own application, or just the FAFSA?","Write the state deadline in your quest notes"],
  state:true},
 {id:"q3f",ch:3,e:"🧾",t:"CSS Profile (only if you need it)",xp:60,
  steps:["Check if any of your colleges require the CSS Profile (mostly private colleges)","👪 If yes: fill it out at cssprofile.collegeboard.org with a parent (fee waivers exist)","If none of your schools require it, mark this done. You just skipped a boss. 😎"]},
 {id:"q3g",ch:3,e:"🏆",t:"Scholarship Hunt",xp:150,
  steps:["Ask your counselor for the local scholarship list (local ones = way less competition)","Check each college's scholarship page (some are automatic, some need an application)","Apply to 3 scholarships (reuse your essay!)","Remember: NEVER pay money to apply for or 'find' scholarships. That's a scam."]},

 // ---- Arc 4 Decisions
 {id:"q4a",ch:4,e:"📬",t:"Decision Day survival",xp:80,
  steps:["Check email and portals for decisions (mostly March–April)","Update each College Card: accepted / waitlisted / denied","Feel your feelings. A 'no' is a college's loss, and honestly kind of random. You only need one yes."]},
 {id:"q4b",ch:4,e:"⚖️",t:"Compare your financial aid offers",xp:150,
  why:"Grants & scholarships = free. Work-study = a campus job. Loans = you pay them back WITH interest. Parent PLUS loans = your parent's debt. Compare what you'd actually owe.",
  steps:["Find each school's aid offer in its portal","Add cost of attendance, grants, loans, and work-study to each College Card","Open ⚖️ Compare money in Colleges and look at what you'd still owe","👪 Talk it over: can savings + family + federal loans actually cover it?"]},
 {id:"q4c",ch:4,e:"🙋",t:"Ask for more aid (optional, but it works)",xp:80,
  steps:["If your top school costs too much, email or call its financial aid office","Ask politely if they'd review your aid (mention a better offer from another school if you have one)","👪 Send any updated parent info they ask for"]},
 {id:"q4d",ch:4,e:"👑",t:"Pick your school (by May 1)",xp:300,
  steps:["Choose your school 🎓","👪 Pay the enrollment deposit by the deadline (usually May 1). Ask about a deposit waiver if money is tight.","Mark it Committed on its College Card (watch what happens 👀)","Decline the other schools in their portals (it frees up spots for waitlisted kids)"]},

 // ---- Arc 5 Summer
 {id:"q5a",ch:5,e:"🛏️",t:"Housing & orientation",xp:80,
  steps:["Apply for housing (if living on campus). It's often first-come, first-served.","Answer the roommate questions honestly (yes, admit you're a night owl)","Sign up for orientation"]},
 {id:"q5b",ch:5,e:"🗂️",t:"The Paperwork Gauntlet",xp:150,
  steps:["Ask your high school to send your FINAL transcript to your college","👪 Get your immunization records and fill out the health forms","Take any placement tests the college asks for (math, language)","Accept your financial aid in the student portal","If you're taking federal loans: do Entrance Counseling + sign the MPN on StudentAid.gov"]},
 {id:"q5c",ch:5,e:"🛡️",t:"Summer Melt Shield",xp:100,
  why:"'Summer melt' is when students who got in never show up because they missed summer emails. Not you. Not on our watch.",
  steps:["Set up your college email and student portal","Check them every week all summer (set a phone reminder)","Write every deadline you see into your quest notes"]},
 {id:"q5d",ch:5,e:"🗓️",t:"Register for classes",xp:80,
  steps:["Meet with an advisor (often at orientation)","Register for classes at your assigned time","Screenshot your schedule"]},
 {id:"q5e",ch:5,e:"🧳",t:"Pack like a pro",xp:60,
  steps:["Find the college's 'what to bring' list","Text your roommate about who brings the mini fridge","Pack shower shoes, a surge protector, and a mini first-aid kit","Bring at least one comfort item (gremlin-shaped preferred)"]},

 // ---- Season 2 Freshman
 {id:"q6a",ch:6,e:"🗺️",t:"Week One Survival",xp:100,
  steps:["Find all your classrooms before day 1","Put EVERY due date from every syllabus into one calendar","Say hi to one person in each class","Find the dining hall AND the good snack spot"]},
 {id:"q6b",ch:6,e:"🚪",t:"Go to Office Hours once",xp:80,
  why:"Professors set aside office hours for students to just drop by. Students who go do better. Most never go. Be the main character.",
  steps:["Find your professors' office hours in the syllabus","Go once, even just to say hi","Ask one question"]},
 {id:"q6c",ch:6,e:"🧠",t:"Find your Help Spots",xp:100,
  steps:["Find the tutoring center and the writing center","Find the counseling center (free and totally normal to use)","Find Disability / Accessibility Services. ADHD can get you accommodations like extra test time or a quieter testing room.","Save all their info in your phone"]},
 {id:"q6d",ch:6,e:"🎭",t:"Join two clubs",xp:80,
  steps:["Go to the club fair","Join one club for fun (anime club, anyone?)","Join one that's for your future (major or career stuff)"]},
 {id:"q6e",ch:6,e:"🔁",t:"FAFSA again (every single year)",xp:100,
  steps:["The next FAFSA opens Oct 1. Fill it out again every year.","👪 You'll need parent info again","Keep your grades up. Aid usually requires 'Satisfactory Academic Progress'."]},
 {id:"q6f",ch:6,e:"📅",t:"Spring registration",xp:80,
  steps:["Meet your advisor","Register at your exact time slot (classes fill up!)","Know the add/drop and withdrawal deadlines"]},

 // ---- Adulting DLC
 {id:"s1",ch:7,e:"🧾",t:"New Job paperwork",xp:80,
  steps:["Fill out your W-4 (the tax form). Ask your manager or HR if it's confusing.","👪 Bring your I-9 documents (like your ID + Social Security card)","Set up direct deposit","Ask how you'll get your schedule and paystubs"]},
 {id:"s2",ch:7,e:"🔍",t:"Read your first paystub",xp:60,
  steps:["Find 'gross pay' (what you earned)","Find 'net pay' (what you actually got)","Find the taxes taken out (Social Security + Medicare is always 7.65%)","Log that paycheck in 🫘 Money"]},
 {id:"s3",ch:7,e:"🏦",t:"Open a bank account",xp:100,
  steps:["👪 Ask a parent to come with you (under 18 usually needs a parent on the account)","Bring your ID + Social Security number","Open a checking AND a savings account","Get the bank's app and turn on alerts"]},
 {id:"s4",ch:7,e:"🫙",t:"Set up your Bean Jars",xp:60,
  steps:["Put your pay and hours into 🫘 Money","Pick your jar percentages","Log one paycheck and watch Beans split it up"]},
 {id:"s5",ch:7,e:"🚨",t:"Oh No Fund: first $100",xp:100,
  why:"An emergency fund means a flat tire or a broken phone is a bad day, not a disaster.",
  steps:["Name your Oh No jar something funny","Get it to $100","Don't touch it for fun stuff (that's what the fun jar is for)"]},
 {id:"s6",ch:7,e:"💳",t:"Credit 101",xp:60,
  steps:["Learn: your credit score is your money reputation. Lenders and landlords check it.","Rule: if you ever get a credit card, pay the FULL balance every month","Watch out for credit card tables on campus with free stuff. It's bait. 🪤"]},
 {id:"s7",ch:7,e:"🧮",t:"File your first tax return",xp:120,
  why:"If taxes were taken out of your paychecks, you might get some back! You file between late January and April 15, 2027.",
  steps:["Wait for your W-2 from your job (it arrives by the end of January)","👪 Ask if your parents claim you as a dependent (they probably do, that's normal)","File for free with IRS Free File (link below)","Save a copy of everything"],
  links:[["IRS Free File","https://www.irs.gov/filing/irs-free-file-do-your-federal-taxes-for-free"]]},
 {id:"s8",ch:7,e:"🪪",t:"Your Important Documents",xp:80,
  steps:["👪 Find out where your Social Security card is (don't carry it in your wallet!)","👪 Find out where your birth certificate is","Get a state ID or driver's license","Know where your health insurance card info is"]},
 {id:"s9",ch:7,e:"📞",t:"Phone Call Boss",xp:80,
  why:"Phone calls are scary. Everyone secretly thinks so. Scripts make it way easier.",
  steps:["Pick an office you need to call (college, doctor, bank)","Use the call script in 🆘 Grown-ups","Survive it 🫡","Treat yourself"]},
 {id:"s10",ch:7,e:"🩺",t:"Book your own doctor's appointment",xp:80,
  steps:["👪 Get a photo of your health insurance card","Call or book online (you need one for college health forms anyway)","Go! Bring your list of questions"]},
];

// ---------- Grown-up missions ----------
const PARENT = [
 {id:"p_talk",e:"🗣️",t:"The 20-minute college talk",why:"Before anything else, it helps to know what your family can (or can't) help with. Any answer is okay, you just need to know so you can plan.",
  text:"Hey! Can we have a 20 min talk about college this week? I'm making a plan and I need to know a couple things: 1) is there any money our family can put toward college (it's totally ok if the answer is none, I just need to know for planning), and 2) can you help me with the FAFSA parent part? I made a list so it'll be quick 💛"},
 {id:"p_fafsa",e:"📋",t:"FAFSA parent part",why:"This is the big one. The FAFSA unlocks free grant money and needs a parent's info if you're a dependent student.",
  text:"Hi! I'm doing my FAFSA (the form that gets me free money for college). You need to do a part too. Here's what you need to do:\n1. Make an account at StudentAid.gov (takes ~10 min)\n2. Find your 2025 tax return\n3. I'll send you an invite from the FAFSA, then you fill out your section and sign (~30 min)\nThe sooner we do it, the more money there might be. Can we do it this week? Thank you!! 🙏"},
 {id:"p_css",e:"🧾",t:"CSS Profile (only if a school needs it)",why:"Some private colleges want this extra money form.",
  text:"Hey, one of the colleges I'm applying to needs something called the CSS Profile (it's like a second FAFSA for their own money). It needs your income info again. Can we do it together sometime this week?"},
 {id:"p_bank",e:"🏦",t:"Open a bank account with me",why:"Under 18, most banks need a parent on the account.",
  text:"Hey! Now that I'm working, I want to open my own checking + savings account so I can set up direct deposit and start saving for college. Since I'm under 18 the bank needs a parent with me. Can you come with me this week? It shouldn't take long."},
 {id:"p_docs",e:"🪪",t:"Find my important documents",why:"Jobs, colleges, and IDs all need these. You should know where they live.",
  text:"Hey, quick thing: where are my Social Security card, birth certificate, and shot records kept? My job and colleges keep asking, and I want to know where they are. (I won't carry them around, promise.)"},
 {id:"p_ins",e:"🩺",t:"Health insurance info",why:"Colleges ask for it, and so does every doctor's office.",
  text:"Can you send me a picture of the front and back of our health insurance card? Colleges ask for it and I should probably know my own info now that I'm almost an adult 😅"},
 {id:"p_tour",e:"🚗",t:"A ride to a college tour",why:"Tours help a lot, but you may need a ride.",
  text:"Would you be down to take me to tour [COLLEGE] on [DAY]? Tours are free and it'd really help me decide. I can look up the schedule. Road trip snacks on me (with my job money) 🍟"},
 {id:"p_deposit",e:"💵",t:"Paying the deposit",why:"Most schools want an enrollment deposit by May 1. Some can waive it.",
  text:"I got into [COLLEGE] and I want to commit!! 🎉 There's a $[AMOUNT] deposit due by [DATE]. Can we talk about how to pay it? I can put in some from my job savings, and I can ask the school about a waiver if we need one."},
 {id:"p_health",e:"💉",t:"Health forms & shots",why:"Colleges need immunization records and sometimes a physical.",
  text:"My college needs my immunization records and a health form filled out by a doctor. Do you know where my shot records are? And can we schedule a checkup this summer?"},
 {id:"p_tax",e:"🧮",t:"My first tax return",why:"You might get money back from your job!",
  text:"Hey! When I get my W-2 from work, can you help me file my first tax return? I might get some money back. Also, are you claiming me as a dependent this year? I need to check a box about it."},
];

const SCRIPTS = [
 {t:"📧 Email your counselor",text:"Subject: Meeting about college applications\n\nHi [Counselor's name],\n\nI'm a senior and I'm starting my college applications. Could I set up a 15-minute meeting with you this week or next? I want to make sure I'm on track and ask about fee waivers, scholarships, and getting my transcript sent.\n\nThank you!\n[Your name]"},
 {t:"💌 Ask a teacher for a recommendation",text:"Subject: Recommendation letter request\n\nHi [Teacher's name],\n\nI really enjoyed your [CLASS] class, and I'm applying to college this year. Would you be willing to write me a recommendation letter? My first deadline is [DATE]. I can send you a short list of things I've done and what I liked about your class to make it easier.\n\nThank you so much for considering it!\n[Your name]"},
 {t:"📞 Call a financial aid office",text:"\"Hi, my name is [NAME], I'm an incoming/prospective student. My date of birth is [DOB].\n\nI had a question about my financial aid: [YOUR QUESTION].\n\n(If they use a word you don't know, say: 'Sorry, I'm new to this. What does that mean?' They get asked that all the time.)\n\nThank you! Can I get your name in case I need to call back?\""},
 {t:"😰 Any scary phone call",text:"Before: write down your question + your info (name, birthday, student ID).\nStart: \"Hi! I'm calling because ___.\"\nIf you freeze: \"Sorry, let me check my notes.\" (Totally normal.)\nEnd: \"Thank you! Who did I speak with?\"\nAfter: tell a gremlin. You get snacks."},
];

const NOHELP = `<h3 style="margin-top:0">💜 No grown-up can help?</h3>
<p>That happens to a LOT of students. You are not stuck. Here's your backup crew:</p>
<ul>
<li><b>Your school counselor.</b> Helping you is their whole job. They can do fee waivers, transcripts, and scholarship lists, and they can help you through the FAFSA.</li>
<li><b>The college's financial aid office.</b> Call and say: <i>"I have unusual circumstances with my parents and I need help with my FAFSA."</i> If your parents are unsafe, gone, or you can't contact them, they can help you apply without parent info.</li>
<li><b>Free FAFSA help.</b> StudentAid.gov has a help center and phone line, and many schools and libraries run free FAFSA nights.</li>
<li><b>Fee waivers</b> exist for applications, the SAT/ACT, the CSS Profile, and often for deposits. Just ask: <i>"Do you have a fee waiver?"</i></li>
<li><b>Bailey.</b> Bailey literally built you a gremlin town. Text Bailey. 💌</li>
</ul>
<p class="muted small" style="margin-bottom:0">If a parent says "I don't want to give my info": your parents filling out the FAFSA does NOT make them pay for anything. It just tells the government what aid you can get. You can show them that.</p>`;

// ---------- levels ----------
const LV = [0,150,400,800,1300,2000,2800,3700,4800,6200];
const LV_NAMES = ["Background Character","Named NPC","Side Character With Lore","Main Character Energy","Training Arc Survivor","Power-Up Unlocked","Final Arc Protagonist","Isekai'd Into College","Season 2 Lead","Legendary Gremlin Queen 👑"];

// ---------- shop ----------
const HATS = [
 {id:"cat",n:"Cat ears",e:"🐱",cost:20},{id:"ninja",n:"Ninja headband",e:"🥷",cost:30},{id:"wizard",n:"Wizard hat",e:"🧙",cost:40},
 {id:"chef",n:"Chef hat",e:"👨‍🍳",cost:40},{id:"frog",n:"Frog hat",e:"🐸",cost:50},{id:"pirate",n:"Pirate hat",e:"🏴‍☠️",cost:50},
 {id:"bow",n:"Magical girl bow",e:"🎀",cost:60},{id:"crown",n:"Tiny crown",e:"👑",cost:80},{id:"halo",n:"Halo (unearned)",e:"😇",cost:70},
];
const TRICKS = [
 {id:"hop",n:"Group hop",e:"🐇",cost:0},{id:"flip",n:"Backflips",e:"🤸",cost:0},{id:"spin",n:"Spin attack",e:"🌀",cost:0},
 {id:"conga",n:"Conga line",e:"💃",cost:40},{id:"kazoo",n:"Kazoo concert",e:"🎺",cost:50},{id:"pyramid",n:"Gremlin pyramid",e:"🔺",cost:60},
 {id:"worm",n:"The Worm",e:"🪱",cost:70},{id:"cannon",n:"Human (gremlin) cannonball",e:"💥",cost:100},
];
const TRICK_CAPS = {
 hop:["The gremlins hopped. With feeling.","Group hop! Gub hopped a little late. Gub is fine.","They're hopping because you did a thing. That's how it works here."],
 flip:["Pickle did a backflip. He has never done a backflip before. He's shaking.","BACKFLIPS. Gnorbert's clipboard is on the roof now.","Everybody flipped. Moth flipped by accident but he's taking credit."],
 spin:["SPIN ATTACK. Nothing was attacked. Vibes were achieved.","They spun so hard Beans dropped three coins. Worth it.","Gub is still spinning. Someone stop Gub."],
 conga:["A conga line has broken out in your honor.","Conga! Sir Crumbs is narrating it like a nature documentary.","They conga'd across the whole screen. There's no stopping a conga."],
 kazoo:["🎺 A kazoo concert, performed in your honor. It is terrible. It's beautiful.","The Gremlin Philharmonic presents: 'You Did It (Kazoo Remix)'.","Every kazoo is a little off-key. That's intentional. (It's not.)"],
 pyramid:["GREMLIN PYRAMID. Gub is on top. Nobody knows how.","A pyramid in your honor. Structurally unsound. Emotionally sound.","Pyramid achieved. Pickle is on the bottom and he's 'fine'."],
 worm:["They're doing the worm. All of them. In order. It's horrible. ❤️","The Worm, performed by six worms (gremlins).","Sir Crumbs refused to do the worm, then did the best worm."],
 cannon:["PICKLE HAS BEEN FIRED FROM A CANNON IN YOUR HONOR. He asked to be.","💥 Cannonball! Pickle is fine. Pickle has never been better.","They built a cannon. Out of what? Don't ask. Pickle flew. You won."],
};

// ---------- Seraphine ----------
const HOT_LINES = [
 "Hey. You look so cute today. That's it. That's the visit.",
 "Sorry to interrupt. You look SO cute. Okay bye. 💋",
 "I was in the neighborhood. You look adorable. Ciao.",
 "Just wanted to say: cute. Very cute. Carry on.",
 "Did you drink water today? Doesn't matter, you look cute anyway. 💅",
 "Not to be dramatic, but you're the cutest person in this whole town.",
 "I came all this way to tell you that you look cute. Worth it. Bye.",
 "Your vibe today? Immaculate. Your outfit? Iconic. Me? Leaving. ✨",
 "Hi. Cute. Bye.",
 "The gremlins didn't send me. I came on my own to say you look cute.",
 "I'm only here for a second. Long enough to say you look cute.",
 "Cute AND productive? Okay, main character. 😘",
];
const HOT_EXITS = ["*leaves through a window*","*rides off on a motorcycle that wasn't there before*","*disappears in a cloud of rose petals*","*moonwalks away*","*hair-flips out of frame*","*leaves. the wind follows her.*"];
const HOT_REACT = [
 ["pickle","who WAS that"],["gub","gub... 😳"],["gnorbert","She's not on the schedule. I'm adding her to the schedule."],
 ["crumbs","I'm writing a 90k slow-burn about that interaction."],["moth","she's right though."],["beans","she didn't even pay rent here"],
 ["pickle","i think i'm in love. i also think i ate a battery"],["gnorbert","Okay. Back to work. She'd want that."],
];

// ---------- micro-steps for "smaller please" ----------
const SMALLER = [
 "Just open the website or tab for it. Don't do anything. Just open it. That's the whole quest.",
 "Set a 5-minute timer. Do the first 5 minutes only. You're allowed to stop after.",
 "Read the step out loud to a gremlin. (Gub is a great listener.)",
 "Type ONE sentence about it in the quest notes. Even 'ugh'. 'Ugh' counts.",
 "Find out where the thing lives (which website, which person). That's it.",
];

// ---------- fanfic pieces ----------
const FIC = {
 titles:["{n} and the Deadline of Doom","The FAFSA Was Mine All Along","Main Character Syndrome (Affectionate)","Six Gremlins and a Common App","It's Giving Protagonist","a girl, a job, and six (6) goblins","Slow Burn (The Burn Is Paperwork)","{n} vs. The Concept of Adulthood","My Dorm Room Has Gremlins and Other Lies","The One Where {n} Actually Did It","Enemies to Lovers (Me and My Inbox)","Isekai'd Into Senior Year"],
 tags:["Enemies to Lovers (with the FAFSA)","Slow Burn","Found Family","Hurt/Comfort","Fluff","Gremlins","Competence is Hot","Main Character Energy","Training Arc","Everyone Is Proud Of Her","Gub Has No Lines (Gub)","Seraphine Cameo","Deadline Angst","Happy Ending","Snack-Based Economy","Pickle Ate Something Again"],
 open:["The night was dark and full of deadlines.","It began, as all great sagas do, with {n} staring at a screen.","Somewhere in Gremlin Town, a legend was waking up.","Previously, on {n}'s Life:","{n} had not asked to be the main character. And yet."],
 done:["In a move critics are calling 'iconic', {n} completed {q}.","{q}? Done. The gremlins wept openly.","Sources confirm {n} did, in fact, {q}. Pickle fainted.","{n} looked {q} dead in the eye and said 'not today'. It was done by dinner.","The prophecy foretold that someone would conquer {q}. It was {n}. It was always {n}."],
 none:["{n} did nothing this week, and it was a deliberate creative choice. (Next chapter: she does one thing.)","This chapter is a filler episode. Every great anime has them. The plot resumes when {n} does one tiny step."],
 close:["To be continued… 👀","Sir Crumbs bows. Nobody claps. Gub claps.","Kudos: 6 (all gremlins). Comments: 'GUB.'","Next time: the arc gets HARDER, and so does {n}.","The end. (It's not the end. It's chapter one.)"],
};

// ---------- states (for state aid search) ----------
const STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","Puerto Rico","Other / not sure"];

const DEFAULT_JARS = [
 {id:"college",n:"College Fund",e:"🎓",pct:30,goal:1000,col:"#b8a1ff"},
 {id:"ohno",n:"Oh No Fund",e:"🚨",pct:15,goal:300,col:"#ff8fb8"},
 {id:"needs",n:"Needs (gas, phone, lunch)",e:"⛽",pct:25,goal:0,col:"#7fd8be"},
 {id:"fun",n:"Fun Money (no guilt!)",e:"🎀",pct:30,goal:0,col:"#ffe066"},
];

// Edit this letter to say whatever you want her to read. Use {n} for her name.
const LETTER = `{n},

I made you this because you deserve someone in your corner for all of this, and now you have me AND six gremlins.

You don't have to know where you're going yet. You just have to do the next tiny thing. Then the next one. That's literally how everyone does it, I promise.

Some days will be loud. On those days do one small thing, or do nothing and come back tomorrow. Just don't quit. You're way too funny and smart to let a form win.

I'm so proud of you already.

Love,
Bailey 💌`;
