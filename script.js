const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const nodemailer = require("nodemailer");
require("dotenv").config();

puppeteer.use(StealthPlugin());

const YOUR_NAME = process.env.NAME;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;
const APP_PASSWORD = process.env.APP_PASSWORD;

// Courses to track
const coursesToTrack = [
  {
    url: "https://www.udemy.com/course/complete-networking-fundamentals-course-ccna-start/",
    maxPrice: 14.0,
  },
  {
    url: "https://www.udemy.com/course/complete-linux-training-course-to-get-your-dream-it-job/",
    maxPrice: 12.0,
  },
  {
    url: "https://www.udemy.com/course/git-and-github-bootcamp/",
    maxPrice: 20.0,
  },
];

const launchOptionsBase = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

const executablePaths = [
  "/usr/bin/chromium", // Linux default
  "C:/Program Files/Google/Chrome/Application/chrome.exe", // Windows default
];

async function launchBrowserWithFallback() {
  for (const path of executablePaths) {
    try {
      console.log(`Trying to launch browser at: ${path}`);
      const browser = await puppeteer.launch({
        ...launchOptionsBase,
        executablePath: path,
      });
      console.log(`Launched browser at: ${path}`);
      return browser;
    } catch (err) {
      // console.warn(`Failed to launch browser at ${path}: ${err.message}`);
    }
  }
  // console.log("Falling back to Puppeteer Chromium");
  return await puppeteer.launch(launchOptionsBase);
}

(async () => {
  const browser = await launchBrowserWithFallback();

  const results = [];

  for (const { url, maxPrice } of coursesToTrack) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    let oldPriceStr = null;
    let oldPriceNum = null;

    try {
      const title = await page.$eval("h1[data-purpose='lead-title']", (el) =>
        el.textContent.trim()
      );

      const oldPriceExists =
        (await page.$("div[data-purpose='course-old-price-text']")) !== null;

      if (oldPriceExists) {
        oldPriceStr = await page.$eval(
          "div[data-purpose='course-old-price-text'] span:not([class])",
          (el) => el.textContent.trim()
        );
        console.log(`Old price: ${oldPriceStr}`);
        oldPriceNum = parseFloat(
          oldPriceStr.replace(/[^\d.,]/g, "").replace(",", ".")
        );
      }

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

      // Csak ha ár megfelelő
      if (currentPriceNum <= maxPrice) {
        results.push({
          title,
          url,
          oldPriceExists,
          currentPriceStr,
          currentPriceNum,
          remainingTime,
          oldPriceNum,
          oldPriceStr,
        });
        console.log(results);
      } else {
        console.log(
          `❌ ${title} - $${currentPriceNum} (too expensive, max is €${maxPrice})`
        );
      }
    } catch (err) {
      console.error(`Error while scraping ${url}:`, err);
    }

    await page.close();
  }

  await browser.close();

  if (results.length === 0) {
    console.log("✅ No affordable courses at the moment. No email sent.");
    return;
  }

  const courseBlocks = results
    .map((course) => {
      return `
        <h2 style="color: #555;">${course.title}</h2>
        <p style="font-size: 14px; margin-bottom: 4px;"><a href="${
          course.url
        }" target="_blank">${course.url}</a></p>
        <div style="padding: 15px; background-color: #fff; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <p style="font-size: 18px; margin: 0; margin-right: 10px;">
                <strong>Price:</strong> ${course.currentPriceStr}
            </p>
            ${
              course.oldPriceStr
                ? `<p style="color: #999; font-size: 18px; margin: 0;"><s>${course.oldPriceStr}</s></p>`
                : ""
            }
            </div>

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
        Here's the latest pricing information for your tracked courses:
      </p>
      ${courseBlocks}
      <p style="font-size: 14px; color: #777;">This is an automated notification from your price-tracking script.</p>
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
      from: `"Udemy Discount Alert" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: "📉 Udemy Price Drop Alert",
      text: "Some courses are now cheaper than your max price.",
      html: htmlContent,
    };

    try {
      let info = await transporter.sendMail(mailOptions);
      console.log("📧 Email sent:", info.messageId);
    } catch (error) {
      console.error("Error at sending email:", error);
    }
  }

  sendMail();
})();
