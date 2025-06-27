const nodemailer = require('nodemailer');

// Create a transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Prepares the email options.
 * @param {string} to The recipient's email address.
 * @param {string} subject The subject of the email.
 * @param {string} html The HTML content of the email.
 * @returns {object} The mail options object for nodemailer.
 */
const mailOptions = (to, subject, html) => {
  return {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };
};

// Use module.exports for CommonJS compatibility
module.exports = { transporter, mailOptions };
