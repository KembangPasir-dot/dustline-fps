import { audio } from './audio.js';

export class RoundManager {
  constructor() {
    this.roundNum = 1;
    this.maxRounds = 9; // First to 5 wins
    this.vanguardWins = 0;
    this.jackalWins = 0;

    this.roundTime = 100; // seconds
    this.timer = this.roundTime;
    this.state = 'buy'; // 'buy', 'live', 'ended'

    this.bombPlanted = false;
    this.bombTimer = 45;
    this.bombSite = null;

    this.matchOver = false;
    this.winner = null;
  }

  update(dt, player, bots, onRoundEnd) {
    if (this.state === 'buy') return;

    if (this.state === 'live') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.endRound('jackal', 'Time ran out! Jackals win the round.');
        return;
      }

      if (this.bombPlanted) {
        this.bombTimer -= dt;
        if (this.bombTimer <= 0) {
          this.endRound('vanguard', 'Bomb detonated! Vanguard wins the round.');
          return;
        }
      }

      // Check alive counts
      const vanguardAlive = (player.alive ? 1 : 0) + bots.filter(b => b.team === 'vanguard' && b.alive).length;
      const jackalsAlive = bots.filter(b => b.team === 'jackal' && b.alive).length;

      if (jackalsAlive === 0) {
        this.endRound('vanguard', 'Vanguard eliminated all Jackals!');
      } else if (vanguardAlive === 0) {
        this.endRound('jackal', 'Jackals eliminated the Vanguard!');
      }
    }
  }

  plantBomb(site) {
    if (this.state === 'live' && !this.bombPlanted) {
      this.bombPlanted = true;
      this.bombTimer = 45;
      this.bombSite = site;
      audio.playBeep(440);
    }
  }

  endRound(winner, reason) {
    this.state = 'ended';
    if (winner === 'vanguard') {
      this.vanguardWins++;
      audio.playSting(true);
    } else {
      this.jackalWins++;
      audio.playSting(false);
    }

    if (this.vanguardWins >= 5 || this.jackalWins >= 5) {
      this.matchOver = true;
      this.winner = this.vanguardWins >= 5 ? 'Vanguard' : 'Jackals';
    }

    if (this.onEnd) this.onEnd(winner, reason);
  }

  startNewRound() {
    this.roundNum++;
    this.timer = this.roundTime;
    this.state = 'buy';
    this.bombPlanted = false;
    this.bombTimer = 45;
    this.bombSite = null;
  }
}
