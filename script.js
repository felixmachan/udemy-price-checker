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

const courseUrl =
  "https://www.udemy.com/course/complete-networking-fundamentals-course-ccna-start/";

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.goto(courseUrl, { waitUntil: "networkidle2" });

  const oldPriceExists =
    (await page.$("div[data-purpose='course-old-price-text']")) !== null;

  const currentPriceStr = await page.$eval(
    "div[data-purpose='course-price-text'] span:not([class])",
    (el) => el.textContent.trim()
  );

  const remainingTimeExists =
    (await page.$("span[data-testid='timer-x-days-left']")) !== null;

  var remainingTime;

  if (remainingTimeExists) {
    const remainingTimeStr = await page.$eval(
      "span[data-testid='timer-x-days-left']",
      (el) => el.textContent.trim()
    );
    remainingTime = parseInt(remainingTimeStr.replace(/[^\d.,]/g, ""));
  }

  const currentPriceNum = parseFloat(
    currentPriceStr.replace(/[^\d.,]/g, "").replace(",", ".")
  );

  await browser.close();

  async function sendMail() {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_FROM,
        pass: APP_PASSWORD,
      },
    });

    let mailOptions = {
      from: `"Udemy price checker notification" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: "Udemy Price Alert",
      text: "error",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #fafafa;">
      <h2 style="color: #333;">🎓 Udemy Price Alert</h2>
      <p style="font-size: 16px; color: #444;">
        Hi ${YOUR_NAME}!<br><br>
        The price of a course you're following has changed. Here are the details:
      </p>

      <div style="padding: 15px; background-color: #fff; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
        <p style="font-size: 18px; margin: 0;"><strong>Price:</strong> ${currentPriceStr}</p>
        ${
          oldPriceExists
            ? `<p style="font-size: 16px; margin: 5px 0; color: #e53935;"><strong>Discounted price!</strong></p>`
            : `<p style="font-size: 16px; margin: 5px 0;">Not discounted.</p>`
        }
        ${
          oldPriceExists && currentPriceNum < MAX_PRICE
            ? `<p style="font-size: 16px; margin: 5px 0;">🔔 <strong>Only ${remainingTime} days left before the deal ends!</strong></p>`
            : ""
        }
      </div>

      <p style="font-size: 14px; color: #777;">This is an automated notification sent by your price-tracking script.</p>
    </div>
  `,
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
