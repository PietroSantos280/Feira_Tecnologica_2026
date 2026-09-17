class AchievementSystem {
  constructor(game) {
    this.game = game;
    this.items = [
      { id: "first", title: "Primeiro broto", description: "Plante sua primeira árvore.", done: false },
      { id: "forest", title: "Primeira floresta", description: "Tenha 10 árvores no mundo.", done: false },
      { id: "green", title: "Um planeta acordando", description: "Alcance 25% de biodiversidade.", done: false },
      { id: "map_americas_unlock", title: "Novo horizonte", description: "Alcance 80% de recuperação nas Américas e desbloqueie Europa e África.", done: false },
      { id: "map_americas_100", title: "Américas restauradas", description: "Recupere 100% do mapa das Américas.", done: false },
      { id: "map_continent2_unlock", title: "Um novo continente", description: "Alcance 80% de recuperação em Europa e África e desbloqueie Ásia e Oceania.", done: false },
      { id: "map_continent2_100", title: "Segundo mundo restaurado", description: "Recupere 100% do segundo mapa.", done: false },
      { id: "map_continent3_100", title: "Terceiro mundo restaurado", description: "Recupere 100% do terceiro mapa.", done: false }
    ];
  }

  update() {
    const stats = this.game.world.getStats();
    const checks = {
      first: stats.trees >= 1,
      forest: stats.trees >= 10,
      green: stats.biodiversity >= 25,
      map_americas_unlock: Number(this.game.player.mapProgress.americas ?? 0) >= 80,
      map_americas_100: this.game.player.mapCompleted.americas,
      map_continent2_unlock: Number(this.game.player.mapProgress.continent2 ?? 0) >= 80,
      map_continent2_100: this.game.player.mapCompleted.continent2,
      map_continent3_100: this.game.player.mapCompleted.continent3
    };
    for (const item of this.items) {
      if (!item.done && checks[item.id]) {
        item.done = true;
        if (item.id === "map_americas_unlock" || item.id === "map_continent2_unlock") {
          this.game.ui.showAchievementCard(item.title, item.description);
        } else {
          this.game.ui.showToast("Conquista desbloqueada", item.title);
        }
      }
    }
  }

  unlockMapCompletion(id) {
    const item = this.items.find(i => i.id === `map_${id}_100`);
    if (item && !item.done) {
      item.done = true;
      this.game.ui.showToast("Conquista desbloqueada", item.title);
    }
    if (Object.values(this.game.player.mapCompleted).filter(Boolean).length === 3) {
      this.game.ui.showToast("Novo modo desbloqueado", "Agora você pode criar um mundo personalizado.");
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
