<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_panel" :class="$style.root">
	<header :class="$style.header"><div><strong>🔊 {{ channel.name }}</strong><small v-if="channel.topic"> · {{ channel.topic }}</small></div><button v-if="joined" class="_button" @click="leave">{{ l.leave }}</button></header>
	<div v-if="!joined"><button class="_button" :class="$style.primary" @click="join">🎙 {{ l.voice }} に参加</button></div>
	<template v-else>
		<div :class="$style.peers"><span>自分</span><span v-for="peer in peers" :key="peer">👤 {{ peer }}</span></div>
		<NookRemoteAudio v-for="(stream,userId) in remoteStreams" :key="userId" :stream="stream"/>
		<div v-if="heartbeat?.config.ttsEnabled" :class="$style.status">🗣 {{ l.tts }} ON</div>
		<div v-if="heartbeat?.config.musicEnabled" :class="$style.music">
			<audio ref="musicAudio" controls></audio><div>{{ heartbeat.music?.title || heartbeat.music?.url || l.music }}</div><button class="_button" @click="resumeMusicLocally">▶ Local play</button>
		</div>
		<details v-if="canManage" :class="$style.admin"><summary>{{ l.settings }}</summary>
			<label><input :checked="heartbeat?.config.ttsEnabled" type="checkbox" @change="updateTts(($event.target as HTMLInputElement).checked)"> {{ l.tts }}</label>
			<select :value="heartbeat?.config.ttsSourceChannelId || ''" @change="updateTtsSource(($event.target as HTMLSelectElement).value)"><option value="">TTS source</option><option v-for="item in textChannels" :key="item.id" :value="item.id"># {{ item.name }}</option></select>
			<input v-model="ttsLanguage" maxlength="24" placeholder="ja-JP">
			<label><input :checked="heartbeat?.config.musicEnabled" type="checkbox" @change="updateMusicEnabled(($event.target as HTMLInputElement).checked)"> {{ l.music }}</label>
			<input v-model="musicUrl" placeholder="https://…" :class="$style.input"><input v-model="musicTitle" placeholder="Title" :class="$style.input">
			<div><button class="_button" @click="setMusic(true)">▶</button><button class="_button" @click="setMusic(false)">⏸</button><button class="_button" @click="stopMusic">⏹</button></div>
		</details>
	</template>
</section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { $i } from '@/i.js';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import NookRemoteAudio from './NookRemoteAudio.vue';
import type { CommunityChannel, VoiceHeartbeat } from './types.js';

const props=defineProps<{communityId:string;channel:CommunityChannel;channels:CommunityChannel[];canManage:boolean}>();
const joined=ref(false); const sessionId=ref(''); const canSpeak=ref(false); const peers=ref<string[]>([]); const heartbeat=ref<VoiceHeartbeat|null>(null); const remoteStreams=ref<Record<string,MediaStream>>({}); const musicAudio=ref<HTMLAudioElement|null>(null); const musicUrl=ref(''); const musicTitle=ref(''); const ttsLanguage=ref(navigator.language || 'ja-JP');
const textChannels=computed(()=>props.channels.filter(c=>c.kind!=='voice'&&c.archivedAt==null));
let localStream:MediaStream|null=null; let iceServers:RTCIceServer[]=[]; const pcs=new Map<string,RTCPeerConnection>(); let signalTimer:number|undefined; let heartbeatTimer:number|undefined; let ttsTimer:number|undefined; const ttsSeen=new Set<string>(); let ttsInitialized=false;

async function signal(toUserId:string,type:'offer'|'answer'|'ice',payload:unknown){if(!sessionId.value)return;await nookApi('nook/community/voice/signal',{channelId:props.channel.id,sessionId:sessionId.value,toUserId,type,payload:JSON.stringify(payload)});}
async function ensurePeer(userId:string,offer:boolean){if(pcs.has(userId))return pcs.get(userId)!;const pc=new RTCPeerConnection({iceServers});pcs.set(userId,pc);if(localStream)for(const track of localStream.getTracks())pc.addTrack(track,localStream);pc.onicecandidate=e=>{if(e.candidate)void signal(userId,'ice',e.candidate.toJSON());};pc.ontrack=e=>{const stream=e.streams[0]??new MediaStream([e.track]);remoteStreams.value={...remoteStreams.value,[userId]:stream};};pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))closePeer(userId);};if(offer){const description=await pc.createOffer();await pc.setLocalDescription(description);await signal(userId,'offer',description);}return pc;}
function closePeer(userId:string){pcs.get(userId)?.close();pcs.delete(userId);const next={...remoteStreams.value};delete next[userId];remoteStreams.value=next;}
async function pollSignals(){if(!joined.value)return;try{const signals=await nookApi<Array<{fromUserId:string;type:'offer'|'answer'|'ice';payload:string}>>('nook/community/voice/signals',{channelId:props.channel.id,sessionId:sessionId.value});for(const item of signals){const pc=await ensurePeer(item.fromUserId,false);const payload=JSON.parse(item.payload);if(item.type==='offer'){await pc.setRemoteDescription(payload);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await signal(item.fromUserId,'answer',answer);}else if(item.type==='answer'){if(pc.signalingState!=='stable')await pc.setRemoteDescription(payload);}else if(item.type==='ice'){try{await pc.addIceCandidate(payload);}catch{}}}}catch{await leave();}}
async function doHeartbeat(){if(!joined.value)return;try{const state=await nookApi<VoiceHeartbeat>('nook/community/voice/heartbeat',{channelId:props.channel.id,sessionId:sessionId.value});heartbeat.value=state;peers.value=state.peers;for(const peer of state.peers)await ensurePeer(peer,($i?.id??'')<peer);for(const peer of [...pcs.keys()])if(!state.peers.includes(peer))closePeer(peer);applyMusic(state);void pollTts(state);}catch{await leave();}}
async function join(){const result=await nookApi<{sessionId:string;peers:string[];canSpeak:boolean;iceServersJson:string}>('nook/community/voice/join',{communityId:props.communityId,channelId:props.channel.id});sessionId.value=result.sessionId;canSpeak.value=result.canSpeak;try{iceServers=JSON.parse(result.iceServersJson);}catch{iceServers=[];}if(canSpeak.value){try{localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});}catch{localStream=null;}}joined.value=true;peers.value=result.peers;for(const peer of result.peers)await ensurePeer(peer,($i?.id??'')<peer);signalTimer=window.setInterval(()=>void pollSignals(),1000);heartbeatTimer=window.setInterval(()=>void doHeartbeat(),10000);ttsTimer=window.setInterval(()=>{if(heartbeat.value)void pollTts(heartbeat.value);},2500);await doHeartbeat();}
async function leave(){if(!joined.value)return;joined.value=false;if(signalTimer)clearInterval(signalTimer);if(heartbeatTimer)clearInterval(heartbeatTimer);if(ttsTimer)clearInterval(ttsTimer);for(const pc of pcs.values())pc.close();pcs.clear();remoteStreams.value={};localStream?.getTracks().forEach(t=>t.stop());localStream=null;speechSynthesis.cancel();musicAudio.value?.pause();try{await nookApi('nook/community/voice/leave',{channelId:props.channel.id,sessionId:sessionId.value});}catch{}sessionId.value='';}
async function pollTts(state:VoiceHeartbeat){const source=state.config.ttsSourceChannelId;if(!state.config.ttsEnabled||!source)return;try{const messages=await nookApi<Array<{id:string;body:string}>>('nook/community/messages/list',{communityId:props.communityId,channelId:source,limit:20});if(!ttsInitialized){messages.forEach(m=>ttsSeen.add(m.id));ttsInitialized=true;return;}for(const message of messages){if(ttsSeen.has(message.id))continue;ttsSeen.add(message.id);const utterance=new SpeechSynthesisUtterance(message.body);utterance.lang=state.config.ttsLanguage||navigator.language;speechSynthesis.speak(utterance);}}catch{}}
function applyMusic(state:VoiceHeartbeat){const el=musicAudio.value;if(!el)return;const music=state.music;if(!state.config.musicEnabled||music?.url==null){el.pause();return;}if(el.src!==music.url){el.src=music.url;musicUrl.value=music.url;musicTitle.value=music.title??'';}const elapsed=music.playing?(Date.now()-new Date(music.updatedAt).getTime())/1000:0;const desired=Math.max(0,music.positionSeconds+elapsed);if(Number.isFinite(el.duration)&&Math.abs(el.currentTime-desired)>2)el.currentTime=Math.min(desired,el.duration||desired);if(music.playing)void el.play().catch(()=>{});else el.pause();}
async function updateVoiceConfig(data:Record<string,unknown>){await nookApi('nook/community/voice/config-update',{communityId:props.communityId,channelId:props.channel.id,...data});await doHeartbeat();}
async function updateTts(value:boolean){await updateVoiceConfig({ttsEnabled:value,ttsLanguage:ttsLanguage.value});}
async function updateTtsSource(value:string){await updateVoiceConfig({ttsSourceChannelId:value||null,ttsLanguage:ttsLanguage.value});}
async function updateMusicEnabled(value:boolean){await updateVoiceConfig({musicEnabled:value});}
async function setMusic(playing:boolean){await nookApi('nook/community/voice/music-update',{communityId:props.communityId,channelId:props.channel.id,url:musicUrl.value||null,title:musicTitle.value||null,positionSeconds:musicAudio.value?.currentTime??0,playing});await doHeartbeat();}
async function stopMusic(){musicUrl.value='';musicTitle.value='';await nookApi('nook/community/voice/music-update',{communityId:props.communityId,channelId:props.channel.id,url:null,title:null,positionSeconds:0,playing:false});await doHeartbeat();}
function resumeMusicLocally(){void musicAudio.value?.play().catch(()=>{});}
onBeforeUnmount(()=>{void leave();});
</script>
<style module>.root{padding:16px}.header{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}.peers{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.peers span,.status{padding:6px 9px;border-radius:999px;background:color(from var(--MI_THEME-accent) srgb r g b / .1)}.primary{padding:10px 16px;border-radius:8px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}.music{margin-top:12px}.music audio{width:100%}.admin{margin-top:16px;border-top:1px solid var(--MI_THEME-divider);padding-top:12px}.admin label,.admin select{display:block;margin:8px 0}.input{width:100%;box-sizing:border-box;margin:6px 0;padding:8px;background:var(--MI_THEME-bg);color:var(--MI_THEME-fg);border:1px solid var(--MI_THEME-divider);border-radius:7px}</style>
