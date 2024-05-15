const readline = require('node:readline');
const util = require('node:util');

module.exports = class Tester {
  constructor() {
    console.log("----- Rainlink testing program v1.0 -----")
    this.count = 0
    this.pass = 0
    this.failed = 0
  }

  debug(logs) {
    const finalString = typeof logs == "object" ? util.inspect(logs) : util.inspect(logs).slice(1, -1)
    console.log(finalString)
  }

  printSummary() {
    const passPercent = ((this.pass / this.count) * 100).toFixed(0)
    const failedPercent = ((this.failed / this.count) * 100).toFixed(0)
    this.debug(`----- ${this.pass} tests passed, ${this.failed} tests failed. ${passPercent}% pass. ${failedPercent}% fail. -----`)
  }

  async testCase(title, targetFunction, expected) {
    this.count = this.count + 1
    try {
      const data = await targetFunction()
      if (data === "localPass") {
        this.debug(`PASS   | #${this.count}. ${title}`)
        this.pass = this.pass + 1
        return true
      }
      if (data !== expected) {
        this.debug(`!FAIL! | #${this.count}. ${title} | Expected: ${expected} | Actural: ${data}`)
        this.failed = this.failed + 1
        return false
      }
      this.debug(`PASS   | #${this.count}. ${title}`)
      this.pass = this.pass + 1
      return true
    } catch (err) {
      this.debug(`!FAIL! | #${this.count}. ${title} | error logs:`)
      this.failed = this.failed + 1
      console.error(err)
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