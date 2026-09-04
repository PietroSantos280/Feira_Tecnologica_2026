const TREE_STAGES = [
  { name: "Semente", min: 0, max: 8, visual: 0 },
  { name: "Broto", min: 8, max: 22, visual: 1 },
  { name: "Muda", min: 22, max: 48, visual: 2 },
  { name: "Árvore jovem", min: 48, max: 78, visual: 3 },
  { name: "Árvore adulta", min: 78, max: Infinity, visual: 4 }
];

const TREE_SPECIES = {
  common: {
    id: "common",
    name: "Árvore pioneira",
    icon: "🌱",
    growthTime: 38,
    production: 0.42,
    fertility: 0.10,
    humidity: 0.06,
    seedChance: 0.018,
    biodiversity: 0.08,
    color: "#3d7f4c"
  },
  oak: {
    id: "oak",
    name: "Carvalho",
    icon: "🌳",
    growthTime: 62,
    production: 0.75,
    fertility: 0.16,
    humidity: 0.10,
    seedChance: 0.025,
    biodiversity: 0.18,
    color: "#3f8c52"
  },
  pine: {
    id: "pine",
    name: "Pinheiro",
    icon: "🌲",
    growthTime: 46,
    production: 0.58,
    fertility: 0.09,
    humidity: 0.06,
    seedChance: 0.021,
    biodiversity: 0.10,
    color: "#2d714b"
  },
  ipê: {
    id: "ipê",
    name: "Ipê",
    icon: "🌼",
    growthTime: 54,
    production: 0.82,
    fertility: 0.15,
    humidity: 0.09,
    seedChance: 0.028,
    biodiversity: 0.24,
    color: "#4b9654"
  }
};

class Tree {
  constructor(species = "common", age = 0, health = 100) {
    this.species = species;
    this.age = age;
    this.health = health;
    this.growth = 0;
    this.productionAccumulator = 0;
    this.seedAccumulator = 0;
  }

  get data() {
    return TREE_SPECIES[this.species] || TREE_SPECIES.common;
  }

  get stageIndex() {
    const ratio = Math.min(100, this.age);
    for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
      if (ratio >= TREE_STAGES[i].min) return i;
    }
    return 0;
  }

  get stage() {
    return TREE_STAGES[this.stageIndex];
  }

  get mature() {
    return this.age >= 78;
  }

  update(dt, growthMultiplier = 1, tileFertility = 0) {
    const fertilityFactor = 0.65 + (tileFertility / 100) * 0.7;
    const healthFactor = Math.max(.35, this.health / 100);
    const growthPerSecond = (100 / this.data.growthTime) * growthMultiplier * fertilityFactor * healthFactor;
    this.age = Math.min(100, this.age + growthPerSecond * dt);
    this.growth = this.age;

    if (this.mature) {
      this.productionAccumulator += dt * this.data.production * healthFactor;
      this.seedAccumulator += dt * this.data.seedChance * healthFactor;
    }
  }

  collectProduction() {
    if (!this.mature || this.productionAccumulator < 1) return 0;
    const amount = Math.floor(this.productionAccumulator);
    this.productionAccumulator -= amount;
    return amount;
  }

  produceSeed() {
    if (!this.mature || this.seedAccumulator < 1) return false;
    this.seedAccumulator -= 1;
    return true;
  }

  serialize() {
    return {
      species: this.species,
      age: this.age,
      health: this.health,
      growth: this.growth,
      productionAccumulator: this.productionAccumulator,
      seedAccumulator: this.seedAccumulator
    };
  }

  static deserialize(data) {
    const tree = new Tree(data.species || "common", data.age || 0, data.health ?? 100);
    tree.growth = data.growth || tree.age;
    tree.productionAccumulator = data.productionAccumulator || 0;
    tree.seedAccumulator = data.seedAccumulator || 0;
    return tree;
  }
}
