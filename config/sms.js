import twilio from "twilio";
import logger from "./logger.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  logger.warn("Twilio environment variables are not fully set.");
}

const client = twilio(accountSid, authToken);

export { client, fromNumber };

