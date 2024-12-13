<script lang="ts">
	import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';
	import PasswordStrength from '$lib/components/PasswordStrength.svelte';
	import { startRegistration } from '@simplewebauthn/browser';
	import { get } from 'svelte/store';

	let { t }: { t: any } = $props();

	let error: string | undefined = $state();

	let step = $state(0);

	let email: string | undefined = $state();
	let password: string | undefined = $state();
	let confirmPassword: string | undefined = $state();

	async function registerPasskey() {
		if (!email) return;

		const optionsResp = await fetch('/api/register/passkeys?' + new URLSearchParams({ email }), {
			redirect: 'follow'
		});

		if (optionsResp.redirected) {
			window.location.href = optionsResp.url;
		}

		if (!optionsResp.ok) {
			error = await optionsResp.text();
			return;
		}

		const optionsJSON: PublicKeyCredentialCreationOptionsJSON = await optionsResp.json();

		let attResp;
		try {
			attResp = await startRegistration({ optionsJSON });
		} catch (e: any) {
			if (e.name === 'InvalidStateError') {
				error = $t('register.error.passkey.already');
			} else if (e.name === 'NotAllowedError') {
				error = $t('register.error.passkey.denied');
			} else {
				error = $t('register.error.passkey.failed');
			}
			console.warn(e);
			return;
		}

		const verificationResp = await fetch('/api/register/passkeys', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ response: attResp, email }),
			redirect: 'follow'
		});

		if (verificationResp.redirected) {
			window.location.href = verificationResp.url;
		}

		const verificationJSON = await verificationResp.json();

		if (!verificationResp.ok) {
			error = verificationJSON.message;
			return;
		}
	}

	async function buttonClick() {
		if (step === 0) {
			if (!email) return;

			step++;
			return;
		} else if (step === 1) {
			if (!email || !password || !confirmPassword) return;
			if (password !== confirmPassword) {
				error = $t('register.error.invalid.confirmPassword');
				return;
			}

			if (password.length < 8) {
				error = $t('register.error.invalid.passwordTooWeak');
				return;
			}
			if (password.length > 256) {
				error = $t('register.error.invalid.passwordTooLong');
				return;
			}

			const resp = await fetch('/api/register/passwords', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password }),
				redirect: 'follow'
			});

			if (resp.redirected) {
				window.location.href = resp.url;
			}

			if (!resp.ok) {
				error = (await resp.json()).message || 'Unknown error';
				return;
			}
		}
	}

	function verifyEmail(email?: string) {
		if (!email) return;
		return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);
	}
</script>

<div
	class="w-full rounded-lg bg-white shadow sm:max-w-md md:mt-0 xl:p-0 dark:border dark:border-gray-700 dark:bg-gray-800"
>
	<div class="relative p-6 sm:p-8">
		<h1 class="mb-8 text-center text-xl font-bold leading-tight tracking-tight md:text-2xl">
			{$t('register.title')}
		</h1>

		{#if error}
			<div
				class="rounded border border-red-600 bg-red-50 p-2 text-center text-red-900 dark:bg-red-900 dark:text-red-200"
			>
				{error}
			</div>
		{/if}
		<div class="space-y-4 md:space-y-6">
			{#if step === 0}
				<div>
					<label for="email" class="mb-2 flex justify-between text-sm font-medium opacity-90">
						<span>{$t('register.email')}</span>
						{#if email && !verifyEmail(email)}
							<span class="text-red-500">{$t('register.error.invalid.email')}</span>
						{/if}
					</label>
					<input type="email" name="email" id="email" class="input-text" bind:value={email} />
				</div>
			{:else if step == 1}
				<button onclick={() => (step = 0)} class="absolute left-8 top-8" aria-label="Back">
					<svg fill="currentColor" class="size-8" viewBox="0 0 24 24">
						<g data-name="Layer 2">
							<g data-name="arrow-back">
								<rect width="24" height="24" transform="rotate(90 12 12)" opacity="0" />

								<path
									d="M19 11H7.14l3.63-4.36a1 1 0 1 0-1.54-1.28l-5 6a1.19 1.19 0 0 0-.09.15c0 .05 0 .08-.07.13A1 1 0 0 0 4 12a1 1 0 0 0 .07.36c0 .05 0 .08.07.13a1.19 1.19 0 0 0 .09.15l5 6A1 1 0 0 0 10 19a1 1 0 0 0 .64-.23 1 1 0 0 0 .13-1.41L7.14 13H19a1 1 0 0 0 0-2z"
								/>
							</g>
						</g>
					</svg>
				</button>
				<div class="flex flex-col">
					<button
						class="h-10 rounded border border-slate-300 p-2 text-sm opacity-80"
						onclick={registerPasskey}
					>
						{$t('register.passkey')}
					</button>
				</div>
				<div class="relative flex items-center">
					<div class="flex-grow border-t border-gray-400"></div>
					<span class="mx-4 flex-shrink text-gray-400">{$t('common.word.or')}</span>
					<div class="flex-grow border-t border-gray-400"></div>
				</div>
				<div>
					<label for="password" class="mb-2 flex justify-between text-sm font-medium opacity-90">
						<span>
							{$t('register.password')}
						</span>
						{#if password}
							<PasswordStrength {password} {t} />
						{/if}
					</label>
					<input
						type="password"
						name="password"
						id="password"
						class="input-text"
						bind:value={password}
					/>
				</div>
				<div>
					<label
						for="confirm-password"
						class="mb-2 flex justify-between text-sm font-medium opacity-90"
					>
						<span>{$t('register.confirmPassword')}</span>
						{#if password && confirmPassword && password !== confirmPassword}
							<span class="text-red-500">{$t('register.passwordMismatch')}</span>
						{/if}
					</label>
					<input
						type="password"
						name="confirm-password"
						id="confirm-password"
						class="input-text"
						bind:value={confirmPassword}
					/>
				</div>
			{/if}
			<button
				class="bg-action-zone focus:ring-primary-300 hover:enabled:bg-primary-700 dark:bg-action-zone-dark dark:focus:ring-primary-800 dark:enabled:hover:bg-primary-700 w-full rounded-lg border border-transparent px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4 disabled:opacity-30"
				onclick={buttonClick}
				disabled={(step === 0 && !verifyEmail(email)) ||
					(step === 1 && (!password || !confirmPassword))}
			>
				{#if step === 1}
					{$t('register.button.register')}
				{:else}
					{$t('register.button.next')}
				{/if}
			</button>
			<p class="text-sm font-light">
				{$t('register.login.pre')}
				<a
					href="/login"
					class="text-action-text dark:text-action-text-dark font-medium hover:underline"
				>
					{$t('register.login.link')}
				</a>
			</p>
		</div>
	</div>
</div>
