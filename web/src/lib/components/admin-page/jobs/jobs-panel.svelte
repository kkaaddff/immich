<script lang="ts">
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import { featureFlags } from '$lib/stores/server-config.store';
  import { getJobName } from '$lib/utils';
  import { handleError } from '$lib/utils/handle-error';
  import { JobCommand, JobName, sendJobCommand, type AllJobStatusResponseDto, type JobCommandDto } from '@immich/sdk';
  import {
    mdiFaceRecognition,
    mdiFileJpgBox,
    mdiFileXmlBox,
    mdiFolderMove,
    mdiImageSearch,
    mdiLibraryShelves,
    mdiTable,
    mdiTagFaces,
    mdiVideo,
  } from '@mdi/js';
  import type { ComponentType } from 'svelte';
  import ConfirmDialogue from '../../shared-components/confirm-dialogue.svelte';
  import JobTile from './job-tile.svelte';
  import StorageMigrationDescription from './storage-migration-description.svelte';
  import { _, unwrapFunctionStore } from 'svelte-i18n';

  const format = unwrapFunctionStore(_);

  export let jobs: AllJobStatusResponseDto;

  interface JobDetails {
    title: string;
    subtitle?: string;
    allText?: string;
    missingText?: string;
    disabled?: boolean;
    icon: string;
    allowForceCommand?: boolean;
    component?: ComponentType;
    handleCommand?: (jobId: JobName, jobCommand: JobCommandDto) => Promise<void>;
  }

  let confirmJob: JobName | null = null;

  const handleConfirmCommand = async (jobId: JobName, dto: JobCommandDto) => {
    if (dto.force) {
      confirmJob = jobId;
      return;
    }

    await handleCommand(jobId, dto);
  };

  const onConfirm = async () => {
    if (!confirmJob) {
      return;
    }
    await handleCommand(confirmJob, { command: JobCommand.Start, force: true });
    confirmJob = null;
  };

  $: jobDetails = <Partial<Record<JobName, JobDetails>>>{
    [JobName.ThumbnailGeneration]: {
      icon: mdiFileJpgBox,
      title: getJobName(JobName.ThumbnailGeneration),
      subtitle: format('components.admin.jobs.panel.generate-thumbnails-subtitle'),
    },
    [JobName.MetadataExtraction]: {
      icon: mdiTable,
      title: getJobName(JobName.MetadataExtraction),
      subtitle: format('components.admin.jobs.panel.extract-metadata-subtitle'),
    },
    [JobName.Library]: {
      icon: mdiLibraryShelves,
      title: getJobName(JobName.Library),
      subtitle: format('components.admin.jobs.panel.library-subtitle'),
      allText: 'ALL',
      missingText: 'REFRESH',
    },
    [JobName.Sidecar]: {
      title: getJobName(JobName.Sidecar),
      icon: mdiFileXmlBox,
      subtitle: format('components.admin.jobs.panel.sidecar-subtitle'),
      allText: 'SYNC',
      missingText: 'DISCOVER',
      disabled: !$featureFlags.sidecar,
    },
    [JobName.SmartSearch]: {
      icon: mdiImageSearch,
      title: getJobName(JobName.SmartSearch),
      subtitle: format('components.admin.jobs.panel.smart-search-subtitle'),
      disabled: !$featureFlags.smartSearch,
    },
    [JobName.FaceDetection]: {
      icon: mdiFaceRecognition,
      title: getJobName(JobName.FaceDetection),
      subtitle: format('components.admin.jobs.panel.face-detection-subtitle'),
      handleCommand: handleConfirmCommand,
      disabled: !$featureFlags.facialRecognition,
    },
    [JobName.FacialRecognition]: {
      icon: mdiTagFaces,
      title: getJobName(JobName.FacialRecognition),
      subtitle: format('components.admin.jobs.panel.facial-recognition-subtitle'),
      handleCommand: handleConfirmCommand,
      disabled: !$featureFlags.facialRecognition,
    },
    [JobName.VideoConversion]: {
      icon: mdiVideo,
      title: getJobName(JobName.VideoConversion),
      subtitle: format('components.admin.jobs.panel.video-conversion-subtitle'),
    },
    [JobName.StorageTemplateMigration]: {
      icon: mdiFolderMove,
      title: getJobName(JobName.StorageTemplateMigration),
      allowForceCommand: false,
      component: StorageMigrationDescription,
    },
    [JobName.Migration]: {
      icon: mdiFolderMove,
      title: getJobName(JobName.Migration),
      subtitle: format('components.admin.jobs.panel.migration-subtitle'),
      allowForceCommand: false,
    },
  };
  $: jobList = Object.entries(jobDetails) as [JobName, JobDetails][];

  async function handleCommand(jobId: JobName, jobCommand: JobCommandDto) {
    const title = jobDetails[jobId]?.title;

    try {
      jobs[jobId] = await sendJobCommand({ id: jobId, jobCommandDto: jobCommand });

      switch (jobCommand.command) {
        case JobCommand.Empty: {
          notificationController.show({
            message: format({ id: 'components.admin.jobs.panel.message-cleared', values: { title: title } }),
            type: NotificationType.Info,
          });
          break;
        }
      }
    } catch (error) {
      handleError(
        error,
        format({
          id: 'components.admin.jobs.panel.command-error',
          values: {
            command: jobCommand.command,
            title: title,
          },
        }),
      );
    }
  }
</script>

{#if confirmJob}
  <ConfirmDialogue
    id="reprocess-faces-modal"
    prompt={$_('components.admin.jobs.panel.confirm-prompt')}
    {onConfirm}
    onClose={() => (confirmJob = null)}
  />
{/if}

<div class="flex flex-col gap-7">
  {#each jobList as [jobName, { title, subtitle, disabled, allText, missingText, allowForceCommand, icon, component, handleCommand: handleCommandOverride }]}
    {@const { jobCounts, queueStatus } = jobs[jobName]}
    <JobTile
      {icon}
      {title}
      {disabled}
      {subtitle}
      allText={allText || 'ALL'}
      missingText={missingText || 'MISSING'}
      {allowForceCommand}
      {jobCounts}
      {queueStatus}
      on:command={({ detail }) => (handleCommandOverride || handleCommand)(jobName, detail)}
    >
      {#if component}
        <svelte:component this={component} slot="description" />
      {/if}
    </JobTile>
  {/each}
</div>
