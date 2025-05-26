const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer')
const Email = require('./models/Email');

dotenv.config();

const app = express();

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Abm13abm13@';

// Middleware
app.use(cors({ origin : '*' }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// POST route to save email
app.post('/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const newEmail = new Email({ email });
    await newEmail.save();
    res.status(201).json({ message: 'Email subscribed successfully!' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already exists!' });
    }
    res.status(500).json({ error: 'Something went wrong !' });
  }
});

app.post('/admin/emails', async (req, res) => {
  const { username, password } = req.body;

  // Check hardcoded admin credentials
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }

  try {
    const emails = await Email.find().sort({ createdAt: -1 }); // Optional: sort by latest
    res.status(200).json(emails);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});


// ✅ Route to receive a message and send it to all stored emails
app.post('/send-to-all', async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  try {
    // Get all emails
    const emails = await Email.find({}, 'email');
    const emailList = emails.map(entry => entry.email);

    // Setup mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send emails
    const sendEmailPromises = emailList.map(email =>
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        text: message,
      })
    );

    await Promise.all(sendEmailPromises);

    res.status(200).json({ message: 'Emails sent successfully to all subscribers.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
