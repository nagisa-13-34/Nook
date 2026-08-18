<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div :class="$style.root">
	<button class="_button" :class="$style.trigger" :title="l.invite" @click="open"><i class="ti ti-user-plus"></i></button>
	<div v-if="opened" :class="$style.backdrop" @click.self="opened=false">
		<section :class="$style.modal" role="dialog" aria-modal="true">
			<header><div><strong>{{ l.inviteCommunity }}</strong><small>{{ l.inviteExpires }}</small></div><button class="_button" @click="opened=false"><i class="ti ti-x"></i></button></header>
			<div :class="$style.body">
				<label><span>{{ l.inviteExpires }}</span><select v-model="expiry"><option value="never">{{ l.never }}</option><option value="hour">{{ l.oneHour }}</option><option value="day">{{ l.oneDay }}</option><option value="week">{{ l.oneWeek }}</option><option value="month">{{ l.oneMonth }}</option></select></label>
				<label><span>{{ l.maxUses }}</span><select v-model="uses"><option value="">{{ l.unlimited }}</option><option value="1">1</option><option value="5">5</option><option value="10">10</option><option value="25">25</option><option value="100">100</option></select></label>
				<button class="_button" :class="$style.primary" @click="createInvite"><i class="ti ti-link-plus"></i> {{ l.createInvite }}</button>
				<div v-if="url" :class="$style.result"><input :value="url" readonly><div><button class="_button" @click="copy"><i class="ti ti-copy"></i> {{ copied ? l.copied : l.copy }}</button><button class="_button" :class="$style.share" @click="share"><i class="ti ti-share-3"></i> {{ l.share }}</button></div></div>
				<div v-if="invites.length" :class="$style.existing"><small>{{ l.invite }}</small><div v-for="invite in invites.filter(x=>!x.revokedAt)" :key="invite.id" :class="$style.invite"><span>{{ expiryLabel(invite.expiresAt) }} · {{ invite.useCount }}/{{ invite.maxUses ?? '∞' }}</span><button class="_button" @click="revoke(invite.id)">{{ l.revoke }}</button></div></div>
			</div>
		</section>
	</div>
</div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
const props=defineProps<{communityId:string;communityName:string}>();
interface Invite {id:string;maxUses:number|null;useCount:number;expiresAt:string|null;revokedAt:string|null;createdAt:string}
const opened=ref(false), expiry=ref('week'), uses=ref(''), url=ref(''), copied=ref(false), invites=ref<Invite[]>([]);
async function open(){opened.value=true;copied.value=false;await load()}
async function load(){invites.value=await nookApi('nook/community/invites/list',{communityId:props.communityId}).catch(()=>[])}
function expiresAt(){const ms:Record<string,number>={hour:3600000,day:86400000,week:604800000,month:2592000000};return expiry.value==='never'?null:new Date(Date.now()+(ms[expiry.value]??604800000)).toISOString()}
async function createInvite(){const result=await nookApi<{token:string}>('nook/community/invites/create',{communityId:props.communityId,expiresAt:expiresAt(),maxUses:uses.value?Number(uses.value):null});url.value=`${window.location.origin}/channels/${props.communityId}?invite=${encodeURIComponent(result.token)}`;copied.value=false;await load()}
async function copy(){if(!url.value)return;await navigator.clipboard.writeText(url.value);copied.value=true}
async function share(){if(!url.value)return;if(navigator.share){await navigator.share({title:props.communityName,text:props.communityName,url:url.value}).catch(()=>{})}else await copy()}
async function revoke(id:string){await nookApi('nook/community/invites/revoke',{communityId:props.communityId,inviteId:id});await load()}
function expiryLabel(value:string|null){return value?new Date(value).toLocaleString():l.never}
</script>
<style lang="scss" module>
.root{display:inline-flex}.trigger{width:34px;height:34px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d}.trigger:hover{background:#eef5ff;color:#175cd3}.backdrop{position:fixed;z-index:100000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(18,34,51,.35)}.modal{width:min(480px,100%);max-height:min(680px,calc(100dvh - 36px));overflow:auto;background:#fff;border:1px solid #d7e3f1;border-radius:10px;box-shadow:0 16px 50px rgba(23,50,77,.18);color:#17324d}.modal>header{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #d7e3f1}.modal>header>div{display:flex;flex-direction:column}.modal>header small{color:#718399;font-size:10px}.modal>header button{width:30px;height:30px;border-radius:6px}.body{display:grid;gap:12px;padding:15px}.body label{display:grid;gap:5px;font-size:12px;font-weight:650}.body select,.result input{box-sizing:border-box;width:100%;padding:9px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d}.primary{padding:9px 12px;border-radius:7px;background:#ffd84d;color:#17324d;font-weight:800}.result{display:grid;gap:8px;padding:10px;border:1px solid #d7e3f1;border-radius:8px;background:#f8fbff}.result>div{display:flex;gap:8px}.result button{flex:1;padding:8px;border-radius:7px}.share{background:#175cd3;color:#fff}.existing{display:grid;gap:5px;padding-top:6px;border-top:1px solid #e2eaf3}.invite{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;font-size:11px}.invite button{padding:5px 8px;border-radius:5px;color:#a33;background:#fff1f1}
</style>