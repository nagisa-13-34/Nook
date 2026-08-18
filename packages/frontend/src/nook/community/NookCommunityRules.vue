<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.root">
	<header :class="$style.heading">
		<div><h2>{{ l.rules }}</h2><p>{{ l.noRules }}</p></div>
		<button v-if="canManage" class="_button" :class="$style.add" @click="editing = !editing"><i class="ti ti-plus"></i> {{ l.addRule }}</button>
	</header>
	<form v-if="canManage && editing" :class="$style.form" @submit.prevent="createRule">
		<input v-model="title" required maxlength="128" :placeholder="l.addRule">
		<textarea v-model="body" required maxlength="4096" rows="4"></textarea>
		<div :class="$style.actions"><button type="button" class="_button" @click="editing=false">{{ l.cancel }}</button><button class="_button" :class="$style.primary">{{ l.create }}</button></div>
	</form>
	<ol v-if="rules.length" :class="$style.list">
		<li v-for="(rule,index) in rules" :key="rule.id" :class="$style.rule">
			<div :class="$style.number">{{ index + 1 }}</div>
			<div :class="$style.content"><strong>{{ rule.title }}</strong><p>{{ rule.body }}</p></div>
			<button v-if="canManage" class="_button" :class="$style.remove" :title="l.delete" @click="deleteRule(rule.id)"><i class="ti ti-trash"></i></button>
		</li>
	</ol>
	<div v-else :class="$style.empty">{{ l.noRules }}</div>
</section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import type { CommunityRule } from './types.js';

const props = defineProps<{ communityId: string; canManage: boolean }>();
const rules = ref<CommunityRule[]>([]);
const editing = ref(false);
const title = ref('');
const body = ref('');

async function load() { rules.value = await nookApi('nook/community/rules/list', { communityId: props.communityId }); }
async function createRule() {
	if (!title.value.trim() || !body.value.trim()) return;
	await nookApi('nook/community/rules/create', { communityId: props.communityId, title: title.value.trim(), body: body.value.trim() });
	title.value=''; body.value=''; editing.value=false; await load();
}
async function deleteRule(ruleId:string) { await nookApi('nook/community/rules/delete', { communityId: props.communityId, ruleId }); await load(); }
onMounted(load);
</script>

<style lang="scss" module>
.root{max-width:760px;margin:0 auto;padding:22px}.heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:18px;border-bottom:1px solid #d7e3f1}.heading h2{margin:0;font-size:22px;color:#17324d}.heading p{margin:4px 0 0;color:#718399;font-size:12px}.add,.primary{padding:8px 12px;border-radius:7px;background:#ffd84d;color:#17324d;font-weight:750}.form{display:grid;gap:8px;margin:16px 0;padding:12px;border:1px solid #d7e3f1;border-radius:8px;background:#f8fbff}.form input,.form textarea{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d;font:inherit}.actions{display:flex;justify-content:flex-end;gap:8px}.actions button{padding:8px 12px;border-radius:7px}.list{list-style:none;margin:0;padding:0}.rule{display:grid;grid-template-columns:34px minmax(0,1fr)32px;gap:10px;padding:16px 2px;border-bottom:1px solid #e2eaf3}.number{width:30px;height:30px;display:grid;place-items:center;border-radius:7px;background:#eef5ff;color:#175cd3;font-weight:800}.content strong{font-size:14px}.content p{margin:5px 0 0;white-space:pre-wrap;color:#52677d;line-height:1.6}.remove{width:30px;height:30px;border-radius:6px;color:#a33}.remove:hover{background:#fff1f1}.empty{padding:40px 0;text-align:center;color:#8190a0}
</style>