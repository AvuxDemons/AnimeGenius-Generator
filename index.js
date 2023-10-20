const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { JsonDB, Config } = require('node-json-db');

var db = new JsonDB(new Config('db', true, true, '/'));

const readline = require('readline');
const Mailjs = require('@cemalgnlts/mailjs');

var username = "avux";
var browser, page, email, account = { user: '', pass: '' };

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const NewEmail = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            do {
                email = new Mailjs();
                let account = await email.createOneAccount();
                var { username, password } = account.data;
            } while (username && password == 'undefined');

            console.log(`Email Created : ${username}:${password}`);

            account.user = username;
            account.pass = password;

            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

const EventEmail = () => {
    email.on("ready", () => console.log("Listening to incoming messages"));
    email.on("arrive", async (msg) => {
        console.log(`Message ${msg.id} has arrived`)
        await ParseEmail(msg.id);
    });
}

const ParseEmail = async (id) => {
    const message = await email.getMessage(id);
    const html = message.data.html[0];
    const $ = cheerio.load(html);
    const url = $('a[href*="confirm-email"]').attr('href');

    await VerifyAccount(url);
}

const NewBrowser = async (headless) => {
    browser = await puppeteer.launch({
        headless: headless,
        defaultViewport: { width: 1280, height: 720 },
    });

    [page] = await browser.pages();
}

const VerifyAccount = async (url) => {
    await page.goto(url);
    console.log("Account Verified");

    let oldData = await db.getData('/account');
    let updatedData = [...oldData, { email: account.user, pass: account.pass }];
    await db.push('/account', updatedData);
}

const RegisterAccount = async ({ user, pass }) => {
    await page.goto('https://animegenius.live3d.io/sign-up');
    await page.waitForSelector('input[name="username"]');

    await page.type('input[name="username"]', `${username}_${user.split('@')[0]}`);
    await page.type('input[name="email"]', user);
    await page.type('input[name="password"]', pass);
    await page.type('input[name="password_confirmation"]', pass);
    await page.keyboard.press('Enter');

    EventEmail();

    await new Promise((resolve) => {
        const intervalId = setInterval(() => {
            if (page.url().includes('confirm-email')) {
                clearInterval(intervalId);
                resolve();
            }
        }, 5000);
    });
};

const LoginAccount = async ({ user, pass }) => {
    await page.goto('https://animegenius.live3d.io/sign-in');
    await page.waitForSelector('input[name="email"]');

    await page.type('input[name="email"]', user);
    await page.type('input[name="password"]', pass);
    await page.keyboard.press('Enter');

    await page.waitForSelector('button[type="button"]');
    await page.goto('https://animegenius.live3d.io/ai-art-tools');

    console.log('Successfully Login');
}

const checkBalance = async () => {

    await new Promise((resolve) => {
        const intervalId = setInterval(() => {
            if (page.url().includes('ai-art-tools')) {
                clearInterval(intervalId);
                resolve();
            }
        }, 1000);
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    let balance = $('#app').find('.app-header').find('.app-container').find('#kt_app_header_wrapper').find('.app-navbar').find('.app-navbar-item:nth-child(1)').find('a').find('span').text().trim();

    if (balance < 50) {
        return true;
    } else {
        return false;
    }
}

function showMenu() {
    console.log('┏━ Menu');
    console.log('1. Generate Multiple Accounts');
    console.log('2. Generate & Use Account');
    console.log('3. Use Account From Database');
    console.log('4. Exit');
}

async function handleOption(option) {
    console.log('[+] Selected option -', option);
    switch (option) {
        case 1:
            const loop = await askQuestion('┏━ Amount of account\n┃ Number - ? | 0 - Unlimited\n┗━➢  ');
            await processOption1(loop);
            break;
        case 2:
            await processOption2();
            break;
        case 3:
            await processOption3();
            break;
        case 4:
            console.log('Exiting...');
            break;
        default:
            console.log('[!] Invalid option. Please select a valid option.');
    }
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (input) => {
            resolve(parseInt(input));
        });
    });
}

async function processOption1(loop) {
    if (loop === 0) {
        let i = 1;
        while (true) {  
            console.log(`[+] Looping - ${i} Account`);
            await processOption1Step();
            console.log(' ');
            i++;
        }
    } else {
        for (let i = 0; i < loop; i++) {
            console.log(`[+] Remaining - ${(loop - i)} Account`);
            await processOption1Step();
        }
    }
}

async function processOption1Step() {
    await NewEmail();
    await NewBrowser("new");
    await RegisterAccount(account);
    await browser.close();
}

async function processOption2() {
    await NewEmail();
    await NewBrowser("new");
    await RegisterAccount(account);
    await browser.close();
    await NewBrowser(false);
    await LoginAccount(account);
}

async function processOption3() {
    let data = await db.getData('/account');
    let acc = data[Math.floor(Math.random() * data.length)];
    account.user = acc.email;
    account.pass = acc.pass;
    do {
        await NewBrowser(false);
        await LoginAccount(account);
        var lowBalance = await checkBalance();
        lowBalance ? await browser.close() : '';
    } while (lowBalance);
}

async function startProgram() {

    let option;
    do {
        showMenu();
        option = await askQuestion('┗━➢  ');
        console.clear();
        await handleOption(option);
    } while (option !== 4)

    console.log('==== ended ====');
    rl.close();
}

startProgram();