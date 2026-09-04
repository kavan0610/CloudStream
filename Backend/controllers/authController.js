const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const handleGoogleLogin = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    // 1. Exchange the secure code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'postmessage' // Crucial for @react-oauth/google integration
    });

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    // 2. Decode the id_token to get user info securely in Node.js
    const base64Payload = id_token.split('.')[1];
    const jsonPayload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    const userData = JSON.parse(jsonPayload);

    // 3. The "Find or Create" Microservice Logic
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!user) {
      console.log("New user detected. Creating account...");
      user = await prisma.user.create({
        data: {
          googleId: userData.sub,
          email: userData.email,
          name: userData.name,
          refreshToken: refresh_token // Save the permanent refresh token
        }
      });
      
      // Automatically create a default playlist for new users
      await prisma.playlist.create({
        data: {
          userId: user.id,
          name: "Favorites",
          coverImage: "bg-gradient-to-br from-indigo-500 to-purple-500"
        }
      });
    } else {
      console.log(`Existing user logged in: ${user.email}`);
      // If the user already exists but Google gave us a new refresh token, update it
      if (refresh_token) {
        user = await prisma.user.update({
          where: { email: userData.email },
          data: { refreshToken: refresh_token }
        });
      }
    }

    // 4. Return the user data and the initial access token to the frontend
    res.status(200).json({ message: 'Success', user, accessToken: access_token });

  } catch (error) {
    console.error("Auth Controller Error:", error.response?.data || error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const refreshGoogleToken = async (req, res) => {
  const { userId } = req.body;

  try {
    // 1. Find the user and their permanent refresh token
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      return res.status(400).json({ error: "No refresh token found for this user." });
    }

    // 2. Ask Google for a brand new Access Token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,         // Ensure these are in your .env
      client_secret: process.env.GOOGLE_CLIENT_SECRET, // Ensure these are in your .env
      refresh_token: user.refreshToken,
      grant_type: 'refresh_token'
    });

    const newAccessToken = response.data.access_token;

    // 3. Send the new token back to the frontend
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Failed to refresh token:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
};

// Add this new function to your auth controller
const loginDemo = async (req, res) => {
  try {
    // 1. Find the specific demo account you created
    const demoUser = await prisma.user.findUnique({ 
      where: { email: 'cloudstream.kavan@gmail.com' } 
    });

    if (!demoUser || !demoUser.refreshToken) {
      return res.status(400).json({ error: "Demo account is not configured properly." });
    }

    // 2. Ask Google for a fresh 1-hour access token so the music actually plays
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: demoUser.refreshToken,
      grant_type: 'refresh_token'
    });

    // 3. Send the user straight to the dashboard!
    res.status(200).json({ 
      message: 'Demo Login Success', 
      user: demoUser, 
      accessToken: response.data.access_token 
    });

  } catch (error) {
    console.error("Demo login failed:", error);
    res.status(500).json({ error: 'Demo login failed' });
  }
};

module.exports = { handleGoogleLogin, refreshGoogleToken, loginDemo };