// ClimateSystem: dias avancam a cada 60s de jogo, e a estacao muda a cada 5 dias,
// seguindo Primavera -> Verao -> Outono -> Inverno -> Primavera...
const SEASONS = [
  {
    id: "spring",
    name: "Primavera",
    icon: "🌸",
    growth: 1.25,
    income: 1.05,
    vegetation: 1.3,
    animalChance: 1.3,
    description: "Crescimento acelerado e mais chances de novos animais aparecerem."
  },
  {
    id: "summer",
    name: "Verão",
    icon: "☀️",
    growth: 1.0,
    income: 1.0,
    vegetation: 1.0,
    animalChance: 1.0,
    droughtChance: 1.4,
    description: "Ambiente mais seco, com maior risco de secas."
  },
  {
    id: "autumn",
    name: "Outono",
    icon: "🍂",
    growth: 0.85,
    income: 0.95,
    vegetation: 0.9,
    animalChance: 0.9,
    description: "Folhas caem e as árvores mudam de aparência."
  },
  {
    id: "winter",
    name: "Inverno",
    icon: "❄️",
    growth: 0.55,
    income: 0.7,
    vegetation: 0.6,
    animalChance: 0.6,
    description: "Crescimento reduzido em todo o planeta."
  }
];

const DAYS_PER_SEASON = 5;
const SECONDS_PER_DAY = 60;

class ClimateSystem {
  constructor(game) {
    this.game = game;
    this.day = 1;
    this.elapsed = 0;
    this.seasonIndex = 0;
  }

  get season() {
    return SEASONS[this.seasonIndex].id;
  }

  get data() {
    return SEASONS[this.seasonIndex];
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= SECONDS_PER_DAY) {
      this.elapsed -= SECONDS_PER_DAY;
      this.day += 1;
      const newSeasonIndex = Math.floor((this.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
      if (newSeasonIndex !== this.seasonIndex) {
        this.seasonIndex = newSeasonIndex;
        if (this.game && this.game.ui) {
          this.game.ui.showToast(`${this.data.icon} ${this.data.name} chegou`, this.data.description);
          this.game.ui.onSeasonChange();
        }
      }
    }
  }

  daysUntilNextSeason() {
    const dayInSeason = (this.day - 1) % DAYS_PER_SEASON;
    return DAYS_PER_SEASON - dayInSeason;
  }

  getGrowthMultiplier() {
    const eventMult = this.game && this.game.events ? this.game.events.getGrowthMultiplier() : 1;
    return this.data.growth * eventMult;
  }

  getIncomeMultiplier() {
    const eventMult = this.game && this.game.events ? this.game.events.getIncomeMultiplier() : 1;
    return this.data.income * eventMult;
  }

  getVegetationMultiplier() {
    const eventMult = this.game && this.game.events ? this.game.events.getVegetationMultiplier() : 1;
    return this.data.vegetation * eventMult;
  }

  getAnimalChanceMultiplier() {
    return this.data.animalChance;
  }

  getSeasonLabel() {
    return this.data.name;
  }

  serialize() {
    return { day: this.day, elapsed: this.elapsed, seasonIndex: this.seasonIndex };
  }

  deserialize(data = {}) {
    this.day = Number.isFinite(data.day) ? data.day : 1;
    this.elapsed = Number.isFinite(data.elapsed) ? data.elapsed : 0;
    this.seasonIndex = Number.isFinite(data.seasonIndex)
      ? data.seasonIndex
      : Math.floor((this.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
  }
}
