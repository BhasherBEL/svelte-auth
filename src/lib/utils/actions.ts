import { fail, type RequestEvent } from '@sveltejs/kit';
import { safeRedirectAuto } from './security.js';
import type { Auth } from '$lib/Auth.js';

export let defaultLoginAction = () =>
	async function ({ locals, request, url, fetch }: RequestEvent) {
		if ((locals as any).user) {
			return safeRedirectAuto(url);
		}

		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');
		if (!email || !password) {
			return fail(400, { invalid: true });
		}

		const resp = await fetch('/api/login/passwords', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password })
		});

		if (!resp.ok) {
			return fail(401, { incorrect: true });
		}

		return safeRedirectAuto(url);
	};

export let defaultLogoutAction = (auth: Auth) =>
	async function ({ locals, cookies, url }: RequestEvent) {
		if (!(locals as any).session) {
			return fail(401);
		}

		await auth.invalidateSession(cookies, (locals as any).session.id);

		return safeRedirectAuto(url);
	};
