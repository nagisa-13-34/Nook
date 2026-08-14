<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_gaps">
	<form v-if="canManage" class="_panel" :class="$style.form" @submit.prevent="createBot">
		<input v-model="name" required maxlength="64" placeholder="Bot name" :class="$style.input"><textarea v-model="description" maxlength="1024" placeholder="Description" :class="$style.input"></textarea>
		<label v-for="scope in scopes" :key="scope"><input v-model="selectedScopes" type="checkbox" :value="scope"> {{ scope }}</label>
		<button class="_button" :class="$style.primary">{{ l.create }}</button>
	</form>
	<article v-for="bot in bots" :key="bot.id" class="_panel" :class="$style.bot"><strong>🤖 {{ bot.name }}</strong><p>{{ bot.description }}</p><small>{{ bot.scopes.join(', ') }}</small><button v-if="canManage" class="_button" @click="rotate(bot.id)">Rotate secret</button></article>
	<div v-if="lastSecret" class="_panel" :class="$style.secret"><strong>Bot secret (shown once)</strong><code>{{ lastSecret }}</code><button class="_button" @click="copySecret">{{ l.copy }}</button></div>
</section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import type { CommunityBot } from './types.js';
const props=defineProps<{communityId:string;canManage:boolean}>(); const bots=ref<CommunityBot[]>([]); const name=ref(''); const description=ref(''); const scopes=['read:messages','write:messages','read:members','manage:events','join:voice']; const selectedScopes=ref<string[]>(['read:messages','write:messages']); const lastSecret=ref('');
async function load(){bots.value=await nookApi('nook/community/bots/list',{communityId:props.communityId});}
async function createBot(){const result=await nookApi<{bot:CommunityBot;secret:string}>('nook/community/bots/create',{communityId:props.communityId,name:name.value,description:description.value||null,scopes:selectedScopes.value});lastSecret.value=result.secret;name.value='';description.value='';await load();}
async function rotate(botId:string){const result=await nookApi<{secret:string}>('nook/community/bots/rotate-secret',{communityId:props.communityId,botId});lastSecret.value=result.secret;}
async function copySecret(){await navigator.clipboard.writeText(lastSecret.value);}
onMounted(load);
</script>
<style module>.form,.bot,.secret{padding:16px}.input{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:9px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);color:var(--MI_THEME-fg)}.primary{display:block;margin-top:10px;padding:8px 14px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);border-radius:8px}.secret code{display:block;overflow-wrap:anywhere;margin:8px 0;padding:8px;background:var(--MI_THEME-bg);border-radius:6px}</style>
