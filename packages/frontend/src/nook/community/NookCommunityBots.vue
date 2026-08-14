<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_gaps">
	<form v-if="canManage" class="_panel" :class="$style.form" @submit.prevent="createBot">
		<input v-model="name" required maxlength="64" placeholder="Bot name" :class="$style.input"><textarea v-model="description" maxlength="1024" placeholder="Description" :class="$style.input"></textarea>
		<div><strong>Scopes</strong><label v-for="scope in scopes" :key="scope"><input v-model="selectedScopes" type="checkbox" :value="scope"> {{ scope }}</label></div>
		<div><strong>Allowed channels</strong><small :class="$style.hint">Nothing selected = no message access</small><label v-for="channel in messageChannels" :key="channel.id"><input v-model="selectedChannelIds" type="checkbox" :value="channel.id"> # {{ channel.name }}</label></div>
		<button class="_button" :class="$style.primary">{{ l.create }}</button>
	</form>
	<article v-for="bot in bots" :key="bot.id" class="_panel" :class="$style.bot"><strong>🤖 {{ bot.name }}</strong><p>{{ bot.description }}</p><small>{{ bot.scopes.join(', ') }}</small><small :class="$style.hint">Channels: {{ bot.allowedChannelIds.map(channelName).join(', ') || 'none' }}</small><button v-if="canManage" class="_button" @click="rotate(bot.id)">Rotate secret</button></article>
	<div v-if="lastSecret" class="_panel" :class="$style.secret"><strong>Bot secret (shown once)</strong><code>{{ lastSecret }}</code><button class="_button" @click="copySecret">{{ l.copy }}</button></div>
</section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import type { CommunityBot, CommunityChannel } from './types.js';
const props=defineProps<{communityId:string;canManage:boolean}>(); const bots=ref<CommunityBot[]>([]); const channels=ref<CommunityChannel[]>([]); const name=ref(''); const description=ref(''); const scopes=['read:messages','write:messages']; const selectedScopes=ref<string[]>(['read:messages','write:messages']); const selectedChannelIds=ref<string[]>([]); const lastSecret=ref('');
const messageChannels=computed(()=>channels.value.filter(channel=>channel.kind!=='voice'&&channel.archivedAt==null));
function channelName(id:string){return channels.value.find(channel=>channel.id===id)?.name??id;}
async function load(){const [loadedBots,loadedChannels]=await Promise.all([nookApi<CommunityBot[]>('nook/community/bots/list',{communityId:props.communityId}),nookApi<CommunityChannel[]>('nook/community/channels/list',{communityId:props.communityId})]);bots.value=loadedBots;channels.value=loadedChannels;}
async function createBot(){const result=await nookApi<{bot:CommunityBot;secret:string}>('nook/community/bots/create',{communityId:props.communityId,name:name.value,description:description.value||null,scopes:selectedScopes.value,allowedChannelIds:selectedChannelIds.value});lastSecret.value=result.secret;name.value='';description.value='';selectedChannelIds.value=[];await load();}
async function rotate(botId:string){const result=await nookApi<{secret:string}>('nook/community/bots/rotate-secret',{communityId:props.communityId,botId});lastSecret.value=result.secret;}
async function copySecret(){await navigator.clipboard.writeText(lastSecret.value);}
onMounted(load);
</script>
<style module>.form,.bot,.secret{padding:16px}.form>div{margin-top:12px}.form label{display:block;margin-top:5px}.input{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:9px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);color:var(--MI_THEME-fg)}.primary{display:block;margin-top:10px;padding:8px 14px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);border-radius:8px}.secret code{display:block;overflow-wrap:anywhere;margin:8px 0;padding:8px;background:var(--MI_THEME-bg);border-radius:6px}.hint{display:block;opacity:.7;margin-top:4px}</style>
