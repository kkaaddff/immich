<script lang="ts">
  import { AppRoute } from '$lib/constants';
  import { _ } from 'svelte-i18n';
</script>

{$_('components.admin.jobs.storage.header')}
<a href="{AppRoute.ADMIN_SETTINGS}?open=storageTemplate" class="text-immich-primary dark:text-immich-dark-primary"
  >{$_('components.admin.jobs.storage.header')}</a
>
{$_('components.admin.jobs.storage.header')}
