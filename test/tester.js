const readline = require('node:readline');
const util = require('node:util');

module.exports = class Tester {
  constructor() {
    console.log("----- Rainlink testing program v1.0 -----")
  }

  debug(logs) {
    const finalString = typeof logs == "object" ? util.inspect(logs) : util.inspect(logs).slice(1, -1)
    console.log("[Tester]: " + finalString)
  }

  async testCase(title, targetFunction, expected) {
    this.debug(`TESTING  | ${title}`)
    try {
      const data = await targetFunction()
      if (data === "localPass") {
        this.debug(`PASSED   | ${title}`)
        return false
      }
      if (data !== expected) {
        this.debug(`<FAILED> | ${title} | Expected: ${expected} | Actural: ${data}`)
        return false
      }
      this.debug(`PASSED   | ${title}`)
      return true
    } catch (err) {
      this.debug(`<FAILED> | ${title} | error logs:`)
      console.error(err)
      process.exit()
    }
  }

  input(question) {
    const shell = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    return new Promise((resolve) => this._inputPromiseLogic(shell, question, resolve))
  }

  _inputPromiseLogic(shell, question, resolve) {
    shell.question(question, data => {
      resolve(data)
      shell.close();
    })
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}