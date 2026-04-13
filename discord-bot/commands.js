const { SlashCommandBuilder } = require('discord.js');

module.exports = [
  // ── 일반 유저 ──────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('잔고')
    .setDescription('내 포인트 잔고를 확인합니다'),

  new SlashCommandBuilder()
    .setName('랭킹')
    .setDescription('포인트 랭킹 TOP 10을 확인합니다'),

  new SlashCommandBuilder()
    .setName('사이트')
    .setDescription('카지노 사이트 링크를 가져옵니다'),

  new SlashCommandBuilder()
    .setName('출석')
    .setDescription('매일 1회 출석 포인트를 받습니다'),

  new SlashCommandBuilder()
    .setName('전적')
    .setDescription('내 게임 전적을 확인합니다'),

  // ── 관리자: 유저 관리 ──────────────────────────────────
  new SlashCommandBuilder()
    .setName('지급')
    .setDescription('[관리자] 유저에게 포인트를 지급합니다')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addIntegerOption(o => o.setName('금액').setDescription('지급할 포인트').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('메모').setDescription('지급 사유').setRequired(false)),

  new SlashCommandBuilder()
    .setName('차감')
    .setDescription('[관리자] 유저의 포인트를 차감합니다')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addIntegerOption(o => o.setName('금액').setDescription('차감할 포인트').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('메모').setDescription('차감 사유').setRequired(false)),

  new SlashCommandBuilder()
    .setName('잔고확인')
    .setDescription('[관리자] 특정 유저의 잔고를 확인합니다')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true)),

  new SlashCommandBuilder()
    .setName('정지')
    .setDescription('[관리자] 유저를 정지하거나 해제합니다')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true)),

  new SlashCommandBuilder()
    .setName('포인트초기화')
    .setDescription('[관리자] 유저 포인트를 특정 값으로 설정합니다')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addIntegerOption(o => o.setName('금액').setDescription('설정할 포인트').setRequired(true).setMinValue(0)),

  new SlashCommandBuilder()
    .setName('공지')
    .setDescription('[관리자] 공지사항을 전송합니다')
    .addStringOption(o => o.setName('내용').setDescription('공지 내용').setRequired(true)),

  // ── 관리자: 봇 설정 ────────────────────────────────────
  new SlashCommandBuilder()
    .setName('봇설정')
    .setDescription('[관리자] 봇 설정을 확인합니다'),

  new SlashCommandBuilder()
    .setName('출석설정')
    .setDescription('[관리자] 출석 보상 설정을 변경합니다')
    .addIntegerOption(o => o.setName('포인트').setDescription('출석 보상 포인트').setRequired(false).setMinValue(1))
    .addIntegerOption(o => o.setName('쿨타임').setDescription('출석 쿨타임 (시간)').setRequired(false).setMinValue(1).setMaxValue(168))
    .addStringOption(o => o.setName('활성화').setDescription('출석 기능 활성화 여부').setRequired(false).addChoices({ name: '활성화', value: 'true' }, { name: '비활성화', value: 'false' })),

  new SlashCommandBuilder()
    .setName('가입보너스설정')
    .setDescription('[관리자] 첫 가입 보너스 포인트를 설정합니다')
    .addIntegerOption(o => o.setName('포인트').setDescription('가입 보너스 포인트').setRequired(true).setMinValue(0)),

  new SlashCommandBuilder()
    .setName('사이트설정')
    .setDescription('[관리자] 사이트 URL을 설정합니다')
    .addStringOption(o => o.setName('url').setDescription('사이트 주소 (예: https://casino.example.com)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('통계')
    .setDescription('[관리자] 카지노 전체 통계를 확인합니다'),

].map(cmd => cmd.toJSON());
