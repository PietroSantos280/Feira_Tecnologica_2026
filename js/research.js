class ResearchSystem {
  constructor(game) {
    this.game = game;
    this.levels = {
      botany: 0,
      soil: 0,
      water: 0,
      animals: 0,
      climate: 0,
      automation: 0
    };
  }

  serialize() { return this.levels; }

  deserialize(data = {}) {
    this.levels = { ...this.levels, ...data };
  }
}
