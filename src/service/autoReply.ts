import { gmail_v1 } from "googleapis";
import {
  CheckPriorResponse,
  GetThreadDetails,
  SendReplyToThread,
  createLabel,
  getLabel,
  getUserEmailThreads,
  setThreadLabel,
} from "../utils/gmail";

export type T_AccountData = {
  email?: string;
  refreshToken: string;
};

export type T_AutoReplyServiceConfig = {
  minInterval: number;
  maxInterval: number;
  labelName: string;
};

const autoReply = async (
  accountDetails: T_AccountData,
  label: gmail_v1.Schema$Label,
  config: T_AutoReplyServiceConfig
) => {
  console.log("> Reading email threads");

  const threads = await getUserEmailThreads(accountDetails.refreshToken);

  console.log(`> Theads found = ${threads.length}`);

  const replyActionPromise = threads.map(async (thread) => {
    if (!thread.id) return false;

    // get thread messages
    console.log(`[Thread ${thread.id}]> Getting messages`);
    const threadDetails = await GetThreadDetails(thread.id, accountDetails.refreshToken);

    const lastMessageDate = threadDetails.messages ? threadDetails.messages[0]?.internalDate : "";

    // check if the time is within 1 hours
    const lastMessageDateObj = new Date(Number(lastMessageDate));
    const currentTime = new Date();
    const diff = currentTime.getTime() - lastMessageDateObj.getTime();
    const diffInHours = diff / (1000 * 3600);
    console.log(`[Thread ${thread.id}]> diff in hours = ${diffInHours}`);

    if (diffInHours > 1) {
      console.log(`[Thread ${thread.id}]> last message is older than 1 hour! skipping!`);
      return false;
    }

    // check if not labled as auto-replied
    const threadLabels = threadDetails.messages ? threadDetails.messages[0]?.labelIds : [];

    if (threadLabels?.includes(config.labelName)) {
      console.log(`[Thread ${thread.id}]> already replied! skipping!`);
      return false;
    }

    // check for prior replies
    console.log(`[Thread ${thread.id}]> checking prior response`);
    const hasPriorReplies = CheckPriorResponse(threadDetails, accountDetails.email || "");

    if (!hasPriorReplies) {
      console.log(`[Thread ${thread.id}]> Sending reply`);
      await SendReplyToThread(
        accountDetails.email || "",
        threadDetails,
        accountDetails.refreshToken
      );

      console.log(`[Thread ${thread.id}]> Adding label`);

      if (!label) return false;
      await setThreadLabel(label, threadDetails, accountDetails.refreshToken);

      return true;
    }

    return false;
  });

  // wait for all of them to finish
  await Promise.all(replyActionPromise);
};

export const autoReplyService = async (
  accountDetails: T_AccountData,
  config?: T_AutoReplyServiceConfig
) => {
  console.log("> Auto reply service started...");

  const serviceConfig = {
    ...config,
    ...{ minInterval: 45, maxInterval: 120, labelName: "auto-replied" },
  };

  const randomDelay =
    Math.floor(
      Math.random() * (serviceConfig.maxInterval - serviceConfig.minInterval + 1) +
        serviceConfig.minInterval
    ) * 1000;

  console.log(`> Interval = ${randomDelay / 1000} sec`);

  const { refreshToken, email } = accountDetails;

  if (!email) {
    console.log("> [skip] User email not found!");
    return;
  }

  try {
    // check if lables exists, if not create one
    // why this logic here? to avoid race condition inside loop
    console.log(`> checking label availability`);
    let label = await getLabel(serviceConfig.labelName, refreshToken);

    if (!label) {
      console.log("> label not found!");
      console.log("> creating label");
      label = await createLabel(serviceConfig.labelName, refreshToken);
    }

    while (true) {
      await autoReply(accountDetails, label, serviceConfig);
      console.log(`> done!\n\n`);
      await new Promise((resolve) => setTimeout(resolve, randomDelay));
    }
  } catch (err) {
    console.log(`> Auto Reply Service <${accountDetails.email}>\n`, err);
  }
};
