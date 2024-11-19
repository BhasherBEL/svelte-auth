import { sqliteCustomUint8Array, sqliteTimestamp } from '$lib/utils/db.js';
import { integer, text, unique, type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';

export type tempPasskey = {
	id: string;
	publicKey: Uint8Array;
	counter: number;
	webauthnUserId: string;
};

export class Passkey {
	id: string;
	userId: string;
	publicKey: Uint8Array;
	webauthnUserId: string;
	counter: number;
	primaryFactor: boolean;
	createdAt?: Date;
	updatedAt?: Date;

	constructor(
		id: string,
		userId: string,
		publicKey: Uint8Array,
		webauthnUserId: string,
		counter: number,
		primaryFactor: boolean,
		createdAt?: Date,
		updatedAt?: Date
	) {
		this.id = id;
		this.userId = userId;
		this.publicKey = publicKey;
		this.webauthnUserId = webauthnUserId;
		this.counter = counter;
		this.primaryFactor = primaryFactor;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	static getSqliteColumnsMap(users: SQLiteTableWithColumns<any>) {
		return {
			id: text('id').primaryKey(),
			userId: text('user_id')
				.notNull()
				.references(() => users.id),
			publicKey: sqliteCustomUint8Array('public_key').notNull(),
			webauthnUserId: text('webauthn_user_id').notNull(),
			counter: integer('counter').notNull(),
			...sqliteTimestamp
		};
	}

	static getSqliteColumnsConfig = (t: any) => ({ unq: unique().on(t.userId, t.webauthnUserId) });
}
