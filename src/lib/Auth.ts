import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCase, encodeHexLowerCase } from '@oslojs/encoding';
import type { Session } from './types/Session.js';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server';
import type {
	AuthenticationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON
} from '@simplewebauthn/types';
import { generateUserId, validateEmail, validatePassword } from './utils/users.js';
import type { tempPasskey } from './types/Passkey.js';
import { hashPassword, verifyPassword } from './utils/security.js';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export class Auth {
	_db: LibSQLDatabase<Record<string, any>>;
	_tables: Record<string, any>;
	_sessionCookieName: string;
	_rp?: {
		name: string;
		id: string;
		origin: string | string[];
		requireUserVerification?: boolean;
	};
	_inProgressPasskeyRegistrations = new Map<
		string,
		{ options: PublicKeyCredentialCreationOptionsJSON; expiresAt: Date }
	>();
	_inProgressPasskeyLogins = new Map<
		string,
		{ options: PublicKeyCredentialRequestOptionsJSON; expiresAt: Date }
	>();

	constructor(
		db: LibSQLDatabase<Record<string, any>>,
		tables: Record<string, any>,
		sessionCookieName: string = 'session',
		rp?: typeof this._rp
	) {
		this._db = db;
		this._tables = tables;
		this._sessionCookieName = sessionCookieName;
		this._rp = rp;
	}

	get rp() {
		return this._rp;
	}

	get sessionCookieName() {
		return this._sessionCookieName;
	}

	async initSession(
		cookies: Cookies,
		userId: string,
		expiresAt: Date = new Date(Date.now() + DAY_IN_MS * 7)
	) {
		const token = this._generateSessionToken();
		await this._createSession(token, userId);
		this._setSessionTokenCookie(cookies, token, expiresAt);
	}

	_generateSessionToken() {
		const bytes = crypto.getRandomValues(new Uint8Array(20));
		const token = encodeBase32LowerCase(bytes);
		return token;
	}

	async _createSession(
		token: string,
		userId: string,
		expiresAt: Date = new Date(Date.now() + DAY_IN_MS * 7)
	) {
		const session: Session = {
			id: encodeHexLowerCase(sha256(new TextEncoder().encode(token))),
			userId,
			expiresAt
		};
		await this._db.insert(this._tables.sessions).values(session);

		return session;
	}

	async validateSessionToken(cookies: Cookies, token: string) {
		const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
		const [result] = await this._db
			.select({
				user: this._tables.users,
				session: this._tables.sessions
			})
			.from(this._tables.sessions)
			.innerJoin(this._tables.users, eq(this._tables.sessions.userId, this._tables.users.id))
			.where(eq(this._tables.sessions.id, sessionId));

		if (!result) {
			this._deleteSessionTokenCookie(cookies);
			return { session: null, user: null };
		}
		const { session, user } = result;

		const sessionExpired = Date.now() >= session.expiresAt.getTime();
		if (sessionExpired) {
			await this._db.delete(this._tables.sessions).where(eq(this._tables.sessions.id, session.id));
			this._deleteSessionTokenCookie(cookies);
			return { session: null, user: null };
		}

		const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
		if (renewSession) {
			session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
			await this._db
				.update(this._tables.sessions)
				.set({ expiresAt: session.expiresAt })
				.where(eq(this._tables.sessions.id, session.id));
		}

		if (session) {
			this._setSessionTokenCookie(cookies, token, session.expiresAt);
		} else {
			this._deleteSessionTokenCookie(cookies);
		}
		return { session, user };
	}

	async invalidateSession(cookies: Cookies, sessionId: string) {
		await this._db.delete(this._tables.sessions).where(eq(this._tables.sessions.id, sessionId));
		this._deleteSessionTokenCookie(cookies);
	}

	_setSessionTokenCookie(cookies: Cookies, token: string, expiresAt: Date): void {
		cookies.set(this._sessionCookieName, token, {
			httpOnly: true,
			sameSite: 'lax',
			expires: expiresAt,
			path: '/'
		});
	}

	_deleteSessionTokenCookie(cookies: Cookies): void {
		cookies.set(this._sessionCookieName, '', {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 0,
			path: '/'
		});
	}

	async registerUser(email: string): Promise<string> {
		if (!validateEmail(email)) {
			throw new Error('Invalid email');
		}

		if (!this.checkEmail(email)) {
			throw new Error('Email already registered');
		}

		const id = generateUserId();

		if (!(await this._db.insert(this._tables.users).values({ id, email }).onConflictDoNothing())) {
			throw new Error('Failed to register user');
		}

		return id;
	}

	async registerPassword(userId: string, password: string) {
		if (!validatePassword(password)) {
			throw new Error('Invalid password');
		}

		if (
			await this._db.query.passwords.findFirst({
				where: eq(this._tables.passwords.userId, userId)
			})
		) {
			throw new Error('Password already set');
		}

		const passwordHash = await hashPassword(password);

		await this._db
			.insert(this._tables.passwords)
			.values({
				userId,
				password: passwordHash
			})
			.onConflictDoNothing();
	}

	async loginEmailPassword(email: string, password: string): Promise<string> {
		if (!email || !password) {
			throw new Error('Invalid email or password');
		}

		const user = await this._db.query.users.findFirst({
			where: eq(this._tables.users.email, email)
		});
		if (!user) {
			throw new Error('Invalid email or password');
		}

		return this.loginPassword(user.id, password);
	}

	async loginPassword(userId: string, password: string): Promise<string> {
		const passwordHash = await this._db.query.passwords.findFirst({
			where: eq(this._tables.passwords.userId, userId)
		});
		if (!passwordHash) {
			throw new Error('Invalid email or password');
		}
		const verified = await verifyPassword(password, passwordHash.password);
		if (!verified) {
			throw new Error('Invalid email or password');
		}
		return userId;
	}

	async checkEmail(email: string) {
		return !(await this._db.query.users.findFirst({ where: eq(this._tables.users.email, email) }));
	}

	async getRegisterPasskeyOptions(
		id: string,
		expiresAt: Date = new Date(Date.now() + 5 * 60 * 1000)
	): Promise<PublicKeyCredentialCreationOptionsJSON> {
		if (!this._rp) {
			throw new Error('Passkeys are not enabled');
		}

		if (!id.length) {
			throw new Error('Invalid id');
		}

		const options = await generateRegistrationOptions({
			rpName: this._rp.name,
			rpID: this._rp.id,
			userName: id,
			attestationType: 'none',
			authenticatorSelection: {
				residentKey: 'required',
				userVerification: this._rp.requireUserVerification ? 'required' : 'preferred',
				authenticatorAttachment: 'cross-platform'
			}
		});

		this._inProgressPasskeyRegistrations.set(id, { options, expiresAt });

		return options;
	}

	async verifyRegisterPasskeyResponse(
		id: string,
		response: RegistrationResponseJSON
	): Promise<tempPasskey> {
		if (!this._rp) {
			throw new Error('Passkeys are not enabled');
		}

		if (!id.length) {
			throw new Error('Invalid id');
		}

		const registration = this._inProgressPasskeyRegistrations.get(id);
		if (!registration) {
			throw new Error('No registration in progress');
		}
		this._inProgressPasskeyRegistrations.delete(id);

		if (Date.now() >= registration.expiresAt.getTime()) {
			throw new Error('Registration expired');
		}

		const verification = await verifyRegistrationResponse({
			response: response,
			expectedChallenge: registration.options.challenge,
			expectedOrigin: this._rp.origin,
			expectedRPID: this._rp.id,
			requireUserVerification: this._rp.requireUserVerification ?? false
		});

		const { verified, registrationInfo } = verification;

		if (!verified || !registrationInfo) {
			throw new Error('Registration failed');
		}

		const { credential } = registrationInfo;

		return {
			id: credential.id,
			webauthnUserId: registration.options.user.id,
			publicKey: credential.publicKey,
			counter: credential.counter
		};
	}

	async savePasskey(passkey: tempPasskey, userId: string) {
		await this._db
			.insert(this._tables.passkeys)
			.values({
				...passkey,
				userId: userId
			})
			.onConflictDoNothing();
	}

	async getLoginPasskeyOptions(expiresAt: Date = new Date(Date.now() + 5 * 60 * 1000)): Promise<{
		rid: string;
		options: PublicKeyCredentialRequestOptionsJSON;
	}> {
		if (!this._rp) {
			throw new Error('Passkeys are not enabled');
		}

		const options = await generateAuthenticationOptions({
			rpID: this._rp.id,
			allowCredentials: []
		});

		const rid = this._generateSessionToken();

		this._inProgressPasskeyLogins.set(rid, {
			options,
			expiresAt: expiresAt
		});

		return { rid, options };
	}

	async verifyLoginPasskeyResponse(
		rid: string,
		response: AuthenticationResponseJSON
	): Promise<string> {
		if (!this._rp) {
			throw new Error('Passkeys are not enabled');
		}
		const login = this._inProgressPasskeyLogins.get(rid);
		if (!login) {
			throw new Error('No login in progress');
		}
		this._inProgressPasskeyLogins.delete(rid);
		if (Date.now() >= login.expiresAt.getTime()) {
			throw new Error('Login expired');
		}

		const passkey = await this._db.query.passkeys.findFirst({
			where: eq(this._tables.passkeys.id, response.id)
		});
		if (!passkey) {
			throw new Error('Passkey not found');
		}

		const verification = await verifyAuthenticationResponse({
			response,
			expectedChallenge: login.options.challenge,
			expectedOrigin: this._rp.origin,
			expectedRPID: this._rp.id,
			credential: {
				id: passkey.id,
				publicKey: passkey.publicKey,
				counter: passkey.counter
			},
			requireUserVerification: this._rp.requireUserVerification ?? false
		});

		if (!verification.verified) {
			throw new Error('Verification failed');
		}

		return passkey.userId;
	}
}
