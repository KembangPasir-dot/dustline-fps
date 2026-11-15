export class HUD {
  constructor() {
    this.hpEl = document.getElementById('stat-hp');
    this.armorEl = document.getElementById('stat-armor');
    this.moneyEl = document.getElementById('stat-money');
    this.weaponNameEl = document.getElementById('stat-weapon-name');
    this.magEl = document.getElementById('stat-ammo-mag');
    this.reserveEl = document.getElementById('stat-ammo-reserve');
    this.timerEl = document.getElementById('timer-panel');
    this.scoreEl = document.getElementById('score-panel');
    this.vngCountEl = document.getElementById('vanguard-count');
    this.jklCountEl = document.getElementById('jackal-count');
    this.bombStatusEl = document.getElementById('bomb-status');
    this.buyMenuEl = document.getElementById('buy-menu');
    this.roundBannerEl = document.getElementById('round-banner');
    this.bannerTitleEl = document.getElementById('banner-title');
    this.bannerSubEl = document.getElementById('banner-sub');
    this.killfeedEl = document.getElementById('killfeed');
    this.hitmarkerEl = document.getElementById('hitmarker');
  }

  update(player, weapon, rounds, bots) {
    if (this.hpEl) this.hpEl.textContent = Math.ceil(player.hp);
    if (this.armorEl) this.armorEl.textContent = player.armor;
    if (this.moneyEl) this.moneyEl.textContent = `$${player.money}`;

    if (weapon) {
      if (this.weaponNameEl) this.weaponNameEl.textContent = weapon.weapon.name;
      if (this.magEl) this.magEl.textContent = weapon.mag;
      if (this.reserveEl) this.reserveEl.textContent = weapon.reserve;
    }

    if (rounds && this.timerEl) {
      const mins = Math.floor(rounds.timer / 60);
      const secs = Math.floor(rounds.timer % 60);
      this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (this.scoreEl) {
        this.scoreEl.textContent = `ROUND ${rounds.roundNum}/9 | VANGUARD ${rounds.vanguardWins} - ${rounds.jackalWins} JACKALS`;
      }
    }

    if (bots && this.vngCountEl && this.jklCountEl) {
      const vngAlive = (player.alive ? 1 : 0) + bots.filter(b => b.team === 'vanguard' && b.alive).length;
      const jklAlive = bots.filter(b => b.team === 'jackal' && b.alive).length;
      this.vngCountEl.textContent = vngAlive;
      this.jklCountEl.textContent = jklAlive;
    }

    if (rounds && this.bombStatusEl) {
      if (rounds.bombPlanted) {
        this.bombStatusEl.style.display = 'block';
        this.bombStatusEl.textContent = `BOMB PLANTED: ${Math.ceil(rounds.bombTimer)}s`;
      } else {
        this.bombStatusEl.style.display = 'none';
      }
    }
  }

  showHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.style.opacity = '1';
    setTimeout(() => {
      this.hitmarkerEl.style.opacity = '0';
    }, 100);
  }

  addKill(text) {
    if (!this.killfeedEl) return;
    const item = document.createElement('div');
    item.className = 'kill-item';
    item.textContent = text;
    this.killfeedEl.appendChild(item);
    setTimeout(() => item.remove(), 4000);
  }

  showBanner(title, sub) {
    if (!this.roundBannerEl) return;
    this.bannerTitleEl.textContent = title;
    this.bannerSubEl.textContent = sub;
    this.roundBannerEl.style.opacity = '1';
    setTimeout(() => {
      this.roundBannerEl.style.opacity = '0';
    }, 3500);
  }

  toggleBuyMenu(show) {
    if (this.buyMenuEl) {
      this.buyMenuEl.style.display = show ? 'block' : 'none';
    }
  }
}
