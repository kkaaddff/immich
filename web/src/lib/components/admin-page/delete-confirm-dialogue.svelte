<script lang="ts">
  import ConfirmDialogue from '$lib/components/shared-components/confirm-dialogue.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { deleteUser, type UserResponseDto } from '@immich/sdk';
  import { serverConfig } from '$lib/stores/server-config.store';
  import { createEventDispatcher } from 'svelte';
  import Checkbox from '$lib/components/elements/checkbox.svelte';
  import { _ } from 'svelte-i18n';

  export let user: UserResponseDto;

  let forceDelete = false;
  let deleteButtonDisabled = false;
  let userIdInput: string = '';

  const dispatch = createEventDispatcher<{
    success: void;
    fail: void;
    cancel: void;
  }>();

  const handleDeleteUser = async () => {
    try {
      const { deletedAt } = await deleteUser({
        id: user.id,
        deleteUserDto: { force: forceDelete },
      });

      if (deletedAt == undefined) {
        dispatch('fail');
      } else {
        dispatch('success');
      }
    } catch (error) {
      handleError(error, 'Unable to delete user');
      dispatch('fail');
    }
  };

  const handleConfirm = (e: Event) => {
    userIdInput = (e.target as HTMLInputElement).value;
    deleteButtonDisabled = userIdInput != user.email;
  };
</script>

<ConfirmDialogue
  id="delete-user-confirmation-modal"
  title="Delete user"
  confirmText={forceDelete ? 'Permanently Delete' : 'Delete'}
  onConfirm={handleDeleteUser}
  onClose={() => dispatch('cancel')}
  disabled={deleteButtonDisabled}
>
  <svelte:fragment slot="prompt">
    <div class="flex flex-col gap-4">
      {#if forceDelete}
        <p>
          <b>{user.name}</b>{$_('components.admin.delete.force')}<b>{$_('components.admin.delete.immediately')}</b>.
        </p>
      {:else}
        <p>
          <b>{user.name}</b>{$_('components.admin.delete.delayed')}
          {$serverConfig.userDeleteDelay}
          {$_('components.admin.delete.days')}
        </p>
      {/if}

      <div class="flex justify-center m-4 gap-2">
        <Checkbox
          id="queue-user-deletion-checkbox"
          label="Queue user and assets for immediate deletion"
          labelClass="text-sm dark:text-immich-dark-fg"
          bind:checked={forceDelete}
          on:change={() => {
            deleteButtonDisabled = forceDelete;
          }}
        />
      </div>

      {#if forceDelete}
        <p class="text-immich-error">
          {$_('components.admin.delete.warning')}
        </p>

        <p class="immich-form-label text-sm" id="confirm-user-desc">
          {$_({
            id: 'components.admin.delete.confirm',
            values: { email: user.email },
          })}
        </p>

        <input
          class="immich-form-input w-full pb-2"
          id="confirm-user-id"
          aria-describedby="confirm-user-desc"
          name="confirm-user-id"
          type="text"
          on:input={handleConfirm}
        />
      {/if}
    </div>
  </svelte:fragment>
</ConfirmDialogue>
