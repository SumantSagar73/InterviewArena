import { StreamChat } from "stream-chat";
import { StreamClient } from "@stream-io/node-sdk";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("STREAM_API_KEY or STREAM_API_SECRET is missing");
}

export const chatClient = apiKey && apiSecret ? StreamChat.getInstance(apiKey, apiSecret) : null;
export const streamClient = apiKey && apiSecret ? new StreamClient(apiKey, apiSecret) : null;

export const upsertStreamUser = async (userData) => {
  if (!chatClient) {
    console.warn("Stream Chat client not initialized. Skipping user upsert.");
    return;
  }
  try {
    await chatClient.upsertUser(userData);
    console.log("Stream user upserted successfully:", userData);
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const deleteStreamUser = async (userId) => {
  if (!chatClient) {
    console.warn("Stream Chat client not initialized. Skipping user deletion.");
    return;
  }
  try {
    await chatClient.deleteUser(userId);
    console.log("Stream user deleted successfully:", userId);
  } catch (error) {
    console.error("Error deleting the Stream user:", error);
  }
};
