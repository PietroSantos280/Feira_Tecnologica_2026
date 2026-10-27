class Player {
  constructor() {
    this.coins = 20;
    this.seeds = 1;
    this.wood = 0;
    this.selectedTool = "plant";
    this.selectedSpecies = "common";
    this.selectedAnimal = null;
    this.selectedFish = null;
    this.totalTreesPlanted = 0;
    this.won = false;
    this.mapProgress = { americas: 0, continent2: 0, continent3: 0 };
    this.mapCompleted = { americas: false, continent2: false, continent3: false };
    this.customWorldUnlocked = false;
    this.settings = {
      buyMode: "click",   // click | hold | continuous
      plantMode: "click"  // click | hold | continuous
    };
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
      selectedAnimal: this.selectedAnimal,
      selectedFish: this.selectedFish,
      totalTreesPlanted: this.totalTreesPlanted,
      won: this.won,
      mapProgress: this.mapProgress,
      mapCompleted: this.mapCompleted,
      customWorldUnlocked: this.customWorldUnlocked,
      settings: this.settings
    };
  }

  deserialize(data = {}) {
    this.coins = data.coins ?? 0;
    this.seeds = data.seeds ?? 1;
    this.wood = data.wood ?? 0;
    this.selectedTool = data.selectedTool || "plant";
    this.selectedSpecies = data.selectedSpecies || "common";
    this.selectedAnimal = data.selectedAnimal || null;
    this.selectedFish = data.selectedFish || null;
    this.totalTreesPlanted = data.totalTreesPlanted ?? 0;
    this.won = Boolean(data.won);
    this.mapProgress = { americas: 0, continent2: 0, continent3: 0, ...(data.mapProgress || {}) };
    this.mapCompleted = { americas: false, continent2: false, continent3: false, ...(data.mapCompleted || {}) };
    this.customWorldUnlocked = Boolean(data.customWorldUnlocked);
    this.settings = { buyMode: "click", plantMode: "click", ...(data.settings || {}) };
  }
}
