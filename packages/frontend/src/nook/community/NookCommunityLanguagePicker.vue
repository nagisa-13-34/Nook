<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div :class="$style.root">
	<button class="_button" :class="$style.trigger" :title="l.selectLanguage" @click="opened=true"><i class="ti ti-language"></i><span>{{ currentLabel }}</span><i class="ti ti-chevron-down"></i></button>
	<div v-if="opened" :class="$style.backdrop" @click.self="opened=false">
		<section :class="$style.modal" role="dialog" aria-modal="true">
			<header><strong>{{ l.selectLanguage }}</strong><button class="_button" @click="opened=false"><i class="ti ti-x"></i></button></header>
			<div :class="$style.languages">
				<button v-for="language in languages" :key="language.code" class="_button" :class="[$style.language,{[$style.active]:targetLang===language.code}]" @click="choose(language.code)"><span>{{ language.name }}</span><small>{{ language.code.toUpperCase() }}</small><i v-if="targetLang===language.code" class="ti ti-check"></i></button>
			</div>
		</section>
	</div>
</div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { communityLabels as l } from './labels.js';
import { nookAutoTranslateTargetLang } from './translation-preferences.js';
const opened=ref(false); const targetLang=nookAutoTranslateTargetLang;
const languages=[
	{code:'ja',name:'日本語'},{code:'en',name:'English'},{code:'ko',name:'한국어'},{code:'zh',name:'中文'},{code:'es',name:'Español'},{code:'fr',name:'Français'},{code:'de',name:'Deutsch'},{code:'pt',name:'Português'},{code:'it',name:'Italiano'},{code:'ru',name:'Русский'},{code:'uk',name:'Українська'},{code:'id',name:'Bahasa Indonesia'},{code:'th',name:'ไทย'},{code:'vi',name:'Tiếng Việt'}
];
const currentLabel=computed(()=>languages.find(x=>x.code===targetLang.value)?.name??targetLang.value.toUpperCase());
function choose(code:string){targetLang.value=code;opened.value=false}
</script>
<style lang="scss" module>
.root{display:inline-flex}.trigger{height:34px;display:flex;align-items:center;gap:6px;padding:0 9px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d;font-size:11px}.trigger:hover{background:#eef5ff;color:#175cd3}.backdrop{position:fixed;z-index:100000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(18,34,51,.35)}.modal{width:min(420px,100%);max-height:min(620px,calc(100dvh - 36px));overflow:hidden;background:#fff;border:1px solid #d7e3f1;border-radius:10px;color:#17324d}.modal header{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #d7e3f1}.modal header button{width:30px;height:30px;border-radius:6px}.languages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:10px;max-height:500px;overflow:auto}.language{display:grid;grid-template-columns:minmax(0,1fr) auto 18px;align-items:center;gap:6px;padding:9px;border-radius:7px;text-align:left}.language:hover{background:#f3f7fb}.language.active{background:#eef5ff;color:#175cd3}.language small{color:#8190a0;font-size:9px}@media(max-width:500px){.languages{grid-template-columns:1fr}}
</style>