<script lang="ts">
	import { passwordEntropy } from '$lib/utils/security.js';

	let { password, t }: { password: string | undefined; t: any } = $props();

	function entropyToText(e: number): string {
		if (e < 50) return $t('common.passwordStrength.tooWeak');
		if (e < 60) return $t('common.passwordStrength.weak');
		if (e < 70) return $t('common.passwordStrength.ok');
		if (e < 80) return $t('common.passwordStrength.good');
		return $t('common.passwordStrength.strong');
	}

	function entropyToColors(e: number): {
		border: string;
		bg: string;
		text: string;
		bgfull: string;
	} {
		if (e < 50) {
			return {
				border: 'border-red-500',
				bg: 'bg-red-100',
				text: 'text-red-500',
				bgfull: 'bg-red-500'
			};
		}
		if (e < 60) {
			return {
				border: 'border-orange-500',
				bg: 'bg-orange-100',
				text: 'text-orange-500',
				bgfull: 'bg-orange-500'
			};
		}
		if (e < 70) {
			return {
				border: 'border-yellow-500',
				bg: 'bg-yellow-100',
				text: 'text-yellow-500',
				bgfull: 'bg-yellow-500'
			};
		}
		if (e < 80) {
			return {
				border: 'border-green-500',
				bg: 'bg-green-100',
				text: 'text-green-500',
				bgfull: 'bg-green-500'
			};
		}
		return {
			border: 'border-blue-500',
			bg: 'bg-blue-100',
			text: 'text-blue-500',
			bgfull: 'bg-blue-500'
		};
	}

	function entropyToPercent(e: number): number {
		if (e) e -= Math.min(30, (3 / 5) * e);
		e /= 50;
		return Math.min(100, e * 100);
	}

	let entropy: number = $derived(Math.round(passwordEntropy(password)));
	let text: string = $derived(entropyToText(entropy));
	let colors = $derived(entropyToColors(entropy));
	let percent = $derived(entropyToPercent(entropy));
</script>

<div
	class={`${colors['border']} ${colors['bg']} relative w-32 overflow-hidden rounded-full border text-center text-black`}
>
	<div
		class={`${colors['bgfull']} absolute left-0 top-0 h-full`}
		style={`width: ${percent}%`}
	></div>
	<div class="absolute left-0 top-0 h-full w-full items-center justify-center">
		<span>
			{text}
		</span>
	</div>
</div>
