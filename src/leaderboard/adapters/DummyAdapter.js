import { BaseAdapter } from './BaseAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';

export class DummyAdapter extends BaseAdapter {
    constructor() {
        super('Dummy');
        this.localAdapter = null;
    }

    async init(boardId) {
        this.boardId = boardId;

        // Use LocalStorageAdapter for actual storage
        this.localAdapter = new LocalStorageAdapter();
        await this.localAdapter.init(boardId);

        this.initialized = true;
        this._createOverlayStyles();
        this.log('Initialized - Ready for testing');
        return true;
    }

    async submit(score, meta = {}) {
        this.log('Submit', { score, meta });

        // Show visual overlay
        await this._showSubmitOverlay(score);

        // Actually store via local adapter
        return await this.localAdapter.submit(score, meta);
    }

    async fetch(limit = 10) {
        this.log('Fetch', { limit });
        return await this.localAdapter.fetch(limit);
    }

    async getPlayer() {
        return await this.localAdapter.getPlayer();
    }

    get displayName() { return 'Dummy (Test)'; }

    // --- VISUAL OVERLAY ---

    _createOverlayStyles() {
        if (document.getElementById('dummy-lb-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'dummy-lb-styles';
        styles.textContent = `
      .dummy-lb-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(26, 20, 16, 0.95);
        border: 3px solid #e85d20;
        border-radius: 4px;
        box-shadow: 8px 8px 0 #8c3a10;
        padding: 20px 30px;
        z-index: 99999;
        font-family: 'Bebas Neue', 'Rajdhani', sans-serif;
        color: #e8ddd0;
        text-align: center;
      }
      .dummy-lb-overlay .lb-title {
        font-size: 1.2rem;
        letter-spacing: 3px;
        color: #e85d20;
        margin-bottom: 10px;
      }
      .dummy-lb-overlay .lb-score {
        font-size: 2.5rem;
        color: #e8ddd0;
        margin-bottom: 15px;
      }
      .dummy-lb-overlay .lb-status {
        font-size: 0.8rem;
        color: #6b5e58;
        letter-spacing: 2px;
      }
    `;
        document.head.appendChild(styles);
    }

    async _showSubmitOverlay(score) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dummy-lb-overlay';
            overlay.innerHTML = `
        <div class="lb-title">LEADERBOARD SUBMIT</div>
        <div class="lb-score">${score.toLocaleString()}</div>
        <div class="lb-status">STORING SCORE...</div>
      `;
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.querySelector('.lb-status').textContent = 'SCORE SUBMITTED!';
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 500);
            }, 800);
        });
    }
}