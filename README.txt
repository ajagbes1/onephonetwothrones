1 PHONE, 2 THRONES WEBSITE (for Vercel)

Upload this whole folder to Vercel (vercel.com, your project, drop the folder).

Files
  *.html          The pages. Generated: do not edit by hand (see below)
  config.js       The two settings you edit: your Apps Script /exec link and the intro video ID
  vercel.json     Vercel settings (clean URLs, security headers, caching)
  sitemap.xml, robots.txt   For search engines
  assets/         Logo, photos (optimised), CSS, JavaScript, link-preview image, icons

Connect it to your hub
  Open config.js. Paste your Apps Script /exec link between the quotes after APPS_SCRIPT_URL. Save, then upload.
  The hub must have the latest Apps Script files (see P0-NOTES.md and P1-NOTES.md one level up).

To change the pages
  The editable sources are in ../site-src/. After editing run:  node site-src/build.js
  Then upload this folder again. See ../P1-NOTES.md.

Test after uploading
  On your phone: open the home page, tap the menu, join the challenge with a test email,
  send a test message on /contact, and check the rows land in your Sheet.
