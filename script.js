const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const nodemailer = require("nodemailer");

require("dotenv").config();

puppeteer.use(StealthPlugin());

const MAX_PRICE = 14.0;
const YOUR_NAME = "Felix";
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;
const APP_PASSWORD = process.env.APP_PASSWORD;

const courseUrls = [
  "https://www.udemy.com/course/complete-networking-fundamentals-course-ccna-start/",
  "https://www.udemy.com/course/complete-linux-training-course-to-get-your-dream-it-job/",
  "https://www.udemy.com/course/git-and-github-bootcamp/",

  // ide jöhetnek további linkek
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  for (const url of courseUrls) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    try {
      const title = await page.$eval("h1[data-purpose='lead-title']", (el) =>
        el.textContent.trim()
      );

      const oldPriceExists =
        (await page.$("div[data-purpose='course-old-price-text']")) !== null;

      const currentPriceStr = await page.$eval(
        "div[data-purpose='course-price-text'] span:not([class])",
        (el) => el.textContent.trim()
      );

      const currentPriceNum = parseFloat(
        currentPriceStr.replace(/[^\d.,]/g, "").replace(",", ".")
      );

      const remainingTimeExists =
        (await page.$("span[data-testid='timer-x-days-left']")) !== null;

      let remainingTime = null;
      if (remainingTimeExists) {
        const remainingTimeStr = await page.$eval(
          "span[data-testid='timer-x-days-left']",
          (el) => el.textContent.trim()
        );
        remainingTime = parseInt(remainingTimeStr.replace(/[^\d.,]/g, ""));
      }

      results.push({
        title,
        url,
        oldPriceExists,
        currentPriceStr,
        currentPriceNum,
        remainingTime,
      });
    } catch (err) {
      console.error(`Error while scraping ${url}:`, err);
    }

    await page.close();
  }

  await browser.close();

  // HTML blokkok összerakása
  const courseBlocks = results
    .map((course) => {
      return `
      <h2 style="color: #555;">${course.title}</h2>
      <p style="font-size: 14px; margin-bottom: 4px;"><a href="${
        course.url
      }" target="_blank">${course.url}</a></p>
      <div style="padding: 15px; background-color: #fff; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
        <p style="font-size: 18px; margin: 0;"><strong>Price:</strong> ${
          course.currentPriceStr
        }</p>
        ${
          course.oldPriceExists
            ? `<p style="font-size: 16px; margin: 5px 0; color: #e53935;"><strong>Discounted price!</strong></p><p style="font-size: 16px; margin: 5px 0;">🔔 <strong>Only ${course.remainingTime} days left before the deal ends!</strong></p>`
            : `<p style="font-size: 16px; margin: 5px 0;">Not discounted.</p>`
        }
      </div>
    `;
    })
    .join("");

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #fafafa;">
    <h1 style="color: #333;">🎓 Udemy Price Alert</h1>
    <p style="font-size: 16px; color: #444;">
      Hi ${YOUR_NAME}!<br><br>
      Here's the latest pricing information for the courses you're following:
    </p>
    ${courseBlocks}
    <p style="font-size: 14px; color: #777;">This is an automated notification sent by your price-tracking script.</p>
  </div>
`;

  async function sendMail() {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_FROM,
        pass: APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Udemy price checker notification" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: "Udemy Price Alert",
      text: "Your courses have updated prices!",
      html: htmlContent,
    };

    try {
      let info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
    } catch (error) {
      console.error("Error at sending email:", error);
    }
  }

  sendMail();
})();
