const axios = require('axios');
const cheerio = require('cheerio');

async function getStats(name) {
    let url = `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
    let html;
    const config = { headers: { 'User-Agent': 'UndercoverBot/1.0 (contact@example.com)' } };
    try {
        const res = await axios.get(url, config);
        html = res.data;
    } catch(e) {
        try {
            const res2 = await axios.get(url + '_(cricketer)', config);
            html = res2.data;
        } catch(e2) {
            console.log("Failed to find", name);
            return null;
        }
    }
    
    const $ = cheerio.load(html);
    const infobox = $('.infobox.vcard');
    if (!infobox.length) {
        console.log("No infobox for", name);
        return null;
    }
    
    let cols = [];
    infobox.find('tr').each((i, row) => {
        const ths = $(row).find('th');
        if (ths.length > 2 && cols.length === 0) {
            $(row).find('th').each((j, th) => {
                cols.push($(th).text().trim());
            });
        }
    });
    
    let stats = { name: name, "Test Runs": 0, "ODI Runs": 0, "T20I Runs": 0, "Test Wickets": 0, "ODI Wickets": 0, "T20I Wickets": 0, "International Centuries": 0, "International Matches": 0 };
    let hasTest = cols.indexOf('Test') !== -1 || cols.indexOf('Tests') !== -1;
    let hasODI = cols.indexOf('ODI') !== -1 || cols.indexOf('ODIs') !== -1;
    let hasT20I = cols.indexOf('T20I') !== -1 || cols.indexOf('T20Is') !== -1;
    let tIndex = Math.max(cols.indexOf('Test'), cols.indexOf('Tests')) - 1;
    let oIndex = Math.max(cols.indexOf('ODI'), cols.indexOf('ODIs')) - 1;
    let t20Index = Math.max(cols.indexOf('T20I'), cols.indexOf('T20Is')) - 1;
    
    const parseNumber = (str) => parseInt(str.replace(/,/g, '').replace(/–/g, '0')) || 0;
    
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
    console.log(stats);
    return stats;
}

getStats("Faheem Ashraf");
getStats("Virat Kohli");
