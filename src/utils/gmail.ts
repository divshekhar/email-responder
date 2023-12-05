/**
 * contains all the remail related utilites
 */
import { gmail } from "@googleapis/gmail";
import { gmail_v1, google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

export const oauth2Client = new google.auth.OAuth2({
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  redirectUri: "http://localhost:4000/google/callback",
});

export function getGoogleAuthURL() {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
}

const gmailClient = gmail({ version: "v1" });

export const getLabel = async (lableName: string, refreshToken: string) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const labelsRes = await gmailClient.users.labels.list({
    userId: "me",
    auth: oauth2Client,
  });

  const labels = labelsRes.data.labels || [];

  let label = labels.find(
    (label) => label.name?.toLocaleLowerCase() === lableName.toLocaleLowerCase()
  );

  return label;
};

export const createLabel = async (labelName: string, refreshToken: string) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const res = await gmailClient.users.labels.create({
    auth: oauth2Client,
    userId: "me",
    requestBody: {
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
      name: labelName,
    },
  });

  return res.data;
};

export const setThreadLabel = async (
  label: gmail_v1.Schema$Label,
  thread: gmail_v1.Schema$Thread,
  refreshToken: string
) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  if (!thread.messages) {
    console.log("empty thread is provided");
    return;
  }

  const threadId = thread.id;

  if (!threadId) {
    console.log("thead not found");
    return;
  }

  await gmailClient.users.threads.modify({
    auth: oauth2Client,
    userId: "me",
    id: threadId,
    requestBody: {
      addLabelIds: [label.id || ""],
    },
  });
};

export const getUserEmailThreads = async (refreshToken: string) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const res = await gmailClient.users.threads.list({
    auth: oauth2Client,
    userId: "me",
    labelIds: ["INBOX"],
    q: "is:unread",
  });

  return res.data.threads || [];
};

export const GetThreadDetails = async (threadId: string, refreshToken: string) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const threadRes = await gmailClient.users.threads.get({
    auth: oauth2Client,
    userId: "me",
    id: threadId,
  });

  return threadRes.data;
};

export const CheckPriorResponse = (thread: gmail_v1.Schema$Thread, emailId: string) => {
  return thread.messages?.some((message) =>
    message.payload?.headers?.some(
      (header) =>
        header.name?.toLowerCase() === "from" && header.value?.toLowerCase().includes(emailId)
    )
  );
};

export const GetEmailSender = (thread: gmail_v1.Schema$Thread) => {
  if (!thread.messages) return null;

  return thread.messages[0].payload?.headers?.find(
    (header) => header.name?.toLowerCase() === "from"
  )?.value;
};

export const GetThreadSubject = (thread: gmail_v1.Schema$Thread) => {
  if (!thread.messages) return null;

  return thread.messages[0].payload?.headers?.find(
    (header) => header.name?.toLowerCase() === "subject"
  )?.value;
};

export const SendReplyToThread = async (
  senderEmailId: string,
  thread: gmail_v1.Schema$Thread,
  refreshToken: string
) => {
  if (!thread.messages) {
    console.log("Empty thread provided");
    return;
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  console.log({ thread });

  const threadId = thread.id;
  const replyMessage = {
    raw: Buffer.from(
      `From: ${senderEmailId}\n` +
        `To: ${GetEmailSender(thread)}\n` +
        `Subject: ${GetThreadSubject(thread)}\n` +
        `In-Reply-To: ${threadId}\n` +
        `References: ${threadId}\n\n` +
        `Thank you for your email. I am currently on vacation 🏖️🏄‍♂️. Will reach back to you soon!`
    ).toString("base64"),
  };

  await gmailClient.users.messages.send({
    auth: oauth2Client,
    userId: "me",
    requestBody: { ...replyMessage, threadId },
  });
};
