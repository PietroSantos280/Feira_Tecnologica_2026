const ANIMAL_SPECIES = {
  chicken: { name: "Galinhas", icon: "G", cost: 100, income: 1 },
  horse: { name: "Cavalos", icon: "C", cost: 200, income: 2 },
  cow: { name: "Vacas", icon: "V", cost: 300, income: 3 }
};

class AnimalSystem {
  constructor(game) {
    this.game = game;
    this.animals = [];
    this.incomeTimer = 0;
  }

  canPlace(tile) {
    return Boolean(tile && tile.inPlanet && !tile.water && !tile.tree && !tile.animal && this.game.world.getStats().trees >= 5);
  }

  place(tile, species) {
    const animal = ANIMAL_SPECIES[species];
    if (!animal || !this.canPlace(tile)) return false;
    tile.animal = species;
    this.animals.push({ species, x: tile.x, y: tile.y });
    return true;
  }

  update(dt) {
    this.incomeTimer += dt;
    if (this.incomeTimer < 30) return;
    this.incomeTimer = 0;
    const income = this.animals.reduce((sum, item) => sum + ANIMAL_SPECIES[item.species].income, 0);
    if (income) this.game.player.addCoins(income);
  }

  serialize() { return this.animals; }

  deserialize(data = []) {
    this.animals = Array.isArray(data) ? data : [];
    for (const item of this.animals) {
      const tile = this.game.world.get(item.x, item.y);
      if (tile) tile.animal = item.species;
    }
  }
}
