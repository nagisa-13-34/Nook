<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div :class="$style.root">
	<button class="_button" :class="$style.trigger" :title="l.communityProfile" @click="open">
		<img v-if="triggerAvatarUrl" :src="triggerAvatarUrl" alt="">
		<i v-else class="ti ti-user-circle"></i>
	</button>

	<div v-if="opened" :class="$style.backdrop" @click.self="opened=false">
		<section :class="$style.modal" role="dialog" aria-modal="true">
			<header>
				<div><strong>{{ l.communityProfile }}</strong><small>{{ l.communityProfileHint }}</small></div>
				<button class="_button" @click="opened=false"><i class="ti ti-x"></i></button>
			</header>

			<div :class="$style.body">
				<div :class="$style.preview">
					<div :class="$style.avatar">
						<img v-if="avatarUrl" :src="avatarUrl" alt="">
						<span v-else>{{ previewName.slice(0, 1).toUpperCase() }}</span>
					</div>
					<div><strong>{{ previewName }}</strong><small>@{{ $i.username }}</small></div>
				</div>

				<div :class="$style.avatarActions">
					<button class="_button" @click="changeAvatar"><i class="ti ti-photo-edit"></i> {{ l.changeAvatar }}</button>
					<button v-if="avatarId" class="_button" @click="resetAvatar"><i class="ti ti-restore"></i> {{ l.resetAvatar }}</button>
				</div>

				<label :class="$style.field">
					<span>{{ l.communityDisplayName }}</span>
					<input v-model="nickname" maxlength="64" :placeholder="$i.name || $i.username">
					<small>{{ l.communityProfileHint }}</small>
				</label>

				<p v-if="saved" :class="$style.saved"><i class="ti ti-check"></i> {{ l.profileSaved }}</p>
				<button class="_button" :class="$style.primary" :disabled="saving" @click="save"><i class="ti ti-device-floppy"></i> {{ l.save }}</button>
			</div>
		</section>
	</div>
</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { chooseDriveFile } from '@/utility/drive.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { ensureSignin } from '@/i.js';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import type { CommunityMember } from './types.js';

const props = defineProps<{ communityId: string }>();
const emit = defineEmits<{ updated: [] }>();
const $i = ensureSignin();
const opened = ref(false);
const nickname = ref('');
const avatarId = ref<string | null>(null);
const avatarUrl = ref<string | null>($i.avatarUrl ?? null);
const triggerAvatarUrl = ref<string | null>($i.avatarUrl ?? null);
const saving = ref(false);
const saved = ref(false);
const previewName = computed(() => nickname.value.trim() || $i.name || $i.username);

async function open() {
	opened.value = true;
	saved.value = false;
	const members = await nookApi<CommunityMember[]>('nook/community/members/list', { communityId: props.communityId }).catch(() => []);
	const me = members.find(member => member.userId === $i.id);
	nickname.value = me?.nickname ?? '';
	avatarId.value = me?.avatarId ?? null;
	avatarUrl.value = me?.avatarUrl ?? $i.avatarUrl ?? null;
	triggerAvatarUrl.value = avatarUrl.value;
}

function useAvatar(driveFile: Misskey.entities.DriveFile) {
	avatarId.value = driveFile.id;
	avatarUrl.value = driveFile.thumbnailUrl ?? driveFile.url;
	saved.value = false;
}

function changeAvatar(ev: PointerEvent) {
	os.popupMenu([{
		text: l.communityAvatar,
		type: 'label',
	}, {
		text: l.upload,
		icon: 'ti ti-upload',
		action: async () => {
			const files = await os.chooseFileFromPc({ multiple: false });
			const file = files[0];
			if (file == null) return;
			let selected = file;
			const { canceled } = await os.confirm({
				type: 'question',
				text: i18n.ts.cropImageAsk,
				okText: i18n.ts.cropYes,
				cancelText: i18n.ts.cropNo,
			});
			if (!canceled) selected = await os.cropImageFile(file, { aspectRatio: 1 });
			const uploaded = (await os.launchUploader([selected], { multiple: false }))[0];
			if (uploaded != null) useAvatar(uploaded);
		},
	}, {
		text: l.fromDrive,
		icon: 'ti ti-cloud',
		action: () => {
			chooseDriveFile({ multiple: false }).then(files => {
				if (files[0] != null) useAvatar(files[0]);
			});
		},
	}], ev.currentTarget ?? ev.target);
}

function resetAvatar() {
	avatarId.value = null;
	avatarUrl.value = $i.avatarUrl ?? null;
	saved.value = false;
}

async function save() {
	if (saving.value) return;
	saving.value = true;
	try {
		await nookApi('nook/community/profile-update', {
			communityId: props.communityId,
			nickname: nickname.value.trim() || null,
			avatarId: avatarId.value,
		});
		triggerAvatarUrl.value = avatarUrl.value;
		saved.value = true;
		emit('updated');
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.root{display:inline-flex}.trigger{width:34px;height:34px;overflow:hidden;display:grid;place-items:center;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d}.trigger:hover{background:#eef5ff;color:#175cd3}.trigger img{width:100%;height:100%;object-fit:cover}.trigger i{font-size:19px}.backdrop{position:fixed;z-index:100000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(18,34,51,.35)}.modal{width:min(460px,100%);max-height:min(680px,calc(100dvh - 36px));overflow:auto;background:#fff;border:1px solid #d7e3f1;border-radius:10px;box-shadow:0 16px 50px rgba(23,50,77,.18);color:#17324d}.modal>header{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #d7e3f1}.modal>header>div{display:flex;flex-direction:column;min-width:0}.modal>header small{margin-top:2px;color:#718399;font-size:10px}.modal>header button{width:30px;height:30px;border-radius:6px}.body{display:grid;gap:14px;padding:16px}.preview{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #d7e3f1;border-radius:9px;background:#f8fbff}.preview>div:last-child{display:flex;min-width:0;flex-direction:column}.preview strong,.preview small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.preview small{color:#718399}.avatar{width:58px;height:58px;flex:none;overflow:hidden;display:grid;place-items:center;border-radius:16px;background:#eef5ff;color:#175cd3;font-size:22px;font-weight:850}.avatar img{width:100%;height:100%;object-fit:cover}.avatarActions{display:flex;flex-wrap:wrap;gap:8px}.avatarActions button{padding:8px 10px;border:1px solid #d7e3f1;border-radius:7px;background:#fff}.field{display:grid;gap:6px;font-size:12px;font-weight:700}.field input{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d;font:inherit}.field small{color:#718399;font-weight:400}.primary{padding:9px 12px;border-radius:7px;background:#ffd84d;color:#17324d;font-weight:800}.primary:disabled{opacity:.5}.saved{margin:0;color:#247a45;font-size:12px}
</style>
