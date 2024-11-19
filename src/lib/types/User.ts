import { sqliteTimestamp } from '$lib/utils/db.js';
import { text } from 'drizzle-orm/sqlite-core';

export class User {
	id: string;
	email: string;
	createdAt?: Date;
	updatedAt?: Date;

	constructor(id: string, email: string, createdAt?: Date, updatedAt?: Date) {
		this.id = id;
		this.email = email;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	static getSqliteColumnsMap() {
		return {
			id: text('id').primaryKey(),
			email: text('email').notNull().unique(),
			...sqliteTimestamp
		};
	}

	static getSqliteColumnsConfig = () => ({});
}
