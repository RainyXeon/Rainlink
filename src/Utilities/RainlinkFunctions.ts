import { RainlinkDatabase } from './RainlinkDatabase'

export class RainlinkFunctions extends RainlinkDatabase<(...args: any) => unknown> {
	/**
   * Function to execute custom function
   * @param commandName Function name
   * @param args Function args
   */
	public async exec<D = unknown>(commandName: string, ...args: unknown[]): Promise<D | undefined> {
		const func = super.get(commandName)
		if (!func) return undefined
		const getData = (await func(...args)) as D
		return getData
	}
}
