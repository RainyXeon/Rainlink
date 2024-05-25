import { RawTrack } from '../Interface/Rest';
import { AbstractDecoder } from './AbstractDecoder';

export class LavalinkDecoder extends AbstractDecoder {
	/** The current position of base64 string */
	protected position = 0;
	/** The current base64 buffer */
	protected buffer: Buffer;
	/** The current base64 track */
	protected track: string;

	constructor(track: string) {
		super();
		this.track = track;
		this.buffer = Buffer.from(track, 'base64');
	}

	/** Get the decoded track with version detector */
	get getTrack(): RawTrack | null {
		try {
			const isVersioned = (((this.readInt() & 0xc0000000) >> 30) & 1) !== 0;
			const version = isVersioned ? Number(this.readByte()) : 1;

			switch (version) {
			case 1:
				return this.trackVersionOne;
			case 2:
				return this.trackVersionTwo;
			case 3:
				return this.trackVersionThree;
			default:
				return null;
			}
		} catch {
			return null;
		}
	}

	/** Get the decoded track with version 1 */
	get trackVersionOne(): RawTrack | null {
		try {
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(),
					author: this.readUTF(),
					length: Number(this.readLong()),
					identifier: this.readUTF(),
					isSeekable: true,
					isStream: !!this.readByte(),
					uri: null,
					artworkUrl: null,
					isrc: null,
					sourceName: this.readUTF().toLowerCase(),
					position: Number(this.readLong()),
				},
				pluginInfo: {},
			};
		} catch {
			return null;
		}
	}

	/** Get the decoded track with version 2 */
	get trackVersionTwo(): RawTrack | null {
		try {
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(),
					author: this.readUTF(),
					length: Number(this.readLong()),
					identifier: this.readUTF(),
					isSeekable: true,
					isStream: !!this.readByte(),
					uri: this.readByte() ? this.readUTF() : null,
					artworkUrl: null,
					isrc: null,
					sourceName: this.readUTF().toLowerCase(),
					position: Number(this.readLong()),
				},
				pluginInfo: {},
			};
		} catch {
			return null;
		}
	}

	/** Get the decoded track with version 3 */
	get trackVersionThree(): RawTrack | null {
		try {
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(),
					author: this.readUTF(),
					length: Number(this.readLong()),
					identifier: this.readUTF(),
					isSeekable: true,
					isStream: !!this.readByte(),
					uri: this.readByte() ? this.readUTF() : null,
					artworkUrl: this.readByte() ? this.readUTF() : null,
					isrc: this.readByte() ? this.readUTF() : null,
					sourceName: this.readUTF().toLowerCase(),
					position: Number(this.readLong()),
				},
				pluginInfo: {},
			};
		} catch {
			return null;
		}
	}
}
