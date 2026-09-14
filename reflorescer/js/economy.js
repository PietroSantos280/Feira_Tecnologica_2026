class EconomySystem {
  constructor(game) {
    this.game = game;
    this.tickAccumulator = 0;
    this.lastIncome = 0;
  }

  update(dt) {
    this.tickAccumulator += dt;
    if (this.tickAccumulator < 1) return;
    const seconds = Math.floor(this.tickAccumulator);
    this.tickAccumulator -= seconds;

    const multiplier = this.game.climate ? this.game.climate.getIncomeMultiplier() : 1;
    let income = 0;
    for (const row of this.game.world.tiles) {
      for (const tile of row) {
        if (!tile.tree) continue;
        income += tile.tree.collectProduction() * seconds;
      }
    }
    income = Math.round(income * multiplier);
    if (income > 0) {
      this.game.player.addCoins(income);
      this.lastIncome = income;
    } else {
      this.lastIncome = 0;
    }
  }
}
