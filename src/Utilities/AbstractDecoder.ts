import { RawTrack } from '../Interface/Rest';

/** This class will provide some basic function of a decoder */
export abstract class AbstractDecoder {
  /** The current position of base64 string */
  protected abstract position: number;

  /** The current base64 buffer */
  protected abstract buffer: Buffer;

  /** The current base64 track */
  protected abstract track: string;

  /** Get decoded track function */
  public abstract get getTrack(): RawTrack | null;

  /** Change the current potition in base64 */
  protected changeBytes(bytes: number) {
  	this.position += bytes;
  	return this.position - bytes;
  }

  /** Read the byte on current buffer (some like boolean but only 0 and 1)*/
  protected readByte() {
  	return this.buffer[this.changeBytes(1)];
  }

  /** Read the unsigned 16 bit int (same like number) */
  protected readUnsignedShort() {
  	const result = this.buffer.readUInt16BE(this.changeBytes(2));
  	return result;
  }

  /** Read the unsigned 32 bit int (same like number) */
  protected readInt() {
  	const result = this.buffer.readInt32BE(this.changeBytes(4));
  	return result;
  }

  /** Read the bigint */
  protected readLong() {
  	const msb: bigint = BigInt(this.readInt());
  	const lsb: bigint = BigInt(this.readInt());

  	return msb * BigInt(2 ** 32) + lsb;
  }

  protected readUTF() {
  	const len = this.readUnsignedShort();
  	const start = this.changeBytes(Number(len));
  	const result = this.buffer.toString('utf8', start, Number(start) + Number(len));
  	return result;
  }
}
