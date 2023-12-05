import { T_AccountData } from "../service/autoReply";
import {
  createFileIfNotExists,
  loadJsonFromFile,
  saveJsonToFile,
} from "./file";

export class DataStore {
  private filePath;
  private data: T_AccountData[];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = [];

    try {
      createFileIfNotExists(filePath);
      this.data = loadJsonFromFile(filePath);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  addNewAccount(accoutData: T_AccountData) {
    this.data.push(accoutData);
    this.saveData();
  }

  getAccountByEmail(email: string) {
    const data = this.data.filter((data) => data.email === email);
    return data[0] || null;
  }

  getData() {
    return this.data;
  }

  deleteAccount(email: string) {
    this.data = this.data.filter((account) => account.email !== email);
    this.saveData();
  }

  saveData() {
    saveJsonToFile(this.filePath, this.data);
  }
}
