# 📉 Udemy Price Tracker with Email Alerts

*A lightweight Node.js script that monitors Udemy course prices and sends email alerts when prices drop below a custom threshold.*

I’m passionate about continuous learning and always eager to discover new Udemy courses to broaden my knowledge 📚✨. The challenge is that great discounts pop up frequently, but keeping track of them manually can be tedious and time-consuming ⏳🔍.
That’s why I created this little script — to automate price tracking and save time ⏱️🤖. Along the way, I realized it’s a solid beginner project with plenty of room to scale and add features 🚀. Plus, it might be useful for others who want to catch the best deals without the effort 🎉👍.


## ✨ Features

- Monitors multiple Udemy courses using Puppeteer
- Sends email notifications only when a course's price is under a specified maximum
- Configurable recipient, sender, and course list
- Headless browser for efficient scraping
- Easy to extend or deploy


## 📦 Requirements

- Node.js (v16 or higher recommended)
- A Gmail account with an App Password (for sending emails if you're using a Gmail account)
- `puppeteer-extra` and `puppeteer-extra-plugin-stealth`
- `dotenv` for configuration management


## 🚀 Installation

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/udemy-price-tracker.git
cd udemy-price-tracker
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create a .env file:**

```bash
touch .env
nano .env
```
Insert the following: 
```
EMAIL_FROM=your.email@gmail.com
EMAIL_TO=recipient.email@example.com
APP_PASSWORD=your_gmail_app_password
NAME=your_name
```
You have to have Google 2FA enabled if you are using a gmail account to send emails from in order to get your App Password.

4. **Define your courses list and max prices:**

```js
[
  {
    "url": "https://www.udemy.com/course/complete-networking-fundamentals-course-ccna-start/",
    "maxPrice": 14.99
  },
  {
    "url": "https://www.udemy.com/course/git-and-github-bootcamp/",
    "maxPrice": 11.99
  }
]

```


## 🧠 Usage

Run the script using Node:
```bash
node script.js
```
It will scrape each course URL, check the price, and send an email if any course is below its specified maximum price. 
If you are willing to monitor prices continously, it's best practice to run it in a self-hosted LXC container or a VM with scheduled tasks with **cron** or **Cronicles OS.**

Something like this will be sent to your email: 

![image](https://github.com/user-attachments/assets/1ccc539d-8369-4f45-90bc-6e846753f349)


## ❌ Troubleshooting

If you run into issues running this project, here are the most common problems and how to fix them:

### 1. Puppeteer Browser Launch Failures
- **Error:** `Failed to launch the browser process!`
- **Cause:** Puppeteer’s Chromium needs certain Linux dependencies and proper environment settings to run inside LXC.
- **Fix:**
  - Make sure you have installed all required dependencies:
    ```bash
    apt-get update && apt-get install -y \
      gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
      libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
      libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
      libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
      libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
      fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
    ```
  - Disable sandbox mode in Puppeteer launch options:
    ```js
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    ```
  - Ensure your LXC container allows necessary permissions or run the container in privileged mode if possible.
  - You might run into the following error at first run:

  ```bash
  /opt/scripts/udemy-price-checker/udemy-price-checker/node_modules/@puppeteer/browsers/lib/cjs/launch.js:325
                reject(new Error([
                       ^
  Error: Failed to launch the browser process!
  TROUBLESHOOTING: https://pptr.dev/troubleshooting

    at Interface.onClose (/opt/scripts/udemy-price-checker/udemy-price-checker/node_modules/@puppeteer/browsers/lib/cjs/launch.js:325:24)
    at Interface.emit (node:events:529:35)
    at Interface.close (node:internal/readline/interface:534:10)
    at Socket.onend (node:internal/readline/interface:260:10)
    at Socket.emit (node:events:529:35)
    at endReadableNT (node:internal/streams/readable:1400:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)
    ```
    This error can be worked out by installing Chromium separetly: 

    ```bash
    npm i chromium
    ```
    And changing adding the *executablePath* to the launch: 

    ```js
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium', // vagy ahol a chromium van
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    ```

### 2. Memory Issues
- Puppeteer’s Chromium is resource-heavy. Ideally, allocate **at least 2GB of RAM** to your container.
- If you only have 1GB or less, expect instability or crashes.


### 3. Environment Variables & `.env` File
- The project relies on a `.env` file for sensitive credentials (e.g., SMTP username/password).
- Make sure the `.env` file is present in the project root and properly loaded.
- Confirm your container user has permission to read the `.env` file.


### 4. SMTP Authentication Errors
- Error like `Missing credentials for "PLAIN"` means your SMTP config is missing or incorrect.
- Double-check your `.env` contains the right credentials, e.g.:
    ```
    EMAIL_FROM=to_send_from
    EMAIL_TO=to_send_to
    APP_PASSWORD=your_app_password
    ```
- Ensure your email provider supports the SMTP settings you use.
- Ensure you are using the correct port for the certain SMTP server.

---

If after all these steps the script still fails inside your LXC, consider testing on a lightweight VM or a physical machine to isolate LXC-specific issues.


## 📬 Email Preview

The email contains:
- Course name
- Direct URL
- Current price
- Discount status and time left (if applicable)
Emails are styled with clean HTML formatting for better readability.


## 🛠 Future Improvements

As of right now, the script sends an email every time it reads the price and it's lower than the preset `maxPrice`. Later on, I'm planning to implement the functionality of only sending an email when the price is discounted or lower than the previously last known price.
The following are also in the roadmap: 

- Web UI for adding/removing courses and changing thresholds
- Support for multiple platforms (e.g. Coursera, edX)
- Database-backed storage for tracking historical price changes
- Scheduled runs (via cron, PM2, or GitHub Actions)


## 📄 License

This project is open-source under the MIT License.


## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.


## 🧑‍💻 Author

Made by Felix with ❤️ for self-hosting enthusiasts and learners.

