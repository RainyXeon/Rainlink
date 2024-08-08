import { RainlinkSearchOptions, RainlinkSearchResult } from '../Interface/Manager'
import { RainlinkPlugin } from './RainlinkPlugin'

/** The interface class for track resolver plugin, extend it to use */
export class SourceRainlinkPlugin extends RainlinkPlugin {
	/**
   * sourceName function for source plugin register search engine.
   * This will make plugin avalible to search when set the source to default source
   * @returns string
   */
	public sourceName(): string {
		throw new Error('Source plugin must implement sourceName() and return as string')
	}

	/**
   * sourceIdentify function for source plugin register search engine.
   * This will make plugin avalible to search when set the source to default source
   * @returns string
   */
	public sourceIdentify(): string {
		throw new Error('Source plugin must implement sourceIdentify() and return as string')
	}

	/**
   * directSearchChecker function for checking if query have direct search param.
   * @returns boolean
   */
	public directSearchChecker(query: string): boolean {
		const directSearchRegex = /directSearch=(.*)/
		const isDirectSearch = directSearchRegex.exec(query)
		return isDirectSearch == null
	}

	/**
   * searchDirect function for source plugin search directly without fallback.
   * This will avoid overlaps in search function
   * @returns RainlinkSearchResult
   */
	public async searchDirect(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		query: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		options?: RainlinkSearchOptions
	): Promise<RainlinkSearchResult> {
		throw new Error('Source plugin must implement sourceIdentify() and return as string')
	}
}
