const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Massive list of top 300+ players matching my previous generator list (Trimmed to string names)
const playersData = [
  "Virat Kohli", "Rohit Sharma", "MS Dhoni", "Jasprit Bumrah", "Hardik Pandya", "KL Rahul", "Rishabh Pant", "Ravindra Jadeja", "R Ashwin",
  "Mohammed Shami", "Shubman Gill", "Suryakumar Yadav", "Shreyas Iyer", "Ishan Kishan", "Mohammed Siraj", "Kuldeep Yadav", "Yuzvendra Chahal",
  "Axar Patel", "Washington Sundar", "Rinku Singh", "Yashasvi Jaiswal", "Ruturaj Gaikwad", "Sanju Samson", "Arshdeep Singh", "Shardul Thakur",
  "Deepak Chahar", "Bhuvneshwar Kumar", "Umesh Yadav", "Ishant Sharma", "Ajinkya Rahane", "Cheteshwar Pujara", "Mayank Agarwal", "Hanuma Vihari",
  "Prithvi Shaw", "Navdeep Saini", "T Natarajan", "Shivam Dube", "Deepak Hooda", "Krunal Pandya", "Rajat Patidar", "Umran Malik", "Tilak Varma",
  "Jitesh Sharma", "Avesh Khan", "Mukesh Kumar", "Sachin Tendulkar", "Rahul Dravid", "VVS Laxman", "Virender Sehwag", "Sourav Ganguly",
  "Kapil Dev", "Yuvraj Singh", "Gautam Gambhir", "Anil Kumble", "Harbhajan Singh", "Zaheer Khan", "Suresh Raina", "Irfan Pathan", "Javagal Srinath",
  "Ajit Agarkar", "Mohammad Azharuddin", "Sunil Gavaskar", "Ravi Shastri", "Pat Cummins", "Steve Smith", "David Warner", "Mitchell Starc",
  "Marnus Labuschagne", "Josh Hazlewood", "Nathan Lyon", "Glenn Maxwell", "Travis Head", "Cameron Green", "Mitchell Marsh", "Alex Carey",
  "Marcus Stoinis", "Adam Zampa", "Josh Inglis", "Spencer Johnson", "Tim David", "Sean Abbott", "Ashton Agar", "Matthew Wade", "Usman Khawaja",
  "Aaron Finch", "Jhye Richardson", "Riley Meredith", "Scott Boland", "Todd Murphy", "Michael Neser", "Matt Renshaw", "Marcus Harris",
  "Lance Morris", "Jason Behrendorff", "Kane Richardson", "Andrew Tye", "Ricky Ponting", "Shane Warne", "Adam Gilchrist", "Steve Waugh",
  "Matthew Hayden", "Glenn McGrath", "Brett Lee", "Mitchell Johnson", "Jason Gillespie", "Michael Clarke", "Mark Waugh", "Allan Border",
  "Ian Healy", "Michael Hussey", "Andrew Symonds", "Dennis Lillee", "Jeff Thomson", "Brad Haddin", "Joe Root", "Ben Stokes", "Jos Buttler",
  "Jonny Bairstow", "Mark Wood", "Jofra Archer", "Chris Woakes", "Moeen Ali", "Adil Rashid", "Harry Brook", "Ollie Pope", "Zak Crawley",
  "Ben Duckett", "Dawid Malan", "Jason Roy", "Alex Hales", "Sam Curran", "Liam Livingstone", "Phil Salt", "Will Jacks", "Reece Topley",
  "Chris Jordan", "David Willey", "Gus Atkinson", "Rehan Ahmed", "Jack Leach", "Shoaib Bashir", "James Anderson", "Stuart Broad",
  "Eoin Morgan", "Tom Hartley", "Brydon Carse", "Matthew Potts", "Ben Foakes", "Dan Lawrence", "Kevin Pietersen", "Alastair Cook",
  "Andrew Flintoff", "Ian Botham", "David Gower", "Graham Gooch", "Andrew Strauss", "Michael Vaughan", "Graeme Swann", "Matt Prior",
  "Jonathan Trott", "Darren Gough", "Kagiso Rabada", "Quinton de Kock", "Aiden Markram", "David Miller", "Heinrich Klaasen", "Anrich Nortje",
  "Lungi Ngidi", "Marco Jansen", "Temba Bavuma", "Rassie van der Dussen", "Tabraiz Shamsi", "Keshav Maharaj", "Gerald Coetzee", "Reeza Hendricks",
  "Tristan Stubbs", "Tony de Zorzi", "Nandre Burger", "Wiaan Mulder", "Andile Phehlukwayo", "Lizaad Williams", "Faf du Plessis", "Jacques Kallis",
  "AB de Villiers", "Hashim Amla", "Dale Steyn", "Graeme Smith", "Morne Morkel", "Vernon Philander", "Allan Donald", "Makhaya Ntini",
  "Shaun Pollock", "Jonty Rhodes", "Lance Klusener", "Herschelle Gibbs", "Mark Boucher", "JP Duminy", "Kane Williamson", "Trent Boult",
  "Tim Southee", "Devon Conway", "Daryl Mitchell", "Mitchell Santner", "Tom Latham", "Matt Henry", "Lockie Ferguson", "Kyle Jamieson",
  "Glenn Phillips", "Rachin Ravindra", "Finn Allen", "Mark Chapman", "Ish Sodhi", "Ajaz Patel", "Will Young", "Henry Nicholls", "Tim Seifert",
  "Colin Munro", "Adam Milne", "Ross Taylor", "Brendon McCullum", "Stephen Fleming", "Daniel Vettori", "Martin Guptill", "Richard Hadlee",
  "Chris Cairns", "Nathan Astle", "Shane Bond", "Craig McMillan", "Jacob Oram", "Babar Azam", "Shaheen Afridi", "Mohammad Rizwan",
  "Fakhar Zaman", "Haris Rauf", "Shadab Khan", "Naseem Shah", "Imam-ul-Haq", "Abdullah Shafique", "Saud Shakeel", "Agha Salman",
  "Iftikhar Ahmed", "Imad Wasim", "Hasan Ali", "Faheem Ashraf", "Mohammad Nawaz", "Usama Mir", "Saim Ayub", "Mohammad Wasim Jr",
  "Zaman Khan", "Abrar Ahmed", "Shan Masood", "Sarfraz Ahmed", "Azam Khan", "Imran Khan", "Wasim Akram", "Waqar Younis", "Shoaib Akhtar",
  "Inzamam-ul-Haq", "Javed Miandad", "Younis Khan", "Mohammad Yousuf", "Saeed Anwar", "Shahid Afridi", "Misbah-ul-Haq", "Shoaib Malik",
  "Umar Gul", "Saqlain Mushtaq", "Abdul Razzaq", "Kamran Akmal", "Mohammad Amir", "Saeed Ajmal", "Nicholas Pooran", "Shai Hope",
  "Rovman Powell", "Andre Russell", "Jason Holder", "Alzarri Joseph", "Kyle Mayers", "Akeal Hosein", "Romario Shepherd", "Shimron Hetmyer",
  "Johnson Charles", "Brandon King", "Sherfane Rutherford", "Gudakesh Motie", "Kemar Roach", "Kraigg Brathwaite", "Shamar Joseph",
  "Obed McCoy", "Jason Mohammed", "Shannon Gabriel", "Roston Chase", "Brian Lara", "Vivian Richards", "Chris Gayle", "Gordon Greenidge",
  "Desmond Haynes", "Clive Lloyd", "Shivnarine Chanderpaul", "Kieron Pollard", "Dwayne Bravo", "Sunil Narine", "Courtney Walsh",
  "Curtly Ambrose", "Malcolm Marshall", "Michael Holding", "Marlon Samuels", "Andy Roberts", "Joel Garner", "Darren Sammy",
  "Pathum Nissanka", "Kusal Mendis", "Charith Asalanka", "Dasun Shanaka", "Wanindu Hasaranga", "Maheesh Theekshana", "Dushmantha Chameera",
  "Matheesha Pathirana", "Dilshan Madushanka", "Sadeera Samarawickrama", "Angelo Mathews", "Dhananjaya de Silva", "Dimuth Karunaratne",
  "Kusal Perera", "Pramod Madushan", "Dunith Wellalage", "Bhanuka Rajapaksa", "Nuwan Thushara", "Kumar Sangakkara", "Mahela Jayawardene",
  "Sanath Jayasuriya", "Muttiah Muralitharan", "Lasith Malinga", "Chaminda Vaas", "Tillakaratne Dilshan", "Aravinda de Silva",
  "Rangana Herath", "Arjuna Ranatunga", "Marvan Atapattu", "Nuwan Kulasekara", "Shakib Al Hasan", "Mushfiqur Rahim", "Mahmudullah",
  "Tamim Iqbal", "Mustafizur Rahman", "Litton Das", "Najmul Hossain Shanto", "Mehidy Hasan Miraz", "Taskin Ahmed", "Shoriful Islam",
  "Hasan Mahmud", "Towhid Hridoy", "Afif Hossain", "Soumya Sarkar", "Mashrafe Mortaza", "Rubel Hossain", "Mominul Haque", "Taijul Islam",
  "Rashid Khan", "Mohammad Nabi", "Mujeeb Ur Rahman", "Rahmanullah Gurbaz", "Naveen-ul-Haq", "Fazalhaq Farooqi", "Ibrahim Zadran",
  "Najibullah Zadran", "Azmatullah Omarzai", "Hashmatullah Shahidi", "Gulbadin Naib", "Qais Ahmad", "Noor Ahmad", "Karim Janat", "Rahmat Shah"
];

const uniquePlayers = Array.from(new Set(playersData));

async function getStats(name) {
    let url = `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
    let html;
    const config = { headers: { 'User-Agent': 'UndercoverBot/1.0 (test@test.com)' }, timeout: 10000 };
    try {
        const res = await axios.get(url, config);
        html = res.data;
    } catch(e) {
        try {
            const res2 = await axios.get(url + '_(cricketer)', config);
            html = res2.data;
        } catch(e2) {
            return null;
        }
    }
    
    const $ = cheerio.load(html);
    const infobox = $('.infobox.vcard');
    if (!infobox.length) return null;
    
    let cols = [];
    infobox.find('tr').each((i, row) => {
        const ths = $(row).find('th');
        if (ths.length >= 2 && cols.length === 0) {
            $(row).find('th').each((j, th) => {
                cols.push($(th).text().trim());
            });
        }
    });
    
    let stats = { name: name, "Test Runs": 0, "ODI Runs": 0, "T20I Runs": 0, "Test Wickets": 0, "ODI Wickets": 0, "T20I Wickets": 0 };
    let hasTest = cols.indexOf('Test') !== -1 || cols.indexOf('Tests') !== -1;
    let hasODI = cols.indexOf('ODI') !== -1 || cols.indexOf('ODIs') !== -1;
    let hasT20I = cols.indexOf('T20I') !== -1 || cols.indexOf('T20Is') !== -1;
    let tIndex = Math.max(cols.indexOf('Test'), cols.indexOf('Tests')) - 1;
    let oIndex = Math.max(cols.indexOf('ODI'), cols.indexOf('ODIs')) - 1;
    let t20Index = Math.max(cols.indexOf('T20I'), cols.indexOf('T20Is')) - 1;
    
    const parseNumber = (str) => parseInt(str.replace(/,/g, '').replace(/–|-/g, '0')) || 0;
    
    infobox.find('tr').each((i, row) => {
        const th = $(row).find('th').first().text().trim();
        const tds = $(row).find('td');
        if ((th === 'Runs scored' || th === 'Runs') && tds.length > 0) {
            if (hasTest && tds[tIndex]) stats["Test Runs"] = parseNumber($(tds[tIndex]).text());
            if (hasODI && tds[oIndex]) stats["ODI Runs"] = parseNumber($(tds[oIndex]).text());
            if (hasT20I && tds[t20Index]) stats["T20I Runs"] = parseNumber($(tds[t20Index]).text());
        }
        if ((th === 'Wickets taken' || th === 'Wickets') && tds.length > 0) {
            if (hasTest && tds[tIndex]) stats["Test Wickets"] = parseNumber($(tds[tIndex]).text());
            if (hasODI && tds[oIndex]) stats["ODI Wickets"] = parseNumber($(tds[oIndex]).text());
            if (hasT20I && tds[t20Index]) stats["T20I Wickets"] = parseNumber($(tds[t20Index]).text());
        }
    });
    
    // Ensure they have at least *some* stat, filtering bad infoboxes
    if (stats["Test Runs"] === 0 && stats["ODI Runs"] === 0 && stats["T20I Runs"] === 0 &&
        stats["Test Wickets"] === 0 && stats["ODI Wickets"] === 0 && stats["T20I Wickets"] === 0) {
        return null;
    }
    
    return stats;
}

async function scrapeAll() {
    console.log(`Starting massive synchronous scrape of ${uniquePlayers.length} players to bypass Wikipedia rate-limits...`);
    let finalDataset = [];
    
    let successCount = 0;
    for (let i = 0; i < uniquePlayers.length; i++) {
        const name = uniquePlayers[i];
        
        try {
            const res = await getStats(name);
            if (res !== null) {
                finalDataset.push(res);
                successCount++;
            }
        } catch(e) {}
        
        // Print progress every 10
        if ((i + 1) % 10 === 0) {
            console.log(`Scraped ${i + 1}/${uniquePlayers.length} ... (Total exact matches found: ${successCount})`);
        }
        
        // Very important: 800ms delay to prevent HTTP 429 Too Many Requests
        await new Promise(r => setTimeout(r, 800));
    }
    
    // Fallback logic incase it drops below minimum viable limits
    if (finalDataset.length < 50) {
        console.error(`Critical Failure: Only scraped ${finalDataset.length} players. Aborting write to save valid JSON.`);
        process.exit(1);
    }

    const statsPath = path.join(__dirname, 'data', 'hiloStats.json');
    fs.writeFileSync(statsPath, JSON.stringify(finalDataset, null, 4));
    console.log(`Successfully acquired perfectly precise Wiki statistics for ${finalDataset.length} genuine players!`);
}

scrapeAll();
