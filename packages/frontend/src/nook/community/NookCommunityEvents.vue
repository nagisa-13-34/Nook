<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_gaps">
	<form v-if="canManage" class="_panel" :class="$style.form" @submit.prevent="createEvent">
		<input v-model="title" required maxlength="160" placeholder="Event title" :class="$style.input">
		<textarea v-model="description" maxlength="12000" placeholder="Description" :class="$style.input"></textarea>
		<input v-model="startsAt" required type="datetime-local" :class="$style.input">
		<input v-model="endsAt" type="datetime-local" :class="$style.input">
		<button class="_button" :class="$style.primary">{{ l.create }}</button>
	</form>
	<article v-for="event in events" :key="event.id" class="_panel" :class="$style.event">
		<h3>{{ event.cancelledAt ? '🚫 ' : '📅 ' }}{{ event.title }}</h3><p v-if="event.description">{{ event.description }}</p><NookAutoTranslation v-if="event.description" kind="communityEvent" :object-id="event.id" :text="event.description"/>
		<div>{{ new Date(event.startsAt).toLocaleString() }}<span v-if="event.endsAt"> – {{ new Date(event.endsAt).toLocaleString() }}</span></div>
		<small>✅ {{ event.goingCount }} · ⭐ {{ event.interestedCount }}</small>
		<div :class="$style.actions"><button class="_button" @click="rsvp(event.id,'going')">✅ Going</button><button class="_button" @click="rsvp(event.id,'interested')">⭐ Interested</button><button class="_button" @click="rsvp(event.id,'not_going')">✖</button></div>
	</article>
</section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import NookAutoTranslation from './NookAutoTranslation.vue'; import type { CommunityEvent } from './types.js';
const props=defineProps<{communityId:string;canManage:boolean}>(); const events=ref<CommunityEvent[]>([]); const title=ref(''); const description=ref(''); const startsAt=ref(''); const endsAt=ref('');
async function load(){events.value=await nookApi('nook/community/events/list',{communityId:props.communityId});}
async function createEvent(){await nookApi('nook/community/events/create',{communityId:props.communityId,title:title.value,description:description.value||null,startsAt:new Date(startsAt.value).toISOString(),endsAt:endsAt.value?new Date(endsAt.value).toISOString():null});title.value='';description.value='';startsAt.value='';endsAt.value='';await load();}
async function rsvp(eventId:string,response:'going'|'interested'|'not_going'){await nookApi('nook/community/events/rsvp',{communityId:props.communityId,eventId,response});await load();}
onMounted(load);
</script>
<style module>.form,.event{padding:16px}.input{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:9px;border:1px solid var(--MI_THEME-divider);border-radius:8px;background:var(--MI_THEME-panel);color:var(--MI_THEME-fg)}.primary{padding:8px 14px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);border-radius:8px}.actions{display:flex;gap:8px;margin-top:10px}</style>
