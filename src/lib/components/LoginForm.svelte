<script lang="ts">
	import { startAuthentication } from '@simplewebauthn/browser';

	let {
		error = $bindable(undefined),
		form = $bindable(undefined),
		api_passkey_path = '/api/login/passkeys',
		action_login_path = '',
		t
	}: {
		error?: string;
		form?: any;
		api_passkey_path?: string;
		action_login_path?: string;
		t: any;
	} = $props();

	if (form?.incorrect) {
		error = $t('login.error.incorrect');
	} else if (form?.invalid) {
		error = $t('login.error.invalid');
	}

	async function loginPasskey() {
		const optionsResp = await fetch(api_passkey_path, {
			redirect: 'follow'
		});

		if (optionsResp.redirected) {
			window.location.href = optionsResp.url;
		}

		const { options: optionsJSON, rid } = await optionsResp.json();

		let asseResp;
		try {
			asseResp = await startAuthentication({ optionsJSON });
		} catch (e) {
			error = e as string;
			return;
		}

		const verificationResp = await fetch(api_passkey_path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ rid, response: asseResp }),
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
</script>

<div
	class="w-full rounded-lg bg-white shadow sm:max-w-md md:mt-0 xl:p-0 dark:border dark:border-gray-700 dark:bg-gray-800"
>
	<div class="space-y-4 p-6 sm:p-8 md:space-y-6">
		<h1 class="text-center text-xl font-bold leading-tight tracking-tight md:text-2xl">
			{$t('login.title')}
		</h1>
		{#if error}
			<div
				class="rounded border border-red-600 bg-red-50 p-2 text-center text-red-900 dark:bg-red-900 dark:text-red-200"
			>
				{#if error}
					{error}
				{/if}
			</div>
		{/if}
		<div class="flex flex-col">
			<button
				class="h-10 rounded border border-slate-300 p-2 text-sm opacity-80"
				onclick={loginPasskey}
			>
				{$t('login.passkey')}
			</button>
		</div>
		<div class="relative flex items-center">
			<div class="flex-grow border-t border-gray-400"></div>
			<span class="mx-4 flex-shrink text-gray-400">{$t('common.word.or')}</span>
			<div class="flex-grow border-t border-gray-400"></div>
		</div>
		<form class="space-y-4 md:space-y-6" method="POST" action={action_login_path}>
			<div>
				<label for="email" class="mb-2 block text-sm font-medium opacity-90">
					{$t('login.email')}
				</label>
				<input type="text" name="email" id="email" class="input-text" required={true} />
			</div>
			<div>
				<label for="password" class="mb-2 block text-sm font-medium opacity-90">
					{$t('login.password')}
				</label>
				<input type="password" name="password" id="password" class="input-text" required={true} />
			</div>
			<div class="flex items-center justify-between">
				<div class="flex items-start">
					<div class="flex h-5 items-center">
						<input
							id="remember"
							aria-describedby="remember"
							type="checkbox"
							class="focus:ring-3 focus:ring-primary-300 dark:focus:ring-primary-600 h-4 w-4 rounded border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
							checked={true}
							required={true}
						/>
					</div>
					<div class="ml-3 text-sm">
						<label for="remember">
							{$t('login.remember')}
						</label>
					</div>
				</div>
				<a
					href="#forgot"
					class="text-action-text dark:text-action-text-dark text-sm font-medium hover:underline"
				>
					{$t('login.forgotPassword')}
				</a>
			</div>
			<input
				type="submit"
				class="bg-action-zone text-action-zone-text hover:bg-primary-700 focus:ring-primary-300 dark:bg-action-zone-dark dark:text-action-zone-text-dark dark:hover:bg-primary-700 dark:focus:ring-primary-800 w-full rounded-lg px-5 py-2.5 text-center text-sm font-medium focus:outline-none focus:ring-4"
				value={$t('login.button')}
			/>
		</form>
		<p class="text-sm font-light text-gray-500 dark:text-gray-400">
			{$t('login.register.pre')}
			<a
				href="/register"
				class="text-action-text dark:text-action-text-dark font-medium hover:underline"
			>
				{$t('login.register.link')}
			</a>
		</p>
	</div>
</div>
