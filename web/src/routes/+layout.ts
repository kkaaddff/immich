import { browser } from '$app/environment';
import { locale, waitLocale } from 'svelte-i18n';
import '../lib/i18n/index';
import type { LayoutLoad } from './$types';

export const ssr = false;
export const csr = true;

export const load = (async () => {
  if (browser) {
    void locale.set(window.navigator.language);
  }

  await waitLocale();

  return {
    meta: {
      title: 'Immich',
    },
  };
}) satisfies LayoutLoad;
