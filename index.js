const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const readline = require('readline');
const Mailjs = require('@cemalgnlts/mailjs');
const mailjs = new Mailjs();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createAndVerifyAccounts(choice, loopCount) {
    for (let i = 0; i < loopCount || loopCount === Infinity; i++) {
        console.log(`\n \n┏ [ Account ${i + 1} ]`);
        await createAndVerifyAccount(choice);
    }
}

async function createAndVerifyAccount(choice) {
    do {
        var account = await mailjs.createOneAccount();
        var { username, password } = account.data;
    } while (username && password == undefined);
    console.log('┣ Email    :', username);
    console.log('┗ Password :', password);

    const dataToSave = `${username}:${password}`;
    const accounts = fs.createWriteStream('email_password.txt', { flags: 'a' });
    accounts.write(dataToSave + '\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(' \n┏ [ Browser ]');
    console.log('┣ Sign up Account');
    await page.goto('https://animegenius.live3d.io/sign-up');
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', `avux_${username.split('@')[0]}`);
    await page.type('input[name="email"]', username);
    await page.type('input[name="password"]', password);
    await page.type('input[name="password_confirmation"]', password);
    await page.keyboard.press('Enter');

    console.log('┣ Waiting Verification Email');
    do {
        var email = await mailjs.getMessages();
    } while (email.data.length < 1);
    let verification = await mailjs.getMessage(email.data[0].id);
    const verificationHtml = verification.data.html[0];

    console.log('┣ Verifying');
    const $ = cheerio.load(verificationHtml);
    const verificationLink = $('a[href*="confirm-email"]').attr('href');
    await page.goto(verificationLink);

    await page.waitForSelector('a[href*="sign-in"]');
    console.log('┗ Successfully Registered');
    await page.click('a[href*="sign-in"]');

    console.log(' \n┏ [ Browser ]');
    console.log('┣ Sign in Account');
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', username);
    await page.type('input[name="password"]', password);
    await page.keyboard.press('Enter');
    console.log('┗ Successfully Login');
    
    if (choice == 1) {
        await browser.close();
    } else {
        await page.waitForSelector('button[type="button"]');
        await page.goto('https://animegenius.live3d.io/ai-art-tools');
        console.log(' \n┏ [ Enjoy Your Account ]');
    }
    console.log('┗ Script By Avux');
}

rl.question('Select an option:\n1. Generate and Verify Account\n2. Generate Account and Open Dashboard\nEnter your choice (1/2) : ', (choice) => {
    if (choice === '1') {
        rl.question('How many accounts (0 for unlimited loop): ', (loop) => {
            if (loop == 0) {
                createAndVerifyAccounts(choice, Infinity).then(() => rl.close());
            } else {
                createAndVerifyAccounts(choice, parseInt(loop)).then(() => rl.close());
            }
        });
    } else if (choice === '2') {
        createAndVerifyAccounts(choice, 1).then(() => rl.close());
    } else {
        console.log('Invalid choice. Please enter 1 or 2.');
        rl.close();
    }
});