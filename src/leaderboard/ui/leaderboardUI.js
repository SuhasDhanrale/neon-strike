import { LeaderboardManager } from '../leaderboardManager.js';
import { State } from '../../state.js';

class LeaderboardUIClass {
    constructor() {
        this._panel = null;
        this._isOpen = false;
    }

    init() {
        this._inject();
        this._bindEvents();
    }

    async open(highlightScore = null) {
        this._isOpen = true;
        this._panel.classList.add('active');
        await this._populate(highlightScore);
    }

    close() {
        this._isOpen = false;
        this._panel.classList.remove('active');
    }

    toggle() {
        this._isOpen ? this.close() : this.open();
    }

    async showWithScore(score) {
        await this.open(score);
    }

    // --- PRIVATE ---

    _inject() {
        const html = `
      <div id="leaderboard-panel">
        <div class="lb-header">
          <div class="lb-title">SCOREBOARD</div>
          <div class="lb-adapter" id="lb-adapter-name"></div>
          <button class="lb-close" id="lb-close">X</button>
        </div>

        <div class="lb-player-row" id="lb-player-row" style="display:none">
          <span class="lb-player-rank" id="lb-player-rank">#--</span>
          <span class="lb-player-name" id="lb-player-name">YOU</span>
          <span class="lb-player-score" id="lb-player-score">--</span>
        </div>

        <div class="lb-list" id="lb-list">
          <div class="lb-loading">LOADING...</div>
        </div>

        <div class="lb-footer">
          <button class="lb-refresh" id="lb-refresh">REFRESH</button>
        </div>
      </div>
    `;
        document.getElementById('game-container').insertAdjacentHTML('beforeend', html);
        this._panel = document.getElementById('leaderboard-panel');
    }

    _bindEvents() {
        document.getElementById('lb-close').addEventListener('click', () => this.close());
        document.getElementById('lb-refresh').addEventListener('click', () => this._populate());

        // Real-time updates if supported
        LeaderboardManager.onUpdate((entries) => {
            if (this._isOpen) this._render(entries);
        });
    }

    async _populate(highlightScore = null) {
        const listEl = document.getElementById('lb-list');
        listEl.innerHTML = '<div class="lb-loading">LOADING...</div>';

        document.getElementById('lb-adapter-name').textContent = LeaderboardManager.adapterName;

        const [entries, player] = await Promise.all([
            LeaderboardManager.fetch(10),
            LeaderboardManager.getPlayer()
        ]);

        // Player row
        if (player) {
            document.getElementById('lb-player-row').style.display = 'flex';
            document.getElementById('lb-player-rank').textContent = `#${player.rank}`;
            document.getElementById('lb-player-name').textContent = player.playerName;
            document.getElementById('lb-player-score').textContent = player.score.toLocaleString();
        } else {
            document.getElementById('lb-player-row').style.display = 'none';
        }

        this._render(entries, highlightScore);
    }

    _render(entries, highlightScore = null) {
        const listEl = document.getElementById('lb-list');
        if (!entries.length) {
            listEl.innerHTML = '<div class="lb-empty">NO SCORES YET.<br>BE FIRST.</div>';
            return;
        }

        listEl.innerHTML = entries.map(entry => `
      <div class="lb-entry ${entry.isCurrentPlayer ? 'is-you' : ''} ${entry.score === highlightScore ? 'is-new' : ''}">
        <span class="lb-rank">${entry.rank <= 3 ? ['1st', '2nd', '3rd'][entry.rank - 1] : `#${entry.rank}`}</span>
        <span class="lb-name">${this._sanitize(entry.playerName)}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
        ${entry.isCurrentPlayer ? '<span class="lb-you-tag">YOU</span>' : ''}
      </div>
    `).join('');
    }

    _sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export const LeaderboardUI = new LeaderboardUIClass();
