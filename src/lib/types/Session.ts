import { sqliteTimestamp } from '$lib/utils/db.js';
import { integer, text, type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';

export class Session {
	id: string;
	userId: string;
	expiresAt: Date;
	createdAt?: Date;
	updatedAt?: Date;

	constructor(id: string, userId: string, expiresAt: Date, createdAt?: Date, updatedAt?: Date) {
		this.id = id;
		this.userId = userId;
		this.expiresAt = expiresAt;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	static getSqliteColumnsMap(users: SQLiteTableWithColumns<any>) {
		return {
			id: text('id').primaryKey(),
			userId: text('user_id')
				.notNull()
				.references(() => users.id),
			expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
			...sqliteTimestamp
		};
	}

	static getSqliteColumnsConfig = () => ({});
}
