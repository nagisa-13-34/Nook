<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkLoading/>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { mainRouter } from '@/router.js';

onMounted(() => {
	mainRouter.replaceByPath('/search?type=featured');
});
</script>
