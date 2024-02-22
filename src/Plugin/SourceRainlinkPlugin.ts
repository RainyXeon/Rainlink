import { RainlinkSearchResult } from '../Interface/Manager';
import { RainlinkSearchOptions } from '../Rainlink';
import { RainlinkPlugin } from './RainlinkPlugin';

export class SourceRainlinkPlugin extends RainlinkPlugin {
  public sourceName(): string {
    throw new Error(
      'Source plugin must implement sourceName() and return as string',
    );
  }

  public sourceIdentify(): string {
    throw new Error(
      'Source plugin must implement sourceIdentify() and return as string',
    );
  }

  public async searchDirect(
    query: string,
    options?: RainlinkSearchOptions,
  ): Promise<RainlinkSearchResult> {
    throw new Error(
      'Source plugin must implement sourceIdentify() and return as string',
    );
  }
}
