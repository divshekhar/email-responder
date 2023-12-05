import express from "express";
import { getGoogleAuthURL, oauth2Client } from "./utils/gmail";
import { autoReplyService } from "./service/autoReply";
import EventEmitter from "events";
import { GetAccountData } from "./utils/file";
import { DataStore } from "./utils/datastore";
import { homedir } from "os";

const app = express();
const PORT = 4000;
const filePath = `${homedir}/auto-respond/cred.json`;

const eventEmitter = new EventEmitter();
const datastore = new DataStore(filePath);

// register event
/**
 * can be improved to deal with multiple email accounts
 * by putting the event listener in a loop and the emitted
 * event should pass email as argument for identification
 * basically spawninng multiple service for each account
 */
eventEmitter.on(`start_autoreply_service`, () => {
  const data = datastore.getData();
  // core logic
  autoReplyService(data[0], {
    labelName: "auto-replied",
    maxInterval: 45,
    minInterval: 120,
  });
});

app.get("/logout", async (req, res) => {
  const data = datastore.getData();

  if (data.length === 0) {
    return res.status(404).json({ status: "Account not found" });
  }

  const { refreshToken, email } = data[0];
  await oauth2Client.revokeToken(refreshToken);
  if (email) {
    datastore.deleteAccount(email);
  }

  console.log("Logged out!");
  return res.status(200).json({ status: "logged out!" });
});

app.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ status: "token is required" });

  const { tokens } = await oauth2Client.getToken(String(code));

  // deal with duplicate accounts
  if (!tokens.refresh_token) {
    console.log("Account already added!", "Logout using following: https://localhost:4000/logout");

    eventEmitter.emit("start_autoreply_service");
    return res.status(409).json({ status: "account already added!" });
  }

  const mailboxDetails = await oauth2Client.getTokenInfo(tokens.access_token || "");

  // save refresh token and email
  datastore.addNewAccount({
    email: mailboxDetails.email,
    refreshToken: tokens.refresh_token,
  });

  /**
   * can be improved to deal with multiple email accounts
   * by putting the event listener in a loop and the emitted
   * event should pass email as argument for identification
   * ex: eventEmitter.emit(`start_autoreply_service`,mailboxDetails.email);
   */
  console.log("Logged in!");
  eventEmitter.emit(`start_autoreply_service`);

  return res.json({ status: "logged in!" });
});

app.listen(PORT, () => {
  console.log(`listening at ${PORT}\n`);

  let data = GetAccountData();

  if (data.length === 0) {
    console.log("Login into google account using following link:");
    const authLink = getGoogleAuthURL();
    console.log(authLink);
  } else {
    eventEmitter.emit("start_autoreply_service");
  }
});
