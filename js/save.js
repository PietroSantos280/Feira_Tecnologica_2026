class SaveSystem {
  constructor(game) {
    this.game = game;
    this.key = "reflorescer_save_v1";
    this.autosaveTimer = 0;
  }

  update(dt) {
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 12) {
      this.autosaveTimer = 0;
      this.save();
    }
  }

  snapshot() {
    return {
      version: 1,
      savedAt: Date.now(),
      player: this.game.player.serialize(),
      world: this.game.world.serialize(),
      climate: this.game.climate.serialize(),
      missions: this.game.missions.serialize(),
      achievements: this.game.achievements.serialize()
    };
  }

  save(silent = true) {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.snapshot()));
      this.game.ui.setSaveStatus("salvo agora");
      if (!silent) this.game.ui.showToast("Mundo salvo", "Seu planeta foi armazenado neste navegador.");
      return true;
    } catch (error) {
      console.error("Falha ao salvar:", error);
      this.game.ui.setSaveStatus("erro ao salvar");
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.game.player.deserialize(data.player);
      this.game.world.deserialize(data.world);
      this.game.climate.deserialize(data.climate);
      this.game.missions.deserialize(data.missions);
      this.game.achievements.deserialize(data.achievements);
      return true;
    } catch (error) {
      console.error("Falha ao carregar save:", error);
      return false;
    }
  }

  export() {
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reflorescer-save-${new Date().toISOString().slice(0,10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  import(text) {
    try {
      const data = JSON.parse(text);
      if (!data || !data.world || !data.player) throw new Error("Save inválido.");
      this.game.player.deserialize(data.player);
      this.game.world.deserialize(data.world);
      this.game.climate.deserialize(data.climate);
      this.game.missions.deserialize(data.missions);
      this.game.achievements.deserialize(data.achievements);
      this.save();
      this.game.ui.showToast("Save importado", "O mundo restaurado está pronto.");
      this.game.ui.refresh();
      return true;
    } catch (error) {
      console.error(error);
      this.game.ui.showToast("Importação recusada", "O arquivo não parece ser um save válido.");
      return false;
    }
  }

  reset() {
    localStorage.removeItem(this.key);
    location.reload();
  }
}
