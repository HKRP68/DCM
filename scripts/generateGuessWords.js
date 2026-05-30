const fs = require('fs');
const path = require('path');

const cricketWords = {
  "Players": [
    "Virat Kohli", "Sachin Tendulkar", "MS Dhoni", "Rohit Sharma", "Steve Smith", "Kane Williamson", "Joe Root", "Babar Azam", "Ricky Ponting", "AB de Villiers",
    "Chris Gayle", "Shane Warne", "Muttiah Muralitharan", "Jasprit Bumrah", "Pat Cummins", "Mitchell Starc", "Trent Boult", "Rashid Khan", "Ben Stokes", "Hardik Pandya",
    "Ravindra Jadeja", "Kumar Sangakkara", "Brian Lara", "Jacques Kallis", "Glenn Maxwell", "David Warner", "Quinton de Kock", "Kagiso Rabada", "Anrich Nortje", "Mohammed Shami",
    "Kuldeep Yadav", "Yuzvendra Chahal", "Shikhar Dhawan", "KL Rahul", "Rishabh Pant", "Sanju Samson", "Shreyas Iyer", "Suryakumar Yadav", "Deepak Chahar", "Shardul Thakur",
    "Ravichandran Ashwin", "Cheteshwar Pujara", "Ajinkya Rahane", "Ishant Sharma", "Umesh Yadav", "Hanuma Vihari", "Mayank Agarwal", "Prithvi Shaw", "Shubman Gill", "Ishan Kishan",
    "Venkatesh Iyer", "Devdutt Padikkal", "Ruturaj Gaikwad", "Avesh Khan", "Arshdeep Singh", "Umran Malik", "Washington Sundar", "Axar Patel", "Harshal Patel", "Rahul Chahar",
    "Varun Chakravarthy", "Nicholas Pooran", "Shimron Hetmyer", "Jason Holder", "Andre Russell", "Sunil Narine", "Kieron Pollard", "Dwayne Bravo", "Shai Hope", "Alzarri Joseph",
    "Evin Lewis", "Brandon King", "Kyle Mayers", "Rovman Powell", "Odean Smith", "Romario Shepherd", "Akeal Hosein", "Hayden Walsh", "Fabian Allen", "Sherfane Rutherford",
    "Jos Buttler", "Jonny Bairstow", "Liam Livingstone", "Moeen Ali", "Sam Curran", "Jofra Archer", "Mark Wood", "Adil Rashid", "Chris Woakes", "Dawid Malan",
    "Jason Roy", "Eoin Morgan", "Harry Brook", "Will Jacks", "Phil Salt", "Reece Topley", "David Willey", "Tom Curran", "Chris Jordan", "Saqib Mahmood",
    "Glenn McGrath", "Shane Watson", "Adam Gilchrist", "Matthew Hayden", "Brett Lee", "Michael Hussey", "Andrew Symonds", "Mitchell Johnson", "Josh Hazlewood", "Nathan Lyon",
    "Marcus Stoinis", "Mitchell Marsh", "Cameron Green", "Travis Head", "Tim David", "Marnus Labuschagne", "Alex Carey", "Usman Khawaja", "Steve Waugh", "Mark Waugh",
    "Wasim Akram", "Waqar Younis", "Inzamam-ul-Haq", "Shoaib Akhtar", "Shahid Afridi", "Mohammad Rizwan", "Shaheen Afridi", "Naseem Shah", "Haris Rauf", "Shadab Khan",
    "Fakhar Zaman", "Imam-ul-Haq", "Iftikhar Ahmed", "Mohammad Nawaz", "Imad Wasim", "Hasan Ali", "Asif Ali", "Khushdil Shah", "Shan Masood", "Azhar Ali",
    "Brendon McCullum", "Ross Taylor", "Martin Guptill", "Tim Southee", "Daryl Mitchell", "Devon Conway", "Glenn Phillips", "Mitchell Santner", "Ish Sodhi", "Lockie Ferguson",
    "Matt Henry", "James Neesham", "Colin de Grandhomme", "Finn Allen", "Michael Bracewell", "Tom Latham", "Kyle Jamieson", "Neil Wagner", "Stephen Fleming", "Daniel Vettori",
    "Hashim Amla", "Dale Steyn", "Faf du Plessis", "David Miller", "Temba Bavuma", "Aiden Markram", "Rassie van der Dussen", "Marco Jansen", "Keshav Maharaj", "Lungi Ngidi",
    "Tabraiz Shamsi", "Wayne Parnell", "Dwaine Pretorius", "Heinrich Klaasen", "Graeme Smith", "Jacques Rudolph", "Morne Morkel", "Mark Boucher", "Shaun Pollock", "Lance Klusener",
    "Mahela Jayawardene", "Sanath Jayasuriya", "Lasith Malinga", "Wanindu Hasaranga", "Dasun Shanaka", "Kusal Mendis", "Pathum Nissanka", "Charith Asalanka", "Bhanuka Rajapaksa", "Dhananjaya de Silva",
    "Chamika Karunaratne", "Dushmantha Chameera", "Maheesh Theekshana", "Lahiru Kumara", "Dilshan Madushanka", "Matheesha Pathirana", "Angelo Mathews", "Dinesh Chandimal", "Kusal Perera", "Dimuth Karunaratne",
    "Shakib Al Hasan", "Tamim Iqbal", "Mushfiqur Rahim", "Mahmudullah", "Litton Das", "Mehidy Hasan Miraz", "Taskin Ahmed", "Mustafizur Rahman", "Ebadot Hossain", "Shoriful Islam",
    "Najmul Hossain Shanto", "Towhid Hridoy", "Afif Hossain", "Nurul Hasan", "Nasum Ahmed", "Taijul Islam", "Mashrafe Mortaza", "Abdur Razzak", "Mohammad Ashraful", "Habibul Bashar",
    "Rashid Khan", "Mohammad Nabi", "Mujeeb Ur Rahman", "Rahmanullah Gurbaz", "Ibrahim Zadran", "Najibullah Zadran", "Gulbadin Naib", "Azmatullah Omarzai", "Fazalhaq Farooqi", "Naveen-ul-Haq",
    "Noor Ahmad", "Qais Ahmad", "Hashmatullah Shahidi", "Rahmat Shah", "Asghar Afghan", "Dawlat Zadran", "Shapoor Zadran", "Hamid Hassan", "Samiullah Shinwari", "Javed Ahmadi"
  ],
  "Teams & Leagues": [
    "India", "Australia", "England", "Pakistan", "South Africa", "New Zealand", "West Indies", "Sri Lanka", "Bangladesh", "Afghanistan",
    "Netherlands", "Ireland", "Scotland", "Zimbabwe", "Namibia", "UAE", "Nepal", "Oman", "USA", "Canada",
    "Indian Premier League", "Big Bash League", "Pakistan Super League", "Caribbean Premier League", "Bangladesh Premier League", "Lanka Premier League", "SA20", "Major League Cricket", "The Hundred", "Vitality Blast",
    "Mumbai Indians", "Chennai Super Kings", "Royal Challengers Bangalore", "Kolkata Knight Riders", "Gujarat Titans", "Lucknow Super Giants", "Rajasthan Royals", "Delhi Capitals", "Punjab Kings", "Sunrisers Hyderabad",
    "Perth Scorchers", "Sydney Sixers", "Sydney Thunder", "Brisbane Heat", "Adelaide Strikers", "Melbourne Stars", "Melbourne Renegades", "Hobart Hurricanes",
    "Lahore Qalandars", "Multan Sultans", "Islamabad United", "Peshawar Zalmi", "Karachi Kings", "Quetta Gladiators",
    "Barbados Royals", "Guyana Amazon Warriors", "Jamaica Tallawahs", "St Kitts and Nevis Patriots", "Trinbago Knight Riders", "Saint Lucia Kings",
    "Comilla Victorians", "Sylhet Strikers", "Fortune Barishal", "Rangpur Riders", "Dhaka Dominators", "Chattogram Challengers",
    "Jaffna Kings", "Galle Gladiators", "Colombo Strikers", "Dambulla Aura", "B-Love Kandy",
    "Pretoria Capitals", "Sunrisers Eastern Cape", "Paarl Royals", "Joburg Super Kings", "MI Cape Town", "Durban Super Giants",
    "Oval Invincibles", "London Spirit", "Trent Rockets", "Southern Brave", "Manchester Originals", "Northern Superchargers", "Birmingham Phoenix", "Welsh Fire",
    "Texas Super Kings", "MI New York", "San Francisco Unicorns", "Seattle Orcas", "Washington Freedom", "Los Angeles Knight Riders"
  ],
  "Stadiums": [
    "Wankhede Stadium", "Eden Gardens", "Narendra Modi Stadium", "M Chinnaswamy Stadium", "MA Chidambaram Stadium", "Arun Jaitley Stadium", "HPCA Stadium", "Rajiv Gandhi International Stadium", "MCA Stadium", "Holkar Stadium",
    "Lords", "The Oval", "Old Trafford", "Edgbaston", "Headingley", "Trent Bridge", "The Rose Bowl", "Sophia Gardens", "Riverside Ground", "County Ground",
    "Melbourne Cricket Ground", "Sydney Cricket Ground", "Adelaide Oval", "The Gabba", "Optus Stadium", "Bellerive Oval", "Manuka Oval", "WACA Ground", "Metricon Stadium", "Marvel Stadium",
    "Eden Park", "Hagley Oval", "Basin Reserve", "Seddon Park", "Bay Oval", "McLean Park", "University Oval", "Saxton Oval", "Cobham Oval", "Bert Sutcliffe Oval",
    "Newlands", "Centurion Park", "Wanderers Stadium", "Kingsmead", "St Georges Park", "Boland Park", "Buffalo Park", "Mangaung Oval", "Senwes Park", "Diamond Oval",
    "Gaddafi Stadium", "National Stadium Karachi", "Multan Cricket Stadium", "Rawalpindi Cricket Stadium", "Arbab Niaz Stadium", "Iqbal Stadium", "Bugti Stadium", "Niaz Stadium", "Sheikhupura Stadium", "Sargodha Stadium",
    "Sher-e-Bangla Stadium", "Zohur Ahmed Chowdhury Stadium", "Sylhet International Stadium", "Khan Shaheb Osman Ali Stadium", "Sheikh Abu Naser Stadium", "Fatullah Osmani Stadium", "Shaheed Chandu Stadium", "Bir Shrestha Shahid Stadium",
    "R Premadasa Stadium", "Pallekele International Stadium", "Mahinda Rajapaksa Stadium", "Galle International Stadium", "Sinhalese Sports Club", "Colombo Cricket Club", "Tyronne Fernando Stadium", "Rangiri Dambulla Stadium",
    "Kensington Oval", "Queen's Park Oval", "Sabina Park", "Daren Sammy Stadium", "Sir Vivian Richards Stadium", "Providence Stadium", "Warner Park", "Windsor Park", "Arnos Vale Stadium", "National Cricket Stadium Grenada"
  ],
  "Cricketing Terms": [
    "Cover Drive", "Pull Shot", "Hook Shot", "Square Cut", "Sweep Shot", "Reverse Sweep", "Switch Hit", "Scoop Shot", "Upper Cut", "Straight Drive",
    "Yorker", "Bouncer", "Slower Ball", "Inswinger", "Outswinger", "Leg Cutter", "Off Cutter", "Knuckle Ball", "Googly", "Doosra",
    "Top Spinner", "Flipper", "Carrom Ball", "Slider", "Arm Ball", "Teaser", "Leg Break", "Off Break", "Chinaman", "Drifter",
    "Powerplay", "Super Over", "Free Hit", "Dead Ball", "Wide Ball", "No Ball", "Byes", "Leg Byes", "Overthrows", "Penalty Runs",
    "Duckworth Lewis Stern", "Decision Review System", "UltraEdge", "HawkEye", "Snickometer", "Hot Spot", "Third Umpire", "Match Referee", "Square Leg Umpire", "Soft Signal",
    "Hat-trick", "Five-wicket haul", "Double Century", "Triple Century", "Maiden Over", "Wicket-maiden", "Golden Duck", "Diamond Duck", "King Pair", "Nervous Nineties",
    "Slip Cordon", "Gully", "Point", "Cover", "Mid-off", "Mid-on", "Mid-wicket", "Square Leg", "Fine Leg", "Third Man",
    "Deep Point", "Deep Cover", "Long-off", "Long-on", "Deep Mid-wicket", "Deep Square Leg", "Deep Fine Leg", "Backward Point", "Extra Cover", "Silly Mid-off",
    "Silly Mid-on", "Short Leg", "Leg Gully", "Cow Corner", "V", "Corridor of Uncertainty", "Sticky Wicket", "Bodyline", "Bazball", "Mankading"
  ],
  "Variations & Equipment": [
    "Pink Ball", "White Ball", "Red Ball", "Duke Ball", "Kookaburra Ball", "SG Ball", "Heavy Ball", "Tennis Ball", "Rubber Ball", "Tape Ball",
    "Cricket Bat", "Batting Pads", "Batting Gloves", "Helmet", "Thigh Guard", "Chest Guard", "Arm Guard", "Abdominal Guard", "Spiked Shoes", "Sunscreen",
    "Stumps", "Bails", "Zing Bails", "Sight Screen", "Boundary Rope", "Pitch Cover", "Super Sopper", "Heavy Roller", "Light Roller", "Cricket Bag",
    "English Willow", "Kashmir Willow", "Bat Grip", "Bat Oil", "Toe Guard", "Sweatband", "Floppy Hat", "Baggy Green", "Cap", "Jersey",
    "Chest Protector", "Internal Thigh Guard", "Wicketkeeping Gloves", "Wicketkeeping Pads", "Inners", "Elbow Guard", "Mouthguard", "Sunglasses", "Base Layer", "Compression Sleeves"
  ]
};

// Generate a flattened list and expand to 1000 if needed by adding more categories or specific players
// For now, I'll combine these and ensure we have a solid base.
// I will also add more players and terms to reach 1000.

const additionalPlayers = [
    "Saurav Ganguly", "Rahul Dravid", "VVS Laxman", "Javagal Srinath", "Anil Kumble", "Harbhajan Singh", "Zaheer Khan", "Virender Sehwag", "Gautam Gambhir", "Yuvraj Singh",
    "Mohammad Kaif", "Irfan Pathan", "S Sreesanth", "Munaf Patel", "Ravi Shastri", "Sunil Gavaskar", "Kapil Dev", "Mohinder Amarnath", "Dilip Vengsarkar", "Kris Srikkanth",
    "Courtney Walsh", "Curtly Ambrose", "Joel Garner", "Malcolm Marshall", "Michael Holding", "Andy Roberts", "Viv Richards", "Clive Lloyd", "Desmond Haynes", "Gordon Greenidge",
    "Jeff Thomson", "Dennis Lillee", "Ray Lindwall", "Keith Miller", "Don Bradman", "Victor Trumper", "Clarrie Grimmett", "Bill O'Reilly", "Richie Benaud", "Ian Chappell",
    "Greg Chappell", "Allan Border", "David Boon", "Steve Waugh", "Ian Healy", "Mark Taylor", "Justin Langer", "Jason Gillespie", "Damien Martyn", "Michael Bevan",
    "Richard Hadlee", "Martin Crowe", "Glenn Turner", "Bert Sutcliffe", "Chris Cairns", "Nathan Astle", "Stephen Fleming", "Shane Bond", "Brendon McCullum", "Ross Taylor",
    "Imran Khan", "Javed Miandad", "Hanif Mohammad", "Zaheer Abbas", "Abdul Qadir", "Saqlain Mushtaq", "Mushtaq Ahmed", "Fazal Mahmood", "Sarfaraz Ahmed", "Younis Khan",
    "Misbah-ul-Haq", "Saeed Anwar", "Aamir Sohail", "Inzamam-ul-Haq", "Mohammad Yousuf", "Shoaib Malik", "Azhar Mahmood", "Abdul Razzaq", "Moin Khan", "Rashid Latif",
    "Graeme Pollock", "Barry Richards", "Allan Donald", "Shaun Pollock", "Makhaya Ntini", "Gary Kirsten", "Hansie Cronje", "Jonty Rhodes", "Herschelle Gibbs", "Lance Klusener"
];

const expandedWords = [
    ...cricketWords.Players,
    ...additionalPlayers,
    ...cricketWords["Teams & Leagues"],
    ...cricketWords.Stadiums,
    ...cricketWords["Cricketing Terms"],
    ...cricketWords["Variations & Equipment"]
];

// Add more generic cricket related words to reach 1000
const genericWords = [
    "Cricket", "Match", "Innings", "Over", "Ball", "Run", "Wicket", "Bowled", "Caught", "Stumped", "Run Out", "LBW", "Hit Wicket", "Timed Out", "Obstructing the Field",
    "Double Hit", "Handled the Ball", "Boundary", "Four", "Six", "Single", "Double", "Triple", "Dot Ball", "Maiden", "Century", "Fifty", "Averaging", "Strike Rate", "Economy Rate",
    "Batting", "Bowling", "Fielding", "Wicketkeeping", "Captain", "Vice Captain", "Coach", "Manager", "Physio", "Umpire", "Referee", "Scorer", "Commentator", "Analyst", "Groundsman",
    "Toss", "Bat First", "Bowl First", "Decision", "DRS", "Review", "Referral", "Spike", "Noise", "Edge", "Nick", "Glance", "Flick", "Paddle", "Late Cut", "Steer",
    "Drive", "Loft", "Charge", "Dancing down the track", "Clean Bowled", "Castle", "Bamboozled", "Outfoxed", "Trapped", "Plumb", "In the zone", "Nervous", "Pressure", "Flow", "Momentum",
    "Test Match", "One Day International", "T20 International", "First Class", "List A", "T10", "T20", "Hundred", "Ashers", "Border Gavaskar Trophy", "Chappell Hadlee Trophy", "Trans Tasman",
    "World Cup", "Champions Trophy", "Asia Cup", "World Test Championship", "Under 19 World Cup", "Women's World Cup", "IPL", "BBL", "PSL", "CPL", "BPL", "LPL", "SA20", "ILT20",
    "Powerplay", "Slog Overs", "Middle Overs", "Opening Spell", "Death Bowling", "Spin", "Pace", "Swing", "Seam", "Reverse Swing", "New Ball", "Old Ball", "Dew", "Floodlights",
    "Follow on", "Declaration", "Lunch", "Tea", "Stumps", "Day Night", "Pink Ball Test", "Draw", "Tie", "Washout", "Abandoned", "Reserve Day", "Super Over", "Bowl Out", "Toss win",
    "Coin", "Heads", "Tails", "Bat", "Handle", "Shoulder", "Toe", "Edge", "Grip", "Stance", "Backlift", "Follow through", "Crease", "Poping crease", "Bowling crease", "Return crease",
    "Pitch", "Wicket", "Turf", "Green Top", "Dust Bowl", "Flat Track", "Road", "Belter", "Slow Pitch", "Low Bounce", "Uneven Bounce", "Crack", "Patch", "Rough", "Footmarks",
    "Pavilion", "Dressing Room", "Dugout", "Stands", "Terrace", "Grass Bank", "Screen", "Scoreboard", "Jumbotron", "Floodlight Pylon", "Boundary Line", "Rope", "Marker", "Gully", "Slip",
    "Leg Slip", "Short Leg", "Silly Point", "Forward Short Leg", "Backward Short Leg", "Bat Pad", "Close in", "Catching", "Direct Hit", "Throw", "Return", "Backup", "Shine", "Saliva", "Sweat",
    "Ball Tampering", "Mint", "Sandpaper", "Bodyline", "Mankad", "Spirit of Cricket", "Fair Play", "Aggression", "Sledging", "Banter", "Celebration", "Send off", "Angry", "Frustrated", "Joy",
    "Legend", "Icon", "GOAT", "Master", "Wall", "Universe Boss", "Boom Boom", "Rawalpindi Express", "Sultan of Swing", "King of Spin", "Punter", "Gilly", "Haydos", "Freddie", "Beefy"
];

const allWords = Array.from(new Set([...expandedWords, ...genericWords]));

// If still less than 1000, we add more players from different eras and countries
const morePlayers = [
    "David Gower", "Graham Gooch", "Geoffrey Boycott", "Ian Botham", "Bob Willis", "Fred Trueman", "Brian Statham", "Jim Laker", "Frank Woolley", "Jack Hobbs",
    "Wally Hammond", "Herbert Sutcliffe", "Len Hutton", "Denis Compton", "Alec Stewart", "Nasser Hussain", "Michael Vaughan", "Andrew Flintoff", "Kevin Pietersen", "Alastair Cook",
    "Graeme Swann", "James Anderson", "Stuart Broad", "Ben Stokes", "Joe Root", "Jos Buttler", "Jonny Bairstow", "Jason Roy", "Eoin Morgan", "Paul Collingwood",
    "Allan Donald", "Shaun Pollock", "Dale Steyn", "Makhaya Ntini", "Morne Morkel", "Kagiso Rabada", "Anrich Nortje", "Lungi Ngidi", "Tabraiz Shamsi", "Keshav Maharaj",
    "Mark Boucher", "Quinton de Kock", "AB de Villiers", "Hashim Amla", "Jacques Kallis", "Graeme Smith", "Faf du Plessis", "David Miller", "Lance Klusener", "Hansie Cronje",
    "Gary Kirsten", "Herschelle Gibbs", "Jonty Rhodes", "Daryll Cullinan", "Pat Symcox", "Paul Adams", "Nicky Boje", "Andrew Hudson", "Brian McMillan", "Dave Richardson",
    "Stephen Fleming", "Brendon McCullum", "Ross Taylor", "Martin Guptill", "Kane Williamson", "Daniel Vettori", "Shane Bond", "Tim Southee", "Trent Boult", "Mitchell Santner",
    "Chris Cairns", "Nathan Astle", "Scott Styris", "Jacob Oram", "Kyle Mills", "Jeetan Patel", "Mark Richardson", "Matthew Sinclair", "Craig McMillan", "Dion Nash",
    "Wasim Akram", "Waqar Younis", "Shoaib Akhtar", "Saqlain Mushtaq", "Mushtaq Ahmed", "Abdul Qadir", "Imran Khan", "Javed Miandad", "Hanif Mohammad", "Zaheer Abbas",
    "Saeed Anwar", "Aamir Sohail", "Inzamam-ul-Haq", "Mohammad Yousuf", "Younis Khan", "Misbah-ul-Haq", "Shahid Afridi", "Abdul Razzaq", "Azhar Mahmood", "Moin Khan",
    "Rashid Latif", "Shoaib Malik", "Mohammad Hafeez", "Kamran Akmal", "Umar Akmal", "Babar Azam", "Mohammad Rizwan", "Shaheen Afridi", "Naseem Shah", "Haris Rauf",
    "Sanath Jayasuriya", "Marvan Atapattu", "Mahela Jayawardene", "Kumar Sangakkara", "Aravinda de Silva", "Arjuna Ranatunga", "Roshan Mahanama", "Hashan Tillakaratne", "Romesh Kaluwitharana", "Chaminda Vaas",
    "Muttiah Muralitharan", "Lasith Malinga", "Nuwan Kulasekara", "Rangana Herath", "Angelo Mathews", "Dinesh Chandimal", "Kusal Perera", "Dimuth Karunaratne", "Wanindu Hasaranga", "Dasun Shanaka",
    "Viv Richards", "Brian Lara", "Chris Gayle", "Shivnarine Chanderpaul", "Desmond Haynes", "Gordon Greenidge", "Clive Lloyd", "Richie Richardson", "Carl Hooper", "Ramnaresh Sarwan",
    "Courtney Walsh", "Curtly Ambrose", "Joel Garner", "Michael Holding", "Malcolm Marshall", "Andy Roberts", "Ian Bishop", "Patrick Patterson", "Wes Hall", "Charlie Griffith",
    "Garfield Sobers", "Frank Worrell", "Everton Weekes", "Clyde Walcott", "Rohan Kanhai", "Lance Gibbs", "Alvin Kallicharran", "Jeff Dujon", "Ridley Jacobs", "Denesh Ramdin",
    "Jason Holder", "Nicholas Pooran", "Shai Hope", "Andre Russell", "Sunil Narine", "Kieron Pollard", "Dwayne Bravo", "Shimron Hetmyer", "Alzarri Joseph", "Kemar Roach",
    "Sunil Gavaskar", "Kapil Dev", "Gundappa Viswanath", "Erapalli Prasanna", "Bhagwat Chandrasekhar", "Bishen Singh Bedi", "Srinivas Venkataraghavan", "Farokh Engineer", "Mohinder Amarnath", "Dilip Vengsarkar",
    "Ravi Shastri", "Kris Srikkanth", "Mohammad Azharuddin", "Sachin Tendulkar", "Sourav Ganguly", "Rahul Dravid", "VVS Laxman", "Anil Kumble", "Javagal Srinath", "Harbhajan Singh",
    "Virender Sehwag", "Yuvraj Singh", "Zaheer Khan", "MS Dhoni", "Virat Kohli", "Rohit Sharma", "Ravichandran Ashwin", "Ravindra Jadeja", "Jasprit Bumrah", "Mohammed Shami",
    "Shikhar Dhawan", "Ajinkya Rahane", "Cheteshwar Pujara", "Rishabh Pant", "Hardik Pandya", "Suryakumar Yadav", "KL Rahul", "Shubman Gill", "Ishan Kishan", "Kuldeep Yadav"
];

const extraWords = [
    "Dickie Bird", "Simon Taufel", "Aleem Dar", "Kumar Dharmasena", "Richard Kettleborough", "Marais Erasmus", "Billy Bowden", "Steve Bucknor", "Rudi Koertzen", "David Shepherd",
    "Bodyline Series", "Desert Storm", "NatWest Series", "Nidahas Trophy", "Border-Gavaskar", "Ashes Urn", "World Cup Trophy", "IPL Trophy", "Purple Cap", "Orange Cap",
    "Fair Play Award", "Emerging Player", "MVP", "Man of the Match", "Player of the Tournament", "Cricket Academy", "Nets", "Bowling Machine", "Sidearm", "Slip Cradle",
    "Middle Stump", "Leg Stump", "Off Stump", "Bumper", "Toe Crusher", "Slower Yorker", "Wide Yorker", "Back of a length", "Good length", "Full toss",
    "Slot ball", "Half volley", "Over-pitched", "Short ball", "Rib breaker", "Chin music", "Perfume ball", "Heavy ball", "Wobble seam", "Scrambled seam",
    "Dashing Batsman", "Anchoring Innings", "Tail-ender", "Night-watchman", "Pinch hitter", "Hard hitter", "Slugger", "Finisher", "Accumulator", "Grafter",
    "Wristy", "Orthodox", "Unorthodox", "Stylish", "Aggressive", "Defensive", "Compact Stance", "Open Stance", "Trigger movement", "Shuffle"
];

const finalWords = Array.from(new Set([...allWords, ...morePlayers, ...extraWords])).slice(0, 1000);

const output = {
    words: finalWords
};

fs.writeFileSync(path.join(__dirname, '../data/guessWords.json'), JSON.stringify(output, null, 2));
console.log(`Generated ${finalWords.length} cricket words.`);
