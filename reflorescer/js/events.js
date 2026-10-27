// EventSystem: dispara eventos aleatorios (clima/desastres) com intervalo minimo entre eles,
// aplicando bonus/penalidades temporarias e efeitos instantaneos sobre o mundo.
const EVENT_DEFINITIONS = [
  {
    id: "rain",
    name: "Chuva forte",
    icon: "🌧️",
    message: "O crescimento das árvores acelera e os rios ganham mais água.",
    duration: 26,
    effects: { growth: 1.45, income: 1.0, vegetation: 1.2 },
    onStart(game) {
      for (const row of game.world.tiles) {
        for (const tile of row) {
          if (tile.water > 0.1) tile.water = Math.min(1, tile.water + 0.2);
          tile.humidity = Math.min(100, tile.humidity + 6);
        }
      }
    }
  },
  {
    id: "fire",
    name: "Queimada",
    icon: "🔥",
    message: "O fogo destrói parte da vegetação e reduz a produção por um tempo.",
    duration: 20,
    effects: { growth: 1, income: 0.55, vegetation: 0.7 },
    onStart(game) {
      const candidates = [];
      for (const row of game.world.tiles) {
        for (const tile of row) {
          if (tile.tree && tile.inPlanet) candidates.push(tile);
        }
      }
      const burnCount = Math.ceil(candidates.length * (0.08 + Math.random() * 0.1));
      for (let i = 0; i < burnCount && candidates.length; i++) {
        const idx = Math.floor(Math.random() * candidates.length);
        const tile = candidates.splice(idx, 1)[0];
        tile.tree = null;
        tile.vegetation = Math.max(0, tile.vegetation - 35);
        tile.grass = false;
        tile.fertility = Math.max(0, tile.fertility - 8);
      }
      if (burnCount > 0) {
        game.ui.showToast("🔥 Estragos da queimada", `${burnCount} árvore(s) foram perdidas.`);
      }
    }
  },
  {
    id: "snow",
    name: "Neve",
    icon: "❄️",
    message: "As árvores crescem e produzem mais devagar enquanto a neve cobre o solo.",
    duration: 24,
    effects: { growth: 0.5, income: 0.6, vegetation: 0.6 }
  },
  {
    id: "drought",
    name: "Período de seca",
    icon: "☀️",
    message: "O crescimento diminui, a grama perde qualidade e os rios podem baixar.",
    duration: 26,
    effects: { growth: 0.6, income: 0.85, vegetation: 0.65 },
    onStart(game) {
      for (const row of game.world.tiles) {
        for (const tile of row) {
          if (tile.water > 0.1) tile.water = Math.max(0.15, tile.water - 0.25);
          if (tile.grass) tile.vegetation = Math.max(0, tile.vegetation - 6);
        }
      }
    }
  },
  {
    id: "favorableSpring",
    name: "Primavera favorável",
    icon: "🌱",
    message: "As plantas crescem com mais força e a chance de novos animais aumenta.",
    duration: 24,
    effects: { growth: 1.3, income: 1.05, vegetation: 1.25, animalChance: 1.4 }
  },
  {
    id: "pollination",
    name: "Polinização",
    icon: "🐝",
    message: "A vegetação se espalha mais rápido durante este período.",
    duration: 18,
    effects: { growth: 1.05, income: 1.0, vegetation: 1.5 }
  },
  {
    id: "flood",
    name: "Enchente",
    icon: "🌊",
    message: "Os rios sobem, mas algumas áreas de vegetação podem ser prejudicadas.",
    duration: 16,
    effects: { growth: 0.9, income: 0.9, vegetation: 0.85 },
    onStart(game) {
      const riverTiles = [];
      for (const row of game.world.tiles) {
        for (const tile of row) {
          if (tile.water > 0.1) {
            tile.water = 1;
            riverTiles.push(tile);
          }
        }
      }
      for (const river of riverTiles) {
        for (const n of game.world.neighbors(river.x, river.y, 1)) {
          if (!n.tree && n.water < 0.1 && Math.random() < 0.35) {
            n.vegetation = Math.max(0, n.vegetation - 10);
          }
        }
      }
    }
  }
];

const EVENT_MIN_INTERVAL = 40;
const EVENT_MAX_INTERVAL = 85;

class EventSystem {
  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.nextEventAt = EVENT_MIN_INTERVAL + Math.random() * (EVENT_MAX_INTERVAL - EVENT_MIN_INTERVAL);
    this.active = null;
    this.activeElapsed = 0;
  }

  update(dt) {
    this.timer += dt;

    if (this.active) {
      this.activeElapsed += dt;
      if (this.activeElapsed >= this.active.duration) {
        this.game.ui.showToast(`${this.active.icon} Fim: ${this.active.name}`, "Os efeitos voltaram ao normal.");
        this.active = null;
        this.activeElapsed = 0;
        this.timer = 0;
        this.nextEventAt = EVENT_MIN_INTERVAL + Math.random() * (EVENT_MAX_INTERVAL - EVENT_MIN_INTERVAL);
      }
      return;
    }

    if (this.timer >= this.nextEventAt) {
      this.triggerRandomEvent();
    }
  }

  triggerRandomEvent() {
    const def = EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];
    this.active = def;
    this.activeElapsed = 0;
    this.timer = 0;
    if (def.onStart) def.onStart(this.game);
    this.game.ui.showToast(`${def.icon} ${def.name}`, def.message);
    this.game.ui.onEventChange();
  }

  getGrowthMultiplier() {
    return this.active ? (this.active.effects.growth ?? 1) : 1;
  }

  getIncomeMultiplier() {
    return this.active ? (this.active.effects.income ?? 1) : 1;
  }

  getVegetationMultiplier() {
    return this.active ? (this.active.effects.vegetation ?? 1) : 1;
  }

  getAnimalChanceMultiplier() {
    return this.active ? (this.active.effects.animalChance ?? 1) : 1;
  }

  serialize() {
    return {
      timer: this.timer,
      nextEventAt: this.nextEventAt,
      activeId: this.active ? this.active.id : null,
      activeElapsed: this.activeElapsed
    };
  }

  deserialize(data = {}) {
    this.timer = Number.isFinite(data.timer) ? data.timer : 0;
    this.nextEventAt = Number.isFinite(data.nextEventAt) ? data.nextEventAt : EVENT_MIN_INTERVAL;
    this.activeElapsed = Number.isFinite(data.activeElapsed) ? data.activeElapsed : 0;
    this.active = data.activeId ? EVENT_DEFINITIONS.find(e => e.id === data.activeId) || null : null;
  }
}
