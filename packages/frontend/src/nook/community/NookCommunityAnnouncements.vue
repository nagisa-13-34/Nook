<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_gaps">
	<form v-if="canManage" class="_panel" :class="$style.form" @submit.prevent="createAnnouncement">
		<input v-model="title" required maxlength="160" placeholder="Title" :class="$style.input">
		<textarea v-model="body" required maxlength="12000" rows="4" :class="$style.input"></textarea>
		<label><input v-model="important" type="checkbox"> Important</label>
		<button class="_button" :class="$style.primary">{{ l.create }}</button>
	</form>
	<article v-for="item in items" :key="item.id" class="_panel" :class="$style.item">
		<strong><span v-if="item.important">📢 </span>{{ item.title }}</strong>
		<p>{{ item.body }}</p><NookAutoTranslation kind="communityAnnouncement" :object-id="item.id" :text="item.body"/><small>{{ new Date(item.createdAt).toLocaleString() }}</small>
		<button v-if="canManage" class="_button" @click="remove(item.id)">🗑 {{ l.delete }}</button>
	</article>
</section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import NookAutoTranslation from './NookAutoTranslation.vue'; import type { CommunityAnnouncement } from './types.js';
const props = defineProps<{ communityId: string; canManage: boolean }>(); const items=ref<CommunityAnnouncement[]>([]); const title=ref(''); const body=ref(''); const important=ref(false);
async function load(){items.value=await nookApi('nook/community/announcements/list',{communityId:props.communityId});}
async function createAnnouncement(){await nookApi('nook/community/announcements/create',{communityId:props.communityId,title:title.value,body:body.value,important:important.value}); title.value='';body.value='';important.value=false;await load();}
async function remove(id:string){await nookApi('nook/community/announcements/delete',{communityId:props.communityId,announcementId:id});await load();}
onMounted(load);
</script>
<style module>.form,.item{padding:16px}.input{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:9px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);color:var(--MI_THEME-fg)}.primary{padding:8px 14px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);border-radius:8px}</style>
