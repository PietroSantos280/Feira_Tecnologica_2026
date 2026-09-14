const FISH_SPECIES = {
  trout: { name: "Trutas", icon: "🐟", cost: 80, income: 1 },
  koi: { name: "Carpas", icon: "🐠", cost: 150, income: 2 }
};

class FishSystem {
  constructor(game) {
    this.game = game;
    this.fishes = [];
    this.incomeTimer = 0;
  }

  canPlace(tile) {
    return Boolean(tile && tile.inPlanet && tile.water > 0.5 && !tile.fish);
  }

  place(tile, species) {
    const fish = FISH_SPECIES[species];
    if (!fish || !this.canPlace(tile)) return false;
    tile.fish = species;
    this.fishes.push({ species, x: tile.x, y: tile.y });
    return true;
  }

  update(dt) {
    this.incomeTimer += dt;
    if (this.incomeTimer < 30) return;
    this.incomeTimer = 0;
    // Peixes cujo rio secou deixam de existir.
    this.fishes = this.fishes.filter(item => {
      const tile = this.game.world.get(item.x, item.y);
      if (!tile || tile.water < 0.5) {
        if (tile) tile.fish = null;
        return false;
      }
      return true;
    });
    const multiplier = this.game.climate ? this.game.climate.getIncomeMultiplier() : 1;
    const income = Math.round(this.fishes.reduce((sum, item) => sum + FISH_SPECIES[item.species].income, 0) * multiplier);
    if (income) this.game.player.addCoins(income);
  }

  serialize() { return this.fishes; }

  deserialize(data = []) {
    this.fishes = Array.isArray(data) ? data : [];
    for (const item of this.fishes) {
      const tile = this.game.world.get(item.x, item.y);
      if (tile && tile.water > 0.5) tile.fish = item.species;
    }
  }
}
