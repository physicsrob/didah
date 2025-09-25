#!/usr/bin/env node

// Create a mock Google JWT token for testing
// This creates a token with the same structure as a Google ID token
// but without a valid signature (which our auth.ts doesn't verify anyway)

const payload = {
  sub: "106157881060500899003",  // User ID from the KV data
  email: "test@example.com",
  name: "Test User",
  picture: "https://example.com/photo.jpg",
  exp: Math.floor(Date.now() / 1000) + 3600  // Expires in 1 hour
};

// Base64 encode (URL-safe)
function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Create a fake JWT (header.payload.signature)
const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const payloadEncoded = base64url(JSON.stringify(payload));
const signature = "fake-signature"; // Our auth doesn't verify signatures

const token = `${header}.${payloadEncoded}.${signature}`;

// Make the request
fetch("http://localhost:3000/api/practice-time", {
  headers: {
    "Authorization": `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("Error:", err);
  });