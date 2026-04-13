require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const commands = require('./commands');

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, BACKEND_URL, ADMIN_IDS } = process.env;
const adminIds = (ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

// 출석 쿨타임 메모리 저장 (재시작 시 초기화)
const dailyCooldown = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ── 커맨드 등록 ───────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('✅ 슬래시 커맨드 등록 완료');
  } catch (e) { console.error('커맨드 등록 실패:', e); }
}

// ── 백엔드 API 헬퍼 ──────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${BACKEND_URL}${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

let adminToken = null;
async function getAdminToken() {
  if (adminToken) return adminToken;
  const res = await apiPost('/admin/login', {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin1234'
  });
  adminToken = res.token;
  return adminToken;
}

async function adminApi(path, method = 'GET', body = null) {
  const token = await getAdminToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: body ? JSON.stringify(body) : null
  });
  if (res.status === 401) { adminToken = null; return adminApi(path, method, body); }
  return res.json();
}

// 봇 설정 가져오기
async function getBotSetting(key, defaultValue) {
  try {
    const data = await apiGet(`/admin/bot-settings/${key}`);
    return data.value ?? defaultValue;
  } catch { return defaultValue; }
}

// 유저 조회
async function getUserByDiscordId(discordId) {
  const users = await adminApi(`/admin/users?search=${discordId}`);
  return Array.isArray(users) ? users.find(u => u.discord_id === discordId) || null : null;
}

// ── 봇 준비 ──────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`🎰 ${client.user.tag} 온라인!`);
  const siteUrl = await getBotSetting('site_url', 'http://localhost:3000');
  client.user.setActivity(`카지노 | ${siteUrl}`, { type: 3 });
  await registerCommands();
});

// ── 슬래시 커맨드 처리 ───────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user } = interaction;
  const isAdmin = adminIds.includes(user.id);

  // ── /잔고 ───────────────────────────────────────────────
  if (commandName === '잔고') {
    await interaction.deferReply();
    const dbUser = await getUserByDiscordId(user.id);
    if (!dbUser) {
      const siteUrl = await getBotSetting('site_url', 'http://localhost:3000');
      return interaction.editReply({ embeds: [errorEmbed('계정 없음', `아직 가입하지 않았어요!\n${siteUrl} 에서 디스코드로 로그인하면 자동 가입됩니다.`)] });
    }
    const embed = new EmbedBuilder()
      .setColor(0xF0C040)
      .setTitle('💰 포인트 잔고')
      .setThumbnail(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`)
      .addFields(
        { name: '👤 유저', value: dbUser.username, inline: true },
        { name: '💵 잔고', value: `**${dbUser.points.toLocaleString()}P**`, inline: true },
        { name: '🎲 총 베팅', value: `${dbUser.total_bet.toLocaleString()}P`, inline: true },
        { name: '🏆 총 획득', value: `${dbUser.total_win.toLocaleString()}P`, inline: true },
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /랭킹 ───────────────────────────────────────────────
  else if (commandName === '랭킹') {
    await interaction.deferReply();
    const top = await apiGet('/game/leaderboard');
    const medals = ['🥇','🥈','🥉'];
    const desc = top.slice(0, 10).map((u, i) =>
      `${medals[i] || `**${i+1}.**`} **${u.username}** — ${u.points.toLocaleString()}P`
    ).join('\n');
    const embed = new EmbedBuilder().setColor(0xF0C040).setTitle('🏆 포인트 랭킹 TOP 10').setDescription(desc || '데이터 없음').setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /사이트 ─────────────────────────────────────────────
  else if (commandName === '사이트') {
    const siteUrl = await getBotSetting('site_url', 'http://localhost:3000');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎰 카지노 사이트')
      .setDescription(`🔗 **[사이트 바로가기](${siteUrl})**\n\n디스코드로 로그인 후 바로 플레이!`)
      .addFields({ name: '🎮 게임', value: '부스타빗 · 바카라 · 블랙잭 · 홀덤\n룰렛 · 플링코 · 사다리 · 홀짝 · 코인플립 · 주사위' })
      .setTimestamp();
    interaction.reply({ embeds: [embed] });
  }

  // ── /출석 ───────────────────────────────────────────────
  else if (commandName === '출석') {
    await interaction.deferReply();

    // 출석 기능 활성화 여부
    const enabled = await getBotSetting('daily_enabled', 'true');
    if (enabled === 'false') return interaction.editReply({ embeds: [errorEmbed('출석 비활성화', '현재 출석 기능이 비활성화되어 있습니다')] });

    const dbUser = await getUserByDiscordId(user.id);
    if (!dbUser) {
      const siteUrl = await getBotSetting('site_url', 'http://localhost:3000');
      return interaction.editReply({ embeds: [errorEmbed('계정 없음', `먼저 ${siteUrl} 에서 가입해주세요!`)] });
    }

    const cooldownHours = parseInt(await getBotSetting('daily_cooldown_hours', '24'));
    const points = parseInt(await getBotSetting('daily_points', '500'));
    const cooldownMs = cooldownHours * 60 * 60 * 1000;

    const lastClaim = dailyCooldown.get(user.id);
    const now = Date.now();

    if (lastClaim && now - lastClaim < cooldownMs) {
      const remaining = cooldownMs - (now - lastClaim);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return interaction.editReply({ embeds: [errorEmbed('이미 출석했어요', `다음 출석까지 **${hours}시간 ${minutes}분** 남았어요`)] });
    }

    await adminApi(`/admin/users/${dbUser.id}/points`, 'POST', { amount: points, memo: '출석 보너스' });
    dailyCooldown.set(user.id, now);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅ 출석 완료!')
      .setDescription(`**${dbUser.username}** 님께 **${points.toLocaleString()}P** 지급!\n다음 출석: **${cooldownHours}시간** 후`)
      .setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /전적 ───────────────────────────────────────────────
  else if (commandName === '전적') {
    await interaction.deferReply();
    const dbUser = await getUserByDiscordId(user.id);
    if (!dbUser) return interaction.editReply({ embeds: [errorEmbed('계정 없음', '먼저 사이트에 가입해주세요')] });
    const profit = dbUser.total_win - dbUser.total_bet;
    const embed = new EmbedBuilder()
      .setColor(profit >= 0 ? 0x57F287 : 0xED4245)
      .setTitle(`🎮 ${dbUser.username}님의 전적`)
      .addFields(
        { name: '💰 현재 잔고', value: `${dbUser.points.toLocaleString()}P`, inline: true },
        { name: '🎲 총 베팅', value: `${dbUser.total_bet.toLocaleString()}P`, inline: true },
        { name: '🏆 총 획득', value: `${dbUser.total_win.toLocaleString()}P`, inline: true },
        { name: profit >= 0 ? '📈 순수익' : '📉 순손실', value: `${Math.abs(profit).toLocaleString()}P`, inline: true },
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /지급 ───────────────────────────────────────────────
  else if (commandName === '지급') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply();
    const target = interaction.options.getUser('유저');
    const amount = interaction.options.getInteger('금액');
    const memo = interaction.options.getString('메모') || '관리자 지급';
    const dbUser = await getUserByDiscordId(target.id);
    if (!dbUser) return interaction.editReply({ embeds: [errorEmbed('유저 없음', '사이트에 가입한 유저만 지급 가능해요')] });
    await adminApi(`/admin/users/${dbUser.id}/points`, 'POST', { amount, memo });
    const embed = new EmbedBuilder()
      .setColor(0x57F287).setTitle('✅ 포인트 지급 완료')
      .addFields(
        { name: '👤 대상', value: target.username, inline: true },
        { name: '💵 지급량', value: `+${amount.toLocaleString()}P`, inline: true },
        { name: '📝 메모', value: memo, inline: true },
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /차감 ───────────────────────────────────────────────
  else if (commandName === '차감') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply();
    const target = interaction.options.getUser('유저');
    const amount = interaction.options.getInteger('금액');
    const memo = interaction.options.getString('메모') || '관리자 차감';
    const dbUser = await getUserByDiscordId(target.id);
    if (!dbUser) return interaction.editReply({ embeds: [errorEmbed('유저 없음', '가입한 유저가 없어요')] });
    const result = await adminApi(`/admin/users/${dbUser.id}/points`, 'POST', { amount: -amount, memo });
    if (result.error) return interaction.editReply({ embeds: [errorEmbed('오류', result.error)] });
    const embed = new EmbedBuilder()
      .setColor(0xED4245).setTitle('✅ 포인트 차감 완료')
      .addFields(
        { name: '👤 대상', value: target.username, inline: true },
        { name: '💵 차감량', value: `-${amount.toLocaleString()}P`, inline: true },
        { name: '📝 메모', value: memo, inline: true },
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /잔고확인 ───────────────────────────────────────────
  else if (commandName === '잔고확인') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply();
    const target = interaction.options.getUser('유저');
    const dbUser = await getUserByDiscordId(target.id);
    if (!dbUser) return interaction.editReply({ embeds: [errorEmbed('유저 없음', '가입한 유저가 없어요')] });
    const embed = new EmbedBuilder()
      .setColor(0xF0C040).setTitle(`💰 ${target.username}님 잔고`)
      .addFields(
        { name: '💵 잔고', value: `${dbUser.points.toLocaleString()}P`, inline: true },
        { name: '🎲 총 베팅', value: `${dbUser.total_bet.toLocaleString()}P`, inline: true },
        { name: '🏆 총 획득', value: `${dbUser.total_win.toLocaleString()}P`, inline: true },
        { name: '🚫 정지 여부', value: dbUser.is_banned ? '정지됨' : '정상', inline: true },
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /정지 ───────────────────────────────────────────────
  else if (commandName === '정지') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply();
    const target = interaction.options.getUser('유저');
    const dbUser = await getUserByDiscordId(target.id);
    if (!dbUser) return interaction.editReply({ embeds: [errorEmbed('유저 없음', '가입한 유저가 없어요')] });
    const result = await adminApi(`/admin/users/${dbUser.id}/ban`, 'POST');
    const embed = new EmbedBuilder()
      .setColor(result.is_banned ? 0xED4245 : 0x57F287)
      .setTitle(result.is_banned ? '🚫 유저 정지됨' : '✅ 정지 해제됨')
      .setDescription(`**${target.username}** 님이 ${result.is_banned ? '정지' : '정지 해제'}되었습니다`)
      .setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /포인트초기화 ────────────────────────────────────────
  else if (commandName === '포인트초기화') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply();
    const target = interaction.options.getUser('유저');
    const amount = interaction.options.getInteger('금액');
    const dbUser = await getUserByDiscordId(target.id);
    if (!dbUser) return interaction.editReply({ embeds: [errorEmbed('유저 없음', '가입한 유저가 없어요')] });
    const diff = amount - dbUser.points;
    await adminApi(`/admin/users/${dbUser.id}/points`, 'POST', { amount: diff, memo: '포인트 초기화' });
    const embed = new EmbedBuilder()
      .setColor(0xFEE75C).setTitle('🔄 포인트 초기화 완료')
      .addFields(
        { name: '👤 대상', value: target.username, inline: true },
        { name: '💵 변경 후 잔고', value: `${amount.toLocaleString()}P`, inline: true },
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /공지 ───────────────────────────────────────────────
  else if (commandName === '공지') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    const content = interaction.options.getString('내용');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2).setTitle('📢 공지사항').setDescription(content)
      .setFooter({ text: `공지자: ${user.username}` }).setTimestamp();
    interaction.reply({ embeds: [embed] });
  }

  // ── /봇설정 ─────────────────────────────────────────────
  else if (commandName === '봇설정') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const settings = await adminApi('/admin/bot-settings');
    const embed = new EmbedBuilder()
      .setColor(0xF0C040)
      .setTitle('⚙️ 봇 설정 현황')
      .setDescription('설정을 변경하려면 각 명령어를 사용하세요')
      .addFields(
        settings.map((s) => ({ name: `${s.key}`, value: `\`${s.value}\` — ${s.description || ''}`, inline: false }))
      ).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /출석설정 ────────────────────────────────────────────
  else if (commandName === '출석설정') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const points  = interaction.options.getInteger('포인트');
    const cooldown = interaction.options.getInteger('쿨타임');
    const enabled = interaction.options.getString('활성화');

    const changes = [];
    if (points !== null) {
      await adminApi('/admin/bot-settings', 'POST', { key: 'daily_points', value: points });
      changes.push(`출석 포인트: **${points.toLocaleString()}P**`);
    }
    if (cooldown !== null) {
      await adminApi('/admin/bot-settings', 'POST', { key: 'daily_cooldown_hours', value: cooldown });
      changes.push(`쿨타임: **${cooldown}시간**`);
    }
    if (enabled !== null) {
      await adminApi('/admin/bot-settings', 'POST', { key: 'daily_enabled', value: enabled });
      changes.push(`출석 기능: **${enabled === 'true' ? '활성화' : '비활성화'}**`);
      // 쿨타임 초기화 (비활성화 → 활성화 시)
      if (enabled === 'true') dailyCooldown.clear();
    }

    if (changes.length === 0) return interaction.editReply({ embeds: [errorEmbed('오류', '변경할 설정을 하나 이상 선택해주세요')] });

    const embed = new EmbedBuilder()
      .setColor(0x57F287).setTitle('✅ 출석 설정 변경 완료')
      .setDescription(changes.join('\n')).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /가입보너스설정 ──────────────────────────────────────
  else if (commandName === '가입보너스설정') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const points = interaction.options.getInteger('포인트');
    await adminApi('/admin/bot-settings', 'POST', { key: 'signup_bonus', value: points });
    const embed = new EmbedBuilder()
      .setColor(0x57F287).setTitle('✅ 가입 보너스 설정 완료')
      .setDescription(`가입 보너스: **${points.toLocaleString()}P**`)
      .setFooter({ text: '다음 가입자부터 적용됩니다' }).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /사이트설정 ──────────────────────────────────────────
  else if (commandName === '사이트설정') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const url = interaction.options.getString('url');
    await adminApi('/admin/bot-settings', 'POST', { key: 'site_url', value: url });
    client.user.setActivity(`카지노 | ${url}`, { type: 3 });
    const embed = new EmbedBuilder()
      .setColor(0x57F287).setTitle('✅ 사이트 URL 설정 완료')
      .setDescription(`사이트 주소: **${url}**`).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }

  // ── /통계 ────────────────────────────────────────────────
  else if (commandName === '통계') {
    if (!isAdmin) return interaction.reply({ embeds: [errorEmbed('권한 없음', '관리자만 사용 가능해요')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const stats = await adminApi('/admin/stats');
    const profit = stats.houseProfit || 0;
    const embed = new EmbedBuilder()
      .setColor(0xF0C040).setTitle('📊 카지노 통계')
      .addFields(
        { name: '👥 총 유저', value: `${stats.totalUsers?.toLocaleString()}명`, inline: true },
        { name: '🎲 총 베팅', value: `${stats.totalBet?.toLocaleString()}P`, inline: true },
        { name: '💸 총 지급', value: `${stats.totalPayout?.toLocaleString()}P`, inline: true },
        { name: profit >= 0 ? '📈 하우스 수익' : '📉 하우스 손실', value: `${Math.abs(profit).toLocaleString()}P`, inline: true },
        { name: '📅 오늘 베팅', value: `${stats.todayBet?.toLocaleString()}P`, inline: true },
      )
      .addFields({
        name: '🎮 게임별 통계',
        value: stats.gameStats?.slice(0, 5).map((g) =>
          `**${g.game}**: ${g.count}게임 / 수익 ${(g.total_bet - g.total_payout).toLocaleString()}P`
        ).join('\n') || '데이터 없음'
      })
      .setTimestamp();
    interaction.editReply({ embeds: [embed] });
  }
});

function errorEmbed(title, desc) {
  return new EmbedBuilder().setColor(0xED4245).setTitle(`❌ ${title}`).setDescription(desc).setTimestamp();
}

client.login(DISCORD_BOT_TOKEN);
