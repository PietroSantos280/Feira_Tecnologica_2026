class AchievementSystem {
  constructor(game) {
    this.game = game;
    this.items = [
      { id: "first", title: "Primeiro broto", description: "Plante sua primeira árvore.", done: false },
      { id: "forest", title: "Primeira floresta", description: "Tenha 10 árvores no mundo.", done: false },
      { id: "green", title: "Um planeta acordando", description: "Alcance 25% de biodiversidade.", done: false }
    ];
  }

  update() {
    const stats = this.game.world.getStats();
    const checks = {
      first: stats.trees >= 1,
      forest: stats.trees >= 10,
      green: stats.biodiversity >= 25
    };
    for (const item of this.items) {
      if (!item.done && checks[item.id]) {
        item.done = true;
        this.game.ui.showToast("Conquista desbloqueada", item.title);
      }
    }
  }

  serialize() { return this.items; }

  deserialize(data) {
    if (!Array.isArray(data)) return;
    for (const saved of data) {
      const item = this.items.find(i => i.id === saved.id);
      if (item) item.done = Boolean(saved.done);
    }
  }
}
