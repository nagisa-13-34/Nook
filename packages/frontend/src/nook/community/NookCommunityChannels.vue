<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.layout">
	<nav class="_panel" :class="$style.sidebar"><button v-for="item in channels" :key="item.id" class="_button" :class="[$style.channel,{[$style.active]:selected?.id===item.id}]" @click="select(item)"><span>{{ item.kind==='voice'?'🔊':'#' }}</span> {{ item.name }}</button></nav>
	<div :class="$style.main">
		<NookCommunityVoice v-if="selected?.kind==='voice'" :community-id="communityId" :channel="selected" :channels="channels" :can-manage="canManageVoice"/>
		<div v-else-if="selected" class="_gaps">
			<div class="_panel" :class="$style.toolbar"><strong># {{ selected.name }}</strong><small v-if="selected.topic">{{ selected.topic }}</small></div>
			<div class="_panel" :class="$style.messages"><article v-for="message in messages" :key="message.id" :class="$style.message"><small>{{ message.botId ? '🤖 '+message.botId : message.userId }} · {{ new Date(message.createdAt).toLocaleTimeString() }}</small><div :class="$style.body">{{ message.body }}</div><NookAutoTranslation kind="communityMessage" :object-id="message.id" :text="message.body"/></article></div>
			<form :class="$style.composer" @submit.prevent="send"><textarea v-model="draft" maxlength="8000" rows="2" :placeholder="l.send"></textarea><button class="_button" :class="$style.primary">{{ l.send }}</button></form>
			<div class="_panel" :class="$style.search"><input v-model="query" :placeholder="l.search" @keyup.enter="search"><button class="_button" @click="search">🔎</button><div v-for="result in searchResults" :key="result.id" :class="$style.searchResult"><small>#{{ channelName(result.channelId) }}</small> {{ result.body }}</div></div>
		</div>
		<div v-else class="_panel" :class="$style.empty">No channels yet.</div>
	</div>
</section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import NookAutoTranslation from './NookAutoTranslation.vue'; import NookCommunityVoice from './NookCommunityVoice.vue'; import type { CommunityChannel, CommunityMessage } from './types.js';
const props=defineProps<{communityId:string;canManageVoice:boolean}>(); const channels=ref<CommunityChannel[]>([]); const selected=ref<CommunityChannel|null>(null); const messages=ref<CommunityMessage[]>([]); const draft=ref(''); const query=ref(''); const searchResults=ref<Array<{id:string;channelId:string;body:string}>>([]); let timer:number|undefined;
async function loadChannels(){channels.value=await nookApi('nook/community/channels/list',{communityId:props.communityId});if(selected.value==null||!channels.value.some(c=>c.id===selected.value?.id))selected.value=channels.value[0]??null;await loadMessages();}
async function loadMessages(){if(!selected.value||selected.value.kind==='voice'){messages.value=[];return;}messages.value=await nookApi('nook/community/messages/list',{communityId:props.communityId,channelId:selected.value.id,limit:100});}
async function select(item:CommunityChannel){selected.value=item;searchResults.value=[];await loadMessages();}
async function send(){if(!selected.value||!draft.value.trim())return;await nookApi('nook/community/messages/create',{communityId:props.communityId,channelId:selected.value.id,body:draft.value.trim()});draft.value='';await loadMessages();}
async function search(){if(!query.value.trim()){searchResults.value=[];return;}searchResults.value=await nookApi('nook/community/search',{communityId:props.communityId,query:query.value.trim(),limit:50});}
function channelName(id:string){return channels.value.find(c=>c.id===id)?.name??id;}
onMounted(async()=>{await loadChannels();timer=window.setInterval(()=>void loadMessages(),3000);});onBeforeUnmount(()=>{if(timer)clearInterval(timer);});
</script>
<style module>.layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px}.sidebar{padding:8px;align-self:start;position:sticky;top:70px}.channel{display:block;width:100%;padding:8px;text-align:left;border-radius:7px}.active{background:color(from var(--MI_THEME-accent) srgb r g b / .14);color:var(--MI_THEME-accent)}.main{min-width:0}.toolbar,.messages,.search,.empty{padding:12px}.toolbar small{display:block;opacity:.7}.messages{max-height:60vh;overflow:auto}.message{padding:10px 4px;border-bottom:1px solid var(--MI_THEME-divider)}.body{white-space:pre-wrap;margin-top:3px}.composer{display:flex;gap:8px}.composer textarea{flex:1;resize:vertical;padding:9px;background:var(--MI_THEME-panel);color:var(--MI_THEME-fg);border:1px solid var(--MI_THEME-divider);border-radius:8px}.primary{padding:8px 14px;border-radius:8px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}.search input{width:calc(100% - 50px);padding:8px}.searchResult{padding:7px 0;border-bottom:1px solid var(--MI_THEME-divider)}@media(max-width:700px){.layout{grid-template-columns:1fr}.sidebar{position:static;display:flex;overflow:auto}.channel{min-width:max-content}}</style>
