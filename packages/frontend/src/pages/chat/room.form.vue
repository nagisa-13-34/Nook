<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	:class="$style.root"
	@dragover.stop="onDragover"
	@drop.stop="onDrop"
>
	<div v-if="replyingTo" :class="$style.replyPreview">
		<div :class="$style.replyMark"></div>
		<div :class="$style.replyBody">
			<strong>{{ replySender }}</strong>
			<span>{{ replyPreview }}</span>
		</div>
		<button class="_button" :class="$style.replyClose" aria-label="返信をやめる" @click="replyingTo = null"><i class="ti ti-x"></i></button>
	</div>

	<div v-if="file" :class="$style.filePreview">
		<i class="ti ti-paperclip"></i>
		<span>{{ file.name }}</span>
		<button class="_button" aria-label="添付を外す" @click="file = null"><i class="ti ti-x"></i></button>
	</div>

	<div :class="$style.composer">
		<div :class="$style.leadingButtons">
			<button class="_button" :class="$style.iconButton" title="端末からファイルを追加" @click="openLocalFile"><i class="ti ti-plus"></i></button>
			<button class="_button" :class="$style.iconButton" title="Nookのファイルから選ぶ" @click="chooseDriveFile"><i class="ti ti-photo"></i></button>
		</div>

		<textarea
			ref="textareaEl"
			v-model="text"
			:class="$style.textarea"
			placeholder="メッセージ"
			:readonly="textareaReadOnly"
			rows="1"
			@keydown="onKeydown"
			@paste="onPaste"
		></textarea>

		<button class="_button" :class="$style.emojiButton" title="絵文字" @click="insertEmoji"><i class="ti ti-mood-happy"></i></button>
		<button class="_button" :class="$style.send" :disabled="!canSend || sending" :title="i18n.ts.send" @click="send">
			<template v-if="!sending"><i class="ti ti-send"></i></template>
			<template v-else><MkLoading :em="true"/></template>
		</button>
	</div>

	<input ref="fileEl" style="display: none;" type="file" @change="onChangeFile"/>
</div>
</template>

<script lang="ts" setup>
import { onMounted, watch, ref, shallowRef, computed, nextTick, onBeforeUnmount } from 'vue';
import * as Misskey from 'misskey-js';
import { formatTimeString } from '@/utility/format-time-string.js';
import { selectFile } from '@/utility/drive.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { miLocalStorage } from '@/local-storage.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { prefer } from '@/preferences.js';
import { Autocomplete } from '@/utility/autocomplete.js';
import { emojiPicker } from '@/utility/emoji-picker.js';
import { checkDragDataType, getDragData } from '@/drag-and-drop.js';

const props = defineProps<{
	user?: Misskey.entities.UserDetailed | null;
	room?: Misskey.entities.ChatRoom | null;
}>();

type ReplyTarget = {
	id: string;
	fromUserId: string;
	text?: string | null;
	file?: { name: string } | null;
	fromUser?: { name?: string | null; username: string } | null;
};

const textareaEl = shallowRef<HTMLTextAreaElement>();
const fileEl = shallowRef<HTMLInputElement>();
const text = ref('');
const file = ref<Misskey.entities.DriveFile | null>(null);
const replyingTo = shallowRef<ReplyTarget | null>(null);
const sending = ref(false);
const textareaReadOnly = ref(false);
let autocompleteInstance: Autocomplete | null = null;

const canSend = computed(() => text.value.trim().length > 0 || file.value != null);
const replySender = computed(() => replyingTo.value?.fromUser?.name?.trim() || replyingTo.value?.fromUser?.username || 'メッセージ');
const replyPreview = computed(() => {
	if (!replyingTo.value) return '';
	const preview = replyingTo.value.text?.replace(/\s+/g, ' ').trim();
	if (preview) return preview.slice(0, 120);
	if (replyingTo.value.file) return `📎 ${replyingTo.value.file.name}`;
	return 'メッセージ';
});

function getDraftKey() {
	return props.user ? 'user:' + props.user.id : 'room:' + props.room?.id;
}

watch([text, file], saveDraft);

function onReplyEvent(event: Event) {
	const customEvent = event as CustomEvent<{ message?: ReplyTarget }>;
	if (!customEvent.detail?.message) return;
	replyingTo.value = customEvent.detail.message;
	void nextTick(() => textareaEl.value?.focus());
}

async function onPaste(ev: ClipboardEvent) {
	if (!ev.clipboardData) return;

	const pastedFileName = 'yyyy-MM-dd HH-mm-ss [{{number}}]';
	const items = ev.clipboardData.items;

	if (items.length === 1 && items[0].kind === 'file') {
		const pastedFile = items[0].getAsFile();
		if (!pastedFile) return;
		const lio = pastedFile.name.lastIndexOf('.');
		const ext = lio >= 0 ? pastedFile.name.slice(lio) : '';
		const formattedName = formatTimeString(new Date(pastedFile.lastModified), pastedFileName).replace(/{{number}}/g, '1') + ext;
		const renamedFile = new File([pastedFile], formattedName, { type: pastedFile.type });
		const driveFiles = await os.launchUploader([renamedFile], { multiple: false });
		file.value = driveFiles[0] ?? null;
	} else if (items.length > 1 && items[0].kind === 'file') {
		void os.alert({
			type: 'error',
			text: i18n.ts.onlyOneFileCanBeAttached,
		});
	}
}

function onDragover(ev: DragEvent) {
	if (!ev.dataTransfer || ev.dataTransfer.items.length === 0) return;

	const isFile = ev.dataTransfer.items[0].kind === 'file';
	if (isFile || checkDragDataType(ev, ['driveFiles'])) {
		ev.preventDefault();
		ev.dataTransfer.dropEffect = 'copy';
	}
}

async function onDrop(ev: DragEvent): Promise<void> {
	if (!ev.dataTransfer) return;

	if (ev.dataTransfer.files.length === 1) {
		ev.preventDefault();
		const driveFiles = await os.launchUploader([Array.from(ev.dataTransfer.files)[0]], { multiple: false });
		file.value = driveFiles[0] ?? null;
		return;
	}

	if (ev.dataTransfer.files.length > 1) {
		ev.preventDefault();
		void os.alert({
			type: 'error',
			text: i18n.ts.onlyOneFileCanBeAttached,
		});
		return;
	}

	const droppedData = getDragData(ev, 'driveFiles');
	if (droppedData != null) {
		file.value = droppedData[0] ?? null;
		ev.preventDefault();
	}
}

function onKeydown(ev: KeyboardEvent) {
	if (ev.isComposing || ev.key === 'Process' || ev.keyCode === 229) return;
	if (ev.key !== 'Enter') return;

	if (prefer.s['chat.sendOnEnter']) {
		if (!(ev.ctrlKey || ev.metaKey || ev.shiftKey)) {
			ev.preventDefault();
			void send();
		}
	} else if (ev.ctrlKey || ev.metaKey) {
		ev.preventDefault();
		void send();
	}
}

function openLocalFile() {
	fileEl.value?.click();
}

function chooseDriveFile(ev: PointerEvent) {
	selectFile({
		anchorElement: ev.currentTarget ?? ev.target,
		multiple: false,
		label: i18n.ts.selectFile,
	}).then(selectedFile => {
		file.value = selectedFile;
	});
}

async function onChangeFile() {
	if (fileEl.value?.files?.[0] == null) return;
	const driveFiles = await os.launchUploader([fileEl.value.files[0]], { multiple: false });
	file.value = driveFiles[0] ?? null;
	fileEl.value.value = '';
}

function buildOutgoingText(): string | undefined {
	const body = text.value.trim();
	if (!replyingTo.value) return body.length > 0 ? body : undefined;

	const quote = `> ${replySender.value}: ${replyPreview.value}`;
	return body.length > 0 ? `${quote}\n${body}` : quote;
}

async function send() {
	if (!canSend.value || sending.value) return;
	sending.value = true;

	try {
		const outgoingText = buildOutgoingText();
		if (props.user) {
			await misskeyApi('chat/messages/create-to-user', {
				toUserId: props.user.id,
				text: outgoingText,
				fileId: file.value?.id,
			});
		} else if (props.room) {
			await misskeyApi('chat/messages/create-to-room', {
				toRoomId: props.room.id,
				text: outgoingText,
				fileId: file.value?.id,
			});
		}
		clear();
	} catch (err) {
		console.error(err);
		void os.alert({ type: 'error', text: i18n.ts.somethingHappened });
	} finally {
		sending.value = false;
	}
}

function clear() {
	text.value = '';
	file.value = null;
	replyingTo.value = null;
	deleteDraft();
}

function saveDraft() {
	const drafts = JSON.parse(miLocalStorage.getItem('chatMessageDrafts') || '{}');
	drafts[getDraftKey()] = {
		updatedAt: new Date(),
		data: {
			text: text.value,
			file: file.value,
		},
	};
	miLocalStorage.setItem('chatMessageDrafts', JSON.stringify(drafts));
}

function deleteDraft() {
	const drafts = JSON.parse(miLocalStorage.getItem('chatMessageDrafts') || '{}');
	delete drafts[getDraftKey()];
	miLocalStorage.setItem('chatMessageDrafts', JSON.stringify(drafts));
}

async function insertEmoji(ev: MouseEvent) {
	textareaReadOnly.value = true;
	const target = ev.currentTarget ?? ev.target;
	if (target == null) return;

	let pos = textareaEl.value?.selectionStart ?? 0;
	let posEnd = textareaEl.value?.selectionEnd ?? text.value.length;
	emojiPicker.show(
		target as HTMLElement,
		emoji => {
			const textBefore = text.value.substring(0, pos);
			const textAfter = text.value.substring(posEnd);
			text.value = textBefore + emoji + textAfter;
			pos += emoji.length;
			posEnd += emoji.length;
		},
		() => {
			textareaReadOnly.value = false;
			void nextTick(() => textareaEl.value?.focus());
		},
	);
}

onMounted(() => {
	if (textareaEl.value != null) {
		autocompleteInstance = new Autocomplete(textareaEl.value, text);
	}

	const draft = JSON.parse(miLocalStorage.getItem('chatMessageDrafts') || '{}')[getDraftKey()];
	if (draft) {
		text.value = draft.data.text;
		file.value = draft.data.file;
	}

	window.addEventListener('nook-chat-reply', onReplyEvent);
});

onBeforeUnmount(() => {
	window.removeEventListener('nook-chat-reply', onReplyEvent);
	if (autocompleteInstance) {
		autocompleteInstance.detach();
		autocompleteInstance = null;
	}
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	overflow: hidden;
	background: #fff;
	border: 1px solid #d7e3f1;
	border-radius: 14px 14px 0 0;
	box-shadow: 0 -4px 18px rgba(23, 50, 77, 0.05);
}

.replyPreview,
.filePreview {
	display: flex;
	align-items: center;
	gap: 9px;
	min-width: 0;
	padding: 8px 12px;
	border-bottom: 1px solid #e3ebf5;
	background: #f8fbff;
	color: #17324d;
}

.replyMark {
	width: 3px;
	height: 34px;
	flex: 0 0 auto;
	border-radius: 3px;
	background: #175cd3;
}

.replyBody {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	gap: 2px;
}

.replyBody strong {
	color: #175cd3;
	font-size: 11px;
}

.replyBody span,
.filePreview span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #667a91;
	font-size: 11px;
}

.replyClose {
	width: 28px;
	height: 28px;
	flex: 0 0 auto;
	border-radius: 7px;
	color: #718399;
}

.filePreview i {
	color: #175cd3;
}

.filePreview span {
	flex: 1;
}

.composer {
	display: flex;
	align-items: flex-end;
	gap: 6px;
	padding: 8px;
}

.leadingButtons {
	display: flex;
	align-items: center;
	gap: 2px;
	padding-bottom: 2px;
}

.iconButton,
.emojiButton {
	display: grid;
	width: 34px;
	height: 34px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 9px;
	color: #667a91;
}

.iconButton:hover,
.emojiButton:hover {
	background: #eef5ff;
	color: #175cd3;
}

.textarea {
	display: block;
	min-width: 0;
	max-height: 160px;
	min-height: 38px;
	flex: 1;
	margin: 0;
	padding: 9px 12px;
	resize: none;
	box-sizing: border-box;
	background: #f5f8fc;
	border: 1px solid #d7e3f1;
	border-radius: 14px;
	outline: none;
	color: #17324d;
	font: inherit;
	line-height: 1.4;
	field-sizing: content;
}

.textarea:focus {
	background: #fff;
	border-color: #9ebce8;
	box-shadow: 0 0 0 2px #eef5ff;
}

.emojiButton {
	margin-bottom: 2px;
}

.send {
	display: grid;
	width: 40px;
	height: 40px;
	flex: 0 0 auto;
	place-items: center;
	margin-bottom: 1px;
	border: 1px solid #e2bc2d;
	border-radius: 12px;
	background: #ffd84d;
	color: #17324d;
	font-size: 17px;
}

.send:disabled {
	opacity: 0.45;
}

@media (max-width: 500px) {
	.composer {
		gap: 4px;
		padding: 7px;
	}

	.leadingButtons .iconButton:nth-child(2) {
		display: none;
	}

	.iconButton,
	.emojiButton {
		width: 32px;
		height: 32px;
	}
}
</style>
