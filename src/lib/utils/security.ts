import { redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';

export function isRedirectPathValid(path: string, origin: string): boolean {
	try {
		const url = new URL(path, origin);
		return url.origin == origin;
	} catch (e) {
		return false;
	}
}

export function safeRedirect(path: string | null | undefined, origin: string) {
	if (!path || !isRedirectPathValid(path, origin)) return redirect(302, '/');
	return redirect(302, path);
}

export function safeRedirectAuto(url: URL) {
	return safeRedirect(url.searchParams.get('redirect'), url.origin);
}

export function passwordEntropy(text: string | undefined): number {
	if (!text) return 0;

	let charset_size = 0;
	if (text.match(/[a-z]/)) {
		charset_size += 26;
	}
	if (text.match(/[A-Z]/)) {
		charset_size += 26;
	}
	if (text.match(/[0-9]/)) {
		charset_size += 10;
	}
	if (text.match(/[^a-zA-Z0-9]/)) {
		charset_size += 33;
	}

	return Math.log2(charset_size ** text.length);
}

export async function hashPassword(password: string): Promise<string> {
	const saltRounds = 10;
	const hashedPassword = await bcrypt.hash(password, saltRounds);
	return hashedPassword;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	return await bcrypt.compare(password, hashedPassword);
}
