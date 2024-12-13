# Svelte-auth

Svelte-auth is an opinionated svelte-kit library to handle auth easily. It incorporates an existing database architecture. It requires svelte 5 and sqlite/[libsql](https://github.com/tursodatabase/libsql) with [drizzle-orm](https://github.com/drizzle-team/drizzle-orm).

## Features

- email-password authentication
- passkey authentication (with email for registration)
- sessions management

## Planned features

- MFA
- Backup codes

## Usage

### Initialization

The authentication must be initialized somewhere and be accessible to the rest of the back-end. It's also possible to configure the name of session's cookies and passkeys' settings.

```ts
# auth.ts

import { Auth } from '@bhasher/svelte-auth';
import { db } from '$lib/server/db';
import * as types from '$lib/server/db/schema';

export default new Auth(db, types, 'session', { 
	name: 'my-app',
	id: 'localhost',
	origin: 'http://localhost:5173',
    requireUserVerification: false  # Optional
});
```

### Schemes

Each type has two functions to simplify database setup: `getSqliteColumnsMap(...)` and `getSqliteColumnsConfig`. 

The databases schemes can then be initialized very easily, depending on the needs. For technical limitations, the schemes cannot be renamed, and no mandatory fields can be added.

```ts
schema.ts

export const users = sqliteTable('users', User.getSqliteColumnsMap(), User.getSqliteColumnsConfig);
export const sessions = sqliteTable( 'sessions', Session.getSqliteColumnsMap(users), Session.getSqliteColumnsConfig);

# Optional
export const passwords = sqliteTable( 'passwords', Password.getSqliteColumnsMap(users), Password.getSqliteColumnsConfig);

# Optional
export const passkeys = sqliteTable( 'passkeys', Passkey.getSqliteColumnsMap(users), Passkey.getSqliteColumnsConfig);
```

It's also possible to define relations.

```ts
export const usersRelations = relations(users, ({ many, one }) => ({
    ...
    password: one(passwords, {
        fields: [users.id],
        references: [passwords.userId]
    }),
    passkeys: many(passkeys)
}));

export const passskeysRelations = relations(passkeys, ({ one }) => ({
	user: one(users, {
		fields: [passkeys.userId],
		references: [users.id]
	})
}));
```
### Flows

#### Registration with email and password

```ts
const userId = await auth.registerUser(email);
await auth.registerPassword(userId, password);
# Optional
await auth.initSession(cookies, userId);
```

#### Registration with email and passkey

```ts
# Step 1
return await auth.getRegisterPasskeyOptions(email));

# Step 2
const passkey = await auth.verifyRegisterPasskeyResponse(email, response);
const userId = await auth.registerUser(email);
await auth.savePasskey(passkey, userId);
# Optional
await auth.initSession(cookies, userId);
```

#### Login with email and password

```ts
const userId = await auth.loginPassword(email, password);
# Optional
await auth.initSession(cookies, userId);
```

#### Login with passkey
```ts
# Step 1
return await auth.getLoginPasskeyOptions();

#Step 2
const userId = await auth.verifyLoginPasskeyResponse(rid, response);
#Optional
await auth.initSession(cookies, userId);
```

### Components

To use the tailwind of the library, you have to edit the `tailwind.config.ts`:

```
export default {
	content: [
        ...
        './node_modules/@bhasher/**/*.{html,js,svelte,ts}'
    ],
}
```
