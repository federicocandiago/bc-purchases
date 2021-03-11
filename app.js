const fs = require('fs');
const request = require('request');



/* PARAMETERS */

//The endpoint for the Bandcamp public API
const BASE_URL = 'https://bandcamp.com/api/salesfeed/1/get?start_date=';

//The name of the resulting CSV file
const FILE_NAME = 'purchases.csv';

//The time between each iteration (currently set at 60)
const DURATION = 60;

//The inital delay for the bandcamp data (currently set at 120)
let DELAY = 120;



/* HELPER FUCTIONS */

const sanitiseForCsv = (string) => {return string ? string.replace(';', ' ') : ''} 

const productType = (string) => {
    switch (string) {
        case 'a': return 'album';           
        case 'b': return 'bundle';           
        case 'p': return 'physical';           
        case 't': return 'track';           
        default: return string;
}} 

let timestamp = (Math.floor( Date.now() / (DURATION * 1000) ) * DURATION) - (DELAY);

const getPurchases = () =>  {
    timestamp += DURATION;
    let newContent = '';
    let newItems = 0;

    request.get({
        url: BASE_URL + timestamp, 
        formData: {'start_date' : timestamp} 
    }, (err, res, body) => {
        if (err) return console.error('\n❗️ Couldn\'t get a valid response from the server:', err);

        //A. Parses the content to JSON, clears the text buffer and the new releases counter
        const objectBody = JSON.parse(body);

        //B. Populates the text buffer with the relevant data 
        if (objectBody.events && objectBody.events.length) {
            objectBody.events.map(event => {
                if (event.event_type == 'sale' && event.items.length) {
                    event.items.map(item => {
                        const date = new Date(item.utc_date * 1000)
                        newContent += `${ item.utc_date };${
                            date.toLocaleDateString() };${
                            date.toLocaleTimeString() };${
                            sanitiseForCsv(item.artist_name) };${
                            sanitiseForCsv(item.item_description) };${
                            productType(item.item_type) };${
                            item.country };${
                            Number(item.item_price).toFixed(2) };${
                            item.currency };${
                            item.art_url };https:${
                            item.url }\n`;
                        newItems++;
                    })
                }
            })
        }

        //C. Writes the data to file
        fs.appendFile(FILE_NAME, newContent, function(err) {
            if (err) console.log('\n❗️ Couldn\'t write the file: ', err);
            else {
                const logDate = new Date();
                console.log(`[${logDate.toLocaleTimeString()}] ${newItems} items have been logged.`);
            }
        });
        
    });
}

const successMesage = `✅ bc-purchases started. Listening to the endpoint every ${DURATION} seconds. ✅`;

//FIRST EXECUTION: If the file doesn't exist, set an intestation
if (fs.existsSync(FILE_NAME)) {
    console.log(`\n${successMesage}\n\n📁 File ${FILE_NAME} already exists. Appending to the existing records.. \n`);
    getPurchases();
} else {
    fs.writeFile(
        FILE_NAME, 
        `TIMESTAMP;DATE;TIME;ARTIST;ALBUM/PRODUCT;TYPE;COUNTRY;PRICE;CURRENCY;ARTWORK;URL\n`, 
        function(err) {
        if (err) console.log('\n❗️ Couldn\'t initialise the file: ', err);
        else {
            console.log(`\n${successMesage}\n\n📁 File ${FILE_NAME} created successfully.\n`);
            getPurchases();
        }
    });
}

 
// FURTHER EXECUTIONS: The Bandcamp feed is updated every DURATION seconds 
setInterval(() => getPurchases(), DURATION * 1000);
