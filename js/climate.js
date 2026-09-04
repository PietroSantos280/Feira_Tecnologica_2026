// ClimateSystem: Fase 1 usa um clima simplificado. A API já está preparada para estações futuras.
class ClimateSystem {
  constructor() {
    this.season = "summer";
    this.day = 1;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= 60) {
      this.elapsed -= 60;
      this.day += 1;
    }
  }

  getGrowthMultiplier() {
    return 1;
  }

  getSeasonLabel() {
    return "Verão";
  }

  serialize() {
    return { season: this.season, day: this.day, elapsed: this.elapsed };
  }

  deserialize(data = {}) {
    this.season = data.season || "summer";
    this.day = Number.isFinite(data.day) ? data.day : 1;
    this.elapsed = Number.isFinite(data.elapsed) ? data.elapsed : 0;
  }
}
