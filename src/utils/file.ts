/**
 * utilites related to file handling are here
 */
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import * as path from "path";
import { homedir } from "os";
import { T_AccountData } from "../service/autoReply";

const filePath = `${homedir}/auto-respond/cred.json`;

export const GetAccountData = (): T_AccountData[] => {
  createFileIfNotExists(filePath);
  return loadJsonFromFile(filePath);
};

export const createFileIfNotExists = (filePath: string) => {
  try {
    const directory = path.dirname(filePath);
    // Check if the file exists
    if (existsSync(filePath)) {
      return;
    }

    // Create the parent directory if it doesn't exist
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    // Create the file
    writeFileSync(filePath, JSON.stringify([], null, 2), "utf8");
  } catch (error) {
    console.error("Error checking file availability:", error);
  }
};

export const loadJsonFromFile = (filePath: string) => {
  try {
    const fileData = readFileSync(filePath, "utf8");
    const data = JSON.parse(fileData);
    return data;
  } catch (error) {
    console.error("Error loading data:", error);
  }
};

export const saveJsonToFile = (filePath: string, data: T_AccountData[]) => {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    writeFileSync(filePath, jsonData, "utf8");
  } catch (error) {
    console.error("Error saving data:", error);
  }
};
