const puppeteer = require('puppeteer')

function createTable(text, type){
   var el = []
   var els = []
   var cnt = 0
   for(const val of text){
      cnt++;
      if(val == '\t' || val == '\n'){
         els.push(el.join(''))
         el = []
      }
      else{
         el.push(val)
      }
      if(cnt == text.length){
         els.push(el.join(''))
      }
   }
   var table = [];
   if(type == 'hit'){
      while(els.length) table.push(els.splice(0,20));
   } else{
      while(els.length) table.push(els.splice(0,21));
   }
   
   return table
}

module.exports.scrape = async function(year){
   const table_hit = await scrape_hitting(year);
   const table_pit = await scrape_pitching(year);
   return [table_hit,table_pit];
};

var scrape_hitting = async function(year) {
   const browser = await puppeteer.launch({})
   const page = await browser.newPage()
   var url = `https://www.fangraphs.com/leaders.aspx?pos=all&stats=bat&lg=all&qual=0&type=1&season=${year}&month=0&season1=${year}&ind=0&team=0,ts&rost=0&age=0&filter=&players=0&startdate=${year}-01-01&enddate=${year}-12-31`;
   await page.goto(url,{ waitUntil: 'domcontentloaded' })
   var element = await page.waitForSelector("#LeaderBoard1_dg1_ctl00 > tbody")
   var text = await page.evaluate(element => element.innerText, element)
   var table = createTable(text,'hit');
   browser.close()
   return table
};

var scrape_pitching = async function(year){
   const browser = await puppeteer.launch({})
   const page = await browser.newPage()
   await page.goto(`https://www.fangraphs.com/leaders.aspx?pos=all&stats=pit&lg=all&qual=0&type=1&season=${year}&month=0&season1=${year}&ind=0&team=0,ts&rost=0&age=0&filter=&players=0&startdate=${year}-01-01&enddate=${year}-12-31`)
   var element = await page.waitForSelector("#LeaderBoard1_dg1_ctl00 > tbody")
   var text = await page.evaluate(element => element.innerText, element)
   var table = createTable(text,'pitch');
   browser.close()
   return table
}
