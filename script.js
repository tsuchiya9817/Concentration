(() => {
  const STORAGE_KEY = 'neon-concentration-save-v1';
  const suits = [
    { symbol: '♠', color: 'black' },
    { symbol: '♥', color: 'red' },
    { symbol: '♣', color: 'black' },
    { symbol: '♦', color: 'red' },
  ];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const drinkTasks = {
    A: { target: 'other', points: 5, action: '1ショット分', hint: '相手全員\n1ショット' },
    '2': { target: 'other', points: 4, action: '4/5杯分', hint: '相手全員\n4/5杯' },
    '3': { target: 'other', points: 3, action: '3/5杯分', hint: '相手全員\n3/5杯' },
    '4': { target: 'other', points: 3, action: '3/5杯分', hint: '相手全員\n3/5杯' },
    '5': { target: 'other', points: 2, action: '2/5杯分', hint: '相手全員\n2/5杯' },
    '6': { target: 'other', points: 2, action: '2/5杯分', hint: '相手全員\n2/5杯' },
    '7': { target: 'other', points: 1, action: '1/5杯分', hint: '相手全員\n1/5杯' },
    '8': { target: 'other', points: 1, action: '1/5杯分', hint: '相手全員\n1/5杯' },
    '9': { target: 'other', points: 1, action: '1/5杯分', hint: '相手全員\n1/5杯' },
    '10': { target: 'self', points: -1, action: '最大1/5杯を回復', hint: '自分\n回復1/5' },
    J: { target: 'self', points: -1, action: '最大1/5杯を回復', hint: '自分\n回復1/5' },
    Q: { target: 'self', points: -2, action: '最大2/5杯を回復', hint: '自分\n回復2/5' },
    K: { target: 'self', points: -2, action: '最大2/5杯を回復', hint: '自分\n回復2/5' },
  };
  const menuScreen = document.querySelector('#menuScreen');
  const gameScreen = document.querySelector('#gameScreen');
  const board = document.querySelector('#board');
  const message = document.querySelector('#message');
  const turnsDisplay = document.querySelector('#turns');
  const playersContainer = document.querySelector('#players');
  const playerOptions = [...document.querySelectorAll('[data-players]')];
  const powersPanel = document.querySelector('#powers');
  const powerButtons = [...document.querySelectorAll('.power-button')];
  const resumeButton = document.querySelector('#resumeButton');
  const drinkEventPanel = document.querySelector('#drinkEvent');
  const drinkEventText = document.querySelector('#drinkEventText');
  const memoryCountdownPanel = document.querySelector('#memoryCountdownPanel');
  const memoryCountdown = document.querySelector('#memoryCountdown');
  const app = document.querySelector('.app');
  let state = null;
  let timerId = null;
  let countdownIntervalId = null;
  let selectedPlayerCount = 2;
  const playerColors = [
    { main: '#42f5e9', soft: '#e2fffb', glow: '#42f5e9bb' },
    { main: '#ff4fd8', soft: '#fff0fc', glow: '#ff4fd8bb' },
    { main: '#a3ff70', soft: '#f1ffe8', glow: '#a3ff70bb' },
    { main: '#ffad66', soft: '#fff3e8', glow: '#ffad66bb' },
    { main: '#ad92ff', soft: '#f3efff', glow: '#ad92ffbb' },
    { main: '#ffe27a', soft: '#fffbe8', glow: '#ffe27abb' },
  ];

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function makeDeck(size) {
    const chosenSuits = size === 52 ? suits : [suits[0], suits[1]];
    return ranks.flatMap((rank) => chosenSuits.map((suit) => ({
      rank,
      symbol: suit.symbol,
      color: suit.color,
      revealed: false,
      matched: false,
    })));
  }

  function pickWantedRanks(size) {
    const count = size === 52 ? 5 : 3;
    return shuffle([...ranks]).slice(0, count).sort((a, b) => ranks.indexOf(a) - ranks.indexOf(b));
  }

  function modeName(mode) {
    return mode === 'psychic' ? '超能力' : mode === 'wanted' ? 'WANTED' : mode === 'drink' ? '飲み会' : '通常';
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (![26, 52].includes(saved.deckSize) || !Array.isArray(saved.cards) || saved.cards.length !== saved.deckSize) return null;
      if (!Array.isArray(saved.scores) || (!Array.isArray(saved.usedPowers) && !Object.prototype.hasOwnProperty.call(saved, 'usedAbility') && !Object.prototype.hasOwnProperty.call(saved, 'usedAbilities'))) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The game can still be played if browser storage is unavailable.
    }
    resumeButton.hidden = !state;
  }

  function buildCard(face, index) {
    const card = document.createElement('button');
    card.className = 'card';
    card.type = 'button';
    card.innerHTML = `
      <span class="card-inner">
        <span class="face back" aria-hidden="true"><span class="back-mark">✦</span></span>
        <span class="face front ${face.color}${state.mode === 'drink' ? ' drink-face' : ''}" aria-hidden="true">
          <span class="corner top"><span>${face.rank}</span><span>${face.symbol}</span></span>
          <span class="pip">${face.symbol}</span>
          ${state.mode === 'drink' ? `<span class="task-hint">${drinkTasks[face.rank].hint.replace('\n', '<br>')}</span>` : ''}
          <span class="corner bottom"><span>${face.rank}</span><span>${face.symbol}</span></span>
        </span>
      </span>`;
    card.addEventListener('click', () => flipCard(index));
    return card;
  }

  function rebuildBoard() {
    board.replaceChildren(...state.cards.map(buildCard));
    board.className = `board deck-${state.deckSize}`;
  }

  function updateBoard() {
    const memorizing = state.phase === 'memorize';
    board.classList.toggle('memorizing', memorizing);
    const activeColor = playerColors[state.activePlayer].main;
    const activeGlow = playerColors[state.activePlayer].glow;
    board.style.setProperty('--active-player-color', activeColor);
    board.style.setProperty('--active-player-glow', activeGlow);
    [...board.children].forEach((element, index) => {
      const card = state.cards[index];
      element.classList.toggle('flipped', memorizing || card.revealed || card.matched || (state.peekActive && !card.matched));
      element.classList.toggle('selected', card.revealed && !card.matched);
      element.classList.toggle('matched', card.matched);
      element.classList.toggle('peek-found', state.peekActive && card.matched);
      element.classList.toggle('peek-unfound', state.peekActive && !card.matched);
      const owner = card.matchedBy;
      if (Number.isInteger(owner) && playerColors[owner]) {
        element.style.setProperty('--owner-color', playerColors[owner].main);
        element.style.setProperty('--owner-soft', playerColors[owner].soft);
        element.style.setProperty('--owner-glow', playerColors[owner].glow);
      }
      element.disabled = memorizing || state.phase === 'resolving' || state.phase === 'gameover';
      const faceText = `${card.rank}${card.symbol}`;
      const taskText = state.mode === 'drink' ? `、${drinkTasks[card.rank].hint.replace('\n', ' ')}` : '';
      const memoryText = state.mode === 'drink' ? `カード ${index + 1}、数字 ${card.rank}` : faceText;
      const peekText = state.peekActive ? (card.matched ? '、発見済み' : '、未発見') : '';
      element.setAttribute('aria-label', memorizing ? memoryText : card.matched ? `${faceText}、ペア成立${taskText}${peekText}` : card.revealed || state.peekActive ? `${faceText}${taskText}${peekText}` : `カード ${index + 1}、裏向き`);
      element.setAttribute('aria-pressed', card.revealed || card.matched ? 'true' : 'false');
    });
  }

  function renderPlayers() {
    const playerElements = state.scores.map((score, index) => {
      const player = document.createElement('div');
      player.className = `player player-${index}`;
      player.style.setProperty('--player-color', playerColors[index].main);
      player.style.setProperty('--player-glow', playerColors[index].glow);
      player.classList.toggle('active', index === state.activePlayer && state.phase !== 'gameover');
      player.classList.toggle('winner', state.winners.includes(index));

      const name = document.createElement('span');
      name.className = 'player-name';
      name.textContent = `PLAYER ${index + 1}`;
      const stats = document.createElement('span');
      stats.className = 'player-stat';
      const scoreDisplay = document.createElement('span');
      scoreDisplay.className = 'score';
      scoreDisplay.textContent = score;
      const scoreUnit = document.createElement('span');
      scoreUnit.className = 'score-unit';
      scoreUnit.textContent = state.mode === 'drink' ? 'DRINK PTS' : 'PTS';
      const pairCount = document.createElement('span');
      pairCount.className = 'pair-count';
      pairCount.textContent = `${state.pairs[index]} ペア`;
      const cups = document.createElement('span');
      cups.className = 'shot-equivalent';
      cups.textContent = `${(score / 5).toFixed(1)}杯`;
      stats.append(scoreDisplay, scoreUnit, pairCount, cups);
      player.append(name, stats);
      return player;
    });
    playersContainer.replaceChildren(...playerElements);
    document.querySelector('#scoreboard').className = `scoreboard player-count-${state.playerCount}`;
  }

  function updateUI() {
    turnsDisplay.textContent = state.turns;
    renderPlayers();
    document.querySelector('#deckLabel').textContent = `${state.deckSize}枚 · ${modeName(state.mode)}`;
    app.classList.toggle('drink-mode', state.mode === 'drink');
    document.querySelector('#wantedBanner').hidden = state.mode !== 'wanted';
    document.querySelector('#wantedNumber').textContent = state.wantedRanks.join('　');
    drinkEventPanel.hidden = state.mode !== 'drink';
    drinkEventText.textContent = state.drinkEvent || 'ペアがそろうと、数字ごとの指示が出ます。';
    message.textContent = state.message;
    message.classList.toggle('won', state.phase === 'gameover');
    memoryCountdownPanel.hidden = state.phase !== 'memorize';
    if (state.phase === 'memorize') updateCountdown();
    powersPanel.hidden = state.mode !== 'psychic';
    const hasSelection = state.cards.some((card) => card.revealed && !card.matched);
    powerButtons.forEach((button) => {
      const playerAbility = state.usedAbilities[state.activePlayer];
      const used = playerAbility === button.dataset.power;
      const available = !playerAbility;
      button.disabled = state.phase !== 'playing' || hasSelection || !available;
      button.classList.toggle('used', used);
      button.classList.toggle('unavailable', !available && !used);
      button.setAttribute('aria-label', `${button.querySelector('span:nth-child(2)').textContent}${used ? ' 使用済み' : available ? ' 使用可能' : ' このプレイヤーは能力使用済み'}`);
    });
    updateBoard();
    save();
  }

  function setTurnMessage() {
    state.message = `PLAYER ${state.activePlayer + 1} の番です。カードを2枚めくろう。`;
  }

  function switchPlayer() {
    state.activePlayer = (state.activePlayer + 1) % state.playerCount;
    state.fourCardTurn = false;
    setTurnMessage();
  }

  function endGame() {
    state.phase = 'gameover';
    state.memorizeUntil = null;
    state.fourCardTurn = false;
    state.peekActive = false;
    const lowerScoreWins = state.mode === 'drink';
    const bestScore = lowerScoreWins ? Math.min(...state.scores) : Math.max(...state.scores);
    state.winners = state.scores.flatMap((score, index) => score === bestScore ? [index] : []);
    if (state.mode === 'drink') {
      const cups = state.scores.map((score) => `${(score / 5).toFixed(1)}杯`);
      const winnersText = state.winners.map((index) => `PLAYER ${index + 1}`).join('・');
      const scoresText = cups.map((cup, index) => `P${index + 1} ${cup}`).join(' ／ ');
      state.message = state.winners.length > 1
        ? `引き分け！ ${winnersText}（${scoresText}）`
        : `${winnersText} の勝ち！（${scoresText}）`;
      return;
    }
    const winnersText = state.winners.map((index) => `PLAYER ${index + 1}`).join('・');
    const scoresText = state.scores.map((score, index) => `P${index + 1} ${score}pt`).join(' ／ ');
    state.message = state.winners.length > 1
      ? `引き分け！ ${winnersText}（${scoresText}）`
      : `${winnersText} の勝ち！（${scoresText}）`;
  }

  function resolveTurn(indices) {
    const byRank = new Map();
    indices.forEach((index) => {
      const rank = state.cards[index].rank;
      if (!byRank.has(rank)) byRank.set(rank, []);
      byRank.get(rank).push(index);
    });
    const matchedIndices = new Set();
    const pairRanks = [];
    let pointsEarned = 0;
    let bonusPoints = 0;
    for (const group of byRank.values()) {
      for (let i = 0; i + 1 < group.length; i += 2) {
        matchedIndices.add(group[i]);
        matchedIndices.add(group[i + 1]);
        pairRanks.push(state.cards[group[i]].rank);
        if (state.mode === 'drink') {
          continue;
        } else if (state.mode === 'wanted' && state.wantedRanks.includes(state.cards[group[i]].rank)) {
          pointsEarned += 3;
          bonusPoints += 2;
        } else {
          pointsEarned++;
        }
      }
    }
    const unmatched = indices.filter((index) => !matchedIndices.has(index));
    const foundPairs = matchedIndices.size / 2;
    for (const index of matchedIndices) {
      state.cards[index].matched = true;
      state.cards[index].matchedBy = state.activePlayer;
    }
    state.scores[state.activePlayer] += pointsEarned;
    state.pairs[state.activePlayer] += foundPairs;
    state.drinkEvent = '';
    if (state.mode === 'drink' && foundPairs) {
      state.drinkEvent = pairRanks.map((rank) => applyDrinkTask(rank, state.activePlayer)).join('　／　');
    }
    state.turns++;
    state.fourCardTurn = false;
    state.peekActive = false;

    const totalPairs = state.pairs[0] + state.pairs[1];
    if (totalPairs === state.deckSize / 2) {
      endGame();
      return;
    }

    state.phase = 'resolving';
    const nextPlayer = foundPairs > 0 ? state.activePlayer : (state.activePlayer + 1) % state.playerCount;
    state.resolution = {
      unmatched,
      nextPlayer,
      at: Date.now() + 1000,
      foundPairs,
    };
    if (foundPairs > 0) {
      const bonus = bonusPoints ? ` WANTED NUMBER ボーナス！ +${bonusPoints}点！` : '';
      state.message = state.mode === 'drink'
        ? `${foundPairs}ペア成立！中央のROUND EVENTを実行しよう。`
        : `${foundPairs}ペアをゲット！${bonus} はずれのカードを戻します。`;
    } else {
      state.message = `そろわなかった！ PLAYER ${nextPlayer + 1} に交代。`;
    }
  }

  function applyDrinkTask(rank, activePlayer) {
    const task = drinkTasks[rank];
    const targets = task.target === 'self'
      ? [activePlayer]
      : state.scores.map((_, index) => index).filter((index) => index !== activePlayer);
    const results = targets.map((target) => {
      const before = state.scores[target];
      const completedBefore = Math.floor(before / 5);
      const healableFraction = before % 5;
      const amount = task.points < 0 ? -Math.min(Math.abs(task.points), healableFraction) : task.points;
      state.scores[target] = Math.max(0, before + amount);
      const completedAfter = Math.floor(state.scores[target] / 5);
      const playerName = `PLAYER ${target + 1}`;
      if (task.points < 0) {
        return amount === 0
          ? `${playerName} 回復なし（到達したショットは確定）`
          : `${playerName} ${Math.abs(amount)}/5杯回復（-${Math.abs(amount)}pt）`;
      }
      const shotText = completedAfter > completedBefore ? '・ショット到達、飲んだ分は確定' : '';
      return `${playerName} +${amount}pt${shotText}`;
    });
    const targetText = task.target === 'self' ? '自分を回復' : '相手全員にダメージ';
    return `${rank}：${targetText}［${task.action}］${results.join('、')}`;
  }

  function completeResolution() {
    if (!state || state.phase !== 'resolving') return;
    const resolution = state.resolution;
    resolution.unmatched.forEach((index) => { state.cards[index].revealed = false; });
    state.resolution = null;
    state.phase = 'playing';
    state.activePlayer = resolution.nextPlayer;
    state.fourCardTurn = false;
    setTurnMessage();
    updateUI();
  }

  function schedulePhase() {
    window.clearTimeout(timerId);
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = null;
    if (!state) return;
    if (state.phase === 'resolving' && state.resolution) {
      timerId = window.setTimeout(completeResolution, Math.max(0, state.resolution.at - Date.now()));
    } else if (state.phase === 'memorize' && state.memorizeUntil) {
      updateCountdown();
      countdownIntervalId = window.setInterval(updateCountdown, 100);
      timerId = window.setTimeout(completeMemorize, Math.max(0, state.memorizeUntil - Date.now()));
    }
  }

  function updateCountdown() {
    if (!state || state.phase !== 'memorize') return;
    const secondsLeft = Math.max(1, Math.ceil((state.memorizeUntil - Date.now()) / 1000));
    memoryCountdown.textContent = secondsLeft;
  }

  function completeMemorize() {
    if (!state || state.phase !== 'memorize') return;
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = null;
    state.phase = 'playing';
    state.memorizeUntil = null;
    setTurnMessage();
    updateUI();
  }

  function flipCard(index) {
    if (!state || state.phase !== 'playing') return;
    const card = state.cards[index];
    if (card.revealed || card.matched) return;
    card.revealed = true;
    updateBoard();
    const selected = state.cards.reduce((result, item, cardIndex) => {
      if (item.revealed && !item.matched) result.push(cardIndex);
      return result;
    }, []);
    const target = state.fourCardTurn ? 4 : 2;
    if (selected.length >= target) {
      resolveTurn(selected);
      updateUI();
      schedulePhase();
    } else {
      updateUI();
    }
  }

  function usePower(power) {
    if (!state || state.mode !== 'psychic' || state.phase !== 'playing') return;
    if (state.usedAbilities[state.activePlayer] || state.cards.some((card) => card.revealed && !card.matched)) return;
    state.usedAbilities[state.activePlayer] = power;
    if (power === 'peek') {
      state.peekActive = true;
      state.message = '全体透視中！「発見済み」と「未発見」を確認しよう。';
      updateUI();
      return;
    }
    if (power === 'shuffle') {
      const positions = [];
      const remaining = [];
      state.cards.forEach((card, index) => {
        if (!card.matched) {
          positions.push(index);
          remaining.push(card);
        }
      });
      shuffle(remaining);
      positions.forEach((position, index) => { state.cards[position] = remaining[index]; });
      state.message = `配置をシャッフル！ PLAYER ${state.activePlayer + 1} は続けてどうぞ。`;
      rebuildBoard();
      updateUI();
      return;
    }
    if (power === 'four') {
      state.fourCardTurn = true;
      state.message = `4枚めくり！ 2ペアまで得点。PLAYER ${state.activePlayer + 1} の番。`;
      updateUI();
    }
  }

  function syncPlayerOptions(count) {
    selectedPlayerCount = count;
    playerOptions.forEach((button) => {
      const selected = Number(button.dataset.players) === count;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function startGame(size, mode, playerCount = selectedPlayerCount) {
    window.clearTimeout(timerId);
    window.clearInterval(countdownIntervalId);
    state = {
      deckSize: size,
      mode,
      playerCount,
      psychic: mode === 'psychic',
      drinkScale: mode === 'drink' ? 5 : null,
      cards: shuffle(makeDeck(size)),
      activePlayer: 0,
      turns: 0,
      scores: Array(playerCount).fill(0),
      pairs: Array(playerCount).fill(0),
      wantedRanks: mode === 'wanted' ? pickWantedRanks(size) : [],
      drinkEvent: '',
      usedAbilities: Array(playerCount).fill(null),
      phase: 'memorize',
      memorizeUntil: Date.now() + 5000,
      fourCardTurn: false,
      peekActive: false,
      resolution: null,
      winners: [],
      message: mode === 'drink' ? '数字だけ5秒間表示中。数字を覚えよう！' : '5秒間の記憶タイム！カードの配置を覚えよう。',
    };
    syncPlayerOptions(playerCount);
    menuScreen.hidden = true;
    gameScreen.hidden = false;
    rebuildBoard();
    updateUI();
    schedulePhase();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resumeGame(saved = readSave()) {
    if (!saved) return;
    window.clearTimeout(timerId);
    state = saved;
    if (!['normal', 'psychic', 'wanted', 'drink'].includes(state.mode)) {
      state.mode = state.psychic ? 'psychic' : 'normal';
    }
    state.playerCount = Number.isInteger(state.playerCount) ? Math.min(6, Math.max(2, state.playerCount)) : Math.min(6, Math.max(2, state.scores.length));
    state.scores = Array.from({ length: state.playerCount }, (_, index) => state.scores[index] || 0);
    state.pairs = Array.isArray(state.pairs)
      ? Array.from({ length: state.playerCount }, (_, index) => state.pairs[index] || 0)
      : [...state.scores];
    state.activePlayer = Math.min(state.activePlayer || 0, state.playerCount - 1);
    state.winners = Array.isArray(state.winners)
      ? state.winners
      : Number.isInteger(state.winner) ? [state.winner] : [];
    state.winners = state.winners.filter((index) => index >= 0 && index < state.playerCount);
    if (state.mode === 'drink' && state.drinkScale !== 5) {
      state.scores = state.scores.map((score) => Math.round(score * 5 / 3));
      state.drinkScale = 5;
    }
    state.psychic = state.mode === 'psychic';
    if (state.mode === 'wanted') {
      const targetCount = state.deckSize === 52 ? 5 : 3;
      if (!Array.isArray(state.wantedRanks) || state.wantedRanks.length !== targetCount) state.wantedRanks = pickWantedRanks(state.deckSize);
    } else state.wantedRanks = [];
    const oldUsedPowers = Array.isArray(state.usedPowers) ? state.usedPowers : [];
    const previousAbility = state.usedAbility;
    if (!Array.isArray(state.usedAbilities)) {
      const oldGlobal = state.usedAbilities || {};
      const usedByPlayer = Array(state.playerCount).fill(null);
      if (previousAbility?.power) {
        const user = Number.isInteger(previousAbility.player) ? previousAbility.player : state.activePlayer;
        usedByPlayer[user] = previousAbility.power;
      } else if (oldUsedPowers.length) {
        oldUsedPowers.forEach((powers, player) => {
          usedByPlayer[player] = ['peek', 'shuffle', 'four'].find((power) => powers?.[power]) || null;
        });
      } else {
        const used = ['peek', 'shuffle', 'four'].find((power) => oldGlobal[power]);
        if (used) usedByPlayer[state.activePlayer] = used;
      }
      state.usedAbilities = usedByPlayer;
    }
    state.usedAbilities = Array.from({ length: state.playerCount }, (_, index) => state.usedAbilities[index] || null);
    delete state.usedAbility;
    delete state.usedPowers;
    state.phase ||= 'playing';
    state.fourCardTurn ||= false;
    state.peekActive ||= false;
    state.cards.forEach((card) => { card.matched ||= false; card.revealed ||= false; });
    if (state.phase === 'memorize' && !state.memorizeUntil) state.memorizeUntil = Date.now() + 5000;
    syncPlayerOptions(state.playerCount);
    menuScreen.hidden = true;
    gameScreen.hidden = false;
    rebuildBoard();
    updateUI();
    schedulePhase();
  }

  playerOptions.forEach((button) => {
    button.addEventListener('click', () => syncPlayerOptions(Number(button.dataset.players)));
  });
  document.querySelectorAll('[data-deck]').forEach((button) => {
    button.addEventListener('click', () => startGame(Number(button.dataset.deck), button.dataset.mode, selectedPlayerCount));
  });
  document.querySelector('#restart').addEventListener('click', () => startGame(state.deckSize, state.mode, state.playerCount));
  document.querySelector('#menuButton').addEventListener('click', () => {
    window.clearTimeout(timerId);
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = null;
    menuScreen.hidden = false;
    gameScreen.hidden = true;
    syncPlayerOptions(state.playerCount);
    resumeButton.hidden = !state;
  });
  resumeButton.addEventListener('click', () => resumeGame());
  powerButtons.forEach((button) => button.addEventListener('click', () => usePower(button.dataset.power)));

  const savedGame = readSave();
  resumeButton.hidden = !savedGame;
  if (savedGame) resumeGame(savedGame);
})();
