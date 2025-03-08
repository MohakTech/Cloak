import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generateNonce, SiweMessage } from 'siwe';
import rateLimit from 'express-rate-limit';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey'; // Secure this in production

// Define a custom interface for the decoded token
interface DecodedToken extends JwtPayload {
  address: string; // Ensure 'address' is included
}

app.use(cors({
  origin: process.env.BASE_URL!,
  credentials: true, // Allow cookies
}));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// 🔥 Rate limiting to prevent spam attacks
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 requests per minute per IP
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/auth/nonce", limiter);
app.use("/api/auth/verify", limiter);

// 🛡️ Store sessions in a secure signed cookie
app.get('/api/auth/nonce', (req, res) => {
  const nonce = generateNonce();
  res.status(200).json({ nonce });
});

// 🔐 Verify SIWE signature and create session

app.post('/api/auth/verify', async (req, res) => {
  const { message, signature } = req.body;

  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      res.status(400).json({ error: "Signature verification failed" });
      return;
    }

    const address = result.data.address;
    console.log("User authenticated:", address);

    // 🔥 Generate JWT token
    const token = jwt.sign({ address }, SECRET_KEY, { expiresIn: '1h' });

    // 🔥 Set JWT as a secure HTTP-only cookie
    res.cookie("auth_token", token, {
      httpOnly: true, // Prevents XSS
      secure: process.env.NODE_ENV === "production", // Only allow HTTPS in production
      sameSite: "strict", // CSRF protection
    });

    res.status(200).json({ ok: true, address });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 🔐 Get authenticated user session
app.get('/me', (req, res) => {
  const token = req.cookies?.auth_token; // 🔥 Read cookie properly

  if (!token) {
    res.status(401).json({ error: "User not logged in" }); // 🔥 If no token, user is not authenticated
    return
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as DecodedToken
    res.status(200).json({ address: decoded.address }); // 🔥 Return Ethereum address if authenticated
  } catch (error) {
    res.status(401).json({ error: "Invalid session" }); // 🔥 Invalid token (expired or tampered)
  }
});


// 🚪 Logout and clear session
app.post('/api/auth/logout', (req, res) => {
  console.log("Signing out");
  res.clearCookie("auth_token");
  res.status(200).json({ ok: true });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Auth Server running at: http://localhost:${PORT}`);
});
