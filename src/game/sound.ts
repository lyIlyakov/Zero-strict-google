/**
 * 100% procedural Web Audio synthesizer for «Нулевая смена».
 * Zero external sound files; layered mechanical foley, airlock pneumatics,
 * tribunal cues, and clear game-event feedback.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private output: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastFootstepAt = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.output = this.ctx.createGain();
      this.output.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.output) {
      const now = this.ctx.currentTime;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setValueAtTime(muted ? 0 : 1, now);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    endFreq?: number,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + Math.min(0.015, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.output ?? ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private playNoise(
    duration: number,
    volume: number,
    filterType: BiquadFilterType = 'bandpass',
    freq = 900,
    endFreq = 450,
    delay = 0,
    q = 1.4,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.ensureNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, t0);
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endFreq), t0 + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.output ?? ctx.destination);
    src.start(t0);
    src.stop(t0 + duration + 0.03);
  }

  /** Heavy pneumatic airlock gate opening when the shift begins */
  playGate(): void {
    // Pneumatic seal release hiss
    this.playNoise(0.55, 0.065, 'bandpass', 2400, 520, 0, 1.1);
    // Hydraulic low servo rumble
    this.playTone(96, 0.85, 'triangle', 0.07, 46, 0.05);
    this.playTone(144, 0.72, 'sawtooth', 0.022, 68, 0.08);
    // Green lock disengage chime
    this.playTone(520, 0.14, 'sine', 0.04, 660, 0.58);
    this.playTone(780, 0.22, 'triangle', 0.045, 780, 0.72);
  }

  /** Suit / skin wardrobe change: magnetic buckle + fabric seal */
  playSuit(): void {
    this.playNoise(0.14, 0.04, 'highpass', 1400, 2600, 0, 0.8);
    this.playTone(165, 0.11, 'triangle', 0.045, 110, 0);
    this.playTone(340, 0.12, 'sine', 0.038, 490, 0.06);
  }

  /** Soft UI panel open */
  playUiOpen(): void {
    this.playTone(320, 0.08, 'sine', 0.036, 480, 0);
    this.playTone(510, 0.07, 'triangle', 0.025, 620, 0.04);
  }

  /** Soft UI panel close */
  playUiClose(): void {
    this.playTone(440, 0.08, 'sine', 0.032, 280, 0);
  }

  /** Rules saved confirmation */
  playRuleSave(): void {
    this.playTone(440, 0.09, 'triangle', 0.05, 440, 0);
    this.playTone(587.33, 0.14, 'triangle', 0.055, 587.33, 0.08);
  }

  /** Player entered waiting room */
  playPlayerJoin(): void {
    this.playTone(493.88, 0.11, 'sine', 0.045, 493.88, 0);
    this.playTone(659.25, 0.16, 'sine', 0.045, 659.25, 0.09);
  }

  /** Map overlay toggle */
  playMapToggle(open: boolean): void {
    this.playNoise(0.08, 0.025, 'bandpass', open ? 1200 : 1800, open ? 2100 : 900, 0, 1.5);
    this.playTone(open ? 380 : 520, 0.08, 'sine', 0.035, open ? 560 : 340, 0.01);
  }

  /** Sensor Echo sonar ping */
  playRadarPing(): void {
    this.playTone(1080, 0.28, 'sine', 0.045, 1020, 0);
    this.playTone(540, 0.22, 'sine', 0.025, 520, 0.06);
  }

  /** Vote confirmed stamp */
  playVote(): void {
    this.playNoise(0.05, 0.03, 'lowpass', 700, 240, 0, 1.0);
    this.playTone(290, 0.14, 'triangle', 0.055, 240, 0);
    this.playTone(435, 0.18, 'sine', 0.045, 415, 0.06);
  }

  /** Meeting discussion chat message pop */
  playChatPing(): void {
    this.playTone(620, 0.065, 'sine', 0.032, 760, 0);
  }

  /** Meeting last-10-seconds countdown tick */
  playCountdownTick(urgent = false): void {
    const freq = urgent ? 920 : 680;
    this.playTone(freq, urgent ? 0.08 : 0.055, 'triangle', urgent ? 0.05 : 0.03, freq * 0.88, 0);
  }

  /** Dramatic verdict sting when a player is ejected */
  playVerdictEject(): void {
    this.playNoise(0.42, 0.055, 'bandpass', 1600, 320, 0.04, 1.2);
    this.playTone(220, 0.45, 'sawtooth', 0.055, 110, 0);
    this.playTone(164.81, 0.52, 'triangle', 0.065, 98, 0.14);
  }

  /** Neutral gavel sting on skip or tie */
  playVerdictSkip(): void {
    this.playTone(330, 0.16, 'triangle', 0.045, 293.66, 0);
    this.playTone(293.66, 0.24, 'sine', 0.04, 261.63, 0.14);
  }

  /** Saboteur attack sting */
  playAttack(): void {
    this.playNoise(0.16, 0.07, 'bandpass', 1800, 240, 0, 1.0);
    this.playTone(185, 0.22, 'sawtooth', 0.075, 58, 0);
  }

  playFootstep(): void {
    const now = performance.now();
    if (now - this.lastFootstepAt < 330) return;
    this.lastFootstepAt = now;
    const pitch = 92 + (Math.random() - 0.5) * 20;
    this.playTone(pitch, 0.065, 'triangle', 0.032, 42);
    this.playNoise(0.04, 0.014, 'lowpass', 520, 220, 0, 0.8);
  }

  playTerminalOpen(): void {
    this.playTone(440, 0.08, 'sine', 0.06, 620);
    this.playTone(660, 0.1, 'sine', 0.05, 780, 0.06);
  }

  playClick(): void {
    this.playTone(540 + (Math.random() - 0.5) * 40, 0.045, 'square', 0.022, 380);
  }

  playTaskComplete(): void {
    this.playTone(523.25, 0.12, 'triangle', 0.07, 523.25, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.07, 659.25, 0.09);
    this.playTone(783.99, 0.24, 'triangle', 0.08, 783.99, 0.18);
  }

  playError(): void {
    this.playTone(190, 0.16, 'sawtooth', 0.05, 130);
  }

  playShieldActivate(): void {
    this.playTone(320, 0.25, 'sine', 0.08, 920);
    this.playTone(640, 0.35, 'triangle', 0.05, 480, 0.08);
  }

  playShieldBlock(): void {
    this.playNoise(0.18, 0.05, 'highpass', 1500, 600, 0, 1.0);
    this.playTone(880, 0.18, 'sawtooth', 0.09, 260);
    this.playTone(1320, 0.28, 'sine', 0.07, 520, 0.03);
  }

  playSabotageLights(): void {
    this.playNoise(0.45, 0.055, 'lowpass', 900, 160, 0, 1.0);
    this.playTone(260, 0.45, 'sawtooth', 0.07, 65);
    this.playTone(180, 0.4, 'square', 0.04, 52, 0.12);
  }

  playLightsRestored(): void {
    this.playTone(180, 0.28, 'triangle', 0.07, 540);
    this.playTone(540, 0.25, 'sine', 0.06, 720, 0.18);
  }

  /** Emergency tribunal alarm horn */
  playAlarm(): void {
    this.playNoise(0.32, 0.04, 'bandpass', 1100, 700, 0, 1.8);
    for (let i = 0; i < 3; i++) {
      this.playTone(590, 0.19, 'sawtooth', 0.065, 420, i * 0.24);
      this.playTone(295, 0.19, 'triangle', 0.045, 220, i * 0.24);
    }
  }

  playVictory(): void {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, i) => this.playTone(n, 0.26, 'triangle', 0.08, n, i * 0.11));
  }

  playDefeat(): void {
    const notes = [392, 349.23, 311.13, 233.08];
    notes.forEach((n, i) => this.playTone(n, 0.3, 'sawtooth', 0.06, n * 0.94, i * 0.14));
  }
}

export const soundEngine = new SoundEngine();
