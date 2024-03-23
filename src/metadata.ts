import fs from 'node:fs';

/** @ignore */
const packageFileData = JSON.parse(fs.readFileSync('../package.json', { encoding: 'utf-8' }));

/** @ignore */
export const metadata = {
	name: packageFileData.name as string,
	version: packageFileData.version as string,
	github: packageFileData.repository.url as string,
};
