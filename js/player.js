class Player {
  constructor() {
    this.coins = 0;
    this.seeds = 1;
    this.wood = 0;
    this.selectedTool = "plant";
    this.selectedSpecies = "common";
    this.totalTreesPlanted = 0;
  }

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
  }

  addCoins(amount) {
    this.coins += Math.max(0, amount);
  }

  serialize() {
    return {
      coins: this.coins,
      seeds: this.seeds,
      wood: this.wood,
      selectedTool: this.selectedTool,
      selectedSpecies: this.selectedSpecies,
      totalTreesPlanted: this.totalTreesPlanted
    };
  }

  deserialize(data = {}) {
    this.coins = data.coins ?? 0;
    this.seeds = data.seeds ?? 1;
    this.wood = data.wood ?? 0;
    this.selectedTool = data.selectedTool || "plant";
    this.selectedSpecies = data.selectedSpecies || "common";
    this.totalTreesPlanted = data.totalTreesPlanted ?? 0;
  }
}
