class MissionSystem {
  constructor(game) {
    this.game = game;
    this.missions = [
      { id: "first_tree", title: "O primeiro broto", description: "Faça nascer a primeira árvore.", target: 1, type: "trees", reward: 10, done: false },
      { id: "ten_trees", title: "Pequeno bosque", description: "Plante 10 árvores.", target: 10, type: "trees", reward: 30, done: false },
      { id: "fertility", title: "Solo acordando", description: "Alcance fertilidade média de 15%.", target: 15, type: "fertility", reward: 40, done: false },
      { id: "biodiversity", title: "Primeiros sinais de vida", description: "Alcance 20% de biodiversidade.", target: 20, type: "biodiversity", reward: 60, done: false }
    ];
  }

  update() {
    const stats = this.game.world.getStats();
    for (const mission of this.missions) {
      if (mission.done) continue;
      const value = mission.type === "trees" ? stats.trees :
        mission.type === "fertility" ? stats.avgFertility : stats.biodiversity;
      if (value >= mission.target) {
        mission.done = true;
        this.game.player.addCoins(mission.reward);
        this.game.ui.showToast("Missão concluída", `${mission.title} · +${mission.reward} moedas`);
      }
    }
  }

  current() {
    return this.missions.find(m => !m.done) || this.missions[this.missions.length - 1];
  }

  progress() {
    const mission = this.current();
    const stats = this.game.world.getStats();
    const value = mission.type === "trees" ? stats.trees :
      mission.type === "fertility" ? stats.avgFertility : stats.biodiversity;
    return { mission, value: Math.min(mission.target, value) };
  }

  serialize() { return this.missions; }

  deserialize(data) {
    if (Array.isArray(data)) {
      for (const saved of data) {
        const current = this.missions.find(m => m.id === saved.id);
        if (current) current.done = Boolean(saved.done);
      }
    }
  }
}
