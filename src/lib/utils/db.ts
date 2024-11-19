import { customType, integer } from 'drizzle-orm/sqlite-core';

export const sqliteTimestamp = {
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
};

function uint8ArrayToHex(array: Uint8Array): string {
	return Array.from(array)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function hexToUint8Array(hex: string): Uint8Array {
	const length = hex.length / 2;
	const array = new Uint8Array(length);
	for (let i = 0; i < length; i++) {
		array[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return array;
}

export const sqliteCustomUint8Array = customType<{ data: Uint8Array; driverData: string }>({
	dataType() {
		return 'text';
	},
	fromDriver(data: string): Uint8Array {
		return hexToUint8Array(data);
	},
	toDriver(data: Uint8Array): string {
		return uint8ArrayToHex(data);
	}
});
