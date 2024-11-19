import { encodeBase32LowerCase } from '@oslojs/encoding';

export function validateEmail(email: unknown): email is string {
	return (
		typeof email === 'string' &&
		email.length >= 3 &&
		email.length <= 255 &&
		/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)
	);
}

export function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

export function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 8 && password.length <= 255;
}

export function generateUserId() {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}
