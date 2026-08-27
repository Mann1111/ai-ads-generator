#!/usr/bin/env node
// Manual test helper: generate an access code for a given order id, using
// the same ACCESS_SECRET the running server uses. Useful for testing the
// gate end-to-end before the PHP store side is wired up.
//
// Usage:  ACCESS_SECRET=xxxx node scripts/gen-code.js order-123
// dotenv MUST be imported before accessCode.js — accessCode.js reads
// process.env.ACCESS_SECRET at module-evaluation time, and ES module imports
// evaluate in source order, so loading dotenv second would capture an empty
// secret even with a valid .env file present.
import "dotenv/config";
import { generateAccessCode } from "../src/lib/accessCode.js";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: node scripts/gen-code.js <orderId>");
  process.exit(1);
}

try {
  console.log(generateAccessCode(orderId));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
