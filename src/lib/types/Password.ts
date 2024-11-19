import { sqliteTimestamp } from '$lib/utils/db.js';
import { primaryKey, text } from 'drizzle-orm/sqlite-core';

export class Password {
	userId: string;
	password: string;
	createdAt?: Date;
	updatedAt?: Date;

	constructor(userId: string, password: string, createdAt?: Date, updatedAt?: Date) {
		this.userId = userId;
		this.password = password;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	static getSqliteColumnsMap(users: any) {
		return {
			userId: text('user_id')
				.notNull()
				.references(() => users.id),
			password: text('password').notNull(),
			...sqliteTimestamp
		};
	}

	static getSqliteColumnsConfig = (t: any) => ({
		pk: primaryKey({ columns: [t.userId, t.password] })
	});
}
