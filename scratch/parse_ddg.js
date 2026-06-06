const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('scratch/ddg_resp.html', 'utf8');
const $ = cheerio.load(html);

console.log("Printing all links containing 'cricbuzz':");
$('a').each((i, el) => {
  const href = $(el).attr('href');
  if (href && href.includes('cricbuzz')) {
    console.log(href);
  }
});
